from hashlib import sha256
from json import dumps
from random import randint
from time import time
from requests import post

from third_party.mit.paicoin.contrib.data_share.client_example.paicointxn import Transaction as RefTransaction
from third_party.mit.paicoin.contrib.data_share.client_example.paicointxn import constants
from third_party.mit.paicoin.contrib.data_share.client_example.paicointxn import reference
from third_party.mit.paicoin.contrib.data_share.client_example.paicointxn import unpacker

SATOSHI = 100000000

# The reference implementation assumes too much in the constructor
# and has some issues w.r.t. deprecated features.
class Transaction(RefTransaction):

    def __init__(self, url, auth, testnet, blockchain_type):
        self._url = url
        self._auth = auth
        self._testnet = testnet
        self.blockchain_type = blockchain_type

    def calc_change(self, input_amount, output_amount):
        return (int(input_amount*SATOSHI)-int(output_amount*SATOSHI)) / SATOSHI

    def store(self, op_return_metadata):
        """
        Note: the original implementation was not compatible with Python 3.
            i.e.,
                - basestring does not exist in Python 3: https://docs.python.org/3/whatsnew/3.0.html


        Store data in Blockchain using OP_RETURN

        Data will be stored in OP_RETURN within a series of chained transactions
        If the OP_RETURN is followed by another output, the data continues in
        the transaction spending that output.
        When the OP_RETURN is the last output, this signifies the end of data.

        :param op_return_metadata: string of raw bytes containing OP_RETURN data
        :return: {'error': 'error string'}
                 or: {'txid': 'sent txid', 'ref': 'ref for retrieving data' }
        """
        paicoin_fee = constants.PAICOIN_FEE
        if not self._paicoin_check():
            return {'error': 'Check if PAI Coin Core is running correctly'}

        if isinstance(op_return_metadata, str):
            op_return_metadata = op_return_metadata.encode('utf-8')
        res = {}
        is_err = False
        for i in range(0, 10000):
            try:
                res = self._store_hack(op_return_metadata, paicoin_fee)
                is_err = False
            except self.Error as err:
                if 'Invalid amount' in err.args[0]:
                    paicoin_fee += 0.000001
                    is_err = True
                else:
                    raise err
            if not is_err:
                return res

        return res

    def _store_hack(self, op_return_metadata, paicoin_fee):
        data_sz = len(op_return_metadata)
        if data_sz == 0:
            return {'error': 'Some data is required to be stored'}

        change_address = self._paicoin_rpc('getrawchangeaddress')

        output_amount = paicoin_fee * int((data_sz + constants.OP_RETURN_MAX - 1) /
                                          constants.OP_RETURN_MAX)
        output_amount = round(output_amount, 6)

        inputs_spend = self._select_inputs(output_amount)
        if 'error' in inputs_spend:
            return {'error': inputs_spend['error']}

        inputs = inputs_spend['inputs']
        input_amount = inputs_spend['total']

        height = int(self._paicoin_rpc('getblockcount'))
        avoid_txids = self._paicoin_rpc('getrawmempool')
        result = {'txids': []}

        for data_ptr in range(0, data_sz, constants.OP_RETURN_MAX):
            last_txn = ((data_ptr + constants.OP_RETURN_MAX) >= data_sz)
            change_amount = self.calc_change(input_amount, paicoin_fee)
            metadata = op_return_metadata[data_ptr:data_ptr + constants.OP_RETURN_MAX]

            outputs = {}
            if change_amount >= constants.PAICOIN_DUST:
                outputs[change_address] = change_amount

            raw_txn = self._create_txn(inputs, outputs, metadata,
                                       len(outputs) if last_txn else 0)

            send = self._sign_send_txn(raw_txn)

            if 'error' in send:
                result['error'] = send['error']
                break

            result['txids'].append(send['txid'])

            if data_ptr == 0:
                result['ref'] = reference.calc_ref(height, send['txid'], avoid_txids)

            inputs = [{'txid': send['txid'], 'vout': 1}]
            input_amount = change_amount

        return result

    def _sign_send_txn(self, raw_txn):
        # Changing this method because signrawtransaction is deprecated in bitcoin
        # Also, basestring is deprecated in python 3.
        if self.blockchain_type.lower() == 'paicoin':
            return self._sign_send_txn_paicoin(raw_txn)
        elif self.blockchain_type.lower() == 'bitcoin':
            return self._sign_send_txn_bitcoin(raw_txn)
        else:
            raise Exception(f'Blockchain type: {self.blockchain_type} not recognized.')

    def _sign_send_txn_paicoin(self, raw_txn):
        signed_txn = self._paicoin_rpc('signrawtransaction', raw_txn)
        if not ('complete' in signed_txn and signed_txn['complete']):
            return {'error': 'Could not sign the transaction'}

        send_txid = self._paicoin_rpc('sendrawtransaction', signed_txn['hex'])
        if not (isinstance(send_txid, str) and len(send_txid) == 64):
            return {'error': 'Could not send the transaction'}

        return {'txid': str(send_txid)}

    def _sign_send_txn_bitcoin(self, raw_txn):
        signed_txn = self._paicoin_rpc('signrawtransactionwithwallet', raw_txn)
        if not ('complete' in signed_txn and signed_txn['complete']):
            return {'error': 'Could not sign the transaction'}

        send_txid = self._paicoin_rpc('sendrawtransaction', signed_txn['hex'])
        if not (isinstance(send_txid, str) and len(send_txid) == 64):
            return {'error': 'Could not send the transaction'}

        return {'txid': str(send_txid)}

    def retrieve_by_txid(self, txid):
        txn_unpacked = self._get_mempool_txn(txid)
        found = reference.find_txn_data(txn_unpacked)
        result = {'txids': [str(txid)], 'data': found['op_return']}
        result['data'] += found['op_return']
        return result

    def _get_raw_block(self, height):
        block_hash = self._paicoin_rpc('getblockhash', height)

        if not (isinstance(block_hash, str) and len(block_hash) == 64):
            return {'error': 'Block at height {} not found'.format(str(height))}

        block = unpacker.hex2bin(self._paicoin_rpc('getblock', block_hash, False))

        return {'block': block}

    def send(self, address, amount, op_return_metadata):
        """
        Send PAI Coin transaction with OP_RETURN metadata

        :param address: PAI Coin address of the recipient
        :param amount: amount to send (in units of PAI Coin)
        :param op_return_metadata: string of raw bytes containing OP_RETURN data
        :return: {'error': 'error string'}
                  or: {'txid': 'sent txid'}
        """
        try:
            if not self._paicoin_check():
                return {'error': 'Check if PAI Coin Core is running correctly'}

            result = self._paicoin_rpc('validateaddress', address)
            if not ('isvalid' in result and result['isvalid']):
                return {'error': 'Invalid send address: {}'.format(address)}

            if isinstance(op_return_metadata, str):
                op_return_metadata = op_return_metadata.encode('utf-8')

            meta_sz = len(op_return_metadata)

            if meta_sz > constants.SF16:
                return {'error': 'Library supports metadata up to 65536 bytes'}

            if meta_sz > constants.OP_RETURN_MAX:
                msg = 'Metadata size {} > {}'.format(str(meta_sz),
                                                     str(constants.OP_RETURN_MAX))
                return {'error': msg}

            output_amount = amount + constants.PAICOIN_FEE
            inputs_spend = self._select_inputs(output_amount)

            if 'error' in inputs_spend:
                return {'error': inputs_spend['error']}

            change_amount = self.calc_change(inputs_spend['total'], output_amount)
            change_address = self._paicoin_rpc('getrawchangeaddress')

            outputs = {address: amount}

            if change_amount >= constants.PAICOIN_DUST:
                outputs[change_address] = change_amount

            raw_txn = self._create_txn(inputs_spend['inputs'], outputs,
                                       op_return_metadata, len(outputs))
            signed_txn = self._sign_send_txn(raw_txn)

        except self.Error as err:
            return {'error': err}

        return signed_txn

    def _create_txn(self, inputs, outputs, metadata, metadata_pos):
        raw_txn = self._paicoin_rpc('createrawtransaction', inputs, outputs)

        txn_unpacked = unpacker.unpack_txn(unpacker.hex2bin(raw_txn))

        metadata_len = len(metadata)
        delimeter = unpacker.hex2bin('92')
        protocol_version = unpacker.hex2bin('10')
        reserved = unpacker.hex2bin('FFFFFFFFFFFF')
        operation = unpacker.hex2bin('00')
        storage_method = unpacker.hex2bin('FF')  # unpacker.hex2bin('01')
        op1 = bytearray((metadata_len,)) + metadata
        txout_info = unpacker.hex2bin('00000000')
        op2 = bytearray((len(txout_info),)) + txout_info
        header = delimeter + protocol_version + reserved
        payload = operation + storage_method + op1 + op2
        almost_everything = header + payload
        checksum = dsha256(almost_everything)[:4]
        op_return_data = header + payload + checksum
        # original op_return we saw in september
        # op_return_data_actual = r'9210ffffffffffff00ff2084302069b9b2382ad00a70c948db2e95000000000000000000000000000000000400000000c0a2b64900000000'
        # pai_delimiter = '92'
        # pv = '10'
        # reserved = 'ffffffffffffff'
        # op = '00'
        # sm = 'ff'
        # op1_sz = '20'
        # op1 = '84302069B9B2382AD00A70C948DB2E9500000000000000000000000000000000'
        # op2_sz = '04'
        # op2 = '00000000'
        # header = pai_delimiter + pv + reserved
        # payload = op + sm + op1_sz + op1 + op2_sz + op2
        # checksum = 'c0a2b649'
        # op_return_data = header + payload + checksum

        metadata_pos = min(max(0, metadata_pos), len(txn_unpacked['vout']))

        txn_unpacked['vout'][metadata_pos:metadata_pos] = \
            [{'value': 0, 'scriptPubKey': '6a34' + unpacker.bin2hex(op_return_data)}]

        #[{'value': 0,
            #  'scriptPubKey': '6a349210ffffffffffff00ff2084302069b9b2382ad00a70c948db2e95000000000000000000000000000000000400000000c0a2b649'}]

        return unpacker.bin2hex(unpacker.pack_txn(txn_unpacked))

    def _paicoin_rpc(self, rpc, *args):
        id_ = str(time()) + '-' + str(randint(100000, 999999))

        request = {'id': id_, 'method': rpc, 'params': args}
        data = dumps(request).encode('utf-8')

        try:
            raw_res = post(url=self._url, auth=self._auth, data=data)
        except ConnectionError as err:
            raise self.Error(str(err.message).split('>')[1][:-4])
        raw_res.raise_for_status()

        result = raw_res.json()

        if raw_res.status_code != 200:
            raise self.Error(result['error']['message'])

        result = result['result']

        return result


def dsha256(d):
    # TODO: What is the correct algorithm for dsha256????
    return sha256(sha256(d).digest()).digest()
