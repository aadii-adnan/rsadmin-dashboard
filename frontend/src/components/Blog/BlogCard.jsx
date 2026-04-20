import React from "react";
import { Link } from "react-router-dom";
import "../../pages/Blog.css";

export function BlogCardSkeleton() {
  return (
    <div className="blog-card-flat">
      <div className="shimmer-wrapper shimmer-block shimmer-img" />
      <div className="shimmer-wrapper shimmer-block shimmer-title" />
      <div className="shimmer-wrapper shimmer-block shimmer-text short shimmer-mb-lg" />
      <div className="shimmer-wrapper shimmer-block shimmer-text" />
      <div className="shimmer-wrapper shimmer-block shimmer-text shimmer-w-80" />
    </div>
  );
}

function BlogCard({ title, slug, featured_image, featured_image_responsive, excerpt, published_date }) {
  const publishedLabel = published_date
    ? new Date(published_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const imageSrc = featured_image_responsive?.src || featured_image || "";
  const imageSrcSet = featured_image_responsive?.srcset || undefined;
  const imageSizes = featured_image_responsive?.sizes || "(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw";
  const imageWidth = featured_image_responsive?.width || undefined;
  const imageHeight = featured_image_responsive?.height || undefined;

  return (
    <Link to={`/${slug}`} className="text-decoration-none">
      <div className="blog-card-flat">
        {imageSrc ? (
          <img
            src={imageSrc}
            srcSet={imageSrcSet}
            sizes={imageSizes}
            width={imageWidth}
            height={imageHeight}
            className="blog-card-img"
            alt={title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="blog-card-img blog-card-img-fallback" aria-hidden="true" />
        )}
        <h4 className="blog-card-title">{title}</h4>
        <span className="blog-card-date">{publishedLabel}</span>
        <p className="blog-card-excerpt">{excerpt || 'Read more about this topic...'}</p>
      </div>
    </Link>
  );
}

export default BlogCard;
