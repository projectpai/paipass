from django.contrib import admin
from django.urls import path, include

from .views import (AttributeViewDetail, AttributesListView, UserAttributeDataView)
urlpatterns = [
    path(r'user/namespaces/',
         AttributesListView.as_view()),

    path(r'user/data/<uuid:pk>/',
         UserAttributeDataView.as_view()),

    path(r'user/attributes/<str:namespace>/<str:key_name>/<uuid:pk>/',
         UserAttributeDataView.as_view()),

    path(r'<str:namespace>/<str:key_name>/',
         AttributeViewDetail.as_view()),

    path(r'<str:namespace>/<str:key_name>/<uuid:pk>/',
         AttributeViewDetail.as_view()),


]
