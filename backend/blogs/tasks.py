from celery import shared_task
from django.utils import timezone


@shared_task
def publish_scheduled_posts():
    from blogs.models import BlogPost
    due = BlogPost.objects.filter(status='scheduled', published_date__lte=timezone.now())
    count = due.update(status='publish')
    return f"Published {count} scheduled post(s)"
