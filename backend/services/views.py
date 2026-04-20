from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Service, AddOn, Coupon
from .serializers import ServiceSerializer, AddOnSerializer, CouponSerializer
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated


def exclude_ev_charging_services(queryset):
    return queryset.exclude(
        Q(name__icontains='ev charging') |
        Q(slug__icontains='ev-charging') |
        Q(name__icontains='electric vehicle') |
        Q(description__icontains='ev charging') |
        Q(long_description__icontains='ev charging')
    )

class ServiceList(APIView):
    def get(self, request):
        services = exclude_ev_charging_services(Service.objects.all()).order_by('order', 'id')
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

class ServiceDetail(APIView):
    def get(self, request, slug):
        service = get_object_or_404(exclude_ev_charging_services(Service.objects.all()), slug=slug)
        serializer = ServiceSerializer(service)
        return Response(serializer.data)


class AddOnList(APIView):
    def get(self, request):
        addons = AddOn.objects.filter(active=True).order_by('id')
        serializer = AddOnSerializer(addons, many=True)
        return Response(serializer.data)

class UserLatestCouponView(APIView):

    def get(self, request):

        now = timezone.now()
        # Get active coupons whose start date has passed
        candidates = Coupon.objects.filter(
            active=True,
            valid_from__lte=now
        ).order_by('-valid_from')

        latest_coupon = None
        for c in candidates:
            if c.is_valid():
                latest_coupon = c
                break

        if not latest_coupon:
            return Response({'message': 'No active coupon available'}, status=404)

        serializer = CouponSerializer(latest_coupon)
        return Response(serializer.data)
class CheckCouponValidityView(APIView):

    def post(self, request):
        code = request.data.get('code')
        total_price = request.data.get('total_price')
        if not code:
            return Response({'error': 'Coupon code is required'}, status=400)

        now = timezone.now()
        coupon = Coupon.objects.filter(
            code=code,
            active=True,
            valid_from__lte=now
        ).first()

        if not coupon or not coupon.is_valid():
            return Response({'error': 'Invalid or expired coupon'}, status=404)

        if coupon.times_used >= coupon.max_uses:
            return Response({'error': 'Coupon has been fully used'}, status=404)

        # Check minimum order value if total_price is provided
        if total_price is not None and coupon.minimum_order_value > 0:
            try:
                total = float(total_price)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid total price'}, status=400)
            if total < float(coupon.minimum_order_value):
                return Response({
                    'error': f'This coupon requires a minimum order of \u20ac{coupon.minimum_order_value:g}. Your current total is \u20ac{total:.2f}.'
                }, status=400)

        serializer = CouponSerializer(coupon)
        return Response(serializer.data, status=200)