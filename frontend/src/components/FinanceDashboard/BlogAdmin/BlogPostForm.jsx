import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import customFetch from "../../../auth/fetch";
import { useBlogJwtFromUrl } from "../../../auth/useBlogJwtFromUrl";
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

function toDatetimeLocalValue(isoValue) {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function BlogPostForm() {
  useBlogJwtFromUrl();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFaqs, setSavingFaqs] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    meta_title: "",
    meta_description: "",
    slug: "",
    canonical_url: "",
    category: "",
    tags: [],
    status: "draft",
    published_date: "",
    content: "",
    featured_image: null,
  });

  const [existingFeaturedImage, setExistingFeaturedImage] = useState("");

  const [faqs, setFaqs] = useState([]);
  const [removedFaqIds, setRemovedFaqIds] = useState([]);

  const titleMode = useMemo(() => (isEditMode ? "Edit Blog Post" : "Create Blog Post"), [isEditMode]);

  const fetchPostData = async () => {
    setLoading(true);
    setError("");

    try {
      const baseRequests = [
        customFetch(`${BLOG_API_BASE}/categories/`, { useFinanceJwt: true }),
        customFetch(`${BLOG_API_BASE}/tags/`, { useFinanceJwt: true }),
      ];

      if (isEditMode) {
        baseRequests.push(
          customFetch(`${BLOG_API_BASE}/posts/${id}/`, { useFinanceJwt: true }),
          customFetch(`${BLOG_API_BASE}/faqs/`, { useFinanceJwt: true })
        );
      }

      const responses = await Promise.all(baseRequests);

      const categoriesRes = responses[0];
      const tagsRes = responses[1];

      if (!categoriesRes?.ok || !tagsRes?.ok) {
        throw new Error("Failed to load categories or tags.");
      }

      const categoriesData = await categoriesRes.json();
      const tagsData = await tagsRes.json();

      setCategories(toListPayload(categoriesData));
      setTags(toListPayload(tagsData));

      if (isEditMode) {
        const postRes = responses[2];
        const faqRes = responses[3];

        if (!postRes?.ok || !faqRes?.ok) {
          throw new Error("Failed to load post details.");
        }

        const post = await postRes.json();
        const faqData = await faqRes.json();
        const allFaqs = toListPayload(faqData);
        const linkedFaqs = allFaqs.filter((faq) => String(faq.post) === String(id));

        const normalizedStatus =
          post.status === "publish" && post.published_date && new Date(post.published_date) > new Date()
            ? "schedule"
            : post.status || "draft";

        setFormData({
          title: post.title || "",
          meta_title: post.meta_title || "",
          meta_description: post.meta_description || "",
          slug: post.slug || "",
          canonical_url: post.canonical_url || "",
          category: post.category || "",
          tags: Array.isArray(post.tags) ? post.tags : [],
          status: normalizedStatus,
          published_date: toDatetimeLocalValue(post.published_date),
          content: post.content || "",
          featured_image: null,
        });

        setExistingFeaturedImage(post.featured_image || "");
        setFaqs(
          linkedFaqs.map((faq) => ({
            id: faq.id,
            question: faq.question || "",
            answer: faq.answer || "",
            is_active: faq.is_active ?? true,
            order: faq.order ?? 0,
          }))
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load blog form data.");
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
    fetchPostData();
  }, [navigate, id, isEditMode]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagSelection = (event) => {
    const selectedValues = Array.from(event.target.selectedOptions).map((option) => Number(option.value));
    setFormData((prev) => ({ ...prev, tags: selectedValues }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, featured_image: file }));
  };

  const buildPostPayload = () => {
    const payload = new FormData();

    payload.append("title", formData.title);
    payload.append("meta_title", formData.meta_title || "");
    payload.append("meta_description", formData.meta_description || "");
    payload.append("slug", formData.slug);
    payload.append("canonical_url", formData.canonical_url || "");
    payload.append("content", formData.content || "");

    const apiStatus = formData.status === "schedule" ? "publish" : formData.status;
    payload.append("status", apiStatus || "draft");

    if (formData.published_date) {
      payload.append("published_date", new Date(formData.published_date).toISOString());
    } else {
      payload.append("published_date", "");
    }

    if (formData.category) {
      payload.append("category", String(formData.category));
    } else {
      payload.append("category", "");
    }

    formData.tags.forEach((tagId) => {
      payload.append("tags", String(tagId));
    });

    if (formData.featured_image) {
      payload.append("featured_image", formData.featured_image);
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = buildPostPayload();
      const endpoint = isEditMode ? `${BLOG_API_BASE}/posts/${id}/` : `${BLOG_API_BASE}/posts/`;
      const method = isEditMode ? "PUT" : "POST";

      const response = await customFetch(endpoint, {
        method,
        body: payload,
        useFinanceJwt: true,
      });

      if (!response?.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || "Failed to save post.");
      }

      const savedPost = await response.json();
      setSuccessMessage(isEditMode ? "Post updated successfully." : "Post created successfully.");

      if (!isEditMode && savedPost?.id) {
        navigate(`/blog-admin/edit/${savedPost.id}`);
        return;
      }

      navigate("/blog-admin");
    } catch (err) {
      setError(err.message || "Failed to save post.");
    } finally {
      setSaving(false);
    }
  };

  const addFaq = () => {
    setFaqs((prev) => [
      ...prev,
      {
        id: null,
        question: "",
        answer: "",
        is_active: true,
        order: prev.length,
      },
    ]);
  };

  const updateFaq = (index, field, value) => {
    setFaqs((prev) =>
      prev.map((faq, faqIndex) => (faqIndex === index ? { ...faq, [field]: value } : faq))
    );
  };

  const removeFaq = (index) => {
    setFaqs((prev) => {
      const faqToRemove = prev[index];
      if (faqToRemove?.id) {
        setRemovedFaqIds((oldIds) => [...oldIds, faqToRemove.id]);
      }
      return prev.filter((_, faqIndex) => faqIndex !== index);
    });
  };

  const handleSaveFaqs = async () => {
    if (!isEditMode) {
      return;
    }

    setSavingFaqs(true);
    setError("");
    setSuccessMessage("");

    try {
      for (const faqId of removedFaqIds) {
        const deleteRes = await customFetch(`${BLOG_API_BASE}/faqs/${faqId}/`, {
          method: "DELETE",
          useFinanceJwt: true,
        });
        if (!deleteRes?.ok) {
          throw new Error("Failed to delete FAQ item.");
        }
      }

      for (const faq of faqs) {
        const faqPayload = {
          post: Number(id),
          question: faq.question,
          answer: faq.answer,
          is_active: Boolean(faq.is_active),
          order: Number(faq.order) || 0,
        };

        const endpoint = faq.id ? `${BLOG_API_BASE}/faqs/${faq.id}/` : `${BLOG_API_BASE}/faqs/`;
        const method = faq.id ? "PUT" : "POST";

        const saveRes = await customFetch(endpoint, {
          method,
          body: faqPayload,
          useFinanceJwt: true,
        });

        if (!saveRes?.ok) {
          throw new Error("Failed to save FAQ item.");
        }
      }

      setRemovedFaqIds([]);
      setSuccessMessage("FAQs saved successfully.");

      const faqReloadRes = await customFetch(`${BLOG_API_BASE}/faqs/`, { useFinanceJwt: true });
      if (faqReloadRes?.ok) {
        const faqData = await faqReloadRes.json();
        const linkedFaqs = toListPayload(faqData).filter((faq) => String(faq.post) === String(id));
        setFaqs(
          linkedFaqs.map((faq) => ({
            id: faq.id,
            question: faq.question || "",
            answer: faq.answer || "",
            is_active: faq.is_active ?? true,
            order: faq.order ?? 0,
          }))
        );
      }
    } catch (err) {
      setError(err.message || "Failed to save FAQs.");
    } finally {
      setSavingFaqs(false);
    }
  };

  return (
    <Container fluid className="admin-dashboard-wrapper py-4">
      {/* Header Area */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/blog-admin" className="text-muted text-decoration-none fw-semibold border rounded px-3 py-2 bg-white">
          &larr; Back to Dashboard
        </Link>
        <h2 style={{ color: 'var(--primary-dark)' }} className="fw-bold m-0">{titleMode}</h2>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" />
        </div>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Row>
            {/* LEFT COLUMN */}
            <Col lg={8}>
              <div className="admin-card">
                <h5 className="admin-card-title">Main Details</h5>
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Title</Form.Label>
                      <Form.Control
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Slug</Form.Label>
                      <Form.Control
                        name="slug"
                        value={formData.slug}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group>
                  <Form.Label className="fw-semibold">Content</Form.Label>
                  <Editor
                    apiKey='2enlcvv4op73db4udbofaimle7u3a70z5xwwifzfcwxop5ye'
                    value={formData.content}
                    onEditorChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                    init={{
                      plugins: [
                        'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount'
                      ],
                      height: 480,
                      menubar: true,
                      toolbar:
                        "undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | removeformat | code | image",
                    }}
                  />
                </Form.Group>
              </div>

              <div className="admin-card mt-4">
                <h5 className="admin-card-title">SEO Settings</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">SEO Meta Title</Form.Label>
                      <Form.Control
                        name="meta_title"
                        value={formData.meta_title}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Canonical URL</Form.Label>
                      <Form.Control
                        name="canonical_url"
                        value={formData.canonical_url}
                        onChange={handleInputChange}
                        placeholder="https://example.com/blog/my-post"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">SEO Meta Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="meta_description"
                        value={formData.meta_description}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {isEditMode ? (
                <div className="admin-card mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="admin-card-title border-0 mb-0 pb-0">Manage FAQs</h5>
                    <Button variant="outline-primary" size="sm" onClick={addFaq}>
                      + Add FAQ
                    </Button>
                  </div>

                  {faqs.length ? (
                    <Table bordered responsive className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: "25%" }}>Question</th>
                          <th style={{ width: "45%" }}>Answer</th>
                          <th style={{ width: "10%" }}>Order</th>
                          <th style={{ width: "10%" }}>Active</th>
                          <th style={{ width: "10%" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqs.map((faq, index) => (
                          <tr key={faq.id || `new-${index}`}>
                            <td>
                              <Form.Control
                                value={faq.question}
                                onChange={(event) => updateFaq(index, "question", event.target.value)}
                                placeholder="Question"
                              />
                            </td>
                            <td>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                value={faq.answer}
                                onChange={(event) => updateFaq(index, "answer", event.target.value)}
                                placeholder="Answer"
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                value={faq.order}
                                onChange={(event) => updateFaq(index, "order", event.target.value)}
                              />
                            </td>
                            <td className="text-center align-middle">
                              <Form.Check
                                type="switch"
                                checked={Boolean(faq.is_active)}
                                onChange={(event) => updateFaq(index, "is_active", event.target.checked)}
                                label=""
                              />
                            </td>
                            <td>
                              <Button variant="outline-danger" size="sm" onClick={() => removeFaq(index)}>
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info" className="mb-0">No FAQs added yet. Click Add FAQ to create one.</Alert>
                  )}

                  <div className="d-flex justify-content-end mt-3 border-top pt-3">
                    <Button variant="secondary" onClick={handleSaveFaqs} disabled={savingFaqs}>
                      {savingFaqs ? "Saving FAQs..." : "Save FAQs"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Col>

            {/* RIGHT COLUMN */}
            <Col lg={4}>
              <div className="admin-card">
                <h5 className="admin-card-title">Publishing</h5>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="publish">Publish</option>
                    <option value="schedule">Schedule</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Publish Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="published_date"
                    value={formData.published_date}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Button type="submit" className="btn-modern w-100 mt-3" disabled={saving}>
                  {saving ? "Saving..." : "Save Post"}
                </Button>
              </div>

              <div className="admin-card mt-4">
                <h5 className="admin-card-title">Taxonomy</h5>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Category</Form.Label>
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-semibold">Tags (Multi-select)</Form.Label>
                  <Form.Select
                    multiple
                    value={formData.tags.map(String)}
                    onChange={handleTagSelection}
                    style={{ minHeight: "120px" }}
                  >
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="admin-card mt-4">
                <h5 className="admin-card-title">Featured Image</h5>
                <Form.Group>
                  <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
                  {existingFeaturedImage && !formData.featured_image ? (
                    <div className="mt-3 text-center">
                      <Form.Text className="text-muted d-block mb-2">Current Image:</Form.Text>
                      <img src={existingFeaturedImage} alt="Featured" style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #eaeaea" }} />
                    </div>
                  ) : null}
                </Form.Group>
              </div>
            </Col>
          </Row>
        </Form>
      )}
    </Container>
  );
}

export default BlogPostForm;
