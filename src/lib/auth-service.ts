// src/lib/auth-service.ts

import { supabase as sharedSupabase } from "@/lib/supabase";

const getSupabase = () => sharedSupabase;

export type UserRole = "admin" | "manager" | "staff" | "titolare" | "cameriere" | "cucina";

export interface UserProfile {
  id: string;
  restaurant_id: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
}

// === AUTH ===

export const signInWithPassword = async (email: string, password: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const signOut = async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// === PROFILE ===

export const getUserProfile = async (): Promise<UserProfile> => {
  const supabase = getSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Utente non autenticato");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, restaurant_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) throw new Error("Profilo non trovato");

  return {
    ...profile,
    role: (profile.role as UserRole) || "staff",
  };
};

export const hasValidShiftToday = async (): Promise<boolean> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("has_valid_shift_today");
  if (error) return false;
  return data === true;
};
