"use strict";

const element = (id) => document.getElementById(id);
const form = element("article-form");
const article = element("article");
const viewport = element("card-viewport");
const notice = element("notice");
const aiButton = element("ai-generate");
const theme = () => form.querySelector("input[name=theme]:checked").value;
const demo = `让读者更快抓住重点

长文章适合完整解释，卡片则适合分享最重要的结论。
先用一句话交代文章在解决什么问题。
再挑出三到四个能独立理解的要点，保留有用的数字和背景。
发布前检查表述是否准确，并把容易误解的说法改清楚。`;

const sheet = document.createElement("style");
sheet.textContent = Card.styles;
document.head.append(sheet);
const scale = () => viewport.style.setProperty("--preview-scale", String(viewport.clientWidth / Card.width));
new ResizeObserver(scale).observe(viewport);

function status(message, error = false) {
  notice.textContent = message;
  notice.dataset.error = String(error);
}

function input() {
  const text = article.value.trim();
  if (Array.from(text).length < 12) {
    status("请粘贴至少 12 个字符的文章。", true);
    article.focus();
    return null;
  }
  return text;
}

function render(card) {
  viewport.innerHTML = Card.markup(card, theme(), true);
  element("empty").hidden = true;
  viewport.hidden = false;
  element("copy").disabled = false;
  element("download").disabled = false;
  scale();
}

function output() {
  const outputText = (node, limit) => Card.truncate(node.textContent.replace(/\s+/g, " "), limit);
  const title = outputText(viewport.querySelector(".card-title"), 56) || "文章卡片";
  const points = [...viewport.querySelectorAll(".card-point")]
    .map((node) => outputText(node, 72)).filter(Boolean);
  return { title, points, html: Card.html({ title, points }, theme()) };
}

function updateCount() {
  element("article-count").textContent = `${article.value.length.toLocaleString("zh-CN")} / 30,000 字符`;
}
article.addEventListener("input", updateCount);
element("example").addEventListener("click", () => {
  article.value = demo;
  updateCount();
  article.focus();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input();
  if (!text) return;
  render(Card.extract(text));
  status("已在本机提取要点。可在预览里修改文字。");
});
form.addEventListener("change", (event) => {
  if (event.target.name !== "theme") return;
  const card = viewport.querySelector(".article-card");
  if (card) card.dataset.theme = theme();
});
viewport.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.isContentEditable) {
    event.preventDefault();
    event.target.blur();
  }
});
viewport.addEventListener("paste", (event) => {
  if (!event.target.isContentEditable) return;
  event.preventDefault();
  const selection = window.getSelection();
  if (!selection.rangeCount || !event.target.contains(selection.anchorNode)) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(event.clipboardData.getData("text/plain").replace(/\s+/g, " "));
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
});
viewport.addEventListener("focusout", (event) => {
  if (!event.target.isContentEditable) return;
  const limit = event.target.classList.contains("card-title") ? 56 : 72;
  event.target.textContent = Card.truncate(event.target.textContent.replace(/\s+/g, " "), limit);
});
element("download").addEventListener("click", () => {
  const card = output();
  const url = URL.createObjectURL(new Blob([card.html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${card.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 36)}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  status("已导出 HTML 卡片。");
});
element("copy").addEventListener("click", async () => {
  const { html } = output();
  try {
    await navigator.clipboard.writeText(html);
    status("HTML 已复制。");
  } catch {
    const field = element("copy-source");
    field.value = html;
    element("copy-dialog").showModal();
    field.select();
  }
});

if (location.protocol === "http:" || location.protocol === "https:") {
  fetch("./api/status", { cache: "no-store" }).then((response) => response.json()).then(({ ai }) => {
    aiButton.hidden = !ai;
    element("ai-note").hidden = !ai;
  }).catch(() => {});
}
aiButton.addEventListener("click", async () => {
  const text = input();
  if (!text) return;
  const generate = element("generate");
  aiButton.disabled = true;
  generate.disabled = true;
  article.readOnly = true;
  status("正在用 AI 提炼文章…");
  try {
    const response = await fetch("./api/card", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article: text })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    render(result);
    status("AI 提炼完成。可在预览里修改文字。");
  } catch (error) {
    status(error.message || "AI 暂时不可用，可用本机生成卡片。", true);
  } finally {
    aiButton.disabled = false;
    generate.disabled = false;
    article.readOnly = false;
  }
});
