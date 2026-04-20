import hashlib
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from blogs.models import BlogPost


class Command(BaseCommand):
    help = "Detect and optionally clean duplicate blog media files created by repeated imports."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply reference rewrites and delete duplicate files.",
        )

    def handle(self, *args, **options):
        media_root = Path(settings.MEDIA_ROOT)
        target_dirs = [media_root / "blog" / "images", media_root / "blog" / "inline"]
        all_files = []

        for target_dir in target_dirs:
            if not target_dir.exists():
                continue
            all_files.extend(path for path in target_dir.rglob("*") if path.is_file())

        if not all_files:
            self.stdout.write(self.style.WARNING("No media files found under media/blog/images or media/blog/inline."))
            return

        grouped_by_hash = {}
        for file_path in all_files:
            digest = hashlib.sha256(file_path.read_bytes()).hexdigest()
            grouped_by_hash.setdefault(digest, []).append(file_path)

        duplicates = {
            digest: paths
            for digest, paths in grouped_by_hash.items()
            if len(paths) > 1
        }

        duplicate_count = sum(len(paths) - 1 for paths in duplicates.values())
        duplicate_wasted_bytes = sum(sum(path.stat().st_size for path in paths[1:]) for paths in duplicates.values())

        self.stdout.write(f"Duplicate groups: {len(duplicates)}")
        self.stdout.write(f"Duplicate files: {duplicate_count}")
        self.stdout.write(f"Potential reclaimed bytes: {duplicate_wasted_bytes}")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry run complete. Re-run with --apply to rewrite references and delete duplicates."))
            return

        replace_map = {}
        for paths in duplicates.values():
            ordered = sorted(paths, key=lambda item: (len(str(item)), str(item)))
            canonical = ordered[0]
            canonical_rel = canonical.relative_to(media_root).as_posix()
            for duplicate in ordered[1:]:
                duplicate_rel = duplicate.relative_to(media_root).as_posix()
                replace_map[duplicate_rel] = canonical_rel

        posts = BlogPost.objects.all().only("id", "content", "featured_image", "open_graph_image")
        updated_posts = 0

        for post in posts:
            changed_fields = []

            featured_name = getattr(post.featured_image, "name", "")
            if featured_name in replace_map:
                post.featured_image.name = replace_map[featured_name]
                changed_fields.append("featured_image")

            og_name = getattr(post.open_graph_image, "name", "")
            if og_name in replace_map:
                post.open_graph_image.name = replace_map[og_name]
                changed_fields.append("open_graph_image")

            if post.content:
                updated_content = post.content
                for duplicate_rel, canonical_rel in replace_map.items():
                    duplicate_url = f"{settings.MEDIA_URL}{duplicate_rel}"
                    canonical_url = f"{settings.MEDIA_URL}{canonical_rel}"
                    if duplicate_url in updated_content:
                        updated_content = updated_content.replace(duplicate_url, canonical_url)

                if updated_content != post.content:
                    post.content = updated_content
                    changed_fields.append("content")

            if changed_fields:
                post.save(update_fields=sorted(set(changed_fields)))
                updated_posts += 1

        deleted_files = 0
        for duplicate_rel in replace_map:
            duplicate_abs = media_root / duplicate_rel
            if duplicate_abs.exists():
                duplicate_abs.unlink()
                deleted_files += 1

        self.stdout.write(self.style.SUCCESS("Duplicate cleanup applied."))
        self.stdout.write(f"Posts updated: {updated_posts}")
        self.stdout.write(f"Files deleted: {deleted_files}")
