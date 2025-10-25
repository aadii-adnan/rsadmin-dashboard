from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import ContactMessage
from .serializers import ContactMessageSerializer
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from core.models import BookingSettings
from decouple import config

class ContactMessageCreate(APIView):
    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            contact = serializer.save()

            # --- Send Email to Admin ---
            subject = f"New Contact Form Submission from {contact.first_name} {contact.last_name}"
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <h2 style="color: #0066cc;">New Contact Form Submission</h2>
                <ul>
                    <li><strong>Name:</strong> {contact.first_name} {contact.last_name}</li>
                    <li><strong>Email:</strong> {contact.email}</li>
                    <li><strong>Phone:</strong> {contact.phone if hasattr(contact, 'phone') else ''}</li>
                    <li><strong>Website:</strong> {getattr(contact, 'website', 'rsexpressparking')}</li>
                </ul>
                <p>
                    <strong>Message:</strong><br>
                    {contact.message}
                </p>
            </body>
            </html>
            """
            text_body = f"""
New Contact Form Submission

Name: {contact.first_name} {contact.last_name}
Email: {contact.email}
Phone: {getattr(contact, 'phone', '')}
Website: {getattr(contact, 'website', 'rsexpressparking')}

Message:
{contact.message}
"""

            settings = BookingSettings.objects.first()
            website = getattr(contact, 'website', 'rsexpressparking')
            manager_emails = settings.get_manager_email_list(website) if settings else ["rsexpressparking@gmail.com"]

            if website.lower() == "dublinairportparking":
                from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
                connection = get_connection(
                    host=config('EMAIL_HOST'),
                    port=config('EMAIL_PORT', cast=int),
                    username="support@dublinairportexpressparking.ie",
                    password=config('DUBLIN_EMAIL_HOST_PASSWORD'),
                    use_tls=config('EMAIL_USE_TLS', cast=bool)
                )
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_body,
                    from_email=from_email,
                    to=manager_emails,
                    connection=connection
                )
            else:
                from_email = "RS Express Parking <support@rsexpressparking.com>"
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_body,
                    from_email=from_email,
                    to=manager_emails,
                )
            
            email.attach_alternative(html_body, "text/html")
            email.send()

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
