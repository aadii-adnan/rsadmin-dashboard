from django.contrib.sitemaps import Sitemap

from .models import BlogPost, Category


class BlogSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return ['blog'] + list(BlogPost.objects.filter(status="publish"))

    def lastmod(self, obj):
        if obj == 'blog':
            return None
        return obj.updated_date

    def location(self, obj):
        if obj == 'blog':
            return '/blog'
        return f"/{obj.slug}"

class StaticSitemap(Sitemap):
    priority = 1.0
    changefreq = 'weekly'

    def items(self):
        return [
            '',
            'services',
            'contact-us',
            'terms-conditions',
            'privacy-policy',
            'login',
        ]

    def location(self, item):
        return f"/{item}"