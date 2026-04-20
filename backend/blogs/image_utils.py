import hashlib
import io
import os
import posixpath
import re
from pathlib import Path

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError

DEFAULT_RESPONSIVE_WIDTHS = (360, 640, 960, 1280)
IMAGE_PAYLOAD_CACHE_TTL_SECONDS = 86400
WEBP_QUALITY = 82
WEBP_METHOD = 6


def _safe_extension(file_name):
    ext = Path(file_name or "").suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}:
        return ext
    return ".jpg"


def _safe_stem(file_name):
    stem = Path(file_name or "").stem
    normalized = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem).strip("-")
    return normalized or "image"


def _normalize_widths(requested_widths, original_width):
    widths = requested_widths or DEFAULT_RESPONSIVE_WIDTHS
    valid = sorted({int(width) for width in widths if int(width) > 0 and int(width) < original_width})
    if original_width not in valid:
        valid.append(int(original_width))
    return valid or [int(original_width)]


def save_deduplicated_image(content_bytes, original_filename, folder):
    """Save image bytes once based on content hash and return the storage path."""
    digest = hashlib.sha256(content_bytes).hexdigest()[:16]
    ext = _safe_extension(original_filename)
    stem = _safe_stem(original_filename)
    file_name = f"{stem}-{digest}{ext}"
    relative_path = posixpath.join(folder.strip("/"), file_name)

    if not default_storage.exists(relative_path):
        default_storage.save(relative_path, ContentFile(content_bytes))

    return relative_path


def _generate_webp_variants(storage_path, image_bytes, original_width, original_height, requested_widths):
    digest = hashlib.sha256(image_bytes).hexdigest()[:16]
    widths = _normalize_widths(requested_widths, original_width)
    variant_urls = []

    with Image.open(io.BytesIO(image_bytes)) as source_image:
        prepared_source = ImageOps.exif_transpose(source_image)

        for width in widths:
            target_height = max(1, round((original_height * width) / original_width))
            output_path = f"blog/optimized/{digest}/w{width}.webp"

            if not default_storage.exists(output_path):
                resized = prepared_source.copy().resize((width, target_height), Image.Resampling.LANCZOS)
                if resized.mode not in ("RGB", "RGBA"):
                    resized = resized.convert("RGB")

                buffer = io.BytesIO()
                resized.save(
                    buffer,
                    format="WEBP",
                    quality=WEBP_QUALITY,
                    method=WEBP_METHOD,
                    optimize=True,
                )
                default_storage.save(output_path, ContentFile(buffer.getvalue()))

            variant_urls.append((default_storage.url(output_path), width))

    return variant_urls


def build_responsive_payload_for_storage_path(storage_path, requested_widths=None, sizes=None):
    if not storage_path or not default_storage.exists(storage_path):
        return None

    cache_key = f"blog:image:payload:{storage_path}:{','.join(map(str, requested_widths or DEFAULT_RESPONSIVE_WIDTHS))}"
    cached_payload = cache.get(cache_key)
    if cached_payload:
        return cached_payload

    try:
        with default_storage.open(storage_path, "rb") as stored_image:
            image_bytes = stored_image.read()

        with Image.open(io.BytesIO(image_bytes)) as image_obj:
            original_width, original_height = image_obj.size

        if original_width <= 0 or original_height <= 0:
            return None

        responsive_sizes = sizes or "(max-width: 768px) 100vw, 768px"
        variant_urls = _generate_webp_variants(
            storage_path=storage_path,
            image_bytes=image_bytes,
            original_width=original_width,
            original_height=original_height,
            requested_widths=requested_widths,
        )

        payload = {
            "src": default_storage.url(storage_path),
            "srcset": ", ".join(f"{url} {width}w" for url, width in variant_urls),
            "sizes": responsive_sizes,
            "width": original_width,
            "height": original_height,
        }
        cache.set(cache_key, payload, IMAGE_PAYLOAD_CACHE_TTL_SECONDS)
        return payload
    except (FileNotFoundError, OSError, UnidentifiedImageError):
        return None


def build_responsive_image_payload(image_field, requested_widths=None, sizes=None):
    if not image_field:
        return None

    image_name = getattr(image_field, "name", None)
    if not image_name:
        return None

    try:
        return build_responsive_payload_for_storage_path(
            storage_path=image_name,
            requested_widths=requested_widths,
            sizes=sizes,
        )
    except (FileNotFoundError, OSError, ValueError):
        return None


def parse_srcset_widths(*srcset_values):
    widths = set()
    for value in srcset_values:
        if not value:
            continue

        for chunk in str(value).split(","):
            descriptor = chunk.strip().split(" ")
            if len(descriptor) < 2:
                continue

            candidate = descriptor[-1].strip()
            if candidate.endswith("w") and candidate[:-1].isdigit():
                widths.add(int(candidate[:-1]))

    return sorted(widths)
