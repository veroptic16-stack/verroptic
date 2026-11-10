// Produits fictifs pour vérifier la mise en page EN LOCAL (DEMO=1). Jamais publiés.
import type { Product } from '../lib/content';

const base = { description: 'Monture de démonstration.', sku: null, tags: [] as string[], images: [], is_featured: false };

export const demoProducts: Product[] = [
  { ...base, id: 'd1', handle: 'demo-aviateur', title: 'Aviateur Doré', gender: 'mixte', frame_shape: 'aviateur', material: 'métal', is_new: true, is_featured: true, category: { slug: 'solaire', name: 'Solaire' }, brand: { slug: 'demo', name: 'Maison Démo' }, variants: [{ id: 'v1', color_name: 'Or', color_hex: '#c9a55a' }, { id: 'v2', color_name: 'Argent', color_hex: '#b8bcc2' }] },
  { ...base, id: 'd2', handle: 'demo-ronde', title: 'Ronde Écaille', gender: 'femme', frame_shape: 'ronde', material: 'acétate', is_new: false, category: { slug: 'optique', name: 'Optique' }, brand: { slug: 'demo', name: 'Maison Démo' }, variants: [{ id: 'v3', color_name: 'Écaille', color_hex: '#7a4a2a' }] },
  { ...base, id: 'd3', handle: 'demo-carree', title: 'Carrée Noire', gender: 'homme', frame_shape: 'carrée', material: 'acétate', is_new: true, category: { slug: 'optique', name: 'Optique' }, brand: null, variants: [] },
  { ...base, id: 'd4', handle: 'demo-papillon', title: 'Papillon Rosé', gender: 'femme', frame_shape: 'papillon', material: 'acétate', is_new: false, category: { slug: 'solaire', name: 'Solaire' }, brand: null, variants: [{ id: 'v4', color_name: 'Rosé', color_hex: '#d9a3a8' }] },
  { ...base, id: 'd5', handle: 'demo-clip', title: 'Clip-on Ovale', gender: 'mixte', frame_shape: 'ovale', material: 'titane', is_new: false, category: { slug: 'clip-on', name: 'Clip-on' }, brand: null, variants: [] },
];
