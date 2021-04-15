from binascii import hexlify
import argparse
import json
import os
import subprocess
import requests

PAICOIN_CLI = '/home/ubuntu/paicoin/src/paicoin-cli'
PDP2_SERVER = 'http://localhost/file_api/'


class Pdp2Cli:

    def __init__(self, mode=None):
        if mode is None:
            mode = 'testnet'
        self.mode = mode

    def torrent_to_paichain(self, url, address):
        unspent_cmd = ' '.join([PAICOIN_CLI, 'listunspent', '2', '99999999',
                                "'[\"{}\"]'".format(address)])
        unspent = subprocess.check_output(unspent_cmd, shell=True)
        u_tx = json.loads(unspent)[0]
        txid = u_tx['txid']
        vout = u_tx['vout']
        amount = u_tx['amount']
        change_amount = amount - 0.0001
        hex_data = hexlify(url)
        raw_tx = subprocess.check_output([
            PAICOIN_CLI, 'createrawtransaction',
            '[{{"txid":"{}","vout":{}}}]'.format(txid, vout),
            '{{"{}":{},"data":"{}"}}'.format(address, change_amount, hex_data)
        ])
        signed_raw_tx = subprocess.check_output(
            [PAICOIN_CLI, 'signrawtransaction', '{}'.format(raw_tx.replace('\n', ''))]
        )
        signed_raw_tx_hex = json.loads(signed_raw_tx)['hex']
        # decoded_tx = subprocess.check_output([PAICOIN_CLI, 'decoderawtransaction', '{}'.format(signed_raw_tx_hex)])
        sent_tx = subprocess.check_output([PAICOIN_CLI,
                                           'sendrawtransaction',
                                           '{}'.format(signed_raw_tx_hex)])
        return sent_tx

    def file_to_torrent(self, path):
        if os.path.exists(path):
            print(path, 'exists')
        else:
            print(path, 'n exists')
        with open(path, 'rb') as f:
            response = requests.post(PDP2_SERVER + 'make_torrent/',
                                     files={'file':f})
        print(response)


if __name__ == '__main__':


    cli = Pdp2Cli()
    parser = argparse.ArgumentParser(description='Pdp2 Cli')
    subparsers = parser.add_subparsers(title='commands',
                                       dest='command')

    f2t_parser = subparsers.add_parser('f2t')
    f2t_parser.add_argument('-f', '--file-path', help='file path',
                            required=True, dest='file_path')
    f2t_parser.set_defaults(func=cli.file_to_torrent)

    t2p_parser = subparsers.add_parser('t2p')
    t2p_parser.add_argument('-u', '--url', help='torrent URL', required=True,
                            dest='url')
    t2p_parser.add_argument('-a', '--address',
                            help='PAIchain address',
                            default='MpDscYD8xp4MnDLW7WPsEkKVAnAbkUz5t4',
                            dest='address')

    t2p_parser.set_defaults(func=cli.torrent_to_paichain)
    args = parser.parse_args()

    pdp2_cli = Pdp2Cli()

    if args.command == 'f2t':
        print('f2t')
        pdp2_cli.file_to_torrent(args.file_path)
    elif args.command == 't2p':
        pdp2_cli.torrent_to_paichain(args.url, args.address) 
    else:
        print('Command not recognized')
