import logging

import os
import signal
import subprocess
import sys

'''
if os.environ.get('DJANGO_SETTINGS_MODULE', None) is None:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                          'tracker_backend.settings')
'''
from django.conf import settings

from .models import TorrentInfoHash

logger = settings.LOGGER


def notify():
    dump_config_file()
    send_sighup()


def send_sighup():
    # TODO check the last time a sighup was sent and if it was sent a
    # short time ago and if the rate of additions is faster than
    # some threshold then delay it and send it in x minutes from now.
    command = ["pidof", "opentracker"]
    result = subprocess.run(command, capture_output=True)
    pids = result.stdout.decode('utf-8').split()
    if len(pids) > 1:
        logger.warning("The following pids were found for opentracker:"
                       "\n%s\n" % str(pids))
    # This doesn't seem to work
    # os.kill(int(pids[0]), signal.SIGHUP)
    # Outright killing the process and restarting it
    # works though.
    for pid in pids:
        os.kill(int(pid), signal.SIGKILL)
    command = ['opentracker', '-f', '/usr/local/etc/opentracker.conf']
    subprocess.Popen(command,
                     stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE)


def dump_config_file():
    whitelist_path = os.environ['WHITELIST_PATH']
    if not os.path.exists(whitelist_path):
        raise EnvironmentError("Whitelist configuration file not"
                               " found at %s" % whitelist_path)
    info_hashes = TorrentInfoHash.objects.all()
    with open(whitelist_path, 'w') as f:
        for info_hash in info_hashes:
            logging.info("dumping info hash: %s\n" % info_hash.info_hash)
            f.write(f'{info_hash.info_hash}\n')


'''
if __name__ == '__main__':
    # This file is ran in entrypoint.sh, and we need the whitelist
    # to be dumped immediately
    dump_config_file()
'''
