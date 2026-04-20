from django.urls import include, path
from django.views.decorators.cache import cache_page
from rest_framework.routers import DefaultRouter

from .views import (
    ActiveRedirectsView,
    BlogFAQViewSet,
    BlogPostViewSet,
    CategoryViewSet,
    ImportWordPressView,
    PublicBlogDetailView,
    PublicBlogListView,
    PublicRelatedBlogListView,
    PublicCategoryListView,
    PublicTagListView,
    RedirectRuleViewSet,
    TagViewSet,
    HTMLSitemapDataView,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="blog-admin-category")
router.register(r"tags", TagViewSet, basename="blog-admin-tag")
router.register(r"posts", BlogPostViewSet, basename="blog-admin-post")
router.register(r"faqs", BlogFAQViewSet, basename="blog-admin-faq")
router.register(r"redirect-rules", RedirectRuleViewSet, basename="blog-admin-redirect")

urlpatterns = [
    path("public/posts/", cache_page(60 * 5)(PublicBlogListView.as_view()), name="public-blog-list"),
    path("public/posts/related/", cache_page(60 * 10)(PublicRelatedBlogListView.as_view()), name="public-blog-related"),
    path("public/posts/<slug:slug>/", cache_page(60 * 10)(PublicBlogDetailView.as_view()), name="public-blog-detail"),
    path("public/categories/", cache_page(60 * 30)(PublicCategoryListView.as_view()), name="public-category-list"),
    path("public/tags/", cache_page(60 * 30)(PublicTagListView.as_view()), name="public-tag-list"),
    path("public/html-sitemap-data/", HTMLSitemapDataView.as_view(), name="html-sitemap-data"),
    path("public/redirects/", cache_page(60 * 30)(ActiveRedirectsView.as_view()), name="public-active-redirects"),
    path("admin/import-wordpress/", ImportWordPressView.as_view(), name="import-wordpress"),
    path("admin/", include(router.urls)),
]

