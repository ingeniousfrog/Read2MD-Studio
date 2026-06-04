import { applyThemeHtml } from "../core/theme/applyTheme";
import type { ThemeDefinition } from "../core/theme/themes";

interface PreviewPaneProps {
  rawHtml: string;
  theme: ThemeDefinition;
}

export function PreviewPane({ rawHtml, theme }: PreviewPaneProps) {
  const themed = applyThemeHtml({
    rawHtml,
    theme,
  });

  return (
    <section className="pane preview-pane" aria-label="Article preview">
      <div className="pane-header">
        <span>Preview</span>
        <span className="pane-note">{theme.name}</span>
      </div>
      <div className="preview-scroll">
        <style>{themed.css}</style>
        <div className="preview-sheet" dangerouslySetInnerHTML={{ __html: themed.html }} />
      </div>
    </section>
  );
}
