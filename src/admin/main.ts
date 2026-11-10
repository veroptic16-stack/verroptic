import { supabase } from '../lib/supabase';
import { collections } from './collections';
import { h, toast, handleError } from './ui';
import { renderList, renderEdit } from './views/collection';
import { renderSettings } from './views/settings';
import { renderAppointments } from './views/appointments';

const app = document.getElementById('app')!;

const NAV = [
  { key: 'produits', label: 'Produits' },
  { key: 'categories', label: 'Catégories' },
  { key: 'marques', label: 'Marques' },
  { key: 'services', label: 'Services' },
  { key: 'conseils', label: 'Conseils' },
  { key: 'rdv', label: 'Rendez-vous' },
  { key: 'reglages', label: 'Réglages' },
];

let shellReady = false;
let view: HTMLElement;
let navEl: HTMLElement;

function renderLogin(message = '') {
  shellReady = false;
  const email = h('input', { type: 'email', id: 'email', autocomplete: 'username', required: true }) as HTMLInputElement;
  const password = h('input', { type: 'password', id: 'password', autocomplete: 'current-password', required: true }) as HTMLInputElement;
  const error = h('p', { class: 'error-box', hidden: !message }, message);
  const submit = h('button', { type: 'submit', class: 'btn primary' }, 'Se connecter') as HTMLButtonElement;

  const form = h(
    'form',
    { class: 'login' },
    h('p', { class: 'brand' }, 'VER’OPTIC'),
    h('h1', {}, 'Espace administration'),
    h('label', { for: 'email' }, 'Email'),
    email,
    h('label', { for: 'password' }, 'Mot de passe'),
    password,
    error,
    submit,
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = 'Connexion…';
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    if (err) {
      error.hidden = false;
      error.textContent = /invalid/i.test(err.message) ? 'Email ou mot de passe incorrect.' : err.message;
      submit.disabled = false;
      submit.textContent = 'Se connecter';
      return;
    }
    start();
  });
  app.replaceChildren(h('main', { class: 'login-wrap' }, form));
  email.focus();
}

async function refreshBadge() {
  const { count } = await supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'nouveau');
  const badge = navEl?.querySelector('[data-key="rdv"] .count');
  if (badge) {
    badge.textContent = count ? String(count) : '';
    (badge as HTMLElement).hidden = !count;
  }
}

async function publish(button: HTMLButtonElement) {
  if (!confirm('Mettre le site à jour avec toutes les modifications enregistrées ?\nLe site public sera à jour dans 1 à 2 minutes.')) return;
  button.disabled = true;
  const { error } = await supabase.rpc('publish_site');
  if (error) {
    button.disabled = false;
    if (/deploy hook/i.test(error.message)) return toast('La publication n’est pas encore configurée.', 'error');
    return handleError(error);
  }
  toast('Publication lancée ✓ Le site sera à jour dans 1 à 2 minutes.');
  setTimeout(() => (button.disabled = false), 60_000); // évite les doubles clics
}

function renderShell(email: string) {
  const publishBtn = h('button', { type: 'button', class: 'btn primary' }, 'Publier les modifications') as HTMLButtonElement;
  publishBtn.addEventListener('click', () => publish(publishBtn));

  navEl = h(
    'nav',
    { class: 'nav', 'aria-label': 'Sections' },
    NAV.map((item) => h('a', { href: `#${item.key}`, 'data-key': item.key }, item.label, item.key === 'rdv' ? h('span', { class: 'count', hidden: true }) : null)),
  );
  view = h('main', { class: 'view', id: 'view', tabindex: '-1' });

  app.replaceChildren(
    h(
      'header',
      { class: 'topbar' },
      h('a', { class: 'brand', href: '#produits' }, 'VER’OPTIC', h('span', {}, ' admin')),
      h(
        'div',
        { class: 'topbar-actions' },
        publishBtn,
        h('a', { class: 'btn ghost', href: '/', target: '_blank', rel: 'noopener' }, 'Voir le site'),
        h('button', { type: 'button', class: 'btn ghost', title: email, onclick: () => supabase.auth.signOut() }, 'Déconnexion'),
      ),
    ),
    h('div', { class: 'layout' }, navEl, view),
  );
  shellReady = true;
  refreshBadge();
}

async function route() {
  if (!shellReady) return;
  const [key = 'produits', id] = decodeURIComponent(location.hash.slice(1)).split('/');
  navEl.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.key === key));
  window.scrollTo(0, 0);

  try {
    if (key === 'reglages') await renderSettings(view);
    else if (key === 'rdv') await renderAppointments(view, refreshBadge);
    else if (collections[key]) await (id ? renderEdit(view, collections[key], id) : renderList(view, collections[key]));
    else location.hash = 'produits';
  } catch (err) {
    handleError(err, view);
  }
}

async function start() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return renderLogin();

  // Seuls les comptes listés dans la table admins ont accès.
  const { data: admin, error } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (error || !admin) {
    await supabase.auth.signOut();
    return renderLogin('Ce compte n’a pas les droits d’administration.');
  }
  renderShell(session.user.email || '');
  route();
}

window.addEventListener('hashchange', route);
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') renderLogin();
});

start();
