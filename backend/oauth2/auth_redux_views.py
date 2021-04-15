import logging
import urllib.parse
from collections import namedtuple

from api.models import EmailVerifStatusChoices
from django.conf import settings
from django.http import HttpResponseRedirect
from django.views.generic import View
from oauth2_provider.exceptions import OAuthToolkitError
from oauth2_provider.http import OAuth2ResponseRedirect
from oauth2_provider.models import get_application_model
# from oauth2_provider.views.base import BaseAuthorizationView
from oauth2_provider.settings import oauth2_settings

from api.mixins import PaipassLoginRequiredMixin
from attributes.attributes import get_attribute, convert_to_enum_perms
from attributes.models import AttributeApproval, Attribute
from .mixins_redux import OAuthLibMixin
from .models import PaipassGrant, PaipassApplication
from .oauth2 import scope_expression_to_symbols

log = logging.getLogger("oauth2_provider")


class BaseAuthorizationView(PaipassLoginRequiredMixin, OAuthLibMixin):
    """
    Implements a generic endpoint to handle *Authorization Requests* as in :rfc:`4.1.1`. The view
    does not implement any strategy to determine *authorize/do not authorize* logic.
    The endpoint is used in the following flows:

    * Authorization code
    * Implicit grant

    """

    def dispatch(self, request, *args, **kwargs):
        self.oauth2_data = {}
        return super().dispatch(request, *args, **kwargs)

    def error_response(self, error, application, **kwargs):
        """
        Handle errors either by redirecting to redirect_uri with a json in the body containing
        error details or providing an error response
        """
        redirect, error_response = super().error_response(error, **kwargs)

        if redirect:
            return self.redirect(error_response["url"], application)

        status = error_response["error"].status_code
        return self.render_to_response(error_response, status=status)

    def redirect(self, redirect_to, application):
        if application is None:

            # The application can be None in case of an error during app validation
            # In such cases, fall back to default ALLOWED_REDIRECT_URI_SCHEMES
            allowed_schemes = oauth2_settings.ALLOWED_REDIRECT_URI_SCHEMES
        else:
            allowed_schemes = application.get_allowed_schemes()
        return OAuth2ResponseRedirect(redirect_to, allowed_schemes)


Scope = namedtuple('Scope', ('access_level', 'namespace', 'name'))


class AuthorizationView(BaseAuthorizationView, View):
    """
    Implements an endpoint to handle *Authorization Requests* as in :rfc:`4.1.1` and prompting the
    user with a form to determine if she authorizes the client application to access her data.
    This endpoint is reached two times during the authorization process:
    * first receive a ``GET`` request from user asking authorization for a certain client
    application, a form is served possibly showing some useful info and prompting for
    *authorize/do not authorize*.

    * then receive a ``POST`` request possibly after user authorized the access

    Some informations contained in the ``GET`` request and needed to create a Grant token during
    the ``POST`` request would be lost between the two steps above, so they are temporarily stored in
    hidden fields on the form.
    A possible alternative could be keeping such informations in the session.

    The endpoint is used in the following flows:
    * Authorization code
    * Implicit grant
    """

    server_class = oauth2_settings.OAUTH2_SERVER_CLASS
    validator_class = oauth2_settings.OAUTH2_VALIDATOR_CLASS
    oauthlib_backend_class = oauth2_settings.OAUTH2_BACKEND_CLASS

    skip_authorization_completely = False

    def get_initial(self):
        # TODO: move this scopes conversion from and to string into a utils function
        scopes = self.oauth2_data.get("scope", self.oauth2_data.get("scopes", []))
        initial_data = {
            "redirect_uri": self.oauth2_data.get("redirect_uri", None),
            "scope": scopes,
            "client_id": self.oauth2_data.get("client_id", None),
            "state": self.oauth2_data.get("state", None),
            "response_type": self.oauth2_data.get("response_type", None),
        }
        return initial_data

    def get(self, request):
        evr = request.user.email_verification_request 
        # if evr is None or evr.status != EmailVerifStatusChoices.ACCEPTED:
        #    redirect_to = settings.FRONTEND_DOMAIN + 'oauth/email-verification-required/'
        if request.user.is_authenticated:
            redirect_to = settings.FRONTEND_DOMAIN + 'oauth/authorize/details-form'
        else:
            redirect_to = settings.LOGIN_URL
        redirect_to += '?' + urllib.parse.urlparse(request.get_full_path()).query
        return HttpResponseRedirect(redirect_to)

    def post(self, request):
        client_id = request.GET['client_id']
        application = get_application_model().objects.get(client_id=client_id)
        credentials = {
            "client_id": request.GET['client_id'],
            "redirect_uri": request.GET['redirect_uri'],
            "response_type": request.GET['response_type'],
            "state": request.GET['state'],
        }
        scopes = request.GET.getlist('scope')
        allow = bool(request.POST['user_oauth_approval'])
        try:
            uri, headers, body, status = self.create_authorization_response(
                request=self.request, scopes=scopes, credentials=credentials, allow=allow
            )
            code = uri.split('=')[1].split('&state')[0]
            g = PaipassGrant.objects.all().get(code=code)
            for scope in request.GET.getlist('scope'):
                rw_permission, namespace, attr = scope_expression_to_symbols(scope)
                application = PaipassApplication.objects.all().get(namespace__iexact=namespace)
                attr = Attribute.objects.all().get(application=application,
                                                   name__iexact=attr)

                appr = AttributeApproval.objects.all().get(grant=g, attribute=attr)
                perms = convert_to_enum_perms(rw_permission)
                appr.max_perms = perms
                appr.save()

        except OAuthToolkitError as error:
            return self.error_response(error, application)

        self.success_url = uri
        log.debug("Success url for the request: {0}".format(self.success_url))
        return self.redirect(self.success_url, application)

    def js_to_params(self, pseudo_scope):
        params = pseudo_scope.split('.')
        return Scope(*params[1:])

    def convert_raw_scope_to_attribute(self, request, scopes, application):
        attributes = []
        for scope in scopes:
            attr = get_attribute(request, scope, application)
            attributes.append(attr)
        return attributes
