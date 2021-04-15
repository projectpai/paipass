import base64
import hashlib
import hmac
import urllib

from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.mixins import PaipassLoginRequiredMixin
from api.models import EmailVerifStatusChoices
from .models import DiscourseSsoAuthorization, DiscourseSsoGrant

sso_detail_data = {}
sso_detail_data['name'] = 'PAI Forum'
sso_detail_data['description'] = ''
owner = {'name': 'PAI Forum',
         'description': 'PAI Forum',
         'uuid': settings.NULL_UUID}

access_level = 'READ'

email_scope = {'name': 'email',
               'description': 'This permission gives the requestor the ability to see your email.',
               'namespace': 'PAI Forum',
               'owner': owner,
               'accessLevel': access_level,
               'approvalStatus': None,
               }

name_scope = {'name': 'name',
              'description': 'This permission gives the requestor the ability to see your full name.',
              'namespace': 'PAI Forum',
              'owner': owner,
              'accessLevel': access_level,
              'approvalStatus': None,
              }

avatar_scope = {'name': 'avatar',
                'description': 'This permission gives the requestor the ability to see your avatar.',
                'namespace': 'PAI Forum',
                'owner': owner,
                'accessLevel': access_level,
                'approvalStatus': None,
                }

bio_scope = {'name': 'bio',
             'description': 'This permission gives the requestor the ability to see your bio.',
             'namespace': 'PAI Forum',
             'owner': owner,
             'accessLevel': access_level,
             'approvalStatus': None,
             }

scopes = [email_scope,
          # bio_scope,
          # avatar_scope,
          name_scope]

sso_detail_data['scopes'] = scopes


class DiscourseSsoDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        return JsonResponse(sso_detail_data)


class DiscourseSsoView(PaipassLoginRequiredMixin, generics.RetrieveUpdateDestroyAPIView):
    '''
    Currently unused but leaving it here just in case I need to use it in the future (it was not fun to write).
    '''

    permission_classes = (AllowAny,)

    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):

        if not request.user.is_authenticated:
            redirect_to = settings.LOGIN_URL
            redirect_to += '?' + urllib.parse.urlencode(request.GET)
            return HttpResponseRedirect(redirect_to)

        dsa = self.generate_discourse_sso_auth(request, *args, **kwargs)

        if not dsa.is_approved:
            redirect_to = settings.FRONTEND_DOMAIN + 'sso/authorize/details-form'
            return HttpResponseRedirect(redirect_to)

        return self.retrieve_sso_data(dsa, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({}, status=status.HTTP_401_UNAUTHORIZED)
        dsas = DiscourseSsoAuthorization.objects.all().filter(user=request.user)

        if dsas.count() < 1:
            dsa = self.generate_discourse_sso_auth(request, *args, **kwargs)
        else:
            dsa = dsas.first()

        if not request.data['user_sso_approval']:
            return Response({}, status=status.HTTP_200_OK)
        dsa.is_approved = True
        for key in request.data:
            if key.startswith('scope') and request.data[key]:
                scope_key = key.split('.')[-1]
                if scope_key.lower() in DiscourseSsoAuthorization.APPROVED_ATTRS:
                    dsg = DiscourseSsoGrant(discourse_sso_auth=dsa,
                                            attribute_name=scope_key)
                    dsg.save()

        dsa.save()
        return self.retrieve_sso_data(dsa, *args, **kwargs)

    def generate_discourse_sso_auth(self, request, *args, **kwargs):
        payload = request.query_params.get('sso', None)
        actual_sig = request.query_params.get('sig', None)

        if payload is None or actual_sig is None:
            return Response({'detail': f'Neither sig ({actual_sig})  nor sso {payload} can be None.'},
                            status=status.HTTP_400_BAD_REQUEST)

        payload = payload.encode('utf-8')
        decoded_payload = base64.b64decode(payload, validate=True).decode('utf-8')

        result = self.check_signature(payload, decoded_payload, actual_sig)

        if result['detail'] != 'success':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        qs = DiscourseSsoAuthorization.objects.all().filter(user=request.user)
        nonce = urllib.parse.parse_qs(decoded_payload)['nonce'][0]

        if qs.count() < 1:
            dsa = DiscourseSsoAuthorization.objects.create(user=request.user,
                                                           nonce=nonce)
        else:
            dsa = qs.first()
            dsa.nonce = nonce

        dsa.save()
        return dsa

    def retrieve_sso_data(self, discourse_sso_auth, *args, **kwargs):
        data = self.get_sso_data(discourse_sso_auth)
        sso_url = self.create_url(data)

        return HttpResponseRedirect(sso_url)

    def create_url(self, data):
        urlencoded = urllib.parse.urlencode(data)
        b64_enc_data = base64.b64encode(urlencoded.encode('utf-8'))
        sig_out = hmac.new(settings.SSO_SECRET_DISCOURSE.encode('utf-8'),
                           b64_enc_data,
                           digestmod=hashlib.sha256).hexdigest()

        query_params = {'sso': b64_enc_data, 'sig': sig_out}
        qp = urllib.parse.urlencode(query_params)
        sso_url = settings.BASE_URL_PAIFORUM + 'session/sso_login?' + qp
        return sso_url

    def check_signature(self, payload, decoded_payload, actual_sig):

        if 'nonce' not in decoded_payload:
            return {'detail': f'Nonce not found in payload.'}

        secret = settings.SSO_SECRET_DISCOURSE.encode('utf-8')
        hmac_obj = hmac.new(secret, payload, digestmod=hashlib.sha256)
        expected_sig = hmac_obj.hexdigest()

        if not hmac.compare_digest(expected_sig, actual_sig):
            return {'detail': 'signatures did not match'}
        return {'detail': 'success'}

    def get_sso_data(self, discourse_sso_auth):

        data = {'email': discourse_sso_auth.email,
                'require_activation': not (
                            discourse_sso_auth.user.email_verification_request.status == EmailVerifStatusChoices.ACCEPTED),
                'external_id': discourse_sso_auth.user.arbitrary_id,
                # 'username': discourse_sso_auth.user.email,
                'admin': discourse_sso_auth.user.is_staff,
                'nonce': discourse_sso_auth.nonce,
                }
        grants = DiscourseSsoGrant.objects.all().filter(discourse_sso_auth=discourse_sso_auth)
        for grant in grants:
            if grant.attribute_name != 'email':
                val = getattr(discourse_sso_auth, grant.attribute_name)
                data[grant.attribute_name] = val
        return data
