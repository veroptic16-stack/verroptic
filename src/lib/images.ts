import { getImage } from 'astro:assets';
import { mediaUrl } from './supabase';

export type Responsive = { src: string; srcset: string; width?: number; height?: number };

// Redimensionne les images du Storage au build (WebP, 2 tailles).
// Si une image est introuvable, on garde l'URL d'origine plutôt que de faire échouer tout le build.
export async function responsiveImage(path: string, width: number): Promise<Responsive> {
  const original = mediaUrl(path);
  if (path.endsWith('.svg')) return { src: original, srcset: '' };
  try {
    const [one, two] = await Promise.all(
      [width, width * 2].map((w) => getImage({ src: original, inferSize: true, width: w, format: 'webp', quality: 80 })),
    );
    return {
      src: one.src,
      srcset: `${one.src} ${width}w, ${two.src} ${width * 2}w`,
      width: Number(one.attributes.width),
      height: Number(one.attributes.height),
    };
  } catch (err: any) {
    console.warn(`[images] « ${path} » non optimisée :`, err?.message || err);
    return { src: original, srcset: '' };
  }
}
