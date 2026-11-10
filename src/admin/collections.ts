import { supabase } from '../lib/supabase';
import type { Field, Option } from './fields';
import { variantsEditor, imagesEditor, type Extra } from './views/product-extras';

export type Collection = {
  key: string; // segment d'URL de l'admin (#produits)
  table: string;
  label: string;
  addLabel: string;
  titleField: string;
  order: [string, boolean][]; // [colonne, ascendant]
  listSelect?: string;
  subtitle?: (row: any) => string;
  thumb?: (row: any) => string | null | undefined;
  defaults?: Record<string, any>;
  fields: Field[];
  extras?: (record: any) => Promise<Extra[]>;
  mediaPaths?: (record: any) => Promise<string[]>; // fichiers à supprimer avec l'élément
};

const choices = (...labels: string[]): Option[] => [
  { value: '', label: '—' },
  ...labels.map((label) => ({ value: label.toLowerCase(), label })),
];

const fromTable = (table: string) => async (): Promise<Option[]> => {
  const { data } = await supabase.from(table).select('id, name').order('sort_order');
  return [{ value: '', label: '—' }, ...(data || []).map((r) => ({ value: r.id, label: r.name }))];
};

const published = (help = 'Décochez pour masquer sans supprimer.'): Field => ({
  name: 'is_published',
  label: 'Publié (visible sur le site)',
  type: 'bool',
  help,
});
const sortOrder: Field = { name: 'sort_order', label: 'Ordre d’affichage', type: 'number', help: 'Les plus petits nombres apparaissent en premier.' };

export const collections: Record<string, Collection> = {
  produits: {
    key: 'produits',
    table: 'products',
    label: 'Produits',
    addLabel: 'Ajouter un produit',
    titleField: 'title',
    order: [['sort_order', true], ['created_at', false]],
    listSelect: 'id, title, sku, is_published, categories(name), product_images(path, sort_order)',
    subtitle: (r) => [r.categories?.name, r.sku].filter(Boolean).join(' · '),
    thumb: (r) => [...(r.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.path,
    defaults: { is_published: false, sort_order: 0, tags: [] },
    fields: [
      { name: 'title', label: 'Nom du modèle', type: 'text', required: true, placeholder: 'ex. Ray-Ban Wayfarer RB2140' },
      { name: 'handle', label: 'Identifiant d’URL', type: 'slug', from: 'title', help: 'Rempli automatiquement. Minuscules, chiffres et tirets.' },
      { name: 'category_id', label: 'Catégorie', type: 'select', options: fromTable('categories') },
      { name: 'brand_id', label: 'Marque', type: 'select', options: fromTable('brands') },
      { name: 'gender', label: 'Pour', type: 'select', options: [{ value: '', label: '—' }, { value: 'femme', label: 'Femme' }, { value: 'homme', label: 'Homme' }, { value: 'mixte', label: 'Unisexe' }, { value: 'enfant', label: 'Enfant' }] },
      { name: 'frame_shape', label: 'Forme', type: 'select', options: choices('Ronde', 'Ovale', 'Carrée', 'Rectangulaire', 'Papillon', 'Aviateur', 'Pantos', 'Géométrique', 'Masque') },
      { name: 'material', label: 'Matière', type: 'select', options: choices('Acétate', 'Métal', 'Titane', 'Mixte', 'Injecté') },
      { name: 'sku', label: 'Référence', type: 'text', placeholder: 'ex. RB2140-901' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Quelques phrases sur le modèle, les verres conseillés…' },
      { name: 'tags', label: 'Mots-clés', type: 'tags', help: 'Séparés par des virgules (ex. polarisé, léger).' },
      { name: 'is_new', label: 'Nouveauté', type: 'bool' },
      { name: 'is_featured', label: 'Mis en avant sur l’accueil', type: 'bool' },
      published('Un produit en brouillon n’apparaît pas sur le site.'),
      sortOrder,
    ],
    extras: async (record) => [await variantsEditor(record), await imagesEditor(record)],
    mediaPaths: async (record) => {
      const { data } = await supabase.from('product_images').select('path').eq('product_id', record.id);
      return (data || []).map((r) => r.path);
    },
  },

  categories: {
    key: 'categories',
    table: 'categories',
    label: 'Catégories',
    addLabel: 'Ajouter une catégorie',
    titleField: 'name',
    order: [['sort_order', true]],
    thumb: (r) => r.cover_path,
    defaults: { is_published: true, sort_order: 0 },
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true },
      { name: 'slug', label: 'Identifiant d’URL', type: 'slug', from: 'name' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'cover_path', label: 'Image de couverture', type: 'image', folder: 'categories' },
      published(),
      sortOrder,
    ],
    mediaPaths: async (r) => [r.cover_path],
  },

  marques: {
    key: 'marques',
    table: 'brands',
    label: 'Marques',
    addLabel: 'Ajouter une marque',
    titleField: 'name',
    order: [['sort_order', true], ['name', true]],
    thumb: (r) => r.logo_path,
    defaults: { is_published: true, sort_order: 0 },
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true },
      { name: 'slug', label: 'Identifiant d’URL', type: 'slug', from: 'name' },
      { name: 'logo_path', label: 'Logo', type: 'image', folder: 'marques', help: 'Idéalement en PNG transparent ou SVG.' },
      { name: 'description', label: 'Description', type: 'textarea' },
      published(),
      sortOrder,
    ],
    mediaPaths: async (r) => [r.logo_path],
  },

  services: {
    key: 'services',
    table: 'services',
    label: 'Services',
    addLabel: 'Ajouter un service',
    titleField: 'title',
    order: [['sort_order', true]],
    thumb: (r) => r.cover_path,
    defaults: { is_published: true, sort_order: 0 },
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true, placeholder: 'ex. Examen de vue' },
      { name: 'slug', label: 'Identifiant d’URL', type: 'slug', from: 'title' },
      { name: 'summary', label: 'Résumé (1 à 2 phrases)', type: 'textarea' },
      { name: 'body', label: 'Texte détaillé', type: 'markdown', help: 'Mise en forme : ## Sous-titre, **gras**, - liste.' },
      { name: 'cover_path', label: 'Image', type: 'image', folder: 'services' },
      published(),
      sortOrder,
    ],
    mediaPaths: async (r) => [r.cover_path],
  },

  conseils: {
    key: 'conseils',
    table: 'articles',
    label: 'Conseils',
    addLabel: 'Écrire un article',
    titleField: 'title',
    order: [['published_at', false], ['created_at', false]],
    thumb: (r) => r.cover_path,
    defaults: { is_published: false },
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true, placeholder: 'ex. La règle du 20-20-20' },
      { name: 'slug', label: 'Identifiant d’URL', type: 'slug', from: 'title' },
      { name: 'excerpt', label: 'Chapeau (résumé affiché dans la liste)', type: 'textarea' },
      { name: 'body', label: 'Article', type: 'markdown', help: 'Mise en forme : ## Sous-titre, **gras**, - liste.' },
      { name: 'cover_path', label: 'Image de couverture', type: 'image', folder: 'conseils' },
      { name: 'published_at', label: 'Date de publication', type: 'date' },
      published('Un article en brouillon n’apparaît pas sur le site.'),
    ],
    mediaPaths: async (r) => [r.cover_path],
  },
};
