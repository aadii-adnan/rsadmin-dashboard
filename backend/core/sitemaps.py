# core/sitemaps.py
from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from services.models import Service

class StaticReactSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return [
            "home",
            "services",
            "contact-us",
            "terms-conditions",
            "privacy-policy",
        ]

    def location(self, item):
        route_map = {
            "home": "/",
            "services": "/services",
            "contact-us": "/contact-us",
            "terms-conditions": "/terms-conditions",
            "privacy-policy": "/privacy-policy",
        }
        return route_map[item]

class BookingSlugSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.9

    def items(self):
        return Service.objects.all()

    def location(self, obj):
        return f"/book/{obj.slug}"