#! /bin/bash
/opt/conda/bin/python /home/j1149/paicoin/data_fidelity.py restore
#paicoind -daemon -testnet -txindex -datadir=/home/j1149/.paicoin -conf=/home/j1149/paicoin/paicoin/crypto.conf &
#paicoind -daemon -txindex -datadir=/home/j1149/.paicoin -conf=/home/j1149/paicoin/paicoin/crypto.conf &
paicoind -daemon -txindex -reindex -datadir=/home/j1149/.paicoin -conf=/home/j1149/paicoin/crypto.conf &
#exec /opt/conda/bin/python /home/j1149/paicoin/app.py
#/opt/conda/bin/python app.py
#tail -f /dev/null
exec "$@"
