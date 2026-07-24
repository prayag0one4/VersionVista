import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

export const setRepoToken = (repoId: string, token: string) => {
  sessionStorage.setItem(`gh_token_${repoId}`, token);
};

export const getRepoToken = (repoId: string): string | undefined => {
  return sessionStorage.getItem(`gh_token_${repoId}`) || undefined;
};

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const match = url.match(/\/code-snapshots\/([^/]+)\//);
  if (match) {
    const token = getRepoToken(match[1]);
    if (token) {
      config.headers.set('X-GitHub-Token', token);
    }
  }
  return config;
});

// Types based on backend structures
export interface Repository {
  _id: string;
  name: string;
  owner: string;
  githubUrl: string;
  defaultBranch: string;
}

export interface Commit {
  _id: string;
  commitHash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  timestamp: string;
  repoId: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

export interface FileNode {
  filePath: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  status?: 'added' | 'modified' | 'deleted' | 'unchanged';
}

export interface FileChange {
  _id: string;
  commitId: string;
  repoId: string;
  filePath: string;
  changeType: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
}

export interface RepositoryState {
  files: FileNode[];
  fileCount: number;
  totalSize: number;
}


