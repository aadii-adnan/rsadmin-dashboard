from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Service, AddOn
from .serializers import ServiceSerializer, AddOnSerializer

class ServiceList(APIView):
    def get(self, request):
        services = Service.objects.all()
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

class ServiceDetail(APIView):
    def get(self, request, slug):
        service = get_object_or_404(Service, slug=slug)
        serializer = ServiceSerializer(service)
        return Response(serializer.data)


class AddOnList(APIView):
    def get(self, request):
        addons = AddOn.objects.all()
        serializer = AddOnSerializer(addons, many=True)
        return Response(serializer.data)
