"""backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from oauth2.auth_redux_views import AuthorizationView
from oauth2.views import ApplicationsDetailView
from pdp2.views import TransactionsThatHaveJsonData, JsonDataGet

urlpatterns = [
    path(r'health_check/', include('health_check.urls')),
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
    path('api/v1/account/govid-verification/',
         include('identity_verification.urls')),
    path('api/v1/pdp2/', include('pdp2.urls')),
    path("oauth/applications/", include('oauth2.urls')),
    # Not sticking with the api/v1 prefix to retain the functionality of the
    # og java implementation.
    path('oauth/authorize', AuthorizationView.as_view(), name='authorize'),
    path('oauth/authorize/details/', ApplicationsDetailView.as_view()),
    path('oauth/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('attributes/', include('attributes.urls')),
    path('sso/', include('sso.urls')),
    path('api/v1/yggdrasil/', include('yggdrasil.urls')),
    path('datasharingtransaction/<str:txn_id>/', JsonDataGet.as_view()),
    path('datasharingtransactions', TransactionsThatHaveJsonData.as_view()),
    path('pai-messages/', include('pai_messages.urls')),
]

