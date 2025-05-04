const customFetch = async (url, { method = 'GET', body = null, headers = {}, ...options } = {}) => {
    let refresh = false;
    let response;
  
    const token = localStorage.getItem('access_token');
  
    // Don't set Content-Type if body is FormData
    const mergedHeaders = {
      'Authorization': `Bearer ${token}`,
      ...headers,
    };
  
    // Remove Content-Type if body is FormData
    if (!(body instanceof FormData)) {
      mergedHeaders['Content-Type'] = 'application/json';
    }
  
    const fetchOptions = {
      method,
      headers: mergedHeaders,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
      ...options,
    };
  
    // Make the fetch request
    response = await fetch(url, fetchOptions);
  
    if (response.status === 401 && !refresh) {
      refresh = true;
  
      const refreshToken = localStorage.getItem('refresh_token');
  
      const refreshResponse = await fetch('http://localhost:8000/api/auth/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });
  
      // if (refreshResponse.status === 401){
      //   localStorage.clear();
      //   window.location.href = "/login"
      // }
  
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
  
        // Store new tokens in local storage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
  
        // Update the Authorization header with the new token
        fetchOptions.headers['Authorization'] = `Bearer ${data.access}`;
  
        // Retry the original request with the new token
        response = await fetch(url, fetchOptions);
      } else {
        console.error('Failed to refresh token');
        throw new Error('Failed to refresh token');
      }
    }
  
    refresh = false;
  
    // Handle errors if needed
    if (!response.ok) {
      console.error('Fetch error:', response.statusText);
    }
  
    return response;
  };
  
  export default customFetch;
  