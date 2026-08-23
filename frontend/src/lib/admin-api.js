/**
 * Admin fetch helper.
 *
 * The admin used to proxy through /api/proxy because it ran as a separate app
 * and could not send cookies cross-origin. Now that everything is one Next
 * application the proxy is gone and the session cookie travels with the
 * request on its own.
 */
export const API = '/api';

export async function api(path, opts = {}) {
  const { redirectOnUnauthorized = true, ...fetchOptions } = opts;
  const headers = new Headers(fetchOptions.headers || {});
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (response.status === 401 && redirectOnUnauthorized && typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
  return response;
}

export async function getUser() {
  const response = await api('/auth/me', { redirectOnUnauthorized: false });
  return response.ok ? response.json() : null;
}
