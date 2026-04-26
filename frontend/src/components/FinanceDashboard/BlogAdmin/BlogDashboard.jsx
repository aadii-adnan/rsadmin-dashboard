import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaUpload } from "react-icons/fa";
import customFetch from "../../../auth/fetch";
import { useBlogJwtFromUrl } from "../../../auth/useBlogJwtFromUrl";
import "./BlogAdmin.css";

const BLOG_API_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/admin`;

function TableSkeletonRow() {
  return (
    <tr>
      <td><div className="shimmer-wrapper shimmer-block shimmer-title" style={{ width: "80%", marginBottom: 0 }} /></td>
      <td><div className="shimmer-wrapper shimmer-block shimmer-text short" style={{ marginBottom: 0 }} /></td>
      <td><div className="shimmer-wrapper shimmer-block shimmer-pill" style={{ marginBottom: 0 }} /></td>
      <td><div className="shimmer-wrapper shimmer-block shimmer-text short" style={{ marginBottom: 0 }} /></td>
      <td><div className="shimmer-wrapper shimmer-block shimmer-text" style={{ width: "60%", marginBottom: 0 }} /></td>
      <td>
        <div className="table-actions">
          <div className="shimmer-wrapper shimmer-block shimmer-pill" style={{ width: "60px", marginBottom: 0 }} />
          <div className="shimmer-wrapper shimmer-block shimmer-pill" style={{ width: "60px", marginBottom: 0 }} />
          <div className="shimmer-wrapper shimmer-block shimmer-pill" style={{ width: "60px", marginBottom: 0 }} />
        </div>
      </td>
    </tr>
  );
}

function toListPayload(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.results)) {
    return data.results;
  }
  return [];
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 255);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function BlogDashboard() {
  useBlogJwtFromUrl();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingTagId, setEditingTagId] = useState(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const [tagForm, setTagForm] = useState({
    name: "",
    slug: "",
  });

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
    // 1. Check Auth first
    if (!localStorage.getItem("finance_jwt")) {
      navigate("/unauthorized", { replace: true });
      return; // Stop execution immediately
    }

    // 2. If Auth passes, fetch the data
    fetchAllData();
  }, [navigate]); // navigate is the only external dependency needed here

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category.id] = category.name;
    });
    return map;
  }, [categories]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const titleMatch = post.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const statusMatch = statusFilter === "all" ? true : post.status === statusFilter;
      const categoryMatch =
        categoryFilter === "all" ? true : String(post.category) === String(categoryFilter);

      return titleMatch && statusMatch && categoryMatch;
    });
  }, [posts, debouncedSearchTerm, statusFilter, categoryFilter]);

  const tableRows = useMemo(() => {
    if (!filteredPosts.length) {
      return (
        <tr>
          <td colSpan="6" className="text-center py-4">No posts found.</td>
        </tr>
      );
    }
    return filteredPosts.map((post) => (
      <tr key={post.id}>
        <td className="fw-semibold"><span className="table-title-link">{post.title || "-"}</span></td>
        <td>{categoryById[post.category] || "-"}</td>
        <td>
          <span className={`status-badge-${post.status === 'publish' ? 'publish' : post.status === 'scheduled' ? 'scheduled' : 'draft'}`}>
            {post.status === 'publish' ? 'Published' : post.status === 'scheduled' ? 'Scheduled' : 'Draft'}
          </span>
        </td>
        <td>{post.author_name || post.author || "-"}</td>
        <td>{formatDateTime(post.published_date)}</td>
        <td>
          <div className="table-actions">
            <button
              type="button"
              className="btn-admin-outline btn-admin-sm"
              onClick={() => navigate(`/blog-admin/edit/${post.id}`)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn-admin-outline btn-admin-sm"
              onClick={() => handleDeletePost(post.id)}
            >
              Delete
            </button>
            <button
              type="button"
              className="btn-admin-outline btn-admin-sm"
              disabled={post.status !== "publish" || !post.slug}
              onClick={() => window.open(`/${post.slug}`, "_blank", "noopener,noreferrer")}
            >
              View
            </button>
          </div>
        </td>
      </tr>
    ));
  }, [filteredPosts, categoryById]);

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

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", slug: "", description: "" });
    setEditingCategoryId(null);
  };

  const resetTagForm = () => {
    setTagForm({ name: "", slug: "" });
    setEditingTagId(null);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    resetCategoryForm();
  };

  const closeTagModal = () => {
    setShowTagModal(false);
    resetTagForm();
  };

  const openCreateCategoryModal = () => {
    resetCategoryForm();
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
    });
    setShowCategoryModal(true);
  };

  const openCreateTagModal = () => {
    resetTagForm();
    setShowTagModal(true);
  };

  const openEditTagModal = (tag) => {
    setEditingTagId(tag.id);
    setTagForm({
      name: tag.name || "",
      slug: tag.slug || "",
    });
    setShowTagModal(true);
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();

    try {
      const endpoint = editingCategoryId
        ? `${BLOG_API_BASE}/categories/${editingCategoryId}/`
        : `${BLOG_API_BASE}/categories/`;
      const method = editingCategoryId ? "PUT" : "POST";

      const response = await customFetch(endpoint, {
        method,
        body: categoryForm,
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to save category.");
      }

      closeCategoryModal();
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save category.");
    }
  };

  const handleTagSubmit = async (event) => {
    event.preventDefault();

    try {
      const endpoint = editingTagId
        ? `${BLOG_API_BASE}/tags/${editingTagId}/`
        : `${BLOG_API_BASE}/tags/`;
      const method = editingTagId ? "PUT" : "POST";

      const response = await customFetch(endpoint, {
        method,
        body: tagForm,
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to save tag.");
      }

      closeTagModal();
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save tag.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure?")) {
      return;
    }

    try {
      const response = await customFetch(`${BLOG_API_BASE}/categories/${id}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to delete category.");
      }

      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to delete category.");
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm("Are you sure?")) {
      return;
    }

    try {
      const response = await customFetch(`${BLOG_API_BASE}/tags/${id}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to delete tag.");
      }

      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to delete tag.");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await customFetch(`${BLOG_API_BASE}/import-wordpress/`, {
        method: "POST",
        body: formData,
        useFinanceJwt: true,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response?.ok) {
        throw new Error(data?.message || data?.detail || "WordPress import failed.");
      }

      alert(data?.message || "WordPress import completed successfully.");
    } catch (err) {
      alert(err.message || "WordPress import failed.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
      fetchAllData();
    }
  };

  return (
    <div className="admin-dashboard-wrapper">
      {/* Header Area */}
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <h2 className="admin-page-title m-0">Blog Management</h2>
        <div className="header-actions">
          <input
            type="file"
            accept=".xml"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn-admin-outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <FaUpload />
            {isImporting ? "Importing... Please wait" : "Import Wordpress"}
          </button>
          <Link to="/blog-admin/create" className="btn-admin-outline"> + Add New Post </Link>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters Area */}
      <div className="filter-card">
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
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
            </Form.Select>
          </Col>
          <Col md={1} className="d-grid">
            <button className="btn-admin-outline w-100 justify-content-center" onClick={fetchAllData}>
              Refresh
            </button>
          </Col>
        </Row>
      </div>

      {/* Table Area */}
      <div className="table-card">
                <div className="modern-tabs px-4 pt-4">
          <button
            type="button"
            className={activeTab === "posts" ? "active" : ""}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            type="button"
            className={activeTab === "categories" ? "active" : ""}
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
          <button
            type="button"
            className={activeTab === "tags" ? "active" : ""}
            onClick={() => setActiveTab("tags")}
          >
            Tags
          </button>
        </div>
        <div className="px-4 pb-4">
          {activeTab === "posts" && (
            <Table responsive hover className="modern-table mt-3">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Published At</th>
                  <th style={{ width: "260px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <TableSkeletonRow key={`skel-row-${i}`} />)
                ) : (
                  tableRows
                )}
              </tbody>
            </Table>
          )}
          {activeTab === "categories" && (
            <><div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="m-0 fw-semibold">Manage Categories</h6>
              <button type="button" className="btn-admin-outline btn-admin-sm" onClick={openCreateCategoryModal}>Add Category</button>
            </div>
            <Table responsive hover className="modern-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th style={{ width: "170px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length ? (
                  categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name || "-"}</td>
                      <td>{category.slug || "-"}</td>
                      <td>{category.description || "-"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-admin-outline btn-admin-sm"
                            onClick={() => openEditCategoryModal(category)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-admin-outline btn-admin-sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4">No categories found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </>
          )}
          {activeTab === "tags" && (
            <><div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="m-0 fw-semibold">Manage Tags</h6>
              <button type="button" className="btn-admin-outline btn-admin-sm" onClick={openCreateTagModal}>Add Tag</button>
            </div>
            <Table responsive hover className="modern-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th style={{ width: "170px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.length ? (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td>{tag.name || "-"}</td>
                      <td>{tag.slug || "-"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-admin-outline btn-admin-sm"
                            onClick={() => openEditTagModal(tag)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-admin-outline btn-admin-sm"
                            onClick={() => handleDeleteTag(tag.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-4">No tags found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </>
          )}
        </div>
      </div>

      <Modal show={showCategoryModal} onHide={closeCategoryModal} centered>
        <Form onSubmit={handleCategorySubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingCategoryId ? "Edit Category" : "Add Category"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                required
                value={categoryForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setCategoryForm((prev) => ({
                    ...prev,
                    name,
                    slug: slugify(name),
                  }));
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Slug</Form.Label>
              <Form.Control
                required
                value={categoryForm.slug}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={categoryForm.description}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn-admin-outline" onClick={closeCategoryModal}>Cancel</button>
            <button type="submit" className="btn-admin-outline">{editingCategoryId ? "Update" : "Create"}</button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showTagModal} onHide={closeTagModal} centered>
        <Form onSubmit={handleTagSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingTagId ? "Edit Tag" : "Add Tag"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                required
                value={tagForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setTagForm((prev) => ({
                    ...prev,
                    name,
                    slug: slugify(name),
                  }));
                }}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Slug</Form.Label>
              <Form.Control
                required
                value={tagForm.slug}
                onChange={(event) => setTagForm((prev) => ({ ...prev, slug: event.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn-admin-outline" onClick={closeTagModal}>Cancel</button>
            <button type="submit" className="btn-admin-outline">{editingTagId ? "Update" : "Create"}</button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default BlogDashboard;

