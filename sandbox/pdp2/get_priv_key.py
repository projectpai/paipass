import os

import requests
from gen_address import login

HOST = os.environ['BACKEND_HOST']
PORT = os.environ['BACKEND_PORT']
BASE_URL = f'http://{HOST}:{PORT}/'
PDP2_URL = BASE_URL + 'api/v1/pdp2/'

CRYPTO_USER = os.environ['CRYPTO_USER']
CRYPTO_PASS = os.environ['CRYPTO_PASS']
CRYPTO_HOST = os.environ['CRYPTO_HOST']
CRYPTO_PORT = os.environ['CRYPTO_PORT']

CRYPTO_URL = r'http://%s:%s@%s:%s/' % (CRYPTO_USER,
                                       CRYPTO_PASS,
                                       CRYPTO_HOST,
                                       CRYPTO_PORT)


def get_private_key(address):
    headers = {"content-type": "application/json"}
    data = {"method": "dumpprivkey",
            "params": (address,),
            "jsonrpc": "2.0"}
    result = requests.post(CRYPTO_URL, json=data, headers=headers)
    priv_key = result.json()['result']
    return priv_key


def get_pdp2_paicoin_address(username, password):
    url = PDP2_URL + 'payment-addresses/'
    session = requests.Session()
    response = login(session, username, password)
    headers = {'content-type': 'application/json'}
    headers['X-CSRFToken'] = session.cookies['csrftoken']
    response = session.get(url, headers=headers)

    response.raise_for_status()
    addrs = response.json()['addrs']
    for addr in addrs:
        if addr['status'] == 'ACTIVATED':
            return addr['pub_key_addr']
    return None


if __name__ == '__main__':
    import argparse
    import os

    parser = argparse.ArgumentParser()
    parser.add_argument('username',
                        help='The login username')
    parser.add_argument('password',
                        help='The login password')

    args = parser.parse_args()

    pubkey_addr = get_pdp2_paicoin_address(args.username, args.password)
    priv_key = get_private_key(pubkey_addr)
    print(f"The private key for the pubkey address {pubkey_addr} is"
          f" {priv_key}")
