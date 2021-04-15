FROM ubuntu:18.04 as build-stage

ENV LANG C.UTF-8

# install paicoin
WORKDIR /home/j1149/paicoin
ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && apt-get update && apt-get install -y --no-install-recommends build-essential libtool autotools-dev automake \
    pkg-config libssl-dev libevent-dev bsdmainutils python3 \
    libboost-system-dev libboost-filesystem-dev \
    libboost-chrono-dev libboost-program-options-dev \
    libboost-test-dev libboost-thread-dev \
    && apt-get install -y software-properties-common \
    && add-apt-repository ppa:bitcoin/bitcoin \
    && apt-get install -y libdb4.8-dev libdb4.8++-dev git-all \
    && apt-get install -y curl gnupg gosu wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
#
RUN cd /home \
    && git clone https://github.com/projectpai/paicoin.git \
    && cd /home/paicoin \
    && sh ./autogen.sh \ 
    && ./configure \ 
    && make STATIC=1 -j 8 USE_UPNP= \
    && make install \
    && rm -rf /home/paicoin

# Having trouble creating a statically linked paicoind; leaving this here
# as a reminder to reduce image size
#FROM ubuntu:18.04
#COPY --from=build-stage /usr/local/bin /usr/local/bin
#RUN useradd -rm -d /home/j1149 -s /bin/bash -g root -G sudo -u 1000 j1149
ARG CONDA_PREFIX=/opt/conda
RUN apt-get update && apt-get install -y wget
COPY requirements.txt requirements.txt
RUN wget \
    https://repo.anaconda.com/miniconda/Miniconda3-4.7.12.1-Linux-x86_64.sh \
    && bash Miniconda3-4.7.12.1-Linux-x86_64.sh -b -p ${CONDA_PREFIX} \
    && rm -f Miniconda3-4.7.12.1-Linux-x86_64.sh \
    && touch ~/.bashrc \
    && ${CONDA_PREFIX}/bin/conda init bash \
    && ${CONDA_PREFIX}/bin/pip install -r requirements.txt \
    && apt-get update \
    && apt-get install -y vim iproute2 curl htop \
    && find ${CONDA_PREFIX} -follow -type f -name '*.a' -delete \
    && find ${CONDA_PREFIX} -follow -type f -name '*.js.map' -delete 
    #&& ${CONDA_PREFIX}/bin/conda clean -afy
   
COPY ./crypto.conf /home/j1149/.paicoin/crypto.conf
COPY . .
EXPOSE 8675 5000
#ENTRYPOINT exec /bin/bash ./entrypoint.sh
#ENTRYPOINT tail -f /dev/null
#ENTRYPOINT ["/opt/conda/bin/python", "app.py"]
ENTRYPOINT ["/bin/bash", "/home/j1149/paicoin/entrypoint.sh"]
#ENTRYPOINT ["/opt/conda/bin/python", "app.py"]

