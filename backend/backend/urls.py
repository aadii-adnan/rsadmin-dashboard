from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import robots_txt 
from core.sitemaps import StaticReactSitemap, BookingSlugSitemap, BlogSitemap as CoreBlogSitemap
from django.contrib.sitemaps.views import sitemap, index
from blogs.sitemaps import BlogSitemap, StaticSitemap
from payments.views import StripeWebhookView
from django.views.decorators.cache import cache_page
from django.urls import reverse_lazy
from finance.views import finance_jwt_login
from blogs.views import blogs_jwt_login
from bookings.views import SupplierBookingCreateView
from django.contrib.auth import views as auth_views
from django.http import HttpResponse, Http404
from django.urls import re_path
from django.views.decorators.cache import cache_control
from django.views.static import serve as static_serve
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Blog sitemap (RS Express Parking only)
blog_sitemaps = {
    "blog": CoreBlogSitemap,
}

def custom_sitemap_index(request, sitemaps, **kwargs):
    host = request.get_host()
    active_sitemaps = sitemaps.copy()
    
    # Exclude blogs for non-RS Express domains
    if "dublinairport" in host:
        active_sitemaps.pop('blogs', None)
        
    return index(request, sitemaps=active_sitemaps, **kwargs)

def custom_sitemap_section(request, sitemaps, section, **kwargs):
    host = request.get_host()
    active_sitemaps = sitemaps.copy()
    
    # Exclude blogs for non-RS Express domains
    if "dublinairport" in host:
        active_sitemaps.pop('blogs', None)
        
    if section not in active_sitemaps:
        raise Http404("No sitemap available for section: %s" % section)
        
    return sitemap(request, sitemaps=active_sitemaps, section=section, **kwargs)

sitemaps = {
    'static': StaticSitemap,
    'blogs': BlogSitemap,
}

urlpatterns = [
    path('admin-dashboard/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/services/', include('services.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/blogs/', include('blogs.urls')),
    path('api/faqs/', include('faq.urls')),
    path('api/contact/', include('contact.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/core/', include('core.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("robots.txt", robots_txt, name="robots_txt"),
    
    path('sitemap.xml', custom_sitemap_index, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.index'),
    path('sitemap-<section>.xml', custom_sitemap_section, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    
    # Blog sitemap (separate file for RS Express)
    path("blogs.xml", cache_page(86400)(sitemap), {"sitemaps": blog_sitemaps}, name="sitemap_blogs"),
    
    path('api/supplier/bookings/', SupplierBookingCreateView.as_view(), name='supplier-booking-create'),
    path("api/finance/jwt-login/", finance_jwt_login, name="finance-jwt-login"),
    path("api/blogs/jwt-login/", blogs_jwt_login, name="blogs-jwt-login"),
    path('admin/admin-forgot-password/', auth_views.PasswordResetView.as_view(), name='admin_password_reset'),
    path('admin/admin-forgot-password/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('admin/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('admin/reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # In development, serve media with explicit cache headers.
    # In production, media must be served by the web server/CDN with long-lived caching.
    cached_media_serve = cache_control(public=True, max_age=60 * 60 * 24)(static_serve)
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", cached_media_serve, {"document_root": settings.MEDIA_ROOT}),
    ]
