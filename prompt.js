const INTERESTS = {
  baseball: {
    label: "Baseball",
    keywords: ["baseball", "mlb", "giants", "mets", "pitcher", "batting", "home run", "innings", "bullpen", "roster", "trade", "draft", "minor league", "spring training", "world series", "playoffs"],
    emoji: "⚾"
  },
  politics: {
    label: "Politics",
    keywords: ["politics", "congress", "senate", "house", "election", "vote", "policy", "legislation", "democrat", "republican", "governor", "president", "administration", "bill", "law", "scotus", "supreme court", "campaign"],
    emoji: "🏛️"
  },
  wildlife_photography: {
    label: "Wildlife Photography",
    keywords: ["wildlife", "photography", "bird", "birding", "nature", "photo", "camera", "lens", "mammal", "raptor", "migration", "habitat", "conservation", "national park", "field guide", "shot", "capture"],
    emoji: "📷"
  },
  bluegrass: {
    label: "Bluegrass",
    keywords: ["bluegrass", "banjo", "fiddle", "mandolin", "flatpick", "acoustic", "old time", "appalachian", "folk", "dobro", "festival", "jam", "jam session", "string band", "roots music", "newgrass"],
    emoji: "🪕"
  },
  books: {
    label: "Books",
    keywords: ["book", "reading", "novel", "author", "fiction", "nonfiction", "memoir", "biography", "literature", "library", "publishing", "review", "read", "bookstore", "kindle", "audiobook", "chapter"],
    emoji: "📚"
  }
};

function buildPrompt(posts) {
  const postsText = posts
    .map((p, i) => `[${i + 1}] @${p.author} (${p.handle}): ${p.text}`)
    .join("\n");

  const categoryDescriptions = Object.values(INTERESTS)
    .map(c => `- "${c.label}": posts related to ${c.keywords.slice(0, 6).join(", ")}, etc.`)
    .join("\n");

  return `You are a personal content curator. You have been given a list of Bluesky posts from accounts a user follows. Your job is to categorize and summarize the most interesting and substantive posts into a structured digest.

The user's interest categories are:
${categoryDescriptions}

A post may fit multiple categories — place it in the most relevant one only. Discard posts that are mundane, low-signal, purely promotional self-promotion, or do not fit any category. Do not invent content or embellish.

For each category, return 3–6 of the most interesting, substantive, or discussion-worthy posts. If a category has no relevant posts, omit it entirely.

Return ONLY valid JSON in this exact structure, no preamble, no markdown fences:

{
  "date": "YYYY-MM-DD",
  "categories": [
    {
      "id": "baseball",
      "label": "Baseball",
      "emoji": "⚾",
      "posts": [
        {
          "author": "Display Name",
          "handle": "@handle.bsky.social",
          "text": "The post text, verbatim or lightly trimmed if very long",
          "why": "One sentence: why this is interesting or notable"
        }
      ]
    }
  ]
}

Here are the posts to analyze:

${postsText}`;
}

module.exports = { buildPrompt, INTERESTS };
