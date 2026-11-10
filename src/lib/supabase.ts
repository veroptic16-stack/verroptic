import { createClient } from '@supabase/supabase-js';

// Clés PUBLIQUES (publishable) : prévues pour être exposées, la sécurité repose sur les RLS.
// Un fichier .env peut les surcharger ; à défaut on garde ces valeurs (chaîne de secours).
export const SUPABASE_URL =
  import.meta.env.PUBLIC_SUPABASE_URL || 'https://qvjjoaczpcfddkglkhoa.supabase.co';
export const SUPABASE_KEY =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Ape94nL_dtf0-QksU4m6IA_G6aOCxDY';

export const MEDIA_BUCKET = 'media';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}
