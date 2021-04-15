# Core
import logging
import sys

from django.shortcuts import render
from django.conf import settings

# Third party
from rest_framework import generics
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

# Local
from .models import TorrentInfoHash
from .serializers import TorrentInfoHashSerializer
from . import opentracker

logger = settings.LOGGER


class AddTorrentInfoHash(generics.CreateAPIView):
    serializer_class = TorrentInfoHashSerializer
    # TODO Perhaps it would make sense to require a login? I'm not really sure
    # if it would matter because if the containers have been compromised to the
    # point where this can be accessed it would
    permission_classes = (AllowAny,)
    allowed_methods = ('POST', 'OPTIONS', 'HEAD')

    def get_object(self):
        prev_info_hash = self.request.data['prev_info_hash']
        return TorrentInfoHash.objects.get(info_hash=prev_info_hash)

    def post(self, request):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.is_valid():
            info_hash = serializer.validated_data['info_hash']
            prev_info_hash = serializer.validated_data['prev_info_hash']
            self.replace_infohash(info_hash, prev_info_hash)
            opentracker.notify()
            return Response({'message': 'Successfully created'},
                            status=status.HTTP_200_OK)
        return Response({'message': 'invalid info hash'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def is_valid_infohash(self, infohash):
        return True

    def replace_infohash(self, infohash, prev_info_hash):
        ''' Replace infohash of a torrent that contains old user data '''
        qs = TorrentInfoHash.objects.all().filter(info_hash=prev_info_hash)
        if qs.count() < 1:
            tih = TorrentInfoHash.objects.create(info_hash=infohash)
        elif qs.count() == 1:
            tih = qs.first()
            tih.info_hash = infohash
        else:
            raise EnvironmentError(f'There is {qs.count()} for the '
                                   f'prev_info_hash of {prev_info_hash} '
                                   f'There should only be one!')
        tih.save()
        return tih


class RemoveTorrentInfoHash(generics.CreateAPIView):

    def post(self, request):
        info_hash = request.data['info_hash']
        qs = TorrentInfoHash.objects.all().filter(info_hash=info_hash)
        if qs.count() > 1:
            logger.warn(f'The number of info hashes with the info hash {info_hash} is'
                        f' {qs.count()}.')
        for torrent_info_hash in qs:
            torrent_info_hash.delete()
        opentracker.notify()
        return Response({}, status=status.HTTP_200_OK)
