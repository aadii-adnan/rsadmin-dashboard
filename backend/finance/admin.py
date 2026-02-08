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
        if user.is_authenticated and (getattr(user, "is_supplier", False) or getattr(user, "is_manager", False)):
            return False
        return super().has_module_permission(request)

    def has_add_permission(self, request):
        user = request.user
        if user.is_authenticated and (getattr(user, "is_supplier", False) or getattr(user, "is_manager", False)):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        user = request.user
        if user.is_authenticated and (getattr(user, "is_supplier", False) or getattr(user, "is_manager", False)):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        user = request.user
        if user.is_authenticated and (getattr(user, "is_supplier", False) or getattr(user, "is_manager", False)):
            return False
        return super().has_delete_permission(request, obj)

    def has_view_permission(self, request, obj=None):
        user = request.user
        if user.is_authenticated and (getattr(user, "is_supplier", False) or getattr(user, "is_manager", False)):
            return False
        return super().has_view_permission(request, obj)

class CustomPeriodicTaskAdmin(CustomMediaMixin, PeriodicTaskAdmin):
    list_display = ('id',) + PeriodicTaskAdmin.list_display

class CustomCrontabScheduleAdmin(CustomMediaMixin, CrontabScheduleAdmin):
    list_display = ('id',) + CrontabScheduleAdmin.list_display

class CustomIntervalScheduleAdmin(CustomMediaMixin, IntervalScheduleAdmin):
    list_display = ('id',) + IntervalScheduleAdmin.list_display

admin.site.unregister(PeriodicTask)
admin.site.register(PeriodicTask, CustomPeriodicTaskAdmin)

admin.site.unregister(CrontabSchedule)
admin.site.register(CrontabSchedule, CustomCrontabScheduleAdmin)

admin.site.unregister(IntervalSchedule)
admin.site.register(IntervalSchedule, CustomIntervalScheduleAdmin)