from django.urls import path
from .views import ContactMessageCreate
from .staff_views import StaffContactMessagesView

urlpatterns = [
    path('', ContactMessageCreate.as_view(), name='contact-message-create'),
    path('staff/', StaffContactMessagesView.as_view(), name='staff-contact-messages'),
]
