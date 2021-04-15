# 3rd party
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import EmailVerifStatusChoices, PhoneVerifStatusChoices
from attributes import attributes
from attributes.models import Attribute, AttributeData, AllowedValue
from oauth2.models import (PaipassApplication, PaipassAccessToken, AccessTokenScopes)
from . import permissions
# Local
from .serializers import CreateAttributeSerializer


class CreateAttributeView(generics.CreateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CreateAttributeSerializer

    def create(self, request, *args, **kwargs):
        data = self.reformat_data(request, *args, **kwargs)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # headers = self.get_success_headers(serializer.data)
        # return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        return Response({}, status=status.HTTP_201_CREATED)

    def reformat_data(self, request, *args, **kwargs):
        request.data['application'] = kwargs['pk']
        request.data['name'] = kwargs['key_name']
        allowedValues = request.data['allowedValues']
        newAllowedValues = []
        for allowedValue in allowedValues:
            newAllowedValue = {}
            newAllowedValue['application'] = kwargs['pk']
            newAllowedValue['value'] = allowedValue
            newAllowedValues.append(newAllowedValue)
        request.data['allowedValues'] = newAllowedValues
        attribute = {}
        for key in request.data:
            if key != 'allowedValues':
                attribute[key] = request.data[key]
        request.data['attribute'] = attribute
        request.data['attribute']['is_editable'] = request.data['attribute'].pop('isEditable')
        request.data['attribute']['max_values'] = request.data['attribute'].pop('maxValues')
        request.data['attribute']['max_owner_perms'] = request.data['attribute'].pop('maxOwnerPerms')
        request.data['attribute']['max_all_perms'] = request.data['attribute'].pop('maxAllPerms')
        return request.data


class AttributeViewDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated & (permissions.OwnsAttr | permissions.HasAppropriateAccessToken),)

    def get_relevant_models(self, request, **kwargs):
        namespace = kwargs['namespace']
        key_name = kwargs['key_name']
        if key_name.lower() == 'sso' and namespace.lower() == 'paipass':
            attrs = []
            application = PaipassApplication.objects.all().get(namespace__iexact=namespace)
            attr = Attribute.objects.all().get(application=application,
                                               name__iexact='email')
            attrs.append(attr)
            attr = Attribute.objects.all().get(application=application,
                                               name__iexact='name')
            attrs.append(attr)
            attr = Attribute.objects.all().get(application=application,
                                               name__iexact='phone')
            attrs.append(attr)

        else:
            attrs = []
            application = PaipassApplication.objects.all().get(namespace__iexact=namespace)
            attr = Attribute.objects.all().get(application=application,
                                               name__iexact=key_name)

            attrs.append(attr)
        if 'HTTP_AUTHORIZATION' in request.META:
            token_id = request.META.get('HTTP_AUTHORIZATION').split()[1]
            access_token = PaipassAccessToken.objects.all().get(token=token_id)
        else:
            access_token = None

        return attrs, access_token

    def get(self, request, *args, **kwargs):

        attrs, access_token = self.get_relevant_models(request, **kwargs)
        data_set = {}
        for attr in attrs:
            attr_datum = attributes.create_or_retrieve_attribute_datum(user=access_token.user,
                                                                       attr=attr,
                                                                       owning_app=attr.application,
                                                                       id=kwargs.get('pk', None))
            if attr_datum is None:
                return Response({'detail': f'Attribute with key {attr.name} for user {attr.pk}, was found to '
                                           f' not have any data associated with it.'},
                                status=status.HTTP_400_BAD_REQUEST)

            attr_name = attr.name.lower()
            data_set[attr_name] = {}
            data_set[attr_name]['id'] = str(attr_datum.id)
            data_set[attr_name]['value'] = attr_datum.data
            data_set[attr_name]['owner'] = attr_datum.owning_application.name
            if attr_name.lower() == 'email':
                data_set[attr_name][
                    'verified'] = attr_datum.user.email_verification_request.status == EmailVerifStatusChoices.ACCEPTED
                data_set[attr_name]['user_id'] = access_token.user.id
            elif attr_name.lower() == 'phone':
                data_set[attr_name][
                    'verified'] = attr_datum.user.phone_verification_request.status == PhoneVerifStatusChoices.ACCEPTED
            elif attr_name.lower() == 'name':
                data_set[attr_name][
                    'verified'] = attr_datum.user.has_verified_gov_id


        return Response(data_set, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):

        if 'pk' in kwargs:
            return self.update_data(request, kwargs['pk'])
        else:
            attr, access_token = self.get_relevant_models(request, **kwargs)
            return self.create_data(request, attr, access_token)

    def update_data(self, request, pk):
        attr_data = AttributeData.objects.all().get(id=pk)
        attr_data.data = request.data['value']
        attr_data.save()
        return Response({'dataId': str(attr_data.id)}, status.HTTP_200_OK)

    def create_data(self, request, attr, access_token):
        if access_token is None:
            user = request.user
        else:
            user = access_token.user
        attr_data = AttributeData.objects.create(attr=attr,
                                                 owning_application=attr.application,
                                                 user=user,
                                                 data=request.data['value'],
                                                 )
        attr_data.save()
        return Response({'dataId': str(attr_data.id)}, status.HTTP_201_CREATED)

    def delete(self, request, *args, **kwargs):
        attrs, access_token = self.get_relevant_models(request, **kwargs)
        if 'pk' in kwargs:
            return self.delete_datum(request, kwargs['pk'])
        else:
            for attr in attrs:
                self.delete_dataset(request, attr, access_token)
            return Response({}, status=status.HTTP_200_OK)


    def delete_dataset(self, request, attr, access_token):
        if access_token is None:
            user = request.user
        else:
            user = access_token.user
        expandable = dict(user=user,
                          attr=attr,
                          owning_application=attr.application)
        for attr_data in AttributeData.objects.all().filter(**expandable):
            attr_data.delete()

    def delete_datum(self, request, pk):
        attr_data = AttributeData.objects.all().get(id=pk)
        attr_data.delete()
        return Response({}, status=status.HTTP_200_OK)


class AttributesListView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        data = []
        for access_token in PaipassAccessToken.objects.all().filter(user=request.user):
            d = {}
            d['uuid'] = access_token.application.id
            d['name'] = access_token.application.name
            d['namespace'] = access_token.application.namespace
            data.append(d)

        return Response(data, status=status.HTTP_200_OK)


class UserAttributeDataView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        pk = kwargs['pk']
        app = PaipassApplication.objects.all().get(id=pk)
        data = {}
        for at in PaipassAccessToken.objects.all().filter(user=request.user,
                                                          application=app):
            for ats in AccessTokenScopes.objects.all().filter(user=request.user,
                                                              access_token=at):
                for attr_datum in AttributeData.objects.all().filter(attr=ats.attribute,
                                                                     user=request.user):
                    if attr_datum.attr.id in data:
                        d = data[attr_datum.attr.id]
                        d['values'].append({'id': attr_datum.id, 'value': attr_datum.data})
                    else:
                        d = {}
                        d['id'] = attr_datum.attr.id
                        d['label'] = attr_datum.attr.label
                        d['name'] = attr_datum.attr.name
                        d['editable'] = attr_datum.attr.is_editable
                        d['maxValues'] = attr_datum.attr.max_values
                        regex = attr_datum.attr.format_regex
                        if len(regex) > 0:
                            d['format'] = {'description': attr_datum.attr.format_description,
                                           'regex': regex}
                        else:
                            d['format'] = None

                        d['values'] = []
                        d['values'].append({'id': attr_datum.id, 'value': attr_datum.data})
                        d['allowedValues'] = []
                        for allowed_value in AllowedValue.objects.all().filter(attribute=attr_datum.attr):
                            d['allowedValues'].append(allowed_value.value)
                        data[attr_datum.attr.id] = d
        out_data = []
        for key, value in data.items():
            out_data.append(value)
        return Response(out_data, status=status.HTTP_200_OK)
