import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner,
} from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import BlogCard, { BlogCardSkeleton } from "../components/Blog/BlogCard";
import "./Blog.css"; // Import the strict Brand UI styles

const BLOG_PUBLIC_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/public`;
const SITE_URL = "https://rsexpressparking.com";

function BlogList() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const [count, setCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPageUrl, setPrevPageUrl] = useState(null);

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchCategories() {
      setLoadingCategories(true);
      try {
        const response = await fetch(`${BLOG_PUBLIC_BASE}/categories/`);
        if (!response.ok) {
          throw new Error("Failed to load categories.");
        }

        const data = await response.json();
        const categoryList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        if (mounted) {
          setCategories(categoryList);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load categories.");
        }
      } finally {
        if (mounted) {
          setLoadingCategories(false);
        }
      }
    }

    fetchCategories();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchPosts() {
      setLoadingPosts(true);
      setError("");

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (selectedCategory) {
          params.set("category", selectedCategory);
        }
        if (debouncedSearchTerm) {
          params.set("search", debouncedSearchTerm);
        }

        const response = await fetch(`${BLOG_PUBLIC_BASE}/posts/?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load blog posts.");
        }

        const data = await response.json();

        if (mounted) {
          setPosts(Array.isArray(data?.results) ? data.results : []);
          setCount(Number(data?.count) || 0);
          setNextPageUrl(data?.next || null);
          setPrevPageUrl(data?.previous || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load blog posts.");
          setPosts([]);
          setCount(0);
          setNextPageUrl(null);
          setPrevPageUrl(null);
        }
      } finally {
        if (mounted) {
          setLoadingPosts(false);
        }
      }
    }

    fetchPosts();

    return () => {
      mounted = false;
    };
  }, [page, selectedCategory, debouncedSearchTerm]);

  const totalPages = useMemo(() => {
    if (!count) {
      return 1;
    }
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [count]);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 10;
    let start = Math.max(1, page - 4);
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let current = start; current <= end; current += 1) {
      pages.push(current);
    }
    return pages;
  }, [page, totalPages]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setPage(1);
  };

  const isLoading = loadingPosts || loadingCategories;

  /* ── Map backend API pagination URLs to frontend canonical URLs ── */
  const paginationNext = useMemo(() => {
    if (!nextPageUrl) return null;
    try {
      const apiUrl = new URL(nextPageUrl);
      const pageParam = apiUrl.searchParams.get("page");
      return pageParam ? `${SITE_URL}/blog?page=${pageParam}` : `${SITE_URL}/blog`;
    } catch {
      return null;
    }
  }, [nextPageUrl]);

  const paginationPrev = useMemo(() => {
    if (!prevPageUrl) return null;
    try {
      const apiUrl = new URL(prevPageUrl);
      const pageParam = apiUrl.searchParams.get("page");
      return pageParam ? `${SITE_URL}/blog?page=${pageParam}` : `${SITE_URL}/blog`;
    } catch {
      return null;
    }
  }, [prevPageUrl]);

  /* ── JSON-LD Structured Data ── */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RS Express Parking",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/logo.png`,
    sameAs: [
      "https://www.facebook.com/rsexpressparking",
      "https://www.instagram.com/rsexpressparking",
    ],
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RS Express Parking",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Helmet>
        <title>Latest Travel Tips &amp; Parking Insights | RS Express Parking</title>
        <meta
          name="description"
          content="Discover expert travel tips, Dublin airport parking guides, and parking insights from RS Express Parking. Stay informed for a stress-free journey."
        />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        {paginationNext && <link rel="next" href={paginationNext} />}
        {paginationPrev && <link rel="prev" href={paginationPrev} />}
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(webSiteSchema)}
        </script>
      </Helmet>

      <div className="blog-hero-banner">
        <div className="blog-hero-overlay">
          <h1 className="blog-hero-title">Latest Travel Tips & Parking Insights</h1>
          <p className="blog-hero-subtitle">Stay updated with expert travel tips, airport parking insights, and hassle-free booking guides to make your journey smoother and stress-free.</p>
        </div>
      </div>
      
      <div className="blog-page-wrapper">
        <Container className="pt-5">

          {error ? <Alert variant="danger">{error}</Alert> : null}

          {isLoading ? (
            <Row className="g-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Col key={i} lg={4} md={6} sm={12}>
                  <BlogCardSkeleton />
                </Col>
              ))}
            </Row>
          ) : (
            <>
              <Row className="g-5">
                {posts.length ? (
                  posts.map((post) => (
                    <Col key={post.id} lg={4} md={6} sm={12}>
                      <BlogCard
                        title={post.title}
                        slug={post.slug}
                        featured_image={post.featured_image}
                        featured_image_responsive={post.featured_image_responsive}
                        excerpt={post.excerpt_text || post.excerpt || "Read more about this topic..."}
                        categoryName={post.category?.name}
                        published_date={post.published_date}
                        author={post.author_name}
                      />
                    </Col>
                  ))
                ) : (
                  <Col xs={12}>
                    <Alert variant="info" className="mb-0">
                      No blog posts found for the selected filters.
                    </Alert>
                  </Col>
                )}
              </Row>

              {posts.length ? (
                <div className="blog-pagination-wrapper">
                  <button
                    className="blog-pagination-link"
                    disabled={!prevPageUrl || page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    &laquo; Previous
                  </button>

                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      className={`blog-pagination-link ${pageNumber === page ? "active" : ""}`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    className="blog-pagination-link"
                    disabled={!nextPageUrl || page >= totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next &raquo;
                  </button>
                </div>
              ) : null}
            </>
          )}
        </Container>
      </div>
    </>
  );
}

export default BlogList;
