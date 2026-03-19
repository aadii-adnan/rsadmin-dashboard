from django.contrib.sitemaps import Sitemap

from .models import BlogPost, Category


class BlogSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return BlogPost.objects.filter(status="publish")

    def lastmod(self, obj):
        return obj.updated_date

    def location(self, obj):
        return f"/blog/{obj.slug}"


class BlogCategorySitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.5

    def items(self):
        return Category.objects.all()

    def location(self, obj):
        return f"/blog?category={obj.slug}"