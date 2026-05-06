const fs = require("fs");
const path = require("path");
const { buildPrompt } = require("./prompt");
const { renderHTML } = require("./render");

const BSKY_API = "https://bsky.social/xrpc";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const POST_LIMIT = 75;

// ── Auth ──────────────────────────────────────────────────────────────────────

async function createSession() {
  console.log("Handle:", JSON.stringify(process.env.BSKY_HANDLE));
  console.log("Password length:", process.env.BSKY_APP_PASSWORD?.length);

  const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: process.env.BSKY_HANDLE,
      password: process.env.BSKY_APP_PASSWORD
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky auth failed: ${err}`);
  }

  const data = await res.json();
  return data.accessJwt;
}

// ── Fetch timeline ────────────────────────────────────────────────────────────

async function fetchTimeline(token) {
  const url = new URL(`${BSKY_API}/app.bsky.feed.getTimeline`);
  url.searchParams.set("limit", String(POST_LIMIT));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Timeline fetch failed: ${err}`);
  }

  const data = await res.json();

  // Normalize posts: extract text and author info, skip reposts with no text
  return data.feed
    .map(item => {
      const post = item.post;
      const record = post.record;
      // Skip replies to reduce noise (optional — remove this filter if you want them)
      if (record.reply) return null;
      const text = record.text?.trim();
      if (!text || text.length < 20) return null;

      return {
        author: post.author.displayName || post.author.handle,
        handle: `@${post.author.handle}`,
        text,
        uri: post.uri
      };
    })
    .filter(Boolean);
}

// ── Summarize with Claude ─────────────────────────────────────────────────────

async function summarize(posts) {
  const prompt = buildPrompt(posts);

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API failed: ${err}`);
  }

  const data = await res.json();
  const raw = data.content[0].text.trim();

  // Strip markdown fences if present
  const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  return JSON.parse(clean);
}

// ── Write output ──────────────────────────────────────────────────────────────

function writeDigest(digest) {
  const html = renderHTML(digest);
  const outPath = path.join(__dirname, "docs", "index.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`✓ Digest written to ${outPath}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("→ Authenticating with Bluesky...");
  const token = await createSession();

  console.log(`→ Fetching up to ${POST_LIMIT} posts...`);
  const posts = await fetchTimeline(token);
  console.log(`  Got ${posts.length} usable posts`);

  if (posts.length === 0) {
    console.warn("No posts fetched. Check your handle and app password.");
    process.exit(1);
  }

  console.log("→ Sending to Claude for categorization...");
  const digest = await summarize(posts);
  console.log(`  Categorized into ${digest.categories?.length ?? 0} sections`);

  console.log("→ Rendering HTML...");
  writeDigest(digest);

  console.log("✓ Done.");
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
