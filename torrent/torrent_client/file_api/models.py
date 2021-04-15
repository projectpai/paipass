from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


# Create your models here.
class Torrent(models.Model):
    torrent_file = models.FileField(_('Torrent file'),
                                    null=False, blank=False,
                                    upload_to=settings.DEPLOYMENT_ENV + '/torrent_data')

    user_data_file = models.FileField(_('File corresponding to torrent file'),
                                      upload_to=settings.DEPLOYMENT_ENV+'/torrent')

    info_hash = models.CharField(_('Torrent info hash'),
                                 max_length=64,
                                 null=False, blank=False,
                                 unique=True)
    # There is no telling how large this grows...
    # (Moreover, it would be prudent to leave unique=False; I'm somewhat sure
    # that transmission doesn't keep incrementing if a torrent is removed)
    transmission_torrent_id = models.BigIntegerField(_('Transmission torrent id'),
                                                     null=False, blank=False, unique=False
                                                     )

    created_on = models.DateTimeField(auto_now_add=True)

    file_uuid = models.CharField(max_length=36,
                                 default=settings.NULL_UUID)
