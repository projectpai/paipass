from django.urls import path, include
from . import views

urlpatterns = [
    path(r'messages/<str:thread_id>/', views.MessageListView.as_view()),
    path(r'threads/', views.ThreadListView.as_view()),
    path(r'threads/<str:app_client_id>/', views.ThreadListView.as_view()),

    path(r'thread/', views.ThreadView.as_view()),

]
