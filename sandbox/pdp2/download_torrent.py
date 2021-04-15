import os
import re
import requests

from gen_address import login


HOST = os.environ['BACKEND_HOST']
PORT = os.environ['BACKEND_PORT']
BASE_URL = f'http://{HOST}:{PORT}/'
PDP2_URL = BASE_URL + 'api/v1/pdp2/'


def get_torrent(username, password, dwnld_dirpath=None):
    url = PDP2_URL + 'get-torrent/'
    headers = {'content-type': 'application/json'}
    data = {}
    session = requests.Session()
    response = login(session, username, password)
    response = session.get(url, headers=headers, json=data)
    response.raise_for_status()
    torrent_data = response.content
    content_disp = response.headers['content-disposition']
    filename = re.findall("filename=(.+)", content_disp)[0]
    if dwnld_dirpath is None:
        dwnld_dirpath = os.environ.get('DWNLD_DIRPATH', './')
    path = os.path.join(dwnld_dirpath, f'{filename}')
    print(f'File name of the torrent {filename}')
    with open(path, 'wb') as f:
        f.write(torrent_data)
    return path


if __name__ == '__main__':
    import argparse
    import os

    parser = argparse.ArgumentParser()
    parser.add_argument('username',
                        help='The login username')
    parser.add_argument('password',
                        help='The login password')
    parser.add_argument('-p', '--torrent-path',
                        dest='dirpath',
                        help='The dirpath to download the torrent file into')

    args = parser.parse_args()
    dirpath = args.dirpath
    if dirpath is None:
        dirpath = os.getcwd()

    path = get_torrent(username=args.username,
                       password=args.password,
                       dwnld_dirpath=dirpath)
    print(f'Torrent has been downloaded to {path}')
