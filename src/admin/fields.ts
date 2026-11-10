import { mediaUrl } from '../lib/supabase';
import { uploadMedia, removeMedia } from './media';
import { h, handleError } from './ui';

export type Option = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type: 'text' | 'slug' | 'textarea' | 'markdown' | 'number' | 'bool' | 'select' | 'image' | 'date' | 'tags';
  required?: boolean;
  help?: string;
  placeholder?: string;
  from?: string; // slug : champ source
  options?: Option[] | (() => Promise<Option[]>);
  folder?: string; // image : dossier dans le Storage
  full?: boolean; // occupe toute la largeur
};

export type FieldControl = {
  el: HTMLElement;
  input?: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  get: () => any;
  afterSave?: () => Promise<void>;
};

function wrap(field: Field, control: HTMLElement, id: string, wide = false) {
  return h(
    'div',
    { class: `field${field.full || wide ? ' full' : ''}${field.type === 'bool' ? ' check' : ''}` },
    field.type === 'bool'
      ? h('label', { for: id }, control, ' ', field.label)
      : [h('label', { for: id }, field.label, field.required ? h('span', { class: 'req' }, ' *') : null), control],
    field.help ? h('small', { class: 'help' }, field.help) : null,
  );
}

export async function fieldControl(field: Field, value: any): Promise<FieldControl> {
  const id = `f-${field.name}`;

  switch (field.type) {
    case 'bool': {
      const input = h('input', { type: 'checkbox', id, checked: !!value }) as HTMLInputElement;
      return { el: wrap(field, input, id), input, get: () => input.checked };
    }

    case 'number': {
      const input = h('input', { type: 'number', id, value: value ?? 0, step: 1 }) as HTMLInputElement;
      return { el: wrap(field, input, id), input, get: () => (input.value === '' ? 0 : Number(input.value)) };
    }

    case 'textarea':
    case 'markdown': {
      const input = h('textarea', {
        id,
        rows: field.type === 'markdown' ? 12 : 4,
        placeholder: field.placeholder,
        value: value ?? '',
      }) as HTMLTextAreaElement;
      return { el: wrap(field, input, id, true), input, get: () => input.value.trim() || null };
    }

    case 'select': {
      const options = typeof field.options === 'function' ? await field.options() : field.options || [];
      const input = h(
        'select',
        { id },
        options.map((o) => h('option', { value: o.value, selected: String(value ?? '') === o.value }, o.label)),
      ) as HTMLSelectElement;
      return { el: wrap(field, input, id), input, get: () => input.value || null };
    }

    case 'date': {
      const input = h('input', { type: 'date', id, value: value ? String(value).slice(0, 10) : '' }) as HTMLInputElement;
      return {
        el: wrap(field, input, id),
        input,
        get: () => (input.value ? new Date(`${input.value}T12:00:00`).toISOString() : null),
      };
    }

    case 'tags': {
      const input = h('input', {
        type: 'text',
        id,
        placeholder: field.placeholder || 'mot1, mot2…',
        value: (value || []).join(', '),
      }) as HTMLInputElement;
      return {
        el: wrap(field, input, id),
        input,
        get: () =>
          input.value
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
      };
    }

    case 'image': {
      const original: string | null = value || null;
      let current: string | null = original;
      const uploaded: string[] = [];
      const preview = h('div', { class: 'image-preview' });
      const fileInput = h('input', { type: 'file', id, accept: 'image/*' }) as HTMLInputElement;
      const removeBtn = h('button', { type: 'button', class: 'btn ghost small' }, 'Retirer l’image');

      const draw = () => {
        preview.replaceChildren(current ? h('img', { src: mediaUrl(current), alt: '' }) : h('span', { class: 'muted' }, 'Aucune image'));
        removeBtn.hidden = !current;
      };
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        preview.replaceChildren(h('span', { class: 'muted' }, 'Optimisation et envoi…'));
        try {
          current = await uploadMedia(field.folder || 'divers', file);
          uploaded.push(current);
        } catch (err) {
          handleError(err);
        }
        fileInput.value = '';
        draw();
      });
      removeBtn.addEventListener('click', () => {
        current = null;
        draw();
      });
      draw();

      return {
        el: wrap(field, h('div', { class: 'image-field' }, preview, fileInput, removeBtn), id),
        get: () => current,
        // Après enregistrement : supprime l'ancienne image remplacée et les essais non retenus.
        afterSave: async () => {
          const unused = [...uploaded, original].filter((p) => p && p !== current);
          await removeMedia(unused);
        },
      };
    }

    default: {
      // text, slug
      const input = h('input', {
        type: 'text',
        id,
        value: value ?? '',
        placeholder: field.placeholder,
        ...(field.type === 'slug' ? { pattern: '[a-z0-9-]+', autocapitalize: 'off', spellcheck: 'false' } : {}),
      }) as HTMLInputElement;
      return { el: wrap(field, input, id), input, get: () => input.value.trim() || null };
    }
  }
}
