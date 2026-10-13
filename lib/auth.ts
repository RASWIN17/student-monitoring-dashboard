import { createClient } from './supabase/server';
import { UserProfile } from './types';
import { getUserByAuthId, getUserByEmail, updateUserAuthId } from './db';

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Look up application profile by Supabase Auth user ID
    let profile = await getUserByAuthId(user.id);

    // If not found by Auth ID, attempt linking by verified email
    if (!profile && user.email) {
      const existing = await getUserByEmail(user.email);
      if (existing) {
        profile = await updateUserAuthId(existing.id, user.id);
      }
    }

    return profile;
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
