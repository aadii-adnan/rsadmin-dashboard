from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from .models import Booking
from django.conf import settings
from core.models import Status
from django.shortcuts import get_object_or_404

@shared_task
def send_completion_email(booking_id):
    booking = Booking.objects.get(id=booking_id)
    status_obj = get_object_or_404(Status, name="Completed", type='booking')
    booking.status = status_obj
    booking.save()

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Thank You for Parking with RS Express Parking!</h2>

        <p>Hi {booking.first_name},</p>

        <p>
        We hope you had a smooth experience with our <strong>Meet & Greet Parking</strong> service.
        </p>

        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.id}</li>
        <li><strong>Drop-Off Date & Time:</strong> {booking.departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {booking.return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        </ul>

        <h3 style="color: #444;">🙏 Thank You!</h3>
        <p>
        Thank you for choosing <strong>RS Express Parking</strong>. We appreciate your trust and hope to see you again soon!
        </p>

        <h3 style="color: #444;">💬 Feedback</h3>
        <p>
        We would love to hear about your experience. If you have any feedback or suggestions, simply reply to this email.
        </p>

        <p>
        Warm regards,<br>
        <strong>The RS Express Parking Team</strong><br>
        <a href="https://rsexpressparking.com/" style="color: #0066cc;">rsexpressparking.com</a> | +353 1 964 0011
        </p>
    </body>
    </html>
    """

    text_body = f"""
Hi {booking.first_name},

We hope you had a smooth experience with our Meet & Greet Parking service.

-----------------------------
🚗 Booking Summary
-----------------------------
Booking ID: {booking.id}
Drop-Off Date & Time: {booking.departure_time}
Pick-Up Date & Time: {booking.return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}

-----------------------------
🙏 Thank You!
-----------------------------
Thank you for choosing RS Express Parking. We appreciate your trust and hope to see you again soon!

-----------------------------
💬 Feedback
-----------------------------
We would love to hear about your experience. If you have any feedback or suggestions, simply reply to this email.

Warm regards,  
The RS Express Parking Team  
https://rsexpressparking.com/ | +353 1 964 0011
"""

    email = EmailMultiAlternatives(
        subject='Thank you for parking with us!',
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[booking.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send()