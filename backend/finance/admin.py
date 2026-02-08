from django.apps import apps
from django.contrib import admin
from django_celery_beat.models import PeriodicTask, CrontabSchedule, IntervalSchedule
from django_celery_beat.admin import PeriodicTaskAdmin, CrontabScheduleAdmin, IntervalScheduleAdmin

for model_name in [
    'Solarschedule',
    'Clockedschedule',
]:
    model = apps.get_model('django_celery_beat', model_name)
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass

class CustomMediaMixin:
    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)

    def has_module_permission(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, "is_supplier", False):
            return False
        return super().has_module_permission(request)

class CustomPeriodicTaskAdmin(PeriodicTaskAdmin, CustomMediaMixin):
    list_display = ('id',) + PeriodicTaskAdmin.list_display

class CustomCrontabScheduleAdmin(CrontabScheduleAdmin, CustomMediaMixin):
    list_display = ('id',) + CrontabScheduleAdmin.list_display

class CustomIntervalScheduleAdmin(IntervalScheduleAdmin, CustomMediaMixin):
    list_display = ('id',) + IntervalScheduleAdmin.list_display

admin.site.unregister(PeriodicTask)
admin.site.register(PeriodicTask, CustomPeriodicTaskAdmin)

admin.site.unregister(CrontabSchedule)
admin.site.register(CrontabSchedule, CustomCrontabScheduleAdmin)

admin.site.unregister(IntervalSchedule)
admin.site.register(IntervalSchedule, CustomIntervalScheduleAdmin)