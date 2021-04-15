# stdlib
from random import randint
# core
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth import get_user_model, authenticate
from django.conf import settings

# third-party
from rest_framework import serializers

# local
from .models import GovIdVerificationSession


class GovIdVerificationSerializer(serializers.Serializer):

    request_id = serializers.UUIDField()


class NameSetupSerializer(serializers.Serializer):

    full_name = serializers.CharField()

    def create(self, validated_data):

        request = self.context['request']
        
        givs = GovIdVerificationSession()
        givs.user = request.user
        givs.full_name = validated_data['full_name']
        givs.save()
        return givs


class VerificationVideoSerializer(serializers.ModelSerializer):

    class Meta:
        model = GovIdVerificationSession
        fields = ('video',)
