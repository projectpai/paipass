set -e
apt-get update 
apt update
apt-get install -y build-essential libtool autotools-dev automake \
    pkg-config libssl-dev libevent-dev bsdmainutils python3 \
    libboost-system-dev libboost-filesystem-dev \
    libboost-chrono-dev libboost-program-options-dev \
    libboost-test-dev libboost-thread-dev

# Berkeley DB
apt-get install -y software-properties-common
add-apt-repository ppa:bitcoin/bitcoin
apt-get install -y libdb4.8-dev libdb4.8++-dev

# Download PaiCoin Source
apt install -y git-all
cd /home
git clone https://github.com/projectpai/paicoin.git

# Build paicoin
cd /home/paicoin
sh ./autogen.sh
./configure
make
make install

# Remove paicoin source
rm -rf /home/paicoin
