from .models import Status
from .serializers import StatusSerializer
from rest_framework.views import APIView
from rest_framework.response import Response

class StatusListView(APIView):
    def get(self, request):
        status_type = request.query_params.get('type')
        if not status_type:
            return Response({'error': 'type param is required'}, status=400)

        statuses = Status.objects.filter(type=status_type)
        serializer = StatusSerializer(statuses, many=True)
        return Response(serializer.data)