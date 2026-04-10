import { supabase } from './supabaseClient.js';

const VIEW_STATE_STORAGE_KEY = 'openmouse:view-state';

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
  documents: {
    currentFolderId: null,
    folders: [],
    files: [],
    searchTerm: '',
    loading: false,
  },
};

const app = document.getElementById('app');
let documentsRequestId = 0;
let documentsLoadedWorkspaceId = null;
let documentsLoadingWorkspaceId = null;
let documentsLoadPromise = null;
let initialSessionHydrated = false;

const readStoredViewState = () => {
  try {
    const raw = window.sessionStorage.getItem(VIEW_STATE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeStoredViewState = () => {
  if (!state.session) return;

  try {
    window.sessionStorage.setItem(
      VIEW_STATE_STORAGE_KEY,
      JSON.stringify({
        route: state.route,
        activeDetailTab: state.activeDetailTab,
        currentFolderId: state.documents.currentFolderId,
      })
    );
  } catch {
    // Silent fail for non-critical UI persistence.
  }
};

const setState = (patch) => {
  Object.assign(state, patch);
  writeStoredViewState();
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

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const normalizeFileName = (name = '') =>
  name
    .trim()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '');

const updateDocumentsState = (patch) => {
  setState({
    documents: {
      ...state.documents,
      ...patch,
    },
  });
};

const loadDocuments = async (workspaceId) => {
  if (!state.user || !workspaceId) {
    updateDocumentsState({ loading: false });
    return;
  }

  if (documentsLoadPromise && documentsLoadingWorkspaceId === workspaceId) {
    return documentsLoadPromise;
  }

  const requestId = ++documentsRequestId;
  documentsLoadingWorkspaceId = workspaceId;
  updateDocumentsState({ loading: true });

  documentsLoadPromise = (async () => {
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        supabase
          .from('folders')
          .select('id, name, parent_id, created_at')
          .eq('user_id', state.user.id)
          .eq('arbeitsumgebung_id', workspaceId)
          .order('name', { ascending: true }),
        supabase
          .from('files')
          .select('id, name, file_path, folder_id, size_bytes, created_at')
          .eq('user_id', state.user.id)
          .eq('arbeitsumgebung_id', workspaceId)
          .order('name', { ascending: true }),
      ]);

      if (foldersResponse.error) throw foldersResponse.error;
      if (filesResponse.error) throw filesResponse.error;

      if (requestId !== documentsRequestId) return;

      updateDocumentsState({
        folders: foldersResponse.data ?? [],
        files: filesResponse.data ?? [],
        loading: false,
      });
      documentsLoadedWorkspaceId = workspaceId;
    } catch (error) {
      if (requestId !== documentsRequestId) return;
      updateDocumentsState({ loading: false });
      setError(error.message || 'Dokumentenablage konnte nicht geladen werden.');
    } finally {
      if (documentsLoadingWorkspaceId === workspaceId) {
        documentsLoadingWorkspaceId = null;
        documentsLoadPromise = null;
      }
    }
  })();

  return documentsLoadPromise;
};

const resetDocumentsForWorkspace = () => {
  documentsLoadedWorkspaceId = null;
  documentsLoadingWorkspaceId = null;
  documentsLoadPromise = null;
  setState({
    documents: {
      currentFolderId: null,
      folders: [],
      files: [],
      searchTerm: '',
      loading: false,
    },
  });
};

const buildBreadcrumbs = () => {
  const folderMap = new Map(state.documents.folders.map((folder) => [folder.id, folder]));
  const branch = [];
  let current = state.documents.currentFolderId ? folderMap.get(state.documents.currentFolderId) : null;

  while (current) {
    branch.push({ id: current.id, name: current.name });
    current = current.parent_id ? folderMap.get(current.parent_id) : null;
  }

  return [{ id: null, name: 'Start' }, ...branch.reverse()];
};

const getFilteredDocumentItems = () => {
  const query = state.documents.searchTerm.trim().toLowerCase();
  const visibleFolders = state.documents.folders.filter((folder) => {
    const inCurrentFolder = folder.parent_id === state.documents.currentFolderId;
    if (!query) return inCurrentFolder;
    return inCurrentFolder && folder.name.toLowerCase().includes(query);
  });

  const visibleFiles = state.documents.files.filter((file) => {
    const inCurrentFolder = file.folder_id === state.documents.currentFolderId;
    if (!query) return inCurrentFolder;
    return inCurrentFolder && file.name.toLowerCase().includes(query);
  });

  return { visibleFolders, visibleFiles };
};

const handleDocumentsTabEnter = async (options = {}) => {
  const { force = false } = options;
  if (state.route.name !== 'detail') return;
  if (state.documents.loading) return;
  if (!force && documentsLoadedWorkspaceId === state.route.id) return;
  await loadDocuments(state.route.id);
};

const handleCreateFolder = async () => {
  const name = window.prompt('Ordnername eingeben:')?.trim();
  if (!name) return;

  try {
    const payload = {
      name,
      parent_id: state.documents.currentFolderId,
      user_id: state.user.id,
      arbeitsumgebung_id: state.route.id,
    };

    const { error } = await supabase.from('folders').insert(payload);
    if (error) throw error;
    await loadDocuments(state.route.id);
    setMessage('Ordner wurde erstellt.');
  } catch (error) {
    setError(error.message || 'Ordner konnte nicht erstellt werden.');
  }
};

const handleUploadFile = async (event) => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;

  const safeName = normalizeFileName(file.name);
  if (!safeName) {
    setError('Dateiname ist ungültig.');
    event.currentTarget.value = '';
    return;
  }

  const folderSegment = state.documents.currentFolderId ?? 'root';
  const filePath = `${state.user.id}/${state.route.id}/${folderSegment}/${Date.now()}_${safeName}`;

  setLoading(true);
  try {
    const uploadResult = await supabase.storage.from('documents').upload(filePath, file, { upsert: false });
    if (uploadResult.error) throw uploadResult.error;

    const payload = {
      name: file.name,
      file_path: filePath,
      folder_id: state.documents.currentFolderId,
      user_id: state.user.id,
      arbeitsumgebung_id: state.route.id,
      size_bytes: file.size,
    };

    const { error } = await supabase.from('files').insert(payload);
    if (error) throw error;

    await loadDocuments(state.route.id);
    setMessage('Datei wurde hochgeladen.');
  } catch (error) {
    setError(error.message || 'Datei konnte nicht hochgeladen werden.');
  } finally {
    setLoading(false);
    event.currentTarget.value = '';
  }
};

const handleOpenFile = async (fileId) => {
  const file = state.documents.files.find((item) => item.id === fileId);
  if (!file) return;

  try {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(file.file_path, 60);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Datei konnte nicht geöffnet werden.');

    const previewWindow = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    if (!previewWindow) {
      throw new Error('Pop-up wurde blockiert. Bitte Pop-ups für diese Seite erlauben.');
    }
  } catch (error) {
    setError(error.message || 'Datei konnte nicht geöffnet werden.');
  }
};

const handleDownloadFile = async (fileId) => {
  const file = state.documents.files.find((item) => item.id === fileId);
  if (!file) return;

  try {
    const { data, error } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(file.file_path, 60, { download: file.name });
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Datei konnte nicht heruntergeladen werden.');

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = file.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.append(link);
    link.click();
    link.remove();
  } catch (error) {
    setError(error.message || 'Datei konnte nicht heruntergeladen werden.');
  }
};

const handleRenameFolder = async (folderId) => {
  const folder = state.documents.folders.find((item) => item.id === folderId);
  if (!folder) return;

  const name = window.prompt('Neuer Ordnername:', folder.name)?.trim();
  if (!name || name === folder.name) return;

  try {
    const { error } = await supabase.from('folders').update({ name }).eq('id', folderId).eq('user_id', state.user.id);
    if (error) throw error;
    await loadDocuments(state.route.id);
    setMessage('Ordner wurde umbenannt.');
  } catch (error) {
    setError(error.message || 'Ordner konnte nicht umbenannt werden.');
  }
};

const handleRenameFile = async (fileId) => {
  const file = state.documents.files.find((item) => item.id === fileId);
  if (!file) return;

  const name = window.prompt('Neuer Dateiname:', file.name)?.trim();
  if (!name || name === file.name) return;

  try {
    const { error } = await supabase.from('files').update({ name }).eq('id', fileId).eq('user_id', state.user.id);
    if (error) throw error;
    await loadDocuments(state.route.id);
    setMessage('Datei wurde umbenannt.');
  } catch (error) {
    setError(error.message || 'Datei konnte nicht umbenannt werden.');
  }
};

const handleDeleteFile = async (fileId) => {
  const file = state.documents.files.find((item) => item.id === fileId);
  if (!file) return;
  const confirmed = window.confirm(`Datei „${file.name}“ wirklich löschen?`);
  if (!confirmed) return;

  try {
    const removeResult = await supabase.storage.from('documents').remove([file.file_path]);
    if (removeResult.error) throw removeResult.error;

    const { error } = await supabase.from('files').delete().eq('id', fileId).eq('user_id', state.user.id);
    if (error) throw error;
    await loadDocuments(state.route.id);
    setMessage('Datei wurde gelöscht.');
  } catch (error) {
    setError(error.message || 'Datei konnte nicht gelöscht werden.');
  }
};

const getDescendantFolderIds = (folderId) => {
  const childrenMap = new Map();
  state.documents.folders.forEach((folder) => {
    const key = folder.parent_id ?? 'root';
    const entries = childrenMap.get(key) ?? [];
    entries.push(folder.id);
    childrenMap.set(key, entries);
  });

  const stack = [folderId];
  const descendants = [];

  while (stack.length) {
    const currentId = stack.pop();
    descendants.push(currentId);
    const children = childrenMap.get(currentId) ?? [];
    children.forEach((childId) => stack.push(childId));
  }

  return descendants;
};

const handleDeleteFolder = async (folderId) => {
  const folder = state.documents.folders.find((item) => item.id === folderId);
  if (!folder) return;
  const confirmed = window.confirm(`Ordner „${folder.name}“ inklusive Inhalt wirklich löschen?`);
  if (!confirmed) return;

  try {
    const folderIds = getDescendantFolderIds(folderId);
    const filesToDelete = state.documents.files.filter((file) => folderIds.includes(file.folder_id));
    const filePaths = filesToDelete.map((file) => file.file_path);

    if (filePaths.length) {
      const storageResult = await supabase.storage.from('documents').remove(filePaths);
      if (storageResult.error) throw storageResult.error;
    }

    const { error } = await supabase.from('folders').delete().in('id', folderIds).eq('user_id', state.user.id);
    if (error) throw error;

    if (state.documents.currentFolderId && folderIds.includes(state.documents.currentFolderId)) {
      updateDocumentsState({ currentFolderId: folder.parent_id ?? null });
    }

    await loadDocuments(state.route.id);
    setMessage('Ordner wurde gelöscht.');
  } catch (error) {
    setError(error.message || 'Ordner konnte nicht gelöscht werden.');
  }
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
  const isChangingDetailWorkspace =
    route.name === 'detail' && (state.route.name !== 'detail' || state.route.id !== route.id);

  if (isChangingDetailWorkspace) {
    resetDocumentsForWorkspace();
  }

  setState({
    route,
    error: null,
    message: null,
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
    button.addEventListener('click', async () => {
      navigate({ name: 'detail', id: button.dataset.openDetail });
      if (state.activeDetailTab === 'dokumentenablage') {
        await handleDocumentsTabEnter();
      }
    });
  });

  const detailTabs = app.querySelectorAll('[data-detail-tab]');
  detailTabs.forEach((button) => {
    button.addEventListener('click', async () => {
      const nextTab = button.dataset.detailTab;
      const isSameTab = state.activeDetailTab === nextTab;
      if (!isSameTab) {
        setState({ activeDetailTab: nextTab });
      }
      if (nextTab === 'dokumentenablage') {
        await handleDocumentsTabEnter();
      }
    });
  });

  const createFolderButton = app.querySelector('#documents-create-folder');
  if (createFolderButton) createFolderButton.addEventListener('click', handleCreateFolder);

  const uploadInput = app.querySelector('#documents-upload-input');
  if (uploadInput) uploadInput.addEventListener('change', handleUploadFile);

  const searchInput = app.querySelector('#documents-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      updateDocumentsState({ searchTerm: event.currentTarget.value });
    });
  }

  app.querySelectorAll('[data-open-folder]').forEach((el) => {
    el.addEventListener('click', () => {
      updateDocumentsState({ currentFolderId: el.dataset.openFolder === 'root' ? null : el.dataset.openFolder });
    });
  });

  app.querySelectorAll('[data-open-file]').forEach((el) => {
    el.addEventListener('click', () => handleOpenFile(el.dataset.openFile));
  });

  app.querySelectorAll('[data-download-file]').forEach((el) => {
    el.addEventListener('click', () => handleDownloadFile(el.dataset.downloadFile));
  });

  app.querySelectorAll('[data-rename-folder]').forEach((el) => {
    el.addEventListener('click', () => handleRenameFolder(el.dataset.renameFolder));
  });

  app.querySelectorAll('[data-delete-folder]').forEach((el) => {
    el.addEventListener('click', () => handleDeleteFolder(el.dataset.deleteFolder));
  });

  app.querySelectorAll('[data-rename-file]').forEach((el) => {
    el.addEventListener('click', () => handleRenameFile(el.dataset.renameFile));
  });

  app.querySelectorAll('[data-delete-file]').forEach((el) => {
    el.addEventListener('click', () => handleDeleteFile(el.dataset.deleteFile));
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

  const renderDocumentsPanel = () => {
    const breadcrumbs = buildBreadcrumbs()
      .map(
        (item) =>
          `<button class="breadcrumb-item" data-open-folder="${item.id ?? 'root'}">${escapeHtml(item.name)}</button>`
      )
      .join('<span class="breadcrumb-sep">/</span>');
    const { visibleFolders, visibleFiles } = getFilteredDocumentItems();

    const folderRows = visibleFolders
      .map(
        (folder) => `
          <article class="doc-item">
            <button class="doc-open-button" data-open-folder="${folder.id}">
              <i class="fa-solid fa-folder"></i>
              <div>
                <strong>${escapeHtml(folder.name)}</strong>
                <small>${escapeHtml(formatDate(folder.created_at))}</small>
              </div>
            </button>
            <div class="doc-item-actions">
              <button class="button-secondary" data-rename-folder="${folder.id}"><i class="fa-solid fa-pen"></i></button>
              <button class="button-secondary" data-delete-folder="${folder.id}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </article>
        `
      )
      .join('');

    const fileRows = visibleFiles
      .map(
        (file) => `
          <article class="doc-item">
            <button class="doc-open-button" data-open-file="${file.id}">
              <i class="fa-solid fa-file"></i>
              <div>
                <strong>${escapeHtml(file.name)}</strong>
                <small>${escapeHtml(formatDate(file.created_at))} · ${escapeHtml(formatFileSize(file.size_bytes))}</small>
              </div>
            </button>
            <div class="doc-item-actions">
              <button class="button-secondary" data-rename-file="${file.id}"><i class="fa-solid fa-pen"></i></button>
              <button class="button-secondary" data-download-file="${file.id}"><i class="fa-solid fa-download"></i></button>
              <button class="button-secondary" data-delete-file="${file.id}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </article>
        `
      )
      .join('');

    const hasItems = visibleFolders.length > 0 || visibleFiles.length > 0;

    return `
      <section class="tab-panel ${state.activeDetailTab === 'dokumentenablage' ? 'active' : ''}">
        <div class="detail-section documents-section">
          <div class="documents-toolbar">
            <h3><i class="fa-solid fa-folder-open"></i> Dokumentenablage</h3>
            <div class="toolbar-actions">
              <button id="documents-create-folder"><i class="fa-solid fa-folder-plus"></i> Ordner erstellen</button>
              <label class="upload-label">
                <i class="fa-solid fa-upload"></i> Datei hochladen
                <input id="documents-upload-input" type="file" />
              </label>
            </div>
          </div>
          <div class="documents-controls">
            <div class="breadcrumbs">${breadcrumbs}</div>
            <input id="documents-search" type="search" placeholder="Suche nach Ordnern und Dateien…" value="${escapeHtml(state.documents.searchTerm)}" />
          </div>
          ${
            state.documents.loading
              ? '<p class="subtitle">Dokumentenablage lädt…</p>'
              : hasItems
                ? `<div class="documents-list">${folderRows}${fileRows}</div>`
                : '<div class="empty-state"><p>Keine Ordner oder Dateien im aktuellen Bereich.</p></div>'
          }
        </div>
      </section>
    `;
  };

  const tabPanels = detailTabs
    .map((tab) => {
      if (tab.id === 'dokumentenablage') {
        return renderDocumentsPanel();
      }
      return `
        <section class="tab-panel ${state.activeDetailTab === tab.id ? 'active' : ''}">
          <div class="detail-section">
            <h3><i class="fa-solid ${tab.icon}"></i> ${tab.label}</h3>
            <p>Dieser Bereich für „${tab.label}“ ist bereit.</p>
          </div>
        </section>
      `;
    })
    .join('');

  return `
    <section class="card">
      <div class="toolbar">
        <h2>Arbeitsumgebung</h2>
        <button class="button-secondary" data-back-to-list><i class="fa-solid fa-arrow-left"></i> Zurück</button>
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
  const storedViewState = readStoredViewState();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const restoredRoute =
      storedViewState?.route?.name === 'detail' || storedViewState?.route?.name === 'create'
        ? storedViewState.route
        : { name: 'list' };
    const restoredTab = typeof storedViewState?.activeDetailTab === 'string'
      ? storedViewState.activeDetailTab
      : 'neuigkeiten';
    const restoredFolder = storedViewState?.currentFolderId ?? null;

    setState({
      session,
      user: session.user,
      route: restoredRoute,
      activeDetailTab: restoredTab,
      documents: {
        ...state.documents,
        currentFolderId: restoredFolder,
      },
    });
    await loadAppData();
    if (restoredRoute.name === 'detail' && restoredTab === 'dokumentenablage') {
      await handleDocumentsTabEnter();
    }
    initialSessionHydrated = true;
  } else {
    render();
    initialSessionHydrated = true;
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION' && initialSessionHydrated) {
      return;
    }

    if (session) {
      const shouldResetRoute = !state.session && event === 'SIGNED_IN';
      setState({
        session,
        user: session.user,
        route: shouldResetRoute ? { name: 'list' } : state.route,
      });
      await ensureProfileExists(session.user.id);
      await loadAppData();
      initialSessionHydrated = true;
    } else {
      documentsLoadedWorkspaceId = null;
      documentsLoadingWorkspaceId = null;
      documentsLoadPromise = null;
      setState({
        session: null,
        user: null,
        profile: null,
        arbeitsumgebungen: [],
        route: { name: 'list' },
        pendingOtpEmail: '',
        otpStep: 'request',
        activeDetailTab: 'neuigkeiten',
        documents: {
          currentFolderId: null,
          folders: [],
          files: [],
          searchTerm: '',
          loading: false,
        },
      });
      try {
        window.sessionStorage.removeItem(VIEW_STATE_STORAGE_KEY);
      } catch {
        // Silent fail for non-critical UI persistence.
      }
      initialSessionHydrated = true;
    }
  });

};

init();
