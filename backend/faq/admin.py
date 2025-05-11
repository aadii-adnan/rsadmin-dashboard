from django.contrib import admin
from .models import FAQ, FAQCategory

@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('id', 'question', 'category')
    search_fields = ('question', 'answer')
    list_filter = ('category',)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)
