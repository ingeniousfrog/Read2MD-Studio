import type { ThemeDefinition } from "./themes";

export function themeUsesH2Numbering(theme: ThemeDefinition): boolean {
  if (theme.id === "wechat-card") {
    return true;
  }

  return Boolean(theme.tokens?.h2Numbering || theme.tokens?.headingStyle === "card");
}

export function stripH2PseudoCss(css: string): string {
  return css.replace(/\.r2md-article h2::before\s*\{[^}]*\}/g, "");
}

export function injectH2Numbering(html: string, badgeColor: string): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(
    `<div class="r2md-numbering-root">${html}</div>`,
    "text/html",
  );
  const root = document.querySelector(".r2md-numbering-root");
  if (!root) {
    return html;
  }

  const headings = root.querySelectorAll(".r2md-article h2, h2");
  let index = 0;

  headings.forEach((heading) => {
    if (heading.querySelector(".r2md-h2-badge")) {
      return;
    }

    index += 1;
    const badge = document.createElement("span");
    badge.className = "r2md-h2-badge";
    badge.textContent = String(index).padStart(2, "0");
    badge.setAttribute(
      "style",
      [
        "display:inline-block",
        "min-width:28px",
        "margin-right:10px",
        "padding:1px 7px",
        "color:#ffffff",
        `background:${badgeColor}`,
        "font-size:12px",
        "vertical-align:middle",
      ].join(";"),
    );
    heading.insertBefore(badge, heading.firstChild);
  });

  return root.innerHTML;
}
