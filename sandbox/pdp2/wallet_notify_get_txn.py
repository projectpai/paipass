import os
from collections import namedtuple
import requests

CRYPTO_USER = os.environ['CRYPTO_USER']
CRYPTO_PASS = os.environ['CRYPTO_PASS']
CRYPTO_HOST = os.environ['CRYPTO_HOST']
CRYPTO_PORT = os.environ['CRYPTO_PORT']

CRYPTO_URL = r'http://%s:%s@%s:%s/' % (CRYPTO_USER,
                                       CRYPTO_PASS,
                                       CRYPTO_HOST,
                                       CRYPTO_PORT)

def decode_raw_txn(hexhash):
    headers = {"content-type": "application/json"}
    data = {"method": "decoderawtransaction",
            "params": (hexhash,),
            "jsonrpc": "2.0"}
    result = requests.post(CRYPTO_URL, json=data, headers=headers)
    txn_info = result.json()['result']
    return txn_info

def get_txn_info(txid):
    headers = {"content-type": "application/json"}
    data = {"method": "gettransaction",
            "params": (txid,),
            "jsonrpc": "2.0"}
    result = requests.post(CRYPTO_URL, json=data, headers=headers)
    txn_info = result.json()['result']
    return txn_info

def getaddressinfo(address):
    headers = {"content-type": "application/json"}
    data = {"method": "validateaddress",
            "params": (address,),
            "jsonrpc": "2.0"}
    result = requests.post(CRYPTO_URL, json=data, headers=headers)
    txn_info = result.json()['result']
    return txn_info

def isaddressmine(addr_info):
    return addr_info['ismine']

Payments = namedtuple('Payments', ('addresses', 'value'))

def get_our_payments(decoded):
    vout = decoded['vout']
    for vout_i in vout:
        if 'addresses' in vout_i['scriptPubKey']:
            addresses = vout_i['scriptPubKey']['addresses']
            for address in addresses:
                addr_info = getaddressinfo(address)
                ismine = isaddressmine(addr_info)
                if ismine:
                    payment_amount = vout_i['value']
                    return Payments(addresses, payment_amount)
            print('in')
        else:
            print('out')

    return None

if __name__ == '__main__':
    txn_info = get_txn_info(r'4025646f0ee5ec8a88be7b609bd8e09a7d38138a9247be038cbe6f9af5c85109')
    decoded = decode_raw_txn(txn_info['hex'])
    payments =  get_our_payments(decoded)
    print(payments)