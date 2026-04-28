import { supabase } from './supabaseClient.js';
import { toSlug } from '../utils/slug.js';

export async function createWishlist({ title, description }) {
  const base = toSlug(title);
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ title, description, slug, is_public: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listOwnWishlists() {
  const { data, error } = await supabase.from('wishlists').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOwnerWishlist(id) {
  const { data: wishlist, error } = await supabase.from('wishlists').select('*').eq('id', id).single();
  if (error) throw error;
  const { data: items, error: itemError } = await supabase
    .from('wishlist_items')
    .select('*, item_contributions(*)')
    .eq('wishlist_id', id)
    .order('sort_order', { ascending: true });
  if (itemError) throw itemError;
  return { wishlist, items };
}

export async function getPublicWishlist(slug) {
  const { data: wishlist, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single();
  if (error) throw error;
  const { data: items, error: itemError } = await supabase
    .from('wishlist_items')
    .select('*, item_contributions(*)')
    .eq('wishlist_id', wishlist.id)
    .order('sort_order', { ascending: true });
  if (itemError) throw itemError;
  return { wishlist, items };
}

export async function saveItem(payload) {
  const dataToSave = {
    wishlist_id: payload.wishlistId,
    title: payload.title,
    description: payload.description,
    image_url: payload.imageUrl,
    price_chf: payload.priceChf || null,
    external_url: payload.externalUrl,
    sort_order: payload.sortOrder || 0,
    status: payload.status || 'active',
  };

  if (payload.id) {
    const { error } = await supabase.from('wishlist_items').update(dataToSave).eq('id', payload.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('wishlist_items').insert(dataToSave);
  if (error) throw error;
}

export async function deleteItem(id) {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw error;
}

export async function addContribution({ itemId, visitorName, contributionType, amountChf, comment }) {
  const insertPayload = {
    item_id: itemId,
    visitor_name: visitorName,
    contribution_type: contributionType,
    amount_chf: contributionType === 'amount' ? Number(amountChf) : null,
    comment: comment || null,
  };
  const { error } = await supabase.from('item_contributions').insert(insertPayload);
  if (error) throw error;
}
