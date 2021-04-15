from django.urls import include, path
from .views import (PaipassRegisterView,
                    ProfileView,
                    UpdateProfileView,
                    PhoneVerificationView,
                    EmailVerificationView,
                    ResendVerificationEmailView,
                    ApplicationsView,
                    ApplicationDetailView,
                    LoginView,
                    AccountsListView,
                    UserAccountInfoView,
                    UserAccountAdminPromotion,
                    UserAccountAdminDemotion,
                    UserAccountDeletion,
                    IdentityVerifications,
                    IdentityVerification,
                    VideoView,
                    ResendPhoneNumberVerificationView,
                    ForgotPasswordView,
                    ForgotPassword2FAView,
                    ResetPasswordView, SecondFactorAuthView)

urlpatterns = [
    # Authentication
    path('rest-auth/registration/',
         PaipassRegisterView.as_view(),
         name='paipass_registration'),

    path('account/verify-email',
         EmailVerificationView.as_view(),
         name='paipass_email_verification'),

    path('rest-auth/registration/resend-verification-email/',
         ResendVerificationEmailView.as_view(),
         name='resend_verification_email'),

    path('account/phone-number-verification/reset',
         ResendPhoneNumberVerificationView.as_view()),

    path('rest-auth/login/',
         LoginView.as_view(),
         name='paipass_login'),

    path('rest-auth/',
         include('rest_auth.urls')),

    path('api-auth/',
         include('rest_framework.urls')),

    # Allauth
    #path('accounts/',
    #     include('allauth.urls')),

    # Profile Api
    # TODO Clean up by adding new app
    path('account/profile/',
         ProfileView.as_view()),

    path('account/profile/update/',
         UpdateProfileView.as_view()),

    path('account/owner/applications/',
         ApplicationsView.as_view()),

    path('account/owner/application/<uuid:pk>/',
         ApplicationDetailView.as_view()),

    path('account/identity-verifications',
         IdentityVerifications.as_view()),

    path('account/identity-verification/<uuid:pk>',
         IdentityVerification.as_view()),

    path('account/identity-verification/<uuid:pk>/<str:status_change>',
         IdentityVerification.as_view()),

    path('account/video-verification/<str:video>', VideoView.as_view()),

    path('account/phone-number-verification/<uuid:verif_req>/',
         PhoneVerificationView.as_view()),

    path('accounts', AccountsListView.as_view()),

    path('account/get-info/<int:pk>/', UserAccountInfoView.as_view()),

    path('account/admin-account-change/<int:pk>/promote',
         UserAccountAdminPromotion.as_view()),

    path('account/admin-account-change/<int:pk>/demote',
             UserAccountAdminDemotion.as_view()),

    path('account/admin-account-change/<int:pk>/delete',
             UserAccountDeletion.as_view()),

    path('account/forgot-password/', ForgotPasswordView.as_view()),
    path('account/forgot-password/<uuid:email_verif_code>/', ForgotPasswordView.as_view()),
    path('account/2FA/reset-password/<uuid:email_verif_code>/', ForgotPassword2FAView.as_view()),
    path('account/reset-password/<uuid:email_verif_code>/', ResetPasswordView.as_view()),
    path('account/2FA/<uuid:email_verif_code>/', SecondFactorAuthView.as_view())

]
