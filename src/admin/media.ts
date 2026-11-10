import { supabase, MEDIA_BUCKET } from '../lib/supabase';

const MAX_SIZE = 1600; // px, côté le plus long
const QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Redimensionne + compresse dans le navigateur AVANT l'envoi (WebP, ou JPEG/PNG si WebP indisponible).
export async function compressImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  if (file.type === 'image/svg+xml') return { blob: file, ext: 'svg', type: file.type };

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const webp = await canvasToBlob(canvas, 'image/webp', QUALITY);
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp', type: 'image/webp' };

  // Repli : PNG pour garder la transparence (logos), JPEG sinon.
  if (file.type === 'image/png') {
    const png = await canvasToBlob(canvas, 'image/png', 1);
    return { blob: png!, ext: 'png', type: 'image/png' };
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
  return { blob: jpeg!, ext: 'jpg', type: 'image/jpeg' };
}

export async function uploadMedia(folder: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`« ${file.name} » n’est pas une image.`);
  const { blob, ext, type } = await compressImage(file);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder}/${name}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return path;
}

export async function removeMedia(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(list);
  if (error) console.warn('Suppression de fichiers impossible', error);
}
