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
