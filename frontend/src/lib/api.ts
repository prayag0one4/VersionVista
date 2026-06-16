import axios from 'axios';

// Create base instance
export const api = axios.create({
  baseURL: '/api',
});

// Types based on backend structures
export interface Repository {
  _id: string;
  name: string;
  remoteUrl: string;
  defaultBranch: string;
  localPath: string;
  status: string;
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
}

export interface FileNode {
  filePath: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  status?: 'added' | 'modified' | 'deleted' | 'unchanged';
}

export interface RepositoryState {
  files: FileNode[];
  fileCount: number;
  totalSize: number;
}

export interface DiffInfo {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}
