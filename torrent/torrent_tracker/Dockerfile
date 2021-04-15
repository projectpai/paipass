FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
  cvs \
  gcc \
  make

# Build libowfat
RUN mkdir build \
  && cd build \
  && cvs -d :pserver:cvs@cvs.fefe.de:/cvs -z9 co libowfat \
  && cd libowfat \
  && make \
  && cd .. \
  && cvs -d:pserver:anoncvs@cvs.erdgeist.org:/home/cvsroot co opentracker

# Remove lz option (why did they remove compression?) and add whitelist feature
RUN cat /build/opentracker/Makefile | sed -e 's/-lz//g' \
  -e 's/#FEATURES+=-DWANT_ACCESSLIST_WHITE/FEATURES+=-DWANT_ACCESSLIST_WHITE/g'\
  > /tmp/Makefile \
  && cp /tmp/Makefile /build/opentracker/Makefile

# Build Open Tracker
RUN cd /build/opentracker \
  && make \
  && ln -s /build/opentracker/opentracker /usr/local/bin/opentracker

# Install Python/Django; TODO what's the purpose of libmagic?
RUN apt-get update \
  && apt-get install -y libpq-dev python3.7 python3.7-dev \ 
  python3-pip libmagic-dev \
  && python3.7 -m pip install --upgrade pip

RUN apt-get update && apt-get install -y iproute2 htop

COPY requirements.txt /opt/api/requirements.txt
RUN pip3 install -r /opt/api/requirements.txt
ARG WHITELIST_PATH=/usr/local/etc/whitelist.conf
# Environmental variable later used by the django backend.
ENV WHITELIST_PATH=${WHITELIST_PATH}
# Add Configuration
ADD configs/opentracker.conf /usr/local/etc/opentracker.conf
ADD configs/whitelist.conf ${WHITELIST_PATH}

# Add Entrypoint
ADD ./entrypoint.sh /opt/api/entrypoint.sh

# Add the rest of the python stuff lazily
ADD . /opt/api/

ARG PYTHONPATH=/opt/api
ENV PYTHONPATH=${PYTHONPATH}

