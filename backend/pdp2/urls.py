from django.urls import path

from .views import (GenPubAddrView, TorrentFileView, BypassPaymentReceivedView, PaymentReceivedView, Pdp2ActivationStatusView, TorrentFileInfoView,
                    PaymentView, PubAddrsListView, SendPdp2Data, ChangePubKey, WalletNotificationView,
                    BlockNotificationView, TxnsView, TorrentFileFromTxid, TorrentUuidFromTxid)

urlpatterns = [
    # Generate public key address
    path('new-payment-address/',
         GenPubAddrView.as_view()),

    # Get all payment addresses
    path('payment-addresses/',
         PubAddrsListView.as_view()
         ),

    # download the torrent
    path('get-torrent/',
         TorrentFileView.as_view()),
    path('get-torrent/<str:torrent_uuid>/',
         TorrentFileView.as_view()),
    # get the information about the torrent
    path('get-torrent-info/',
         TorrentFileInfoView.as_view()),

    path('get-torrent-info/<uuid:torrent_uuid>/',
         TorrentFileInfoView.as_view()),

    path('get-torrent-via-txid/<str:txid>/',
         TorrentFileFromTxid.as_view()),

    path('get-torrent-info-via-txid/<str:txid>/',
         TorrentUuidFromTxid.as_view()),

    path('payment-received/',
         PaymentReceivedView.as_view()),

    path('bypass-payment-received/',
         BypassPaymentReceivedView.as_view()),

    path('payment/', PaymentView.as_view()),

    path('get-txns/', TxnsView.as_view()),

    # Status of pdp2 profile
    path('pdp2-activation-status/',
         Pdp2ActivationStatusView.as_view()),
    # Allows the user to change the status of their pdp2 profile
    path('pdp2-activation-status/<str:requested_change>/',
         Pdp2ActivationStatusView.as_view()),

    # Allows a staff  member to change the status of a user's pdp2 profile
    # TODO should the pub_key_addr be a uuid???
    path('pdp2-activation-status/<str:requested_change>/<uuid:pub_key_addr>/',
         Pdp2ActivationStatusView.as_view()),

    # Sends Pdp2 profile data to a pub_key address
    path('send/', SendPdp2Data.as_view()),

    # Change the public key that the data is encrypted with
    path('change-store-pub-key/', ChangePubKey.as_view()),

    path('wallet-notification/', WalletNotificationView.as_view()),

    path('block-notification/', BlockNotificationView.as_view())

]
