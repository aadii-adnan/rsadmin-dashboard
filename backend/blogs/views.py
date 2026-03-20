from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect

from core.permissions import IsManagerOrAdmin

from .models import BlogFAQ, BlogPost, Category, RedirectRule, Tag
from .pagination import BlogPagination
from .serializers import (
    AdminBlogFAQSerializer,
    AdminBlogPostSerializer,
    BlogFAQSerializer,
    CategorySerializer,
    PublicBlogPostSerializer,
    RedirectRuleSerializer,
    TagSerializer,
)


@login_required
def blogs_jwt_login(request):
    user = request.user
    # Use the exact same permission check as the finance dashboard
    if not (user.is_superuser and not getattr(user, "is_manager", False)):
        return HttpResponseRedirect("/admin/login/?next=/admin/")

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_token = str(refresh)

    # Redirect to the new React Blog Admin with tokens in the URL
    redirect_url = f"/blog-admin/?access={access}&refresh={refresh_token}"
    return HttpResponseRedirect(redirect_url)


class PublicBlogListView(ListAPIView):
    serializer_class = PublicBlogPostSerializer
    permission_classes = [AllowAny]
    pagination_class = BlogPagination

    def get_queryset(self):
        queryset = (
            BlogPost.objects.filter(status="publish")
            .select_related("category", "author")
            .prefetch_related("tags", "faqs")
            .order_by("-published_date", "-created_at")
        )

        category_slug = self.request.query_params.get("category")
        tag_slug = self.request.query_params.get("tag")
        search = self.request.query_params.get("search") or self.request.query_params.get("q")

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)

        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.distinct()


class PublicBlogDetailView(RetrieveAPIView):
    serializer_class = PublicBlogPostSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            BlogPost.objects.filter(status="publish")
            .select_related("category", "author")
            .prefetch_related("tags", "faqs")
        )


class PublicCategoryListView(ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.all().order_by("name")


class PublicTagListView(ListAPIView):
    serializer_class = TagSerializer
    permission_classes = [AllowAny]
    queryset = Tag.objects.all().order_by("name")


class ActiveRedirectsView(ListAPIView):
    serializer_class = RedirectRuleSerializer
    permission_classes = [AllowAny]
    queryset = RedirectRule.objects.filter(is_active=True).order_by("old_path")


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsManagerOrAdmin]


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer
    permission_classes = [IsManagerOrAdmin]


class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all().select_related("category", "author").prefetch_related("tags", "faqs")
    serializer_class = AdminBlogPostSerializer
    permission_classes = [IsManagerOrAdmin]
    lookup_field = "id"

    def perform_create(self, serializer):
        author = serializer.validated_data.get("author")
        if author is None and self.request.user.is_authenticated:
            serializer.save(author=self.request.user)
            return
        serializer.save()

    def perform_update(self, serializer):
        author = serializer.validated_data.get("author")
        instance = self.get_object()

        if author is None and instance.author is None and self.request.user.is_authenticated:
            serializer.save(author=self.request.user)
            return
        serializer.save()


class BlogFAQViewSet(viewsets.ModelViewSet):
    queryset = BlogFAQ.objects.all().select_related("post").order_by("post_id", "order", "id")
    serializer_class = AdminBlogFAQSerializer
    permission_classes = [IsManagerOrAdmin]


class RedirectRuleViewSet(viewsets.ModelViewSet):
    queryset = RedirectRule.objects.all().order_by("old_path")
    serializer_class = RedirectRuleSerializer
    permission_classes = [IsManagerOrAdmin]
