import { supabase } from './supabaseClient.js';

const state = {
  session: null,
  user: null,
  profile: null,
  arbeitsumgebungen: [],
  activeAuthTab: 'anmelden',
  loading: false,
  message: null,
  error: null,
  route: { name: 'list' },
  pendingOtpEmail: '',
  otpStep: 'request',
  activeDetailTab: 'neuigkeiten',
};

const app = document.getElementById('app');

const setState = (patch) => {
  Object.assign(state, patch);
  render();
};

const setLoading = (loading) => setState({ loading });
const setError = (error) => setState({ error, message: null });
const setMessage = (message) => setState({ message, error: null });

const escapeHtml = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hasActiveSubscription = (profile) =>
  profile?.has_subscription === true || profile?.has_susrcription === true;

const formatDate = (raw) => {
  if (!raw) return '–';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const fetchProfile = async () => {
  if (!state.user) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', state.user.id)
    .maybeSingle();

  if (error) {
    setError('Profil konnte nicht geladen werden. Bitte prüfe die Tabelle „profiles“.');
    return;
  }

  if (!data) {
    await ensureProfileExists(state.user.id);
    const { data: createdProfile, error: createdProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .maybeSingle();

    if (createdProfileError) {
      setError('Profil konnte nicht erstellt werden.');
      return;
    }

    console.log('PROFILE:', createdProfile);
    setState({ profile: createdProfile });
    return;
  }

  console.log('PROFILE:', data);
  setState({ profile: data });
};

const fetchArbeitsumgebungen = async () => {
  if (!state.user) return;

  const { data, error } = await supabase
    .from('arbeitsumgebungen')
    .select('id, projektname, kommissionsnummer, created_at')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    setError('Arbeitsumgebungen konnten nicht geladen werden. Bitte prüfe Tabellen und Policies.');
    return;
  }

  setState({ arbeitsumgebungen: data ?? [] });
};

const loadAppData = async () => {
  setLoading(true);
  try {
    await fetchProfile();
    await fetchArbeitsumgebungen();
  } finally {
    setLoading(false);
  }
};

const ensureProfileExists = async (userId) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' });

  if (error) {
    setError('Profil konnte nicht vorbereitet werden.');
  }
};

const handleRegister = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!isEmailValid(email)) {
    setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    return;
  }

  if (password.length < 8) {
    setError('Das Passwort muss mindestens 8 Zeichen haben.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user?.id) {
      await ensureProfileExists(data.user.id);
    }

    setMessage('Registrierung erfolgreich. Prüfe ggf. dein E-Mail-Postfach zur Bestätigung.');
    setState({ activeAuthTab: 'anmelden' });
  } catch (error) {
    setError(error.message || 'Registrierung fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!isEmailValid(email)) {
    setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    return;
  }

  if (!password) {
    setError('Bitte gib dein Passwort ein.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setMessage('Erfolgreich angemeldet.');
  } catch (error) {
    setError(error.message || 'Anmeldung fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
};

const handleOtpRequest = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get('email') || '').trim();

  if (!isEmailValid(email)) {
    setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) throw error;
    setState({ pendingOtpEmail: email, otpStep: 'verify' });
    setMessage('Code wurde gesendet. Bitte gib ihn im nächsten Schritt ein.');
  } catch (error) {
    setError(error.message || 'OTP-Code konnte nicht angefordert werden.');
  } finally {
    setLoading(false);
  }
};

const handleOtpVerify = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get('email') || state.pendingOtpEmail).trim();
  const token = String(formData.get('token') || '').trim();

  if (!isEmailValid(email)) {
    setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    return;
  }

  if (!token) {
    setError('Bitte gib den erhaltenen Code ein.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
    setMessage('Code bestätigt. Du bist jetzt angemeldet.');
    setState({ otpStep: 'request' });
  } catch (error) {
    setError(error.message || 'Code konnte nicht verifiziert werden.');
  } finally {
    setLoading(false);
  }
};

const handleLogout = async () => {
  setLoading(true);
  try {
    await supabase.auth.signOut();
  } finally {
    setLoading(false);
  }
};

const handleCreateArbeitsumgebung = async (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const projektname = String(formData.get('projektname') || '').trim();
  const kommissionsnummer = String(formData.get('kommissionsnummer') || '').trim();

  if (!projektname) {
    setError('Projektname ist ein Pflichtfeld.');
    return;
  }

  if (!kommissionsnummer) {
    setError('Kommissionsnummer ist ein Pflichtfeld.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const payload = {
      user_id: state.user.id,
      projektname,
      kommissionsnummer,
    };

    const { data, error } = await supabase
      .from('arbeitsumgebungen')
      .insert(payload)
      .select('id, projektname, kommissionsnummer, created_at')
      .single();

    if (error) throw error;

    setState({
      route: { name: 'detail', id: data.id },
      arbeitsumgebungen: [data, ...state.arbeitsumgebungen],
    });
    setMessage('Arbeitsumgebung wurde erstellt.');
  } catch (error) {
    setError(error.message || 'Arbeitsumgebung konnte nicht erstellt werden.');
  } finally {
    setLoading(false);
  }
};

const setAuthTab = (tab) => {
  setState({
    activeAuthTab: tab,
    error: null,
    message: null,
    otpStep: tab === 'otp' ? state.otpStep : 'request',
  });
};

const navigate = (route) => {
  setState({
    route,
    error: null,
    message: null,
    activeDetailTab: route.name === 'detail' ? state.activeDetailTab : 'neuigkeiten',
  });
};

const bindEvents = () => {
  app.querySelectorAll('[data-auth-tab]').forEach((el) => {
    el.addEventListener('click', () => setAuthTab(el.dataset.authTab));
  });

  const loginForm = app.querySelector('#form-login');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = app.querySelector('#form-register');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  const otpRequestForm = app.querySelector('#form-otp-request');
  if (otpRequestForm) otpRequestForm.addEventListener('submit', handleOtpRequest);

  const otpVerifyForm = app.querySelector('#form-otp-verify');
  if (otpVerifyForm) otpVerifyForm.addEventListener('submit', handleOtpVerify);

  const logoutButton = app.querySelector('#logout-button');
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);

  const toCreateButton = app.querySelector('#create-view-button');
  if (toCreateButton) toCreateButton.addEventListener('click', () => navigate({ name: 'create' }));

  const backToListButtons = app.querySelectorAll('[data-back-to-list]');
  backToListButtons.forEach((button) => {
    button.addEventListener('click', () => navigate({ name: 'list' }));
  });

  const createForm = app.querySelector('#form-create-arbeitsumgebung');
  if (createForm) createForm.addEventListener('submit', handleCreateArbeitsumgebung);

  const detailLinks = app.querySelectorAll('[data-open-detail]');
  detailLinks.forEach((button) => {
    button.addEventListener('click', () => {
      navigate({ name: 'detail', id: button.dataset.openDetail });
    });
  });

  const detailTabs = app.querySelectorAll('[data-detail-tab]');
  detailTabs.forEach((button) => {
    button.addEventListener('click', () => {
      setState({ activeDetailTab: button.dataset.detailTab });
    });
  });
};

const renderAlerts = () => {
  const items = [];
  if (state.error) {
    items.push(`<div class="alert alert-error">${escapeHtml(state.error)}</div>`);
  }
  if (state.message) {
    items.push(`<div class="alert alert-success">${escapeHtml(state.message)}</div>`);
  }
  return items.join('');
};

const renderAuth = () => {
  const isLogin = state.activeAuthTab === 'anmelden';
  const isRegister = state.activeAuthTab === 'registrieren';
  const isOtp = state.activeAuthTab === 'otp';

  const isOtpStepRequest = state.otpStep === 'request';

  return `
    <main class="card auth-card">
      <h1>Arbeitsumgebungen</h1>
      <p class="subtitle">Bitte melde dich an, registriere dich oder nutze den Code-Login.</p>

      <div class="tabs" role="tablist" aria-label="Authentifizierung">
        <button class="tab ${isLogin ? 'active' : ''}" data-auth-tab="anmelden">Anmelden</button>
        <button class="tab ${isRegister ? 'active' : ''}" data-auth-tab="registrieren">Registrieren</button>
        <button class="tab ${isOtp ? 'active' : ''}" data-auth-tab="otp">Passwort vergessen</button>
      </div>

      ${renderAlerts()}

      <section class="tab-panel ${isLogin ? 'active' : ''}">
        <form id="form-login" class="form">
          <label>E-Mail
            <input type="email" name="email" required autocomplete="email" />
          </label>
          <label>Passwort
            <input type="password" name="password" required autocomplete="current-password" />
          </label>
          <button type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Lädt…' : 'Anmelden'}</button>
        </form>
      </section>

      <section class="tab-panel ${isRegister ? 'active' : ''}">
        <form id="form-register" class="form">
          <label>E-Mail
            <input type="email" name="email" required autocomplete="email" />
          </label>
          <label>Passwort
            <input type="password" name="password" minlength="8" required autocomplete="new-password" />
          </label>
          <button type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Lädt…' : 'Registrieren'}</button>
        </form>
      </section>

      <section class="tab-panel ${isOtp ? 'active' : ''}">
        ${
          isOtpStepRequest
            ? `<form id="form-otp-request" class="form form-wide">
                <h2>Code senden</h2>
                <label>E-Mail
                  <input type="email" name="email" value="${escapeHtml(state.pendingOtpEmail)}" required autocomplete="email" />
                </label>
                <button type="submit" ${state.loading ? 'disabled' : ''}>Code senden</button>
              </form>`
            : `<form id="form-otp-verify" class="form form-wide">
                <h2>Code eingeben</h2>
                <p class="subtitle">Code wurde gesendet an: <strong>${escapeHtml(state.pendingOtpEmail)}</strong></p>
                <input type="hidden" name="email" value="${escapeHtml(state.pendingOtpEmail)}" />
                <label>Code
                  <input type="text" name="token" required inputmode="numeric" />
                </label>
                <button type="submit" ${state.loading ? 'disabled' : ''}>Einloggen</button>
              </form>`
        }
      </section>
    </main>
  `;
};

const renderList = () => {
  const rows = state.arbeitsumgebungen
    .map(
      (item) => `
      <button class="workspace-item" data-open-detail="${item.id}">
        <div>
          <strong>${escapeHtml(item.projektname)}</strong>
          <span>${escapeHtml(item.kommissionsnummer)}</span>
        </div>
        <small>${escapeHtml(formatDate(item.created_at))}</small>
      </button>
    `
    )
    .join('');

  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>Arbeitsumgebungen</h2>
          <p class="subtitle">Verwaltung deiner Projekte.</p>
        </div>
        <div class="toolbar-actions">
          <button id="create-view-button"><i class="fa-solid fa-plus"></i> Arbeitsumgebung erstellen</button>
          <button id="logout-button" class="button-secondary"><i class="fa-solid fa-right-from-bracket"></i> Abmelden</button>
        </div>
      </div>
      ${renderAlerts()}
      <div class="subscription-note ${hasActiveSubscription(state.profile) ? 'ok' : 'warn'}">
        Abo-Status: ${hasActiveSubscription(state.profile) ? 'Aktiv' : 'Nicht aktiv'}
      </div>

      ${
        state.arbeitsumgebungen.length
          ? `<div class="workspace-list">${rows}</div>`
          : `<div class="empty-state">
              <p>Du hast noch keine Arbeitsumgebungen.</p>
              <button id="create-view-button"><i class="fa-solid fa-plus"></i> Arbeitsumgebung erstellen</button>
            </div>`
      }
    </section>
  `;
};

const renderCreate = () => `
  <section class="card">
      <div class="toolbar">
        <h2>Arbeitsumgebung erstellen</h2>
      <button class="button-secondary" data-back-to-list><i class="fa-solid fa-arrow-left"></i> Zurück</button>
    </div>
    ${renderAlerts()}
    <form id="form-create-arbeitsumgebung" class="form form-wide">
      <label>Projektname
        <input type="text" name="projektname" required />
      </label>
      <label>Kommissionsnummer
        <input type="text" name="kommissionsnummer" required />
      </label>
      <button type="submit" ${state.loading ? 'disabled' : ''}><i class="fa-solid fa-check"></i> Arbeitsumgebung erstellen</button>
    </form>
  </section>
`;

const renderDetail = () => {
  const workspace = state.arbeitsumgebungen.find((item) => item.id === state.route.id);

  if (!workspace) {
    return `
      <section class="card">
        <div class="toolbar">
          <h2>Detailansicht</h2>
          <button class="button-secondary" data-back-to-list><i class="fa-solid fa-arrow-left"></i> Zurück</button>
        </div>
        <p>Arbeitsumgebung wurde nicht gefunden.</p>
      </section>
    `;
  }

  const detailTabs = [
    { id: 'neuigkeiten', label: 'Neuigkeiten', icon: 'fa-newspaper' },
    { id: 'dokumentenablage', label: 'Dokumentenablage', icon: 'fa-folder-open' },
    { id: 'aktuelle-arbeit', label: 'Aktuelle Arbeit', icon: 'fa-hammer' },
    { id: 'dispo', label: 'Dispo', icon: 'fa-calendar-days' },
    { id: 'baujournal', label: 'Baujournal', icon: 'fa-book-open' },
    { id: 'team', label: 'Team', icon: 'fa-users' },
  ];

  const tabButtons = detailTabs
    .map(
      (tab) => `
        <button class="tab ${state.activeDetailTab === tab.id ? 'active' : ''}" data-detail-tab="${tab.id}">
          <i class="fa-solid ${tab.icon}"></i> ${tab.label}
        </button>
      `
    )
    .join('');

  const tabPanels = detailTabs
    .map(
      (tab) => `
        <section class="tab-panel ${state.activeDetailTab === tab.id ? 'active' : ''}">
          <div class="detail-section">
            <h3><i class="fa-solid ${tab.icon}"></i> ${tab.label}</h3>
            <p>Dieser Bereich für „${tab.label}“ ist bereit.</p>
          </div>
        </section>
      `
    )
    .join('');

  return `
    <section class="card">
      <div class="toolbar">
        <h2>Arbeitsumgebung</h2>
        <button class="button-secondary" data-back-to-list><i class="fa-solid fa-arrow-left"></i> Zurück</button>
      </div>
      <div class="detail-grid">
        <div>
          <span>Projektname</span>
          <strong>${escapeHtml(workspace.projektname)}</strong>
        </div>
        <div>
          <span>Kommissionsnummer</span>
          <strong>${escapeHtml(workspace.kommissionsnummer)}</strong>
        </div>
        <div>
          <span>Erstellungsdatum</span>
          <strong>${escapeHtml(formatDate(workspace.created_at))}</strong>
        </div>
      </div>
      <div class="tabs detail-tabs" role="tablist" aria-label="Arbeitsumgebung-Bereiche">
        ${tabButtons}
      </div>
      ${tabPanels}
    </section>
  `;
};

const renderApp = () => {
  const sections = [];
  sections.push(`
    <header class="app-header">
      <h1>Arbeitsumgebungen</h1>
    </header>
  `);

  if (state.route.name === 'create') {
    sections.push(renderCreate());
  } else if (state.route.name === 'detail') {
    sections.push(renderDetail());
  } else {
    sections.push(renderList());
  }

  return `<main class="app-main">${sections.join('')}</main>`;
};

const render = () => {
  app.innerHTML = state.session ? renderApp() : renderAuth();
  bindEvents();
};

const init = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    setState({ session, user: session.user });
    await loadAppData();
  } else {
    render();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      setState({ session, user: session.user, route: { name: 'list' } });
      await ensureProfileExists(session.user.id);
      await loadAppData();
    } else {
      setState({
        session: null,
        user: null,
        profile: null,
        arbeitsumgebungen: [],
        route: { name: 'list' },
        pendingOtpEmail: '',
        otpStep: 'request',
        activeDetailTab: 'neuigkeiten',
      });
    }
  });
};

init();
