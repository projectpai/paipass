from django.urls import path, include
from .views import (ApplicationRegistration, ApplicationsListView,
                    ApplicationsDetailView,)
from attributes.views import (CreateAttributeView,)
urlpatterns = [
    path('register/', ApplicationRegistration.as_view()),
    path('authorized-apps/', ApplicationsListView.as_view()),
    path(r'<uuid:pk>/attributes/<str:key_name>/',
         CreateAttributeView.as_view()),

]
