# local
from pdp2.models import (Pdp2ProfileSubscription, )


class NotImplementedError(Exception):
    ''' Dummy class to signify that things haven't been implemented yet.'''
    pass


class NoSubscriptionFoundError(Exception):
    ''' 
    No subscription was found to either aws or pdp2; something is seriously
    wrong.
    '''
    pass


def is_pdp2_subscription(user):
    raise NotImplementedError()


def is_aws_subscription(user):
    raise NotImplementedError()


def get_aws_subscription(user, features):
    raise NotImplementedError()


def get_pdp2_subscription(user, features=None):
    if features is None:
        features = {}

    # we want a queryset of subscriptions that have an active status
    # (I'm leaving the possibility of multiple paid subscriptions to take 
    # into account overlaps and promotions.)

    subs = Pdp2ProfileSubscription.objects.filter(user=user, **features)
    for sub in subs:
        if sub.status == Pdp2ProfileSubscription.STATUS_ACTIVATED:
            return sub

    return None


def get_active_subscription(user, features=None):
    subscription = get_pdp2_subscription(user, features)
    if subscription:
        return subscription
    subscription = get_aws_subscription(user, features)
    if subscription:
        return subscription
    return None
