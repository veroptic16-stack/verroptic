import { supabase, mediaUrl } from '../../lib/supabase';
import type { Collection } from '../collections';
import { fieldControl, type FieldControl } from '../fields';
import { removeMedia } from '../media';
import { h, toast, handleError, slugify } from '../ui';

export async function renderList(root: HTMLElement, col: Collection) {
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Rechercher…', 'aria-label': 'Rechercher' }) as HTMLInputElement;
  const list = h('div', { class: 'list' }, h('p', { class: 'muted' }, 'Chargement…'));
  root.replaceChildren(
    h('div', { class: 'view-head' }, h('h1', {}, col.label), h('a', { class: 'btn primary', href: `#${col.key}/nouveau` }, `+ ${col.addLabel}`)),
    search,
    list,
  );

  let query = supabase.from(col.table).select(col.listSelect || '*');
  for (const [column, ascending] of col.order) query = query.order(column, { ascending, nullsFirst: false });
  const { data, error } = await query;
  if (error) return handleError(error, list);
  const rows: any[] = data || [];

  const row = (r: any) => {
    const thumb = col.thumb?.(r);
    return h(
      'a',
      { class: 'row', href: `#${col.key}/${r.id}` },
      col.thumb ? h('span', { class: 'thumb' }, thumb ? h('img', { src: mediaUrl(thumb), alt: '', loading: 'lazy' }) : null) : null,
      h('span', { class: 'row-title' }, r[col.titleField] || '(sans titre)', col.subtitle?.(r) ? h('small', {}, col.subtitle(r)) : null),
      'is_published' in r ? h('span', { class: `badge ${r.is_published ? 'on' : 'off'}` }, r.is_published ? 'Publié' : 'Brouillon') : null,
    );
  };

  const draw = () => {
    const term = search.value.trim().toLowerCase();
    const items = rows.filter((r) => !term || String(r[col.titleField] ?? '').toLowerCase().includes(term));
    list.replaceChildren(
      ...(items.length ? items.map(row) : [h('p', { class: 'muted' }, rows.length ? 'Aucun résultat.' : 'Rien pour l’instant.')]),
    );
  };
  search.addEventListener('input', draw);
  draw();
}

export async function renderEdit(root: HTMLElement, col: Collection, id: string) {
  const isNew = id === 'nouveau';
  const back = h('a', { class: 'back', href: `#${col.key}` }, `← ${col.label}`);
  root.replaceChildren(back, h('p', { class: 'muted' }, 'Chargement…'));

  let record: any = { ...(col.defaults || {}) };
  if (!isNew) {
    const { data, error } = await supabase.from(col.table).select('*').eq('id', id).maybeSingle();
    if (error) return handleError(error, root);
    if (!data) return root.replaceChildren(back, h('p', { class: 'error-box' }, 'Élément introuvable (peut-être supprimé).'));
    record = data;
  }

  let extras;
  try {
    extras = col.extras ? await col.extras(record) : [];
  } catch (err) {
    return handleError(err, root);
  }

  const controls: Record<string, FieldControl> = {};
  const grid = h('div', { class: 'fields' });
  for (const field of col.fields) {
    controls[field.name] = await fieldControl(field, record[field.name]);
    grid.append(controls[field.name].el);
  }

  // Identifiant d'URL rempli automatiquement tant qu'on ne l'a pas modifié à la main.
  for (const field of col.fields) {
    if (field.type !== 'slug' || !field.from) continue;
    const slugInput = controls[field.name].input!;
    const source = controls[field.from].input!;
    let touched = !!record[field.name];
    slugInput.addEventListener('input', () => (touched = true));
    source.addEventListener('input', () => {
      if (!touched) slugInput.value = slugify(source.value);
    });
  }

  const saveBtn = h('button', { type: 'submit', class: 'btn primary' }, 'Enregistrer') as HTMLButtonElement;

  const onDelete = async () => {
    if (!confirm(`Supprimer définitivement « ${record[col.titleField]} » ? Cette action est irréversible.`)) return;
    const paths = (await col.mediaPaths?.(record)) || [];
    const { error } = await supabase.from(col.table).delete().eq('id', id);
    if (error) return handleError(error);
    await removeMedia(paths);
    toast('Supprimé');
    location.hash = col.key;
  };

  const form = h(
    'form',
    { class: 'edit', novalidate: true },
    grid,
    extras.map((e) => e.el),
    h(
      'div',
      { class: 'actions' },
      saveBtn,
      isNew ? null : h('button', { type: 'button', class: 'btn danger', onclick: onDelete }, 'Supprimer'),
    ),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Sauvegarde GLOBALE : tous les champs + blocs complémentaires (coloris, photos).
    const values: Record<string, any> = {};
    for (const field of col.fields) values[field.name] = controls[field.name].get();
    for (const field of col.fields) {
      if (field.type === 'slug' && field.from) values[field.name] = slugify(values[field.name] || values[field.from] || '');
    }
    const missing = col.fields.filter((f) => (f.required || f.type === 'slug') && !values[f.name]);
    if (missing.length) return toast(`À compléter : ${missing.map((f) => f.label).join(', ')}`, 'error');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Enregistrement…';
    try {
      const { data, error } = isNew
        ? await supabase.from(col.table).insert(values).select('id').single()
        : await supabase.from(col.table).update(values).eq('id', id).select('id').single();
      if (error) throw error;
      for (const extra of extras) await extra.save(data.id);
      for (const control of Object.values(controls)) await control.afterSave?.();
      toast('Enregistré ✓');
      // Relecture depuis la base : ce qui s'affiche est ce qui est réellement enregistré.
      if (isNew) location.hash = `${col.key}/${data.id}`;
      else await renderEdit(root, col, id);
    } catch (err) {
      handleError(err);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Enregistrer';
    }
  });

  root.replaceChildren(
    back,
    h('div', { class: 'view-head' }, h('h1', {}, isNew ? col.addLabel : record[col.titleField] || 'Modifier')),
    form,
  );
}
