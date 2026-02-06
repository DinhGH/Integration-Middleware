async function forwardRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }

  return { status: response.status, data };
}

function normalizeBearerToken(token) {
  if (!token) return "";
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

function buildForwardHeaders(req, extraHeaders = {}, authFallback = "") {
  const headers = { ...extraHeaders };
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  } else if (authFallback) {
    headers.Authorization = normalizeBearerToken(authFallback);
  }
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  return headers;
}

function buildPhoneStoreCookie(username) {
  if (!username) return "";
  return `user=${encodeURIComponent(username)}`;
}

module.exports = {
  forwardRequest,
  normalizeBearerToken,
  buildForwardHeaders,
  buildPhoneStoreCookie,
};
