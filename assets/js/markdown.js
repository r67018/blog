import {
  escapeHtml,
  formatCjkHtml,
  applyCjkSpacingToDom,
  enhanceCodeBlocks
} from 'https://r67018.com/ui/src/js/index.js';

export { escapeHtml, formatCjkHtml, applyCjkSpacingToDom, enhanceCodeBlocks };

// Japanese/CJK characters and fullwidth/CJK punctuation (excluding \u3000 fullwidth space)
const CJK_SOFT_BREAK_CHAR_RE = /[\u3001-\u303F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\uFF01-\uFF9F\p{Script=Han}]/u;
const CJK_PLAIN_CLASS = '[\\u3001-\\u303F\\u3040-\\u309F\\u30A0-\\u30FF\\u31F0-\\u31FF\\uFF01-\\uFF9F\\p{Script=Han}]';
const CJK_PLAIN_BREAK_BEFORE_RE = new RegExp(`(${CJK_PLAIN_CLASS})[ \\t]*\\n(?!\\n|[ \\t]*(?:[-*+]|\\d+\\.)\\s)[ \\t]*`, 'gu');
const CJK_PLAIN_BREAK_AFTER_RE = new RegExp(`[ \\t]*(?<!\\n)\\n[ \\t]*(${CJK_PLAIN_CLASS})`, 'gu');

const SKIP_SUBTREE_TAGS = new Set(['PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);
const PROTECTED_INLINE_TAGS = new Set(['CODE', 'KBD', 'SAMP']);
const REPLACED_INLINE_TAGS = new Set(['IMG', 'SVG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME', 'INPUT', 'OBJECT', 'EMBED']);
const BLOCK_OR_BREAK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DETAILS', 'DIALOG',
  'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR', 'LI',
  'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE',
  'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
]);

export function normalizeMarkdown(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  let fenceChar = '';
  return lines.map((line) => {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      return line;
    }
    if (!inFence) {
      return line.replace(/\\\\[ \t]*$/, '  ');
    }
    return line;
  }).join('\n');
}

export function renderMarkdownHtml(md) {
  const mdNormalized = normalizeMarkdown(md || '');
  if (window.marked && typeof window.marked.parse === 'function') {
    const rawHtml = window.marked.parse(mdNormalized, { gfm: true, breaks: false });
    return window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
  }
  return `<pre style="white-space:pre-wrap;">${escapeHtml(md || '')}</pre>`;
}

function getCharBefore(str, index) {
  if (index <= 0) return '';
  const lo = str.charCodeAt(index - 1);
  if (index >= 2 && lo >= 0xDC00 && lo <= 0xDFFF) {
    const hi = str.charCodeAt(index - 2);
    if (hi >= 0xD800 && hi <= 0xDBFF) {
      return str.slice(index - 2, index);
    }
  }
  return str.charAt(index - 1);
}

function getCharAt(str, index) {
  if (index < 0 || index >= str.length) return '';
  return String.fromCodePoint(str.codePointAt(index));
}

function findPrevNonWsChar(run, itemIndex, offset) {
  for (let j = itemIndex; j >= 0; j -= 1) {
    const s = run[j].text;
    let k = (j === itemIndex) ? offset : s.length;
    while (k > 0) {
      const ch = getCharBefore(s, k);
      k -= ch.length;
      if (!/^[ \t\r\n]$/.test(ch)) {
        return ch;
      }
    }
  }
  return '';
}

function findNextNonWsChar(run, itemIndex, endOffset) {
  for (let j = itemIndex; j < run.length; j += 1) {
    const s = run[j].text;
    let k = (j === itemIndex) ? endOffset : 0;
    while (k < s.length) {
      const ch = getCharAt(s, k);
      k += ch.length;
      if (!/^[ \t\r\n]$/.test(ch)) {
        return ch;
      }
    }
  }
  return '';
}

function flushRun(run) {
  if (!run.length) return;
  const updates = [];
  for (let i = 0; i < run.length; i += 1) {
    const item = run[i];
    if (!item.editable || !item.text.includes('\n')) continue;
    const nextText = item.text.replace(/[ \t]*\n(?:[ \t]*\n)*[ \t]*/g, (match, offset) => {
      const prevChar = findPrevNonWsChar(run, i, offset);
      const nextChar = findNextNonWsChar(run, i, offset + match.length);
      if (prevChar && nextChar && (CJK_SOFT_BREAK_CHAR_RE.test(prevChar) || CJK_SOFT_BREAK_CHAR_RE.test(nextChar))) {
        return '';
      }
      return match;
    });
    if (nextText !== item.text) {
      updates.push({ node: item.node, nextText });
    }
  }
  for (const { node, nextText } of updates) {
    node.nodeValue = nextText;
  }
}

export function collapseCjkSoftBreaksInDom(rootEl) {
  if (!rootEl) return;
  let currentRun = [];

  function flush() {
    if (currentRun.length) {
      flushRun(currentRun);
      currentRun = [];
    }
  }

  function walk(el, inProtected) {
    const children = el.childNodes;
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.nodeType === 3) {
        currentRun.push({
          node: child,
          editable: !inProtected,
          text: child.nodeValue || ''
        });
      } else if (child.nodeType === 1) {
        const tag = child.tagName;
        if (SKIP_SUBTREE_TAGS.has(tag)) {
          flush();
        } else if (BLOCK_OR_BREAK_TAGS.has(tag)) {
          flush();
          if (tag !== 'BR' && tag !== 'HR') {
            walk(child, inProtected);
            flush();
          }
        } else if (REPLACED_INLINE_TAGS.has(tag)) {
          currentRun.push({ node: null, editable: false, text: '\uFFFC' });
        } else if (PROTECTED_INLINE_TAGS.has(tag)) {
          walk(child, true);
        } else {
          walk(child, inProtected);
        }
      }
    }
  }

  walk(rootEl, false);
  flush();
}

export function highlightCodeBlocks(rootEl, { addCopyButton = false } = {}) {
  if (!rootEl) return;
  rootEl.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (code && window.hljs) {
      try {
        window.hljs.highlightElement(code);
      } catch {
        // Ignore unsupported language errors gracefully
      }
    }
  });
  if (addCopyButton) {
    enhanceCodeBlocks(rootEl);
  }
}

export function collapseCjkSoftBreaksInPlainText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/^[ \t]+$/gm, '')
    .replace(CJK_PLAIN_BREAK_BEFORE_RE, '$1')
    .replace(CJK_PLAIN_BREAK_AFTER_RE, '$1');
}
