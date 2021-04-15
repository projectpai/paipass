from rest_framework import serializers

# Local
from .models import Attribute, AllowedValue
from oauth2.models import PaipassApplication
#from debug.tools.dissect import print_object
class AllowedValueSerializer(serializers.Serializer):

    application = serializers.UUIDField(source='clientId')
    value = serializers.CharField()

class FormatSerializer(serializers.Serializer):

    regex = serializers.CharField()
    description = serializers.CharField()

class AttributeSerializer(serializers.Serializer):
    # messy for the sake of time; this could be cleaned up with a namedtuple
    optional_fields ={"description": ["description", serializers.CharField],
                      'maxValues': ["max_values", serializers.IntegerField],
                      'maxOwnerPerms': ["max_owner_perms",
                                        serializers.IntegerField],
                      'maxAllPerms': ['max_all_perms',
                                      serializers.IntegerField],
                      'format': ['format', FormatSerializer],

                      }

    application = serializers.UUIDField(source='clientId')
    name = serializers.CharField(source='keyName')
    description = serializers.CharField()
    is_editable = serializers.BooleanField(source='isEditable')

    def __new__(cls, *args, **kwargs):
        cls.construct_optional_fields(kwargs['data'])
        return super().__new__(cls, *args, **kwargs)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.optional_fields:
            if hasattr(self.__class__, field):
                self.fields[field] = getattr(self.__class__, field)

    @classmethod
    def construct_optional_fields(cls, data):
        for field in cls.optional_fields:
            if field in data:
                cls.construct_optional_field(field)

    @classmethod
    def construct_optional_field(cls, name):
        optional_field = cls.optional_fields[name]
        cls_attr_name = optional_field[0]
        Field = optional_field[1]
        if name!=cls_attr_name:
            setattr(cls, cls_attr_name, Field(source=name))
        else:
            setattr(cls, cls_attr_name, Field())


class CreateAttributeSerializer(serializers.Serializer):

    def __new__(cls, *args, **kwargs):
        cls.construct_fields(kwargs['data'])
        return super().__new__(cls, *args, **kwargs)

    def __init__(self, *args, **kwargs):
        fields = kwargs.pop('fields', None)
        super().__init__(*args, **kwargs)
        self.fields['allowedValues'] = self.allowedValues
        self.fields['attribute'] = self.attribute


    @classmethod
    def construct_fields(cls, data):
        setattr(cls, 'attribute', AttributeSerializer(data=data))
        if 'allowedValues' in data:
            allowed_values = AllowedValueSerializer(many=True)
            setattr(cls, 'allowedValues', allowed_values)
        #_, s = print_object('CreateAttributeSerializer.construct_fields.cls',
        #                    cls)
        #print(s,flush=True)

    def create(self, validated_data):
        attr = validated_data['attribute']
        format = attr.pop('format')
        attr['format_regex'] = format['regex']
        attr['format_description'] = format['description']
        attr['application'] = PaipassApplication.objects.all().get(id=attr.pop('clientId'))
        attr['name'] = attr.pop('keyName')
        attr['is_editable'] = attr.pop('isEditable')

        preexisting_attrs = Attribute.objects.all().filter(application=attr['application'],
                                                           name=attr['name'])
        if preexisting_attrs.count() > 0:
            attribute = preexisting_attrs.first()
            attribute.update(**attr)
            attribute.save()
            for allowed_value in validated_data['allowedValues']:
                av = AllowedValue.objects.all().get(attribute=attribute)
                av.update(value=allowed_value['value'])
                av.save()
        else:
            attribute = Attribute.objects.create(**attr)
            attribute.save()
            for allowed_value in validated_data['allowedValues']:

                av = AllowedValue.objects.create(value=allowed_value['value'],
                                                 attribute=attribute)
                av.save()
        return attribute
