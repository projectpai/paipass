from django.contrib import admin
from django.urls import path, include

from .views import (DiscourseSsoView,DiscourseSsoDetailView)
urlpatterns = [
    path(r'discourse/authorize', DiscourseSsoView.as_view()),
    path(r'discourse/authorize/details/', DiscourseSsoDetailView.as_view()),


]
