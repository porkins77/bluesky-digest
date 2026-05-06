function renderHTML(digest) {
  const { date, categories } = digest;

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const now = new Date();
  const generatedAt = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short"
  });

  const allCategories = ensureAllCategories(categories);

  const categoryHTML = allCategories.map(cat => {
    if (cat.empty) {
      return `
        <section class="category category--empty" id="${cat.id}">
          <div class="category-header">
            <span class="category-emoji">${cat.emoji}</span>
            <h2 class="category-label">${escapeHTML(cat.label)}</h2>
            <span class="post-count">nothing today</span>
          </div>
        </section>
      `;
    }

    const postsHTML = cat.posts.map(post => {
      const timeAgo = post.indexedAt ? formatTimeAgo(post.indexedAt) : null;
      const engagementBadge = post.engagementScore > 0
        ? `<span class="engagement" title="Likes + reposts + replies">↑ ${formatEngagement(post.engagementScore)}</span>`
        : "";

      const bskyLink = post.postUrl
        ? `<a class="post-link" href="${escapeHTML(post.postUrl)}" target="_blank" rel="noopener">View on Bluesky →</a>`
        : "";

      const externalLinks = (post.links || []).length > 0
        ? `<div class="external-links">${post.links.map(l =>
            `<a class="external-link" href="${escapeHTML(l)}" target="_blank" rel="noopener">${escapeHTML(truncateUrl(l))}</a>`
          ).join("")}</div>`
        : "";

      return `
        <article class="post-card">
          <div class="post-meta">
            <span class="post-author">${escapeHTML(post.author)}</span>
            <span class="post-handle">${escapeHTML(post.handle)}</span>
            ${timeAgo ? `<span class="post-time">${escapeHTML(timeAgo)}</span>` : ""}
            ${engagementBadge}
          </div>
          <p class="post-text">${escapeHTML(post.text)}</p>
          ${externalLinks}
          <div class="post-footer">
            <p class="post-why">↳ ${escapeHTML(post.why)}</p>
            ${bskyLink}
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="category" id="${cat.id}">
        <div class="category-header">
          <span class="category-emoji">${cat.emoji}</span>
          <h2 class="category-label">${escapeHTML(cat.label)}</h2>
          <span class="post-count">${cat.posts.length} post${cat.posts.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="posts">
          ${postsHTML}
        </div>
      </section>
    `;
  }).join("");

  const activeCats = allCategories.filter(c => !c.empty);
  const totalPosts = activeCats.reduce((sum, c) => sum + c.posts.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bluesky Digest — ${formattedDate}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --ink: #1a1814;
      --ink-mid: #3d3830;
      --ink-light: #6b6355;
      --ink-faint: #a09880;
      --paper: #f7f4ef;
      --paper-warm: #efe9de;
      --rule: #d4ccbc;
      --accent: #2d5a8e;
      --accent-warm: #8b3a1a;
      --accent-green: #2d6b4a;
      --col-width: 680px;
    }

    html { font-size: 16px; }

    body {
      background: var(--paper);
      color: var(--ink);
      font-family: 'Source Serif 4', Georgia, serif;
      font-weight: 300;
      line-height: 1.7;
      padding: 0 1.5rem 4rem;
    }

    /* ── MASTHEAD ── */
    .masthead {
      max-width: var(--col-width);
      margin: 0 auto;
      padding: 3rem 0 1.5rem;
      border-bottom: 3px double var(--ink);
      text-align: center;
    }

    .masthead-eyebrow {
      font-size: 0.7rem;
      font-weight: 400;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: var(--ink-light);
      margin-bottom: 0.75rem;
    }

    .masthead-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2.2rem, 5vw, 3.2rem);
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.1;
      color: var(--ink);
    }

    .masthead-date {
      font-size: 0.85rem;
      font-weight: 300;
      font-style: italic;
      color: var(--ink-light);
      margin-top: 0.6rem;
    }

    .masthead-rule {
      width: 3rem;
      height: 1px;
      background: var(--ink-faint);
      margin: 1.2rem auto 0.6rem;
    }

    .masthead-meta {
      font-size: 0.75rem;
      color: var(--ink-faint);
      letter-spacing: 0.05em;
    }

    .masthead-updated {
      font-size: 0.7rem;
      color: var(--ink-faint);
      margin-top: 0.3rem;
      font-style: italic;
    }

    /* ── TOC ── */
    .toc {
      max-width: var(--col-width);
      margin: 1.75rem auto 0;
      padding: 1rem 1.25rem;
      background: var(--paper-warm);
      border: 1px solid var(--rule);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      align-items: center;
    }

    .toc-label {
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--ink-faint);
      width: 100%;
    }

    .toc a {
      font-size: 0.85rem;
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s;
    }

    .toc a:hover { border-bottom-color: var(--accent); }

    .toc a.toc--empty {
      color: var(--ink-faint);
      font-style: italic;
    }

    /* ── MAIN CONTENT ── */
    .content {
      max-width: var(--col-width);
      margin: 0 auto;
    }

    /* ── CATEGORY ── */
    .category {
      margin-top: 2.75rem;
      padding-top: 1.75rem;
      border-top: 1px solid var(--rule);
    }

    .category--empty .category-header {
      opacity: 0.45;
    }

    .category-header {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .category-emoji { font-size: 1.1rem; line-height: 1; }

    .category-label {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    .post-count {
      margin-left: auto;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    /* ── POST CARD ── */
    .post-card {
      padding: 1rem 0 1rem 1.1rem;
      border-left: 2px solid var(--rule);
      margin-bottom: 1.1rem;
      transition: border-color 0.2s;
    }

    .post-card:hover { border-left-color: var(--accent); }

    .post-meta {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.4rem 0.6rem;
      margin-bottom: 0.4rem;
    }

    .post-author {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ink);
    }

    .post-handle {
      font-size: 0.75rem;
      color: var(--ink-faint);
    }

    .post-time {
      font-size: 0.72rem;
      color: var(--ink-faint);
      font-style: italic;
      margin-left: auto;
    }

    .engagement {
      font-size: 0.7rem;
      color: var(--accent-green);
      letter-spacing: 0.04em;
      font-style: normal;
    }

    .post-text {
      font-size: 0.95rem;
      line-height: 1.65;
      color: var(--ink-mid);
      margin-bottom: 0.5rem;
    }

    /* ── EXTERNAL LINKS ── */
    .external-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .external-link {
      font-size: 0.72rem;
      color: var(--accent);
      text-decoration: none;
      background: var(--paper-warm);
      border: 1px solid var(--rule);
      padding: 0.15rem 0.5rem;
      border-radius: 2px;
      transition: background 0.15s;
      word-break: break-all;
    }

    .external-link:hover { background: var(--rule); }

    /* ── POST FOOTER ── */
    .post-footer {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .post-why {
      font-size: 0.8rem;
      font-style: italic;
      color: var(--ink-light);
      line-height: 1.5;
      flex: 1;
    }

    .post-link {
      font-size: 0.72rem;
      color: var(--accent);
      text-decoration: none;
      letter-spacing: 0.03em;
      white-space: nowrap;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s;
      flex-shrink: 0;
    }

    .post-link:hover { border-bottom-color: var(--accent); }

    /* ── FOOTER ── */
    .footer {
      max-width: var(--col-width);
      margin: 3rem auto 0;
      padding-top: 1.25rem;
      border-top: 3px double var(--ink);
      text-align: center;
      font-size: 0.72rem;
      color: var(--ink-faint);
      letter-spacing: 0.08em;
    }

    @media (max-width: 500px) {
      .masthead-title { font-size: 1.9rem; }
      body { padding: 0 1rem 3rem; }
      .post-time { margin-left: 0; }
    }
  </style>
</head>
<body>

  <header class="masthead">
    <p class="masthead-eyebrow">Personal Intelligence Brief</p>
    <h1 class="masthead-title">Bluesky Digest</h1>
    <div class="masthead-rule"></div>
    <p class="masthead-date">${formattedDate}</p>
    <p class="masthead-meta">${totalPosts} curated post${totalPosts !== 1 ? "s" : ""} across ${activeCats.length} topic${activeCats.length !== 1 ? "s" : ""}</p>
    <p class="masthead-updated">Last generated at ${generatedAt}</p>
  </header>

  <nav class="toc" aria-label="Jump to section">
    <span class="toc-label">Sections</span>
    ${allCategories.map(c =>
      `<a href="#${c.id}" class="${c.empty ? "toc--empty" : ""}">${c.emoji} ${c.label}</a>`
    ).join("")}
  </nav>

  <main class="content">
    ${categoryHTML}
  </main>

  <footer class="footer">
    <p>Generated daily · Powered by Bluesky AT Protocol + Claude API</p>
    <p style="margin-top:0.3rem;">Pull this page when you want it. It will not pull you.</p>
  </footer>

</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Ensure all 5 interest categories appear, marking missing ones as empty
const ALL_CATEGORIES = [
  { id: "baseball", label: "Baseball", emoji: "⚾" },
  { id: "politics", label: "Politics", emoji: "🏛️" },
  { id: "wildlife_photography", label: "Wildlife Photography", emoji: "📷" },
  { id: "bluegrass", label: "Bluegrass", emoji: "🪕" },
  { id: "books", label: "Books", emoji: "📚" }
];

function ensureAllCategories(categories) {
  const returned = new Map((categories || []).map(c => [c.id, c]));
  return ALL_CATEGORIES.map(cat => {
    if (returned.has(cat.id)) return returned.get(cat.id);
    return { ...cat, posts: [], empty: true };
  });
}

function formatTimeAgo(isoString) {
  try {
    const posted = new Date(isoString);
    const diffMs = Date.now() - posted.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (_) {
    return null;
  }
}

function formatEngagement(score) {
  if (score >= 1000) return (score / 1000).toFixed(1) + "k";
  return String(score);
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > 50 ? display.slice(0, 47) + "…" : display;
  } catch (_) {
    return url.length > 50 ? url.slice(0, 47) + "…" : url;
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { renderHTML };      line-height: 1.7;
      padding: 0 1.5rem 4rem;
    }

    /* ── MASTHEAD ── */
    .masthead {
      max-width: var(--col-width);
      margin: 0 auto;
      padding: 3rem 0 1.5rem;
      border-bottom: 3px double var(--ink);
      text-align: center;
    }

    .masthead-eyebrow {
      font-family: 'Source Serif 4', serif;
      font-size: 0.7rem;
      font-weight: 400;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: var(--ink-light);
      margin-bottom: 0.75rem;
    }

    .masthead-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2.2rem, 5vw, 3.2rem);
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.1;
      color: var(--ink);
    }

    .masthead-date {
      font-family: 'Source Serif 4', serif;
      font-size: 0.85rem;
      font-weight: 300;
      font-style: italic;
      color: var(--ink-light);
      margin-top: 0.6rem;
    }

    .masthead-rule {
      width: 3rem;
      height: 1px;
      background: var(--ink-faint);
      margin: 1.2rem auto 0.6rem;
    }

    .masthead-meta {
      font-size: 0.75rem;
      color: var(--ink-faint);
      letter-spacing: 0.05em;
    }

    /* ── TOC ── */
    .toc {
      max-width: var(--col-width);
      margin: 1.75rem auto 0;
      padding: 1rem 1.25rem;
      background: var(--paper-warm);
      border: 1px solid var(--rule);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      align-items: center;
    }

    .toc-label {
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--ink-faint);
      width: 100%;
    }

    .toc a {
      font-size: 0.85rem;
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s;
    }

    .toc a:hover { border-bottom-color: var(--accent); }

    /* ── MAIN CONTENT ── */
    .content {
      max-width: var(--col-width);
      margin: 0 auto;
    }

    /* ── CATEGORY ── */
    .category {
      margin-top: 2.75rem;
      padding-top: 1.75rem;
      border-top: 1px solid var(--rule);
    }

    .category-header {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .category-emoji {
      font-size: 1.1rem;
      line-height: 1;
    }

    .category-label {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    .post-count {
      margin-left: auto;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    /* ── POST CARD ── */
    .post-card {
      padding: 1rem 0 1rem 1.1rem;
      border-left: 2px solid var(--rule);
      margin-bottom: 1.1rem;
      transition: border-color 0.2s;
    }

    .post-card:hover {
      border-left-color: var(--accent);
    }

    .post-meta {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }

    .post-author {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ink);
    }

    .post-handle {
      font-size: 0.75rem;
      color: var(--ink-faint);
    }

    .post-text {
      font-size: 0.95rem;
      line-height: 1.65;
      color: var(--ink-mid);
      margin-bottom: 0.5rem;
    }

    .post-why {
      font-size: 0.8rem;
      font-style: italic;
      color: var(--ink-light);
      line-height: 1.5;
    }

    /* ── FOOTER ── */
    .footer {
      max-width: var(--col-width);
      margin: 3rem auto 0;
      padding-top: 1.25rem;
      border-top: 3px double var(--ink);
      text-align: center;
      font-size: 0.72rem;
      color: var(--ink-faint);
      letter-spacing: 0.08em;
    }

    @media (max-width: 500px) {
      .masthead-title { font-size: 1.9rem; }
      body { padding: 0 1rem 3rem; }
    }
  </style>
</head>
<body>

  <header class="masthead">
    <p class="masthead-eyebrow">Personal Intelligence Brief</p>
    <h1 class="masthead-title">Bluesky Digest</h1>
    <div class="masthead-rule"></div>
    <p class="masthead-date">${formattedDate}</p>
    <p class="masthead-meta">${totalPosts} curated post${totalPosts !== 1 ? "s" : ""} across ${categories.length} topic${categories.length !== 1 ? "s" : ""}</p>
  </header>

  <nav class="toc" aria-label="Jump to section">
    <span class="toc-label">Sections</span>
    ${categories.map(c => `<a href="#${c.id}">${c.emoji} ${c.label}</a>`).join("")}
  </nav>

  <main class="content">
    ${categoryHTML}
  </main>

  <footer class="footer">
    <p>Generated daily · Powered by Bluesky AT Protocol + Claude API</p>
    <p style="margin-top:0.3rem;">Pull this page when you want it. It will not pull you.</p>
  </footer>

</body>
</html>`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { renderHTML };
