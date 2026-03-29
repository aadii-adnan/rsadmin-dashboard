import React from "react";
import { Link } from "react-router-dom";
import "../../pages/Blog.css";

export function BlogCardSkeleton() {
  return (
    <div className="blog-card-flat">
      <div className="shimmer-wrapper shimmer-block shimmer-img" />
      <div className="shimmer-wrapper shimmer-block shimmer-title" />
      <div className="shimmer-wrapper shimmer-block shimmer-text short" style={{ marginBottom: "1rem" }} />
      <div className="shimmer-wrapper shimmer-block shimmer-text" />
      <div className="shimmer-wrapper shimmer-block shimmer-text" style={{ width: "80%" }} />
    </div>
  );
}

function BlogCard({ title, slug, featured_image, excerpt, published_date }) {
  const publishedLabel = published_date
    ? new Date(published_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  return (
    <Link to={`/${slug}`} className="text-decoration-none">
      <div className="blog-card-flat">
        <img
          src={featured_image || "https://via.placeholder.com/800x500"}
          className="blog-card-img"
          alt={title}
          loading="lazy"
          decoding="async"
        />
        <h4 className="blog-card-title">{title}</h4>
        <span className="blog-card-date">{publishedLabel}</span>
        <p className="blog-card-excerpt">{excerpt || 'Read more about this topic...'}</p>
      </div>
    </Link>
  );
}

export default BlogCard;
