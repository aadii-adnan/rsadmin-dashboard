# Unregister django_celery_beat models from admin
from django.apps import apps
from django.contrib import admin

for model_name in [
    'Solarschedule',
    'Clockedschedule',
]:
    model = apps.get_model('django_celery_beat', model_name)
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass