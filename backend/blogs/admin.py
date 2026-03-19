from django.contrib import admin
from .models import Category, Tag, BlogPost, BlogFAQ, RedirectRule

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

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

@admin.register(RedirectRule)
class RedirectRuleAdmin(admin.ModelAdmin):
    list_display = ('old_path', 'new_path', 'status_code', 'is_active')
    list_filter = ('status_code', 'is_active')
    search_fields = ('old_path', 'new_path')
