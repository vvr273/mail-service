export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://mail-service-a8wc.onrender.com").replace(/\/$/, "");

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
