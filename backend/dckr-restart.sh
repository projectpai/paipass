#!/bin/bash
# This happens often enough. Basically the db will be outdated and I need
# to bring it down to bring the needed changes that happened in the backend.

set -e
eval "$(conda shell.bash hook)"
conda activate paipass
# PyCharm screws up things by using this directory as a volume.
# This script is meant to clean up all files that hinder a clean rebuild.
# Yes, it's worth it. I've used Vim for 8 months religiously and being  
# able to poke at every part of the system with ease is worth this 
# massive pain.
sudo env PATH=${PATH} PAIPASS_DIRECTORY=${PAIPASS_DIRECTORY} \
	python ${PAIPASS_DIRECTORY}/backend/docker/cleanup.py
conda deactivate
sudo docker-compose --project-directory ${PAIPASS_DIRECTORY} rm -fsv db
sudo docker-compose --project-directory ${PAIPASS_DIRECTORY} up -d \
	--build backend
