import json

import tempfile
import os

import sys
import bencode
import hashlib

import time
# just rename it because it's annoying to have to be careful with shadowing
import uuid as uuid_ref
from dataclasses import dataclass, asdict
from datetime import datetime

import ecies
import requests
import uuid
from bit import Key
from core.blockchain.projectpai.pdp import pdp2 as pdp2_reference
from django.conf import settings
from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from django.core.files import File

from api.models import EmailVerifStatusChoices
from pdp2.models import (Pdp2ProfileSubscription,
                         Pdp2Transaction,
                         Torrent,
                         JSONStorage, AggregatedStorage)
from core.blockchain.projectpai.paicoin import paicoin_cli

logger = settings.LOGGER

# TODO THESE FIELDS SHOULD BE REMOVED FROM THE USER MODEL AND
#  INPUT INTO A USER PROFILE MODEL SO THAT NEW FIELDS CAN BE
#  DYNAMICALLY ADDED.
profile_allowed_fields = {'full_name',
                          'preferred_name',
                          'email',
                          'phone_number',
                          'arbitrary_id'}


class Nein:
    # because None is a valid value
    pass


class CantBeBlankException(Exception):

    def __init__(self, key, value):
        message = f'{key} cannot be have a blank value; currently has the value of {value}'
        super().__init__(message)


class NoDefaultFoundException(Exception):

    def __init__(self, key):
        message = f'No default found for the key: {key}'
        super().__init__(message)


class CantFindAppropriateValue(Exception):
    def __init__(self, key):
        message = f'Can\'t find an appropriate value for the key: {key}'
        super().__init__(message)


class NoSubscriptionFound(Exception):
    def __init__(self, user):
        message = f'Can\'t find a subscription for: {user.email}'
        super().__init__(message)


@dataclass
class Pdp2Txn:
    '''Class for keeping track of pdp2 transaction params'''
    pdp2_subscription: models.Model = None
    torrent_file_uuid: str = None
    torrent_info_hash: str = None
    pdp2_op_return_txid: str = None
    pdp2_op_return_ref: str = None
    pub_key_addr: str = None
    pub_key: str = None
    torrent_file_date_created: datetime = None
    is_store_op: bool = None
    is_pub_key_ours: bool = None
    is_active: bool = None


class Pdp2FileUuidChanged(Exception):
    '''The file UUID should not change in between after it has been changed from settings.NULL_UUID'''
    pass


class Pdp2FileUuidUnchanged(Exception):
    '''The torrent client should not return settings.NULL_UUID, that value should only be a placeholder'''
    pass


def can_bypass_payment(user):
    logger.info(f'User ({user.email}) is trying to bypass payment...')
    email_verification_exists = user.email_verification_request is not None
    is_email_verified = email_verification_exists and user.email_verification_request.status == EmailVerifStatusChoices.ACCEPTED
    if user.email.endswith('@j1149.com') and (user.is_staff or is_email_verified):
        logger.info(f'User ({user.email}) was successful in bypassing payment!')
        return True
    if not user.email.endswith('@j1149.com'):
        logger.info(f'User ({user.email}) was not successful in bypassing payment because their email does not end in'
                    f' @j1149.com')
    elif not (user.is_staff or is_email_verified):
        logger.info(f'User ({user.email}) was not successful in bypassing payment because their staff status was listed'
                    f' as {user.is_staff} and their email verification existence was listed as '
                    f' {email_verification_exists } and email verification status was listed as '
                    f' {user.email_verification_request.status}.')
    else:
        logger.warn(f'User {user.email} was not successful in bypassing payment despite meeting all requirements!')

    return False


def get_subscriptions(user):
    pdp2_sub = None
    pdp2_subs = Pdp2ProfileSubscription.objects.all().filter(user=user)
    return pdp2_subs


def get_subscription(pub_key_addr=None, user=None):
    if pub_key_addr is None and user is None:
        raise ValueError('Both cannot be None.')
    if pub_key_addr is not None:
        pdp2_sub = Pdp2ProfileSubscription.objects \
            .get(pub_key_addr=pub_key_addr)
    else:
        pdp2_sub = None
        pdp2_subs = Pdp2ProfileSubscription.objects.all().filter(user=user)
        for pdp2_sub_i in pdp2_subs:
            is_activated = pdp2_sub_i.status == Pdp2ProfileSubscription.STATUS_ACTIVATED
            is_user_deactivated = pdp2_sub_i.status == Pdp2ProfileSubscription.STATUS_USER_DEACTIVATED
            is_activated_or_user_deactivated = is_activated or is_user_deactivated
            if is_activated_or_user_deactivated:
                pdp2_sub = pdp2_sub_i
                break
            elif pdp2_sub_i.status == Pdp2ProfileSubscription.STATUS_PENDING:
                if pdp2_sub is None:
                    pdp2_sub = pdp2_sub_i

    return pdp2_sub


def get_active_subscription(pub_key_addr=None, user=None):
    if pub_key_addr is None and user is None:
        raise ValueError('Both cannot be None.')
    if pub_key_addr is not None:
        pdp2_sub = Pdp2ProfileSubscription.objects \
            .get(pub_key_addr=pub_key_addr)
        if pdp2_sub.status != Pdp2ProfileSubscription.STATUS_ACTIVATED:
            pdp2_sub = None
    else:
        pdp2_sub = None
        pdp2_subs = Pdp2ProfileSubscription.objects.all().filter(user=user)
        for pdp2_sub_i in pdp2_subs:
            if pdp2_sub_i.status == Pdp2ProfileSubscription.STATUS_ACTIVATED:
                pdp2_sub = pdp2_sub_i
                break

    return pdp2_sub


def get_deactivated_subscription(pub_key_addr=None, user=None):
    if pub_key_addr is None and user is None:
        raise ValueError('Both cannot be None.')
    if pub_key_addr is not None:
        pdp2_sub = Pdp2ProfileSubscription.objects \
            .get(pub_key_addr=pub_key_addr)
        if pdp2_sub != Pdp2ProfileSubscription.STATUS_USER_DEACTIVATED:
            return None
    else:
        pdp2_sub = None
        if user.is_staff:
            status_types = (Pdp2ProfileSubscription.STATUS_STAFF_DEACTIVATED,
                            Pdp2ProfileSubscription.STATUS_USER_DEACTIVATED)
        else:
            status_types = (Pdp2ProfileSubscription.STATUS_USER_DEACTIVATED,)
        pdp2_subs = Pdp2ProfileSubscription.objects.all().filter(user=user)
        for pdp2_sub_i in pdp2_subs:
            for status_type in status_types:
                if pdp2_sub_i.status == status_type:
                    pdp2_sub = pdp2_sub_i

    return pdp2_sub


def get_pdp2_txn(pdp2_sub, active=True):
    pdp2_txns = Pdp2Transaction.objects.all().filter(pdp2_subscription=pdp2_sub,
                                                     is_active=active)
    if pdp2_txns.count() < 1:
        return None
    pdp2_txn = pdp2_txns.latest('created_on')
    return pdp2_txn


def activate_pdp2_profile(pdp2_sub):
    pdp2_sub.subscription_length = 365
    pdp2_sub.subscription_start_date = timezone.now()


class Pdp2Op:
    STORE = 'OP_STORE'
    SEND = 'OP_SEND'
    NOP = 'OP_NO'


def get_cfg(updated_dataset, new_cfg):
    # cfg = Pdp2Cfg(op=Pdp2Op.SEND,
    #               pub_key=og_txn.pub_key,
    #               pub_key_addr=og_txn.pub_key_addr,
    #               encryption_value=encryption_value,
    #               amount=0.00013)

    jss = JSONStorage.objects.all().filter(dataset=updated_dataset).order_by('-created_on')
    if jss.count() > 0:
        og_txn = jss.first().txn
    else:
        ass = AggregatedStorage.objects.all().filter(dataset=updated_dataset).order_by('-created_on')
        if ass.count() > 0:
            og_txn = ass.first().txn
        else:
            og_txn = None
    cfg = Pdp2Cfg.from_priors(og_txn, new_cfg)
    return cfg


@dataclass
class Pdp2Cfg:
    op: Pdp2Op = Pdp2Op.NOP
    pub_key_addr: str = None
    pub_key: str = None
    amount: str = None
    is_pub_key_ours: bool = None
    encryption_value: str = None
    is_compressed: bool = False

    # these two should not overlap
    CROSS_REFERENCEABLE = {'encryption_value',
                           # TODO: It is a massive oversight that we don't have this inside the Pdp2Transaction
                           #  model; add it to the model
                           # 'amount',
                           'pub_key_addr',
                           'pub_key',
                           'is_pub_key_ours',
                           'encryption_value',
                           'op'}
    # TODO Need to revisit this
    # NO_ASSUMPTIONS_ON = {'op', }
    NO_ASSUMPTIONS_ON = set()

    LEFT_BLANK = 'LEFT_BLANK'
    # Some amount that was found to work.
    # (There is some error that occurs that has to do with the amount where if it is not just right,
    #  it will error out; that is 0.00012 was found to not work in some cases and 0.00014 was found
    #  not work in some other cases; 0.00013 seems to have the least number of errors)
    DEFAULT_PDP2_AMOUNT = 0.00013

    @classmethod
    def is_left_blank(cls, value):

        if isinstance(value, str):
            value_up = value.upper()
            return value_up == cls.LEFT_BLANK or value_up == 'VIA_PAIPASS'
        elif value is Nein:
            return True
        return False

    @classmethod
    def is_cross_referenceable(cls, item):
        return item in cls.CROSS_REFERENCEABLE

    @classmethod
    def cant_make_assumptions_on(cls, item):
        return item in cls.NO_ASSUMPTIONS_ON

    # I want the defaults not specified in this method to cause the pdp2 process to fail out;
    # I want whatever goes into this config to be well-specified when a transaction occurs
    # as a result of it
    @classmethod
    def __get_default(cls, key):
        if key == 'amount':
            return cls.DEFAULT_PDP2_AMOUNT
        elif key == 'encryption_value':
            return 'unencrypted'
        elif key == 'pub_key_addr':
            return paicoin_cli.get_pub_key_addr(settings.CRYPTO_URL)
        # this really shouldn't matter it's not up to the configuration
        elif key == 'is_compressed':
            return False
        else:
            raise NoDefaultFoundException(key)

    @classmethod
    def __prev_getter(cls, prev, key):
        if key == 'op':
            if prev.is_store_op:
                return Pdp2Op.STORE
            else:
                return Pdp2Op.SEND
        elif key == 'encryption_value':
            pub_key = cls.__prev_getter(prev, 'pub_key')
            if cls.is_left_blank(pub_key):
                return Nein
            return 'encrypted'
        return getattr(prev, key, Nein)

    @classmethod
    def from_priors(cls, prev, next):
        '''
        This uses two cfgs to construct a pdp2 config. It first uses the latter cfg
        (next) to construct an initial config then uses the former cfg (prev) to fill in any
        blanks that the latter cfg didn't fill. Moreover, the latter contains information that that
        former simply won't contain or we can't use to make assumptions like the op type, amount etc...

        prev will be in the dictionary form since it came from a request

        next will be in the form of pdp2.models.Pdp2Transaction since it was stored in the db previously.
        '''
        if prev is None:
            prev_value_getter = lambda prev, key: None
        else:
            prev_value_getter = cls.__prev_getter

        expandable = {}

        for key in cls.__dataclass_fields__:
            new_value = next.get(key, Nein)
            prior_value = prev_value_getter(prev, key)
            if key == 'is_pub_key_ours':
                print('debug')
            if cls.is_left_blank(new_value):
                if cls.cant_make_assumptions_on(key):
                    raise CantBeBlankException(key, new_value)
                elif not cls.is_cross_referenceable(key) or prev is None:
                    value_actual = cls.__get_default(key)
                elif prev is not None:
                    value_actual = prior_value
                else:
                    raise CantFindAppropriateValue(key)
            else:
                value_actual = new_value

            expandable[key] = value_actual
        # a correction
        if expandable['pub_key'] is None:
            expandable['encryption_value'] = 'unencrypted'
        return cls(**expandable)


DEFAULT_CFG = Pdp2Cfg(op=Pdp2Op.STORE,
                      pub_key_addr=None,
                      pub_key=None,
                      amount=None,
                      is_pub_key_ours=True,
                      encryption_value=None,
                      is_compressed=False)


class SubmitUserData:

    def __init__(self, user=None, pdp2_sub=None):
        if user is None and pdp2_sub is None:
            raise Exception('Both user and pdp2_sub cannot be None')
        if pdp2_sub is not None:
            self.pdp2_sub = pdp2_sub
            self.user = self.pdp2_sub.user
        else:
            self.user = user
            self.pdp2_sub = get_active_subscription(user=user)
        self.active_pdp2_txn = get_pdp2_txn(pdp2_sub, active=True)

    def __call__(self, cfg=None, json_data=None):

        if cfg is None:
            cfg = DEFAULT_CFG
        # if cfg.op is None:
        #     cfg.op = Pdp2Op.STORE
        if cfg.op != Pdp2Op.SEND and cfg.op != Pdp2Op.STORE:
            raise Exception(f'Operation {cfg.op} not recognized')
        if json_data is None:
            json_data = extract_user_data(self.user, profile_allowed_fields)
        if isinstance(json_data, dict):
            json_data = json.dumps(json_data).encode()
        if cfg.encryption_value == 'encrypted':
            if cfg.pub_key is not None:
                encrypted_json_data = encrypt_user_data(json_data, pub_key=cfg.pub_key)
            elif cfg.op == Pdp2Op.STORE and self.active_pdp2_txn is not None and self.active_pdp2_txn.pub_key is not None:
                encrypted_json_data = encrypt_user_data(json_data, pub_key=self.active_pdp2_txn.pub_key)
            # paicoin needs a different rpc call than bitcoin
            elif cfg.op == Pdp2Op.STORE and settings.CRYPTO_HOST == 'paicoin':
                pub_key = get_pub_key(self.pdp2_sub.pub_key_addr)
                cfg.pub_key = pub_key
                encrypted_json_data = encrypt_user_data(json_data, pub_key=pub_key)

            else:
                # Here for legacy purposes; in actuality, we should make a call to
                # getaddressinfo and grab the public key from there; time is tight;
                # I'm deferring it to my own chagrin.
                priv_key = get_private_key(self.pdp2_sub.pub_key_addr)
                encrypted_json_data = encrypt_user_data(json_data, priv_key)
            uuid, info_hash = self.submit_data_to_torrent_providers(encrypted_json_data, cfg)
        else:
            data = encode_and_format(json_data)
            uuid, info_hash = self.submit_data_to_torrent_providers(data, cfg)

        if cfg.op == Pdp2Op.STORE:
            # TODO it would be silly if this were still necessary since we now
            #  transmit the uuid to the torrent client
            #  ... even more silly since a torrent client doesn't even exist anymore.
            self.validate_torrent_uuid_immutability(uuid)

        # It's easier to pass this around
        pdp2_txn = Pdp2Txn(pdp2_subscription=self.pdp2_sub,
                           torrent_file_uuid=uuid,
                           torrent_info_hash=info_hash,
                           torrent_file_date_created=timezone.now(),
                           is_store_op=cfg.op == Pdp2Op.STORE,
                           is_pub_key_ours=cfg.is_pub_key_ours,
                           )

        if cfg.pub_key is not None:
            pdp2_txn.pub_key = cfg.pub_key
        if cfg.pub_key_addr is not None:
            pdp2_txn.pub_key_addr = cfg.pub_key_addr
        else:
            pdp2_txn.pub_key_addr = self.pdp2_sub.pub_key_addr

        op_return_metadata = uuid.replace('-', '')

        txid, ref = None, None
        if cfg.op == Pdp2Op.SEND:
            txid, ref = self.pdp2_send(op_return_metadata, cfg.pub_key_addr, cfg.amount)
        # We only do a new store txn when it's a brand new profile.
        # All subsequent transactions will reference the same uuid so it
        # is unnecessary to do another store operation; if there is no
        # pdp2_txn to reference (i.e. self.active_pdp2_txn == None -> True),
        # then we do a store operation.
        elif cfg.op == Pdp2Op.STORE and self.active_pdp2_txn is None:
            txid, ref = self.pdp2_store(op_return_metadata)

        pdp2_txn.pdp2_op_return_txid = txid
        pdp2_txn.pdp2_op_return_ref = ref

        if cfg.op == Pdp2Op.STORE and self.active_pdp2_txn is None:
            pdp2_txn.is_active = True

        pdp2_txn = self.merge_txns(pdp2_txn)
        pdp2_transaction = self.db_store_txn(pdp2_txn)
        if cfg.op == Pdp2Op.STORE:
            self.change_txns_activation_status(old_txn=self.active_pdp2_txn,
                                               new_txn=pdp2_transaction)
        return pdp2_transaction

    def submit_data_to_torrent_providers(self, encrypted_user_data, cfg):
        uuid = self.get_uuid(cfg)
        if cfg.is_compressed:
            suffix = '.zip'
        else:
            suffix = '.json'
        with tempfile.NamedTemporaryFile('wb', suffix=suffix,
                                         prefix=settings.BITTORRENT_TORRENT_DATA_DIR + uuid + '_') as f:
            f.write(encrypted_user_data)
            f.flush()
            # TODO need to delete old send op txns
            if cfg.op == Pdp2Op.SEND or self.active_pdp2_txn is None or self.active_pdp2_txn.torrent_info_hash is None:
                prev_info_hash = settings.NEW_INFO_HASH
            elif cfg.op == Pdp2Op.STORE:
                prev_info_hash = self.active_pdp2_txn.torrent_info_hash
            info_hash = submit_user_data_to_internal_torrent_provider(f.name, prev_info_hash, uuid)
        return uuid, info_hash

    def merge_txns(self, new_txn):
        old_txn = self.active_pdp2_txn
        if old_txn is None:
            return new_txn
        fields = old_txn._meta.get_fields()
        for field in fields:
            print(field.name)
            val_new_txn = getattr(new_txn, field.name, Nein)
            if val_new_txn is Nein:
                continue
            if val_new_txn is None:
                value = getattr(old_txn, field.name, None)
            else:
                value = val_new_txn
            setattr(new_txn, field.name, value)
        return new_txn

    def get_uuid(self, cfg):
        if cfg.op == Pdp2Op.STORE:
            if self.active_pdp2_txn is None:
                uid = uuid_ref.uuid4()
            else:
                uid = self.active_pdp2_txn.torrent_file_uuid
        else:
            uid = uuid_ref.uuid4()
        return str(uid)

    def change_txns_activation_status(self, old_txn, new_txn):
        if old_txn is not None:
            old_txn.active = False
            old_txn.save()
        new_txn.active = True
        new_txn.save()

    def db_store_txn(self, pdp2_txn):
        return Pdp2Transaction.objects.create(**vars(pdp2_txn))

    def pdp2_store(self, op_return_metadata):
        stx = pdp2_reference.store(op_return_metadata, settings.PAICOIN_CFG)
        return stx.txid, stx.ref

    def pdp2_send(self, op_return_metadata, pub_key_addr, amount):
        try:
            stx = pdp2_reference.send(op_return_metadata, pub_key_addr, amount,
                                      settings.PAICOIN_CFG)
        except Exception as e:
            is_dev_machine = settings.DEBUG and 'localhost' in settings.FRONTEND_DOMAIN
            if is_dev_machine and 'Not enough funds to cover the amount and fee' in str(e):
                # we don't want to bother covering funds if this is a development machine
                print(str(e))
                return None, None
            else:
                raise e
        return stx.txid, stx.ref

    def validate_torrent_uuid_immutability(self, this_uuid):
        '''
        We want the UUID to persist throughout data changes, so we only change it
        from the initial value found in the settings file and raise an error when
        the torrent client changes the value or doesn't change from the 
        settings.NULL_UUID placeholder.
        '''

        if self.active_pdp2_txn is None and this_uuid != settings.NULL_UUID:
            return True
        that_uuid = self.active_pdp2_txn.torrent_file_uuid

        if that_uuid == settings.NULL_UUID and this_uuid == settings.NULL_UUID:
            raise Pdp2FileUuidUnchanged(f'For {self.pdp2_sub.user.email}, the uuid of the pdp2 torrent '
                                        f' with the info hash: {self.pdp2_sub.torrent_info_hash}\n'
                                        f' and public key address of:  {self.pdp2_sub.pub_key_addr} \n'
                                        f' changed from {self.pdp2_sub.torrent_file_uuid} to {this_uuid}\n')
        # The uuid of the torrent file changed somehow; we want to raise an Exception
        elif this_uuid != that_uuid:
            raise Pdp2FileUuidChanged(f'For {self.pdp2_sub.user.email}, the uuid of the pdp2 torrent '
                                      f' with the info hash: {self.pdp2_sub.torrent_info_hash}\n'
                                      f' and public key address of:  {self.pdp2_sub.pub_key_addr} \n'
                                      f' changed from {self.pdp2_sub.torrent_file_uuid} to {this_uuid}\n')
        else:
            pass  # do nothing; this is a good state.

        return False


def submit_user_data_to_internal_torrent_provider(file_path, prev_info_hash, uuid):
    cfg = MkTorrCfg(file_path=file_path,
                    prev_info_hash=prev_info_hash,
                    uuid=uuid,
                    )
    torrent_info_hash = MakeTorrent().make_torrent(cfg)
    return torrent_info_hash


def extract_user_data(user, profile_allowed_fields):
    fields = user._meta.get_fields()
    mapping = {}
    for field in fields:
        if field.name not in profile_allowed_fields:
            continue
        value = getattr(user, field.name, None)
        mapping[str(field.name)] = str(value)
    return mapping


def encode_and_format(data):
    # no longer necessary to have this here but I'm trying to get this ready for a demo
    # and don't have time to refactor
    # TODO remove
    # data = data.encode()
    return data


def encrypt_user_data(json_data, priv_key=None, pub_key=None):
    if priv_key is None and pub_key is None:
        raise Exception("Only one of {priv_key, pub_key} may retain a value of None")

    data = encode_and_format(json_data)

    if pub_key is not None:
        i_pk = int(pub_key, 16)
        num_bytes = i_pk.bit_length() // 8 + 1
        # Only works with big endian despite sys.byteorder returning 'little'
        # Maybe something to do with how bitcoin does it.
        endianness = 'big'
        b_pk = i_pk.to_bytes(num_bytes, endianness)
        encrypted = ecies.encrypt(b_pk, data)
    else:
        key = Key(priv_key)
        encrypted = ecies.encrypt(key.public_key, data)
    return encrypted


def get_pub_key(address):
    headers = {"content-type": "application/json"}
    data = {"method": "validateaddress",
            "params": (address,),
            "jsonrpc": "2.0"}
    result = requests.post(settings.CRYPTO_URL, json=data, headers=headers)
    result.raise_for_status()
    pubkey = result.json()['result']['pubkey']
    return pubkey


def get_private_key(address):
    headers = {"content-type": "application/json"}
    data = {"method": "dumpprivkey",
            "params": (address,),
            "jsonrpc": "2.0"}
    result = requests.post(settings.CRYPTO_URL, json=data, headers=headers)
    result.raise_for_status()
    priv_key = result.json()['result']
    return priv_key


def fmt_pdp2_status(pdp2_sub):
    if pdp2_sub is None:
        return 'Inactive'
    status = pdp2_sub.status
    status = status.replace('_', ' ').title()
    return status


from collections import namedtuple


def decode_raw_txn(hexhash):
    headers = {"content-type": "application/json"}
    data = {"method": "decoderawtransaction",
            "params": (hexhash,),
            "jsonrpc": "2.0"}
    result = requests.post(settings.CRYPTO_URL, json=data, headers=headers)
    txn_info = result.json()['result']
    return txn_info


def get_txn_info(txid):
    headers = {"content-type": "application/json"}
    data = {"method": "gettransaction",
            "params": (txid,),
            "jsonrpc": "2.0"}
    result = requests.post(settings.CRYPTO_URL, json=data, headers=headers)
    txn_info = result.json()['result']
    return txn_info


def getaddressinfo(address):
    headers = {"content-type": "application/json"}
    data = {"method": "validateaddress",
            "params": (address,),
            "jsonrpc": "2.0"}
    result = requests.post(settings.CRYPTO_URL, json=data, headers=headers)
    txn_info = result.json()['result']
    return txn_info


def isaddressmine(addr_info):
    return addr_info['ismine']


Payments = namedtuple('Payments', ('addresses', 'value'))


def filter_vout_for_payments(decoded):
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
    return None


def find_payments(txid):
    txn_info = get_txn_info(txid)
    decoded = decode_raw_txn(txn_info['hex'])
    payments = filter_vout_for_payments(decoded)
    return payments


def retrieve_uuid_from_txid(txid):
    transaction = pdp2_reference.Transaction(url=settings.PAICOIN_CFG.url,
                                             auth=settings.PAICOIN_CFG.auth,
                                             testnet=settings.PAICOIN_CFG.is_testnet,
                                             blockchain_type=settings.PAICOIN_CFG.blockchain_type)
    op_return_data = transaction.retrieve_by_txid(txid)['data']

    lengths = dict(delimiter_len=2,
                   protocol_version_len=2,
                   reserved_len=12,
                   op_len=2,
                   storage_method_len=2)
    total_length = 0
    for key in lengths:
        total_length += lengths[key] // 2  # the lens are in hex which corresponds half the len in bytes
    # no magic numbers
    metadata_len_len = 1
    # maybe overdoing it with no magic numbers rule
    hex_base = 16
    metadata_len = int(op_return_data[int(total_length):int(total_length) + metadata_len_len].hex(), hex_base)
    metadata_raw = op_return_data[int(total_length) + 1:int(total_length) + metadata_len + 1]
    metadata = bytearray.fromhex(metadata_raw.hex()).decode()
    # for documentation sake
    torrent_uuid = metadata
    return torrent_uuid


def get_torrent(uuid):
    if '-' not in uuid:
        # '738e85c1-a7f0-41f2-b21a-3532affe9fab'
        # it was saved to the torrent client with hyphens and thus needs hyphens; whereas pdp2 removes the hyphens
        # to store onto the blockchain.
        uuid = uuid[:8] + '-' + uuid[8:12] + '-' + uuid[12:16] + '-' + uuid[16:20] + '-' + uuid[20:]
    torrent_data = download_torrent_file(uuid)
    return torrent_data


def manufacture_response_w_torrent_data(uuid):
    torrent_data = get_torrent(uuid)
    content_type = 'application/x-bittorrent'
    response = HttpResponse(torrent_data,
                            content_type=content_type)
    filename = f'{uuid}.torrent'
    content_disposition = f'attachment; filename={filename}'
    response['Content-Disposition'] = content_disposition
    return response


def get_s3_client():
    return settings.AWS_API.client(service_name='s3',
                                   region_name=os.environ['REGION_NAME'])


def download_torrent_file(file_uuid):
    torrent_path = f'{settings.BITTORRENT_TORRENT_DATA_DIR}{file_uuid}.torrent'
    # it's possible that the file was deleted in between container initializations
    if True:
        qs = Torrent.objects.all().filter(file_uuid=file_uuid)
        torrent = qs.latest('created_on')
        path = torrent.user_data_file.name
        # the .name usually begins with a "/" which boto3 doesn't like for some
        # reason.
        key = path[1:] if path.startswith('/') else path
        response = get_s3_client().get_object_torrent(Bucket=os.environ['AWS_STORAGE_BUCKET_NAME'],
                                                      Key=key)
        with open(torrent_path, 'wb') as f:
            f.write(response['Body'].read())

        # with torrent.user_data_file.open('rb') as fin:
        #    with open(torrent.user_data_file.name, 'wb') as fout:
        #        for el in fin:
        #            fout.write(el)
        # torrent_path = torrent.user_data_file.name
    with open(torrent_path, 'rb') as f:
        file_content = f.read()
    os.remove(torrent_path)
    return file_content


@dataclass
class MkTorrCfg:
    prev_info_hash: str = None
    uuid: str = None
    file_path: str = None


class MakeTorrent:

    def make_torrent(self, cfg):

        logger.info('Got make torrent request')
        info_hash = self.add_to_db(cfg)
        logger.info('Torrent added')
        logger.info('Success')
        return info_hash

    def add_to_db(self, cfg):
        prev_info_hash = cfg.prev_info_hash

        with open(cfg.file_path, 'rb') as user_data_file:

            qs = Torrent.objects.all().filter(info_hash=prev_info_hash)
            if qs.count() > 0:
                if qs.count() > 1:
                    raise Exception('There should not be more than one torrent file with the hash of'
                                    f'{prev_info_hash}.')

                torrent = qs.first()
                if torrent.file_uuid != cfg.uuid:
                    raise Exception(
                        f'Torrent file uuid changed for {torrent.user_data_file.name} with info hash {prev_info_hash}'
                        f' from {torrent.file_uuid} to {cfg.uuid}')

                delete_torrent(prev_info_hash)
                torrent.user_data_file = File(user_data_file)

            else:
                torrent = Torrent.objects.create(user_data_file=File(user_data_file),
                                                 file_uuid=cfg.uuid)

            torrent.save()
        if settings.CONFINEMENT != 'LOCAL_ONLY':
            path = torrent.user_data_file.name
            # the .name usually begins with a "/" which boto3 doesn't like for some
            # reason.
            key = path[1:] if path.startswith('/') else path
            response = get_s3_client().get_object_torrent(Bucket=os.environ['AWS_STORAGE_BUCKET_NAME'],
                                                          Key=key)

            torrent_path = f'torrent_{str(int(time.time()))}.torrent'
            with open(torrent_path, 'wb') as f:
                f.write(response['Body'].read())
            info_hash = get_info_hash(torrent_path)
            torrent.info_hash = info_hash
            torrent.save()
            # we don't want the instance to get polluted with torrent files.
            self.remove_tmp_files((torrent_path,))
        else:
            # todo Add code from paicoins contrib for pdp2
            pass

        return info_hash

    def remove_tmp_files(self, tmp_paths):
        # TODO this could be replace by tempfile.NamedTemporaryFile
        for path in tmp_paths:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"Removed: {path}")
            else:
                logger.info(f"Path {path} doesn't exist; not removing")


def delete_torrent(info_hash):
    try:
        torrent = Torrent.objects.all().get(info_hash=info_hash)
        torrent.delete()
        logger.info(f"Deleted torrent with the info hash {info_hash}")
    except Torrent.DoesNotExist:
        logger.info(f"Attempted to delete torrent with the info hash {info_hash} but it was not found.")


def get_info_hash(torrent_path):
    # Open the file and decode it
    with open(torrent_path, 'rb') as f:
        d = bencode.bdecode(f.read())
    # Get the torrent info from the decoded file.
    info = d['info']
    # hash it with a sha1
    hashed = hashlib.sha1(bencode.bencode(info)).hexdigest()
    return hashed


def submit_dataset(cfg, data, dataset, pdp2_sub, user, is_binary=False):
    submit_user_data = SubmitUserData(pdp2_sub=pdp2_sub)
    pdp2_txn = submit_user_data(cfg, data)
    if user.email.endswith('@lanier.ai') or user.email.endswith('@j1149.com'):
        # if it's a aggregated data (of type bytes), we want to properly name it.
        if cfg.is_compressed:
            path = settings.AGGREGATED_DATA_DIR + '/' + str(uuid.uuid4()) + '.zip'
            with open(path, 'wb') as f:
                f.write(data)
                f.flush()
            with open(path, 'rb') as f:
                AggregatedStorage.objects.create(txn=pdp2_txn, data=File(f), dataset=dataset)
            # TODO doesn't this need an os.remove so that we don't start running out of memory???
        else:
            JSONStorage.objects.create(txn=pdp2_txn, data=data, dataset=dataset)
    return pdp2_txn


def generate_pdp2_sub(user):
    pub_key_addr = paicoin_cli.get_new_wallet_address(settings.CRYPTO_URL)

    pdp2_sub = Pdp2ProfileSubscription \
        .objects \
        .create(user=user,
                pub_key_addr=pub_key_addr,
                amount_requested=int(0.001 * Pdp2ProfileSubscription.SATOSHI))
    pdp2_sub.save()
    return pdp2_sub
