// src/lib/auth-service.ts

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const getSupabase = () => createBrowserClient(supabaseUrl, supabaseKey);

export type UserRole = "admin" | "manager" | "staff" | "titolare";

export interface UserProfile {
  id: string;
  restaurant_id: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
}

export interface RegisterAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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

// === REGISTRAZIONE ADMIN ===

export const checkAdminExists = async (): Promise<boolean> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("check_admin_exists");
  if (error) throw error;
  return data;
};

export const registerAdmin = async (data: RegisterAdminData) => {
  const supabase = getSupabase();

  const exists = await checkAdminExists();
  if (exists) {
    throw new Error("Un admin esiste già.");
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        role: "admin",
        first_name: data.firstName,
        last_name: data.lastName,
      },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Registrazione fallita");

  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .insert({ name: "Il Mio Ristorante", status: "open" })
    .select("id")
    .single();

  if (restError) throw new Error("Errore creazione ristorante");

  await supabase
    .from("profiles")
    .update({ restaurant_id: restaurant.id })
    .eq("id", authData.user.id);

  return authData;
};

// === REGISTRAZIONE STAFF ===

export interface RegisterStaffData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  secretCode: string;
}

export const registerStaff = async (data: RegisterStaffData) => {
  const supabase = getSupabase();

  // 1. PRIMA valida il codice (senza consumarlo) — se non valido, blocca subito
  //    senza creare nessun account in auth.users
  const { data: validateResult, error: validateError } = await supabase
    .rpc("validate_staff_invite_code", {
      p_code: data.secretCode.toUpperCase(),
    });

  if (validateError) throw new Error("Errore nella verifica del codice invito.");

  const validation = validateResult as { success: boolean; error?: string; restaurant_id?: string };
  if (!validation.success) throw new Error(validation.error ?? "Codice invito non valido.");

  // 2. Codice valido → ora crea l'account auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        role: "staff",
        first_name: data.firstName,
        last_name: data.lastName,
      },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Registrazione fallita.");

  // Supabase con email confirmation disabilitata restituisce l'utente normalmente.
  // Con email confirmation abilitata, identities è vuoto se l'email esiste già.
  if (authData.user.identities && authData.user.identities.length === 0) {
    throw new Error("Questa email è già registrata.");
  }

  // 3. Crea il profilo PRIMA di consumare il codice
  //    (used_by ha FK su profiles.id, non su auth.users.id)
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id:            authData.user.id,
      restaurant_id: validation.restaurant_id,
      role:          "staff",
      first_name:    data.firstName,
      last_name:     data.lastName,
      email:         data.email,
    });

  if (profileError) throw new Error("Errore nella creazione del profilo: " + profileError.message);

  // 4. Ora consuma il codice atomicamente (il profilo esiste già → FK soddisfatta)
  const { data: inviteResult, error: rpcError } = await supabase
    .rpc("use_staff_invite_code", {
      p_code:    data.secretCode.toUpperCase(),
      p_user_id: authData.user.id,
    });

  if (rpcError) throw new Error("Errore nella verifica del codice invito.");

  const result = inviteResult as { success: boolean; error?: string; restaurant_id?: string };
  if (!result.success) throw new Error(result.error ?? "Codice invito non valido.");

  return authData;
};

// === REGISTRAZIONE TITOLARE ===

export interface RegisterTitolareData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  restaurantName: string;
}

export const registerTitolare = async (data: RegisterTitolareData) => {
  const supabase = getSupabase();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        role: "titolare",
        first_name: data.firstName,
        last_name: data.lastName,
      },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Registrazione fallita");

  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .insert({ name: data.restaurantName, status: "open" })
    .select("id")
    .single();

  if (restError) throw new Error("Errore creazione ristorante");

  await supabase
    .from("profiles")
    .update({ restaurant_id: restaurant.id })
    .eq("id", authData.user.id);

  return authData;
};