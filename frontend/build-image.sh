#!/usr/bin/env bash

TAG_NAME=$1

eval "$(conda shell.bash hook)"

yarn build-$TAG_NAME

sudo docker build -t redux_paipass_user_frontend_$TAG_NAME .
# change to paipass env in the future
conda activate pdp2
sudo $(aws ecr get-login --no-include-email --region us-east-1)

sudo docker tag redux_paipass_user_frontend_$TAG_NAME 944740511691.dkr.ecr.us-east-1.amazonaws.com/redux-paipass-user-frontend:redux_paipass_user_frontend_$TAG_NAME

sudo docker push 944740511691.dkr.ecr.us-east-1.amazonaws.com/redux-paipass-user-frontend:redux_paipass_user_frontend_$TAG_NAME

#sudo rm -R build
