from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Service, AddOn, Coupon
from .serializers import ServiceSerializer, AddOnSerializer, CouponSerializer
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

class ServiceList(APIView):
    def get(self, request):
        services = Service.objects.all().order_by('base_price')
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

class UserLatestCouponView(APIView):

    def get(self, request):

        now = timezone.now()
        latest_coupon = Coupon.objects.filter(
            active=True,
            valid_from__lte=now,
            valid_to__gte=now
        ).order_by('-valid_from').first()

        if not latest_coupon:
            return Response({'message': 'No active coupon available'}, status=404)

        serializer = CouponSerializer(latest_coupon)
        return Response(serializer.data)
class CheckCouponValidityView(APIView):

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Coupon code is required'}, status=400)

        now = timezone.now()
        coupon = Coupon.objects.filter(
            code=code,
            active=True,
            valid_from__lte=now,
            valid_to__gte=now
        ).first()

        if not coupon or coupon.times_used >= coupon.max_uses:
            return Response({'error': 'Invalid, expired, or fully used coupon'}, status=404)

        serializer = CouponSerializer(coupon)
        return Response(serializer.data, status=200)