import json
import logging
import os
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.parse import urlparse

from django.utils.timezone import make_aware

import requests as http_requests
from bs4 import BeautifulSoup

from django.contrib.auth.decorators import login_required
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import HttpResponseRedirect
from django.utils.text import slugify

from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

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

logger = logging.getLogger(__name__)


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


# ---------------------------------------------------------------------------
# WordPress XML Import
# ---------------------------------------------------------------------------

def download_image_with_retry(url, max_retries=3):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    for attempt in range(max_retries):
        try:
            response = http_requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.content
        except http_requests.exceptions.RequestException:
            pass
        time.sleep(1) # Wait 1 second before retrying to respect rate limits
    return None

class ImportWordPressView(APIView):
    """
    Admin-only endpoint that imports a WordPress WXR (XML) export file
    into BlogPost, Category, Tag, and BlogFAQ models.

    Features:
    - Two-pass XML parsing (attachments, then posts)
    - Downloads & rewrites ALL inline images (BeautifulSoup)
    - Downloads featured images via attachment_map
    - Extracts RankMath SEO metadata and SASWP FAQ schema
    - Syncs Categories (FK) and Tags (M2M)

    POST /api/blogs/admin/import-wordpress/
    Expects: multipart/form-data with a 'file' field containing the .xml file.
    """

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    # WordPress WXR namespaces
    NS = {
        "wp": "http://wordpress.org/export/1.2/",
        "content": "http://purl.org/rss/1.0/modules/content/",
        "excerpt": "http://wordpress.org/export/1.2/excerpt/",
    }

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    def post(self, request):
        xml_file = request.FILES.get("file")
        if not xml_file:
            return Response(
                {"error": "No file uploaded. Please provide a WordPress XML export file."},
                status=400,
            )

        try:
            tree = ET.parse(xml_file)
        except ET.ParseError as exc:
            return Response(
                {"error": f"Failed to parse XML: {exc}"},
                status=400,
            )

        root = tree.getroot()
        channel = root.find("channel")
        if channel is None:
            return Response({"error": "Invalid WordPress XML: <channel> not found."}, status=400)

        items = channel.findall("item")

        # Pass 1 – build attachment map  (wp:post_id → image URL)
        attachment_map = self._build_attachment_map(items)

        # Pass 2 – import posts
        imported_count = 0
        skipped_slugs = []
        errors = []

        for item in items:
            post_type = self._text(item, "wp:post_type")
            if post_type != "post":
                continue

            status = self._text(item, "wp:status")
            if status not in ("publish", "draft"):
                continue

            slug = self._text(item, "wp:post_name") or ""
            if not slug:
                continue

            # Duplicate guard
            if BlogPost.objects.filter(slug=slug).exists():
                skipped_slugs.append(slug)
                continue

            try:
                self._import_post(item, attachment_map, request.user, status)
                imported_count += 1
            except Exception as exc:  # noqa: BLE001
                logger.exception("Error importing post '%s'", slug)
                errors.append({"slug": slug, "error": str(exc)})

        return Response(
            {
                "imported": imported_count,
                "skipped_duplicates": skipped_slugs,
                "errors": errors,
            },
            status=200,
        )

    # ------------------------------------------------------------------
    # Pass 1: Attachment map
    # ------------------------------------------------------------------
    def _build_attachment_map(self, items):
        """Map WordPress attachment post-IDs to their URLs.

        Tries ``wp:attachment_url`` first; falls back to ``<guid>``
        so we never lose a mapping.
        """
        attachment_map = {}
        ns = self.NS
        for item in items:
            if self._text(item, "wp:post_type") == "attachment":
                post_id = self._text(item, "wp:post_id")
                if not post_id:
                    continue

                # Primary: wp:attachment_url
                url_node = item.find("wp:attachment_url", ns)
                if url_node is not None and url_node.text:
                    attachment_map[post_id] = url_node.text.strip()
                else:
                    # Fallback: <guid>
                    guid_node = item.find("guid")
                    if guid_node is not None and guid_node.text:
                        attachment_map[post_id] = guid_node.text.strip()

        return attachment_map

    # ------------------------------------------------------------------
    # Pass 2: Import a single post
    # ------------------------------------------------------------------
    def _import_post(self, item, attachment_map, author, status):
        ns = self.NS

        title = self._plain(item, "title")
        slug = self._text(item, "wp:post_name")
        raw_content = self._text(item, "content:encoded") or ""
        date_str = self._text(item, "wp:post_date")

        published_date = None
        if date_str:
            try:
                parsed_dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                published_date = make_aware(parsed_dt)
            except ValueError:
                published_date = None

        # --- Post-meta extraction ---
        thumbnail_id = None
        meta_title = ""
        meta_description = ""
        faq_json_str = ""

        for meta in item.findall("wp:postmeta", ns):
            key = self._text(meta, "wp:meta_key")
            value = self._text(meta, "wp:meta_value") or ""
            if key == "_thumbnail_id":
                thumbnail_id = value
            elif key == "rank_math_title":
                meta_title = value
            elif key == "rank_math_description":
                meta_description = value
            elif key == "saswp_custom_schema_field":
                faq_json_str = value

        # --- Rewrite links, remove FAQ HTML, download inline images ---
        cleaned_content = self._clean_html_content(raw_content)

        # --- Category (ForeignKey – take the first one) ---
        category_obj = None
        for cat_node in item.findall("category"):
            if cat_node.get("domain") == "category":
                cat_name = cat_node.text or ""
                cat_slug = cat_node.get("nicename", "")
                if cat_name:
                    category_obj, _ = Category.objects.get_or_create(
                        slug=slugify(cat_slug) or slugify(cat_name),
                        defaults={"name": cat_name},
                    )
                break  # only first category

        # --- Tags (M2M) ---
        tag_objects = []
        for cat_node in item.findall("category"):
            if cat_node.get("domain") == "post_tag":
                tag_name = cat_node.text or ""
                tag_slug = cat_node.get("nicename", "")
                if tag_name:
                    tag_obj, _ = Tag.objects.get_or_create(
                        slug=slugify(tag_slug) or slugify(tag_name),
                        defaults={"name": tag_name},
                    )
                    tag_objects.append(tag_obj)

        raw_excerpt = self._text(item, "excerpt:encoded") or ""
        # --- Build the BlogPost ---
        post = BlogPost(
            title=title[:200] if title else "Untitled",
            slug=slug,
            content=cleaned_content,
            excerpt=raw_excerpt,
            status=status,
            published_date=published_date,
            author=author,
            category=category_obj,
            meta_title=(meta_title or "")[:60],
            meta_description=(meta_description or "")[:160],
        )

        # --- Featured image download ---
        featured_image_url = attachment_map.get(thumbnail_id) if thumbnail_id else None
        if featured_image_url:
            self._download_featured_image(post, featured_image_url)

        post.save()

        # Set M2M after save
        if tag_objects:
            post.tags.set(tag_objects)

        # --- FAQs ---
        self._create_faqs(post, faq_json_str)

    # ------------------------------------------------------------------
    # HTML content cleaner  (BeautifulSoup)
    # ------------------------------------------------------------------
    OLD_WP_DOMAIN = "https://blog.rsexpressparking.com/"
    NEW_DOMAIN = "https://rsexpressparking.com/"

    def _clean_html_content(self, html_content):
        """Process raw WordPress HTML content:

        1. **Rewrite internal links** – ``<a>`` hrefs pointing to
           ``blog.rsexpressparking.com/{slug}`` become
           ``rsexpressparking.com/blog/{slug}``.
        2. **Remove hardcoded FAQ section** – finds the ``<h2>`` whose
           text contains "faq" and strips it together with every
           subsequent sibling (the ``<h3>``/``<p>`` Q&A pairs).
        3. **Download & rewrite inline images** – images whose ``src``
           references ``blog.rsexpressparking.com`` or
           ``wp-content/uploads`` are downloaded to ``default_storage``
           and their ``src`` is rewritten.  ``srcset`` / ``data-srcset``
           attributes are removed.
        """
        if not html_content:
            return html_content

        soup = BeautifulSoup(html_content, "html.parser")

        # ----- 1. Rewrite internal links -----
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith(self.OLD_WP_DOMAIN):
                a_tag["href"] = href.replace(
                    self.OLD_WP_DOMAIN, self.NEW_DOMAIN, 1
                )

        # ----- 2. Remove hardcoded FAQ section -----
        faq_h2 = None
        for h2 in soup.find_all("h2"):
            if "faq" in h2.get_text(separator=" ", strip=True).lower():
                faq_h2 = h2
                break

        if faq_h2:
            # Remove every sibling after the FAQ heading (questions & answers)
            for sibling in list(faq_h2.find_next_siblings()):
                sibling.extract()
            # Remove the heading itself
            faq_h2.extract()

        # ----- 3. Download & rewrite inline images -----
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if not src:
                continue

            # Only rewrite images from old WP site
            if "blog.rsexpressparking.com" not in src and "wp-content/uploads" not in src:
                continue

            try:
                img_content = download_image_with_retry(src)
                if not img_content:
                    logger.warning("Could not download inline image (retries exhausted): %s", src)
                    continue

                # Build a safe filename from the URL path
                parsed = urlparse(src)
                filename = os.path.basename(parsed.path) or "inline_image.jpg"
                # Sanitise: keep only alphanumeric, dots, hyphens, underscores
                filename = "".join(
                    c if (c.isalnum() or c in ".-_") else "_" for c in filename
                )

                saved_path = default_storage.save(
                    f"blog/inline/{filename}",
                    ContentFile(img_content),
                )

                # Rewrite the src to point at our local storage URL
                img["src"] = default_storage.url(saved_path)

                # Remove srcset so the browser doesn't fetch old WP thumbnails
                if img.get("srcset"):
                    del img["srcset"]
                if img.get("data-srcset"):
                    del img["data-srcset"]

            except Exception:  # noqa: BLE001
                logger.warning("Could not download inline image: %s", src)
                # Keep the original src – don't break the content

        return str(soup)

    # ------------------------------------------------------------------
    # Featured image downloader
    # ------------------------------------------------------------------
    def _download_featured_image(self, post, image_url):
        """Download image from URL and attach to ``post.featured_image``."""
        try:
            img_content = download_image_with_retry(image_url)
            if not img_content:
                logger.warning("Could not download featured image (retries exhausted): %s", image_url)
                return

            parsed = urlparse(image_url)
            filename = os.path.basename(parsed.path) or "featured.jpg"
            post.featured_image.save(
                filename,
                ContentFile(img_content),
                save=False,  # we call post.save() afterwards
            )
        except Exception:  # noqa: BLE001
            logger.warning("Could not download featured image: %s", image_url)

    # ------------------------------------------------------------------
    # FAQ creator
    # ------------------------------------------------------------------
    def _create_faqs(self, post, faq_json_str):
        """Parse the SASWP custom schema JSON and create BlogFAQ objects."""
        if not faq_json_str:
            return

        try:
            schema = json.loads(faq_json_str)
        except (json.JSONDecodeError, TypeError):
            return

        # The schema may be a dict or a list; handle both
        entities = []
        if isinstance(schema, dict):
            entities = schema.get("mainEntity", [])
        elif isinstance(schema, list):
            for entry in schema:
                if isinstance(entry, dict):
                    entities.extend(entry.get("mainEntity", []))

        for idx, entity in enumerate(entities):
            question = ""
            answer = ""
            if isinstance(entity, dict):
                question = entity.get("name", "") or entity.get("text", "")
                accepted = entity.get("acceptedAnswer", {})
                if isinstance(accepted, dict):
                    answer = accepted.get("text", "")

            if question and answer:
                BlogFAQ.objects.create(
                    post=post,
                    question=question[:255],
                    answer=answer,
                    order=idx,
                )

    # ------------------------------------------------------------------
    # XML helpers
    # ------------------------------------------------------------------
    def _text(self, element, tag):
        """Get text content of a namespaced child element."""
        node = element.find(tag, self.NS)
        return node.text.strip() if node is not None and node.text else ""

    def _plain(self, element, tag):
        """Get text of a non-namespaced child element."""
        node = element.find(tag)
        return node.text.strip() if node is not None and node.text else ""

