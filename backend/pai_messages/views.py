from dataclasses import dataclass, field

from django.contrib.auth import get_user_model

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .serializers import MessageListSerializer, ThreadSerializer
from .models import ThreadRecipient, Thread, Message
from oauth2.models import (PaipassApplication, )
from attributes.models import Attribute
from attributes import attributes

from django.utils.functional import lazy


def _get_paipass_app():
    return PaipassApplication.objects.all().get(namespace__iexact='paipass')


get_paipass_app = lazy(_get_paipass_app, PaipassApplication)


def _get_paipass_addr_attr():
    return Attribute.objects.all().get(application=get_paipass_app(),
                                       name__iexact='paicoin_address')


get_paipass_addr_attr = lazy(_get_paipass_addr_attr, Attribute)


class MessagePagination(PageNumberPagination):
    page_size = 10
    page_query_param = 'page'
    page_size_query_param = 'perPage'
    max_page_size = 100


class MessageListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = MessageListSerializer
    pagination_class = MessagePagination
    paginate_by = 10

    def get_queryset(self):
        thread = Thread.objects.all().get(id=self.kwargs['thread_id'])
        msgs = Message.objects.all().filter(thread=thread).order_by(self.request.query_params['orderBy'])
        return msgs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data['self'] = attributes.get_user_as_paicoin_addr(request.user)
        return response


class ThreadPagination(PageNumberPagination):
    page_size = 10
    page_query_param = 'page'
    page_size_query_param = 'perPage'
    max_page_size = 100


class ThreadListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ThreadSerializer
    pagination_class = ThreadPagination
    paginate_by = 10

    def get_queryset(self):

        if 'app_client_id' in self.kwargs:
            app = PaipassApplication.objects.all().get(client_id=self.kwargs['app_client_id'])
            mts = Thread.objects.all().filter(
                recipients__in=ThreadRecipient.objects.all().filter(recipient=self.request.user),
                application=app,
            )
        else:
            mts = Thread.objects.all().filter(
                recipients__in=ThreadRecipient.objects.all().filter(recipient=self.request.user),
                application=get_paipass_app())
        return mts


class MessageView(generics.CreateAPIView):

    def post(self, request, thread_id):
        thread = Thread.objects.all().filter(id=thread_id)
        Message.objects.create(thread=thread,
                               body=request['message'])
        return Response({}, status=status.HTTP_200_OK)


@dataclass(eq=True, frozen=True)
class ThreadRecipientInfo:
    user_orm: get_user_model() = None
    representation: str = None


@dataclass
class ThreadInfo:
    application: PaipassApplication = None
    name: str = None
    about: str = None
    recipients: set = field(default_factory=set)
    recipients_set: set = field(default_factory=set)
    owner: get_user_model() = None


def generate_thread_name(thread_info):
    thread_name = ''
    for i, recipient in enumerate(thread_info.recipients):
        thread_name += recipient.representation[-5:]
        if i == len(thread_info.recipients) - 2:
            suffix = ', and'
        elif i == len(thread_info.recipients) - 1:
            suffix = ''
        else:
            suffix = ', '
        thread_name += suffix
    return thread_name


def get_new_thread_info(requesting_user, data):

    thread_info = ThreadInfo()
    thread = data.get('thread', None)

    if thread is None:
        return None
    name = thread.get('name', '')
    # it's (empirically) known that this can return None.
    if name is None:
        name = ''
    thread_info.name = name
    about = thread.get('about', None)
    if about is None:
        about = 'general'
    thread_info.about = about
    recipients = thread.get('recipients', None)
    application = data.get('application', None)

    if application is None:
        return thread_info
    client_id = application.get('client_id', None)
    namespace = application.get('namespace', None)
    if namespace is None:
        application = get_paipass_app()
    else:
        qs = PaipassApplication.objects.all().filter(namespace__iexact=namespace,
                                                     client_id=client_id)
        if qs.count() < 1:
            return thread_info
        application = qs.first()
    thread_info.application = application

    actual_recipients = set()
    for recipient in recipients:
        actual_recipient = attributes.retrieve_user_from_datum(attr=get_paipass_addr_attr(),
                                                               owning_app=get_paipass_app(),
                                                               data=recipient)

        if actual_recipient is not None and actual_recipient not in actual_recipients:
            tri = ThreadRecipientInfo(user_orm=actual_recipient,
                                      representation=recipient)
            thread_info.recipients.add(tri)
            actual_recipients.add(tri.user_orm)

    if requesting_user not in thread_info.recipients:
        ad = attributes.create_or_retrieve_attribute_datum(requesting_user,
                                                           get_paipass_addr_attr(),
                                                           get_paipass_app())
        representation = ad.data
        tri = ThreadRecipientInfo(user_orm=requesting_user,
                                  representation=representation)
        thread_info.recipients.add(tri)
        actual_recipients.add(tri.user_orm)

    thread_info.recipients_set = actual_recipients
    thread_info.owner = requesting_user
    return thread_info


def check_for_existing_thread(thread_info):
    threads = Thread.objects.all().filter(about=thread_info.about,
                                          application=thread_info.application,
                                          name=thread_info.name)
    if threads.count() < 1:
        return None
    for thread in threads:
        match_count = 0
        thread_recips = ThreadRecipient.objects.all().filter(thread=thread)
        if thread_recips.count() != len(thread_info.recipients_set):
            continue
        for thread_recip in thread_recips:
            if thread_recip.recipient in thread_info.recipients_set:
                match_count += 1
        if match_count == len(thread_info.recipients_set):
            return thread
    return None


class ThreadView(generics.GenericAPIView):

    def post(self, request, *args, **kwargs):
        thread_info = get_new_thread_info(request.user, request.data)

        if thread_info.application is None:
            return Response({'detail': f"Can't find registered application with the specified client-id/namespace"})
        if thread_info is None:
            return Response({'detail': 'No thread data found'}, status=status.HTTP_400_BAD_REQUEST)
        # 2 because there should at least be one person in there no matter what (the thread owner)
        if len(thread_info.recipients) < 2:
            return Response({'no recipients found'}, status=status.HTTP_400_BAD_REQUEST)
        if thread_info.owner is None:
            raise Exception(f'Thread owner is somehow None despite the request.user ({request.user}) probably not being'
                            f' None.')

        existing_thread = check_for_existing_thread(thread_info)
        if existing_thread is not None:
            return Response(ThreadSerializer(existing_thread).data, status=status.HTTP_200_OK)

        thread_recipients = []
        for recipient in thread_info.recipients:
            tr = ThreadRecipient.objects.create(recipient=recipient.user_orm,
                                                representation=recipient.representation)
            thread_recipients.append(tr)

        thread = Thread.objects.create(name=thread_info.name,
                                       owner=thread_info.owner,
                                       application=thread_info.application,
                                       about=thread_info.about,
                                       )
        thread.recipients.set(thread_recipients)

        # return Response({'threadId': thread.id, 'threadName': thread.name}, status=status.HTTP_200_OK)
        return Response(ThreadSerializer(thread).data, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        threadId = request.data['threadId']
        t = Thread.objects.all().get(id=threadId)
        msgs = Message.objects.all().filter(thread=t)
        msgs.delete()
        t.delete()
        return Response({}, status=status.HTTP_200_OK)
