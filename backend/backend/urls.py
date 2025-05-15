from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import robots_txt 
from core.sitemaps import StaticReactSitemap, BookingSlugSitemap
from django.contrib.sitemaps.views import sitemap
from payments.views import StripeWebhookView
from django.views.decorators.cache import cache_page
from django.contrib.sitemaps.views import sitemap as sitemap_view

sitemaps = {
    "static": StaticReactSitemap,
    "booking": BookingSlugSitemap,  # if you included slugs
}

urlpatterns = [
    path('admin-dashboard/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/services/', include('services.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/faqs/', include('faq.urls')),
    path('api/contact/', include('contact.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/core/', include('core.urls')),
    path("robots.txt", robots_txt, name="robots_txt"),
    path("sitemap.xml", cache_page(86400)(sitemap_view), {"sitemaps": sitemaps}, name="sitemap"),
    path("", StripeWebhookView.as_view(), name="stripe-webhook"),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
