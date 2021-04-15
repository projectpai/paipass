from rest_framework import serializers
from .models import Dataset, Data

class DatasetsListSerializer(serializers.ModelSerializer):
    schema_name = serializers.CharField(source='schema.name')

    class Meta:
        model = Dataset
        fields = ('id', 'schema_name', 'date_created', )


class DataPeakListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Data