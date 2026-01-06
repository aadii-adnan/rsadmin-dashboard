from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import robots_txt 
from core.sitemaps import StaticReactSitemap, BookingSlugSitemap, BlogSitemap
from django.contrib.sitemaps.views import sitemap
from payments.views import StripeWebhookView
from django.views.decorators.cache import cache_page
from django.contrib.sitemaps.views import sitemap as sitemap_view
from django.contrib.sitemaps import views as sitemap_views
from django.urls import reverse_lazy
from finance.views import finance_jwt_login
from django.contrib.auth import views as auth_views
from django.http import HttpResponse

# Blog sitemap (RS Express Parking only)
blog_sitemaps = {
    "blog": BlogSitemap,
}

def dynamic_sitemap(request):
    """Serve sitemap with static URLs + sitemap index reference to blog sitemap for RS Express Parking"""
    host = request.get_host()
    protocol = 'https'
    
    # Get static sitemap items
    static_sitemap = StaticReactSitemap()
    
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
    xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    
    # Add static URLs
    for item in static_sitemap.items():
        loc = static_sitemap.location(item)
        xml += f'  <url>\n'
        xml += f'    <loc>{protocol}://{host}{loc}</loc>\n'
        xml += f'    <changefreq>{static_sitemap.changefreq}</changefreq>\n'
        xml += f'    <priority>{static_sitemap.priority}</priority>\n'
        xml += f'  </url>\n'
    
    # Add blog sitemap as a URL entry for RS Express Parking only
    if "dublinairport" not in host:
        xml += f'  <url>\n'
        xml += f'    <loc>{protocol}://{host}/blogs.xml</loc>\n'
        xml += f'    <changefreq>weekly</changefreq>\n'
        xml += f'    <priority>0.8</priority>\n'
        xml += f'  </url>\n'
    
    xml += '</urlset>'
    
    return HttpResponse(xml, content_type='application/xml')

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
    
    # Main sitemap with static URLs
    path("sitemap.xml", cache_page(86400)(dynamic_sitemap), name="sitemap"),
    
    # Blog sitemap (separate file)
    path("blogs.xml", cache_page(86400)(sitemap_view), {"sitemaps": blog_sitemaps}, name="sitemap_blogs"),
    
    path("api/finance/jwt-login/", finance_jwt_login, name="finance-jwt-login"),
    path('admin/admin-forgot-password/', auth_views.PasswordResetView.as_view(), name='admin_password_reset'),
    path('admin/admin-forgot-password/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('admin/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('admin/reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)