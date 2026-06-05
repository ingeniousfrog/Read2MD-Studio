import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const texInput = new TeX({
  packages: AllPackages,
});

// fontCache "none" inlines every glyph as a <path>, so each formula SVG is
// fully self-contained. This avoids broken <use> references when a single
// formula is copied out of the document (a known issue when pasting into
// editors such as the WeChat backend).
const svgOutput = new SVG({
  fontCache: "none",
});

const mathDocument = mathjax.document("", {
  InputJax: texInput,
  OutputJax: svgOutput,
});

export interface TexToSvgOptions {
  displayMode: boolean;
}

export function texToSvg(latex: string, options: TexToSvgOptions): string {
  const node = mathDocument.convert(latex, {
    display: options.displayMode,
  });

  return adaptor.innerHTML(node);
}
