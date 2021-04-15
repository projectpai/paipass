from django.urls import path

from whitelist_api.views import AddTorrentInfoHash, RemoveTorrentInfoHash

app_name = 'whitelist_api'

urlpatterns = [
    path('add-torrent-info-hash/', AddTorrentInfoHash.as_view()),
    path('del-torrent-info-hash/', RemoveTorrentInfoHash.as_view()),

]
