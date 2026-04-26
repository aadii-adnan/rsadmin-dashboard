import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Col, Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import FAQSection from "../components/HomePage/FAQSection";
import { BlogCardSkeleton } from "../components/Blog/BlogCard";
import "./Blog.css"; // Ensure styling is applied

const BLOG_PUBLIC_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/public`;
const SITE_URL = "https://rsexpressparking.com";
const LOGO_URL = `${SITE_URL}/assets/logo.png`;

function stripHtmlAndTruncate(rawHtml = "", limit = 140) {
  const plainText = rawHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plainText.length <= limit) {
    return plainText;
  }
  return `${plainText.slice(0, limit).trim()}...`;
}

function BlogDetailSkeleton() {
  return (
    <div className="blog-detail-container">
      {/* Split Header */}
      <div className="container-fluid p-0">
        <Row className="g-0 blog-detail-header-split">
          <Col lg={6}>
            <div className="blog-detail-text-side">
              <div className="shimmer-wrapper shimmer-block shimmer-pill badge-pill shimmer-mb-lg" />
              <div className="shimmer-wrapper shimmer-block shimmer-title shimmer-h-36 shimmer-w-90 shimmer-mb-xl" />
              <div className="shimmer-wrapper shimmer-block shimmer-title shimmer-h-36 shimmer-w-60 shimmer-mb-2xl" />
              <div className="shimmer-wrapper shimmer-block shimmer-text" />
              <div className="shimmer-wrapper shimmer-block shimmer-text" />
              <div className="shimmer-wrapper shimmer-block shimmer-text short shimmer-mb-xl" />
              <div className="shimmer-wrapper shimmer-block shimmer-text shimmer-w-30" />
            </div>
          </Col>
          <Col lg={6}>
            <div className="blog-detail-image-side blog-detail-image-side-full">
              <div className="shimmer-wrapper shimmer-block shimmer-img-cover" />
            </div>
          </Col>
        </Row>
      </div>

      {/* Body Section */}
      <Container className="my-5">
        <Row>
          <Col lg={8}>
            <div className="shimmer-wrapper shimmer-block shimmer-title shimmer-w-40 shimmer-mb-2xl" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer-wrapper shimmer-block shimmer-text shimmer-mb-md" />
            ))}
            <br />
            <div className="shimmer-wrapper shimmer-block shimmer-title shimmer-w-30 shimmer-mt-2xl shimmer-mb-lg" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer-wrapper shimmer-block shimmer-text shimmer-mb-md" />
            ))}
            <div className="shimmer-wrapper shimmer-block shimmer-text short" />
          </Col>
          
          {/* Promo Sidebar Skeleton */}
          <Col lg={4}>
            <div className="promo-sidebar sticky-top blog-promo-sticky">
              <div className="shimmer-wrapper shimmer-block shimmer-title shimmer-center shimmer-w-80 shimmer-mb-lg" />
              <div className="shimmer-wrapper shimmer-block shimmer-text shimmer-center shimmer-w-90 shimmer-mb-sm" />
              <div className="shimmer-wrapper shimmer-block shimmer-text short shimmer-center shimmer-w-60 shimmer-mb-xl" />
              <div className="shimmer-wrapper shimmer-block shimmer-btn" />
            </div>
          </Col>
        </Row>
      </Container>

      {/* Related Blogs Section Skeleton */}
      <section className="related-blogs-wrapper py-5">
        <Container>
          <div className="shimmer-wrapper shimmer-block shimmer-title shimmer-w-30 shimmer-mb-2xl" />
          <Row className="g-4 mt-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Col key={`skel-r-${i}`} lg={4} md={6}>
                <BlogCardSkeleton />
              </Col>
            ))}
          </Row>
        </Container>
      </section>
    </div>
  );
}

function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function fetchPost() {
      setLoading(true);
      setError("");

      try {
        const [postResponse, relatedResponse] = await Promise.all([
          fetch(`${BLOG_PUBLIC_BASE}/posts/${slug}/`, { signal: controller.signal }),
          fetch(
            `${BLOG_PUBLIC_BASE}/posts/related/?slug=${encodeURIComponent(slug)}&exclude_slug=${encodeURIComponent(slug)}&limit=3`,
            { signal: controller.signal },
          ),
        ]);

        if (!postResponse.ok) {
          throw new Error("Failed to load blog post.");
        }

        const data = await postResponse.json();

        let relatedData = [];
        if (relatedResponse.ok) {
          const resJson = await relatedResponse.json();
          relatedData = Array.isArray(resJson?.results)
            ? resJson.results
            : Array.isArray(resJson)
              ? resJson
              : [];
        }

        if (mounted) {
          setPost(data);
          setRelatedPosts(relatedData);
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }

        if (mounted) {
          setError(err.message || "Failed to load blog post.");
          setPost(null);
          setRelatedPosts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPost();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [slug]);

  /* ── Dynamic Link Parsing ── */
  const contentRef = useRef(null);

  useEffect(() => {
    if (!post?.content || !contentRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      const root = contentRef.current;
      if (!root) {
        return;
      }

      const currentHost = window.location.hostname;
      const nodes = root.querySelectorAll("a[href], img");

      nodes.forEach((node) => {
        if (node.tagName === "A") {
          const anchor = node;
          try {
            const href = anchor.getAttribute("href") || "";
            const isRelative = href.startsWith("/") || href.startsWith("#") || href.startsWith(".");
            let isInternal = isRelative;

            if (!isRelative && href.startsWith("http")) {
              const linkUrl = new URL(href);
              isInternal = linkUrl.hostname === currentHost;
            }

            if (isInternal) {
              if (anchor.getAttribute("target") !== "_blank") {
                anchor.setAttribute("target", "_blank");
              }
              if (anchor.getAttribute("rel") !== "noopener noreferrer") {
                anchor.setAttribute("rel", "noopener noreferrer");
              }
            } else if (anchor.getAttribute("rel") !== "nofollow noopener noreferrer") {
              anchor.setAttribute("rel", "nofollow noopener noreferrer");
            }
          } catch {
            if (anchor.getAttribute("rel") !== "nofollow noopener noreferrer") {
              anchor.setAttribute("rel", "nofollow noopener noreferrer");
            }
          }
          return;
        }

        if (node.tagName === "IMG") {
          const image = node;
          if (!image.getAttribute("loading")) {
            image.setAttribute("loading", "lazy");
          }
          if (!image.getAttribute("decoding")) {
            image.setAttribute("decoding", "async");
          }
        }
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [post?.content]);

  /* ── Table of Contents: parse HTML string, inject IDs, extract headings ── */
  const { processedHtml, tocHeadings } = useMemo(() => {
    if (!post?.content) return { processedHtml: "", tocHeadings: [] };

    const doc = new DOMParser().parseFromString(post.content, "text/html");
    const h2Elements = Array.from(doc.querySelectorAll("h2"));
    const headings = h2Elements.map((el, idx) => {
      const text = el.textContent.trim();
      const id = `toc-${idx}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}`;
      el.id = id;
      return { id, text };
    });

    return { processedHtml: doc.body.innerHTML, tocHeadings: headings };
  }, [post?.content]);

  /* ── Table of Contents: active heading via IntersectionObserver ── */
  useEffect(() => {
    if (tocHeadings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-10% 0% -80% 0%" }
    );

    tocHeadings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tocHeadings]);

  const scrollToHeading = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (loading) {
    return <BlogDetailSkeleton />;
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Post not found.</Alert>
      </Container>
    );
  }

  const publishedLabel = post.published_date
    ? new Date(post.published_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const activeFaqs = Array.isArray(post.faqs)
    ? post.faqs.filter((faq) => faq.is_active !== false)
    : [];

  const featuredImage = post.featured_image_responsive || null;
  const featuredImageSrc = featuredImage?.src || post.featured_image || "";
  const featuredImageSrcSet = featuredImage?.srcset || undefined;
  const featuredImageSizes = featuredImage?.sizes || "(max-width: 992px) 100vw, 50vw";
  const featuredImageWidth = featuredImage?.width || undefined;
  const featuredImageHeight = featuredImage?.height || undefined;

  /* ── Dynamic Robots Meta ── */
  const robotsParts = [];
  robotsParts.push(post.robots_index === false ? "noindex" : "index");
  robotsParts.push(post.robots_follow === false ? "nofollow" : "follow");
  if (post.robots_noarchive) robotsParts.push("noarchive");
  if (post.robots_nosnippet) robotsParts.push("nosnippet");
  robotsParts.push(
    `max-snippet:${post.max_snippet !== undefined && post.max_snippet !== null ? post.max_snippet : -1}`
  );
  robotsParts.push("max-image-preview:large");
  const robotsContent = robotsParts.join(", ");

  /* ── JSON-LD: Article Schema ── */
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: featuredImageSrc || undefined,
    datePublished: post.published_date || undefined,
    dateModified: post.updated_date || post.published_date || undefined,
    author: {
      "@type": "Person",
      name: post.author_name || post.author || "RS Express Parking",
    },
    publisher: {
      "@type": "Organization",
      name: "RS Express Parking",
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.canonical_url || `${SITE_URL}/${slug}`,
    },
  };

  /* ── JSON-LD: BreadcrumbList Schema ── */
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      ...(post.category?.name
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: post.category.name,
              item: `${SITE_URL}/blog?category=${post.category.slug || ""}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: post.title,
              item: post.canonical_url || `${SITE_URL}/${slug}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 3,
              name: post.title,
              item: post.canonical_url || `${SITE_URL}/${slug}`,
            },
          ]),
    ],
  };

  /* ── JSON-LD: FAQPage Schema (conditional) ── */
  const faqSchema =
    activeFaqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: activeFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  /* ── SEO helper values ── */
  const seoTitle = post.meta_title || post.title;
  const seoDescription = post.meta_description || post.excerpt_text || post.excerpt || stripHtmlAndTruncate(post.content, 160);
  const heroExcerpt = post.excerpt_text || post.excerpt || stripHtmlAndTruncate(post.content, 140);
  const canonicalUrl = post.canonical_url || `${SITE_URL}/${slug}`;
  const ogImage = post.open_graph_image || featuredImageSrc || "";

  return (
    <div className="blog-detail-container">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content={robotsContent} />

        {/* Open Graph */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
      </Helmet>

      {/* Split Header */}
      <div className="container-fluid p-0">
        <Row className="g-0 blog-detail-header-split">
          <Col lg={6}>
            <div className="blog-detail-text-side">
              {post.category?.name && <span className="badge-pill">{post.category.name}</span>}
              <h1 className="blog-detail-title">{post.title}</h1>
              <p className="lead">{heroExcerpt}</p>
              <div className="blog-detail-date">
                {publishedLabel}
              </div>
            </div>
          </Col>
          <Col lg={6}>
            <div className="blog-detail-image-side">
              {featuredImageSrc ? (
                <img
                  src={featuredImageSrc}
                  srcSet={featuredImageSrcSet}
                  sizes={featuredImageSizes}
                  width={featuredImageWidth}
                  height={featuredImageHeight}
                  alt={post.title}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <div className="blog-detail-image-fallback" aria-hidden="true" />
              )}
            </div>
          </Col>
        </Row>
      </div>

      <Container className="py-5">
        <Row>
          {/* Main Content */}
          <Col lg={8} className="mx-auto pe-lg-5 mb-5 mb-lg-0">
            {/* Mobile-only collapsible TOC */}
            {tocHeadings.length >= 2 && (
              <details className="toc-mobile d-lg-none">
                <summary className="toc-mobile-summary">In This Article</summary>
                <ul className="toc-list toc-mobile-list">
                  {tocHeadings.map(({ id, text }) => (
                    <li key={id}>
                      <a href={`#${id}`} onClick={(e) => scrollToHeading(e, id)}>
                        {text}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <article>
              <section
                ref={contentRef}
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            </article>
          </Col>

          {/* Sidebar: Table of Contents + Promo */}
          <Col lg={4}>
            <div className="blog-sidebar-sticky">
              {tocHeadings.length >= 2 && (
                <nav className="toc-sidebar d-none d-lg-block" aria-label="Table of contents">
                  <p className="toc-sidebar-title">In This Article</p>
                  <ul className="toc-list">
                    {tocHeadings.map(({ id, text }) => (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          className={activeId === id ? "active" : ""}
                          onClick={(e) => scrollToHeading(e, id)}
                        >
                          {text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <div className={`promo-sidebar${tocHeadings.length >= 2 ? " mt-4" : ""}`}>
                <h4>Need Reliable Airport Parking?</h4>
                <p>Secure your spot today with RS Express Parking and enjoy a hassle-free travel experience.</p>
                <Link to="/" className="btn-modern mt-3 w-100">
                  BOOK YOUR PARKING NOW
                </Link>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Blog FAQs using global FAQSection */}
      {activeFaqs.length > 0 && (
        <FAQSection faqs={activeFaqs} loading={false} isBlog={true} />
      )}

      {/* Related Blogs Section */}
      {relatedPosts.length > 0 && (
        <section className="related-blogs-wrapper py-5">
          <Container>
            <h3 className="related-blogs-title">More Travel Tips & Insights</h3>
            <Row className="g-4 mt-3">
              {relatedPosts.map((rPost) => (
                <Col key={rPost.id || rPost.slug} lg={4} md={6}>
                  <Link to={`/${rPost.slug}`} className="text-decoration-none">
                    <div className="related-blog-card">
                      {(rPost.featured_image_responsive?.src || rPost.featured_image) ? (
                        <img 
                          src={rPost.featured_image_responsive?.src || rPost.featured_image}
                          srcSet={rPost.featured_image_responsive?.srcset || undefined}
                          sizes={rPost.featured_image_responsive?.sizes || "(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw"}
                          width={rPost.featured_image_responsive?.width || undefined}
                          height={rPost.featured_image_responsive?.height || undefined}
                          alt={rPost.title} 
                          className="related-blog-img" 
                          loading="lazy" 
                          decoding="async" 
                        />
                      ) : (
                        <div className="related-blog-img related-blog-img-fallback" aria-hidden="true" />
                      )}
                      <h4 className="related-blog-title">{rPost.title}</h4>
                      <p className="related-blog-excerpt">
                        {rPost.excerpt_text || rPost.excerpt || "Read more about this topic..."}
                      </p>
                      <span className="related-blog-link">Learn more</span>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          </Container>
        </section>
      )}
    </div>
  );
}

export default BlogDetail;
