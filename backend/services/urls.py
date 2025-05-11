from django.urls import path
from .views import ServiceList, ServiceDetail, AddOnList, UserLatestCouponView, CheckCouponValidityView

urlpatterns = [
    path('', ServiceList.as_view(), name='service-list'),
    path('addons/', AddOnList.as_view(), name='addon-list'),
    path('coupons/latest/', UserLatestCouponView.as_view(), name='my-latest-coupon'),
    path('<slug:slug>/', ServiceDetail.as_view(), name='service-detail'),
    path('coupons/validate/', CheckCouponValidityView.as_view(), name='check-coupon-validity'),
]
