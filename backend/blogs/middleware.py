from django.http import HttpResponsePermanentRedirect, HttpResponseRedirect

from .models import RedirectRule


class SEORedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if response.status_code != 404:
            return response

        rule = (
            RedirectRule.objects.filter(old_path=request.path, is_active=True)
            .only("new_path", "status_code")
            .first()
        )
        if not rule:
            return response

        if rule.status_code == 301:
            return HttpResponsePermanentRedirect(rule.new_path)
        return HttpResponseRedirect(rule.new_path)