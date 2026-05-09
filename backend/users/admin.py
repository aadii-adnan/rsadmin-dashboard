from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser, Supplier
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
                   'is_manager', 'is_supplier', 'is_active', 'credits', 'date_joined_display', 'last_login_display')
    list_filter = ('is_manager', 'is_supplier', 'is_active', 'is_staff', 'date_joined')
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
                'is_supplier',
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

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing user
            return self.readonly_fields + ('username',)
        return self.readonly_fields  # Adding a new user

    readonly_fields = ('date_joined_display', 'last_login_display')

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Full Name'

    def has_module_permission(self, request):
        """
        Restrict access for managers and suppliers.
        """
        user = request.user
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        if user.is_authenticated and getattr(user, "is_supplier", False):
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)


class SupplierAdminForm(forms.ModelForm):
    username = forms.CharField(
        max_length=150, required=True,
        help_text="Login username for this vendor"
    )
    password = forms.CharField(
        widget=forms.PasswordInput, required=True,
        help_text="Login password for this vendor"
    )

    class Meta:
        model = Supplier
        fields = ('name', 'contact_person', 'email', 'phone', 'website',
                  'booking_id_prefix', 'commission_percentage', 'use_custom_booking_ids', 'is_active')


class SupplierEditForm(forms.ModelForm):
    linked_username = forms.CharField(
        required=False,
        help_text="The linked login username (change credentials from Users section)"
    )

    class Meta:
        model = Supplier
        fields = ('name', 'contact_person', 'email', 'phone', 'website',
                  'booking_id_prefix', 'commission_percentage', 'use_custom_booking_ids', 'is_active')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.user:
            self.fields['linked_username'].initial = self.instance.user.username
        self.fields['linked_username'].disabled = True


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'contact_person', 'email', 'phone',
                    'booking_id_prefix', 'booking_id_mode', 'commission_percentage', 'is_active', 'created_at_display')
    list_filter = ('is_active',)
    search_fields = ('name', 'contact_person', 'email', 'booking_id_prefix')
    list_per_page = 20

    def created_at_display(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_display.short_description = 'Created At'
    created_at_display.admin_order_field = 'created_at'

    def booking_id_mode(self, obj):
        return "Custom" if obj.use_custom_booking_ids else "Auto"
    booking_id_mode.short_description = "Booking ID Mode"

    def get_form(self, request, obj=None, **kwargs):
        if obj:  # Editing existing supplier
            kwargs['form'] = SupplierEditForm
        else:  # Adding new supplier
            kwargs['form'] = SupplierAdminForm
        return super().get_form(request, obj, **kwargs)

    def get_fieldsets(self, request, obj=None):
        if obj:  # Editing
            return [
                ('Vendor Information', {
                    'fields': ('name', 'contact_person', 'email', 'phone', 'website',
                               'booking_id_prefix', 'use_custom_booking_ids', 'commission_percentage', 'is_active')
                }),
                ('Login Account', {
                    'fields': ('linked_username',)
                }),
            ]
        else:  # Adding
            return [
                ('Vendor Information', {
                    'fields': ('name', 'contact_person', 'email', 'phone', 'website',
                               'booking_id_prefix', 'use_custom_booking_ids', 'commission_percentage', 'is_active')
                }),
                ('Login Credentials', {
                    'fields': ('username', 'password'),
                    'description': 'These credentials will be used to create a login account for this vendor.'
                }),
            ]

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new supplier
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = CustomUser.objects.create_user(
                username=username,
                password=password,
                email=obj.email,
                is_supplier=True,
                is_staff=True,
                is_manager=False,
                is_superuser=True,  # Superuser access, but restricted by module permissions
                first_name=obj.contact_person.split()[0] if obj.contact_person else '',
                last_name=' '.join(obj.contact_person.split()[1:]) if obj.contact_person and len(obj.contact_person.split()) > 1 else '',
            )
            obj.user = user
        super().save_model(request, obj, form, change)

    def has_module_permission(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, 'is_manager', False):
            return False
        if user.is_authenticated and getattr(user, 'is_supplier', False):
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css', 'admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)
