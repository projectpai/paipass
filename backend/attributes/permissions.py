from rest_framework.permissions import BasePermission

from attributes.models import Attribute, AttributeData
from oauth2.models import (PaipassApplication, PaipassAccessToken, AccessTokenScopes, StatusChoices)


def get_relevant_models(request, view):
    namespace = view.kwargs['namespace']
    key_name = view.kwargs['key_name']

    application = PaipassApplication.objects.all().get(namespace__iexact=namespace)
    attr = Attribute.objects.all().get(application=application,
                                       name__iexact=key_name)
    if 'HTTP_AUTHORIZATION' in request.META:
        token_id = request.META.get('HTTP_AUTHORIZATION').split()[1]
        access_token = PaipassAccessToken.objects.all().get(token=token_id)
        ats = AccessTokenScopes.objects.all().get(access_token=access_token,
                                                  attribute=attr)
    else:
        ats = None

    return application, attr, ats


class HasAppropriateAccessToken(BasePermission):

    def has_permission(self, request, view):
        app, attr, ats = get_relevant_models(request, view)
        if ats is None:
            return False
        if ats.status == StatusChoices.APPROVED.value:
            return True
        return False


class OwnsAttr(BasePermission):

    def has_permission(self, request, view):
        pk = view.kwargs.get('pk', None)
        if pk is not None:
            ad = AttributeData.objects.all().get(id=pk)
            if ad.user == request.user:
                return True
        app, attr, ats = get_relevant_models(request, view)
        num_data = AttributeData.objects.all().filter(attr=attr,
                                                      user=request.user,
                                                      owning_application=app).count()

        return num_data > 0
