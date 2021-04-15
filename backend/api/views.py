# Core
from allauth.account import app_settings as allauth_settings
from allauth.account.models import (EmailAddress,
                                    EmailConfirmation,
                                    EmailConfirmationHMAC, )
from allauth.account.utils import complete_signup
from django.conf import settings
from django.contrib.auth import (
    login as django_login
)
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.hashers import make_password
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext_lazy as _
from django.views.decorators.debug import sensitive_post_parameters
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_auth.models import TokenModel
from rest_auth.registration.serializers import VerifyEmailSerializer
from rest_auth.serializers import (JWTSerializer,
                                   TokenSerializer)
from rest_auth.utils import (import_callable,
                             jwt_encode,
                             default_create_token)
# Third Party
from rest_framework import generics
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from api.models import EmailVerifStatusChoices, PhoneVerifStatusChoices, ResetPasswordSession
from attributes.attributes import convert_from_enum_perms
from attributes.models import Attribute, AttributeData
from identity_verification import idv
from identity_verification.models import GovIdVerificationSession
from identity_verification.models import StatusChoices as IdVerifChoices
from oauth2.models import AccessTokenScopes, PaipassApplication
from oauth2.models import StatusChoices as ATS_StatusChoices
from users.models import PaipassUser
from .models import EmailVerificationSession
from .serializers import GivsSerializer, UserGetInfoSerializer, UserSerializer, should_show_text_verif_screen, \
    ForgotPasswordSerializer, ForgotPassword2FASerializer

'''
if settings.IN_DOCKER:
    import localstack_client.session
    aws_api = localstack_client.session.Session()
else:
    import boto3 as aws_api
'''

# Local
from .serializers import (RegisterSerializer,
                          LoginSerializer,
                          ResendVerificationEmailSerializer,
                          UpdateProfileSerializer, )
from oauth2.oauth2 import scope_expression_to_symbols
from oauth2_provider.models import (get_access_token_model,
                                    get_application_model)

serializers = getattr(settings, 'REST_AUTH_REGISTER_SERIALIZERS', {})

RegisterSerializer = import_callable(
    serializers.get('REGISTER_SERIALIZER', RegisterSerializer))

sensitive_post_parameters_m = method_decorator(
    sensitive_post_parameters('password1', 'password2')
)


def register_permission_classes():
    permission_classes = [AllowAny, ]
    for klass in getattr(settings, 'REST_AUTH_REGISTER_PERMISSION_CLASSES', tuple()):
        permission_classes.append(import_callable(klass))
    return tuple(permission_classes)


def get_relevant_models(request, **kwargs):
    namespace = 'catena'
    key_name = 'AccountType'

    application = PaipassApplication.objects.all().get(namespace__iexact=namespace)
    attr = Attribute.objects.all().get(application=application,
                                       name__iexact=key_name)
    access_token = None
    return attr, access_token


def create_catena_account_type(request, user, **kwargs):
    attr, _ = get_relevant_models(request, **kwargs)
    attr_data = AttributeData.objects.create(attr=attr,
                                             owning_application=attr.application,
                                             user=user,
                                             data=request.data['accountType'],
                                             )
    attr_data.save()


def get_redirect_url(request, default=None):
    if 'goTo' in request.query_params:
        path = request.query_params['goTo']
        if 'oauth/authorize' in path:
            path, query = path.split('?')
            path = path + '/details-form' + '?' + query

        elif 'sso/discourse/authorize' in path:
            path, query = path.split('?')
            path = path + '/details-form' + '?' + query
            path = path.replace('discourse/', '')

        if path.startswith('/'):
            path = path[1:]
        redirect_url = settings.FRONTEND_DOMAIN + path
    else:
        if 'HTTP_REFERER' in request.META and settings.ADMIN_DOMAIN in request.META['HTTP_REFERER']:
            redirect_url = settings.ADMIN_DOMAIN + 'home'
        else:
            redirect_url = default
    return redirect_url


class PaipassRegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = register_permission_classes()
    token_model = TokenModel

    @sensitive_post_parameters_m
    def dispatch(self, *args, **kwargs):
        return super(PaipassRegisterView, self).dispatch(*args, **kwargs)

    def get_response_data(self, user):

        if getattr(settings, 'REST_USE_JWT', False):
            data = {
                'user': user,
                'token': self.token
            }
            return JWTSerializer(data).data
        else:
            return TokenSerializer(user.auth_token).data

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        pvs = idv.send_verification_text(user)
        idv.send_verification_email(user)
        response_data = self.get_response_data(user)
        response_data.update({"userId": user.id,
                              "phoneVerificationRequestId": str(pvs.id),
                              "redirectURL": None})
        if 'accountType' in request.data:
            create_catena_account_type(request, user,
                                       **kwargs)

        redirect_url = get_redirect_url(request)
        if redirect_url is None:
            return Response(response_data,
                            status=status.HTTP_201_CREATED,
                            headers=headers)
        else:

            response_data['goTo'] = '/' + redirect_url.split(settings.FRONTEND_DOMAIN)[1]
            response = Response(response_data, status=status.HTTP_201_CREATED)
            return response

    def perform_create(self, serializer):
        user = serializer.save(self.request)
        if getattr(settings, 'REST_USE_JWT', False):
            self.token = jwt_encode(user)
        else:
            default_create_token(self.token_model, user, serializer)

        complete_signup(self.request._request, user,
                        allauth_settings.EMAIL_VERIFICATION,
                        None)
        return user


def debug_request_for_csrf_issues(request):
    return
    from urllib.parse import urlparse
    from django.core.exceptions import DisallowedHost, ImproperlyConfigured
    from django.utils.http import is_same_domain

    def _sanitize_token(token):
        # Allow only ASCII alphanumerics
        return token

    print("getattr(request, 'csrf_processing_done', False) " + str(getattr(request, 'csrf_processing_done', False)))
    print("request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE') " + str(
        request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE')))
    if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
        print("getattr(request, '_dont_enforce_csrf_checks', False) " + str(
            getattr(request, '_dont_enforce_csrf_checks', False)))
        if getattr(request, '_dont_enforce_csrf_checks', False):
            pass

        print("request.is_secure() " + str(request.is_secure()))
        if request.is_secure():
            referer = request.META.get('HTTP_REFERER')
            print("request.META.get('HTTP_REFERER')" + str(referer))
            referer = urlparse(referer)
            print("urlparse(referer) " + str(referer))
            print("'' in (referer.scheme, referer.netloc) " + str('' in (referer.scheme, referer.netloc)))
            print("referer.scheme != 'https' " + str(referer.scheme != 'https'))
            good_referer = (
                settings.SESSION_COOKIE_DOMAIN
                if settings.CSRF_USE_SESSIONS
                else settings.CSRF_COOKIE_DOMAIN
            )
            print("good_referer = (... " + str(good_referer))
            if good_referer is not None:
                server_port = request.get_port()
                print("server_port = request.get_port() " + str(server_port))
                if server_port not in ('443', '80'):
                    good_referer = '%s:%s' % (good_referer, server_port)
                    print("good_referer = '%s:%s' % (good_referer, server_port) " + str(good_referer))
            else:
                try:
                    good_referer = request.get_host()
                    print("good_referer = request.get_host() " + str(good_referer))
                except DisallowedHost:
                    pass
            good_hosts = list(settings.CSRF_TRUSTED_ORIGINS)
            print("good_hosts = list(settings.CSRF_TRUSTED_ORIGINS) " + str(good_hosts))
            if good_referer is not None:
                good_hosts.append(good_referer)
            print("not any(is_same_domain(referer.netloc, host) for host in good_hosts) " + str(
                not any(is_same_domain(referer.netloc, host) for host in good_hosts)))
            csrf_token = request.META.get('CSRF_COOKIE')
            print("csrf_token = request.META.get('CSRF_COOKIE') " + str(csrf_token))
            request_csrf_token = ""
            if request.method == "POST":
                try:
                    request_csrf_token = request.POST.get('csrfmiddlewaretoken', '')
                    print("request_csrf_token = request.POST.get('csrfmiddlewaretoken', '') " + str(request_csrf_token))

                except OSError:
                    # Handle a broken connection before we've completed reading
                    # the POST data. process_view shouldn't raise any
                    # exceptions, so we'll ignore and serve the user a 403
                    # (assuming they're still listening, which they probably
                    # aren't because of the error).
                    pass
            if request_csrf_token == "":
                # Fall back to X-CSRFToken, to make things easier for AJAX,
                # and possible for PUT/DELETE.
                request_csrf_token = request.META.get(settings.CSRF_HEADER_NAME, '')
                print("request_csrf_token = request.META.get(settings.CSRF_HEADER_NAME, '') " + str(request_csrf_token))
            request_csrf_token = _sanitize_token(request_csrf_token)
            print("request_csrf_token " + str(request_csrf_token))


    else:
        pass


class LoginView(generics.GenericAPIView):
    """
    Check the credentials and return the REST Token
    if the credentials are valid and authenticated.
    Calls Django Auth login method to register User ID
    in Django session framework
    Accept the following POST parameters: username, password
    Return the REST Framework Token Object's key.
    """
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer
    token_model = TokenModel

    @sensitive_post_parameters_m
    def dispatch(self, *args, **kwargs):
        return super(LoginView, self).dispatch(*args, **kwargs)

    def process_login(self):
        django_login(self.request, self.user)

    def get_response_serializer(self):
        if getattr(settings, 'REST_USE_JWT', False):
            response_serializer = JWTSerializer
        else:
            response_serializer = TokenSerializer
        return response_serializer

    def login(self):
        self.user = self.serializer.validated_data['user']

        if getattr(settings, 'REST_USE_JWT', False):
            self.token = jwt_encode(self.user)
        else:
            self.token = default_create_token(self.token_model, self.user,
                                              self.serializer)

        if getattr(settings, 'REST_SESSION_LOGIN', True):
            self.process_login()

    def get_response(self):
        serializer_class = self.get_response_serializer()

        if getattr(settings, 'REST_USE_JWT', False):
            data = {
                'user': self.user,
                'token': self.token
            }
            serializer = serializer_class(instance=data,
                                          context={'request': self.request})
        else:
            serializer = serializer_class(instance=self.token,
                                          context={'request': self.request})

        redirect_url = get_redirect_url(self.request, settings.FRONTEND_DOMAIN + 'dashboard')
        headers = {'location': redirect_url}
        response = Response(serializer.data, status=status.HTTP_302_FOUND,
                            headers=headers)
        if getattr(settings, 'REST_USE_JWT', False):
            from rest_framework_jwt.settings import api_settings as jwt_settings
            if jwt_settings.JWT_AUTH_COOKIE:
                from datetime import datetime
                expiration = (datetime.utcnow() + jwt_settings.JWT_EXPIRATION_DELTA)
                response.set_cookie(jwt_settings.JWT_AUTH_COOKIE,
                                    self.token,
                                    expires=expiration,
                                    httponly=True)
        return response

    def post(self, request, *args, **kwargs):

        self.request = request
        # print('Login Post', self.request.POST)
        # print('Login Headers', self.request.META)
        debug_request_for_csrf_issues(request)
        self.serializer = self.get_serializer(data=self.request.data,
                                              context={'request': request})
        try:
            self.serializer.is_valid(raise_exception=True)
        except Exception as e:
            print('exception')
            if e.args[0] == 'Unable to log in with provided credentials.':
                print('Unable to log in with provided credentials.')
                headers = {'location': settings.FRONTEND_DOMAIN + 'login?error=true'}
                return Response({}, headers=headers, status=status.HTTP_302_FOUND)
            else:
                print('Unhandled exception ' + str(e))
                raise e
        self.login()
        response = self.get_response()
        return response


class UpdateProfileView(generics.UpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UpdateProfileSerializer

    def put(self, request, *args, **kwargs):
        # to shorten these lines down
        user = request.user
        self.needs_phone_redirection = False
        d = {'should_show_frontend_text_verification': False, **request.data}
        serializer = self.get_serializer(self.get_object(), data=d)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if should_show_text_verif_screen(user, user.email, request.data['email'], user.phone_number,
                                         request.data['phone_number']):
            return Response({'phoneVerificationRequestId': request.user.phone_verification_request.id},
                            status=status.HTTP_200_OK)

        return Response({}, status=status.HTTP_200_OK)

    def get_object(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.get(id=self.request.user.id)


class ResendVerificationEmailView(generics.CreateAPIView):

    def post(self, request, *args, **kwargs):
        idv.send_verification_email(request.user)
        return Response({}, status=status.HTTP_200_OK)


class ResendPhoneNumberVerificationView(generics.CreateAPIView):

    def post(self, request, *args, **kwargs):
        idv.send_verification_text(request.user)
        return Response({}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveAPIView):
    permissions = (IsAuthenticatedOrTokenHasScope,)
    required_scopes = (r'READ_ALL.PAIPASS.EMAIL',
                       r'READ_ALL.PAIPASS.PHONE',
                       r'READ_ALL.PAIPASS.NAME')

    def get_values(self, request):
        values = {}
        scopes = request.auth.scopes
        for scope in scopes:
            _, _, attr = scope_expression_to_symbols(scope)
            value = getattr(request.user, attr)
            values[attr] = value
        return values

    def get(self, request):
        # If the user is authenticated we want to give them access to their
        # data
        if request.user.is_authenticated and not hasattr(request.auth, 'scope'):
            # serializer = self.get_serializer(data=request.data)
            # serializer.is_valid(raise_exception=True)
            user = request.user  # self.perform_create(serializer)
            if user.phone_verification_request is not None:
                is_phone_verif = user.phone_verification_request.status == PhoneVerifStatusChoices.ACCEPTED
            else:
                is_phone_verif = False
            if user.email_verification_request is not None:
                is_email_verif = user.email_verification_request.status == EmailVerifStatusChoices.ACCEPTED
            else:
                is_email_verif = False
            new_email = ""
            if user.email_verification_request is not None and user.email_verification_request.email != user.email:
                new_email = user.email_verification_request.email
            new_phone = ""
            if user.phone_verification_request is not None and user.phone_verification_request.phone_number != user.phone_number:
                new_phone = user.phone_verification_request.phone_number

            if is_email_verif and is_phone_verif and user.has_verified_gov_id:
                account_verified = "VERIFIED"
            else:
                account_verified = "UNVERIFIED"

            rejection_reason = None
            ongoingNameVerification = False
            new_name = None

            qs1 = GovIdVerificationSession.objects.all().filter(user=request.user,
                                                                status=IdVerifChoices.PENDING,
                                                                reviewed_on__isnull=False)
            if qs1.count() > 0:
                ongoingNameVerification = True

            qs_rej = GovIdVerificationSession.objects.all().filter(user=request.user,
                                                                   status=IdVerifChoices.REJECTED,
                                                                   reviewed_on__isnull=False)
            qs_acc = GovIdVerificationSession.objects.all().filter(user=request.user,
                                                                   status=IdVerifChoices.ACCEPTED,
                                                                   reviewed_on__isnull=False)

            qs_pen = GovIdVerificationSession.objects.all().filter(user=request.user,
                                                                   status=IdVerifChoices.PENDING)

            if qs_pen.count() > 0:
                pen_givs = qs_pen.first()
                new_name = pen_givs.full_name
                ongoingNameVerification = True
            elif qs_rej.count() > 0 and qs_acc.count() < 1:
                rej_givs = qs_rej.latest('reviewed_on')
                rejection_reason = rej_givs.rejection_reason
            elif qs_rej.count() > 0 and qs_acc.count() > 0:
                rej_givs = qs_rej.latest('reviewed_on')
                acc_givs = qs_acc.first()
                if acc_givs.verified_on > rej_givs.reviewed_on:
                    rejection_reason = None

                else:
                    rejection_reason = rej_givs.rejection_reason

            response_data = {"userId": user.id,
                             "name": user.full_name,
                             # TODO nameVerified not there.
                             "nameVerified": user.has_verified_gov_id,
                             "email": user.email,
                             "emailVerified": user.has_verified_email,
                             "phone": user.phone_number,
                             "phoneVerified": user.has_verified_phone,
                             "ongoingEmailVerification": not is_email_verif,
                             "ongoingPhoneVerification": not is_phone_verif,
                             "ongoingNameVerification": ongoingNameVerification,
                             "newEmail": new_email,
                             "newPhone": new_phone,
                             # TODO develop infra for this
                             "newName": new_name,
                             "accountVerified": account_verified,
                             # This doesn't appear to be in the frontend for either the usre or admin
                             "identityVerificationStatus": None,
                             # TODO og java wasn't bool, it had text values.
                             # Probably makes sense to have levels of premiumness?
                             "premiumLevel": user.premium_level,
                             "adminAccountStatus": user.is_superuser,
                             # TODO add model for this
                             "rejectionReason": rejection_reason,
                             # This doesn't appear to exist in the frontend. Maybe in the admin???
                             "unsubscribedEmailAddresses": [],
                             # TODO add model for authorities
                             "authorities": [],
                             }
        else:
            response_data = self.get_values(request)

        headers = {}  # self.get_success_headers(serializer.data)
        return Response(response_data,
                        status=status.HTTP_200_OK,
                        headers=headers)


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):

    def get_relevant_models(self, request, pk):
        ApplicationModel = get_application_model()
        app = ApplicationModel.objects.all().get(id=pk)

        AccessTokenModel = get_access_token_model()
        access_token_qs = AccessTokenModel.objects.all().filter(application=app,
                                                                user=request.user)
        return app, access_token_qs

    def get(self, request, *args, **kwargs):
        pk = kwargs['pk']
        app, access_token_qs = self.get_relevant_models(request, pk)
        data = {}
        data['uuid'] = pk
        data['name'] = app.name
        data['description'] = app.description
        scopes = []
        for access_token in access_token_qs:
            for ats in AccessTokenScopes.objects.all().filter(access_token=access_token):
                scope = {}
                scope['namespace'] = ats.attribute.application.namespace
                scope['name'] = ats.attribute.name
                scope['description'] = ats.attribute.description
                scope['owner'] = {}
                scope['owner']['uuid'] = ats.attribute.application.id
                scope['owner']['name'] = ats.attribute.application.name
                scope['owner']['description'] = ats.attribute.application.description
                scope['accessLevel'] = convert_from_enum_perms(ats.max_perms)
                scope['approvalStatus'] = ats.status
                scopes.append(scope)
        data['scopes'] = scopes
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        pk = kwargs['pk']
        app, access_token_qs = self.get_relevant_models(request, pk)
        changed_permissions = request.data['permissions']
        for changed_permission in changed_permissions:
            approval_status = changed_permission['approvalStatus']
            raw_scope = changed_permission['scope']
            rw, namespace, name = scope_expression_to_symbols(raw_scope)
            app = PaipassApplication.objects.all().get(namespace__iexact=namespace)
            attr = Attribute.objects.all().get(name__iexact=name,
                                               application=app)
            for access_token in access_token_qs:
                ats = AccessTokenScopes.objects.all().get(access_token=access_token,
                                                          attribute=attr)
                if approval_status == 'DENIED':
                    ats.status = ATS_StatusChoices.DENIED
                else:
                    ats.status = ATS_StatusChoices.APPROVED

                ats.save()
        return Response({}, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        data = {}
        AccessToken = get_access_token_model()
        pk = kwargs['pk']
        app = get_application_model().objects.all().get(id=pk)
        at = AccessToken.objects.all().get(application=app,
                                           user=request.user)
        at.delete()
        return Response(data, status=status.HTTP_200_OK)


class ApplicationsView(generics.RetrieveAPIView):

    def get(self, request):
        AccessTokenModel = get_access_token_model()
        ApplicationModel = get_application_model()
        queryset = AccessTokenModel.objects.all().filter(user=request.user)
        applications = []
        for access_token in queryset:
            application = ApplicationModel \
                .objects \
                .all() \
                .get(id=access_token.application_id)
            app_i = {}
            app_i['name'] = application.name
            app_i['uuid'] = application.id
            applications.append(app_i)
        response_data = {"records": applications,
                         "totalRecords": len(applications)}
        headers = {}
        return Response(response_data, status=status.HTTP_200_OK,
                        headers=headers)


# TODO The OG should be using put or patch; leaving it for posterity
# correct it later...
class PhoneVerificationView(generics.CreateAPIView):

    def post(self, request, verif_req):
        user = request.user
        if user.phone_verification_request.id != verif_req:
            return Response({}, status=status.HTTP_400_BAD_REQUEST)
        if request.data['verificationCode'] != user.phone_verification_request.verification_code:
            return Response({}, status=status.HTTP_400_BAD_REQUEST)
        headers = {}
        pvr = user.phone_verification_request
        pvr.status = PhoneVerifStatusChoices.ACCEPTED
        pvr.save()
        user.has_verified_phone = True
        user.phone_number = pvr.phone_number
        user.save()
        print("PhoneVerificationView verif_req", verif_req)
        return Response({}, status=status.HTTP_200_OK,
                        headers=headers)


class EmailVerificationView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    allowed_methods = ('POST', 'OPTIONS', 'HEAD')

    def get_serializer(self, *args, **kwargs):
        return VerifyEmailSerializer(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        qs_evs = EmailVerificationSession.objects.all().filter(id=request.data['key'])
        if qs_evs.count() != 1:
            return Response({}, status.HTTP_400_BAD_REQUEST)
        evs = qs_evs.first()
        evs.status = EmailVerifStatusChoices.ACCEPTED
        evs.save()
        evs.user.email = evs.email
        evs.user.has_verified_email = True
        evs.user.save()
        return Response({}, status=status.HTTP_200_OK)

    def get_object(self, queryset=None):
        key = self.kwargs['pk']
        emailconfirmation = EmailConfirmationHMAC.from_key(key)
        if not emailconfirmation:
            if queryset is None:
                queryset = self.get_queryset()
            try:
                emailconfirmation = queryset.get(key=key.lower())
            except EmailConfirmation.DoesNotExist:
                raise EmailConfirmation.DoesNotExist
        return emailconfirmation

    def get_queryset(self):
        qs = EmailConfirmation.objects.all_valid()
        qs = qs.select_related("email_address__user")
        return qs


class ResendVerificationEmailView_OG(generics.GenericAPIView):
    serializer_class = ResendVerificationEmailSerializer
    permission_classes = (AllowAny,)
    allowed_methods = ('POST', 'OPTIONS', 'HEAD')

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.data['email']
        try:
            email_address = EmailAddress.objects.get(email__exact=email,
                                                     verified=False)
            email_address.send_confirmation(self.request, True)
        except EmailAddress.DoesNotExist:
            # TODO Why would a EmailAddress.DoesNotExist indicate that
            # it is verified?
            return Response({'error': _('Email is either verified or'
                                        "doesn't exist")},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': _('Verification e-mail sent.')})


class ResultsPagination(PageNumberPagination):
    page_size = 10
    page_query_param = 'page'
    page_size_query_param = 'perPage'
    max_page_size = 100

    # def get_paginated_response(self, data):
    #     return Response({
    #         'links': {
    #             'next': self.get_next_link(),
    #             'previous': self.get_previous_link()
    #         },
    #         'count': self.page.paginator.count,
    #         'total_pages': self.page.paginator.num_pages,
    #         'results': data
    #     })


class AccountsListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)
    pagination_class = ResultsPagination
    queryset = PaipassUser.objects.all()
    serializer_class = UserSerializer

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response = self.transform_data(response)
        return response

    def get_queryset(self):
        queryset = PaipassUser \
            .objects \
            .all() \
            .order_by(self.request.query_params['orderBy'])
        if 'email' in self.request.query_params:
            queryset = queryset.filter(email__icontains=self.request.query_params['email'])
        return queryset

    def transform_data(self, response):
        def to_verif_str(datum):
            if datum:
                return 'VERIFIED'
            else:
                return 'NOT_VERIFIED'

        data = []
        for datum in response.data['results']:
            d = {}
            d['uuid'] = datum['id']
            d['emailAddress'] = datum['email']
            d['lastLogin'] = datum['last_login']
            d['emailVerificationStatus'] = to_verif_str(datum['has_verified_email'])
            d['phoneVerificationStatus'] = to_verif_str(datum['has_verified_phone'])
            d['nameGovidVerificationStatus'] = to_verif_str(datum['has_verified_gov_id'])
            d['adminAccountStatus'] = to_verif_str(datum['is_staff'])
            data.append(d)
        response.data['records'] = data
        return response


class UserAccountInfoView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)
    serializer_class = UserGetInfoSerializer

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response = self.transform_data(response)
        return response

    def transform_data(self, response):
        d = {}
        for key in response.data:
            if key == 'full_name':
                d['name'] = response.data[key]
            elif key == 'phone_number':
                d['phone'] = response.data[key]
            else:
                d[key] = response.data[key]
        response.data = d
        return response

    def get_queryset(self):
        # queryset = PaipassUser.objects.all().get(id=self.request.query_params['paiId'][0])
        queryset = PaipassUser.objects.all()
        return queryset


class UserAccountAdminPromotion(generics.CreateAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)

    def post(self, request, *args, **kwargs):
        pk = kwargs['pk']
        user = PaipassUser.objects.all().get(id=pk)
        user.is_staff = True
        user.save()
        return Response({}, status=status.HTTP_200_OK)


class UserAccountAdminDemotion(generics.CreateAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)

    def post(self, request, *args, **kwargs):
        pk = kwargs['pk']
        user = PaipassUser.objects.all().get(id=pk)
        user.is_staff = False
        user.save()
        return Response({}, status=status.HTTP_200_OK)


class UserAccountDeletion(generics.CreateAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)

    def post(self, request, *args, **kwargs):
        pk = kwargs['pk']
        user = PaipassUser.objects.all().get(id=pk)
        user.delete()
        return Response({}, status=status.HTTP_200_OK)


class IdentityVerifications(generics.ListAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)
    pagination_class = ResultsPagination
    queryset = GovIdVerificationSession.objects.all()
    serializer_class = GivsSerializer

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response = self.transform_data(response)
        return response

    def get_queryset(self):
        queryset = GovIdVerificationSession \
            .objects \
            .all()
        if 'orderBy' in self.request.query_params:
            queryset = queryset.order_by(self.request.query_params['orderBy'])

        return queryset

    def transform_data(self, response):

        data = []
        for datum in response.data['results']:
            d = {}
            d['uuid'] = datum['verification_request']
            user = PaipassUser.objects.all().get(id=datum['user'])
            d['user'] = {'uuid': datum['user'],
                         'emailAddress': user.email}
            if datum['reviewer'] is not None:
                d['reviewer'] = {'uuid': datum['reviewer'],
                                 'emailAddress': PaipassUser.objects.all().get(id=datum['reviewer']).email}
            else:
                d['reviewer'] = datum['reviewer']
            d['fullName'] = user.full_name
            d['words'] = datum['verification_words']
            d['videoUrl'] = datum['video']
            d['submissionTimestamp'] = datum['created_on']
            d['reviewTimestamp'] = datum['reviewed_on']
            d['rejectionReason'] = datum['rejection_reason']
            d['status'] = datum['status']
            data.append(d)
        response.data['records'] = data
        return response


class IdentityVerification(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)

    def get(self, request, *args, **kwargs):
        givs = GovIdVerificationSession.objects.all().get(verification_request=kwargs['pk'])
        data = {}
        data['uuid'] = givs.verification_request
        data['user'] = {'uuid': givs.user.id,
                        'emailAddress': givs.user.email}
        if givs.reviewer is not None:
            data['reviewer'] = {'uuid': givs.reviewer.id,
                                'emailAddress': givs.reviewer.email}
        else:
            data['reviewer'] = None

        data['fullName'] = givs.user.full_name
        data['words'] = givs.verification_words
        if len(givs.video.name) > 0:
            data['videoUrl'] = givs.video.url
        else:
            data['videoUrl'] = None
        data['submissionTimestamp'] = givs.created_on
        data['reviewTimestamp'] = givs.reviewed_on
        data['status'] = givs.status
        # Just in case
        for key in data:
            data[key] = str(data[key])

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        givs = GovIdVerificationSession.objects.all().get(verification_request=kwargs['pk'])
        if kwargs['status_change'].lower() == 'accept':
            givs.status = IdVerifChoices.ACCEPTED
            givs.user.full_name = givs.full_name
            givs.user.has_verified_gov_id = True
            for givs_i in GovIdVerificationSession.objects.all().filter(user=givs.user,
                                                                        status=IdVerifChoices.ACCEPTED):
                givs_i.status = IdVerifChoices.ACCEPTED_INACTIVE
                givs_i.save()
        else:
            givs.rejection_reason = request.data['reason']
            givs.status = IdVerifChoices.REJECTED
        givs.reviewed_on = timezone.now()
        givs.user.save()
        givs.save()
        return Response({}, status=status.HTTP_200_OK)


class VideoView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated & IsAdminUser,)

    def get(self, request, *args, **kwargs):
        # headers = {'Content-Type': 'application/octet-stream'}
        givs = GovIdVerificationSession.objects.all().get(video=kwargs['video'])
        with open(givs.video.path, 'rb') as f:
            data = f.read()
        import base64
        response = HttpResponse(base64.b64encode(data))
        # response["Content-Disposition"] = "attachment; filename=aktel.png"
        return response


class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ForgotPasswordSerializer

    def post(self, request, *args, **kwargs):
        emailAddress = request.data['email']
        language = request.data['language']

        idv.send_password_reset_email(emailAddress, language)
        return Response({}, status=status.HTTP_200_OK)

    def get(self, request, *args, **kwargs):
        email_verif_code = kwargs['email_verif_code']
        qs = ResetPasswordSession.objects.all().filter(verification_code=email_verif_code)
        if qs.count() < 1:
            return Response({'detail': 'reset password session not found'})
        rps = qs.first()
        # idv.send_forgot_password_verification_code(rps)
        redirect_url = settings.FRONTEND_DOMAIN + 'password-reset/' + \
                       str(email_verif_code) + '?code=' + str(email_verif_code)
        headers = {'location': redirect_url}
        return Response({}, status=status.HTTP_302_FOUND,
                        headers=headers)


class ForgotPassword2FAView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ForgotPassword2FASerializer
    '''a place holder until I generate actual tokens'''

    # TODO generate actual tokens
    def get(self, request, *args, **kwargs):
        # Todo this should be returning a token; doing this hack to save time.
        email_verif_code = kwargs['email_verif_code']
        return Response({'token': email_verif_code}, status=status.HTTP_200_OK)


class SecondFactorAuthView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    '''basically handles the verification text'''

    def post(self, request, *args, **kwargs):
        email_verif_code = kwargs['email_verif_code']
        qs = ResetPasswordSession.objects.all().filter(verification_code=email_verif_code)
        if qs.count() < 1:
            return Response({'detail': 'reset password session not found'})
        rps = qs.first()
        '''
        sfa = rps.second_factor_auth_sess
        gt_thresh_time_elapsed = (timezone.now() - sfa.exchanged_on).total_seconds()/60 > 10
        if request.data['verificationCode'] == sfa.encoded_code and not gt_thresh_time_elapsed:
            sfa.verified_on = timezone.now()
            sfa.save()
            return Response({}, status=status.HTTP_200_OK)
        
        return Response({}, status=status.HTTP_401_UNAUTHORIZED)
        '''
        return Response({}, status=status.HTTP_200_OK)


class ResetPasswordView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    token_model = TokenModel

    def post(self, request, *args, **kwargs):
        email_verif_code = kwargs['email_verif_code']
        qs = ResetPasswordSession.objects.all().filter(verification_code=email_verif_code)
        if qs.count() < 1:
            return Response({'detail': 'reset password session not found'})
        rps = qs.first()
        '''
        sfa = rps.second_factor_auth_sess
        if (timezone.now() - sfa.verified_on).total_seconds()/60 > 10:
            # 422 is what the og code used
            return Response({}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        '''
        rps.user.password = make_password(request.data['password'])
        rps.user.save()
        self.login(request, rps.user)
        redirect_url = settings.FRONTEND_DOMAIN + 'dashboard'
        headers = {'location': redirect_url}
        return Response({}, status=status.HTTP_200_OK, headers=headers)

    def login(self, request, user):
        self.token = default_create_token(self.token_model, user,
                                          None)

        if getattr(settings, 'REST_SESSION_LOGIN', True):
            self.process_login(request, user)

    def process_login(self, request, user):
        django_login(request, user, 'django.contrib.auth.backends.ModelBackend')
