import JSZip from "jszip";
import { type Pack, stickerGif } from "./packs";

function isDownloadable(res: Response) {
  if (!res.ok) return false;
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  if (
    type.includes("text/html") ||
    type.includes("text/javascript") ||
    type.includes("application/json") ||
    type.includes("text/css")
  ) {
    return false;
  }
  return true;
}

export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadSticker(packId: string, stickerId: string, name: string) {
  const res = await fetch(stickerGif(packId, stickerId));
  if (!isDownloadable(res)) throw new Error("sticker missing");
  const blob = await res.blob();
  if (!blob.type.startsWith("image/") && blob.type !== "application/octet-stream" && blob.type !== "") {
    throw new Error("sticker missing");
  }
  await downloadBlob(blob, `duomei-${packId}-${name}.gif`);
}

export async function downloadPackZip(pack: Pack) {
  const zip = new JSZip();
  const folder = zip.folder(`duomei-${pack.id}-${pack.slug}`);
  if (!folder) throw new Error("zip");
  let added = 0;
  await Promise.all(
    pack.stickers.map(async (s) => {
      const res = await fetch(stickerGif(pack.id, s.id));
      if (!isDownloadable(res)) return;
      const buf = await res.arrayBuffer();
      folder.file(`${s.id}-${s.name}.gif`, buf);
      added += 1;
    }),
  );
  if (added === 0) throw new Error("empty");
  const blob = await zip.generateAsync({ type: "blob" });
  await downloadBlob(blob, `duomei-${pack.id}.zip`);
  return added;
}
