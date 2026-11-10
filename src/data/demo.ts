// Produits fictifs pour vérifier la mise en page EN LOCAL (DEMO=1). Jamais publiés.
import type { Product, Article } from '../lib/content';

const base = { description: 'Monture de démonstration.', sku: null, tags: [] as string[], images: [], is_featured: false };

export const demoProducts: Product[] = [
  { ...base, id: 'd1', handle: 'demo-aviateur', title: 'Aviateur Doré', gender: 'mixte', frame_shape: 'aviateur', material: 'métal', is_new: true, is_featured: true, category: { slug: 'solaire', name: 'Solaire' }, brand: { slug: 'demo', name: 'Maison Démo' }, variants: [{ id: 'v1', color_name: 'Or', color_hex: '#c9a55a' }, { id: 'v2', color_name: 'Argent', color_hex: '#b8bcc2' }] },
  { ...base, id: 'd2', handle: 'demo-ronde', title: 'Ronde Écaille', gender: 'femme', frame_shape: 'ronde', material: 'acétate', is_new: false, category: { slug: 'optique', name: 'Optique' }, brand: { slug: 'demo', name: 'Maison Démo' }, variants: [{ id: 'v3', color_name: 'Écaille', color_hex: '#7a4a2a' }] },
  { ...base, id: 'd3', handle: 'demo-carree', title: 'Carrée Noire', gender: 'homme', frame_shape: 'carrée', material: 'acétate', is_new: true, category: { slug: 'optique', name: 'Optique' }, brand: null, variants: [] },
  { ...base, id: 'd4', handle: 'demo-papillon', title: 'Papillon Rosé', gender: 'femme', frame_shape: 'papillon', material: 'acétate', is_new: false, category: { slug: 'solaire', name: 'Solaire' }, brand: null, variants: [{ id: 'v4', color_name: 'Rosé', color_hex: '#d9a3a8' }] },
  { ...base, id: 'd5', handle: 'demo-clip', title: 'Clip-on Ovale', gender: 'mixte', frame_shape: 'ovale', material: 'titane', is_new: false, category: { slug: 'clip-on', name: 'Clip-on' }, brand: null, variants: [] },
];

const article = (id: string, slug: string, title: string, excerpt: string, date: string) => ({
  id, slug, title, excerpt, published_at: date, cover_path: null,
  body: '## Sous-titre de démonstration\n\nTexte de démonstration pour vérifier la mise en page.\n\n- Premier point\n- Deuxième point',
});

export const demoArticles: Article[] = [
  article('a1', 'demo-20-20-20', 'La règle du 20-20-20 pour reposer vos yeux', 'Écrans, lecture, téléphone : une habitude simple pour limiter la fatigue visuelle au quotidien.', '2026-11-08T12:00:00Z'),
  article('a2', 'demo-choisir-monture', '4 conseils pour bien choisir vos lunettes', 'Forme du visage, usage, confort : les bons réflexes avant de craquer pour une monture.', '2026-11-02T12:00:00Z'),
  article('a3', 'demo-verres-photochromiques', 'Verres photochromiques : pour qui ?', 'Des verres qui s’assombrissent au soleil. On vous explique leurs atouts et leurs limites.', '2026-10-25T12:00:00Z'),
  article('a4', 'demo-entretien', '5 gestes à éviter pour protéger vos lunettes', 'Nettoyage, rangement, chaleur : les erreurs courantes qui abîment vos verres.', '2026-10-18T12:00:00Z'),
  article('a5', 'demo-lentilles', '6 conseils pour bien utiliser vos lentilles', 'Hygiène, durée de port, solution : l’essentiel pour porter des lentilles en toute sécurité.', '2026-10-10T12:00:00Z'),
];
