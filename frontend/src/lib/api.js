const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export const api = {
  listRepos: () => request('/repo'),
  fetchRepo: (repoUrl) =>
    request('/repo/fetch', {
      method: 'POST',
      body: JSON.stringify({ repoUrl })
    }),
  listCommits: (repoId, limit = 100) =>
    request(`/commits?repoId=${encodeURIComponent(repoId)}&limit=${limit}`),
  getCommitPaths: (repoId, commitHash) =>
    request(`/snapshot-paths?repoId=${encodeURIComponent(repoId)}&commitHash=${encodeURIComponent(commitHash)}`),
  getCommitFile: (repoId, commitHash, filePath) =>
    request(`/snapshot-file?repoId=${encodeURIComponent(repoId)}&commitHash=${encodeURIComponent(commitHash)}&path=${encodeURIComponent(filePath)}`),
  listSnapshots: (repoId, limit = 20) =>
    request(`/code-snapshots/${encodeURIComponent(repoId)}?limit=${limit}`),
  getRepo: (repoId) => request(`/repo/${encodeURIComponent(repoId)}`)
}