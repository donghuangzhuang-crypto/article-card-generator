"use strict";

const Card = (() => {
  const width = 1080;
  const height = 800;
  const styles = `
.article-card,.article-card * { box-sizing:border-box }
.article-card {
  --paper:#fffaf0;--ink:#282725;--accent:#983c28;--rule:#d9c8b9;
  width:1080px;height:800px;padding:74px 84px 58px;overflow:hidden;
  color:var(--ink);background:var(--paper);
  border-top:15px solid var(--accent);
  font-family:"PingFang SC",system-ui,sans-serif;
}
.article-card[data-theme=classic] {
  --paper:#f5e6cd;--ink:#39281a;--accent:#825021;--rule:#b39878;
  font-family:"Songti SC",Georgia,serif;
}
.article-card[data-theme=vivid] {
  --paper:#f9d7a8;--ink:#39251c;--accent:#a23415;--rule:#be8354;
}
.article-card[data-theme=business] {
  --paper:#223643;--ink:#f5f8fa;--accent:#e8c584;--rule:#61747f;
}
.card-kicker { margin:0 0 24px;color:var(--accent);font-size:25px;font-weight:700;letter-spacing:.14em; }
.card-title {
  margin:0;min-height:1.15em;font-size:61px;line-height:1.12;letter-spacing:-.036em;
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;
}
.card-points { list-style:none;display:grid;gap:0;padding:0;margin:38px 0 0;border-top:1px solid var(--rule); }
.card-points li {
  display:grid;grid-template-columns:54px minmax(0,1fr);align-items:start;gap:14px;
  padding:14px 0;border-bottom:1px solid var(--rule);font-size:27px;line-height:1.36;
}
.card-number { color:var(--accent);font-weight:700;font-variant-numeric:tabular-nums; }
.card-point {
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;
  overflow:hidden;overflow-wrap:anywhere;
}
`;
  const themes = new Set(["modern", "classic", "vivid", "business"]);
  const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const cleanInline = (text) => text.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.、]\s*)/, "")
    .replace(/\[([^\]]+)\]\(https?:[^)]+\)/g, "$1").trim();
  const truncate = (text, limit) => {
    const chars = Array.from(text.trim());
    return chars.length <= limit ? chars.join("") : chars.slice(0, limit - 1).join("").trimEnd() + "…";
  };

  function extract(article) {
    const lines = article.split(/\r?\n/).map(cleanInline).filter(Boolean);
    const first = lines[0] || "";
    const heading = lines.length > 1 && Array.from(first).length <= 52 && !/[。？！.!?]$/.test(first);
    const sentences = (heading ? lines.slice(1) : lines).flatMap((line) => line.match(/[^。！？.!?；;]+(?:[。！？.!?；;]+|$)/g) || [])
      .map((line) => line.trim()).filter(Boolean);
    const title = truncate(heading ? first : (sentences[0] || first).replace(/[。！？.!?；;]+$/, ""), 56);
    const body = sentences.length > 1 && !heading ? sentences.slice(1) : sentences;
    const unique = [...new Set(body)];
    const best = unique.map((text, index) => ({
      text, index,
      score: Math.min(Array.from(text).length, 65) + (index === 0 ? 12 : 0)
        + (/因此|建议|首先|关键|其次|可以|需要|should|because/i.test(text) ? 16 : 0)
    })).sort((a, b) => b.score - a.score).slice(0, 4).sort((a, b) => a.index - b.index);
    return { title, points: best.length ? best.map(({ text }) => truncate(text, 72)) : [truncate(first, 72)] };
  }

  function markup(card, theme, editable = false) {
    const attr = editable ? ' contenteditable="true" spellcheck="false"' : "";
    const rows = card.points.map((point, i) =>
      `<li><span class="card-number" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><span class="card-point"${attr}>${escape(point)}</span></li>`
    ).join("");
    return `<article class="article-card" data-theme="${themes.has(theme) ? theme : "modern"}"><p class="card-kicker">文章要点</p><h1 class="card-title"${attr}>${escape(card.title)}</h1><ol class="card-points">${rows}</ol></article>`;
  }

  function html(card, theme) {
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(card.title)}</title><style>body{margin:0}${styles}</style></head>
<body>${markup(card, theme)}</body></html>`;
  }

  return { width, height, styles, extract, markup, html, truncate };
})();
