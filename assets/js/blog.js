(() => {
  'use strict';

  const SITE = {
    title: "ryosei's Blog",
    description: '主にプログラミングのことを呟く予定',
    paginate: 5,
    author: {
      name: 'ryosei',
      avatar: '/assets/images/bio-photo.jpg',
      bio: '主にプログラミングのことを呟く予定',
      links: [
        { label: 'Website', url: 'https://r67018.com' },
        { label: 'X', url: 'https://x.com/r67018' },
        { label: 'GitHub', url: 'https://github.com/r67018' }
      ]
    }
  };

  const state = {
    allPosts: [],
    publishedPosts: [],
    loaded: false
  };

  const dom = {
    container: document.getElementById('site-container'),
    main: document.getElementById('main-content'),
    tocSidebar: document.getElementById('toc-sidebar'),
    navLinks: document.querySelectorAll('.nav-link[data-nav]'),
    searchTrigger: document.getElementById('search-trigger'),
    searchModal: document.getElementById('search-modal'),
    searchInput: document.getElementById('search-modal-input'),
    searchClose: document.getElementById('search-modal-close'),
    searchResults: document.getElementById('search-results')
  };

  // ============================================================
  // Utilities
  // ============================================================
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const CJK_BOUNDARY_MARKER = '\u0000';
  const CJK_TO_LATIN_RE = /([\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])([A-Za-z0-9])/g;
  const LATIN_TO_CJK_RE = /([A-Za-z0-9])([\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/g;
  const CJK_TO_LATIN_TEST_RE = /([\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])([A-Za-z0-9])/;
  const LATIN_TO_CJK_TEST_RE = /([A-Za-z0-9])([\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/;

  function formatCjkHtml(str) {
    const raw = String(str ?? '').replace(/\u0000/g, '');
    const marked = raw
      .replace(CJK_TO_LATIN_RE, `$1${CJK_BOUNDARY_MARKER}$2`)
      .replace(LATIN_TO_CJK_RE, `$1${CJK_BOUNDARY_MARKER}$2`);
    return escapeHtml(marked).split(CJK_BOUNDARY_MARKER).join('<span class="cjk-space" aria-hidden="true"></span>');
  }

  function applyCjkSpacingToDom(rootEl) {
    if (!rootEl) return;
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        let p = node.parentNode;
        while (p && p !== rootEl) {
          if (p.nodeType === 1) {
            const tag = p.tagName;
            if (tag === 'PRE' || tag === 'CODE' || tag === 'KBD' || tag === 'SAMP' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') {
              return NodeFilter.FILTER_REJECT;
            }
            if (p.classList && p.classList.contains('cjk-space')) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          p = p.parentNode;
        }
        return (CJK_TO_LATIN_TEST_RE.test(node.nodeValue) || LATIN_TO_CJK_TEST_RE.test(node.nodeValue))
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const targets = [];
    let current;
    while ((current = walker.nextNode())) {
      targets.push(current);
    }

    targets.forEach((textNode) => {
      const text = textNode.nodeValue.replace(/\u0000/g, '');
      const parts = text
        .replace(CJK_TO_LATIN_RE, `$1${CJK_BOUNDARY_MARKER}$2`)
        .replace(LATIN_TO_CJK_RE, `$1${CJK_BOUNDARY_MARKER}$2`)
        .split(CJK_BOUNDARY_MARKER);
      if (parts.length <= 1 || !textNode.parentNode) return;

      const frag = document.createDocumentFragment();
      parts.forEach((part, idx) => {
        if (idx > 0) {
          const space = document.createElement('span');
          space.className = 'cjk-space';
          space.setAttribute('aria-hidden', 'true');
          frag.appendChild(space);
        }
        if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  function safeDecode(str) {
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}/${m[2]}/${m[3]}`;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  }

  function getYear(dateStr) {
    const m = String(dateStr || '').match(/^(\d{4})/);
    return m ? m[1] : 'Other';
  }

  function stripMarkdown(md) {
    return String(md || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      .replace(/^\[[^\]]+\]:.*$/gm, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_~>\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function makeExcerpt(body, maxLen = 150) {
    const plain = stripMarkdown(body);
    if (plain.length <= maxLen) return plain;
    return `${plain.slice(0, maxLen).trim()}...`;
  }

  function getPostUrl(post) {
    const key = post.id || post.slug || post.title || '';
    return `/posts/${encodeURIComponent(key)}/`;
  }

  function normalizeMarkdown(md) {
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

  function renderChips(post) {
    const cats = (post.categories || []).map(
      (c) => `<a class="chip cat" href="/categories/?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`
    );
    const tags = (post.tags || []).map(
      (t) => `<a class="chip" href="/tags/?tag=${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`
    );
    const all = [...cats, ...tags];
    return all.length ? `<div class="chip-row">${all.join('')}</div>` : '';
  }

  // ============================================================
  // Data Loading
  // ============================================================
  async function loadPosts() {
    if (state.loaded) return;
    const res = await fetch('/posts.json', { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`posts.json load failed (${res.status})`);
    }
    const items = await res.json();
    state.allPosts = Array.isArray(items) ? items : [];
    state.publishedPosts = state.allPosts
      .filter((p) => p && p.published !== false)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    state.loaded = true;
  }

  // ============================================================
  // Views
  // ============================================================
  function clearToc() {
    dom.container.classList.remove('has-toc');
    dom.tocSidebar.classList.add('hidden');
    dom.tocSidebar.innerHTML = '';
  }

  function setActiveNav(key) {
    dom.navLinks.forEach((el) => {
      el.classList.toggle('active', el.dataset.nav === key);
    });
  }

  function renderHome(pageNum = 1) {
    clearToc();
    setActiveNav('home');
    document.title = SITE.title;

    const total = state.publishedPosts.length;
    const totalPages = Math.max(1, Math.ceil(total / SITE.paginate));
    const page = Math.min(Math.max(1, pageNum), totalPages);
    const start = (page - 1) * SITE.paginate;
    const slice = state.publishedPosts.slice(start, start + SITE.paginate);

    const cardsHtml = slice.length
      ? slice.map((post) => {
          const url = getPostUrl(post);
          return `
            <article class="post-card" data-post-url="${url}">
              <div class="post-card-date">${escapeHtml(formatDate(post.date))}</div>
              <div class="post-card-body">
                <h2 class="post-card-title"><a href="${url}">${formatCjkHtml(post.title)}</a></h2>
                <p class="post-excerpt">${formatCjkHtml(makeExcerpt(post.body))}</p>
                ${renderChips(post)}
              </div>
            </article>
          `;
        }).join('')
      : `<div class="empty-state">記事がまだありません。</div>`;

    let paginationHtml = '';
    if (totalPages > 1) {
      const prevUrl = page > 1 ? (page === 2 ? '/' : `/?page=${page - 1}`) : '#';
      const nextUrl = page < totalPages ? `/?page=${page + 1}` : '#';
      paginationHtml = `
        <nav class="pagination" aria-label="Pagination">
          <a class="btn ${page <= 1 ? 'disabled' : ''}" href="${prevUrl}">← 新しい記事</a>
          <span class="meta-mono" style="font-size:12px; color:var(--text-muted);">Page ${page} / ${totalPages}</span>
          <a class="btn ${page >= totalPages ? 'disabled' : ''}" href="${nextUrl}">過去の記事 →</a>
        </nav>
      `;
    }

    dom.main.innerHTML = `
      <header class="page-header">
        <h1 class="page-title">Recent Posts</h1>
      </header>
      <div class="post-cards">${cardsHtml}</div>
      ${paginationHtml}
    `;
  }

  function renderYearArchive() {
    clearToc();
    setActiveNav('posts');
    document.title = `Posts by Year | ${SITE.title}`;

    const groups = new Map();
    state.publishedPosts.forEach((post) => {
      const y = getYear(post.date);
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(post);
    });

    const years = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
    const pillsHtml = years.map(
      (y) => `<a class="taxonomy-pill" href="#year-${escapeHtml(y)}">${escapeHtml(y)} <span class="taxonomy-count">${groups.get(y).length}</span></a>`
    ).join('');

    const groupsHtml = years.map((y) => {
      const list = groups.get(y).map((post) => {
        const url = getPostUrl(post);
        return `
        <li class="archive-item" data-post-url="${url}">
          <span class="archive-date">${escapeHtml(formatDate(post.date))}</span>
          <a class="archive-link" href="${url}">${formatCjkHtml(post.title)}</a>
        </li>
      `;
      }).join('');
      return `
        <section class="archive-group" id="year-${escapeHtml(y)}">
          <h2 class="archive-group-title">${escapeHtml(y)}</h2>
          <ul class="archive-list">${list}</ul>
        </section>
      `;
    }).join('');

    dom.main.innerHTML = `
      <header class="page-header">
        <h1 class="page-title">Posts by Year</h1>
        <p class="page-subtitle">全 ${state.publishedPosts.length} 件</p>
      </header>
      <div class="taxonomy-index">${pillsHtml}</div>
      ${groupsHtml || '<div class="empty-state">記事がありません。</div>'}
    `;
  }

  function renderTaxonomyArchive(kind, filterValue = '') {
    clearToc();
    const isCat = kind === 'categories';
    setActiveNav(isCat ? 'categories' : 'tags');
    const pageHeading = isCat ? 'Posts by Category' : 'Posts by Tag';
    document.title = `${pageHeading} | ${SITE.title}`;

    const groups = new Map();
    state.publishedPosts.forEach((post) => {
      const items = isCat ? (post.categories || []) : (post.tags || []);
      items.forEach((raw) => {
        const key = String(raw).trim();
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(post);
      });
    });

    const keys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'ja'));
    const baseRoute = isCat ? '/categories/' : '/tags/';
    const paramName = isCat ? 'category' : 'tag';

    const pillsHtml = `
      <a class="taxonomy-pill ${!filterValue ? 'active' : ''}" href="${baseRoute}">All <span class="taxonomy-count">${state.publishedPosts.length}</span></a>
      ${keys.map((k) => {
        const active = filterValue && filterValue.toLowerCase() === k.toLowerCase();
        return `<a class="taxonomy-pill ${active ? 'active' : ''}" href="${baseRoute}?${paramName}=${encodeURIComponent(k)}">${isCat ? '' : '#'}${escapeHtml(k)} <span class="taxonomy-count">${groups.get(k).length}</span></a>`;
      }).join('')}
    `;

    const displayKeys = filterValue
      ? keys.filter((k) => k.toLowerCase() === filterValue.toLowerCase())
      : keys;

    const groupsHtml = displayKeys.map((k) => {
      const list = groups.get(k).map((post) => {
        const url = getPostUrl(post);
        return `
        <li class="archive-item" data-post-url="${url}">
          <span class="archive-date">${escapeHtml(formatDate(post.date))}</span>
          <a class="archive-link" href="${url}">${formatCjkHtml(post.title)}</a>
        </li>
      `;
      }).join('');
      return `
        <section class="archive-group" id="tax-${escapeHtml(k)}">
          <h2 class="archive-group-title">${isCat ? '' : '#'}${escapeHtml(k)}</h2>
          <ul class="archive-list">${list}</ul>
        </section>
      `;
    }).join('');

    dom.main.innerHTML = `
      <header class="page-header">
        <h1 class="page-title">${pageHeading}</h1>
      </header>
      <div class="taxonomy-index">${pillsHtml}</div>
      ${groupsHtml || '<div class="empty-state">該当する記事がありません。</div>'}
    `;
  }

  function renderSinglePost(post) {
    setActiveNav('posts');
    document.title = `${post.title} | ${SITE.title}`;

    const mdNormalized = normalizeMarkdown(post.body || '');
    let bodyHtml = '';
    if (window.marked && typeof window.marked.parse === 'function') {
      const rawHtml = window.marked.parse(mdNormalized, { gfm: true, breaks: false });
      bodyHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
    } else {
      bodyHtml = `<pre>${escapeHtml(post.body || '')}</pre>`;
    }

    const idx = state.publishedPosts.indexOf(post);
    const newerPost = idx > 0 ? state.publishedPosts[idx - 1] : null;
    const olderPost = idx >= 0 && idx < state.publishedPosts.length - 1 ? state.publishedPosts[idx + 1] : null;

    // Related posts by shared tags (weight 2) + shared categories (weight 1)
    const related = state.publishedPosts
      .filter((other) => other !== post)
      .map((other) => {
        const sharedTags = (other.tags || []).filter((t) => (post.tags || []).includes(t)).length;
        const sharedCats = (other.categories || []).filter((c) => (post.categories || []).includes(c)).length;
        return { post: other, score: sharedTags * 2 + sharedCats };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.post);

    const shareUrl = window.location.origin + getPostUrl(post);
    const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`;

    const modifiedHtml = post.last_modified_at
      ? `<span class="meta-mono">更新: ${escapeHtml(formatDate(post.last_modified_at))}</span>`
      : '';

    const navHtml = (olderPost || newerPost) ? `
      <nav class="post-nav" aria-label="Post navigation">
        ${olderPost
          ? `<a class="post-nav-card prev" href="${getPostUrl(olderPost)}"><span class="post-nav-label">← 前の記事</span><span class="post-nav-title">${formatCjkHtml(olderPost.title)}</span></a>`
          : '<div></div>'}
        ${newerPost
          ? `<a class="post-nav-card next" href="${getPostUrl(newerPost)}"><span class="post-nav-label">次の記事 →</span><span class="post-nav-title">${formatCjkHtml(newerPost.title)}</span></a>`
          : '<div></div>'}
      </nav>
    ` : '';

    const relatedHtml = related.length ? `
      <section class="related-section">
        <h2 class="related-heading">関連記事</h2>
        <div class="related-grid">
          ${related.map((r) => `
            <a class="related-card" href="${getPostUrl(r)}">
              <span class="related-card-title">${formatCjkHtml(r.title)}</span>
              <span class="related-card-date">${escapeHtml(formatDate(r.date))}</span>
            </a>
          `).join('')}
        </div>
      </section>
    ` : '';

    dom.main.innerHTML = `
      <article class="article-card">
        <header class="article-header">
          <h1 class="article-title">${formatCjkHtml(post.title)}</h1>
          <div class="post-meta">
            <span class="meta-mono">${escapeHtml(formatDate(post.date))}</span>
            ${modifiedHtml}
          </div>
          ${renderChips(post)}
        </header>

        <div class="toc-inline hidden" id="toc-inline"></div>
        <div class="markdown-body" id="article-body">${bodyHtml}</div>

        <footer class="article-footer">
          <div class="share-row">
            <span class="share-label">共有:</span>
            <a class="btn" href="${xShareUrl}" target="_blank" rel="noopener noreferrer">X でポスト</a>
            <button type="button" class="btn" id="copy-post-url-btn">URLをコピー</button>
          </div>
          ${navHtml}
        </footer>
      </article>
      ${relatedHtml}
    `;

    const articleBody = document.getElementById('article-body');
    applyCjkSpacingToDom(articleBody);

    // Syntax highlighting + copy buttons
    articleBody.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      if (code && window.hljs) {
        try {
          window.hljs.highlightElement(code);
        } catch {
          // Ignore unsupported language errors gracefully
        }
      }
      const wrap = document.createElement('div');
      wrap.className = 'code-block-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', async () => {
        const text = code ? code.textContent : pre.textContent;
        try {
          await navigator.clipboard.writeText(text || '');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        } catch {
          // Ignore clipboard errors
        }
      });
      wrap.appendChild(copyBtn);
    });

    // Build TOC from headings if enabled
    const tocInline = document.getElementById('toc-inline');
    if (post.toc !== false) {
      const headings = Array.from(articleBody.querySelectorAll('h1, h2, h3, h4'));
      if (headings.length > 0) {
        const tocItemsHtml = headings.map((h, i) => {
          const id = `heading-${i}`;
          h.id = id;
          const level = parseInt(h.tagName.slice(1), 10);
          return `<li><a class="toc-link toc-level-${level}" href="#${id}">${formatCjkHtml(h.textContent)}</a></li>`;
        }).join('');

        const tocContent = `<p class="toc-title">目次</p><ul class="toc-list">${tocItemsHtml}</ul>`;
        dom.tocSidebar.innerHTML = tocContent;
        dom.tocSidebar.classList.remove('hidden');
        dom.container.classList.add('has-toc');

        tocInline.innerHTML = tocContent;
        tocInline.classList.remove('hidden');
      } else {
        clearToc();
      }
    } else {
      clearToc();
    }

    const copyUrlBtn = document.getElementById('copy-post-url-btn');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copyUrlBtn.textContent = 'コピーしました';
          setTimeout(() => { copyUrlBtn.textContent = 'URLをコピー'; }, 1800);
        } catch {
          // Ignore clipboard errors
        }
      });
    }
  }

  function render404() {
    clearToc();
    setActiveNav('');
    document.title = `404 Page Not Found | ${SITE.title}`;
    const decodedPath = safeDecode(window.location.pathname || '/');
    const pathHtml = (decodedPath && decodedPath !== '/' && decodedPath !== '/404.html')
      ? `<div class="not-found-path">${escapeHtml(decodedPath)}</div>`
      : '';
    dom.main.innerHTML = `
      <section class="not-found" aria-labelledby="not-found-title">
        <p class="not-found-code">404</p>
        <h1 class="not-found-title" id="not-found-title">Page Not Found</h1>
        <p class="not-found-desc">${formatCjkHtml('お探しのページは見つかりませんでした。URLが変更されたか、削除された可能性があります。')}</p>
        ${pathHtml}
        <a class="not-found-home-btn" href="/">
          <svg class="not-found-home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>ホームページに戻る</span>
        </a>
      </section>
    `;
  }

  // ============================================================
  // Router
  // ============================================================
  function findPostByIdentifier(rawIdent) {
    const ident = safeDecode(rawIdent || '').replace(/\/+$/, '');
    if (!ident) return null;
    const identLower = ident.toLowerCase();
    return state.publishedPosts.find((p) => {
      if (p.id) {
        return String(p.id).toLowerCase() === identLower;
      }
      const baseFilename = (p.filename || '').replace(/\.(md|markdown)$/i, '');
      return (
        p.slug === ident ||
        p.title === ident ||
        baseFilename === ident ||
        p.filename === ident
      );
    }) || null;
  }

  function renderCurrentRoute() {
    const url = new URL(window.location.href);
    const postParam = url.searchParams.get('post');
    if (postParam) {
      const matched = findPostByIdentifier(postParam);
      if (matched) {
        renderSinglePost(matched);
      } else {
        render404();
      }
      return;
    }

    const rawPath = url.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
    const decodedPath = safeDecode(rawPath);

    if (decodedPath === '/') {
      const pageNum = parseInt(url.searchParams.get('page') || '1', 10) || 1;
      renderHome(pageNum);
      return;
    }

    if (decodedPath === '/posts') {
      renderYearArchive();
      return;
    }

    if (decodedPath === '/categories') {
      const filter = url.searchParams.get('category') || safeDecode(url.hash.replace(/^#/, ''));
      renderTaxonomyArchive('categories', filter);
      return;
    }

    if (decodedPath === '/tags') {
      const filter = url.searchParams.get('tag') || safeDecode(url.hash.replace(/^#/, ''));
      renderTaxonomyArchive('tags', filter);
      return;
    }

    // Match /posts/:id/
    const segments = decodedPath.split('/').filter(Boolean);
    if (segments.length === 2 && segments[0] === 'posts') {
      const matched = findPostByIdentifier(segments[1]);
      if (matched) {
        renderSinglePost(matched);
        return;
      }
    }

    render404();
  }

  function navigateTo(urlStr) {
    const nextUrl = new URL(urlStr, window.location.origin);
    if (nextUrl.origin !== window.location.origin) {
      window.location.href = urlStr;
      return;
    }
    history.pushState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
    renderCurrentRoute();
    if (nextUrl.hash) {
      const target = document.getElementById(safeDecode(nextUrl.hash.slice(1)));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ============================================================
  // Search Modal
  // ============================================================
  function openSearchModal() {
    dom.searchModal.classList.remove('hidden');
    dom.searchInput.value = '';
    renderSearchResults('');
    setTimeout(() => dom.searchInput.focus(), 30);
  }

  function closeSearchModal() {
    dom.searchModal.classList.add('hidden');
  }

  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recent = state.publishedPosts.slice(0, 5);
      dom.searchResults.innerHTML = recent.map((p) => `
        <a class="search-result-item" href="${getPostUrl(p)}">
          <div class="search-result-title">${formatCjkHtml(p.title)}</div>
          <div class="search-result-snippet meta-mono">${escapeHtml(formatDate(p.date))}</div>
        </a>
      `).join('');
      return;
    }

    const matches = state.publishedPosts.filter((p) => {
      const hay = [
        p.title,
        ...(p.categories || []),
        ...(p.tags || []),
        stripMarkdown(p.body || '')
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (matches.length === 0) {
      dom.searchResults.innerHTML = '<div class="empty-state">一致する記事が見つかりませんでした。</div>';
      return;
    }

    dom.searchResults.innerHTML = matches.map((p) => {
      const plain = stripMarkdown(p.body || '');
      const idx = plain.toLowerCase().indexOf(q);
      let snippet = '';
      if (idx >= 0) {
        const s = Math.max(0, idx - 30);
        const e = Math.min(plain.length, idx + q.length + 70);
        snippet = `${s > 0 ? '...' : ''}${plain.slice(s, e)}${e < plain.length ? '...' : ''}`;
      } else {
        snippet = makeExcerpt(p.body, 90);
      }
      return `
        <a class="search-result-item" href="${getPostUrl(p)}">
          <div class="search-result-title">${formatCjkHtml(p.title)}</div>
          <div class="search-result-snippet">${escapeHtml(formatDate(p.date))} · ${formatCjkHtml(snippet)}</div>
        </a>
      `;
    }).join('');
  }

  // ============================================================
  // Event Wiring & Init
  // ============================================================
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) {
      if (e.target.closest('button, input, textarea, select')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (window.getSelection && window.getSelection().toString()) return;
      const card = e.target.closest('[data-post-url]');
      if (card) {
        e.preventDefault();
        navigateTo(card.dataset.postUrl);
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (anchor.hasAttribute('download') || anchor.getAttribute('target')) return;

    const rawHref = anchor.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#')) {
      if (rawHref.length > 1) {
        const el = document.getElementById(safeDecode(rawHref.slice(1)));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      return;
    }

    const targetUrl = new URL(anchor.href, window.location.origin);
    if (targetUrl.origin !== window.location.origin) return;
    if (targetUrl.pathname.startsWith('/admin')) return;
    if (/\.(xml|json|png|jpe?g|gif|svg|webp|pdf|css|js)$/i.test(targetUrl.pathname)) return;

    e.preventDefault();
    closeSearchModal();
    navigateTo(targetUrl.pathname + targetUrl.search + targetUrl.hash);
  });

  window.addEventListener('popstate', renderCurrentRoute);

  dom.searchTrigger.addEventListener('click', openSearchModal);
  dom.searchClose.addEventListener('click', closeSearchModal);
  dom.searchModal.addEventListener('click', (e) => {
    if (e.target === dom.searchModal) closeSearchModal();
  });
  dom.searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));

  window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea';
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dom.searchModal.classList.contains('hidden')) openSearchModal();
      else closeSearchModal();
    } else if (e.key === '/' && !isTyping && dom.searchModal.classList.contains('hidden')) {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === 'Escape' && !dom.searchModal.classList.contains('hidden')) {
      closeSearchModal();
    }
  });

  async function init() {
    try {
      await loadPosts();
      renderCurrentRoute();
    } catch (err) {
      clearToc();
      dom.main.innerHTML = `<div class="empty-state">記事データの読み込みに失敗しました: ${escapeHtml(err.message)}</div>`;
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
