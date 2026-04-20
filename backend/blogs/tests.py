from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import BlogFAQ, BlogPost, Category, Tag


class PublicBlogApiPerformanceShapeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="writer",
            email="writer@example.com",
            password="pass1234",
            first_name="Blog",
            last_name="Writer",
        )
        self.category = Category.objects.create(name="Travel", slug="travel")
        self.tag = Tag.objects.create(name="Airport", slug="airport")

        self.primary_post = BlogPost.objects.create(
            title="Primary Post",
            slug="primary-post",
            content="<p>" + ("Long content. " * 1200) + "</p>",
            excerpt="A short excerpt for list cards.",
            status="publish",
            published_date=timezone.now(),
            author=self.user,
            category=self.category,
        )
        self.primary_post.tags.add(self.tag)
        BlogFAQ.objects.create(
            post=self.primary_post,
            question="Is parking secure?",
            answer="Yes, it is monitored 24/7.",
            order=1,
            is_active=True,
        )

        for index in range(1, 5):
            BlogPost.objects.create(
                title=f"Related {index}",
                slug=f"related-{index}",
                content="<p>Related content.</p>",
                excerpt=f"Related excerpt {index}",
                status="publish",
                published_date=timezone.now() - timedelta(hours=index),
                author=self.user,
                category=self.category,
            )

    def test_public_blog_list_payload_is_lightweight(self):
        response = self.client.get("/api/blogs/public/posts/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["results"])

        first_item = response.data["results"][0]
        self.assertNotIn("content", first_item)
        self.assertNotIn("tags", first_item)
        self.assertNotIn("faqs", first_item)
        self.assertIn("excerpt_text", first_item)

    def test_public_blog_detail_payload_is_full(self):
        response = self.client.get("/api/blogs/public/posts/primary-post/")
        self.assertEqual(response.status_code, 200)

        self.assertIn("content", response.data)
        self.assertIn("tags", response.data)
        self.assertIn("faqs", response.data)

    def test_related_posts_endpoint_uses_limit_and_exclusion(self):
        response = self.client.get(
            "/api/blogs/public/posts/related/",
            {"slug": "primary-post", "exclude_slug": "related-1", "limit": 2},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        returned_slugs = {item["slug"] for item in response.data}
        self.assertNotIn("primary-post", returned_slugs)
        self.assertNotIn("related-1", returned_slugs)
