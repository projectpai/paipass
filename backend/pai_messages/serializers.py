from .models import Message, Thread, ThreadRecipient
from rest_framework import serializers
from attributes import attributes


class MessageListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'body', 'sender', 'sent_at', 'deleted_at',)

    def to_representation(self, instance):
        res = super().to_representation(instance)

        # if 'request' not in self.context or instance.sender == self.context['request'].user:
        #     res['sender'] = 'self'
        # else:
        res['sender'] = attributes.get_user_as_paicoin_addr(instance.sender)
        return res


class ThreadRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreadRecipient
        fields = ('id', 'recipient', 'representation')


class ThreadSerializer(serializers.ModelSerializer):
    recipients = ThreadRecipientSerializer(many=True, read_only=True)

    class Meta:
        model = Thread
        fields = ('id', 'name', 'owner', 'recipients')
