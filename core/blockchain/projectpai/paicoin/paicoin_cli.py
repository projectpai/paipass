import requests
import time


def get_pub_key_addr(crypto_url):
    wallet_addr = get_new_wallet_address(crypto_url)
    print('\n\n\n\n\nwallet_addr==%s\n\n\n\n' % wallet_addr, flush=True)
    # for some reason this likes to return None on the first few attempts.
    # TODO Figure out why (it's probably because that docker container isn't
    #  quite ready yet..)
    time.sleep(1)
    if wallet_addr is None:
        return get_pub_key_addr(crypto_url)
    return wallet_addr


def get_new_wallet_address(crypto_url):
    headers = {"content-type": "application/json"}
    data = {"method": "getnewaddress",
            "params": [],
            "jsonrpc": "2.0"}
    result = requests.post(crypto_url, json=data, headers=headers)
    addr = result.json()['result']
    return addr
