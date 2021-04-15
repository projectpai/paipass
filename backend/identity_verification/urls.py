from django.urls import include, path
from .views import (GovIdVerificationNameSetupView,
                    GovIdVerificationVideoView,)

urlpatterns = [
    # Authentication
    path('',
         GovIdVerificationNameSetupView.as_view(),
         name='givs_name_setup_view'),

    path('<uuid:pk>/finalize/',
         GovIdVerificationVideoView.as_view(),
         name='givs_video_verif_view'),
]
