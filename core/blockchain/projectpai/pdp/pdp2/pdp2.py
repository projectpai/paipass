from collections import namedtuple

from core.blockchain.projectpai.paicoin.transaction import Transaction

StorageTx = namedtuple('StorageTx', ('txid', 'ref'), defaults=(None, None))


def store(op_return_metadata, cfg):
    is_testnet = cfg.is_testnet

    transaction = Transaction(url=cfg.url,
                              auth=(cfg.auth.username, cfg.auth.password),
                              testnet=is_testnet,
                              blockchain_type=cfg.blockchain_type)
    res = transaction.store(op_return_metadata=op_return_metadata)
    if 'error' in res:
        raise Exception(res['error'])
    ref = res['ref']
    txids = res['txids']
    if len(txids) != 1:
        print(f"Something very weird has happened. There should have only been one transaction id but there "
              f" were {len(txids)} txids.")
        print('The following txids were found:')
        for txid in txids:
            print(txid)
    txid = txids[-1]
    stx = StorageTx(txid=txid, ref=ref)
    return stx


def send(op_return_metadata, address, amount, cfg):

    transaction = Transaction(url=cfg.url,
                              auth=(cfg.auth.username, cfg.auth.password),
                              testnet=cfg.is_testnet,
                              blockchain_type=cfg.blockchain_type)
    res = transaction.send(address=address,
                           amount=amount,
                           op_return_metadata=op_return_metadata)
    if 'error' in res:
        raise Exception(res['error'])
    stx = StorageTx(txid=res['txid'], ref='0')
    return stx