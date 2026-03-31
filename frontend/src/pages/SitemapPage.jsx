import React, { useEffect, useState } from "react";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const SitemapPage = () => {
  const [data, setData] = useState({ static_pages: [], categories: [], blogs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/blogs/public/html-sitemap-data/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load sitemap data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="sitemap-page-wrapper" style={{ padding: "60px 0" }}>
      <Helmet>
        <title>HTML Sitemap | RS Express Parking</title>
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Container>
        <h1 className="mb-5 text-center" style={{ color: "var(--primary-dark, #010659)", fontWeight: "bold" }}>
          Sitemap
        </h1>

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: "var(--primary-dark, #010659)" }} />
          </div>
        )}

        {error && (
          <Alert variant="danger" className="text-center">
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Row className="gy-4">
            {/* Main Pages */}
            <Col md={4}>
              <h3 className="h5 mb-3" style={{ borderBottom: "2px solid #eee", paddingBottom: "10px", color: "var(--primary-dark, #010659)" }}>
                Main Pages
              </h3>
              <ul className="list-unstyled">
                {data.static_pages?.map((item, idx) => (
                  <li key={idx} className="mb-2">
                    <Link to={item.path} className="text-decoration-none" style={{ color: "var(--primary-dark, #010659)" }}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Col>

            {/* Blog Categories */}
            <Col md={4}>
              <h3 className="h5 mb-3" style={{ borderBottom: "2px solid #eee", paddingBottom: "10px", color: "var(--primary-dark, #010659)" }}>
                Blog Categories
              </h3>
              <ul className="list-unstyled">
                <li className="mb-2">
                    <Link to="/blog" className="text-decoration-none fw-bold" style={{ color: "var(--primary-dark, #010659)" }}>
                      All Blogs
                    </Link>
                </li>
                {data.categories?.map((item, idx) => (
                  <li key={idx} className="mb-2">
                    <Link to={item.path} className="text-decoration-none" style={{ color: "var(--primary-dark, #010659)" }}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Col>

            {/* Articles */}
            <Col md={4}>
              <h3 className="h5 mb-3" style={{ borderBottom: "2px solid #eee", paddingBottom: "10px", color: "var(--primary-dark, #010659)" }}>
                Articles
              </h3>
              <ul className="list-unstyled">
                {data.blogs?.map((item, idx) => (
                  <li key={idx} className="mb-2">
                    <Link to={item.path} className="text-decoration-none" style={{ color: "var(--primary-dark, #010659)" }}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default SitemapPage;
