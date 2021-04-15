from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class AccountAdapter(DefaultAccountAdapter):

    def get_email_confirmation_url(self, request, emailconfirmation):
        key = emailconfirmation.key
        url = settings.EMAIL_VERIF_URL.format(key)
        port = request.META['SERVER_PORT']
        return settings.FRONTEND_DOMAIN + 'email-verification/' + key 

    def save_user(self,request, sociallogin, form):
        user = super(AccountAdapter, self).save_user(request,
                                                     sociallogin,
                                                     form)
        user.phone_number = request.data['phone_number']
        user.save()
        return user
