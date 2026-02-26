from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import FAQ, FAQCategory
from .serializers import FAQSerializer, FAQCategorySerializer
from services.models import Service


def generate_services_pricing_answer(website):
    """
    Dynamically generate the pricing FAQ answer from the Service model,
    filtered by the given website.
    """
    services = Service.objects.filter(
        enabled=True
    ).filter(
        Q(website=website) | Q(website='both')
    ).order_by('order', 'id')

    if not services.exists():
        return "Pricing information is currently unavailable. Please contact us for details."

    count = services.count()
    lines = [f"We offer {count} flexible package{'s' if count != 1 else ''}:<br/>"]

    for svc in services:
        base = f"\u20ac{svc.base_price:g}"
        per_day = f"\u20ac{svc.per_day_price:g}"
        line = (
            f'\u2705 <strong>{svc.name}:</strong> {base} base price + '
            f'{per_day} per day<br/>'
        )
        lines.append(line)

    lines.append('Secure your spot now: <a href="#book">Book Here</a>')
    return '\n'.join(lines)


DYNAMIC_GENERATORS = {
    'services_pricing': generate_services_pricing_answer,
}


class FAQList(APIView):
    def get(self, request):
        website = request.query_params.get('website', '')
        faqs = FAQ.objects.all()
        serializer = FAQSerializer(faqs, many=True)
        data = serializer.data

        # Build a lookup of dynamic FAQs by pk
        dynamic_faqs = {
            faq.pk: faq for faq in faqs if faq.is_dynamic and faq.dynamic_type
        }

        # Replace answers for dynamic FAQs
        for item in data:
            faq_obj = dynamic_faqs.get(item['id'])
            if faq_obj and faq_obj.dynamic_type in DYNAMIC_GENERATORS:
                generator = DYNAMIC_GENERATORS[faq_obj.dynamic_type]
                item['answer'] = generator(website)

        return Response(data)

class FAQCategoryList(APIView):
    def get(self, request):
        categories = FAQCategory.objects.all()
        serializer = FAQCategorySerializer(categories, many=True)
        return Response(serializer.data)
