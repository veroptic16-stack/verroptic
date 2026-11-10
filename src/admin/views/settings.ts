import { supabase } from '../../lib/supabase';
import { h, toast, handleError, ensureHttps } from '../ui';

type SettingField = { name: string; label: string; type?: 'text' | 'tel' | 'email' | 'url' | 'textarea'; help?: string; placeholder?: string };

const FIELDS: { title: string; fields: SettingField[] }[] = [
  {
    title: 'Boutique',
    fields: [
      { name: 'name', label: 'Nom' },
      { name: 'tagline', label: 'Accroche', placeholder: 'ex. Opticien à Casablanca' },
      { name: 'about', label: 'Présentation de la boutique (page d’accueil)', type: 'textarea', help: 'Quelques phrases sur l’histoire, l’équipe, le savoir-faire.' },
      { name: 'address', label: 'Adresse', type: 'textarea' },
      { name: 'google_maps_url', label: 'Lien Google Maps', type: 'url' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+212 6 53 77 08 32' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel', help: 'Numéro utilisé par tous les boutons WhatsApp du site.' },
      { name: 'email', label: 'Email', type: 'email' },
    ],
  },
  {
    title: 'Réseaux sociaux',
    fields: [
      { name: 'instagram', label: 'Instagram', type: 'url', placeholder: 'https://www.instagram.com/…' },
      { name: 'facebook', label: 'Facebook', type: 'url' },
      { name: 'tiktok', label: 'TikTok', type: 'url' },
    ],
  },
];

const URL_FIELDS = FIELDS.flatMap((g) => g.fields).filter((f) => f.type === 'url').map((f) => f.name);
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export async function renderSettings(root: HTMLElement) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Chargement…'));
  const { data: row, error } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle();
  if (error) return handleError(error, root);
  const data: Record<string, any> = row?.data || {};

  const inputs: Record<string, HTMLInputElement | HTMLTextAreaElement> = {};
  const hoursInputs: Record<string, HTMLInputElement> = {};
  const hours: { day: string; value: string }[] = Array.isArray(data.hours) ? data.hours : [];

  const groups = FIELDS.map((group) =>
    h(
      'fieldset',
      { class: 'panel' },
      h('legend', {}, group.title),
      h(
        'div',
        { class: 'fields' },
        group.fields.map((f) => {
          const id = `s-${f.name}`;
          const input = (
            f.type === 'textarea'
              ? h('textarea', { id, rows: 2, value: data[f.name] ?? '' })
              : h('input', { id, type: f.type === 'url' ? 'text' : f.type || 'text', inputmode: f.type === 'url' ? 'url' : undefined, value: data[f.name] ?? '', placeholder: f.placeholder })
          ) as HTMLInputElement;
          inputs[f.name] = input;
          return h('div', { class: `field${f.type === 'textarea' ? ' full' : ''}` }, h('label', { for: id }, f.label), input, f.help ? h('small', { class: 'help' }, f.help) : null);
        }),
      ),
    ),
  );

  const hoursPanel = h(
    'fieldset',
    { class: 'panel' },
    h('legend', {}, 'Horaires'),
    h('p', { class: 'help' }, 'Laissez vide si inconnu. Écrivez « Fermé » pour un jour de fermeture.'),
    h(
      'div',
      { class: 'hours' },
      DAYS.map((day) => {
        const id = `h-${day}`;
        const input = h('input', { id, type: 'text', placeholder: '10:00 – 20:00', value: hours.find((x) => x.day === day)?.value ?? '' }) as HTMLInputElement;
        hoursInputs[day] = input;
        return h('div', { class: 'hours-row' }, h('label', { for: id }, day), input);
      }),
    ),
  );

  const saveBtn = h('button', { type: 'submit', class: 'btn primary' }, 'Enregistrer') as HTMLButtonElement;
  const form = h('form', { class: 'edit', novalidate: true }, groups, hoursPanel, h('div', { class: 'actions' }, saveBtn));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Sauvegarde globale : on collecte TOUS les champs du formulaire, et on garde les clés inconnues.
    const next: Record<string, any> = { ...data };
    for (const [name, input] of Object.entries(inputs)) {
      const value = input.value.trim();
      next[name] = URL_FIELDS.includes(name) ? ensureHttps(value) : value;
    }
    next.hours = DAYS.map((day) => ({ day, value: hoursInputs[day].value.trim() }));

    saveBtn.disabled = true;
    saveBtn.textContent = 'Enregistrement…';
    const { error: saveError } = await supabase.from('settings').update({ data: next }).eq('id', 1).select('id').single();
    if (saveError) {
      handleError(saveError);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Enregistrer';
      return;
    }
    toast('Réglages enregistrés ✓');
    await renderSettings(root); // relecture depuis la base
  });

  root.replaceChildren(h('div', { class: 'view-head' }, h('h1', {}, 'Réglages du site')), form);
}
