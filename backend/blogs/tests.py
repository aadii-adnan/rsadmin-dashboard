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


class AdminBlogFaqFilteringTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = get_user_model().objects.create_user(
            username="blog_manager",
            email="manager@example.com",
            password="pass1234",
            is_manager=True,
        )
        self.client.force_authenticate(user=self.manager)

        self.category = Category.objects.create(name="Airport", slug="airport")
        self.post_one = BlogPost.objects.create(
            title="Post One",
            slug="post-one",
            content="<p>One</p>",
            status="draft",
            author=self.manager,
            category=self.category,
        )
        self.post_two = BlogPost.objects.create(
            title="Post Two",
            slug="post-two",
            content="<p>Two</p>",
            status="draft",
            author=self.manager,
            category=self.category,
        )

        self.faq_one = BlogFAQ.objects.create(
            post=self.post_one,
            question="Question one?",
            answer="<p>Answer one</p>",
            is_active=True,
            order=1,
        )
        self.faq_two = BlogFAQ.objects.create(
            post=self.post_two,
            question="Question two?",
            answer="<p>Answer two</p>",
            is_active=True,
            order=2,
        )

    def _extract_results(self, data):
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        return data

    def test_admin_faq_list_without_post_filter_returns_all(self):
        response = self.client.get("/api/blogs/admin/faqs/")
        self.assertEqual(response.status_code, 200)

        payload = self._extract_results(response.data)
        self.assertEqual(len(payload), 2)

        faq_ids = {item["id"] for item in payload}
        self.assertEqual(faq_ids, {self.faq_one.id, self.faq_two.id})

    def test_admin_faq_list_with_post_filter_returns_only_matching_post(self):
        response = self.client.get("/api/blogs/admin/faqs/", {"post": self.post_one.id})
        self.assertEqual(response.status_code, 200)

        payload = self._extract_results(response.data)
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], self.faq_one.id)
        self.assertEqual(payload[0]["post"], self.post_one.id)


class AdminBlogPostListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = get_user_model().objects.create_user(
            username="post_manager",
            email="post-manager@example.com",
            password="pass1234",
            first_name="Post",
            last_name="Manager",
            is_manager=True,
        )
        self.client.force_authenticate(user=self.manager)
        self.airport_category = Category.objects.create(name="Airport", slug="admin-airport")
        self.travel_category = Category.objects.create(name="Travel", slug="admin-travel")
        self.tag = Tag.objects.create(name="Featured", slug="admin-featured")
        self.now = timezone.now()

        self.posts = []
        for index in range(30):
            post = BlogPost.objects.create(
                title=f"Dashboard Post {index:02d}",
                slug=f"dashboard-post-{index:02d}",
                content="<p>" + (f"Large body {index}. " * 300) + "</p>",
                excerpt=f"Excerpt {index}",
                featured_image="blog/images/large-image.jpg",
                status="publish" if index % 2 == 0 else "draft",
                published_date=self.now + timedelta(minutes=index),
                author=self.manager,
                category=self.airport_category if index % 3 else self.travel_category,
                meta_title=f"Meta title {index}",
                meta_description=f"Meta description {index}",
            )
            post.tags.add(self.tag)
            BlogFAQ.objects.create(
                post=post,
                question=f"Question {index}?",
                answer=f"Answer {index}",
            )
            self.posts.append(post)

    def test_admin_list_is_paginated_and_lightweight(self):
        response = self.client.get("/api/blogs/admin/posts/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 30)
        self.assertEqual(len(response.data["results"]), 25)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])
        self.assertEqual(
            set(response.data["results"][0]),
            {"id", "title", "slug", "category", "status", "author_name", "published_date"},
        )
        self.assertEqual(response.data["results"][0]["title"], "Dashboard Post 29")

        second_page = self.client.get("/api/blogs/admin/posts/", {"page": 2})
        self.assertEqual(second_page.status_code, 200)
        self.assertEqual(len(second_page.data["results"]), 5)
        self.assertIsNone(second_page.data["next"])
        self.assertIsNotNone(second_page.data["previous"])

    def test_admin_list_applies_search_category_status_and_ordering(self):
        response = self.client.get(
            "/api/blogs/admin/posts/",
            {
                "search": "Post 12",
                "category": self.travel_category.id,
                "status": "publish",
                "ordering": "published_date",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Dashboard Post 12")

        ascending = self.client.get(
            "/api/blogs/admin/posts/",
            {"status": "draft", "ordering": "published_date"},
        )
        dates = [item["published_date"] for item in ascending.data["results"]]
        self.assertEqual(dates, sorted(dates))
        self.assertTrue(all(item["status"] == "draft" for item in ascending.data["results"]))

    def test_admin_retrieve_keeps_full_editor_payload(self):
        post = self.posts[0]
        response = self.client.get(f"/api/blogs/admin/posts/{post.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("content", response.data)
        self.assertIn("tags", response.data)
        self.assertIn("featured_image", response.data)
        self.assertIn("meta_title", response.data)

    def test_admin_list_requires_manager_or_admin_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/blogs/admin/posts/")
        self.assertIn(response.status_code, {401, 403})
