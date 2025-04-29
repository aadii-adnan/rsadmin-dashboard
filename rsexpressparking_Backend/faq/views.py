from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import FAQ, FAQCategory
from .serializers import FAQSerializer, FAQCategorySerializer

class FAQList(APIView):
    def get(self, request):
        faqs = FAQ.objects.all()
        serializer = FAQSerializer(faqs, many=True)
        return Response(serializer.data)

class FAQCategoryList(APIView):
    def get(self, request):
        categories = FAQCategory.objects.all()
        serializer = FAQCategorySerializer(categories, many=True)
        return Response(serializer.data)
