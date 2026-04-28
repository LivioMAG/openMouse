import { state } from '../../logic/state/appState.js';
import { getSupabaseClient, getSupabaseConfigSource, initSupabaseClient } from '../../logic/services/supabaseClient.js';
import { getSession, signIn, signOut, signUpAndSignIn } from '../../logic/services/authService.js';
import {
  addContribution,
  createWishlist,
  deleteItem,
  getOwnerWishlist,
  getPublicWishlist,
  listOwnWishlists,
  saveItem,
} from '../../logic/services/wishlistService.js';
import { formatCHF, formatDate } from '../../logic/utils/format.js';
import { card, escapeHtml, renderLayout } from '../components/layout.js';

const app = () => document.getElementById('app');

function setAppContent(html) {
  const root = app();
  if (!root) throw new Error('App-Container (#app) wurde nicht gefunden.');
  root.innerHTML = html;
}

export async function initApp() {
  window.addEventListener('hashchange', render);

  try {
    await initSupabaseClient();
    const { data } = await getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      state.session = session;
      render();
    });
    state.session = (await getSession()) || null;
    state.authSubscription = data.subscription;
    render();
  } catch (err) {
    renderConfigError(err);
  }
}

function route() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw;
}

async function render() {
  try {
    const r = route();
    if (r.startsWith('/public/')) return renderPublic(r.split('/public/')[1]);
    if (!state.session) return renderAuth();
    if (r.startsWith('/wishlist/')) return renderOwnerWishlist(r.split('/wishlist/')[1]);
    return renderDashboard();
  } catch (err) {
    renderRuntimeError(err);
  }
}

function renderConfigError(err) {
  const source = getSupabaseConfigSource() || 'config/supabase.json';
  setAppContent(
    renderLayout(
      card(`
        <h2>Konfiguration fehlt oder ist ungültig</h2>
        <p class="msg">${escapeHtml(err.message || 'Unbekannter Fehler.')}</p>
        <p>Bitte prüfe <code>${escapeHtml(source)}</code> und lade die Seite neu.</p>
      `),
      { title: 'openMouse Wishlist' },
    ),
  );
}

function renderRuntimeError(err) {
  const isAuthError = /auth|jwt|session|token/i.test(err?.message || '');
  setAppContent(
    renderLayout(
      card(`
        <h2>Fehler beim Laden</h2>
        <p class="msg">${escapeHtml(err.message || 'Unbekannter Fehler.')}</p>
        <p>${isAuthError ? 'Bitte melde dich erneut an.' : 'Bitte Seite neu laden und erneut versuchen.'}</p>
      `),
      { title: 'openMouse Wishlist', actions: state.session ? '<button id="logout-btn" class="ghost">Logout</button>' : '' },
    ),
  );

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut();
      state.session = null;
      location.hash = '#/';
      renderAuth();
    };
  }
}

function renderAuth(message = '') {
  setAppContent(
    renderLayout(
      card(`
        <h2>Login / Registrierung</h2>
        ${message ? `<p class="msg">${escapeHtml(message)}</p>` : ''}
        <form id="auth-form" class="stack">
          <input name="email" type="email" placeholder="E-Mail" required />
          <input name="password" type="password" placeholder="Passwort" required minlength="6" />
          <div class="row">
            <button type="submit" name="action" value="login">Einloggen</button>
            <button type="submit" name="action" value="register" class="ghost">Registrieren</button>
          </div>
        </form>
      `),
    ),
  );

  const authForm = document.getElementById('auth-form');
  if (!authForm) return;

  authForm.onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const action = e.submitter?.value || 'login';
    try {
      if (action === 'register') {
        await signUpAndSignIn(form.email.value, form.password.value);
        state.session = await getSession();
        await render();
        location.hash = '#/';
        return;
      }
      state.session = await signIn(form.email.value, form.password.value);
      await render();
      location.hash = '#/';
    } catch (err) {
      renderAuth(err.message);
    }
  };
}

async function renderDashboard(message = '') {
  const wishlists = (await listOwnWishlists()) || [];
  setAppContent(
    renderLayout(
      `
      ${card(`
        <h2>Dashboard</h2>
        ${message ? `<p class="msg">${escapeHtml(message)}</p>` : ''}
        <form id="new-wishlist" class="stack">
          <input name="title" placeholder="Titel" required />
          <textarea name="description" placeholder="Beschreibung (optional)"></textarea>
          <button>Wunschliste erstellen</button>
        </form>
      `)}
      ${wishlists.length
        ? wishlists
            .map((w) =>
              card(`
                <h3>${escapeHtml(w.title)}</h3>
                <p>${escapeHtml(w.description || '')}</p>
                <p>Erstellt: ${formatDate(w.created_at)} · Status: ${w.status}</p>
                <div class="row">
                  <a class="btn" href="#/wishlist/${w.id}">Verwalten</a>
                  <a class="btn ghost" target="_blank" href="#/public/${w.slug}">Öffentlicher Link</a>
                </div>
              `),
            )
            .join('')
        : card('<p>Noch keine Wunschlisten vorhanden.</p>')}
    `,
      { actions: '<button id="logout-btn" class="ghost">Logout</button>' },
    ),
  );

  document.getElementById('logout-btn').onclick = async () => {
    await signOut();
    location.hash = '#/';
  };

  document.getElementById('new-wishlist').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await createWishlist({ title: form.title.value, description: form.description.value });
      await renderDashboard('Wunschliste erstellt.');
    } catch (err) {
      await renderDashboard(err.message);
    }
  };
}

async function renderOwnerWishlist(wishlistId, message = '') {
  const { wishlist, items } = await getOwnerWishlist(wishlistId);
  const publicUrl = `${location.origin}${location.pathname}#/public/${wishlist.slug}`;
  setAppContent(
    renderLayout(
      `
      ${card(`
        <a href="#/">← Dashboard</a>
        <h2>${escapeHtml(wishlist.title)}</h2>
        <p>${escapeHtml(wishlist.description || '')}</p>
        ${message ? `<p class="msg">${escapeHtml(message)}</p>` : ''}
        <div class="row">
          <input id="share-input" value="${publicUrl}" readonly />
          <button id="copy-link">Link kopieren</button>
        </div>
      `)}
      ${card(`
        <h3>Geschenk hinzufügen</h3>
        <form id="item-form" class="stack">
          <input name="title" placeholder="Titel" required />
          <textarea name="description" placeholder="Beschreibung"></textarea>
          <input name="imageUrl" placeholder="Bild URL" />
          <input name="priceChf" type="number" step="0.01" min="0" placeholder="Preis CHF" />
          <input name="externalUrl" placeholder="Externer Link" />
          <input name="sortOrder" type="number" placeholder="Sortierung" value="0" />
          <button>Geschenk hinzufügen</button>
        </form>
      `)}
      ${items
        .map(
          (item) =>
            card(`
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description || '')}</p>
              <p>Preis: ${formatCHF(item.price_chf)}</p>
              ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="item-image" />` : ''}
              ${item.external_url ? `<p><a target="_blank" href="${escapeHtml(item.external_url)}">Produktlink</a></p>` : ''}
              <p>Status: ${item.status}</p>
              <div class="row">
                <button class="delete-item" data-item-id="${item.id}">Löschen</button>
              </div>
              <details>
                <summary>Beteiligungen (${item.item_contributions.length})</summary>
                <ul>
                  ${item.item_contributions
                    .map(
                      (c) =>
                        `<li>${escapeHtml(c.visitor_name)} · ${c.contribution_type}${c.amount_chf ? ` · ${formatCHF(c.amount_chf)}` : ''}${
                          c.comment ? ` · ${escapeHtml(c.comment)}` : ''
                        }</li>`,
                    )
                    .join('') || '<li>Keine Beteiligungen</li>'}
                </ul>
              </details>
            `),
        )
        .join('')}
    `,
      { actions: '<button id="logout-btn" class="ghost">Logout</button>' },
    ),
  );

  document.getElementById('copy-link').onclick = async () => {
    await navigator.clipboard.writeText(publicUrl);
    alert('Link kopiert.');
  };

  document.getElementById('item-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await saveItem({
        wishlistId,
        title: f.title.value,
        description: f.description.value,
        imageUrl: f.imageUrl.value,
        priceChf: f.priceChf.value,
        externalUrl: f.externalUrl.value,
        sortOrder: Number(f.sortOrder.value || 0),
      });
      await renderOwnerWishlist(wishlistId, 'Geschenk gespeichert.');
    } catch (err) {
      await renderOwnerWishlist(wishlistId, err.message);
    }
  };

  document.querySelectorAll('.delete-item').forEach((btn) => {
    btn.onclick = async () => {
      await deleteItem(btn.dataset.itemId);
      await renderOwnerWishlist(wishlistId, 'Geschenk gelöscht.');
    };
  });

  document.getElementById('logout-btn').onclick = async () => {
    await signOut();
    location.hash = '#/';
  };
}

async function renderPublic(slug, message = '') {
  try {
    const { wishlist, items } = await getPublicWishlist(slug);
    const guestName = localStorage.getItem('wishlist_guest_name') || '';
    setAppContent(
      renderLayout(
        `
        ${card(`
          <h2>${escapeHtml(wishlist.title)}</h2>
          <p>${escapeHtml(wishlist.description || '')}</p>
          ${message ? `<p class="msg">${escapeHtml(message)}</p>` : ''}
          <form id="guest-name-form" class="row">
            <input name="guestName" value="${escapeHtml(guestName)}" placeholder="Dein Name" required />
            <button>Speichern</button>
          </form>
        `)}
        ${items
          .map(
            (item) =>
              card(`
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description || '')}</p>
                <p>Preis: ${formatCHF(item.price_chf)}</p>
                ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="item-image" />` : ''}
                <form class="contribution-form stack" data-item-id="${item.id}">
                  <select name="type">
                    <option value="take_over">Das mache ich</option>
                    <option value="amount">Betrag beitragen</option>
                    <option value="comment">Kommentar hinzufügen</option>
                  </select>
                  <input name="amount" type="number" step="0.01" min="0" placeholder="Betrag in CHF (nur Betrag)" />
                  <textarea name="comment" placeholder="Kommentar optional"></textarea>
                  <button>Beteiligen</button>
                </form>
                <details>
                  <summary>Bestehende Beteiligungen (${item.item_contributions.length})</summary>
                  <ul>
                    ${item.item_contributions
                      .map(
                        (c) =>
                          `<li>${escapeHtml(c.visitor_name)} · ${c.contribution_type}${c.amount_chf ? ` · ${formatCHF(c.amount_chf)}` : ''}${
                            c.comment ? ` · ${escapeHtml(c.comment)}` : ''
                          } · ${formatDate(c.created_at)}</li>`,
                      )
                      .join('') || '<li>Keine Beiträge</li>'}
                  </ul>
                </details>
              `),
          )
          .join('')}
      `,
        { title: 'Öffentliche Wunschliste' },
      ),
    );

    document.getElementById('guest-name-form').onsubmit = (e) => {
      e.preventDefault();
      localStorage.setItem('wishlist_guest_name', e.target.guestName.value.trim());
      renderPublic(slug, 'Name gespeichert.');
    };

    document.querySelectorAll('.contribution-form').forEach((form) => {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const visitorName = localStorage.getItem('wishlist_guest_name') || '';
        if (!visitorName) return renderPublic(slug, 'Bitte zuerst deinen Namen speichern.');
        const type = form.type.value;
        try {
          await addContribution({
            itemId: form.dataset.itemId,
            visitorName,
            contributionType: type,
            amountChf: type === 'amount' ? form.amount.value : null,
            comment: form.comment.value,
          });
          await renderPublic(slug, 'Vielen Dank für deinen Beitrag!');
        } catch (err) {
          await renderPublic(slug, err.message);
        }
      };
    });
  } catch (err) {
    setAppContent(renderLayout(card(`<h2>Fehler</h2><p>${escapeHtml(err.message)}</p>`)));
  }
}
