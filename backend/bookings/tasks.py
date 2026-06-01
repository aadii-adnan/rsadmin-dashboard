from celery import shared_task
from django.core.mail import EmailMultiAlternatives, get_connection
from .models import Booking
from core.models import Status, UnsubscribedEmail
from django.utils import timezone
from datetime import timedelta, datetime
from decouple import config

@shared_task
def process_bookings_for_completion():
    """
    Periodic task: Find Started bookings where return_time threshold has passed.
    Mark as completed and send thank you email.
    Supplier bookings will be marked as Completed but no emails will be sent to them.
    """
    now = timezone.now()
    threshold = now - timedelta(hours=3)
    completed_status = Status.objects.get(name="Completed", type='booking')
    confirmed_status = Status.objects.get(name="Confirmed", type='booking')
    started_status = Status.objects.get(name="Started", type='booking')

    # Process Confirmed and Started bookings regardless of completion_email_sent.
    # This allows admins to reset a booking to Started to trigger a resend.
    bookings = Booking.objects.filter(
        return_time__lte=threshold,
        status__in=[confirmed_status, started_status]
    )

    for booking in bookings:
        booking.status = completed_status
        booking.save()
        # If completion_email_sent is already True, force a resend.
        send_completion_email_to_user(booking.id, force_resend=booking.completion_email_sent)

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
    rescheduled_status = Status.objects.get(name="Rescheduled", type='booking')  # Add this line

    bookings = Booking.objects.filter(
        departure_time__lte=now, return_time__gt=now,
        status__in=[confirmed_status, rescheduled_status]  # Include both statuses
    )

    for booking in bookings:
        booking.status = started_status
        booking.save()

@shared_task
def send_completion_email_to_user(booking_id, force_resend=False):
    booking = Booking.objects.get(id=booking_id)
    
    # Skip email for supplier bookings
    if booking.supplier is not None:
        return "Skipped: supplier booking - no email sent"
    
    if booking.completion_email_sent and not force_resend:
        return "Email already sent"

    departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
    return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')

    is_dublin = (booking.website.lower() == "dublinairportparking")

    if is_dublin:
        site_name = "Dublin Airport Express Parking"
        site_url = "https://dublinairportexpressparking.ie/"
        team_name = "The Dublin Airport Express Parking Team"
        from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
        default_coupon = "DUBPARK10"
        trustpilot_url = None
        google_review_url = None
        connection = get_connection(
            host=config('EMAIL_HOST'),
            port=config('EMAIL_PORT', cast=int),
            username="support@dublinairportexpressparking.ie",
            password=config('DUBLIN_EMAIL_HOST_PASSWORD'),
            use_tls=config('EMAIL_USE_TLS', cast=bool)
        )
    else:
        site_name = "RS Express Parking"
        site_url = "https://rsexpressparking.com/"
        team_name = "The RS Express Parking Team"
        from_email = "RS Express Parking <support@rsexpressparking.com>"
        default_coupon = "RSPARK10"
        trustpilot_url = "https://ie.trustpilot.com/review/rsexpressparking.com"
        google_review_url = "https://g.page/r/CZW2D3u4VHTOEAI/review"
        connection = None  # Use default

    # Use default coupon if not set
    coupon = booking.discount_coupon_awarded or default_coupon

    if is_dublin:
        feedback_html = f"""
        <h3 style="color: #444;">💬 Feedback</h3>
        <p>We would love to hear about your experience. Just reply to this email with your feedback or review.</p>
        """
        feedback_text = """
-----------------------------
💬 Feedback
-----------------------------
We would love to hear about your experience. Just reply to this email with your feedback or review.
"""
    else:
        feedback_html = f"""
        <h3 style="color: #444;">💬 Feedback</h3>
        <p>
            We would love to hear about your experience. If you have a moment, please consider leaving us a review:<br>
            <a href="{trustpilot_url}" target="_blank" style="color:#0066cc;">Leave a Trustpilot Review</a><br>
            <a href="{google_review_url}" target="_blank" style="color:#0066cc;">Leave a Google Maps Review</a>
        </p>
        """
        feedback_text = f"""
-----------------------------
💬 Feedback
-----------------------------
We would love to hear about your experience. If you have a moment, please consider leaving us a review:
Trustpilot: {trustpilot_url}
Google Maps: {google_review_url}
"""

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Thank You for Parking with {site_name}!</h2>
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
            As a thank you, here’s a coupon for <strong>10% off</strong> your next booking:<br>
            <span style="font-size: 18px; font-weight: bold; color: #0066cc;">{coupon}</span>
        </p>
        <h3 style="color: #444;">🙏 Thank You!</h3>
        <p>
        Thank you for choosing <strong>{site_name}</strong>. We appreciate your trust and hope to see you again soon!
        </p>
        {feedback_html}
        <p>
        Warm regards,<br>
        <strong>{team_name}</strong><br>
        <a href="{site_url}" style="color: #0066cc;">{site_url}</a> | +353 1 964 0011
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
As a thank you, here’s a coupon for 10% off your next booking:
{coupon}

-----------------------------
🙏 Thank You!
-----------------------------
Thank you for choosing {site_name}. We appreciate your trust and hope to see you again soon!
{feedback_text}
Warm regards,  
{team_name}  
{site_url} | +353 1 964 0011
"""

    email_kwargs = dict(
        subject=f'Thank you for parking with us!',
        body=text_body,
        from_email=from_email,
        to=[booking.email],
    )
    if connection:
        email_kwargs['connection'] = connection

    email = EmailMultiAlternatives(**email_kwargs)
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
    unsubscribed_emails = set(
        e.strip().lower() for e in UnsubscribedEmail.objects.values_list('email', flat=True) if e
    )
    settings_obj = BookingSettings.objects.first()
    promo_content = settings_obj.promotional_email_content if settings_obj else "<p>Check out our latest offers at RS Express Parking!</p>"
    pending_content = settings_obj.pending_bookings_email_content if settings_obj else "<p>Your booking is still pending at RS Express Parking!</p>"
    dublin_promo_content = settings_obj.dublin_promotional_email_content if settings_obj else "<p>Check out our latest offers at Dublin Airport Express Parking!</p>"
    dublin_pending_content = settings_obj.dublin_pending_bookings_email_content if settings_obj else "<p>Your booking is still pending at Dublin Airport Express Parking!</p>"

    # Get all bookings by status (exclude supplier bookings)
    all_bookings = Booking.objects.filter(supplier__isnull=True)
    promo_bookings = all_bookings.exclude(status__name__in=["Confirmed", "Started", "Pending"])
    pending_bookings = all_bookings.filter(status__name="Pending")

    subject_promo = "Park With Us Again & Save 10%"
    subject_pending = "Complete Your Booking & Save 10% Today!"

    current_year = datetime.now().year
    emails_sent = set()

    # Send promotional emails
    for booking in promo_bookings:
        email = booking.email
        if not email:
            continue
        email_norm = email.strip().lower()
        first_name = booking.first_name or "Customer"
        website = getattr(booking, 'website', 'rsexpressparking').lower()
        if email_norm in emails_sent or email_norm in unsubscribed_emails:
            continue

        if website == "dublinairportparking":
            personalized_content = (
                dublin_promo_content
                .replace("{{first_name}}", first_name)
                .replace("{{current_year}}", str(current_year))
            )
            custom_email = "hello@dublinairportexpressparking.ie"
            from_email = f"Dublin Airport Express Parking <{custom_email}>"
            subject = subject_promo
            connection = get_connection(
                host=config('EMAIL_HOST'),
                port=config('EMAIL_PORT', cast=int),
                username=custom_email,
                password=config('DUBLIN_EMAIL_HOST_PASSWORD'),
                use_tls=config('EMAIL_USE_TLS', cast=bool)
            )
        else:
            personalized_content = (
                promo_content
                .replace("{{first_name}}", first_name)
                .replace("{{current_year}}", str(current_year))
            )
            custom_email = "hello@rsexpressparking.com"
            from_email = f"RS Express Parking <{custom_email}>"
            subject = subject_promo
            connection = get_connection(
                host=config('EMAIL_HOST'),
                port=config('EMAIL_PORT', cast=int),
                username=custom_email,
                password=config('EMAIL_HOST_PASSWORD'),
                use_tls=config('EMAIL_USE_TLS', cast=bool)
            )

        msg = EmailMultiAlternatives(
            subject=subject,
            body="This email requires an HTML-compatible email client.",
            from_email=from_email,
            to=[email],
            connection=connection
        )
        msg.attach_alternative(personalized_content, "text/html")
        msg.send()
        emails_sent.add(email_norm)

    # Send pending booking emails
    for booking in pending_bookings:
        email = booking.email
        if not email:
            continue
        email_norm = email.strip().lower()
        first_name = booking.first_name or "Customer"
        website = getattr(booking, 'website', 'rsexpressparking').lower()
        if email_norm in emails_sent or email_norm in unsubscribed_emails:
            continue

        # Check for another booking with same email and status 'Started' or 'Confirmed'
        if Booking.objects.filter(
            email__iexact=email,  # use case-insensitive DB check for safety
            status__name__in=["Started", "Confirmed"]
        ).exclude(id=booking.id).exists():
            continue  # Skip sending email for this pending booking

        if website == "dublinairportparking":
            personalized_content = (
                dublin_pending_content
                .replace("{{first_name}}", first_name)
                .replace("{{current_year}}", str(current_year))
            )
            custom_email = "hello@dublinairportexpressparking.ie"
            from_email = f"Dublin Airport Express Parking <{custom_email}>"
            subject = subject_pending
            connection = get_connection(
                host=config('EMAIL_HOST'),
                port=config('EMAIL_PORT', cast=int),
                username=custom_email,
                password=config('DUBLIN_EMAIL_HOST_PASSWORD'),
                use_tls=config('EMAIL_USE_TLS', cast=bool)
            )
        else:
            personalized_content = (
                pending_content
                .replace("{{first_name}}", first_name)
                .replace("{{current_year}}", str(current_year))
            )
            custom_email = "hello@rsexpressparking.com"
            from_email = f"RS Express Parking <{custom_email}>"
            subject = subject_pending
            connection = get_connection(
                host=config('EMAIL_HOST'),
                port=config('EMAIL_PORT', cast=int),
                username=custom_email,
                password=config('EMAIL_HOST_PASSWORD'),
                use_tls=config('EMAIL_USE_TLS', cast=bool)
            )

        msg = EmailMultiAlternatives(
            subject=subject,
            body="This email requires an HTML-compatible email client.",
            from_email=from_email,
            to=[email],
            connection=connection
        )
        msg.attach_alternative(personalized_content, "text/html")
        msg.send()
        emails_sent.add(email_norm)


@shared_task
def send_social_media_follow_emails():
    """
    Monthly task: Send social media follow emails to RS Express users.
    Collects emails from RS bookings and marketing leads.
    Ignores Dublin bookings and unsubscribed emails.
    """
    from core.models import BookingSettings, MarketingLead
    
    unsubscribed_emails = set(
        e.strip().lower() for e in UnsubscribedEmail.objects.values_list('email', flat=True) if e
    )
    
    settings_obj = BookingSettings.objects.first()
    social_media_content = (
        settings_obj.social_media_email_content 
        if settings_obj and settings_obj.social_media_email_content 
        else "<p>Follow us on social media to stay updated with RS Express Parking!</p>"
    )
    
    current_year = datetime.now().year
    emails_sent = set()
    
    # Collect emails from RS bookings (exclude Dublin and supplier bookings)
    rs_bookings = Booking.objects.filter(
        supplier__isnull=True  # Exclude supplier bookings
    ).exclude(
        website__iexact="dublinairportparking"
    ).values_list('email', 'first_name').distinct()
    
    # Collect emails from marketing leads (subscribed only)
    marketing_leads = MarketingLead.objects.filter(
        subscribed=True
    ).values_list('email', flat=True)
    
    # Build a combined list: {email: first_name}
    email_map = {}
    
    # Add booking emails
    for email, first_name in rs_bookings:
        if email:
            email_norm = email.strip().lower()
            if email_norm not in email_map:
                email_map[email_norm] = first_name or "Customer"
    
    # Add marketing lead emails (use "Customer" as name since leads don't have names)
    for email in marketing_leads:
        if email:
            email_norm = email.strip().lower()
            if email_norm not in email_map:
                email_map[email_norm] = "Customer"
    
    subject = "Stay Connected with RS Express Parking!"
    custom_email = "hello@rsexpressparking.com"
    from_email = f"RS Express Parking <{custom_email}>"
    
    connection = get_connection(
        host=config('EMAIL_HOST'),
        port=config('EMAIL_PORT', cast=int),
        username=custom_email,
        password=config('EMAIL_HOST_PASSWORD'),
        use_tls=config('EMAIL_USE_TLS', cast=bool)
    )
    
    for email_norm, first_name in email_map.items():
        # Skip unsubscribed or already sent
        if email_norm in unsubscribed_emails or email_norm in emails_sent:
            continue
        
        personalized_content = (
            social_media_content
            .replace("{{first_name}}", first_name)
            .replace("{{current_year}}", str(current_year))
        )
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body="This email requires an HTML-compatible email client.",
            from_email=from_email,
            to=[email_norm],
            connection=connection
        )
        msg.attach_alternative(personalized_content, "text/html")
        msg.send()
        emails_sent.add(email_norm)
    
    return f"Social media follow emails sent to {len(emails_sent)} recipients"


@shared_task
def send_supplier_booking_manager_notification(booking_id):
    """Send admin/manager notification email when a supplier creates a booking via API."""
    try:
        booking = Booking.objects.get(id=booking_id)
        from payments.views import generate_invoice, send_manager_new_booking_email
        response, error = generate_invoice(booking)
        if error:
            return f"Invoice generation failed for booking {booking_id}: {error}"
        send_manager_new_booking_email(booking, response.getvalue())
        return f"Manager notification sent for booking {booking.booking_id}"
    except Booking.DoesNotExist:
        return f"Booking {booking_id} not found"
    except Exception as e:
        return f"Error sending manager notification for booking {booking_id}: {e}"