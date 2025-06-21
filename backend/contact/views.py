from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import ContactMessage
from .serializers import ContactMessageSerializer
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

class ContactMessageCreate(APIView):
    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            contact = serializer.save()

            # --- Send Email to Admin ---
            subject = f"New Contact Form Submission from {contact.name}"
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <h2 style="color: #0066cc;">New Contact Form Submission</h2>
                <ul>
                    <li><strong>Name:</strong> {contact.name}</li>
                    <li><strong>Email:</strong> {contact.email}</li>
                    <li><strong>Phone:</strong> {contact.phone if hasattr(contact, 'phone') else ''}</li>
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

Name: {contact.name}
Email: {contact.email}
Phone: {getattr(contact, 'phone', '')}

Message:
{contact.message}
"""

            email = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email='RS Express Parking <support@rsexpressparking.com>',
                to=["rsexpressparking@gmail.com"],
            )
            email.attach_alternative(html_body, "text/html")
            email.send()

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
