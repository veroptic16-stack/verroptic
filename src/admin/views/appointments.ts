import { supabase } from '../../lib/supabase';
import { h, toast, handleError, whatsappLink, formatDate } from '../ui';

const STATUSES = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'confirme', label: 'Confirmé' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
];

export async function renderAppointments(root: HTMLElement, onChange?: () => void) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Chargement…'));
  const { data, error } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
  if (error) return handleError(error, root);
  const rows: any[] = data || [];

  let filter = 'nouveau';
  const list = h('div', { class: 'cards' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });

  const setStatus = async (row: any, status: string) => {
    const { error: err } = await supabase.from('appointments').update({ status }).eq('id', row.id).select('id').single();
    if (err) return handleError(err);
    row.status = status;
    toast('Statut mis à jour');
    draw();
    onChange?.();
  };

  const remove = async (row: any) => {
    if (!confirm(`Supprimer définitivement la demande de ${row.full_name} ?`)) return;
    const { error: err } = await supabase.from('appointments').delete().eq('id', row.id);
    if (err) return handleError(err);
    rows.splice(rows.indexOf(row), 1);
    toast('Demande supprimée');
    draw();
    onChange?.();
  };

  const card = (r: any) =>
    h(
      'article',
      { class: 'card' },
      h('div', { class: 'card-head' }, h('strong', {}, r.full_name), h('small', { class: 'muted' }, `Reçue le ${formatDate(r.created_at, true)}`)),
      h(
        'dl',
        {},
        r.preferred_date || r.preferred_slot ? [h('dt', {}, 'Souhait'), h('dd', {}, [formatDate(r.preferred_date), r.preferred_slot].filter(Boolean).join(' · '))] : null,
        r.reason ? [h('dt', {}, 'Motif'), h('dd', {}, r.reason)] : null,
        r.product_handle ? [h('dt', {}, 'Modèle'), h('dd', {}, h('a', { href: `/lunettes/${r.product_handle}/`, target: '_blank', rel: 'noopener' }, r.product_handle))] : null,
        r.message ? [h('dt', {}, 'Message'), h('dd', {}, r.message)] : null,
      ),
      h(
        'div',
        { class: 'card-actions' },
        h('a', { class: 'btn small', href: `tel:${r.phone.replace(/\s/g, '')}` }, `📞 ${r.phone}`),
        h('a', { class: 'btn small', href: whatsappLink(r.phone, `Bonjour ${r.full_name}, VER'OPTIC vous recontacte au sujet de votre demande de rendez-vous.`), target: '_blank', rel: 'noopener' }, 'WhatsApp'),
        h(
          'select',
          { 'aria-label': 'Statut', onchange: (e: any) => setStatus(r, e.target.value) },
          STATUSES.map((s) => h('option', { value: s.value, selected: r.status === s.value }, s.label)),
        ),
        h('button', { type: 'button', class: 'btn ghost small danger-text', onclick: () => remove(r) }, 'Supprimer'),
      ),
    );

  const draw = () => {
    tabs.replaceChildren(
      ...[{ value: 'tous', label: 'Toutes' }, ...STATUSES].map((s) => {
        const count = s.value === 'tous' ? rows.length : rows.filter((r) => r.status === s.value).length;
        return h('button', { type: 'button', role: 'tab', 'aria-selected': String(filter === s.value), class: `tab${filter === s.value ? ' active' : ''}`, onclick: () => { filter = s.value; draw(); } }, `${s.label} (${count})`);
      }),
    );
    const items = rows.filter((r) => filter === 'tous' || r.status === filter);
    list.replaceChildren(...(items.length ? items.map(card) : [h('p', { class: 'muted' }, 'Aucune demande ici.')]));
  };
  draw();

  root.replaceChildren(h('div', { class: 'view-head' }, h('h1', {}, 'Demandes de rendez-vous')), tabs, list);
}
