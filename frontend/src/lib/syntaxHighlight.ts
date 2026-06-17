import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighterInstance(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark-dimmed'],
      langs: [
        'typescript', 'javascript', 'tsx', 'jsx',
        'python', 'rust', 'go', 'java', 'cpp', 'c',
        'json', 'yaml', 'toml', 'markdown',
        'html', 'css', 'scss', 'sql',
        'bash', 'shell', 'dockerfile',
      ],
    });
  }
  return highlighterPromise;
}

function getLanguageFromPath(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'cpp',
    hpp: 'cpp',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    dockerfile: 'dockerfile',
    md: 'markdown',
    markdown: 'markdown',
    txt: 'plaintext',
  };
  return langMap[ext] || 'plaintext';
}

export interface TokenInfo {
  content: string;
  color: string | undefined;
}

export interface TokenizedLine {
  tokens: TokenInfo[];
}

export async function tokenizeCode(code: string, filePath: string) {
  const highlighter = await getHighlighterInstance();
  const lang = getLanguageFromPath(filePath);

  const result = highlighter.codeToTokens(code, {
    lang: lang as any,
    theme: 'github-dark-dimmed',
  });

  return {
    lines: result.tokens.map(line => ({
      tokens: line.map(token => ({
        content: token.content,
        color: token.color ?? result.fg,
      })),
    })),
    bg: result.bg,
  };
}