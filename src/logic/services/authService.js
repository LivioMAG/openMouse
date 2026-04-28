import { getSupabaseClient } from './supabaseClient.js';

export const getSession = async () => {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session;
};

export const signIn = async (email, password) => {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data?.session || null;
};

export const signUpAndSignIn = async (email, password) => {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) throw error;

  if (data?.session) {
    return;
  }

  await signIn(email, password);
};

export const signOut = async () => {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
};
