from django.urls import path
from .views import ServiceList, ServiceDetail, AddOnList, UserLatestCouponView

urlpatterns = [
    path('', ServiceList.as_view(), name='service-list'),
    path('<slug:slug>/', ServiceDetail.as_view(), name='service-detail'),
    path('addons/', AddOnList.as_view(), name='addon-list'),
    path('my-latest-coupon/', UserLatestCouponView.as_view(), name='my-latest-coupon'),
]
