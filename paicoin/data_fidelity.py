import os
import boto3
import tarfile
import datetime
import inotify.adapters
from pathlib import Path

WALLET_PATH = os.environ.get('WALLET_PATH')
S3_WALLET_PATH  = os.environ.get('S3_WALLET_PATH')
DATADIR_PATH = '/home/j1149/.paicoin'
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
DEPLOYMENT_ENV = os.environ.get('DEPLOYMENT_ENVIRONMENT').lower()

session = boto3.session.Session()
resource = session.resource('s3')
bucket = resource.Bucket(BUCKET_NAME)

OUT_FNAME_DATADIR = f'datadir.{DEPLOYMENT_ENV}.tar.gz'
OUT_FNAME_WALLET = f'wallet.{DEPLOYMENT_ENV}.dat'

class ServerBackup:

    def __init__(self, datadir_change_threshold=50 # MB
                 ):

        self.inotif = inotify.adapters.Inotify()
        self.inotif.add_watch(WALLET_PATH)
        self.datadir_prev_size = self.calc_datadir_size()
        self.datadir_change_threshold = datadir_change_threshold
        self.last_datadir_size_check_time = datetime.datetime.now()

    def calc_datadir_size(self):
        datadir = Path(DATADIR_PATH)
        sz_in_bytes = sum(f.stat().st_size for f in datadir.glob('**/*') if f.is_file())
        return sz_in_bytes/(1024*1024)

    def backup(self, ignore_checks=False):
        if ignore_checks or self.has_wallet_changed_significantly():
            self.backup_wallet(dated=True)

        if ignore_checks or self.has_datadir_changed_significantly():
            self.backup_datadir(dated=True)

    def backup_wallet(self, out_fname=None, dated=False):
        if out_fname is None:
            out_fname = OUT_FNAME_WALLET

        if dated:
            out_fname = self.date_backup_fname(out_fname)

        # upload wallet to s3 first
        with open(WALLET_PATH, 'rb') as f:
            bucket.upload_fileobj(f, out_fname)

    def date_backup_fname(self, fname):
        spt = fname.split('.')
        now = datetime.datetime.now().timestamp()
        return spt[0] + '-' + str(now).split('.')[0] + '.' + '.'.join(spt[1:])


    def backup_datadir(self, out_fname=None, dated=False):
        if out_fname is None:
            out_fname = OUT_FNAME_DATADIR
        if dated:
            out_fname = self.date_backup_fname(out_fname)
        datadir_path = 'datadir.tar.gz'
        # no compression; compression can take quite awhile to finish
        og_dir = os.getcwd()
        os.chdir(os.path.dirname(DATADIR_PATH))
        if os.path.exists(datadir_path):
            os.remove(datadir_path)
        with tarfile.open(datadir_path, mode='x:') as archive:
            archive.add('.paicoin', recursive=True, filter=self.exclude_wallet)

        with open(datadir_path, 'rb') as f:
            bucket.upload_fileobj(f, out_fname)
        os.chdir(og_dir)
        self.datadir_prev_size = self.calc_datadir_size()

    def exclude_wallet(self, tarinfo):
        if tarinfo.name.lower() == os.path.basename(WALLET_PATH).lower():
            return None
        return tarinfo

    def has_wallet_changed_significantly(self):
        events = list(self.inotif.event_gen(timeout_s=1e-3, yield_nones=False))
        if len(events) < 1:
            return False

        modified = False
        for event in events:
            (_, event_types, path, filename) = event
            event_types = set(event_types)
            if 'IN_MOVE_SELF' in event_types or 'IN_MODIFY' in event_types:
                modified = True
                break
        # An IN_MOVE_SELF event can effectively disable inotify from
        # watching a file. It seems foolish to test out every event
        # that can cause this and it's better to just add the file all over.
        # Also:
        #   "Calling remove_watch() is not strictly necessary.
        #    The inotify resources is automatically cleaned-up,
        #    which would clean-up all watch resources as well."
        self.inotif.add_watch(WALLET_PATH)
        print(f'Wallet was modified {modified}')
        return modified

    def has_datadir_changed_significantly(self):
        now = datetime.datetime.now()
        diff =  now - self.last_datadir_size_check_time
        if diff.total_seconds()/(60*60) < 1:
            return False
        self.last_datadir_size_check_time = now
        change = self.calc_datadir_size() - self.datadir_prev_size
        return change >= self.datadir_change_threshold

class RestoreServerBackup:

    def restore(self):
        # Restore datadir first in case the wallet.dat is in the datadir
        self.restore_datadir()
        self.restore_wallet()

    def restore_datadir(self):
        try:
            s3_datadir = self.get_s3_obj('datadir')

            og_dir = os.getcwd()
            os.chdir(os.path.dirname(DATADIR_PATH))
            with open('datadir.tar.gz', 'wb') as datadir_tar:
                s3_datadir.download_fileobj(datadir_tar)

            with tarfile.open('datadir.tar.gz') as archive:
                def is_within_directory(directory, target):
                    
                    abs_directory = os.path.abspath(directory)
                    abs_target = os.path.abspath(target)
                
                    prefix = os.path.commonprefix([abs_directory, abs_target])
                    
                    return prefix == abs_directory
                
                def safe_extract(tar, path=".", members=None, *, numeric_owner=False):
                
                    for member in tar.getmembers():
                        member_path = os.path.join(path, member.name)
                        if not is_within_directory(path, member_path):
                            raise Exception("Attempted Path Traversal in Tar File")
                
                    tar.extractall(path, members, numeric_owner=numeric_owner) 
                    
                
                safe_extract(archive)
            os.chdir(og_dir)

        except:
            import traceback
            print(traceback.format_exc())

    def restore_wallet(self):

        s3_wallet = self.get_s3_obj('wallet')
        with open('/home/j1149/.paicoin/wallet.dat', 'wb') as wallet:
            s3_wallet.download_fileobj(wallet)

    def get_date(self, fname):
        name = fname.split('.')[0]
        timestamp = int(name.split('-')[1])
        return datetime.datetime.fromtimestamp(timestamp)

    def get_s3_obj(self, prefix):
        newest_dt = datetime.datetime(1970, 1, 1)
        newest_obj = None
        print(f'Looking for s3 object with the prefix {prefix}')
        for obj in bucket.objects.all():
            if obj.key.lower().startswith(prefix) \
                    and DEPLOYMENT_ENV.lower() in obj.key.lower():
                if '-' not in obj.key:
                    continue
                dt = self.get_date(obj.key)
                if dt > newest_dt:
                    newest_dt = dt
                    newest_obj = obj
        if newest_obj is None:
            raise Exception('Newest object not found!')
        # newest_obj is of type S3.ObjectSummary; we use Object() to retrieve
        # the S3.Object instance.
        print(f'Newest object {newest_obj.key} has a date of {str(newest_dt)}')
        return newest_obj.Object()

def does_datadir_exist():
    if not os.path.exists(DATADIR_PATH):
        return False
    # naive check to see if all files are there.
    return len(os.listdir(DATADIR_PATH)) > 8


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('cmd')
    parser.add_argument('--ignore-checks', action='store_true')
    args = parser.parse_args()
    if args.cmd == 'restore':
        if does_datadir_exist():
            print('Datadir already exists!')
        else:
            print('Restoring datadir and wallet...')
            rsb = RestoreServerBackup()
            rsb.restore()
    elif args.cmd == 'backup':
        sb = ServerBackup()
        sb.backup(ignore_checks=args.ignore_checks)
