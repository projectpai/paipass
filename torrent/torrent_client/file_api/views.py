import bencode
import hashlib
import json
import magic
import requests
import subprocess
import sys
import shortuuid
import uuid

from django.conf import settings
from django.core.files import File
from django.http import HttpResponse
from django.core.files.storage import default_storage
# from rest_framework.parsers import FileUploadParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework import status

import multiprocessing as mp
import transmissionrpc
import os.path
from django.http import HttpRequest

import traceback

import logging

from .models import Torrent

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

fh = logging.FileHandler(settings.LOG_FILE)
fh.setLevel(logging.DEBUG)

logFormatter = logging.Formatter("%(asctime)s [%(levelname)-5.5s]  %(message)s")
fh.setFormatter(logFormatter)

logger.addHandler(fh)

stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setLevel(logging.DEBUG)
stdout_handler.setFormatter(logFormatter)
logger.addHandler(stdout_handler)


class UploadTorrentFile(APIView):
    """
    View to upload .torrent file to server

    """
    http_method_names = ('post',)

    # parser_classes = (FileUploadParser,)

    def post(self, request):
        logger.info('Got upload torrent file request')
        try:
            file_obj = request.FILES['file']
            logger.debug('got file {}'.format(file_obj))
        except:
            logger.error(traceback.format_exc())
            msg = 'Error reading file'
            logger.error(msg)
            logger.error(traceback.format_exc())
            return api_response(error=True, message=msg)

        mime_type = magic.from_buffer(file_obj.read(1024), mime=True)
        if mime_type not in ('application/octet-stream', 'application/x-bittorrent'):
            msg = 'File should be of application/octet-stream MIME type, not {}'.format(mime_type)
            logger.error(msg)
            return api_response(error=True, message=msg)

        # generated unique torrent name
        _uuid = get_uuid()
        filename = '{}.torrent'.format(_uuid)
        dirpath = os.path.join(settings.MEDIA_ROOT, settings.BITTORRENT_TORRENT_FILE_DIR)
        file_path = '{}/{}'.format(dirpath, filename)
        logger.debug('Generated unique torrent file name {} for {}'.format(filename, file_obj))
        logger.info('Saving file')
        # save file
        try:
            with open(file_path, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)
        except:
            logger.error(traceback.format_exc())
            msg = 'Could not save file'
            logger.error(msg + ' ' + file_obj)
            logger.error(traceback.format_exc())
            return api_response(error=True, message=msg)

        # add torrent transmission-remote- a
        import warnings
        warnings.warn("Adding torrent to tracker implementation is"
                      "commented out!")
        # add_torrent_to_tracker(file_path)
        msg = 'Torrent added'
        logger.debug('Success')

        return api_response(error=False, message=msg, file_id=_uuid)


class DownloadTorrentFile(APIView):
    """
    View to download .torrent file from server
    """
    http_method_names = ('get',)

    def get(self, request, file_uuid):
        filename = '{}.torrent'.format(file_uuid)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        logger.info('Download torrent {} request from {}'.format(file_uuid, ip))
        dirpath = os.path.join(settings.MEDIA_ROOT, settings.BITTORRENT_TORRENT_FILE_DIR)
        path = os.path.join(dirpath, filename)
        # it's possible that the file was deleted in between container initializations
        if not os.path.exists(path):
            qs = Torrent.objects.all().filter(torrent_file=path)
            torrent = qs.first()

            with torrent.torrent_file.open('rb') as fin:
                with open(torrent.torrent_file.name, 'wb') as fout:
                    for el in fin:
                        fout.write(el)

            with torrent.user_data_file.open('rb') as fin:
                with open(torrent.user_data_file.name, 'wb') as fout:
                    for el in fin:
                        fout.write(el)
            trans_client = get_transmission_rpc_client()
            torrent = trans_client.add_torrent(torrent.torrent_file.name)
        # with open('{}/{}'.format(dirpath, filename) + '.added', 'rb') as source:
        with open(path, 'rb') as source:
            response = HttpResponse(source)
        response['Content-Disposition'] = 'attachment; filename="{}"'.format(filename)

        return response


class MakeTorrent(APIView):
    http_method_names = ('post')
    parser_classes = (MultiPartParser,)

    def post(self, request, format=None):

        logger.info('Got make torrent request')
        try:
            file, file_path = self.get_file_and_path(request)
        except:
            msg = 'Could not read file or wrong key name, use \'file\' as key'
            logger.error(msg)
            logger.error(traceback.format_exc())
            return api_response(error=True, message=msg)

        try:
            self.save_user_data_file(file, file_path)
        except Exception as e:
            msg = 'Could not save file'
            logger.error('Error saving file to {}'.format(file_path))
            logger.error(traceback.format_exc())
            return api_response(error=True, message=msg)
        msg = []
        prev_info_hash = request.data['prev_info_hash']
        # if prev_info_hash == settings.NEW_INFO_HASH:
        #     uid = get_uuid()
        # else:
        #     torrent = Torrent.objects.all().get(info_hash=prev_info_hash)
        #     uid = torrent.file_uuid
        if 'uuid' in request.data:
            uid = request.data['uuid']
        else:
            qs = Torrent.objects.all().filter(info_hash=prev_info_hash)
            if qs.count() > 1:
                torrent = qs.first()
                uid = torrent.file_uuid
            else:
                uid = get_uuid()

        try:
            torrent_path = self.create_torrent(file_path, file, uid, msg)
        except OSError as e:
            logger.error(traceback.format_exc())
            msg = 'Error while creating torrent file'
            logger.error('Error while executing torrent create command: ERRNO[{}] {}'.format(e.errno, e.strerror))
            return api_response(error=True, message=msg)
        except:
            logger.error(traceback.format_exc())
            logger.error('Error while executing torrent create command: {}'.format(sys.exc_info()[0]))
            msg = 'Error while creating torrent file'
            return api_response(error=True, message=msg)
        trans_client = get_transmission_rpc_client()
        torrent = trans_client.add_torrent(torrent_path)
        info_hash = get_info_hash(torrent_path)
        add_torrent_to_tracker(torrent_path, info_hash, prev_info_hash)
        self.add_to_db(request, file_path, torrent_path, torrent.id, uid)

        msg.append('Torrent added')
        logger.debug('Success')
        return api_response(error=False, message=msg, file_id=uid, torrent_info_hash=info_hash)

    def get_file_and_path(self, request):
        # trying to get file
        file = request.FILES['file']
        logger.debug('Got file: {}'.format(file))

        # check the filename for wrong characters (required for transmission),
        # and check if file with following
        dirpath = os.path.join(settings.MEDIA_ROOT, settings.BITTORRENT_TORRENT_DATA_DIR)
        file_path = '{}/{}'.format(dirpath, file)
        return file, file_path

    def save_user_data_file(self, file, file_path):

        # filename already exists
        chars = set('()\'\"$%#@!&^* ')
        if any((c in chars) for c in file._name):
            msg = 'Invalid file name {}'.format(file._name)
            logger.error(msg)
            return api_response(error=True, message=msg)

        if os.path.isfile(file_path):
            msg = 'File already exists {}'.format(file_path)
            logger.error(msg)
            return api_response(error=True, message=msg)

        # upload file
        logger.debug('Saving file {} to {}'.format(file, file_path))
        count_cores = mp.cpu_count()
        if count_cores > 8:
            # multiprocessing
            pool = mp.Pool(count_cores - 1)
            jobs = []
            with open(file_path, 'wb+') as destination:
                for line in file:
                    jobs.append(pool.apply_async(destination.write,
                                                 (line,)))

            for job in jobs:
                job.get()
            pool.close()

        else:
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

    def create_torrent(self, file_path, file, uid, msg):
        # make torrent
        torrent_file = '{}.torrent'.format(uid)
        dirpath = os.path.join(settings.MEDIA_ROOT, settings.BITTORRENT_TORRENT_FILE_DIR)
        torrent_path = '{}/{}'.format(dirpath,
                                      torrent_file)
        logger.debug('Generated unique torrent name {} for {}'.format(torrent_file, file))
        logger.info('Creating torrent {}'.format(torrent_file))

        trs = []
        for tr in settings.TRACKERS:
            trs.append(' -t {}'.format(tr))
        trs = ''.join(trs)
        cmd = 'transmission-create -o {} {} {}'.format(torrent_path, trs, file_path)
        logger.debug('Executing command: {}'.format(cmd))

        p = subprocess.Popen([cmd], shell=True)
        p.wait()
        out, err = p.communicate()
        logger.debug('Popen create torrent return code: {}, output: {}'.format(p.returncode, out))
        if err:
            raise Exception('Error in Popen: [returncode: {}] [error: {}]'.format(p.returncode, err.strip()))

        msg.append('Torrent created')
        # add torrent
        logger.info('Adding torrent {}'.format(torrent_file))
        return torrent_path

    def add_to_db(self, request, file_path, torrent_path, transmission_torrent_id, torrent_file_uuid):
        prev_info_hash = request.data['prev_info_hash']
        info_hash = get_info_hash(torrent_path)
        with open(file_path, 'rb') as user_data_file, open(torrent_path, 'rb') as torrent_file:
            qs = Torrent.objects.all().filter(info_hash=prev_info_hash)
            if qs.count() > 0:
                if qs.count() > 1:
                    raise Exception('There should not be more than one torrent file with the hash of'
                                    f'{prev_info_hash}.')

                torrent = qs.first()
                if torrent.file_uuid != torrent_file_uuid:
                    raise Exception(f'Torrent file uuid changed for {torrent_path} with info hash {prev_info_hash}'
                                    f' from {torrent.file_uuid} to {torrent_file_uuid}')

                # It makes no sense to keep the torrent hereafter;
                # if the torrent ends up being shared w.r.t. the OAuth2 implementation,
                # the requestor of the data shouldn't be able to access the data
                # more than one time.
                delete_torrent(torrent_model=torrent, delete_data_only=True)
                torrent.torrent_file = File(torrent_file)
                torrent.user_data_file = File(user_data_file)
                torrent.info_hash = info_hash
                torrent.transmission_torrent_id = transmission_torrent_id


            else:
                torrent = Torrent.objects.create(torrent_file=File(torrent_file),
                                                 user_data_file=File(user_data_file),
                                                 info_hash=info_hash,
                                                 transmission_torrent_id=transmission_torrent_id,
                                                 file_uuid=torrent_file_uuid)
            torrent.save()


class DeleteTorrentView(APIView):
    http_method_names = ('post',)

    def post(self, request):
        info_hash = request.data['info_hash']
        torrent = Torrent.objects.all().get(info_hash=info_hash)
        delete_torrent(torrent, delete_data_only=False)
        remove_torrent_from_tracker(info_hash)
        return Response({}, status=status.HTTP_200_OK)


def delete_torrent(torrent_model, delete_data_only=True):
    trans_client = get_transmission_rpc_client()
    trans_client.remove_torrent(torrent_model.transmission_torrent_id,
                                delete_data=True)
    if not delete_data_only:
        torrent_model.delete()


def get_info_hash(torrent_path):
    # Open the file and decode it
    with open(torrent_path, 'rb') as f:
        d = bencode.bdecode(f.read())
    # Get the torrent info from the decoded file.
    info = d['info']
    # hash it with a sha1
    hashed = hashlib.sha1(bencode.bencode(info)).hexdigest()
    return hashed


def add_torrent_to_tracker(torrent_path, info_hash, prev_info_hash):
    # get the url to post the torrent to
    whitelist_url = settings.BACKEND_TRACKER_URL \
                    + 'whitelist-api/add-torrent-info-hash/'
    data = {'info_hash': info_hash, 'prev_info_hash': prev_info_hash}
    response = requests.post(whitelist_url,
                             data=data)
    response.raise_for_status()
    return response


def remove_torrent_from_tracker(info_hash):
    whitelist_url = settings.BACKEND_TRACKER_URL \
                    + 'whitelist-api/del-torrent-info-hash/'
    data = {'info_hash': info_hash}
    response = requests.post(whitelist_url,
                             data=data)
    response.raise_for_status()
    return response


def get_transmission_rpc_client():
    tc = transmissionrpc.Client(address=settings.TRANSMISSION_ADDRESS,
                                port=settings.TRANSMISSION_PORT,
                                user=settings.TRANSMISSION_USERNAME,
                                password=settings.TRANSMISSION_PASSWORD)
    return tc


def api_response(error, message, file_id=None, torrent_info_hash=None):
    if not error:
        # payload = {
        #     "status": {
        #         "message": message,
        #         "status": "SUCCESS",
        #         "messageid": "msg_103_info"
        #     },
        #     "content": {
        #         "url": "{}/file_api/download/{}/".format(settings.SITE_URL, file_id)
        #     }
        # }
        payload = {
            "result": "Success",
            "id": file_id,
            'torrent_info_hash': torrent_info_hash,
            "url": "{}/file_api/download/{}/".format(settings.SITE_URL, file_id),
            "cost": 0
        }
    else:
        payload = {
            "status": {
                "message": message,
                "status": "ERROR",
                "messageid": "msg_9000_error"
            }
        }
    return Response(payload)

def get_uuid():
    if settings.BLOCKCHAIN_TYPE.lower() == 'paicoin':
        _uuid = uuid.uuid4()
    elif settings.BLOCKCHAIN_TYPE.lower() == 'bitcoin':
        _uuid = shortuuid.ShortUUID().random(length=settings.PAI_PDP2_PROTOCOL.OP1_SZ)
    else:
        raise Exception(f'Blockchain type {settings.BLOCKCHAIN_TYPE}')
    return _uuid