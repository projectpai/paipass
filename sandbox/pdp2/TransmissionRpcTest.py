import os
import subprocess
import time

import transmissionrpc


def get_rpc_client():
    port = 9292
    password = r"{af1f44806ab106b5a9925b7622c7ee126457e588y440p.pq"
    username = ""
    address = '0.0.0.0'

    tc = transmissionrpc.Client(address=address,
                                port=port,
                                user=username,
                                password=password)
    return tc

def rpc_usage1():
    '''
    Tests addition/removal of torrent to transmission-daemon
    '''

    tc = get_rpc_client()
    path = r'/home/rxhernandez/Downloads/ubuntu-19.10-desktop-amd64.iso.torrent'
    '''
    had to reverse engineer the following
    t._fields
    {'hashString': Field(value='e2467cbf021192c241367b892230dc1e05c0580e', dirty=False), 'id': Field(value=7, dirty=False), 'name': Field(value='ubuntu-19.10-desktop-amd64.iso', dirty=False)}
    '''
    torrent = tc.add_torrent(path)
    print(tc.get_torrents(), flush=True)
    tc.remove_torrent((torrent.id,))
    print(tc.get_torrents())

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



def remove_any_existing_torrents(tc, path):
    hash = get_torrent_hash(path)
    for torrent in tc.get_torrents():
        if torrent.hashString == hash:
            print(f"Removing torrent with the name: {torrent.name}")
            tc.remove_torrent((torrent.id,), delete_data=True)
            return
    print(f"No torrent found corresponding to the hash {hash} and path {path}")


def printed_progress(fn):
    last_progress_update = 0
    last_progress = -1
    def wrapper(tc, torrent):
        nonlocal last_progress_update
        nonlocal last_progress
        progress = fn(tc, torrent)
        no_progress = last_progress == progress
        substantial_progress = last_progress_update != int(progress)
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

def rpc_usage2():
    tc = get_rpc_client()
    #path = str(os.path.join(os.getcwd(), 'test.torrent'))
    path = r'/home/rxhernandez/Downloads/ubuntu-19.10-desktop-amd64.iso.torrent'
    remove_any_existing_torrents(tc, path)
    torrent = tc.add_torrent(path)

    progress = 0
    while progress < 100:
        progress = get_torrent_progress(tc, torrent)
    print('Torrent Completed Downloading!')
    tc.remove_torrent((torrent.id,), delete_data=True)



if __name__ == '__main__':
    rpc_usage2()
