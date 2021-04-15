from django.utils.translation import ugettext_lazy as _
from django.contrib.auth import get_user_model, authenticate
from django.conf import settings

# third-party
from rest_framework import serializers
from .models import Pdp2Transaction

# local
from .models import Pdp2ProfileSubscription

class GenPubKeyAddrSerializer(serializers.Serializer):

    pub_key_addr = serializers.CharField()

class GetPaymentAddress(serializers.Serializer):

    pub_key_addr = serializers.CharField()

class ReceivePtcSerializer(serializers.Serializer):

    tx_id = serializers.CharField()


class TxnsListSerializer(serializers.ModelSerializer):

    class Meta:
        model = Pdp2Transaction
        fields = ('id', 'pub_key_addr', 'created_on', 'pdp2_op_return_txid',
                  'pdp2_op_return_ref', 'pub_key', 'is_store_op',)