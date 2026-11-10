import { supabase, mediaUrl } from '../../lib/supabase';
import { uploadMedia, removeMedia } from '../media';
import { h, toast, handleError } from '../ui';

// Bloc complémentaire d'un formulaire : son contenu est enregistré par le bouton
// « Enregistrer » global du formulaire (pas de bouton de sauvegarde séparé).
export type Extra = { el: HTMLElement; save: (productId: string) => Promise<void> };

type VariantRow = { id?: string; color_name: string; color_hex: string | null; sku: string | null };

export async function variantsEditor(product: any): Promise<Extra> {
  let rows: VariantRow[] = [];
  if (product.id) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, color_name, color_hex, sku')
      .eq('product_id', product.id)
      .order('sort_order');
    if (error) throw error;
    rows = data || [];
  }
  const originalIds = rows.map((r) => r.id!);
  const list = h('div', { class: 'variants' });

  const draw = () =>
    list.replaceChildren(
      ...(rows.length
        ? rows.map((row, i) =>
            h(
              'div',
              { class: 'variant-row' },
              h('input', { type: 'color', value: row.color_hex || '#000000', title: 'Couleur', 'aria-label': 'Couleur', oninput: (e: any) => (row.color_hex = e.target.value) }),
              h('input', { type: 'text', value: row.color_name, placeholder: 'Nom du coloris (ex. Écaille)', 'aria-label': 'Nom du coloris', oninput: (e: any) => (row.color_name = e.target.value) }),
              h('input', { type: 'text', value: row.sku || '', placeholder: 'Réf. (facultatif)', 'aria-label': 'Référence du coloris', oninput: (e: any) => (row.sku = e.target.value) }),
              h('button', { type: 'button', class: 'btn ghost small', title: 'Retirer ce coloris', onclick: () => { rows.splice(i, 1); draw(); } }, '✕'),
            ),
          )
        : [h('p', { class: 'muted' }, 'Aucun coloris. Facultatif.')]),
    );
  draw();

  const el = h(
    'fieldset',
    { class: 'panel' },
    h('legend', {}, 'Coloris'),
    list,
    h('button', { type: 'button', class: 'btn small', onclick: () => { rows.push({ color_name: '', color_hex: '#000000', sku: null }); draw(); } }, '+ Ajouter un coloris'),
  );

  return {
    el,
    async save(productId) {
      const kept = rows.filter((r) => r.color_name.trim());
      const keptIds = kept.filter((r) => r.id).map((r) => r.id);
      const removed = originalIds.filter((id) => !keptIds.includes(id));
      if (removed.length) {
        const { error } = await supabase.from('product_variants').delete().in('id', removed);
        if (error) throw error;
      }
      for (const [i, r] of kept.entries()) {
        const payload = { product_id: productId, color_name: r.color_name.trim(), color_hex: r.color_hex, sku: r.sku?.trim() || null, sort_order: i };
        const { error } = r.id
          ? await supabase.from('product_variants').update(payload).eq('id', r.id)
          : await supabase.from('product_variants').insert(payload);
        if (error) throw error;
      }
    },
  };
}

type ImageRow = { id: string; path: string; alt: string | null; variant_id: string | null };

export async function imagesEditor(product: any): Promise<Extra> {
  if (!product.id) {
    return {
      el: h('fieldset', { class: 'panel' }, h('legend', {}, 'Photos'), h('p', { class: 'muted' }, 'Enregistrez d’abord le produit pour pouvoir ajouter des photos.')),
      save: async () => {},
    };
  }

  const [imagesRes, variantsRes] = await Promise.all([
    supabase.from('product_images').select('id, path, alt, variant_id').eq('product_id', product.id).order('sort_order'),
    supabase.from('product_variants').select('id, color_name').eq('product_id', product.id).order('sort_order'),
  ]);
  if (imagesRes.error) throw imagesRes.error;
  const images: ImageRow[] = imagesRes.data || [];
  const variants = variantsRes.data || [];

  const grid = h('div', { class: 'images' });
  const status = h('span', { class: 'muted' });
  const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'visually-hidden', id: 'product-images-input' }) as HTMLInputElement;

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= images.length) return;
    [images[i], images[j]] = [images[j], images[i]];
    draw();
  };

  const remove = async (i: number) => {
    if (!confirm('Supprimer définitivement cette photo ?')) return;
    const img = images[i];
    const { error } = await supabase.from('product_images').delete().eq('id', img.id);
    if (error) return handleError(error);
    await removeMedia([img.path]);
    images.splice(i, 1);
    draw();
    toast('Photo supprimée');
  };

  const draw = () =>
    grid.replaceChildren(
      ...(images.length
        ? images.map((img, i) =>
            h(
              'div',
              { class: 'image-card' },
              h('img', { src: mediaUrl(img.path), alt: img.alt || '', loading: 'lazy' }),
              i === 0 ? h('span', { class: 'badge on cover' }, 'Photo principale') : null,
              h('input', { type: 'text', value: img.alt || '', placeholder: 'Description (accessibilité, SEO)', 'aria-label': 'Description de la photo', oninput: (e: any) => (img.alt = e.target.value) }),
              variants.length
                ? h(
                    'select',
                    { 'aria-label': 'Coloris de la photo', onchange: (e: any) => (img.variant_id = e.target.value || null) },
                    h('option', { value: '' }, 'Tous coloris'),
                    variants.map((v) => h('option', { value: v.id, selected: img.variant_id === v.id }, v.color_name)),
                  )
                : null,
              h(
                'div',
                { class: 'image-actions' },
                h('button', { type: 'button', class: 'btn ghost small', title: 'Avancer', disabled: i === 0, onclick: () => move(i, -1) }, '←'),
                h('button', { type: 'button', class: 'btn ghost small', title: 'Reculer', disabled: i === images.length - 1, onclick: () => move(i, 1) }, '→'),
                h('button', { type: 'button', class: 'btn ghost small danger-text', title: 'Supprimer', onclick: () => remove(i) }, 'Supprimer'),
              ),
            ),
          )
        : [h('p', { class: 'muted' }, 'Aucune photo pour l’instant.')]),
    );

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    for (const [n, file] of files.entries()) {
      status.textContent = `Optimisation et envoi ${n + 1}/${files.length}…`;
      try {
        const path = await uploadMedia(`produits/${product.id}`, file);
        const { data, error } = await supabase
          .from('product_images')
          .insert({ product_id: product.id, path, alt: product.title, sort_order: images.length })
          .select('id, path, alt, variant_id')
          .single();
        if (error) {
          await removeMedia([path]);
          throw error;
        }
        images.push(data);
        draw();
      } catch (err) {
        handleError(err);
      }
    }
    status.textContent = '';
    fileInput.value = '';
  });
  draw();

  const el = h(
    'fieldset',
    { class: 'panel' },
    h('legend', {}, 'Photos'),
    h('p', { class: 'help' }, 'Les photos sont redimensionnées et compressées automatiquement. La première est la photo principale.'),
    grid,
    h('div', { class: 'upload-row' }, fileInput, h('label', { for: 'product-images-input', class: 'btn small' }, '+ Ajouter des photos'), status),
  );

  return {
    el,
    async save() {
      for (const [i, img] of images.entries()) {
        const { error } = await supabase
          .from('product_images')
          .update({ alt: img.alt?.trim() || null, variant_id: img.variant_id, sort_order: i })
          .eq('id', img.id);
        if (error) throw error;
      }
    },
  };
}
