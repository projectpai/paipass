import datetime
import os
import uuid

from core.blockchain.projectpai.paicoin import paicoin_cli
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import FileSystemStorage
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.fields import JSONField


def long_time_from_now():
    # 100 years from now seems far more than sufficient for this code to be
    # dead
    long_time = timezone.now() + datetime.timedelta(weeks=52 * 100)
    return long_time


def generate_pub_key_addr():
    pub_key_addr = paicoin_cli.get_pub_key_addr(settings.CRYPTO_URL)
    return pub_key_addr


home_dir = os.path.expanduser('~')
tor_dir = os.path.join(home_dir, "user_data", "torrents")
fs = FileSystemStorage(location=tor_dir)


class Pdp2ProfileSubscription(models.Model):
    STATUS_ACTIVATED = "ACTIVATED"
    STATUS_PENDING = "PENDING"
    STATUS_USER_DEACTIVATED = 'USER_DEACTIVATED'
    STATUS_STAFF_DEACTIVATED = 'STAFF_DEACTIVATED'
    STATUS_DEACTIVATED = "DEACTIVATED"
    STATUS_INACTIVE = "INACTIVE"
    SATOSHI = 100000000

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="pdp2_user",
        null=False, blank=False, on_delete=models.CASCADE
    )

    pub_key_addr = models.CharField(blank=False, null=False,
                                    max_length=34,
                                    default=generate_pub_key_addr)

    is_monitoring_block_height = models.BooleanField(default=False)

    txid = models.CharField(blank=False, null=False, max_length=64)

    # Reason why:
    # https://bitcointalk.org/index.php?topic=131859.0
    amount_paid = models.BigIntegerField(default=0)

    # Safe, big number:
    # https://docs.djangoproject.com/en/2.0/ref/models/fields/#integerfield
    BIG_NUM = 2147483647
    amount_requested = models.BigIntegerField(default=BIG_NUM)

    discount = models.BigIntegerField(_("discount"),
                                      default=0)

    subscription_start_date = models.DateTimeField(
        default=long_time_from_now)

    # In units of days
    subscription_length = models.IntegerField(default=-1)

    # We want to grant the user the ability to deactivate their profile.
    # This mechanism is needed in case they have already paid for their profile.
    # If they have already paid and they want to reactivate their profile,
    # we do not want them to pay twice; we just toggle this to false if they
    # want to reactivate.
    user_deactivated = models.BooleanField(default=False)
    # Right now this exists for testing purposes but it could be useful
    # in the cases where the user doesn't meet criteria needed to be
    # a user in our system (e.g. regional restrictions) or simply
    # because the user is abusing the system.
    staff_deactivated = models.BooleanField(default=False)

    created_on = models.DateTimeField(auto_now_add=True)

    @property
    def status(self):
        has_been_paid = self.amount_requested <= self.amount_paid

        if self.user_deactivated:
            return Pdp2ProfileSubscription.STATUS_USER_DEACTIVATED
        if self.staff_deactivated:
            return Pdp2ProfileSubscription.STATUS_STAFF_DEACTIVATED

        now = timezone.now()
        sub_start = self.subscription_start_date
        sub_len = datetime.timedelta(days=self.subscription_length)
        sub_end = sub_start + sub_len
        if sub_start < now < sub_end and has_been_paid:
            return Pdp2ProfileSubscription.STATUS_ACTIVATED
        elif now > sub_end and has_been_paid:
            return Pdp2ProfileSubscription.STATUS_DEACTIVATED
        elif self.amount_requested < self.BIG_NUM:
            return Pdp2ProfileSubscription.STATUS_PENDING
        else:
            return Pdp2ProfileSubscription.STATUS_INACTIVE


class Pdp2Transaction(models.Model):
    # TODO: It may no longer make sense to have NULL_TXID, NULL_REF, or NEW_INFO_HASH
    #   since... since what?? since -> I think what I was trying to say was
    #   the torrent client no longer manufactured the INFO_HASH so there
    #   was no need from at least that reference point; not sure about
    #   NULL_TXID and NULL_REF

    # TODO: these names are all super verbose and are starting to get annoying;
    #  I'm not sure their self-documenting nature is worth developer unhappiness.

    # class Meta:
    #     # application ~ namespace and since the original definitions
    #     # specified one namespace person app, we can use this approx.
    #     unique_together = ('pdp2_subscription', 'is_active', )

    pdp2_subscription = models.ForeignKey(Pdp2ProfileSubscription,
                                          null=False,
                                          blank=False,
                                          on_delete=models.CASCADE)

    torrent_file_uuid = models.CharField(max_length=36,
                                         default=settings.NULL_UUID)

    torrent_info_hash = models.CharField(max_length=64,
                                         default=settings.NEW_INFO_HASH)

    torrent_file_date_created = models.DateTimeField(null=False, blank=False)

    # https://bitcoin.stackexchange.com/questions/34109/are-transaction-ids-always-the-same-length/34110
    pdp2_op_return_txid = models.CharField(max_length=64,
                                           default=settings.NULL_TXID)

    pdp2_op_return_ref = models.CharField(max_length=len(settings.NULL_REF),
                                          default=settings.NULL_REF,
                                          # a ref is not currently returned by a send txn
                                          # so a null value is valid.
                                          null=True, blank=True)

    pub_key_addr = models.CharField(blank=False, null=False,
                                    max_length=34)

    pub_key = models.CharField(max_length=66,
                               null=True, blank=True)

    is_store_op = models.BooleanField(default=False)

    is_pub_key_ours = models.BooleanField(default=False)

    is_active = models.BooleanField(default=False)

    created_on = models.DateTimeField(auto_now_add=True)




class JSONStorage(models.Model):
    txn = models.ForeignKey('pdp2.Pdp2Transaction', null=False,
                            blank=False,
                            on_delete=models.CASCADE)

    dataset = models.ForeignKey('yggdrasil.Dataset', null=False,
                                blank=False,
                                on_delete=models.CASCADE)

    data = JSONField(_('Json Data'), null=False)

    created_on = models.DateTimeField(auto_now_add=True)


class AggregatedStorage(models.Model):
    txn = models.ForeignKey('pdp2.Pdp2Transaction', null=False,
                            blank=False,
                            on_delete=models.CASCADE)

    dataset = models.ForeignKey('yggdrasil.Dataset', null=False,
                                blank=False,
                                on_delete=models.CASCADE)

    data = models.FileField(_('Aggregated Data'), null=False,
                            upload_to=settings.DEPLOYMENT_ENV + '/aggregated_data')

    created_on = models.DateTimeField(auto_now_add=True)


class Torrent(models.Model):
    user_data_file = models.FileField(_('File corresponding to torrent file'),
                                      upload_to=settings.DEPLOYMENT_ENV + '/torrent')

    info_hash = models.CharField(_('Torrent info hash'),
                                 max_length=64,
                                 null=True,
                                 blank=True)

    created_on = models.DateTimeField(auto_now_add=True)

    file_uuid = models.CharField(max_length=36,
                                 default=settings.NULL_UUID)


@receiver(post_save, sender=get_user_model())
def on_user_field_updated(sender, instance, created=False, **kwargs):
    from pdp2 import pdp2

    if created:
        return
    updated_fields = kwargs['update_fields']
    if updated_fields is not None and 'last_login' in updated_fields:
        return

    # TODO What happens if there are two subscriptions that are active
    #  e.g. the user is at the end of their first subscription and they have
    #  renewed for a second subscription.
    pdp2_sub = pdp2.get_active_subscription(user=instance)
    if pdp2_sub is not None:
        try:
            submit_user_data = pdp2.SubmitUserData(pdp2_sub=pdp2_sub)
            submit_user_data()
        except:
            # TODO LOG!!
            pass
