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
from django.urls import reverse_lazy
from finance.views import finance_jwt_login
from django.contrib.auth import views as auth_views

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
    path("api/finance/jwt-login/", finance_jwt_login, name="finance-jwt-login"),
    path('admin/admin-forgot-password/', auth_views.PasswordResetView.as_view(), name='admin_password_reset'),
    path('admin/admin-forgot-password/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('admin/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('admin/reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),

]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
