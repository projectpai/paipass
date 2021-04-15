# stdlib
import os
import logging
import sys

from core.blockchain.projectpai.paicoin import paicoin_cli
from django.conf import settings
# third party
from rest_framework import generics
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

# local
from .serializers import (GenPubKeyAddrSerializer,
                          TxnsListSerializer)
from api.views import ResultsPagination
from pdp2 import pdp2 as django_pdp2
from pdp2.pdp2 import Pdp2Cfg, Pdp2Op
from .models import (Pdp2ProfileSubscription, Pdp2Transaction, JSONStorage)
from yggdrasil.models import Dataset, DatasetWatchTypeChoices
from yggdrasil.ygg import submit_aggregated_data

logger = settings.LOGGER


class PubAddrsListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        d = {'addrs': []}
        pdp2_subs = django_pdp2.get_subscriptions(user=request.user)
        for pdp2_sub in pdp2_subs:
            d_i = {'pub_key_addr': str(pdp2_sub.pub_key_addr),
                   'amount_paid': str(pdp2_sub.amount_paid),
                   'amount_requested': str(pdp2_sub.amount_requested),
                   'status': str(pdp2_sub.status)}

            d['addrs'].append(d_i)
        return Response(d, status=status.HTTP_200_OK)


class GenPubAddrView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = GenPubKeyAddrSerializer

    def retrieve(self, request, *args, **kwargs):
        addr = paicoin_cli.get_new_wallet_address(settings.CRYPTO_URL)
        serializer = self.get_serializer(data={'pub_key_addr': addr})
        serializer.is_valid(raise_exception=True)
        pdp2_sub = self._create_pdp2_profile_subscription(request, addr)
        d = {'pub_key_addr': pdp2_sub.pub_key_addr,
             'amount_requested': pdp2_sub.amount_requested}
        return Response(d, status.HTTP_200_OK)

    def _create_pdp2_profile_subscription(self, request, pub_key_addr):
        pdp2_sub = Pdp2ProfileSubscription \
            .objects \
            .create(user=request.user,
                    pub_key_addr=pub_key_addr,
                    amount_requested=int(0.001 * Pdp2ProfileSubscription.SATOSHI))
        pdp2_sub.save()
        return pdp2_sub


class ChangePubKey(generics.CreateAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        pub_key = request.data['pub_key']
        if 'pub_key_addr' in request.data:
            pub_key_addr = request.data['pub_key_addr']
        else:
            pub_key_addr = settings.USER_DECLINED_PUB_KEY_ADDR

        cfg = Pdp2Cfg(op=Pdp2Op.STORE,
                      pub_key=pub_key,
                      pub_key_addr=pub_key_addr,
                      is_pub_key_ours=False)
        submit_user_data = django_pdp2.SubmitUserData(user=request.user)
        pdp2_transaction = submit_user_data(cfg)
        return Response({'pub_key': pdp2_transaction.pub_key}, status=status.HTTP_200_OK)


class TorrentFileInfoView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def retrieve(self, request, *args, **kwargs):
        sub = django_pdp2.get_active_subscription(user=request.user)
        if sub is None:
            d = {'detail': 'no active subscription found'}
            return Response(d, status=status.HTTP_404_NOT_FOUND)
        pdp2_txn = django_pdp2.get_pdp2_txn(pdp2_sub=sub,
                                            active=True)

        d = {'datetime_created': {'year': pdp2_txn.torrent_file_date_created.year,
                                  'month': pdp2_txn.torrent_file_date_created.month,
                                  'day': pdp2_txn.torrent_file_date_created.day,
                                  'hour': pdp2_txn.torrent_file_date_created.hour,
                                  'minute': pdp2_txn.torrent_file_date_created.minute,
                                  'second': pdp2_txn.torrent_file_date_created.second, },
             'info_hash': pdp2_txn.torrent_info_hash,
             'uuid': pdp2_txn.torrent_file_uuid,
             'txid': pdp2_txn.pdp2_op_return_txid,
             'ref': pdp2_txn.pdp2_op_return_ref
             }
        return Response(d, status=status.HTTP_200_OK)


class TorrentFileView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def retrieve(self, request, *args, **kwargs):
        sub = django_pdp2.get_active_subscription(user=request.user)
        if sub is None:
            d = {'detail': 'no active subscription found'}
            return Response(d, status=status.HTTP_404_NOT_FOUND)
        pdp2_txn = django_pdp2.get_pdp2_txn(pdp2_sub=sub, active=True)
        if 'torrent_uuid' in kwargs:
            torrent_uuid = kwargs.get('torrent_uuid')
        elif bool(request.user and request.user.is_authenticated):
            torrent_uuid = pdp2_txn.torrent_file_uuid
        else:
            Response({}, status=status.HTTP_403_FORBIDDEN)

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        logger.info('Download torrent {} request from {}'.format(torrent_uuid, ip))

        response = django_pdp2.manufacture_response_w_torrent_data(torrent_uuid)
        return response


class TorrentFileFromTxid(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def retrieve(self, request, *args, **kwargs):

        if 'txid' not in kwargs:
            return Response({'detail': 'missing parameter'}, status=status.HTTP_400_BAD_REQUEST)

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        logger.info('Download torrent with txid {} request from {}'.format(kwargs['txid'], ip))

        torrent_uuid = django_pdp2.retrieve_uuid_from_txid(kwargs['txid'])
        response = django_pdp2.manufacture_response_w_torrent_data(torrent_uuid)
        return response


class TorrentUuidFromTxid(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def retrieve(self, request, *args, **kwargs):
        if 'txid' not in kwargs:
            return Response({'detail': 'missing parameter'}, status=status.HTTP_400_BAD_REQUEST)
        torrent_uuid = django_pdp2.retrieve_uuid_from_txid(kwargs['txid'])
        return Response({'torrent_uuid': torrent_uuid}, status=status.HTTP_200_OK)


class IsTheUserOurPaicoinServer(BasePermission):
    '''The user has to be our paicoin server to access this view.'''

    def has_permission(self, request, view):
        print('IsTheUserOurPaicoinServer' + str(os.environ['PAICOIN_SERVER_EMAIL']) + str(request.user.email))
        if request.user.email == os.environ['PAICOIN_SERVER_EMAIL']:
            return True
        return False


class IsUserABypassingUser(BasePermission):

    def has_permission(self, request, view):
        user = request.user
        return django_pdp2.can_bypass_payment(user)


def receive_payment(request, *args, **kwargs):
    pub_key_addr = request.data['pub_key_addr']
    pdp2_sub = Pdp2ProfileSubscription \
        .objects.all().get(pub_key_addr=pub_key_addr)

    paid_amount = int(request.data['paid_amount'])
    if paid_amount != pdp2_sub.amount_requested:
        det = (f"incomplete payment - requested: {pdp2_sub.amount_requested}"
               f" paid: {paid_amount}")
        return Response({'detail': det}, status=status.HTTP_402_PAYMENT_REQUIRED)
    pdp2_sub.amount_paid = paid_amount
    django_pdp2.activate_pdp2_profile(pdp2_sub)
    submit_user_data = django_pdp2.SubmitUserData(pdp2_sub=pdp2_sub)
    pdp2_transaction = submit_user_data()
    pdp2_sub.save()

    d = {'uuid': pdp2_transaction.torrent_file_uuid,
         'txid': pdp2_transaction.pdp2_op_return_txid,
         'ref': pdp2_transaction.pdp2_op_return_ref}
    return d


class PaymentReceivedView(generics.CreateAPIView):
    permission_classes = (IsAuthenticated & IsTheUserOurPaicoinServer,)

    def create(self, request, *args, **kwargs):
        d = receive_payment(request, *args, **kwargs)
        return Response(d, status=status.HTTP_200_OK)


class BypassPaymentReceivedView(generics.CreateAPIView):
    permission_classes = (IsAuthenticated & IsUserABypassingUser,)

    def create(self, request, *args, **kwargs):
        d = receive_payment(request, *args, **kwargs)
        return Response(d, status=status.HTTP_200_OK)


class PaymentView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        pdp2_sub = django_pdp2.get_subscription(user=request.user)
        if pdp2_sub is None:
            d = {'detail': 'PDP2 subscription not found.'}
            return Response(d, status=status.HTTP_404_NOT_FOUND)
        is_amount_paid = pdp2_sub.amount_requested == pdp2_sub.amount_paid
        d = {'is_requested_amount_paid': is_amount_paid,
             'amount_paid': pdp2_sub.amount_paid,
             'amount_requested': pdp2_sub.amount_requested,
             'pub_key_addr': pdp2_sub.pub_key_addr}
        return Response(d, status=status.HTTP_200_OK)


class Pdp2ActivationStatusView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        pdp2_sub = django_pdp2.get_subscription(user=request.user)
        d = {'pdp2_sub_status': django_pdp2.fmt_pdp2_status(pdp2_sub),
             'can_bypass_payment': django_pdp2.can_bypass_payment(request.user)}

        return Response(d, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # If an arbitrary user is being deactivated,
        # the user must be a staff member; else throw a 403.
        if 'pub_key_addr' in kwargs:
            if not request.user.is_staff:
                d = {'detail': 'User is not a staff member'}
                return Response(d, status.HTTP_403_FORBIDDEN)
        requested_change = kwargs['requested_change']
        if requested_change == 'activate':
            return self._activate_profile(request, *args, **kwargs)
        elif requested_change == 'deactivate':
            return self._deactivate_profile(request, *args, **kwargs)
        else:
            d = {'detail': f'requested change {requested_change} not found.'}
            return Response(d, status=status.HTTP_404_NOT_FOUND)

    def _activate_profile(self, request, *args, **kwargs):
        pdp2_sub = None

        if 'pub_key_addr' in kwargs:
            pdp2_sub = django_pdp2.get_subscription(kwargs['pub_key_addr'])
            pdp2_sub.staff_deactivated = False
        # If a staff member deactivated the pdp2 sub, we don't want the
        # user to be able to reactivate it
        if pdp2_sub is None:
            pdp2_sub = django_pdp2.get_deactivated_subscription(user=request.user)
            if pdp2_sub is None:
                d = {'detail': 'No active subscription found'}
                return Response(d, status=status.HTTP_400_BAD_REQUEST)
            if pdp2_sub.staff_deactivated and not request.user.is_staff:
                d = {'detail': 'Staff deactivated subscription; user cannot reactivate subscription.'}
                return Response(d, status=status.HTTP_400_BAD_REQUEST)
            if pdp2_sub.staff_deactivated:
                pdp2_sub.staff_deactivated = False
            elif pdp2_sub.user_deactivated:
                pdp2_sub.user_deactivated = False
            else:
                raise Exception('Activating a profile that is neither user deactivated nor staff'
                                f' deactivated.\n Sub status was: {pdp2_sub.status}.\n'
                                f' User email was: {request.user.email}.\n')

        pdp2_sub.save()
        if pdp2_sub.status == Pdp2ProfileSubscription.STATUS_ACTIVATED:
            submit_user_data = django_pdp2.SubmitUserData(pdp2_sub=pdp2_sub)
            submit_user_data()
        return Response({'pdp2_sub_status': django_pdp2.fmt_pdp2_status(pdp2_sub)}, status=status.HTTP_200_OK)

    def _deactivate_profile(self, request, *args, **kwargs):
        pdp2_sub = None

        if 'pub_key_addr' in kwargs:
            pdp2_sub = django_pdp2.get_subscription(kwargs['pub_key_addr'])
            pdp2_sub.staff_deactivated = True

        if pdp2_sub is None:
            pdp2_sub = django_pdp2.get_subscription(user=request.user)
            if pdp2_sub is None:
                d = {'detail': 'No active subscription found'}
                return Response(d, status=status.HTTP_400_BAD_REQUEST)
            pdp2_sub.user_deactivated = True

        info_hash = django_pdp2.get_pdp2_txn(pdp2_sub, active=True)
        django_pdp2.delete_torrent(info_hash)
        # save for either case
        pdp2_sub.save()

        return Response({'pdp2_sub_status': django_pdp2.fmt_pdp2_status(pdp2_sub)}, status=status.HTTP_200_OK)


class SendPdp2Data(generics.CreateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_dataset(self, request, variant_values):
        field0 = variant_values['field0']
        if field0['name'] != 'dataset_id':
            raise Exception("Our hack isn't working anymore!")
        dataset_id = request.data['variant_values']['field0']['value']
        datasets = Dataset.objects.all().filter(id=dataset_id)
        if datasets.count() != 1:
            return None
        dataset = datasets.first()
        if dataset.share_group.owner != request.user:
            return None
        return dataset

    def post(self, request, *args, **kwargs):
        pub_key_addr = request.data['pub_key_addr']
        encryption_value = request.data['encryption_value']
        pub_key = None
        if encryption_value == 'encrypted':
            pub_key = request.data['pub_key']
        variant_values = request.data['variant_values']
        data = None
        dataset = None

        pdp2_sub = django_pdp2.get_active_subscription(user=request.user)

        if pdp2_sub is None:
            return Response({'detail': 'No active subscription found'}, status=status.HTTP_403_FORBIDDEN)

        if variant_values['selectedDatasetType'] == 'DATASET':
            dataset = self.get_dataset(request, variant_values)
            if dataset is None:
                return Response({'detail': 'Dataset could not be found or the requesting user does not own dataset'},
                                status=status.HTTP_404_NOT_FOUND)
        else:
            # TODO I put this else here because I have no clue what else would come through here
            #  What does this: variant_values['selectedDatasetType'] == 'DATASET' mean?
            #  Why does it exist at all?
            return Response({'detail': 'Not implemented'}, statu=status.HTTP_400_BAD_REQUEST)
        dataset.watched_by = DatasetWatchTypeChoices.PDP2
        dataset.save()

        cfg = Pdp2Cfg(op=Pdp2Op.SEND,
                      pub_key=pub_key,
                      pub_key_addr=pub_key_addr,
                      encryption_value=encryption_value,
                      amount=Pdp2Cfg.DEFAULT_PDP2_AMOUNT)

        pdp2_txn = submit_aggregated_data(cfg, dataset, pdp2_sub, request.user)

        return Response({'txid': pdp2_txn.pdp2_op_return_txid}, status=status.HTTP_200_OK)


class JsonDataGet(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)

    def get(self, request, *args, **kwargs):
        txn_id = kwargs['txn_id']
        qs = Pdp2Transaction.objects.all().filter(pdp2_op_return_txid=txn_id)
        if qs.count() < 1:
            return Response({}, status=status.HTTP_404_NOT_FOUND)
        qs = JSONStorage.objects.all().filter(txn=qs.earliest('created_on'))
        if qs.count() != 1:
            return Response({}, status=status.HTTP_404_NOT_FOUND)
        js = qs.first()
        # TODO: do better checks for share groups
        if not js.dataset.share_group.everyone:
            return Response({}, status=status.HTTP_403_FORBIDDEN)
        return Response(js.data, status=status.HTTP_200_OK)


class DataSharingResultsPagination(PageNumberPagination):
    page_size = 10
    page_query_param = 'page'
    page_size_query_param = 'perPage'
    max_page_size = 100


class TransactionsThatHaveJsonData(generics.ListAPIView):
    serializer_class = TxnsListSerializer
    pagination_class = DataSharingResultsPagination
    paginate_by = 10
    permission_classes = (AllowAny,)

    def get_links(self, request, start, limit, are_more):
        path = 'datasharingtransactions'
        if "txid" in request.query_params:
            txid_param = f"&txid={request.query_params['txid']}"
        else:
            txid_param = ""

        next_start = start + limit

        if start > 0:
            prev_start = start - 1 if start - 1 > 0 else 0
            prev = settings.BACKEND_DOMAIN + path + f'?limit={limit}&start={prev_start}{txid_param}'
        else:
            prev = ""

        if are_more:
            nxt = settings.BACKEND_DOMAIN + path + f'?limit={limit}&start={next_start}{txid_param}'
        else:
            nxt = ""

        links = {"base": settings.BACKEND_DOMAIN,
                 "next": nxt,
                 "self": settings.BACKEND_DOMAIN + path,
                 "prev": prev
                 }

        return links

    def list(self, request, *args, **kwargs):

        start = 0
        limit = 3
        if "limit" in request.query_params:
            limit = int(request.query_params["limit"])
        if "start" in request.query_params:
            start = int(request.query_params["start"])

        txids = []
        are_more = False
        if 'txid' in request.query_params:
            txn = Pdp2Transaction.objects.all().get(pdp2_op_return_txid=request.query_params['txid'])
            js = JSONStorage.objects.all().get(txn=txn)

            for i, js_i in enumerate(JSONStorage.objects.all().filter(created_on__gte=js.created_on)):
                if i - start >= 0 and len(txids) - 1 < limit:
                    txids.append(js_i.txn.pdp2_op_return_txid)
                if len(txids) > limit:
                    are_more = True
                    break
        else:
            for i, js_i in enumerate(JSONStorage.objects.all()):
                if i - start >= 0:
                    txids.append(js_i.txn.pdp2_op_return_txid)
                if len(txids) == limit:
                    break

        links = self.get_links(request, start, limit, are_more)
        d = {"links": links, "limit": limit, "start": start, "transactions": txids, "size": len(txids)}
        return Response(d, status=status.HTTP_200_OK)


class WalletNotificationView(generics.CreateAPIView):
    permission_classes = (IsAuthenticated & IsTheUserOurPaicoinServer,)

    def post(self, request, *args, **kwargs):
        txid = request.data.get('txn_id', None)
        if txid is None:
            return Response({'detail': 'txid not provided'}, status=status.HTTP_400_BAD_REQUEST)
        payments = django_pdp2.find_payments(txid)
        for address in payments.addresses:
            qs = Pdp2ProfileSubscription.objects.all().filter(pub_key_addr=address)
            if qs.count() < 1:
                continue
            pdp2_sub = qs.latest('created_on')
            if pdp2_sub.txid is not None and len(pdp2_sub.txid) > 20:
                continue
            pdp2_sub.txid = txid
            pdp2_sub.is_monitoring_block_height = True
            pdp2_sub.save()
        return Response({}, status=status.HTTP_200_OK)


class IsAuthenticatedT(BasePermission):
    """
    Allows access only to authenticated users.
    """

    def has_permission(self, request, view):
        try:
            print('IsAuthenticatedT')
            print('request.user')
            print(request.user)
            print('request.user.is_authenticated')
            print(request.user.is_authenticated)
        except:
            pass
        return bool(request.user and request.user.is_authenticated)


class BlockNotificationView(generics.CreateAPIView):
    permission_classes = (IsAuthenticatedT & IsTheUserOurPaicoinServer,)

    def post(self, request, *args, **kwargs):
        blockhash = request.data.get('blockhash', None)
        if blockhash is None:
            return Response({'detail': 'no blockhash found in the request'},
                            status=status.HTTP_400_BAD_REQUEST)
        met_threshold = self.check_monitored_subscriptions(blockhash)
        self.save_payment(met_threshold)
        return Response({}, status=status.HTTP_200_OK)

    def check_monitored_subscriptions(self, blockhash):
        met_threshold = []
        for pdp2_sub in Pdp2ProfileSubscription.objects.all().filter(is_monitoring_block_height=True):
            txn_info = django_pdp2.get_txn_info(pdp2_sub.txid)
            payments = django_pdp2.find_payments(pdp2_sub.txid)
            confirmations = txn_info['confirmations']
            if confirmations > settings.CONFIRMATION_THRESHOLD:
                met_threshold.append((pdp2_sub, payments.value))
        return met_threshold

    def save_payment(self, met_threshold):
        for pdp2_sub, payment_amount in met_threshold:
            pdp2_sub.is_monitoring_block_height = False
            pdp2_sub.amount_paid += payment_amount * Pdp2ProfileSubscription.SATOSHI
            if pdp2_sub.amount_paid < pdp2_sub.amount_requested:
                pdp2_sub.pub_key_addr = paicoin_cli.get_new_wallet_address(settings.CRYPTO_URL)
            else:
                django_pdp2.activate_pdp2_profile(pdp2_sub)
                submit_user_data = django_pdp2.SubmitUserData(pdp2_sub=pdp2_sub)
                submit_user_data()
            pdp2_sub.save()


class TxnsView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = TxnsListSerializer
    pagination_class = ResultsPagination

    paginate_by = 10

    def get_queryset(self):
        pdp2_sub = django_pdp2.get_active_subscription(user=self.request.user)
        qs = Pdp2Transaction \
            .objects \
            .all() \
            .order_by(self.request.query_params['orderBy']) \
            .filter(pdp2_subscription=pdp2_sub)
        if 'paicoin_address' in self.request.query_params:
            qs = qs.filter(email__icontains=self.request.query_params['paicoin_address'])
        return qs
