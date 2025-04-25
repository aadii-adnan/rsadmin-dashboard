from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('api/auth/', include('users.urls')),
    path('api/services/', include('services.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/faqs/', include('faq.urls')),
    path('api/contact/', include('contact.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/core/', include('core.urls')),
]
