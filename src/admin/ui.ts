import { supabase } from '../lib/supabase';

type Child = Node | string | number | null | undefined | false | Child[];

// Mini-fabrique d'éléments DOM : h('button', { class: 'btn', onclick: fn }, 'Texte')
export function h(tag: string, attrs: Record<string, any> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = value;
    } else if (key === 'value' || key === 'checked' || key === 'selected') {
      (el as any)[key] = value;
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  const append = (c: Child) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(append);
    el.append(c instanceof Node ? c : String(c));
  };
  children.forEach(append);
  return el;
}

let toastBox: HTMLElement | null = null;

export function toast(message: string, type: 'ok' | 'error' = 'ok') {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const item = h('div', { class: `toast ${type}` }, message);
  toastBox.append(item);
  setTimeout(() => item.remove(), type === 'error' ? 7000 : 3500);
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export { ensureHttps, whatsappLink } from '../lib/links';

function describeError(err: any): string {
  const code = err?.code;
  const message = String(err?.message || err || 'Erreur inconnue');
  if (code === '23505') return 'Cet identifiant est déjà utilisé par un autre élément.';
  if (code === '23514') return 'Une valeur n’a pas le bon format (identifiant : minuscules, chiffres et tirets).';
  if (code === '42501') return 'Action refusée : droits insuffisants ou session expirée.';
  if (code === 'PGRST116') return 'Aucune modification enregistrée : session expirée ou élément supprimé.';
  if (/failed to fetch|network/i.test(message)) return 'Connexion impossible. Vérifiez internet puis réessayez.';
  return message;
}

function isSessionExpired(err: any): boolean {
  return err?.status === 401 || err?.code === 'PGRST301' || /jwt/i.test(String(err?.message || ''));
}

export function handleError(err: any, container?: HTMLElement) {
  console.error(err);
  if (isSessionExpired(err)) {
    toast('Session expirée : reconnectez-vous.', 'error');
    supabase.auth.signOut();
    return;
  }
  const message = describeError(err);
  if (container) container.replaceChildren(h('p', { class: 'error-box' }, message));
  else toast(message, 'error');
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
