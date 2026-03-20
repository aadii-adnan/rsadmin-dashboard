import { useEffect } from "react";

export function useBlogJwtFromUrl() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const refresh = params.get("refresh");

    if (access && refresh) {
      localStorage.setItem("finance_jwt", access);
      localStorage.setItem("finance_jwt_refresh", refresh);
      // Remove tokens from URL for cleanliness.
      // Using pathname ensures it works whether they land on /blog-admin/ or /blog-admin/create
      window.history.replaceState({}, document.title, '/blog-admin/');
    }
  }, []);
}
