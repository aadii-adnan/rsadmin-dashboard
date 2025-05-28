from .models import Status
from .serializers import StatusSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse

class StatusListView(APIView):
    def get(self, request):
        status_type = request.query_params.get('type')
        if not status_type:
            statuses =  Status.objects.all()
        else:
            statuses = Status.objects.filter(type=status_type)
        serializer = StatusSerializer(statuses, many=True)
        return Response(serializer.data)


def robots_txt(request):
    content = """User-agent: *
Allow: /
Disallow: /admin-dashboard/
Disallow: /api/auth/
Disallow: /api/payments/

Sitemap: https://rsexpressparking.com/sitemap.xml
"""
    return HttpResponse(content, content_type='text/plain')
