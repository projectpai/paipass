import os
import boto3
import datetime


WALLET_PATH = os.environ.get('WALLET_PATH')
S3_WALLET_PATH  = os.environ.get('S3_WALLET_PATH')
DATADIR_PATH = '/home/j1149/.paicoin'
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
DEPLOYMENT_ENV = os.environ.get('DEPLOYMENT_ENVIRONMENT').lower()

session = boto3.session.Session()
resource = session.resource('s3',
                          aws_access_key_id=AWS_ACCESS_KEY_ID,
                          aws_secret_access_key=AWS_SECRET_ACCESS_KEY,)
bucket = resource.Bucket(BUCKET_NAME)

OUT_FNAME_DATADIR = f'datadir.{DEPLOYMENT_ENV}.tar.gz'
OUT_FNAME_WALLET = f'wallet.{DEPLOYMENT_ENV}.dat'




class DeleteFiles:

    def run(self, prefix, min_sz):

        deleted_count = 0
        skipped_count = 0
        for obj in bucket.objects.all():
            if obj.key.lower().startswith(prefix) \
                    and DEPLOYMENT_ENV.lower() in obj.key.lower():
                if '-' not in obj.key:
                    continue
                if obj.size < min_sz:
                    print(f'Deleting file {obj.key} of size {obj.size}')
                    obj.Object().delete()
                    deleted_count += 1
                else:
                    print(f'Skipping file {obj.key} of size {obj.size}')
                    skipped_count += 1

        print(f'Deleted {deleted_count} files')
        print(f'Skipped {skipped_count} files')

if __name__ == '__main__':
    df = DeleteFiles()
    df.run('wallet', 1700000)
