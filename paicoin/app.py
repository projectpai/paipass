from flask import Flask, request, jsonify
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import requests
import os

import signal
import sys
from apscheduler.schedulers.background import BackgroundScheduler

import data_fidelity

server_backup = data_fidelity.ServerBackup()

background_scheduler = BackgroundScheduler(daemon=True)
background_scheduler.add_job(server_backup.backup, 'interval', seconds=30)
background_scheduler.start()


def sigterm_handler(signum, frame):
    print('Handling sigterm...', str(signum))
    if server_backup.has_wallet_changed_significantly():
        prev_out_fname = data_fidelity.OUT_FNAME_WALLET.split('.')
        out_fname = prev_out_fname[0] + '.' + 'sigtermed' + '.' + '.'.join(prev_out_fname[1:])
        server_backup.backup_wallet(out_fname=out_fname)
    if server_backup.has_datadir_changed_significantly():
        prev_out_fname = data_fidelity.OUT_FNAME_WALLET.split('.')
        out_fname = prev_out_fname[0] + '.' + 'sigtermed' + '.'.join(prev_out_fname[1:])
        server_backup.backup_wallet(out_fname=out_fname)

    exit()


signal.signal(signal.SIGTERM, sigterm_handler)

app = Flask(__name__)

BACKEND_HOST = os.environ['BACKEND_HOST']
BACKEND_PORT = os.environ['BACKEND_PORT']
BACKEND_EMAIL = os.environ['PAICOIN_SERVER_EMAIL']
BACKEND_PASS = os.environ['PAICOIN_SERVER_PASS']

BACKEND_URL = f'https://{BACKEND_HOST}/'
PDP2_URL = BACKEND_URL + 'api/v1/pdp2/'

RPC_USER = os.environ['CRYPTO_USER']
RPC_PASS = os.environ['CRYPTO_PASS']
RPC_HOST = '127.0.0.1'  # os.environ['CRYPTO_HOST']
RPC_PORT = os.environ['CRYPTO_PORT']
DB_HOST = os.environ['DB_HOST']
DB_PORT = os.environ['DB_PORT']
MINER_HOST = os.environ['MINER_HOST']
MINER_PORT = os.environ['MINER_PORT']

RPC_AUTH_URL = "http://%s:%s@%s:%s" % (RPC_USER,
                                       RPC_PASS,
                                       RPC_HOST,
                                       RPC_PORT)

MINER_URL = "http://%s:%s/" % (MINER_HOST, MINER_PORT)
# Persist the connection out here; we can move it if he have 
# performance issues.
RPC_CXN = AuthServiceProxy(RPC_AUTH_URL)

BALANCE_THRESHOLD = float(os.environ['BALANCE_THRESHOLD'])
BALANCE_OPTIMUM = float(os.environ['BALANCE_OPTIMUM'])

BASE_URL = f'https://{BACKEND_HOST}/'


def login(session, username, password):
    """
    Login so we can register the app.
    """
    session.headers = {'content-type': 'application/x-www-form-urlencoded',
                       'REFERER': 'https://paicoin'}
    params = {'email': username, 'password': password}
    response = session.post(BASE_URL + r'api/v1/rest-auth/login/',
                            headers=session.headers,
                            data=params,
                            allow_redirects=False)
    return response


@app.route('/wallet-notify', methods=['POST'])
def wallet_notify():
    txn_id = request.args.get('txn_id')
    url = PDP2_URL + 'wallet-notification/'
    session = requests.Session()
    response = login(session, BACKEND_EMAIL, BACKEND_PASS)
    response.raise_for_status()
    try:
        print('text', response.text)
        print('reason', response.reason)
        print('content', response.content)
        print('json', response.json())
    except:
        pass


    headers = {'content-type': 'application/json', 'X-CSRFToken': session.cookies['csrftoken'],
               'REFERER': 'https://paicoin'}
    data = {'txn_id': txn_id}
    print('post session post')
    response = session.post(url, headers=headers,
                            cookies=session.cookies,
                            json=data)
    print('post session post')
    response.raise_for_status()
    print('returning response')
    return response.raw.read(), response.status_code, response.headers.items()


@app.route('/block-notify', methods=['POST'])
def block_notify():
    blockhash = request.args.get('blockhash')
    url = PDP2_URL + 'block-notification/'
    session = requests.Session()
    response = login(session, BACKEND_EMAIL, BACKEND_PASS)
    response.raise_for_status()
    try:
        print('login', flush=True)
        print('text', response.text)
        print('reason', response.reason)
        print('content', response.content)
        print('json', response.json())
        print('login', flush=True)
    except:
        pass
    headers = {'content-type': 'application/json', 'X-CSRFToken': session.cookies['csrftoken'],
               'REFERER': 'https://paicoin'}
    session.headers.update(headers)
    data = {'blockhash': blockhash}
    print('pre session post')
    response = session.post(url, headers=headers, json=data)
    try:
        print('blocknotif', flush=True)
        print('text', response.text)
        print('reason', response.reason)
        print('content', response.content)
        print('json', response.json())
        print('blocknotif', flush=True)
    except:
        pass
    print('post session post')

    response.raise_for_status()
    return response.raw.read(), response.status_code, response.headers.items()


@app.route('/wallet-notification')
def wallet_notification():
    txn_id = request.args.get('txn_id')
    balance = float(RPC_CXN.getbalance())
    # if the balance is below some threshold,
    # we need to start mininig.
    if balance < BALANCE_THRESHOLD:
        response = notify_miner_low_balance()


@app.route('/request-new-address')
def request_new_address():
    address = RPC_CXN.getnewaddress("", "legacy")
    return jsonify({'address': address})


# @app.route('/dump-priv-key')
# def dumpprivkey():
#    address = request.args('address')
#    priv_key = RPC_CXN.dumpprivkey(address)
#    return jsonify({'priv_key': priv_key})


def notify_miner_low_balance():
    session = requests.Session()
    headers = {'content-type': 'application/json'}
    data = {}
    data['BALANCE_OPTIMUM'] = BALANCE_OPTIMUM
    data['BALANCE_THRESHOLD'] = BALANCE_THRESHOLD
    response = session.post(MINER_URL + 'low-balance-notif/',
                            headers=headers, json=data)
    return response


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
