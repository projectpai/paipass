FROM ubuntu:18.04

RUN apt-get update \
  && apt-get install -y software-properties-common \
  && add-apt-repository ppa:transmissionbt/ppa \
  && apt-get install -y gettext-base

# debug tools
RUN apt-get install -y vim iproute2 curl htop

# transmission
RUN apt-get install -y transmission-daemon \
  transmission-cli transmission-common libmagic-dev

RUN mkdir /root/.transmission \
  && mkdir -p /home/ubuntu/proj \
  && mkdir -p /var/lib/transmission-daemon/downloads/ \
  && mkdir -p /home/ubuntu/.config/transmission-daemon

ARG TRANSMISSION_HOME=/home/ubuntu/.config/transmission-daemon
ENV TRANSMISSION_HOME=${TRANSMISSION_HOME}
COPY ./configs/transmission/settings.json.template \
  ${TRANSMISSION_HOME}/settings.json.template
ARG DEPLOYMENT_ENVIRONMENT
ENV DEPLOYMENT_ENVIRONMENT=${DEPLOYMENT_ENVIRONMENT}
RUN envsubst '${DEPLOYMENT_ENVIRONMENT}' \
    < '/home/ubuntu/.config/transmission-daemon/settings.json.template' \
    > '/home/ubuntu/.config/transmission-daemon/settings.json'

# Install the necessary python packages
RUN apt-get update && \
	apt-get install -y python3 python3-dev python3-pip libmagic-dev libpq-dev
RUN mkdir -p /home/ubuntu/Downloads
RUN mkdir -p /root/projectpai/files
RUN mkdir -p /root/projectpai/data/torrent/up
RUN mkdir -p /root/projectpai/data/torrent/down

COPY requirements.txt /opt/api/requirements.txt
RUN pip3 install -r /opt/api/requirements.txt 

COPY . /opt/api/



EXPOSE 9091
