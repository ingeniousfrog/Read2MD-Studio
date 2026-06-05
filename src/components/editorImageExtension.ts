import { Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { nextAssetImageIndex, saveUserImage } from "../core/assets/saveUserImage";

interface ImageExtensionOptions {
  docId: string | null;
  markdown: string;
  assetFiles: string[];
  onImageInserted: (filename: string) => void;
  onMarkdownChange: (markdown: string) => void;
  onError: (message: string) => void;
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

function isImageFile(file: File, itemType = ""): boolean {
  if (file.type.startsWith("image/")) {
    return true;
  }
  if (itemType.startsWith("image/")) {
    return true;
  }
  return IMAGE_EXT_RE.test(file.name);
}

function collectImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return [];
  }

  const files: File[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    if (file && isImageFile(file, item.type)) {
      files.push(file);
    }
  }

  if (files.length > 0) {
    return files;
  }

  for (const file of Array.from(dataTransfer.files)) {
    if (isImageFile(file)) {
      files.push(file);
    }
  }

  return files;
}

function buildImageMarkdown(assetUrl: string, alt = "image"): string {
  return `![${alt}](${assetUrl})`;
}

async function insertImages(
  view: EditorView,
  files: File[],
  options: ImageExtensionOptions,
  insertPos?: number,
): Promise<void> {
  if (!options.docId) {
    options.onError("请先选择或新建一篇文档，再粘贴图片。");
    return;
  }

  let index = nextAssetImageIndex(options.markdown, options.assetFiles);
  const pos = insertPos ?? view.state.selection.main.head;
  const snippets: string[] = [];
  const filenames: string[] = [];

  for (const file of files) {
    const saved = await saveUserImage(options.docId, file, index);
    index += 1;
    filenames.push(saved.filename);
    snippets.push(buildImageMarkdown(saved.assetUrl, file.name.replace(/\.[^.]+$/, "") || "image"));
  }

  const insertion = snippets.join("\n\n");
  view.dispatch({
    changes: { from: pos, insert: insertion },
    selection: { anchor: pos + insertion.length },
  });
  options.onMarkdownChange(view.state.doc.toString());

  for (const filename of filenames) {
    options.onImageInserted(filename);
  }
}

export function editorImageExtension(options: ImageExtensionOptions) {
  return Prec.highest(EditorView.domEventHandlers({
    paste(event, view) {
      const files = collectImageFiles(event.clipboardData);
      if (files.length === 0) {
        return false;
      }

      event.preventDefault();
      void insertImages(view, files, options).catch((error) => {
        options.onError(error instanceof Error ? error.message : "图片粘贴失败");
      });
      return true;
    },
    dragover(event) {
      if (collectImageFiles(event.dataTransfer).length > 0) {
        event.preventDefault();
      }
    },
    drop(event, view) {
      const files = collectImageFiles(event.dataTransfer);
      if (files.length === 0) {
        return false;
      }

      event.preventDefault();
      const coords = { x: event.clientX, y: event.clientY };
      const pos = view.posAtCoords(coords) ?? view.state.selection.main.head;
      void insertImages(view, files, options, pos).catch((error) => {
        options.onError(error instanceof Error ? error.message : "图片拖放失败");
      });
      return true;
    },
  }));
}
