import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Col,
  Container,
  Row,
  Spinner
} from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import FAQSection from "../components/HomePage/FAQSection";
import "./Blog.css"; // Ensure styling is applied

const BLOG_PUBLIC_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/public`;
const SITE_URL = "https://rsexpressparking.com";
const LOGO_URL = `${SITE_URL}/assets/logo.png`;

function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchPost() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${BLOG_PUBLIC_BASE}/posts/${slug}/`);
        if (!response.ok) {
          throw new Error("Failed to load blog post.");
        }

        const data = await response.json();
        
        // Fetch related posts
        const relatedRes = await fetch(`${BLOG_PUBLIC_BASE}/posts/`);
        let relatedData = [];
        if (relatedRes.ok) {
          const resJson = await relatedRes.json();
          // Assume response follows DRF pagination (results array) or returns array directly
          const postsArray = Array.isArray(resJson.results) ? resJson.results : Array.isArray(resJson) ? resJson : [];
          relatedData = postsArray.filter(p => p.slug !== slug).slice(0, 3);
        }

        if (mounted) {
          setPost(data);
          setRelatedPosts(relatedData);
        }
      } catch (err) {
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
    };
  }, [slug]);

  /* ── Dynamic Link Parsing ── */
  const contentRef = useRef(null);

  useEffect(() => {
    if (!post || !contentRef.current) return;

    const anchors = contentRef.current.querySelectorAll("a");
    const currentHost = window.location.hostname;

    anchors.forEach((anchor) => {
      try {
        const href = anchor.getAttribute("href") || "";
        // Relative paths or same-host links are internal
        const isRelative = href.startsWith("/") || href.startsWith("#") || href.startsWith(".");
        let isInternal = isRelative;

        if (!isRelative && href.startsWith("http")) {
          const linkUrl = new URL(href);
          isInternal = linkUrl.hostname === currentHost;
        }

        if (isInternal) {
          anchor.setAttribute("target", "_blank");
          anchor.setAttribute("rel", "noopener noreferrer");
        } else {
          anchor.setAttribute("rel", "nofollow noopener noreferrer");
        }
      } catch {
        // Malformed URL — treat as external for safety
        anchor.setAttribute("rel", "nofollow noopener noreferrer");
      }
    });
  }, [post]);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
      </Container>
    );
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
    image: post.featured_image || undefined,
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
  const seoDescription =
    post.meta_description || post.excerpt || stripHtmlAndTruncate(post.content, 160);
  const canonicalUrl = post.canonical_url || `${SITE_URL}/${slug}`;
  const ogImage = post.open_graph_image || post.featured_image || "";

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
              <h1 style={{ color: "var(--primary-dark)" }}>{post.title}</h1>
              <p className="lead">{post.excerpt || stripHtmlAndTruncate(post.content, 140)}</p>
              <div style={{ color: "var(--primary-light)" }}>
                {publishedLabel} | By {post.author_name || "Team"}
              </div>
            </div>
          </Col>
          <Col lg={6}>
            <div className="blog-detail-image-side">
              {post.featured_image ? (
                <img src={post.featured_image} alt={post.title} />
              ) : (
                <div style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: 'var(--primary-dark)' }} />
              )}
            </div>
          </Col>
        </Row>
      </div>

      <Container className="py-5">
        <Row>
          {/* Main Content Content */}
          <Col lg={8} className="mx-auto pe-lg-5 mb-5 mb-lg-0">
            <article>
              <section
                ref={contentRef}
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: post.content || "" }}
              />

              <style>{`
                .blog-content img,
                .blog-content video,
                .blog-content iframe {
                  max-width: 100%;
                  height: auto;
                  border-radius: 8px;
                  margin: 1.5rem 0;
                }
                .blog-content table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.5rem 0;
                  display: block;
                  overflow-x: auto;
                }
                .blog-content table td,
                .blog-content table th {
                  border: 1px solid #dee2e6;
                  padding: 0.75rem;
                }
                .blog-content h1,
                .blog-content h2,
                .blog-content h3,
                .blog-content h4,
                .blog-content h5,
                .blog-content h6 {
                  color: var(--primary-dark);
                  margin-top: 2rem;
                  margin-bottom: 1rem;
                  font-weight: 700;
                  font-family: 'Urbanist', sans-serif;
                }
                .blog-content p,
                .blog-content li {
                  line-height: 1.8;
                  color: #495057;
                  font-size: 1.05rem;
                  margin-bottom: 1rem;
                }
                .blog-content a {
                  color: var(--primary-light);
                  text-decoration: none;
                }
                .blog-content a:hover {
                  text-decoration: underline;
                }
              `}</style>
            </article>
          </Col>

          {/* Promo Sidebar */}
          <Col lg={4}>
            <div className="promo-sidebar sticky-top" style={{ top: '2rem' }}>
              <h4>Need Reliable Airport Parking?</h4>
              <p>Secure your spot today with RS Express Parking and enjoy a hassle-free travel experience.</p>
              <Link to="/" className="btn-modern mt-3 w-100">
                BOOK YOUR PARKING NOW
              </Link>
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
            <h3 style={{ color: "var(--primary-dark)", fontWeight: "700" }}>More Travel Tips & Insights</h3>
            <Row className="g-4 mt-3">
              {relatedPosts.map((rPost) => (
                <Col key={rPost.id || rPost.slug} lg={4} md={6}>
                  <Link to={`/${rPost.slug}`} className="text-decoration-none">
                    <div className="related-blog-card">
                      {rPost.featured_image ? (
                        <img src={rPost.featured_image} alt={rPost.title} className="related-blog-img" />
                      ) : (
                        <div className="related-blog-img" style={{ backgroundColor: 'var(--primary-dark)' }} />
                      )}
                      <h4 className="related-blog-title">{rPost.title}</h4>
                      <p className="related-blog-excerpt">
                        {rPost.excerpt || stripHtmlAndTruncate(rPost.content, 140)}
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

function stripHtmlAndTruncate(rawHtml = "", limit = 140) {
  const plainText = rawHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plainText.length <= limit) {
    return plainText;
  }
  return `${plainText.slice(0, limit).trim()}...`;
}

export default BlogDetail;
