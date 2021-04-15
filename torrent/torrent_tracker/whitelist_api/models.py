from django.db import models
from django.utils.translation import gettext_lazy as _

class TorrentInfoHash(models.Model):

    info_hash = models.CharField(_("info hash"), max_length=64,
                                 null=False, blank=False)

    created_on = models.DateTimeField(auto_now_add=True)

