# Core
from django.utils.translation import ugettext_lazy as _
from django.conf import settings
# Third party
from rest_framework import serializers

# Local
from .models import TorrentInfoHash
class TorrentInfoHashSerializer(serializers.Serializer):

    info_hash = serializers.CharField()
    prev_info_hash = serializers.CharField()

    def create(self, validated_data):
        # the requisite dictionary that torrent info hash expects we don't want
        # to have the previous info hash saved in the database
        req_data = {}
        for key, value in validated_data.items():
            if key is not 'prev_info_hash':
                req_data[key] = value
        prev_info_hash = validated_data['prev_info_hash']
        if not prev_info_hash == settings.NEW_INFO_HASH:
            raise ValueError(f"For method create, the prev_info_hash must be {settings.NEW_INFO_HASH}")
        return TorrentInfoHash.objects.create(**req_data)

    def update(self, instance, validated_data):
        info_hash = validated_data.get('info_hash', instance.info_hash)

        instance.info_hash = info_hash
        instance.save()
        return instance

    def _ensure_deletion(self, prev_info_hash):
        if prev_info_hash is not None:
            qs_torrent_info_hash = TorrentInfoHash.objects.filter(prev_info_hash=prev_info_hash)
            for torrent_info_hash in qs_torrent_info_hash:
                torrent_info_hash.delete()



