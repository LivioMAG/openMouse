const readJsonConfig = async (relativePath, expectedKeys = []) => {
  const url = new URL(relativePath, import.meta.url);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Konfigurationsdatei konnte nicht geladen werden: ${url.pathname}`);
  }

  const json = await response.json();

  for (const key of expectedKeys) {
    if (!json[key]) {
      throw new Error(`Konfigurationswert fehlt (${key}) in ${url.pathname}`);
    }
  }

  return json;
};

export const loadSupabaseConfig = () =>
  readJsonConfig('../config/supabase.json', ['url', 'anonKey']);

export const loadWebhooksConfig = () => readJsonConfig('../config/webhooks.json');

export const loadAppConfig = () => readJsonConfig('../config/app.json');
