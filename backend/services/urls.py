from django.urls import path
from .views import ServiceList, ServiceDetail, AddOnList, UserLatestCouponView, CheckCouponValidityView
from .staff_views import StaffAddOnDetailView, StaffAddOnsView, StaffCouponDetailView, StaffCouponsView, StaffServiceDetailView, StaffServicesView

urlpatterns = [
    path('', ServiceList.as_view(), name='service-list'),
    path('addons/', AddOnList.as_view(), name='addon-list'),
    path('coupons/latest/', UserLatestCouponView.as_view(), name='my-latest-coupon'),
    path('<slug:slug>/', ServiceDetail.as_view(), name='service-detail'),
    path('coupons/validate/', CheckCouponValidityView.as_view(), name='check-coupon-validity'),
    path('staff/services/', StaffServicesView.as_view(), name='staff-services'),
    path('staff/services/<int:object_id>/', StaffServiceDetailView.as_view(), name='staff-service-detail'),
    path('staff/addons/', StaffAddOnsView.as_view(), name='staff-addons'),
    path('staff/addons/<int:object_id>/', StaffAddOnDetailView.as_view(), name='staff-addon-detail'),
    path('staff/coupons/', StaffCouponsView.as_view(), name='staff-coupons'),
    path('staff/coupons/<int:object_id>/', StaffCouponDetailView.as_view(), name='staff-coupon-detail'),
]
