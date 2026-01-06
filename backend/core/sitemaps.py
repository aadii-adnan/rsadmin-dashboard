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
            "login",
        ]

    def location(self, item):
        route_map = {
            "home": "/",
            "services": "/services",
            "contact-us": "/contact-us",
            "terms-conditions": "/terms-conditions",
            "privacy-policy": "/privacy-policy",
            "login": "/login",
        }
        return route_map[item]

class BookingSlugSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.9

    def items(self):
        return Service.objects.all()

    def location(self, obj):
        return f"/book/{obj.slug}"


class BlogSitemap(Sitemap):
    """Blog sitemap - only for RS Express Parking website"""
    changefreq = "monthly"
    priority = 0.7

    def items(self):
        # Static list of blog post slugs
        return [
            "/blog/",
            "/the-ultimate-guide-to-affordable-dublin-airport-parking/",
            "/dublin-airport-parking-costs-save-more-on-your-trip/",
            "/dublin-airport-parking-prices-whats-the-cheapest-option/",
            "/long-term-vs-short-term-parking-costs-whats-more-affordable/",
            "/hidden-fees-in-dublin-airport-parking-what-to-watch-out-for/",
            "/how-to-cut-your-airport-parking-cost-by-50-or-more/",
            "/cost-breakdown-on-site-vs-off-site-dublin-airport-parking/",
            "/is-free-parking-near-dublin-airport-possible-myths-vs-reality/",
            "/dublin-airport-parking-discounts-where-to-find-the-best-deals/",
            "/hourly-vs-daily-parking-rates-at-dublin-airport-which-is-better/",
            "/how-airport-parking-costs-change-during-peak-seasons/",
            "/easter-travel-dublin-airport-parking-avoid-high-prices/",
            "/how-parking-costs-increase-during-festivals-events-in-dublin/",
            "/dublin-airport-parking-on-bank-holidays-are-prices-higher/",
            "/dublin-airport-parking-vs-uber-which-is-more-budget-friendly/",
            "/airport-parking-vs-public-transport-whats-the-cheapest-way/",
            "/how-much-does-it-cost-to-park-at-dublin-airport-for-a-week/",
            "/monthly-airport-parking-in-dublin-is-it-worth-the-cost/",
            "/pre-booking-vs-on-the-spot-parking-which-saves-more-money/",
            "/dublin-airport-parking-payment-options-cash-card-or-online/",
            "/refundable-vs-non-refundable-parking-which-option-saves-more/",
            "/corporate-airport-parking-cost-effective-solutions-for-businesses/",
            "/frequent-flyers-how-to-save-on-dublin-airport-parking-year-round/",
            "/airport-parking-loyalty-programs-are-they-worth-it/",
            "/short-term-vs-long-term-parking-whats-right-for-you/",
            "/short-term-vs-long-term-parking-key-differences-explained/",
            "/which-parking-type-saves-more-money-for-frequent-flyers/",
            "/dublin-airport-parking-duration-guide-how-long-is-too-long/",
            "/how-airport-parking-costs-increase-over-time-daily-vs-weekly-rates/",
            "/short-vs-long-term-parking-which-offers-better-security/",
            "/how-to-decide-between-short-term-and-long-term-airport-parking/",
            "/airport-parking-vs-leaving-your-car-at-home-which-is-safer/",
            "/long-term-vs-short-term-parking-which-is-more-cost-effective/",
            "/cheapest-long-term-parking-near-dublin-airport-where-to-find-it/",
            "/hourly-daily-weekly-parking-costs-whats-the-best-deal/",
            "/hidden-costs-of-long-term-airport-parking-what-you-need-to-know/",
            "/how-to-save-on-short-term-parking-at-dublin-airport/",
            "/why-long-term-parking-costs-rise-during-holidays-peak-season/",
            "/best-short-term-parking-options-for-christmas-new-year-travel/",
            "/dublin-airport-events-sports-matches-where-to-park-short-term/",
            "/concert-festival-goers-is-short-term-parking-worth-it/",
            "/is-long-term-parking-safe/",
            "/best-short-term-parking-near-dublin-airport/",
            "/how-secure-is-long-term-parking/",
            "/valet-vs-regular-parking/",
            "/why-off-site-long-term-parking-is-safer-than-on-site-parking/",
            "/is-dublin-airport-parking-safe/",
            "/avoid-dublin-airport-parking-scams/",
            "/summer-airport-parking-tips/",
            "/last-minute-airport-parking-risks/",
            "/closest-parking-to-departure-terminal-ireland/",
            "/car-security-in-airport-parking-ireland/",
            "/self-parking-vs-valet-parking-online-bookings/",
            "/short-term-vs-long-term-parking-business-travel/",
            "/short-term-vs-long-term-parking-for-families/",
            "/pre-booking-vs-walk-in-long-term-parking-dublin-airport/",
            "/best-time-to-book-dublin-airport-parking/",
            "/extend-short-term-parking-to-long-term-dublin-airport/",
            "/dublin-airport-parking-scam-signs/",
            "/dublin-airport-parking-24-7-security/",
            "/trusted-airport-parking-providers-dublin/",
            "/cheap-parking-near-dublin-airport-safety-risks/",
            "/luxury-car-parking-near-dublin-airport/",
            "/dublin-airport-parking-most-secure-locations/",
            "/vip-premium-airport-parking-worth-it/",
            "/holiday-travel-parking-car-security/",
            "/parking-safety-peak-travel-seasons/",
            "/secure-car-airport-parking-winter/"
        ]

    def location(self, slug):
        return f"{slug}"