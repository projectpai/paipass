FROM ubuntu:18.04

RUN apt-get update \
  && apt-get install -y software-properties-common \
  && add-apt-repository ppa:transmissionbt/ppa

# debug tools
RUN apt-get install -y vim iproute2 curl htop

# transmission
RUN apt-get install -y transmission-daemon \
  transmission-cli transmission-common libmagic-dev

# Install the necessary python packages
RUN apt-get update && \
	apt-get install -y python3 python3-dev python3-pip libmagic-dev libpq-dev

ARG TRANSMISSION_HOME=/home/ubuntu/.config/transmission-daemon
ENV TRANSMISSION_HOME=${TRANSMISSION_HOME}
COPY ./sandbox/configs/transmission/settings.json \
  ${TRANSMISSION_HOME}/settings.json
RUN mkdir -p /root/projectpai/data/torrent/down

COPY ./sandbox/requirements.txt /opt/api/requirements.txt
RUN pip3 install -r /opt/api/requirements.txt

ENV PYTHONPATH /opt/api:$PYTHONPATH
ENV SRC /opt/api
ARG DWNLD_DIRPATH=/root/projectpai/data/torrent/down
ENV DWNLD_DIRPATH=${DWNLD_DIRPATH}
COPY ./sandbox /opt/api/
COPY ./third_party /opt/api/third_party/
COPY ./core /opt/api/core/
RUN python3 /opt/api/core/third_party_pkg_init.py

EXPOSE 9091