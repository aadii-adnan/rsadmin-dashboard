import re

from django.utils.html import strip_tags
from rest_framework import serializers

from .image_utils import build_responsive_image_payload
from .models import BlogFAQ, BlogPost, Category, RedirectRule, Tag


def _normalize_plain_text(value):
    if not value:
        return ""
    plain_text = strip_tags(value)
    return re.sub(r"\s+", " ", plain_text).strip()


def _build_excerpt(value, fallback="", limit=160):
    source = value or fallback
    plain = _normalize_plain_text(source)
    if len(plain) <= limit:
        return plain
    return f"{plain[:limit].rstrip()}..."


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = "__all__"


class RedirectRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RedirectRule
        fields = "__all__"


class BlogFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogFAQ
        fields = ["id", "question", "answer", "is_active", "order"]


class AdminBlogFAQSerializer(serializers.ModelSerializer):
    post = serializers.PrimaryKeyRelatedField(queryset=BlogPost.objects.all())

    class Meta:
        model = BlogFAQ
        fields = "__all__"


class PublicBlogPostSerializer(serializers.ModelSerializer):
    """Legacy serializer kept for backwards compatibility in internal usage."""

    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    faqs = BlogFAQSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "excerpt",
            "featured_image",
            "status",
            "published_date",
            "author_name",
            "category",
            "tags",
            "faqs",
            "meta_title",
            "meta_description",
            "canonical_url",
            "open_graph_image",
            "robots_index",
            "robots_follow",
            "robots_noarchive",
            "robots_nosnippet",
            "max_snippet",
        ]

    def get_author_name(self, obj):
        if not obj.author:
            return ""

        full_name = obj.author.get_full_name().strip() if hasattr(obj.author, "get_full_name") else ""
        if full_name:
            return full_name

        if hasattr(obj.author, "username"):
            return obj.author.username

        return str(obj.author)


class PublicBlogPostListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    author_name = serializers.SerializerMethodField()
    excerpt_text = serializers.SerializerMethodField()
    featured_image_responsive = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "excerpt_text",
            "featured_image",
            "featured_image_responsive",
            "published_date",
            "author_name",
            "category",
            "reading_time",
        ]

    def get_author_name(self, obj):
        if not obj.author:
            return ""

        full_name = obj.author.get_full_name().strip() if hasattr(obj.author, "get_full_name") else ""
        if full_name:
            return full_name

        if hasattr(obj.author, "username"):
            return obj.author.username

        return str(obj.author)

    def get_excerpt_text(self, obj):
        return _build_excerpt(obj.excerpt, fallback="", limit=170)

    def get_featured_image_responsive(self, obj):
        sizes = self.context.get(
            "image_sizes",
            "(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw",
        )
        return build_responsive_image_payload(obj.featured_image, sizes=sizes)


class PublicBlogPostDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    faqs = BlogFAQSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()
    excerpt_text = serializers.SerializerMethodField()
    featured_image_responsive = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "excerpt",
            "excerpt_text",
            "featured_image",
            "featured_image_responsive",
            "status",
            "published_date",
            "updated_date",
            "author_name",
            "category",
            "tags",
            "faqs",
            "meta_title",
            "meta_description",
            "canonical_url",
            "open_graph_image",
            "robots_index",
            "robots_follow",
            "robots_noarchive",
            "robots_nosnippet",
            "max_snippet",
            "reading_time",
        ]

    def get_author_name(self, obj):
        if not obj.author:
            return ""

        full_name = obj.author.get_full_name().strip() if hasattr(obj.author, "get_full_name") else ""
        if full_name:
            return full_name

        if hasattr(obj.author, "username"):
            return obj.author.username

        return str(obj.author)

    def get_excerpt_text(self, obj):
        return _build_excerpt(obj.excerpt, fallback=obj.content, limit=180)

    def get_featured_image_responsive(self, obj):
        sizes = self.context.get(
            "image_sizes",
            "(max-width: 992px) 100vw, 50vw",
        )
        return build_responsive_image_payload(obj.featured_image, sizes=sizes)


class AdminBlogPostSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    tags = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        required=False,
    )
    author_name = serializers.SerializerMethodField(read_only=True)

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or getattr(obj.author, "username", str(obj.author))
        return "Unknown"

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "excerpt",
            "featured_image",
            "author",
            "author_name",
            "reading_time",
            "category",
            "tags",
            "status",
            "published_date",
            "created_at",
            "updated_date",
            "meta_title",
            "meta_description",
            "canonical_url",
            "open_graph_image",
            "robots_index",
            "robots_follow",
            "robots_noarchive",
            "robots_nosnippet",
            "max_snippet",
        ]
