import axios from 'axios';

// Create base instance
export const api = axios.create({
  baseURL: '/api',
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

export interface RepositoryState {
  files: FileNode[];
  fileCount: number;
  totalSize: number;
}


