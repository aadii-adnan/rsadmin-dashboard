from django.contrib import admin
from .models import Category, Tag, BlogPost, BlogFAQ, RedirectRule

# Monkey patch the default AdminSite to reorder the apps in the sidebar
_original_get_app_list = admin.AdminSite.get_app_list

def custom_get_app_list(self, request, app_label=None):
    app_list = _original_get_app_list(self, request, app_label)
    
    # Extract the blogs app if it exists in the list
    blogs_app = next((app for app in app_list if app.get('app_label') == 'blogs'), None)
    
    if blogs_app:
        # Remove it from its current position
        app_list.remove(blogs_app)
        # Append it to the end of the list
        app_list.append(blogs_app)
        
    return app_list

admin.AdminSite.get_app_list = custom_get_app_list

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

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

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

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

class BlogFAQInline(admin.TabularInline):
    model = BlogFAQ
    extra = 1

@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'published_date', 'author')
    list_filter = ('status', 'category')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [BlogFAQInline]

    fieldsets = (
        ('Content', {
            'fields': ('title', 'slug', 'content', 'featured_image', 'author')
        }),
        ('Relationships', {
            'fields': ('category', 'tags')
        }),
        ('Publishing', {
            'fields': ('status', 'published_date')
        }),
        ('SEO & Meta Data', {
            'fields': ('meta_title', 'meta_description', 'canonical_url')
        }),
        ('Robots Directives', {
            'fields': ('open_graph_image', 'robots_index', 'robots_follow', 'robots_noarchive', 'robots_nosnippet', 'max_snippet')
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

@admin.register(RedirectRule)
class RedirectRuleAdmin(admin.ModelAdmin):
    list_display = ('old_path', 'new_path', 'status_code', 'is_active')
    list_filter = ('status_code', 'is_active')
    search_fields = ('old_path', 'new_path')

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

