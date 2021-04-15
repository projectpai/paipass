from django.core.exceptions import ImproperlyConfigured

from oauth2_provider.settings import oauth2_settings
from oauth2_provider.exceptions import FatalClientError

from attributes.attributes import get_attribute
from attributes.models import Attribute
from oauth2.oauth2 import scope_expression_to_symbols


class OAuthLibMixin(object):
    """
    This mixin decouples Django OAuth Toolkit from OAuthLib.

    Users can configure the Server, Validator and OAuthlibCore
    classes used by this mixin by setting the following class
    variables:

      * server_class
      * validator_class
      * oauthlib_backend_class

    """
    server_class = None
    validator_class = None
    oauthlib_backend_class = None

    @classmethod
    def get_server_class(cls):
        """
        Return the OAuthlib server class to use
        """
        if cls.server_class is None:
            raise ImproperlyConfigured(
                "OAuthLibMixin requires either a definition of 'server_class'"
                " or an implementation of 'get_server_class()'")
        else:
            return cls.server_class

    @classmethod
    def get_validator_class(cls):
        """
        Return the RequestValidator implementation class to use
        """
        if cls.validator_class is None:
            raise ImproperlyConfigured(
                "OAuthLibMixin requires either a definition of 'validator_class'"
                " or an implementation of 'get_validator_class()'")
        else:
            return cls.validator_class

    @classmethod
    def get_oauthlib_backend_class(cls):
        """
        Return the OAuthLibCore implementation class to use
        """
        if cls.oauthlib_backend_class is None:
            raise ImproperlyConfigured(
                "OAuthLibMixin requires either a definition of 'oauthlib_backend_class'"
                " or an implementation of 'get_oauthlib_backend_class()'")
        else:
            return cls.oauthlib_backend_class

    @classmethod
    def get_server(cls):
        """
        Return an instance of `server_class` initialized with a `validator_class`
        object
        """
        server_class = cls.get_server_class()
        validator_class = cls.get_validator_class()
        return server_class(validator_class())

    @classmethod
    def get_oauthlib_core(cls):
        """
        Cache and return `OAuthlibCore` instance so it will be created only on first request
        """
        if not hasattr(cls, "_oauthlib_core"):
            server = cls.get_server()
            core_class = cls.get_oauthlib_backend_class()
            cls._oauthlib_core = core_class(server)
        return cls._oauthlib_core

    def validate_authorization_request(self, request):
        """
        A wrapper method that calls validate_authorization_request on `server_class` instance.

        :param request: The current django.http.HttpRequest object
        """
        core = self.get_oauthlib_core()
        return core.validate_authorization_request(request)

    def create_authorization_response(self, request, scopes, credentials, allow):
        """
        A wrapper method that calls create_authorization_response on `server_class`
        instance.

        :param request: The current django.http.HttpRequest object
        :param scopes: A space-separated string of provided scopes
        :param credentials: Authorization credentials dictionary containing
                           `client_id`, `state`, `redirect_uri`, `response_type`
        :param allow: True if the user authorize the client, otherwise False
        """
        # TODO: move this scopes conversion from and to string into a utils function
        #scopes = scopes.split(" ") if scopes else []
        scopes = self.convert_raw_scope_to_attribute(request, scopes, credentials['client_id'])
        core = self.get_oauthlib_core()
        return core.create_authorization_response(request, scopes, credentials, allow)

    def convert_raw_scope_to_attribute(self, request, scopes, application):
        attributes = []
        for scope in scopes:
            '''
            if scope.lower() == 'sso':
                email_attr = get_attribute(request, 'email', application)
                name_attr = get_attribute(request, 'name', application)
            '''
            attr = get_attribute(request, scope, application)
            attributes.append(attr)
        return attributes


    def create_token_response(self, request):
        """
        A wrapper method that calls create_token_response on `server_class` instance.

        :param request: The current django.http.HttpRequest object
        """
        core = self.get_oauthlib_core()
        return core.create_token_response(request)

    def create_revocation_response(self, request):
        """
        A wrapper method that calls create_revocation_response on the
        `server_class` instance.

        :param request: The current django.http.HttpRequest object
        """
        core = self.get_oauthlib_core()
        return core.create_revocation_response(request)

    def verify_request(self, request):
        """
        A wrapper method that calls verify_request on `server_class` instance.

        :param request: The current django.http.HttpRequest object
        """
        core = self.get_oauthlib_core()
        return core.verify_request(request, scopes=self.get_scopes())

    def get_scopes(self):
        """
        This should return the list of scopes required to access the resources.
        By default it returns an empty list.
        """
        return []

    def error_response(self, error, **kwargs):
        """
        Return an error to be displayed to the resource owner if anything goes awry.

        :param error: :attr:`OAuthToolkitError`
        """
        oauthlib_error = error.oauthlib_error

        redirect_uri = oauthlib_error.redirect_uri or ""
        separator = "&" if "?" in redirect_uri else "?"

        error_response = {
            "error": oauthlib_error,
            "url": redirect_uri + separator + oauthlib_error.urlencoded,
        }
        error_response.update(kwargs)

        # If we got a malicious redirect_uri or client_id, we will *not* redirect back to the URL.
        if isinstance(error, FatalClientError):
            redirect = False
        else:
            redirect = True

        return redirect, error_response

