# middleware/prerender.py
import re
import requests
from django.http import HttpResponse


class PrerenderMiddleware:
    CRAWLER_USER_AGENTS = [
        'googlebot', 'bingbot', 'yahoo', 'baiduspider', 'facebookexternalhit',
        'twitterbot', 'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
        'showyoubot', 'outbrain', 'pinterest', 'slackbot', 'vkShare', 'W3C_Validator',
        'redditbot', 'Applebot', 'WhatsApp'
    ]

    EXTENSION_IGNORE = re.compile(r".*\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico"
                                   r"|rss|zip|mp3|rar|exe|wmv|doc|avi|ppt|mpg|mpeg|tif|wav|mov"
                                   r"|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent)(\?.*)?$", re.IGNORECASE)

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self.should_show_prerendered_page(request):
            prerender_url = f"https://service.prerender.io/{request.build_absolute_uri()}"
            headers = {
                "X-Prerender-Token": "8CQWgx69j3jbweNRRVmI",  # 👈 Replace with your real token
                "User-Agent": request.META.get("HTTP_USER_AGENT", "")
            }
            try:
                prerendered_response = requests.get(prerender_url, headers=headers, timeout=5)
                return HttpResponse(prerendered_response.content, content_type="text/html")
            except requests.exceptions.RequestException:
                pass  # fallback to normal view if error

        return self.get_response(request)

    def should_show_prerendered_page(self, request):
        user_agent = request.META.get("HTTP_USER_AGENT", "").lower()
        is_bot = any(bot in user_agent for bot in self.CRAWLER_USER_AGENTS)
        is_get = request.method == "GET"
        is_not_static = not self.EXTENSION_IGNORE.match(request.path)

        return is_get and is_bot and is_not_static
