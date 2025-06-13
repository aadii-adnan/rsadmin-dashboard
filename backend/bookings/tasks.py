from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from .models import Booking
from django.conf import settings
from core.models import Status
from django.shortcuts import get_object_or_404
from django.utils import timezone

@shared_task
def send_completion_email(booking_id):
    booking = Booking.objects.get(id=booking_id)
    status_obj = get_object_or_404(Status, name="Completed", type='booking')
    booking.status = status_obj
    booking.save()

    if booking.completion_email_sent:
        return "Email already sent"

    departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
    return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Thank You for Parking with RS Express Parking!</h2>

        <p>Hi {booking.first_name},</p>

        <p>
        We hope you had a smooth experience with our <strong>{booking.service.name}</strong> service.
        </p>

        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>Drop-Off Date & Time:</strong> {departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        </ul>

        <h3 style="color: #444;">🎁 Your Coupon</h3>
        <p>
            As a thank you, here’s a coupon for <strong>15% off</strong> your next booking:<br>
            <span style="font-size: 18px; font-weight: bold; color: #0066cc;">{booking.discount_coupon_awarded}</span>
        </p>

        <h3 style="color: #444;">🙏 Thank You!</h3>
        <p>
        Thank you for choosing <strong>RS Express Parking</strong>. We appreciate your trust and hope to see you again soon!
        </p>

        <h3 style="color: #444;">💬 Feedback</h3>
        <p>
            We would love to hear about your experience. If you have a moment, please consider leaving us a review on Google Maps:<br>
            <a href="https://g.page/r/CZW2D3u4VHTOEAI/review" target="_blank" style="color:#0066cc;">Leave a Google Review</a>
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
Booking ID: {booking.booking_id}
Drop-Off Date & Time: {departure_time}
Pick-Up Date & Time: {return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}

-----------------------------
🎁 Your Coupon
-----------------------------
As a thank you, here’s a coupon for 15% off your next booking:
{booking.discount_coupon_awarded}

-----------------------------
🙏 Thank You!
-----------------------------
Thank you for choosing RS Express Parking. We appreciate your trust and hope to see you again soon!

-----------------------------
💬 Feedback
-----------------------------
We would love to hear about your experience. If you have a moment, please consider leaving us a review on Google Maps:
https://g.page/r/CZW2D3u4VHTOEAI/review

Warm regards,  
The RS Express Parking Team  
https://rsexpressparking.com/ | +353 1 964 0011
"""

    email = EmailMultiAlternatives(
        subject='Thank you for parking with us!',
        body=text_body,
        from_email='RS Express Parking <support@rsexpressparking.com>',
        to=[booking.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send()

@shared_task
def set_booking_started_status(booking_id):
    booking = get_object_or_404(Booking, id=booking_id)
    started_status = get_object_or_404(Status, name="Started", type='booking')
    booking.status = started_status
    booking.save()