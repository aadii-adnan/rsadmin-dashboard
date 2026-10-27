import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import "./BlogAdmin.css";

const BLOG_API_BASE = `${import.meta.env.VITE_API_BASE_URL}/blogs/admin`;
const TINYMCE_SCRIPT_SRC = "/tinymce/tinymce.min.js";

const TINYMCE_BASE_INIT = {
  plugins: ["code", "image", "imagetools", "link", "lists", "help", "wordcount"],
  menubar: true,
  toolbar:
    "code | image link | undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | removeformat",
  image_title: true,
  automatic_uploads: true,
  image_advtab: true,
  branding: false,
  promotion: false,
  license_key: "gpl",
};

let tinyMceScriptLoadPromise = null;

function ensureTinyMceScriptLoaded(scriptSrc) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.tinymce) {
    return Promise.resolve();
  }

  if (tinyMceScriptLoadPromise) {
    return tinyMceScriptLoadPromise;
  }

  tinyMceScriptLoadPromise = new Promise((resolve, reject) => {
    const resolveIfReady = () => {
      if (window.tinymce) {
        resolve();
      }
    };

    const onError = () => {
      tinyMceScriptLoadPromise = null;
      reject(new Error("Failed to load TinyMCE editor script."));
    };

    const existingScript = document.querySelector('script[data-tinymce-self-hosted="true"]');
    if (existingScript) {
      if (window.tinymce) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", resolveIfReady, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-tinymce-self-hosted", "true");
    script.addEventListener("load", resolveIfReady, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });

  return tinyMceScriptLoadPromise;
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

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 255);
}

function normalizeFaq(faq) {
  return {
    id: faq.id,
    question: faq.question || "",
    answer: faq.answer || "",
    is_active: faq.is_active ?? true,
    order: faq.order ?? 0,
  };
}

function getFaqListEndpoint(postId) {
  return postId ? `${BLOG_API_BASE}/faqs/?post=${encodeURIComponent(postId)}` : `${BLOG_API_BASE}/faqs/`;
}

function createTinyMceInit(overrides = {}) {
  return {
    ...TINYMCE_BASE_INIT,
    ...overrides,
  };
}

function BlogPostForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFaqs, setSavingFaqs] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isTinyMceReady, setIsTinyMceReady] = useState(false);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    meta_title: "",
    meta_description: "",
    slug: "",
    excerpt: "",
    canonical_url: "",
    robots_index: true,
    robots_follow: true,
    robots_noarchive: false,
    robots_nosnippet: false,
    max_snippet: -1,
    category: "",
    tags: [],
    status: "draft",
    reading_time: "",
    published_date: "",
    content: "",
    featured_image: null,
  });

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const [existingFeaturedImage, setExistingFeaturedImage] = useState("");

  const [faqs, setFaqs] = useState([]);
  const [removedFaqIds, setRemovedFaqIds] = useState([]);
  const [selectedFaqIndex, setSelectedFaqIndex] = useState(null);

  const titleMode = useMemo(() => (isEditMode ? "Edit Blog Post" : "Create Blog Post"), [isEditMode]);

  const contentEditorInit = useMemo(() => createTinyMceInit({ height: 480 }), []);
  const faqEditorInit = useMemo(
    () =>
      createTinyMceInit({
        height: 320,
        menubar: false,
        toolbar:
          "code | undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link | removeformat",
      }),
    []
  );

  const selectedFaq = selectedFaqIndex !== null ? faqs[selectedFaqIndex] || null : null;

  const parseErrorMessage = async (response, fallbackMessage) => {
    const payload = await response.json().catch(() => null);
    if (typeof payload?.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
    if (Array.isArray(payload?.non_field_errors) && payload.non_field_errors[0]) {
      return String(payload.non_field_errors[0]);
    }
    return fallbackMessage;
  };

  const fetchPostData = useCallback(async () => {
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
          customFetch(getFaqListEndpoint(id), { useFinanceJwt: true })
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

        const normalizedStatus = post.status || "draft";

        setFormData({
          title: post.title || "",
          meta_title: post.meta_title || "",
          meta_description: post.meta_description || "",
          slug: post.slug || "",
          excerpt: post.excerpt || "",
          canonical_url: post.canonical_url || "",
          robots_index: post.robots_index ?? true,
          robots_follow: post.robots_follow ?? true,
          robots_noarchive: post.robots_noarchive ?? false,
          robots_nosnippet: post.robots_nosnippet ?? false,
          max_snippet: post.max_snippet ?? -1,
          category: post.category || "",
          tags: Array.isArray(post.tags) ? post.tags : [],
          status: normalizedStatus,
          reading_time:
            post.reading_time !== null && post.reading_time !== undefined
              ? String(post.reading_time)
              : "",
          published_date: toDatetimeLocalValue(post.published_date),
          content: post.content || "",
          featured_image: null,
        });

        const normalizedFaqs = linkedFaqs.map(normalizeFaq);
        setExistingFeaturedImage(post.featured_image || "");
        setFaqs(normalizedFaqs);
        setRemovedFaqIds([]);
        setSelectedFaqIndex(normalizedFaqs.length ? 0 : null);
      } else {
        setFaqs([]);
        setRemovedFaqIds([]);
        setSelectedFaqIndex(null);
        setExistingFeaturedImage("");
      }
    } catch (err) {
      setError(err.message || "Failed to load blog form data.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    let mounted = true;

    ensureTinyMceScriptLoaded(TINYMCE_SCRIPT_SRC)
      .then(() => {
        if (mounted) {
          setIsTinyMceReady(true);
        }
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError.message || "Failed to load TinyMCE editor.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // 1. Check Auth first
    if (!localStorage.getItem("access_token")) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    // 2. If Auth passes, fetch the data
    fetchPostData();
  }, [navigate, fetchPostData]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    setFormData((prev) => {
      const generatedSlug = slugify(prev.title || "");

      // Respect manual slug edits, but keep auto behavior when slug is untouched or empty.
      if (isSlugManuallyEdited && prev.slug) {
        return prev;
      }

      if (prev.slug === generatedSlug) {
        return prev;
      }

      return { ...prev, slug: generatedSlug };
    });
  }, [formData.title, isEditMode, isSlugManuallyEdited]);

  useEffect(() => {
    if (!faqs.length) {
      if (selectedFaqIndex !== null) {
        setSelectedFaqIndex(null);
      }
      return;
    }

    if (selectedFaqIndex === null || selectedFaqIndex >= faqs.length) {
      setSelectedFaqIndex(0);
    }
  }, [faqs, selectedFaqIndex]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    if (name === "slug") {
      setIsSlugManuallyEdited(true);
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
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
    payload.append("excerpt", formData.excerpt || "");
    payload.append("canonical_url", formData.canonical_url || "");
    payload.append("content", formData.content || "");
    payload.append("robots_index", formData.robots_index ? "true" : "false");
    payload.append("robots_follow", formData.robots_follow ? "true" : "false");
    payload.append("robots_noarchive", formData.robots_noarchive ? "true" : "false");
    payload.append("robots_nosnippet", formData.robots_nosnippet ? "true" : "false");
    payload.append("max_snippet", String(formData.max_snippet));

    payload.append("status", formData.status || "draft");
    payload.append("reading_time", formData.reading_time ? String(formData.reading_time) : "");

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

  const persistFaqChanges = async ({ postId, faqItems, faqIdsToDelete = [] }) => {
    const deleteQueue = [...new Set((faqIdsToDelete || []).filter(Boolean))];

    for (const faqId of deleteQueue) {
      const deleteRes = await customFetch(`${BLOG_API_BASE}/faqs/${faqId}/`, {
        method: "DELETE",
        useFinanceJwt: true,
      });

      if (!deleteRes?.ok) {
        const message = await parseErrorMessage(deleteRes, "Failed to delete FAQ item.");
        throw new Error(message);
      }
    }

    for (const faq of faqItems) {
      const faqPayload = {
        post: Number(postId),
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
        const message = await parseErrorMessage(saveRes, "Failed to save FAQ item.");
        throw new Error(message);
      }
    }

    const faqReloadRes = await customFetch(getFaqListEndpoint(postId), { useFinanceJwt: true });
    if (!faqReloadRes?.ok) {
      const message = await parseErrorMessage(faqReloadRes, "Failed to reload FAQs.");
      throw new Error(message);
    }

    const faqData = await faqReloadRes.json();
    const linkedFaqs = toListPayload(faqData).filter((faq) => String(faq.post) === String(postId));
    return linkedFaqs.map(normalizeFaq);
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
        const errorMessage = await parseErrorMessage(response, "Failed to save post.");
        throw new Error(errorMessage);
      }

      const savedPost = await response.json();

      if (!isEditMode && savedPost?.id) {
        if (faqs.length > 0) {
          await persistFaqChanges({
            postId: savedPost.id,
            faqItems: faqs,
          });
          setSuccessMessage("Post and FAQs created successfully.");
        } else {
          setSuccessMessage("Post created successfully.");
        }

        navigate(`/blog-admin/edit/${savedPost.id}`);
        return;
      }

      setSuccessMessage("Post updated successfully.");
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
    setSelectedFaqIndex(faqs.length);
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
        setRemovedFaqIds((oldIds) => {
          if (oldIds.includes(faqToRemove.id)) {
            return oldIds;
          }
          return [...oldIds, faqToRemove.id];
        });
      }
      return prev.filter((_, faqIndex) => faqIndex !== index);
    });

    setSelectedFaqIndex((current) => {
      if (current === null) {
        return null;
      }
      if (current === index) {
        return index > 0 ? index - 1 : 0;
      }
      if (current > index) {
        return current - 1;
      }
      return current;
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
      const syncedFaqs = await persistFaqChanges({
        postId: id,
        faqItems: faqs,
        faqIdsToDelete: removedFaqIds,
      });

      setFaqs(syncedFaqs);
      setRemovedFaqIds([]);
      setSuccessMessage("FAQs saved successfully.");
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
        <Link to="/blog-admin" className="btn-admin-outline">
          &larr; Back to Dashboard
        </Link>
        <h2 style={{ color: "var(--primary-dark)" }} className="fw-bold m-0">
          {titleMode}
        </h2>
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
                      <Form.Control name="title" value={formData.title} onChange={handleChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Slug</Form.Label>
                      <Form.Control name="slug" value={formData.slug} onChange={handleChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Excerpt (Short Summary)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="excerpt"
                    value={formData.excerpt}
                    onChange={handleChange}
                    placeholder="Write a brief summary for the blog cards..."
                    className="filter-input"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-semibold">Content</Form.Label>
                  {isTinyMceReady ? (
                    <Editor
                      value={formData.content}
                      onEditorChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                      init={contentEditorInit}
                    />
                  ) : (
                    <div className="tiny-editor-loading">
                      <Spinner animation="border" size="sm" />
                      <span>Loading editor...</span>
                    </div>
                  )}
                </Form.Group>
              </div>

              <div className="admin-card mt-4">
                <h5 className="admin-card-title">SEO Settings</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">SEO Meta Title</Form.Label>
                      <Form.Control name="meta_title" value={formData.meta_title} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Canonical URL</Form.Label>
                      <Form.Control
                        name="canonical_url"
                        value={formData.canonical_url}
                        onChange={handleChange}
                        placeholder="https://example.com/my-post"
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
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="mt-4">
                  <h6 className="mb-3">Search Engine Directives</h6>
                  <Form.Check
                    type="switch"
                    id="robots_index"
                    name="robots_index"
                    label="Allow Search Engines to Index this post (robots_index)"
                    checked={Boolean(formData.robots_index)}
                    onChange={handleChange}
                  />
                  <Form.Check
                    type="switch"
                    id="robots_follow"
                    name="robots_follow"
                    label="Allow Search Engines to Follow links (robots_follow)"
                    checked={Boolean(formData.robots_follow)}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="admin-card mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2 faq-headline-row">
                  <h5 className="admin-card-title border-0 mb-0 pb-0">Manage FAQs</h5>
                  <button type="button" className="btn-admin-outline btn-admin-sm" onClick={addFaq}>
                    + Add FAQ
                  </button>
                </div>
                <p className="faq-help-text mb-3">
                  {isEditMode
                    ? "Update questions in the table, then use the shared editor below for rich answer HTML."
                    : "Draft FAQs now. They will be saved automatically after the post is created."}
                </p>

                {faqs.length ? (
                  <Table bordered responsive className="admin-table faq-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Question</th>
                        <th style={{ width: "35%" }}>Answer Preview</th>
                        <th style={{ width: "10%" }}>Order</th>
                        <th style={{ width: "8%" }}>Active</th>
                        <th style={{ width: "12%" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faqs.map((faq, index) => (
                        <tr
                          key={faq.id || `new-${index}`}
                          className={selectedFaqIndex === index ? "faq-row-selected" : ""}
                        >
                          <td>
                            <Form.Control
                              value={faq.question}
                              onChange={(event) => updateFaq(index, "question", event.target.value)}
                              placeholder="Question"
                            />
                          </td>
                          <td>
                            <div className="faq-answer-preview">
                              {faq.answer ? (
                                <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                              ) : (
                                <span className="text-muted">No answer yet.</span>
                              )}
                            </div>
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
                            <div className="faq-row-actions">
                              <button
                                type="button"
                                className={`btn-admin-outline btn-admin-sm ${
                                  selectedFaqIndex === index ? "faq-select-btn-active" : ""
                                }`}
                                onClick={() => setSelectedFaqIndex(index)}
                              >
                                {selectedFaqIndex === index ? "Editing" : "Edit"}
                              </button>
                              <button
                                type="button"
                                className="btn-admin-outline btn-admin-sm"
                                onClick={() => removeFaq(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info" className="mb-0">
                    No FAQs added yet. Click Add FAQ to create one.
                  </Alert>
                )}

                <div className="faq-editor-shell mt-3">
                  <div className="faq-editor-shell-header">
                    <h6 className="mb-1">FAQ Answer Editor</h6>
                    <p className="mb-0 text-muted">
                      {selectedFaq
                        ? `Currently editing: ${selectedFaq.question || "Untitled question"}`
                        : "Select a FAQ row and click Edit to work on the answer."}
                    </p>
                  </div>

                  {selectedFaq ? (
                    isTinyMceReady ? (
                      <Editor
                        value={selectedFaq.answer}
                        onEditorChange={(value) => updateFaq(selectedFaqIndex, "answer", value)}
                        init={faqEditorInit}
                      />
                    ) : (
                      <div className="tiny-editor-loading">
                        <Spinner animation="border" size="sm" />
                        <span>Loading editor...</span>
                      </div>
                    )
                  ) : (
                    <Alert variant="secondary" className="mb-0">
                      Add at least one FAQ and select it to edit the answer.
                    </Alert>
                  )}
                </div>

                <div className="d-flex justify-content-end mt-3 border-top pt-3">
                  {isEditMode ? (
                    <button
                      type="button"
                      className="btn-admin-outline"
                      onClick={handleSaveFaqs}
                      disabled={savingFaqs}
                    >
                      {savingFaqs ? "Saving FAQs..." : "Save FAQs"}
                    </button>
                  ) : (
                    <span className="text-muted small align-self-center">
                      FAQs will be saved after the post is created.
                    </span>
                  )}
                </div>
              </div>
            </Col>

            {/* RIGHT COLUMN */}
            <Col lg={4}>
              <div className="admin-card">
                <h5 className="admin-card-title">Publishing</h5>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="publish">Publish</option>
                  </Form.Select>
                  {formData.status === 'scheduled' && !formData.published_date && (
                    <Form.Text className="text-danger">Set a publish date/time to schedule this post.</Form.Text>
                  )}
                  {formData.status === 'scheduled' && formData.published_date && (
                    <Form.Text className="text-muted">Will publish automatically at the set date/time.</Form.Text>
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Publish Date{formData.status === 'scheduled' && <span className="text-danger"> *</span>}
                  </Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="published_date"
                    value={formData.published_date}
                    onChange={handleChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Reading Time (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="reading_time"
                    value={formData.reading_time}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                  />
                </Form.Group>

                <button
                  type="submit"
                  className="btn-admin-outline w-100 mt-3 justify-content-center"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Post"}
                </button>
              </div>

              <div className="admin-card mt-4">
                <h5 className="admin-card-title">Taxonomy</h5>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Category</Form.Label>
                  <Form.Select name="category" value={formData.category} onChange={handleChange}>
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
                      <img src={existingFeaturedImage} alt="Featured" className="featured-image-preview" />
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