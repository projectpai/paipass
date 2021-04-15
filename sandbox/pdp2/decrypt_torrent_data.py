import subprocess

import ecies
import transmissionrpc
from bit import Key


def get_cfg(path=None):
    if path is not None and not os.path.exists(os.path.expanduser(path)):
        raise Exception(f'The config path {path} cannot be found')

    if path is None:
        j = {}
        j['rpc-port'] = 9091
        j['rpc-password'] = ""
        j['rpc-username'] = ""
        j['rpc-bind-address'] = '0.0.0.0'
        j['download-dir'] = os.getcwd()
    else:
        with open(os.path.expanduser(path), 'r') as f:
            j = json.load(f)
    return j


def get_or_verify_path(path):
    if path is None:
        for path_i in os.listdir('./'):
            if path_i.endswith('.torrent'):
                path = path_i

    if path is None:
        raise Exception(f'The path cannot be found.')

    if not os.path.exists(os.path.expanduser(path)):
        raise Exception(f'The path {path} cannot be found.')

    return path


def get_rpc_client(cfg):
    tc = transmissionrpc.Client(address=cfg['rpc-bind-address'],
                                port=cfg['rpc-port'],
                                user=cfg['rpc-username'],
                                password=cfg['rpc-password'])
    return tc


def remove_any_existing_torrents(tc, path):
    hash = get_torrent_hash(path)
    for torrent in tc.get_torrents():
        if torrent.hashString == hash:
            print(f"Removing torrent with the name: {torrent.name}")
            tc.remove_torrent((torrent.id,), delete_data=True)
            return


def get_torrent_hash(path):
    cmd = 'transmission-show'
    args = [cmd, path]
    byte_encoded_output = subprocess.check_output(args)
    s = byte_encoded_output.decode('utf-8')
    hash_line = None
    for line in s.split('\n'):
        if 'hash' in line.lower():
            hash_line = line
    if hash_line is None:
        raise ValueError('The hash of the torrent could not be found')
    hash = hash_line.split()[1]
    return hash


def printed_progress(fn):
    last_progress_update = 0
    last_progress = -1

    def wrapper(tc, torrent):
        nonlocal last_progress_update
        nonlocal last_progress
        progress = fn(tc, torrent)
        no_progress = last_progress == progress
        substantial_progress = int(progress) - last_progress_update > 0.01
        if (int(progress) % 2 == 0 and substantial_progress) or no_progress:
            print(progress)
            last_progress_update = int(progress)
            last_progress = progress
            if no_progress:
                print()
        return progress

    return wrapper


@printed_progress
def get_torrent_progress(tc, torrent):
    try:
        progress = tc.get_torrent(torrent.id).progress
    except KeyError as e:
        import traceback
        print(traceback.format_exc())
        return 0
    return progress


def download_torrent(path, cfg):
    tc = get_rpc_client(cfg)
    remove_any_existing_torrents(tc, path)
    torrent = tc.add_torrent(path)

    progress = get_torrent_progress(tc, torrent)
    while progress < 100:
        progress = get_torrent_progress(tc, torrent)
    return progress


def get_torrent_data_path(path, cfg):
    download_dir = cfg['download-dir']
    tc = get_rpc_client()
    hash = get_torrent_hash(path)
    for torrent in tc.get_torrents():
        if torrent.hashString == hash:
            if len(torrent.files()) != 1:
                raise Exception(f'There should only be 1 file per torrent'
                                f' but there is {len(torrent.files())} files.'
                                f' for the torrent name:'
                                f' {os.path.basename(path)}')
            fname = torrent.files()[0]['name']
            path = os.path.join(download_dir, fname)
            if not os.path.exists(path):
                raise Exception(f'A file could not be found at: \n{path}\n'
                                f' for the torrent name:'
                                f' {os.path.basename(path)}')
            return path
    return None


def decrypt(wif_private_key, torrent_path, cfg):
    path = get_torrent_data_path(torrent_path, cfg)
    priv_key = Key(wif_private_key)
    with open(path, 'rb') as f:
        encrypted_s = f.read()
    unencrypted_s = ecies.decrypt(priv_key._pk.secret, encrypted_s)
    unencrypted_j = json.loads(unencrypted_s)
    return unencrypted_j


if __name__ == '__main__':
    import argparse
    import os
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument('private_key',
                        help='The private key corresponding to the public key used to encrypt the torrent data')
    parser.add_argument('-p', '--torrent-path',
                        dest='torrent_path',
                        help='path to the torrent file')
    parser.add_argument('-c', '--cfg',
                        dest='cfg_path',
                        help='path to the torrent file')
    args = parser.parse_args()
    print(args)

    private_key = args.private_key

    cfg = get_cfg(args.cfg_path)
    torrent_path = get_or_verify_path(args.torrent_path)
    print(f"We are using the following parameters from the provided config:\n"
          f"rpc-username {cfg['rpc-username']}\n"
          f"rpc-password {cfg['rpc-password']}\n"
          f"rpc-bind-address {cfg['rpc-bind-address']}\n"
          f"rpc-port {cfg['rpc-port']}\n")

    progress = download_torrent(torrent_path, cfg)
    if progress < 100:
        raise Exception(f"Something went wrong; the torrent didn't download completely;"
                        f" the torrent had a completion percentage of {progress}")
    unencrypted_json = decrypt(private_key, torrent_path, cfg)

    print(f"The unecrypted json for the torrent at {torrent_path} is:"
          f" {unencrypted_json}")
