from django.urls import path
from .views import ContactMessageCreate
from .staff_views import StaffContactMessageDetailView, StaffContactMessagesView

urlpatterns = [
    path('', ContactMessageCreate.as_view(), name='contact-message-create'),
    path('staff/', StaffContactMessagesView.as_view(), name='staff-contact-messages'),
    path('staff/<int:pk>/', StaffContactMessageDetailView.as_view(), name='staff-contact-message-detail'),
]
