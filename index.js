const fs = require("fs");
const path = require("path");
const { buildPrompt } = require("./prompt");
const { renderHTML } = require("./render");

const BSKY_API = "https://bsky.social/xrpc";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const POST_LIMIT = 75;

// ── Auth ──────────────────────────────────────────────────────────────────────

async function createSession() {
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

  return data.feed
    .map(item => {
      const post = item.post;
      const record = post.record;

      if (record.reply) return null;
      const text = record.text?.trim();
      if (!text || text.length < 20) return null;

      // Build Bluesky post URL from URI
      // URI format: at://did:plc:xxx/app.bsky.feed.post/postid
      let postUrl = null;
      try {
        const uriParts = post.uri.replace("at://", "").split("/");
        const postId = uriParts[2];
        const handle = post.author.handle;
        postUrl = `https://bsky.app/profile/${handle}/post/${postId}`;
      } catch (_) {}

      // Engagement score: weighted sum of likes, reposts, replies
      const likes = post.likeCount || 0;
      const reposts = post.repostCount || 0;
      const replies = post.replyCount || 0;
      const engagementScore = likes + (reposts * 2) + replies;

      // Extract any URLs from the post's facets (Bluesky's link metadata)
      const links = [];
      if (record.facets) {
        for (const facet of record.facets) {
          for (const feature of facet.features || []) {
            if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
              links.push(feature.uri);
            }
          }
        }
      }

      return {
        author: post.author.displayName || post.author.handle,
        handle: `@${post.author.handle}`,
        text,
        postUrl,
        links,
        engagementScore,
        indexedAt: post.indexedAt || record.createdAt || null
      };
    })
    .filter(Boolean)
    // Sort by engagement descending before sending to Claude
    .sort((a, b) => b.engagementScore - a.engagementScore);
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
      model: "claude-haiku-4-5-20251001",
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
  const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  return JSON.parse(clean);
}

// ── Merge engagement data back into digest ────────────────────────────────────

function mergeEngagementData(digest, posts) {
  const postMap = new Map();
  for (const p of posts) {
    postMap.set(p.text.slice(0, 80), p);
  }

  for (const category of digest.categories || []) {
    for (const post of category.posts || []) {
      const key = post.text.slice(0, 80);
      const original = postMap.get(key);
      if (original) {
        post.postUrl = original.postUrl;
        post.links = original.links;
        post.engagementScore = original.engagementScore;
        post.indexedAt = original.indexedAt;
      }
    }

    // Sort posts within each category by engagement score
    category.posts.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
  }

  return digest;
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
  const rawDigest = await summarize(posts);
  console.log(`  Categorized into ${rawDigest.categories?.length ?? 0} sections`);

  console.log("→ Merging engagement data...");
  const digest = mergeEngagementData(rawDigest, posts);
  digest.date = new Date().toISOString().slice(0, 10);

  console.log("→ Rendering HTML...");
  writeDigest(digest);

  console.log("✓ Done.");
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
