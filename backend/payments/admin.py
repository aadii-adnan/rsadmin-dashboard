from decimal import Decimal

from django import forms
from django.contrib import admin
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Payment, CreditTransaction
from django.utils.html import format_html
from django.utils import timezone

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    def colored_status(self, obj):
        status_colors = {
            'succeeded': '#28a745',  # green
            'pending': '#ffc107',    # yellow
            'failed': '#dc3545',  # red
            'refunded': '#fd7e14' # orange
        }
        
        if obj.status:
            status_name = obj.status.name.lower()
            color = status_colors.get(status_name, 'inherit')
            return format_html(
                '<span style="background-color: {}; color: #fff; padding: 4px 8px; '
                'border-radius: 4px; font-weight: bold;">{}</span>',
                color, obj.status.name
            )
        return '-'
    colored_status.short_description = 'Status'

    def created_at_display(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_display.short_description = 'Created At'
    created_at_display.admin_order_field = 'created_at'

    list_display = ('id', 'booking', 'amount', 'colored_status', 'created_at_display')
    list_filter = ('status', 'created_at')
    search_fields = ('booking__first_name', 'booking__last_name', 'booking__email')
    readonly_fields = ('created_at_display',)

    fieldsets = (
        ('Payment Information', {
            'fields': (
                ('booking', 'amount'),
                ('status','stripe_payment_intent', 'status_message'),
            )
        }),
        ('Timestamps', {
            'fields': (
                ('created_at_display', ),
            )
        }),
    )

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


class CreditAdjustmentForm(forms.ModelForm):
    """Add form for manual credit adjustments — the only way ledger rows are
    created by hand. Positive amounts add credits, negative amounts deduct."""

    website = forms.ChoiceField(
        choices=[
            ('rsexpressparking', 'RS Express Parking'),
            ('dublinairportparking', 'Dublin Airport Express Parking'),
        ],
        initial='rsexpressparking',
    )

    class Meta:
        model = CreditTransaction
        fields = ('user', 'amount', 'note', 'website')
        help_texts = {
            'amount': 'Positive to add credits, negative to deduct.',
            'note': 'Reason for the adjustment, e.g. "Corporate top-up", "Refund".',
        }

    def clean(self):
        cleaned = super().clean()
        user = cleaned.get('user')
        amount = cleaned.get('amount')
        if amount is not None and amount == 0:
            raise forms.ValidationError('Amount cannot be zero.')
        if user and amount is not None and amount < 0:
            balance = user.bonus_points or Decimal('0.00')
            if balance + amount < 0:
                raise forms.ValidationError(
                    f'Cannot deduct €{-amount} — current balance is only €{balance}.'
                )
        return cleaned


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    """Credit ledger. Rows are immutable; admins add manual adjustments via
    the add form, which atomically updates the user's balance."""

    change_form_template = 'admin/payments/credittransaction/change_form.html'

    def colored_status(self, obj):
        status_colors = {
            'succeeded': '#28a745',
            'pending': '#ffc107',
            'failed': '#dc3545',
        }
        color = status_colors.get(obj.status, 'inherit')
        return format_html(
            '<span style="background-color: {}; color: #fff; padding: 4px 8px; '
            'border-radius: 4px; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    colored_status.short_description = 'Status'

    def created_at_display(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_display.short_description = 'Created At'
    created_at_display.admin_order_field = 'created_at'

    list_display = (
        'id', 'user', 'transaction_type', 'amount', 'balance_after',
        'note', 'colored_status', 'website', 'booking', 'created_at_display',
    )
    list_filter = ('transaction_type', 'status', 'website', 'created_at')
    search_fields = (
        'user__username', 'user__email', 'user__first_name', 'user__last_name',
        'stripe_payment_intent', 'booking__booking_id', 'note',
    )
    autocomplete_fields = ('user',)
    list_per_page = 25

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs['form'] = CreditAdjustmentForm
        return super().get_form(request, obj, **kwargs)

    def save_model(self, request, obj, form, change):
        if change:
            return  # ledger rows are immutable
        UserModel = get_user_model()
        with transaction.atomic():
            user = UserModel.objects.select_for_update().get(pk=obj.user_id)
            new_balance = (user.bonus_points or Decimal('0.00')) + obj.amount
            if new_balance < 0:
                # Race-safe backstop behind the form validation
                obj.amount = -(user.bonus_points or Decimal('0.00'))
                new_balance = Decimal('0.00')
            user.bonus_points = new_balance
            user.save(update_fields=['bonus_points'])
            obj.transaction_type = CreditTransaction.TYPE_ADJUSTMENT
            obj.status = CreditTransaction.STATUS_SUCCEEDED
            obj.balance_after = new_balance
            super().save_model(request, obj, form, change)

    def response_add(self, request, obj, post_url_continue=None):
        if "_save_and_send_email" in request.POST:
            if obj.amount <= 0:
                self.message_user(
                    request,
                    "Credit adjustment saved, but no email was sent because the amount was not positive.",
                    level=messages.WARNING,
                )
            elif not obj.user.email:
                self.message_user(
                    request,
                    "Credits were added, but no email was sent because this customer has no email address.",
                    level=messages.WARNING,
                )
            else:
                transaction_id = obj.pk
                recipient = obj.user.email

                def queue_email():
                    from .tasks import send_manual_credit_confirmation_email_task

                    try:
                        send_manual_credit_confirmation_email_task.delay(transaction_id)
                    except Exception:
                        # Keep the admin action useful when the Celery broker is
                        # temporarily unavailable (for example in local admin).
                        try:
                            send_manual_credit_confirmation_email_task(transaction_id)
                        except Exception as exc:
                            self.message_user(
                                request,
                                f"Credits were added, but the customer email could not be sent: {exc}",
                                level=messages.ERROR,
                            )

                # The email task must not read the ledger row until both the
                # adjustment and the user's new balance have been committed.
                transaction.on_commit(queue_email)
                self.message_user(
                    request,
                    f"Credits added. A confirmation email will be sent to {recipient}.",
                    level=messages.SUCCESS,
                )

        return super().response_add(request, obj, post_url_continue)

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

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
