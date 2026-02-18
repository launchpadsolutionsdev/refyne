const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: {},
    ...options,
  };

  if (config.body && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// Projects
export function getProjects() {
  return request('/projects');
}

export function getProject(id) {
  return request(`/projects/${id}`);
}

export function createProject(name, description) {
  return request('/projects', {
    method: 'POST',
    body: { name, description },
  });
}

export function updateProject(id, data) {
  return request(`/projects/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export function deleteProject(id) {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

// Documents
export function getDocuments(projectId) {
  return request(`/projects/${projectId}/documents`);
}

export function uploadDocuments(projectId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return request(`/projects/${projectId}/documents`, {
    method: 'POST',
    body: formData,
  });
}

export function getDocument(id) {
  return request(`/documents/doc/${id}`);
}

export function deleteDocument(id) {
  return request(`/documents/doc/${id}`, { method: 'DELETE' });
}

// Processing
export function startProcessing(projectId) {
  return request(`/projects/${projectId}/process`, { method: 'POST' });
}

export function getProcessingStatus(projectId) {
  return request(`/projects/${projectId}/process/status`);
}

// Chunks
export function getChunks(projectId, { category, status, search, tag } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (tag) params.set('tag', tag);
  const qs = params.toString();
  return request(`/projects/${projectId}/chunks${qs ? `?${qs}` : ''}`);
}

export function getChunkCategories(projectId) {
  return request(`/projects/${projectId}/chunks/categories`);
}

export function getChunkStats(projectId) {
  return request(`/projects/${projectId}/chunks/stats`);
}

export function updateChunk(id, data) {
  return request(`/chunks/${id}`, { method: 'PATCH', body: data });
}

export function deleteChunk(id) {
  return request(`/chunks/${id}`, { method: 'DELETE' });
}

export function splitChunk(id, position) {
  return request(`/chunks/${id}/split`, { method: 'POST', body: { position } });
}

export function mergeChunks(chunkIds) {
  return request('/chunks/merge', { method: 'POST', body: { chunkIds } });
}

export function bulkUpdateChunks(data) {
  return request('/chunks/bulk', { method: 'PATCH', body: data });
}

export function addTagToChunk(chunkId, name) {
  return request(`/chunks/${chunkId}/tags`, { method: 'POST', body: { name } });
}

export function removeTagFromChunk(chunkId, tagId) {
  return request(`/chunks/${chunkId}/tags/${tagId}`, { method: 'DELETE' });
}

// Tags
export function getTags(projectId) {
  return request(`/projects/${projectId}/tags`);
}
