from django.urls import path
from .views import FAQList, FAQCategoryList
from .staff_views import StaffFAQDetailView, StaffFAQsView

urlpatterns = [
    path('', FAQList.as_view(), name='faq-list'),
    path('categories/', FAQCategoryList.as_view(), name='faq-category-list'),
    path('staff/', StaffFAQsView.as_view(), name='staff-faqs'),
    path('staff/<int:faq_id>/', StaffFAQDetailView.as_view(), name='staff-faq-detail'),
]
