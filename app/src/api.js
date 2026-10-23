// Talks to the Kavach backend (the Node server in /backend).

async function request(baseUrl, path, { method = 'GET', body, timeout = 10000 } = {}) {
  if (!baseUrl) throw new Error('Add the server address in Settings first.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server replied ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Network request failed') {
      throw new Error(
        `Can't reach the server at ${baseUrl}. Check that the backend is running and the phone is on the same Wi-Fi.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: (url) => request(url, '/api/health', { timeout: 5000 }),
  demoCalls: (url) => request(url, '/api/demo-calls'),
  createSession: (url, source, title) => request(url, '/api/sessions', { method: 'POST', body: { source, title } }),
  sendText: (url, id, text, speaker) =>
    request(url, `/api/sessions/${id}/text`, { method: 'POST', body: { text, speaker }, timeout: 15000 }),
  endSession: (url, id) => request(url, `/api/sessions/${id}/end`, { method: 'POST' }),
  testAlert: (url) => request(url, '/api/test-alert', { method: 'POST' }),
};
