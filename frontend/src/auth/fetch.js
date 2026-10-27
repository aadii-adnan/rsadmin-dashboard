export const isUsableToken = (token) => {
  if (typeof token !== 'string') return false;
  const normalizedToken = token.trim().toLowerCase();
  return Boolean(normalizedToken && normalizedToken !== 'null' && normalizedToken !== 'undefined');
};

const customFetch = async (url, { method = 'GET', body = null, headers = {}, useFinanceJwt = false, ...options } = {}) => {
    let refresh = false;
    let response;

    // Finance and Blog Admin now share the normal application session. Keep
    // the legacy option as a compatibility fallback only for stale Admin links
    // that have not yet been promoted by RequireFullSuperAdmin.
    const hasPrimarySession = isUsableToken(localStorage.getItem('access_token'));
    const useLegacyFinanceSession = useFinanceJwt
      && !hasPrimarySession
      && isUsableToken(localStorage.getItem('finance_jwt'));
    const accessKey = useLegacyFinanceSession ? 'finance_jwt' : 'access_token';
    const refreshKey = useLegacyFinanceSession ? 'finance_jwt_refresh' : 'refresh_token';

    const token = localStorage.getItem(accessKey);

    const mergedHeaders = {
      ...headers,
    };

    // Public endpoints must not receive a fake `Bearer null` credential. DRF
    // authenticates a supplied credential before applying AllowAny, so an
    // invalid header turns a valid guest request into a 401 response.
    if (isUsableToken(token)) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }

    if (!(body instanceof FormData)) {
      mergedHeaders['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
      method,
      headers: mergedHeaders,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
      ...options,
    };

    response = await fetch(url, fetchOptions);

    if (response.status === 401 && !refresh && isUsableToken(token)) {
      refresh = true;

      const refreshToken = localStorage.getItem(refreshKey);

      const refreshResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh: refreshToken,
          }),
        }
      );

      if (refreshResponse.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem(accessKey);
        localStorage.removeItem(refreshKey);
        window.location.href = "/";
        return;
      }

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();

        // Store new tokens in local storage
        localStorage.setItem(accessKey, data.access);
        localStorage.setItem(refreshKey, data.refresh);

        // Update the Authorization header with the new token
        fetchOptions.headers['Authorization'] = `Bearer ${data.access}`;

        // Retry the original request with the new token
        response = await fetch(url, fetchOptions);
      } else {
        alert("Session expired. Please log in again.");
        localStorage.removeItem(accessKey);
        localStorage.removeItem(refreshKey);
        window.location.href = "/";
        return;
      }
    }

    refresh = false;

    if (!response.ok) {
      console.error('Fetch error:', response.statusText);
    }

    return response;
  };

export default customFetch;
