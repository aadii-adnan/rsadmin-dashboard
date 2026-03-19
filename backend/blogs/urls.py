from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActiveRedirectsView,
    BlogFAQViewSet,
    BlogPostViewSet,
    CategoryViewSet,
    PublicBlogDetailView,
    PublicBlogListView,
    PublicCategoryListView,
    PublicTagListView,
    RedirectRuleViewSet,
    TagViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="blog-admin-category")
router.register(r"tags", TagViewSet, basename="blog-admin-tag")
router.register(r"posts", BlogPostViewSet, basename="blog-admin-post")
router.register(r"faqs", BlogFAQViewSet, basename="blog-admin-faq")
router.register(r"redirect-rules", RedirectRuleViewSet, basename="blog-admin-redirect")

urlpatterns = [
    path("public/posts/", PublicBlogListView.as_view(), name="public-blog-list"),
    path("public/posts/<slug:slug>/", PublicBlogDetailView.as_view(), name="public-blog-detail"),
    path("public/categories/", PublicCategoryListView.as_view(), name="public-category-list"),
    path("public/tags/", PublicTagListView.as_view(), name="public-tag-list"),
    path("public/redirects/", ActiveRedirectsView.as_view(), name="public-active-redirects"),
    path("admin/", include(router.urls)),
]
