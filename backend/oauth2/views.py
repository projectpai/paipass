# Core
from api.views import ResultsPagination
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms.models import modelform_factory
from django.http import JsonResponse
from django.views.generic import (
    CreateView, UpdateView, DetailView)
# Third Party
from oauth2_provider.models import get_application_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.mixins import PaipassLoginRequiredMixin
# Local
from attributes.attributes import get_attribute
from .models import PaipassApplication
from .serializers import ApplicationsListSerializer


class ApplicationOwnerIsUserMixin(LoginRequiredMixin):
    """
    This mixin is used to provide an Application queryset filtered by the current request.user.
    """
    fields = "__all__"

    def get_queryset(self):
        return get_application_model().objects.filter(user=self.request.user)


class ApplicationRegistrationBak(LoginRequiredMixin, CreateView):
    """
    View used to register a new Application for the request.user
    """
    template_name = "oauth2_provider/application_registration_form.html"

    def get_form_class(self):
        """
        Returns the form class for the application model
        """
        return modelform_factory(
            get_application_model(),
            fields=(
                "name",
                "client_id",
                "client_secret",
                "client_type",
                "authorization_grant_type",
                "redirect_uris",
                "namespace",
                "logo_url",
                "home_page_url",
            )
        )

    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)


class ApplicationRegistration(PaipassLoginRequiredMixin, generics.CreateAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):

        qs = PaipassApplication.objects.all().filter(user=request.user,
                                                     name=request.data['name'],
                                                     namespace=request.data['namespace'])
        if qs.count() > 0:
            return Response({'detail': f'an application ({request.data["name"]})'
                                       f' with this namespace ({request.data["namespace"]}'
                                       f' already exists'})
        app = PaipassApplication.objects.create(user=request.user)

        return Response()


class ApplicationUpdate(ApplicationOwnerIsUserMixin, UpdateView):
    """
    View used to update an application owned by the request.user
    """
    context_object_name = "application"
    template_name = "oauth2_provider/application_form.html"

    def get_form_class(self):
        """
        Returns the form class for the application model
        """
        return modelform_factory(
            get_application_model(),
            fields=(
                "name", "client_id", "client_secret", "client_type",
                "authorization_grant_type", "redirect_uris", "namespace",
                "logo_url", "home_page_url", "description",
            )
        )


class ApplicationDetail(ApplicationOwnerIsUserMixin, DetailView):
    """
    Detail view for an application instance owned by the request.user
    """
    context_object_name = "application"
    template_name = "oauth2/application_detail.html"


class ApplicationsDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        client_id = request.query_params['client_id']
        app = PaipassApplication.objects.all().get(client_id=client_id)
        data = {}
        data['name'] = app.name
        data['description'] = app.description
        scopes = []
        for scope in request.query_params.getlist('scope'):
            attr = get_attribute(request, scope, client_id)
            s = {}
            s['description'] = attr.description
            s['name'] = attr.name
            s['namespace'] = app.namespace
            s['owner'] = {}
            owning_app = PaipassApplication.objects.all().get(id=attr.application.id)
            s['owner']['name'] = owning_app.name
            s['owner']['description'] = owning_app.description
            s['owner']['uuid'] = owning_app.id

            s['accessLevel'] = self.augment_access_level(attr, owning_app, app)

            s['approvalStatus'] = None
            scopes.append(s)

        data['scopes'] = scopes
        return JsonResponse(data)

    def augment_access_level(self, attr, owning_app, app):
        if owning_app.id == app.id:
            al = attr.max_owner_perms
        else:
            al = attr.max_all_perms
        if al == 0:
            access_level = 'NONE'
            raise Exception(f'App {(app.name, app.id)} cannot request access to {attr.name}'
                            f' when it is not the owning app {(owning_app.name, app.name)}')
        elif al == 1:
            access_level = 'READ'
        elif al == 3:
            access_level = 'READ_WRITE'
        else:
            raise Exception(f'Access level {al} not recognized.')

        if owning_app.id == app.id:
            access_level += '_OWNER'

        return access_level.upper()


class ApplicationsListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ApplicationsListSerializer
    pagination_class = ResultsPagination
    #queryset = PaipassApplication.objects.all()

    paginate_by = 10

    def get_queryset(self):
        qs = PaipassApplication \
            .objects \
            .all() \
            .filter(user=self.request.user)
        if 'paicoin_address' in self.request.query_params:
            qs = qs.filter(email__icontains=self.request.query_params['paicoin_address'])
        return qs


