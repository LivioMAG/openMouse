export function renderLayout(content, { title = 'openMouse Wishlist', actions = '' } = {}) {
  return `
  <main class="container">
    <header class="topbar">
      <h1>${title}</h1>
      <div class="actions">${actions}</div>
    </header>
    ${content}
  </main>`;
}

export function card(inner) {
  return `<section class="card">${inner}</section>`;
}

export function escapeHtml(v = '') {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
