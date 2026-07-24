const GITHUB_API = "https://api.github.com";

const headers = () => {
  const h = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
};

const ghFetch = async (url) => {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  return res;
};

const parseRepoUrl = (repoUrl) => {
  const parsed = new URL(repoUrl);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return { owner: parts[0], repo: parts[1]?.replace(".git", "") };
};

const getCommitLog = async (repoUrl, maxCount = 20) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const res = await ghFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${maxCount}`
  );
  const commits = await res.json();

  return commits.map((c) => ({
    hash: c.sha,
    message: c.commit.message,
    author_name: c.commit.author?.name || "unknown",
    author_email: c.commit.author?.email || "",
    date: c.commit.author?.date || "",
    refs: c.parents?.length === 1 ? "" : "",
  }));
};

const getDiffSummary = async (repoUrl, hash) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const res = await ghFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits/${hash}`
  );
  const data = await res.json();

  const files = (data.files || []).map((f) => ({
    file: f.filename,
    changes: f.changes,
    insertions: f.additions,
    deletions: f.deletions,
    binary: f.binary || false,
  }));

  return {
    changed: files.length,
    insertions: data.stats?.additions || 0,
    deletions: data.stats?.deletions || 0,
    files,
  };
};

const getRawDiff = async (repoUrl, hash) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits/${hash}`,
    {
      headers: { ...headers(), Accept: "application/vnd.github.v3.diff" },
    }
  );
  const diffText = await res.text();
  const lines = diffText.split("\n");

  const results = [];
  let currentFile = null;
  let currentHunks = [];
  let currentHunk = null;
  let currentChangeType = "modified";

  const flushHunk = () => {
    if (currentHunk) {
      currentHunks.push(currentHunk);
      currentHunk = null;
    }
  };

  const flushFile = () => {
    flushHunk();
    if (currentFile) {
      results.push({
        filePath: currentFile,
        changeType: currentChangeType,
        hunks: currentHunks,
      });
    }
    currentFile = null;
    currentHunks = [];
    currentChangeType = "modified";
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      flushFile();
      const parts = line.split(" ");
      currentFile = (parts[2] || "").replace("a/", "");
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith("new file mode")) {
      currentChangeType = "added";
      continue;
    }
    if (line.startsWith("deleted file mode")) {
      currentChangeType = "deleted";
      continue;
    }
    if (line.startsWith("@@")) {
      flushHunk();
      const match = line.match(
        /^@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/
      );
      currentHunk = {
        oldStart: match ? Number(match[1]) : 0,
        oldLines: match ? Number(match[2] || 1) : 0,
        newStart: match ? Number(match[3]) : 0,
        newLines: match ? Number(match[4] || 1) : 0,
        changes: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.changes.push({ type: "added", content: line.slice(1) });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.changes.push({ type: "removed", content: line.slice(1) });
    } else if (line.startsWith(" ")) {
      currentHunk.changes.push({ type: "context", content: line.slice(1) });
    }
  }

  flushFile();
  return results;
};

const getAllFilePathsAtCommit = async (repoUrl, commitHash) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const res = await ghFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${commitHash}?recursive=1`
  );
  const data = await res.json();
  return (data.tree || [])
    .filter((item) => item.type === "blob")
    .map((item) => item.path);
};

const getFileContent = async (repoUrl, commitHash, filePath) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const res = await ghFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${commitHash}`
  );
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
};

const getFileDiff = async (repoUrl, fromCommitHash, toCommitHash, filePath) => {
  const [oldContent, newContent] = await Promise.all([
    getFileContent(repoUrl, fromCommitHash, filePath).catch(() => ""),
    getFileContent(repoUrl, toCommitHash, filePath).catch(() => ""),
  ]);

  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const n = oldLines.length;
  const m = newLines.length;
  const dp = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        oldLines[i] === newLines[j]
          ? 1 + dp[i + 1][j + 1]
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const alignment = [];
  let i = 0,
    j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && oldLines[i] === newLines[j]) {
      alignment.push({ type: "context", oldIndex: i, newIndex: j });
      i++;
      j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      alignment.push({ type: "added", oldIndex: null, newIndex: j });
      j++;
    } else if (i < n) {
      alignment.push({ type: "removed", oldIndex: i, newIndex: null });
      i++;
    } else {
      alignment.push({ type: "added", oldIndex: null, newIndex: j });
      j++;
    }
  }

  let oldLineNum = 0;
  let newLineNum = 0;

  const result = alignment.map((item) => {
    if (item.type === "context") {
      oldLineNum++;
      newLineNum++;
      return {
        type: "context",
        content: newLines[item.newIndex],
        oldLineNum,
        newLineNum,
      };
    } else if (item.type === "added") {
      newLineNum++;
      return {
        type: "added",
        content: newLines[item.newIndex],
        oldLineNum: null,
        newLineNum,
      };
    } else {
      oldLineNum++;
      return {
        type: "removed",
        content: oldLines[item.oldIndex],
        oldLineNum,
        newLineNum: null,
      };
    }
  });

  return result.length > 0
    ? result
    : newLines.map((content, idx) => ({
        type: "context",
        content,
        oldLineNum: idx + 1,
        newLineNum: idx + 1,
      }));
};

module.exports = {
  parseRepoUrl,
  getCommitLog,
  getDiffSummary,
  getRawDiff,
  getAllFilePathsAtCommit,
  getFileContent,
  getFileDiff,
};
