# stdlib
import warnings

# 3rd Party
from allauth.account import app_settings as allauth_settings
from allauth.account.adapter import get_adapter
from allauth.account.utils import setup_user_email
from allauth.utils import email_address_exists
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import ugettext_lazy as _
from identity_verification.idv import get_phone_verification_code, aws_send_verification_text
from rest_framework import serializers

from api.models import PhoneVerifStatusChoices
from identity_verification import idv
from identity_verification.models import GovIdVerificationSession
from users.models import PaipassUser

from api.models import PhoneVerificationSession

UserModel = get_user_model()


def should_show_text_verif_screen(user, prev_email, new_email, prev_phone, new_phone):
    email_changed = prev_email != new_email
    phone_changed = prev_phone != new_phone
    pending_phone_verif = user.phone_verification_request.status != PhoneVerifStatusChoices.ACCEPTED
    has_user_requested_phone_verif = not email_changed and pending_phone_verif
    return phone_changed or has_user_requested_phone_verif


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=allauth_settings.EMAIL_REQUIRED)
    password = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True)

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if allauth_settings.UNIQUE_EMAIL:
            if email and email_address_exists(email):
                raise serializers.ValidationError(
                    _("A user is already registered with this e-mail address."))
        return email

    def validate_password(self, password):
        return get_adapter().clean_password(password)

    def validate_phone_number(self, phone_number):
        warnings.warn("PHONE NUMBER VALIDATION IS NOT IMPLEMENTED")
        return phone_number

    def validate(self, data):
        return data

    def custom_signup(self, request, user):
        pass

    def get_cleaned_data(self):
        return {
            'password1': self.validated_data.get('password', ''),
            'email': self.validated_data.get('email', ''),
            'phone_number': self.validated_data.get('phone_number', ''),
        }

    def save(self, request):
        adapter = get_adapter()
        user = adapter.new_user(request)
        self.cleaned_data = self.get_cleaned_data()
        adapter.save_user(request, user, self)
        self.custom_signup(request, user)
        setup_user_email(request, user, [])
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(style={'input_type': 'password'})

    def authenticate(self, **kwargs):
        auth = authenticate(self.context['request'], **kwargs)
        return auth

    def _validate_email(self, email, password):
        user = None

        if email and password:
            user = self.authenticate(email=email, password=password)
        else:
            msg = _('Must include "email" and "password".')
            raise Exception(msg)

        return user

    def _validate_username(self, username, password):
        user = None

        if username and password:
            user = self.authenticate(username=username, password=password)
        else:
            msg = _('Must include "username" and "password".')
            raise Exception(msg)

        return user

    def _validate_username_email(self, username, email, password):
        user = None

        if email and password:
            user = self.authenticate(email=email, password=password)
        elif username and password:
            user = self.authenticate(username=username, password=password)
        else:
            msg = _('Must include either "username" or "email" and "password".')
            raise Exception(msg)

        return user

    def validate(self, attrs):
        username = attrs.get('username')
        email = attrs.get('email')
        password = attrs.get('password')

        user = None

        if 'allauth' in settings.INSTALLED_APPS:
            from allauth.account import app_settings

            # Authentication through email
            if app_settings.AUTHENTICATION_METHOD == app_settings.AuthenticationMethod.EMAIL:
                user = self._validate_email(email, password)

            # Authentication through username
            elif app_settings.AUTHENTICATION_METHOD == app_settings.AuthenticationMethod.USERNAME:
                user = self._validate_username(username, password)

            # Authentication through either username or email
            else:
                user = self._validate_username_email(username, email, password)

        else:
            # Authentication without using allauth
            if email:
                try:
                    username = UserModel.objects.get(email__iexact=email).get_username()
                except UserModel.DoesNotExist:
                    pass

            if username:
                user = self._validate_username_email(username, '', password)

        # Did we get back an active user?
        if user:
            if not user.is_active:
                msg = _('User account is disabled.')
                raise Exception(msg)
        else:
            msg = _('Unable to log in with provided credentials.')
            raise Exception(msg)

        # If required, is the email verified?
        if 'rest_auth.registration' in settings.INSTALLED_APPS:
            from allauth.account import app_settings
            if app_settings.EMAIL_VERIFICATION == app_settings.EmailVerificationMethod.MANDATORY:
                email_address = user.emailaddress_set.get(email=user.email)
                if not email_address.verified:
                    raise serializers.ValidationError(_('E-mail is not verified.'))

        attrs['user'] = user
        return attrs


class ResendVerificationEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UpdateProfileSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone_number = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})

    def update(self, instance, validated_data):
        request = self.context['request']

        if not request.user.check_password(validated_data['password']):
            raise Exception("Password doesn't match")

        prev_email = instance.email
        new_email = validated_data.get('email', instance.email)
        prev_phone = instance.phone_number
        new_phone = validated_data.get('phone_number', instance.phone_number)

        if request.user.phone_verification_request is None:
            verification_code = get_phone_verification_code()
            request.user.phone_verification_request = PhoneVerificationSession.objects.create(user=request.user,
                                                                                              verification_code=verification_code,
                                                                                              phone_number=new_phone,
                                                                                              )
        if request.user.email_verification_request is None:
            idv.send_verification_email(request.user)
        if request.user.phone_number != request.user.phone_verification_request.phone_number:
            if new_phone == prev_phone:
                new_phone = request.user.phone_verification_request.phone_number

        # if the new email doesn't match the previous email,
        # we need to send a new confirmation email.
        email_changed = prev_email != new_email
        if email_changed:
            idv.send_verification_email(request.user, new_email=new_email)

        if prev_email is None:
            instance.email = new_email

        # if the new phone # doesn't match the previous phone #,
        # we need to send a new confirmation text.
        if should_show_text_verif_screen(request.user, prev_email, new_email, prev_phone, new_phone):
            idv.send_verification_text(request.user, new_phone=new_phone)

        return instance


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaipassUser
        fields = ('id', 'email', 'last_login', 'has_verified_phone',
                  'has_verified_email', 'has_verified_gov_id',
                  'is_staff',
                  )


class GivsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovIdVerificationSession
        fields = ('verification_request', 'user', 'reviewer', 'full_name',
                  'verification_words', 'video', 'created_on', 'reviewed_on',
                  'rejection_reason', 'status',
                  )


class UserGetInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaipassUser
        fields = ('full_name', 'email', 'phone_number',)


class ForgotPasswordSerializer(serializers.Serializer):
    pass


class ForgotPassword2FASerializer(serializers.Serializer):
    token = serializers.CharField()
