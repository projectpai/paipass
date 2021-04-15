import os
import sys
from requests import post

# A stupid fix for a stupid problem caused by PyCharm's inability to not overwrite
# the PYTHONPATH set in the Dockerfile
sys.path.append('/opt/api')

from core.blockchain.projectpai.paicoin.transaction import Transaction

CRYPTO_HOST = os.environ['CRYPTO_HOST']
CRYPTO_PORT = os.environ['CRYPTO_PORT']
CRYPTO_USER = os.environ['CRYPTO_USER']
CRYPTO_PASS = os.environ['CRYPTO_PASS']
CRYPTO_URL = r'http://%s:%s@%s:%s/' % (CRYPTO_USER,
                                       CRYPTO_PASS,
                                       CRYPTO_HOST,
                                       CRYPTO_PORT)

def rpc(method, *params):
    data = {"method": method,
            "params": params,
            "jsonrpc": "2.0"}
    response = post(url=CRYPTO_URL, json=data)
    return response


def bitcoin_verif():
    txid = '01e8264ec83a95c542b84b517f50e07db48dd74791f5aecf2db193ed29ef47b4'
    ref = '1670761-059393'

    txid = 'be50ee21dc3ccfa82af175f2c4f65e818bef22df932f6255fc9c0dd30f997e75'
    ref = '1670863-020670'
    uuid = b'XhAT6dDrnt7ce7Tb7iKwouZ4v9BA2v9C'.decode('utf-8')


    testnet = True if os.environ['BLOCKCHAIN_NET'] == 'testnet' else False
    blockchain_type = os.environ['BLOCKCHAIN_TYPE']
    r = rpc('getrawtransaction', txid, 1)

    transaction = Transaction(url=f'http://{CRYPTO_HOST}:{CRYPTO_PORT}',
                              auth=(CRYPTO_USER, CRYPTO_PASS),
                              testnet=testnet,
                              blockchain_type=blockchain_type)
    transaction.retrieve_by_txid(txid)
    transaction.retrieve(ref)

def paicoin_verif_testnet():
    txid = 'e4322d358c86a4eef1469cb4605fdc9775dc62e4813032dddf6cae8ecc7fc587'
    ref = '1717761-013028'

    testnet = True if os.environ['BLOCKCHAIN_NET'] == 'testnet' else False
    blockchain_type = os.environ['BLOCKCHAIN_TYPE']
    r = rpc('getrawtransaction', txid, 1)

    transaction = Transaction(url=f'http://{CRYPTO_HOST}:{CRYPTO_PORT}',
                              auth=(CRYPTO_USER, CRYPTO_PASS),
                              testnet=testnet,
                              blockchain_type=blockchain_type)
    r1 = transaction.retrieve_by_txid(txid)
    r2 = transaction.retrieve(ref)

    return r2

def paicoin_verif_testnet2():
    txid = r'378a3afbf690cefb38136c1fef0fa6a99dae2612bcb6cfbfb1678b9ee2cf9b96'
    ref = '1717761-013028'

    testnet = True if os.environ['BLOCKCHAIN_NET'] == 'testnet' else False
    blockchain_type = os.environ['BLOCKCHAIN_TYPE']
    r = rpc('getrawtransaction', txid, 1)

    transaction = Transaction(url=f'http://{CRYPTO_HOST}:{CRYPTO_PORT}',
                              auth=(CRYPTO_USER, CRYPTO_PASS),
                              testnet=testnet,
                              blockchain_type=blockchain_type)
    r1 = transaction.retrieve_by_txid(txid)

    return r1


def paicoin_verif_mainnet():
    txid = r'81836400818dad36c96b128504f300e5d7568748de57db349ae8697a62851a69'
    ref = '1717761-013028'

    testnet = True if os.environ['BLOCKCHAIN_NET'].lower() == 'testnet' else False
    blockchain_type = os.environ['BLOCKCHAIN_TYPE']
    r = rpc('getrawtransaction', txid, 1)
    r.raise_for_status()
    transaction = Transaction(url=f'http://{CRYPTO_HOST}:{CRYPTO_PORT}',
                              auth=(CRYPTO_USER, CRYPTO_PASS),
                              testnet=testnet,
                              blockchain_type=blockchain_type)
    r1 = transaction.retrieve_by_txid(txid)

    return r1

def paicoin_verif_mainnet2():
    txid = r'8bbde050c4e4589d5bbe923e7b3f54e97132f889e7c818932f8b3a836d2e356a'
    ref = '1717761-013028'

    testnet = True if os.environ['BLOCKCHAIN_NET'] == 'testnet' else False
    blockchain_type = os.environ['BLOCKCHAIN_TYPE']
    r = rpc('getrawtransaction', txid, 1)

    transaction = Transaction(url=f'http://{CRYPTO_HOST}:{CRYPTO_PORT}',
                              auth=(CRYPTO_USER, CRYPTO_PASS),
                              testnet=testnet,
                              blockchain_type=blockchain_type)
    r1 = transaction.retrieve_by_txid(txid)

    return r1


'''
 op_return
b'\x02\x00\x00\x00\x01gn\xda$\x0c\x02\'\x06\xb9_DV\xe1\xd9Lb\xbd\x04\xe6\tx\xa2\x9bp\xa2\xdb\x92\xb1\xa9\xc6\xb9\x98\x01\x00\x00\x00jG0D\x02 \']\x9c\xbc\x8c~\x9aj\xfe\xefY\x85Z\x84\x1b\xb5\xad{\xf1\xa3*\xe1\r\xf3N\x8b\xd1\xbemk\xd5\x7f\x02 G\xae8?\x16s-\x04x\x19#\xcd9\x82\x8d\x15\xb1\xfe\xe7\x05\xffQ\xe74\'\xda3.\x91\x92\\\xa8\x01!\x02\x95\x05\xd7K\xb0b0s[\\p\xdb\xb6\x9aU\xea\x1e\xaf\x13\n>h\xf6N\xb6|\xf8LV\x16\xb1(\xff\xff\xff\xff\x03\x80\x96\x98\x00\x00\x00\x00\x00\x19v\xa9\x14\x03\xd6\x12"\xe9]\x0fK\xc6{\xf4 \x8b\xc2 \xc8\xa0\xae\xf2\xf4\x88\xac<`^\x05\x00\x00\x00\x00\x19v\xa9\x14\x01(\xd7"\xae\x9fu\x8e\x87\xc0\xde-K\xa6r\x98\x80\x0c\x9b`\x88\xac\x00\x00\x00\x00\x00\x00\x00\x006j4\x92\x10\xff\xff\xff\xff\xff\xff\x00\xff \x840 i\xb9\xb28*\xd0\np\xc9H\xdb.\x95\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00\x00\x00\x00\xc0\xa2\xb6I\x00\x00\x00\x00'
>>> op_return[-10:
... ]
b'\x00\x00\xc0\xa2\xb6I\x00\x00\x00\x00'
>>> op_return[-32:]
b'\xdb.\x95\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00\x00\x00\x00\xc0\xa2\xb6I\x00\x00\x00\x00'
>>> op_return[-52:]
b'\xff\xff\xff\xff\x00\xff \x840 i\xb9\xb28*\xd0\np\xc9H\xdb.\x95\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00\x00\x00\x00\xc0\xa2\xb6I\x00\x00\x00\x00'
>>> op_return[-56:]
b'\x92\x10\xff\xff\xff\xff\xff\xff\x00\xff \x840 i\xb9\xb28*\xd0\np\xc9H\xdb.\x95\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00\x00\x00\x00\xc0\xa2\xb6I\x00\x00\x00\x00'
>>> op_return[-56:].hex()
'9210ffffffffffff00ff2084302069b9b2382ad00a70c948db2e95000000000000000000000000000000000400000000c0a2b64900000000'

'''

paicoin_verif_mainnet2()