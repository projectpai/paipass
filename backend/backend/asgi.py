import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.sessions import SessionMiddlewareStack

# this has to go before anything else otherwise it will crash; for reference:
# stackoverflow.com/questions/53683806/
asgi_app = get_asgi_application()

import pai_messages.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
application = ProtocolTypeRouter({
    "http": asgi_app,
    "websocket": SessionMiddlewareStack(
        URLRouter(
            pai_messages.routing.websocket_urlpatterns
        )
    ),
})
