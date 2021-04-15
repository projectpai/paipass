# Core
from django.shortcuts import render
from random import randint

# Third party
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from identity_verification.models import StatusChoices as IdVerifChoices

# Local
from .models import GovIdVerificationSession
from .serializers import (GovIdVerificationSerializer,
                          NameSetupSerializer,
                          VerificationVideoSerializer)

import uuid

class GovIdVerificationNameSetupView(generics.CreateAPIView):

    permission_classes = (IsAuthenticated,)
    serializer_class = NameSetupSerializer

    def create(self, request):
        for givs_i in GovIdVerificationSession.objects.all().filter(user=request.user,
                                                                    status=IdVerifChoices.PENDING):
            givs_i.status = IdVerifChoices.CANCELLED
            givs_i.save()

        givs = GovIdVerificationSession.objects.all().filter(user=request.user)
        response = super(GovIdVerificationNameSetupView, self).create(request)
        response.data['words'] = self.givs.verification_words
        response.data['requestId'] = self.givs.verification_request
        '''
        else:
            data = {}
            #TODO THIS IS SUPER INSECURE!!!!!!!
            data['words'] = eval(givs.first().verification_words)
            data['requestId'] = givs.first().verification_request
            data['full_name'] = givs.first().full_name
            response = Response(data, status=status.HTTP_201_CREATED)
        '''

        return response

    def perform_create(self, serializer):
        # We want a reference to the GovermentIdVerificationSession
        # because the values held by that reference will allow us
        # to construct an appropriate Response() in self.create
        self.givs = serializer.save()

class GovIdVerificationVideoView(generics.UpdateAPIView):

    permission_classes = (IsAuthenticated,)
    serializer_class = VerificationVideoSerializer
    parser_classes = (FormParser, MultiPartParser)
    def put(self, request, *args, **kwargs):
        for givs in GovIdVerificationSession.objects.all().filter(status=IdVerifChoices.PENDING):
            givs.status = IdVerifChoices.CANCELLED
            givs.save()

        request.data['video'].name = str(uuid.uuid4())
        response = super().put(request, *args, **kwargs)
        givs = GovIdVerificationSession.objects.all().get(verification_request=kwargs['pk'])
        givs.status = IdVerifChoices.PENDING
        request.user.has_verified_gov_id = False
        request.user.save()
        givs.save()

        return response

    def get_queryset(self):
        queryset = GovIdVerificationSession.objects.all()
        verif_req = self.request.query_params.get('verif_req', None)
        if verif_req is not None:
            queryset = queryset.filter(verification_request=verif_req)
        return queryset

