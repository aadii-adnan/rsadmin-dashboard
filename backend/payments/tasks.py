from celery import shared_task
from decouple import config
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string

from .models import CreditTransaction


def _is_dublin_website(website):
    website_value = (website or "").strip().lower()
    dublin_aliases = {
        "dublin",
        "dublinairportparking",
        "dublinairportexpressparking",
        "dublinairportexpressparking.ie",
        "www.dublinairportexpressparking.ie",
    }
    return website_value in dublin_aliases or "dublinairport" in website_value


@shared_task
def send_topup_confirmation_email_task(credit_transaction_id):
    try:
        tx = CreditTransaction.objects.select_related("user").get(pk=credit_transaction_id)
    except CreditTransaction.DoesNotExist:
        return "Credit transaction not found"

    user = tx.user
    if not user or not user.email:
        return "No recipient email"

    if _is_dublin_website(tx.website):
        site_name = "Dublin Airport Express Parking"
        support_email = "support@dublinairportexpressparking.ie"
        from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
        connection = get_connection(
            host=config("EMAIL_HOST"),
            port=config("EMAIL_PORT", cast=int),
            username="support@dublinairportexpressparking.ie",
            password=config("DUBLIN_EMAIL_HOST_PASSWORD"),
            use_tls=config("EMAIL_USE_TLS", cast=bool),
        )
    else:
        site_name = "RS Express Parking"
        support_email = "support@rsexpressparking.com"
        from_email = "RS Express Parking <support@rsexpressparking.com>"
        connection = None

    context = {
        "first_name": user.first_name or user.username or "Customer",
        "site_name": site_name,
        "support_email": support_email,
        "amount": tx.amount,
        "balance": tx.balance_after,
        "created_at": tx.created_at,
        "transaction_id": tx.id,
    }

    text_body = render_to_string("emails/credit_topup_confirmation.txt", context)
    html_body = render_to_string("emails/credit_topup_confirmation.html", context)

    email_kwargs = {
        "subject": f"{site_name} — credit top-up confirmation",
        "body": text_body,
        "from_email": from_email,
        "to": [user.email],
    }
    if connection:
        email_kwargs["connection"] = connection

    email = EmailMultiAlternatives(**email_kwargs)
    email.attach_alternative(html_body, "text/html")

    # Attach the top-up invoice PDF
    from .views import generate_topup_invoice

    pdf_response, error = generate_topup_invoice(tx)
    if pdf_response is not None and not error:
        email.attach(
            f"Credit-TopUp-Invoice-{tx.id}.pdf",
            pdf_response.content,
            "application/pdf",
        )

    email.send()
    return "Top-up confirmation email sent"


@shared_task
def send_manual_credit_confirmation_email_task(credit_transaction_id):
    """Notify a customer about a positive credit adjustment made by staff."""
    try:
        tx = CreditTransaction.objects.select_related("user").get(
            pk=credit_transaction_id,
            transaction_type=CreditTransaction.TYPE_ADJUSTMENT,
            status=CreditTransaction.STATUS_SUCCEEDED,
        )
    except CreditTransaction.DoesNotExist:
        return "Successful credit adjustment not found"

    if tx.amount <= 0:
        return "Credit adjustment did not add credits"

    user = tx.user
    if not user or not user.email:
        return "No recipient email"

    if _is_dublin_website(tx.website):
        site_name = "Dublin Airport Express Parking"
        site_url = "https://www.dublinairportexpressparking.ie"
        support_email = "support@dublinairportexpressparking.ie"
        from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
        connection = get_connection(
            host=config("EMAIL_HOST"),
            port=config("EMAIL_PORT", cast=int),
            username="support@dublinairportexpressparking.ie",
            password=config("DUBLIN_EMAIL_HOST_PASSWORD"),
            use_tls=config("EMAIL_USE_TLS", cast=bool),
        )
    else:
        site_name = "RS Express Parking"
        site_url = "https://www.rsexpressparking.com"
        support_email = "support@rsexpressparking.com"
        from_email = "RS Express Parking <support@rsexpressparking.com>"
        connection = None

    context = {
        "first_name": user.first_name or user.username or "Customer",
        "username": user.username,
        "site_name": site_name,
        "site_url": site_url,
        "login_url": f"{site_url}/login",
        "support_email": support_email,
        "amount": tx.amount,
        "balance": tx.balance_after,
        "created_at": tx.created_at,
        "transaction_id": tx.id,
    }

    text_body = render_to_string("emails/manual_credit_confirmation.txt", context)
    html_body = render_to_string("emails/manual_credit_confirmation.html", context)
    email_kwargs = {
        "subject": f"{site_name} — credits added to your account",
        "body": text_body,
        "from_email": from_email,
        "to": [user.email],
    }
    if connection:
        email_kwargs["connection"] = connection

    email = EmailMultiAlternatives(**email_kwargs)
    email.attach_alternative(html_body, "text/html")
    email.send()
    return "Manual credit confirmation email sent"


@shared_task
def send_credit_booking_confirmation_task(booking_id):
    """Send the standard booking confirmation + manager notification for a
    booking paid entirely with account credits (no Stripe webhook fires)."""
    from bookings.models import Booking
    from .views import send_booking_confirmation_email, send_manager_new_booking_email

    try:
        booking = Booking.objects.get(pk=booking_id)
    except Booking.DoesNotExist:
        return "Booking not found"

    if booking.email_sent:
        return "Email already sent"

    pdf_content = send_booking_confirmation_email(booking)
    send_manager_new_booking_email(booking, pdf_content)
    return "Credit booking confirmation email sent"
