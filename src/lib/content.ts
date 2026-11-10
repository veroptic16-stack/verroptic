// Accès au contenu au moment du build.
// Chaîne de secours : Supabase → src/data/config.json → valeurs en dur des pages.
// Si Supabase est indisponible, le site se construit quand même (catalogue vide, réglages par défaut).
import { supabase } from './supabase';
import fallbackConfig from '../data/config.json';
import { demoProducts, demoArticles } from '../data/demo';

export type Hours = { day: string; value: string };
export type Settings = typeof fallbackConfig & { hours: Hours[] };

export type Category = { id: string; slug: string; name: string; description: string | null; cover_path: string | null };
export type Brand = { id: string; slug: string; name: string; logo_path: string | null; description: string | null };
export type ProductImage = { path: string; alt: string | null; variant_id: string | null };
export type Variant = { id: string; color_name: string; color_hex: string | null };
export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  gender: string | null;
  frame_shape: string | null;
  material: string | null;
  sku: string | null;
  tags: string[];
  is_new: boolean;
  is_featured: boolean;
  category: { slug: string; name: string } | null;
  brand: { slug: string; name: string } | null;
  images: ProductImage[];
  variants: Variant[];
};
export type Service = { id: string; slug: string; title: string; summary: string | null; body: string | null; cover_path: string | null };
export type Article = { id: string; slug: string; title: string; excerpt: string | null; body: string | null; cover_path: string | null; published_at: string | null };

// Données de démonstration : UNIQUEMENT en local avec DEMO=1 (jamais sur Vercel).
const DEMO = import.meta.env.DEMO === '1' || (globalThis as any).process?.env?.DEMO === '1';

const cache = new Map<string, Promise<any>>();

function load<T>(label: string, run: () => PromiseLike<{ data: any; error: any }>, fallback: T): Promise<T> {
  if (!cache.has(label)) {
    cache.set(
      label,
      (async () => {
        try {
          const { data, error } = await run();
          if (error) throw error;
          return (data ?? fallback) as T;
        } catch (err: any) {
          console.warn(`[contenu] « ${label} » indisponible, utilisation du secours :`, err?.message || err);
          return fallback;
        }
      })(),
    );
  }
  return cache.get(label)!;
}

const hasValue = (v: unknown) => !(v == null || v === '' || (Array.isArray(v) && v.length === 0));

export async function getSettings(): Promise<Settings> {
  const row = await load<{ data: Record<string, any> } | null>(
    'réglages',
    () => supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
    null,
  );
  const merged: Record<string, any> = { ...fallbackConfig };
  for (const [key, value] of Object.entries(row?.data || {})) {
    if (hasValue(value)) merged[key] = value;
  }
  merged.hours = (merged.hours || []).filter((h: Hours) => h.value);
  return merged as Settings;
}

export function getCategories(): Promise<Category[]> {
  return load('catégories', () => supabase.from('categories').select('id, slug, name, description, cover_path').eq('is_published', true).order('sort_order'), []);
}

export function getBrands(): Promise<Brand[]> {
  return load('marques', () => supabase.from('brands').select('id, slug, name, logo_path, description').eq('is_published', true).order('sort_order').order('name'), []);
}

export async function getProducts(): Promise<Product[]> {
  const rows = await load<any[]>(
    'produits',
    () =>
      supabase
        .from('products')
        .select(
          'id, handle, title, description, gender, frame_shape, material, sku, tags, is_new, is_featured, ' +
            'category:categories(slug, name), brand:brands(slug, name), ' +
            'images:product_images(path, alt, variant_id, sort_order), variants:product_variants(id, color_name, color_hex, sort_order)',
        )
        .eq('is_published', true)
        .order('sort_order')
        .order('created_at', { ascending: false }),
    [],
  );
  const products: Product[] = rows.map((p) => ({
    ...p,
    tags: p.tags || [],
    images: [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order),
    variants: [...(p.variants || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
  return products.length || !DEMO ? products : demoProducts;
}

export function getServices(): Promise<Service[]> {
  return load('services', () => supabase.from('services').select('id, slug, title, summary, body, cover_path').eq('is_published', true).order('sort_order'), []);
}

export async function getArticles(): Promise<Article[]> {
  const articles = await load<Article[]>(
    'articles',
    () =>
      supabase
        .from('articles')
        .select('id, slug, title, excerpt, body, cover_path, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false, nullsFirst: false }),
    [],
  );
  return articles.length || !DEMO ? articles : demoArticles;
}

export const GENDER_LABELS: Record<string, string> = { femme: 'Femme', homme: 'Homme', mixte: 'Unisexe', enfant: 'Enfant' };
export const GENDER_ORDER = ['femme', 'homme', 'mixte', 'enfant'] as const;

export const capitalize = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
