from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser
from django.contrib import admin
from django.contrib.auth.models import Group
from django.utils import timezone
from django import forms

admin.site.unregister(Group)

class CustomUserForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = '__all__'
        labels = {
            'bonus_points': 'Credit Points',
        }
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    form = CustomUserForm
    def date_joined_display(self, obj):
        return timezone.localtime(obj.date_joined).strftime('%d %b %Y %H:%M')
    date_joined_display.short_description = 'Date Joined'
    date_joined_display.admin_order_field = 'date_joined'

    def last_login_display(self, obj):
        if obj.last_login:
            return timezone.localtime(obj.last_login).strftime('%d %b %Y %H:%M')
        return '-'
    last_login_display.short_description = 'Last Login'
    last_login_display.admin_order_field = 'last_login'

    def credits(self, obj):
        return obj.bonus_points
    credits.short_description = 'Credit Points'

    list_display = ('id', 'username', 'email', 'full_name', 'phone', 
                   'is_manager', 'is_active', 'credits', 'date_joined_display', 'last_login_display')
    list_filter = ('is_manager', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone')
    ordering = ('-date_joined',)
    list_per_page = 20

    fieldsets = (
        ('Personal Info', {
            'fields': (
                ('first_name', 'last_name'),
                ('email', 'phone'),
                'username', 'bonus_points'
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active',
                'is_manager',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            )
        }),
        ('Important Dates', {
            'fields': (
                ('date_joined_display', 'last_login_display'),
            )
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'phone',
                'password1', 'password2',
                'is_manager', 'is_active'
            ),
        }),
    )

    readonly_fields = ('date_joined_display', 'last_login_display', 'username')

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Full Name'

    def has_module_permission(self, request):
        """
        Restrict access for managers.
        """
        user = request.user
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)