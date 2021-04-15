from django.contrib import admin
from django.urls import path, include
from yggdrasil.ygg import YggUrls

from .views import (SchemaView, SchemasView, DataView, DataBundleView,
                    DatasetView, DatasetsView, UploadProgressListView)
urlpatterns = [
    path(r'schema/', SchemaView.as_view()),
    path(r'schema/<str:schema_id>/', SchemaView.as_view()),
    path(r'schemas/', SchemasView.as_view()),
    path(r'dataset/', DatasetView.as_view()),
    path(r'dataset/<str:dataset_id>/', DatasetView.as_view()),
    path(YggUrls.DATA_URL.split('yggdrasil/')[1] + '<str:data_id>/', DataView.as_view()),
    path(r'datasets/', DatasetsView.as_view()),
    path(r'data-bundle/', DataBundleView.as_view()),
    path(r'upload-progress/<str:dataset_id>/', UploadProgressListView.as_view())
]
