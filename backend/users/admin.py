from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'username', 'email', 'full_name', 'phone', 
                   'is_manager', 'is_active', 'date_joined', 'last_login')
    list_filter = ('is_manager', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone')
    ordering = ('-date_joined',)
    list_per_page = 20

    fieldsets = (
        ('Personal Info', {
            'fields': (
                ('first_name', 'last_name'),
                ('email', 'phone'),
                'username',
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
                ('date_joined', 'last_login'),
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

    readonly_fields = ('date_joined', 'last_login')

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Full Name'

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)