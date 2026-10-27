import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import "./BlogAdmin.css";

const BLOG_API_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/admin`;
const POSTS_PER_PAGE = 25;

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
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [postsLoading, setPostsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [tagsError, setTagsError] = useState("");
  const [actionError, setActionError] = useState("");
  const fileInputRef = useRef(null);
  const postRequestIdRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [postCount, setPostCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPageUrl, setPrevPageUrl] = useState(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
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

  const fetchPosts = useCallback(async () => {
    const requestId = postRequestIdRef.current + 1;
    postRequestIdRef.current = requestId;
    setPostsLoading(true);
    setPostsError("");

    const params = new URLSearchParams({
      page: String(page),
      ordering: sortDir === "desc" ? "-published_date" : "published_date",
    });
    if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);

    try {
      const response = await customFetch(`${BLOG_API_BASE}/posts/?${params.toString()}`, {
        useFinanceJwt: true,
      });
      if (!response?.ok) throw new Error("Failed to load blog posts.");

      const data = await response.json();
      if (postRequestIdRef.current !== requestId) return;

      setPosts(toListPayload(data));
      setPostCount(Number(data?.count) || 0);
      setNextPageUrl(data?.next || null);
      setPrevPageUrl(data?.previous || null);
    } catch (err) {
      if (postRequestIdRef.current !== requestId) return;
      setPosts([]);
      setPostCount(0);
      setNextPageUrl(null);
      setPrevPageUrl(null);
      setPostsError(err.message || "Failed to load blog posts.");
    } finally {
      if (postRequestIdRef.current === requestId) setPostsLoading(false);
    }
  }, [page, debouncedSearchTerm, categoryFilter, statusFilter, sortDir]);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const response = await customFetch(`${BLOG_API_BASE}/categories/`, { useFinanceJwt: true });
      if (!response?.ok) throw new Error("Failed to load blog categories.");
      setCategories(toListPayload(await response.json()));
    } catch (err) {
      setCategoriesError(err.message || "Failed to load blog categories.");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError("");
    try {
      const response = await customFetch(`${BLOG_API_BASE}/tags/`, { useFinanceJwt: true });
      if (!response?.ok) throw new Error("Failed to load blog tags.");
      setTags(toListPayload(await response.json()));
      setTagsLoaded(true);
    } catch (err) {
      setTagsError(err.message || "Failed to load blog tags.");
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Check Auth first
    if (!localStorage.getItem("access_token")) {
      navigate("/unauthorized", { replace: true });
      return; // Stop execution immediately
    }

    fetchCategories();
  }, [navigate, fetchCategories]);

  useEffect(() => {
    if (localStorage.getItem("access_token")) fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (activeTab === "tags" && !tagsLoaded) fetchTags();
  }, [activeTab, tagsLoaded, fetchTags]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category.id] = category.name;
    });
    return map;
  }, [categories]);

  const totalPages = Math.max(1, Math.ceil(postCount / POSTS_PER_PAGE));
  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 7;
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) pages.push(pageNumber);
    return pages;
  }, [page, totalPages]);

  const handleDeletePost = useCallback(async (id) => {
    if (!window.confirm("Delete this post permanently?")) {
      return;
    }

    setActionError("");
    try {
      const response = await customFetch(`${BLOG_API_BASE}/posts/${id}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to delete post.");
      }

      if (posts.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        fetchPosts();
      }
    } catch (err) {
      setActionError(err.message || "Could not delete this post.");
    }
  }, [posts.length, page, fetchPosts]);

  const tableRows = useMemo(() => {
    if (!posts.length) {
      return (
        <tr>
          <td colSpan="6" className="text-center py-4">No posts found.</td>
        </tr>
      );
    }
    return posts.map((post) => (
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
  }, [posts, categoryById, navigate, handleDeletePost]);

  const refreshDashboard = () => {
    setActionError("");
    fetchPosts();
    fetchCategories();
    if (tagsLoaded) fetchTags();
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
    setActionError("");

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
      await Promise.all([fetchCategories(), fetchPosts()]);
    } catch (err) {
      setActionError(err.message || "Failed to save category.");
    }
  };
  const handleTagSubmit = async (event) => {
    event.preventDefault();
    setActionError("");

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
      await fetchTags();
    } catch (err) {
      setActionError(err.message || "Failed to save tag.");
    }
  };
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure?")) {
      return;
    }

    setActionError("");
    try {
      const response = await customFetch(`${BLOG_API_BASE}/categories/${id}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to delete category.");
      }

      await fetchCategories();
      if (String(categoryFilter) === String(id)) {
        setCategoryFilter("all");
        setPage(1);
      } else {
        fetchPosts();
      }
    } catch (err) {
      setActionError(err.message || "Failed to delete category.");
    }
  };
  const handleDeleteTag = async (id) => {
    if (!window.confirm("Are you sure?")) {
      return;
    }

    setActionError("");
    try {
      const response = await customFetch(`${BLOG_API_BASE}/tags/${id}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        throw new Error("Failed to delete tag.");
      }

      await fetchTags();
    } catch (err) {
      setActionError(err.message || "Failed to delete tag.");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    setActionError("");
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
      fetchPosts();
      fetchCategories();
      if (tagsLoaded) fetchTags();
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

      {(actionError || postsError || categoriesError || tagsError) && (
        <Alert variant="danger">
          {actionError || postsError || categoriesError || tagsError}
        </Alert>
      )}

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
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              disabled={categoriesLoading}
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
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="publish">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
            </Form.Select>
          </Col>
          <Col md={1} className="d-grid">
            <button className="btn-admin-outline w-100 justify-content-center" onClick={refreshDashboard}>
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
            <>
            <Table responsive hover className="modern-table mt-3">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th
                    className="sortable-th"
                    onClick={() => {
                      setPage(1);
                      setSortDir((d) => d === "desc" ? "asc" : "desc");
                    }}
                  >
                    Published At {sortDir === "desc" ? "▼" : "▲"}
                  </th>
                  <th style={{ width: "260px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {postsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <TableSkeletonRow key={`skel-row-${i}`} />)
                ) : (
                  tableRows
                )}
              </tbody>
            </Table>
            {!postsLoading && postCount > 0 && (
              <div className="admin-pagination">
                <span className="admin-pagination-summary">
                  Showing {(page - 1) * POSTS_PER_PAGE + 1}–{Math.min(page * POSTS_PER_PAGE, postCount)} of {postCount}
                </span>
                <div className="admin-pagination-controls">
                  <button
                    type="button"
                    className="btn-admin-outline btn-admin-sm"
                    disabled={!prevPageUrl || page <= 1}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  >
                    Previous
                  </button>
                  {visiblePages.map((pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={`btn-admin-outline btn-admin-sm admin-page-button ${pageNumber === page ? "active" : ""}`}
                      onClick={() => setPage(pageNumber)}
                      aria-current={pageNumber === page ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-admin-outline btn-admin-sm"
                    disabled={!nextPageUrl || page >= totalPages}
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
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
                {categoriesLoading ? (
                  <tr><td colSpan="4" className="text-center py-4"><Spinner size="sm" /> Loading categories...</td></tr>
                ) : categories.length ? (
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
                {tagsLoading ? (
                  <tr><td colSpan="3" className="text-center py-4"><Spinner size="sm" /> Loading tags...</td></tr>
                ) : tags.length ? (
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

