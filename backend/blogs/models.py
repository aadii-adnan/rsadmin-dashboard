from django.db import models
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    def __str__(self):
        return self.name

class BlogPost(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('publish', 'Publish'),
    )

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    content = models.TextField()
    excerpt = models.TextField(blank=True, null=True)
    featured_image = models.ImageField(upload_to='blog/images/', blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    reading_time = models.IntegerField(default=5)

    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    tags = models.ManyToManyField(Tag, blank=True)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    published_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    meta_title = models.CharField(max_length=60, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    canonical_url = models.URLField(blank=True)

    open_graph_image = models.ImageField(upload_to='blog/seo/', blank=True, null=True)
    robots_index = models.BooleanField(default=True)
    robots_follow = models.BooleanField(default=True)
    robots_noarchive = models.BooleanField(default=False)
    robots_nosnippet = models.BooleanField(default=False)
    max_snippet = models.IntegerField(default=-1)

    class Meta:
        indexes = [
            models.Index(
                fields=["status", "-published_date", "-created_at"],
                name="blog_status_pub_idx",
            ),
            models.Index(
                fields=["status", "category", "-published_date"],
                name="blog_status_cat_idx",
            ),
        ]

    def __str__(self):
        return self.title

class BlogFAQ(models.Model):
    post = models.ForeignKey(BlogPost, related_name="faqs", on_delete=models.CASCADE)
    question = models.CharField(max_length=255)
    answer = models.TextField()
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.question} ({self.post.title})"

class RedirectRule(models.Model):
    STATUS_CHOICES = (
        (301, '301 Moved Permanently'),
        (302, '302 Found / Temporary Redirect'),
    )
    old_path = models.CharField(max_length=255, unique=True, help_text="e.g., /old-blog-post/")
    new_path = models.CharField(max_length=255, help_text="e.g., /new-blog-post/")
    status_code = models.IntegerField(choices=STATUS_CHOICES, default=301)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.old_path} -> {self.new_path} ({self.status_code})"

