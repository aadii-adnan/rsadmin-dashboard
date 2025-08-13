from celery import shared_task
from django.core.mail import EmailMultiAlternatives, get_connection
from .models import Booking
from core.models import Status
from django.utils import timezone
from datetime import timedelta, datetime
from decouple import config

@shared_task
def process_bookings_for_completion():
    """
    Periodic task: Find bookings where return_time + 15min has passed,
    status is not 'Completed', and completion_email_sent is False.
    Mark as completed and send thank you email.
    """
    now = timezone.now()
    threshold = now - timedelta(minutes=10)
    completed_status = Status.objects.get(name="Completed", type='booking')
    started_status = Status.objects.get(name="Started", type='booking')

    # Only process bookings that are not completed and haven't had the email sent
    bookings = Booking.objects.filter(
        return_time__lte=threshold,
        completion_email_sent=False,
        status=started_status
    )

    for booking in bookings:
        booking.status = completed_status
        booking.save()
        send_completion_email_to_user(booking.id)

@shared_task
def process_bookings_for_started():
    """
    Periodic task: Find bookings where departure_time has passed,
    status is not 'Started', and current time is less than return_time.
    Set status to 'Started'.
    """
    now = timezone.now()
    started_status = Status.objects.get(name="Started", type='booking')
    confirmed_status = Status.objects.get(name="Confirmed", type='booking')

    bookings = Booking.objects.filter(
        departure_time__lte=now, return_time__gt=now,
        status=confirmed_status
    )

    for booking in bookings:
        booking.status = started_status
        booking.save()

@shared_task
def send_completion_email_to_user(booking_id):
    booking = Booking.objects.get(id=booking_id)
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
    booking.completion_email_sent = True
    booking.save(update_fields=['completion_email_sent'])

@shared_task
def send_promotional_emails():
    """
    Send promotional emails to users whose bookings are not confirmed, started, or pending.
    Send a separate email to users with pending bookings.
    """
    from core.models import BookingSettings
    settings_obj = BookingSettings.objects.first()
    promo_content = settings_obj.promotional_email_content if settings_obj else "<p>Check out our latest offers at RS Express Parking!</p>"
    pending_content = settings_obj.pending_bookings_email_content if settings_obj else "<p>Your booking is still pending at RS Express Parking!</p>"

    # Get all bookings by status
    all_bookings = Booking.objects.all()
    promo_bookings = all_bookings.exclude(status__name__in=["Confirmed", "Started", "Pending"])
    pending_bookings = all_bookings.filter(status__name="Pending")

    subject_promo = "Park With Us Again & Save 15%"
    subject_pending = "Complete Your Booking & Save 20% Today!"

    custom_email = "hello@rsexpressparking.com"
    custom_password = "sxVhsSm1BYfZC1!G"

    connection = get_connection(
        host=config('EMAIL_HOST'),
        port=config('EMAIL_PORT', cast=int),
        username=custom_email,
        password=custom_password,
        use_tls=config('EMAIL_USE_TLS', cast=bool)
    )

    current_year = datetime.now().year

    emails_sent = set()

    # Send promotional emails
    for booking in promo_bookings.values('email', 'first_name'):
        email = booking['email']
        first_name = booking['first_name'] or "Customer"
        if email in emails_sent:
            continue
        personalized_content = (
            promo_content
            .replace("{{first_name}}", first_name)
            .replace("{{current_year}}", str(current_year))
        )
        msg = EmailMultiAlternatives(
            subject=subject_promo,
            body="This email requires an HTML-compatible email client.",
            from_email=f'RS Express Parking <{custom_email}>',
            to=[email],
            connection=connection
        )
        msg.attach_alternative(personalized_content, "text/html")
        msg.send()
        emails_sent.add(email)

    # Send pending booking emails
    for booking in pending_bookings.values('email', 'first_name'):
        email = booking['email']
        first_name = booking['first_name'] or "Customer"
        if email in emails_sent:
            continue
        personalized_content = (
            pending_content
            .replace("{{first_name}}", first_name)
            .replace("{{current_year}}", str(current_year))
        )
        msg = EmailMultiAlternatives(
            subject=subject_pending,
            body="This email requires an HTML-compatible email client.",
            from_email=f'RS Express Parking <{custom_email}>',
            to=[email],
            connection=connection
        )
        msg.attach_alternative(personalized_content, "text/html")
        msg.send()
        emails_sent.add(email)