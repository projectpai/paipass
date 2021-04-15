import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class ThreadRecipient(models.Model):

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="thread_recipient",
        null=False, blank=False, on_delete=models.PROTECT
    )

    representation = models.TextField(_('Recipient Representation'))



class Thread(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)
    name = models.CharField(_("Thread Name"), max_length=140)

    recipients = models.ManyToManyField(ThreadRecipient)

    created_on = models.DateTimeField(_('Created On'), auto_now_add=True)
    # sort of a uuid for the thread.
    # Suppose we have an art gallery where each piece of art owned by Alice has a modal where some user Bob can click
    # a button to send a message to the owner of a piece of art Mona. Also suppose that Bob has already sent a
    # message before about Mona; we don't want Bob to create a new thread with Alice every time he clicks that Button.
    # In this case we use the deriving application to set this field to something unique like the Paicoin Address
    # of the Art Work.
    # TODO We probably want make sure that when we do the lookup on the about that the about and the recipients
    #  are unique.
    about = models.CharField(_('Thread About'), max_length=140, null=True, blank=True)

    # we want to define the deriving application so that when they are on the deriving application's site,
    # they can filter pai messages for messages that pertain to their site
    application = models.ForeignKey('oauth2.PaipassApplication',
                                    on_delete=models.PROTECT,
                                    null=True,
                                    blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="thread_owner",
        null=False, blank=False, on_delete=models.PROTECT
    )

    def get_name(self):
        if len(self.name) < 1:
            trs = list(ThreadRecipient.objects.all().filter(thread=self))
            # serial comma
            return ', '.join(trs[:-2]) + ', and '.join(trs[-2:])
        return self.name


class Message(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    thread = models.ForeignKey('pai_messages.Thread', null=False, blank=False, on_delete=models.PROTECT)

    body = models.TextField(_("Body"))

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_messages', verbose_name=_("Sender"),
                               on_delete=models.PROTECT)

    sent_at = models.DateTimeField(_("sent at"), auto_now_add=True)

    replied_to = models.ForeignKey("self",
                                   null=True,
                                   blank=True,
                                   on_delete=models.SET_NULL)

    deleted_at = models.DateTimeField(_("Sender deleted at"), null=True, blank=True)
