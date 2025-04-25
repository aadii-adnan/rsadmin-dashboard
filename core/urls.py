from .views import StatusListView
from django.urls import path

urlpatterns = [
    path('statuses/', StatusListView.as_view(), name='status-list'),
]
