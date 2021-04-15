from rest_framework import serializers
from .models import PaipassApplication
class ApplicationsListSerializer(serializers.ModelSerializer):

    class Meta:
        model = PaipassApplication
        fields = ('id', 'logo_url', 'namespace', 'description',)

