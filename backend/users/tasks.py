from urllib.parse import urlencode

from celery import shared_task
from decouple import config
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

User = get_user_model()


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


def _build_reset_link(base_url, uid, token):
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{urlencode({'uid': uid, 'token': token})}"


@shared_task
def send_password_reset_email_task(user_id, uid, token, website="rsexpressparking"):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return "User not found"

    is_dublin = _is_dublin_website(website)

    if is_dublin:
        site_name = "Dublin Airport Express Parking"
        support_email = "support@dublinairportexpressparking.ie"
        from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
        reset_base_url = settings.FRONTEND_DUBLIN_RESET_PASSWORD_URL
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
        reset_base_url = settings.FRONTEND_RS_RESET_PASSWORD_URL
        connection = None

    if not uid:
        uid = urlsafe_base64_encode(force_bytes(user.pk))

    reset_link = _build_reset_link(reset_base_url, uid, token)
    subject = f"{site_name} password reset instructions"

    context = {
        "first_name": user.first_name or user.username or "Customer",
        "username": user.username,
        "site_name": site_name,
        "support_email": support_email,
        "reset_link": reset_link,
    }

    text_body = render_to_string("emails/password_reset_email.txt", context)
    html_body = render_to_string("emails/password_reset_email.html", context)

    email_kwargs = {
        "subject": subject,
        "body": text_body,
        "from_email": from_email,
        "to": [user.email],
    }

    if connection:
        email_kwargs["connection"] = connection

    email = EmailMultiAlternatives(**email_kwargs)
    email.attach_alternative(html_body, "text/html")
    email.send()

    return "Password reset email sent"
