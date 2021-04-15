#!/usr/bin/env bash

TAG_NAME=$1

eval "$(conda shell.bash hook)"

npm run build-$TAG_NAME

sudo docker build -t paipass_admin_$TAG_NAME .

conda activate paipass

sudo $(aws ecr get-login --no-include-email --region us-east-1)

sudo docker tag paipass_admin_$TAG_NAME 944740511691.dkr.ecr.us-east-1.amazonaws.com/paipass-admin-frontend:paipass_admin_$TAG_NAME

sudo docker push 944740511691.dkr.ecr.us-east-1.amazonaws.com/paipass-admin-frontend:paipass_admin_$TAG_NAME
