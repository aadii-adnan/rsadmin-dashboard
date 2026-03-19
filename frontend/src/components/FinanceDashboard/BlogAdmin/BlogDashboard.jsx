import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import customFetch from "../../../auth/fetch";
import "./BlogAdmin.css";

const BLOG_API_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/admin`;

function toListPayload(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.results)) {
    return data.results;
  }
  return [];
}

function BlogDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    try {
      const [postsRes, categoriesRes, tagsRes] = await Promise.all([
        customFetch(`${BLOG_API_BASE}/posts/`, { useFinanceJwt: true }),
        customFetch(`${BLOG_API_BASE}/categories/`, { useFinanceJwt: true }),
        customFetch(`${BLOG_API_BASE}/tags/`, { useFinanceJwt: true }),
      ]);

      if (!postsRes?.ok || !categoriesRes?.ok || !tagsRes?.ok) {
        throw new Error("Failed to fetch one or more blog resources.");
      }

      const [postsData, categoriesData, tagsData] = await Promise.all([
        postsRes.json(),
        categoriesRes.json(),
        tagsRes.json(),
      ]);

      setPosts(toListPayload(postsData));
      setCategories(toListPayload(categoriesData));
      setTags(toListPayload(tagsData));
    } catch (err) {
      setError(err.message || "Failed to load blog dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("finance_jwt")) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    fetchAllData();
  }, [navigate]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category.id] = category.name;
    });
    return map;
  }, [categories]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const titleMatch = post.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === "all" ? true : post.status === statusFilter;
      const categoryMatch =
        categoryFilter === "all" ? true : String(post.category) === String(categoryFilter);

      return titleMatch && statusMatch && categoryMatch;
    });
  }, [posts, searchTerm, statusFilter, categoryFilter]);

  const handleDeletePost = async (id) => {
    if (!window.confirm("Delete this post permanently?")) {
      return;
    }

    try {
      const response = await customFetch(`${BLOG_API_BASE}/posts/${id}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to delete post.");
      }

      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (err) {
      setError(err.message || "Could not delete this post.");
    }
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString();
  };

  return (
    <Container fluid className="admin-dashboard-wrapper py-4">
      {/* Header Area */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: 'var(--primary-dark)' }} className="fw-bold m-0">Blog Management</h2>
        <Link to="create" className="btn-modern"> + Add New Post </Link>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters Area */}
      <div className="admin-card">
        <Row className="g-3">
          <Col md={5}>
            <Form.Control
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="publish">Published</option>
              <option value="draft">Draft</option>
            </Form.Select>
          </Col>
          <Col md={1} className="d-grid">
            <Button variant="outline-secondary" onClick={fetchAllData}>
              Refresh
            </Button>
          </Col>
        </Row>
      </div>

      {/* Table Area */}
      <div className="admin-card admin-tabs">
        <Tabs
          id="blog-dashboard-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="posts" title="Posts">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : (
              <Table responsive hover className="admin-table mt-3">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Published At</th>
                    <th style={{ width: "170px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.length ? (
                    filteredPosts.map((post) => (
                      <tr key={post.id}>
                        <td className="fw-semibold">{post.title || "-"}</td>
                        <td>{categoryById[post.category] || "-"}</td>
                        <td>
                          <span className={post.status === 'publish' ? 'status-badge-publish' : 'status-badge-draft'}>
                            {post.status === 'publish' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td>{post.author || "-"}</td>
                        <td>{formatDateTime(post.published_date)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => navigate(`/finance-dashboard/blogs/edit/${post.id}`)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">No posts found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </Tab>
          <Tab eventKey="categories" title="Categories">
            <div className="py-4 text-center text-muted">
              {/* Note: In a real project you might add a full Categories table here. Based on requirement, keeping this minimal or as it was. */}
              Manage categories by editing posts, or implement standalone category manager here.
            </div>
          </Tab>
          <Tab eventKey="tags" title="Tags">
             <div className="py-4 text-center text-muted">
              Manage tags by editing posts, or implement standalone tags manager here.
            </div>
          </Tab>
        </Tabs>
      </div>
    </Container>
  );
}

export default BlogDashboard;
