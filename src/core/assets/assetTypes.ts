/** Markdown image URLs use this prefix; files live under assets/{docId}/ */
export const R2MD_ASSET_SCHEME = "r2md-asset:";

export const WECHAT_IMAGE_HOSTS = ["mmbiz.qpic.cn", "mmbiz.qlogo.cn"];

export interface LocalizeImagesResult {
  markdown: string;
  assetFiles: string[];
  warnings: string[];
}
