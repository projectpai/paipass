import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model

from .models import Thread, Message
from .serializers import MessageListSerializer


class ThreadConsumer(WebsocketConsumer):
    def connect(self):
        kwargs = self.scope['url_route']['kwargs']
        if 'thread_id' in kwargs:
            self.thread_id = kwargs['thread_id']
            self.thread_group_name = 'thread_%s' % self.thread_id
            self.thread = Thread.objects.all().get(id=self.thread_id)
        else:
            self.thread_id = ''
            self.thread_group_name = 'thread_%s' % 'chat'
        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.thread_group_name,
            self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.thread_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        s = Session.objects.all().get(pk=self.scope['cookies']['sessionid'])
        user = get_user_model().objects.all().get(pk=s.get_decoded().get('_auth_user_id'))

        msg_obj = Message.objects.create(thread=self.thread,
                                         body=message,
                                         sender=user
                                         )
        msg_obj.save()
        msg_data = MessageListSerializer(msg_obj).data
        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.thread_group_name,
            {
                'type': 'thread_message',
                **msg_data
            }
        )

    # Receive message from room group
    def thread_message(self, event):


        # Send message to WebSocket
        self.send(text_data=json.dumps({
            **event
        }))
