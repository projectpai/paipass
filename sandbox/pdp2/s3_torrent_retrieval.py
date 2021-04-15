import boto3
import os
import time

s3 = boto3.client(service_name='s3',
                  region_name='us-east-1',
                  aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                  aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])

key = 'development/torrent/torrent_data/tmp02m6j3ce.json'
key = '/development/torrent/torrent_file/aca9ce99-99bd-4f0f-82dd-1f861e9b80ba.torrent'
key = key[1:]

response = s3.get_object_torrent(Bucket=os.environ['AWS_STORAGE_BUCKET_NAME'],
                                 Key=key)

response1 = s3.get_object_torrent(Bucket=os.environ['AWS_STORAGE_BUCKET_NAME'],
                                  Key=key)

response2 = s3.get_object_torrent(Bucket=os.environ['AWS_STORAGE_BUCKET_NAME'],
                                  Key=key)

r1 = response1['Body'].read()
r2 = response2['Body'].read()

assert r1 == r2

with open(f'test{str(int(time.time()))}.torrent', 'wb') as f:
    f.write(response['Body'].read())
print(response)


