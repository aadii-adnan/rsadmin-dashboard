from django.urls import path
from .views import FAQList, FAQCategoryList

urlpatterns = [
    path('', FAQList.as_view(), name='faq-list'),
    path('categories/', FAQCategoryList.as_view(), name='faq-category-list'),
]
