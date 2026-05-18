"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

async function getPublicOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (siteUrl?.startsWith("http://") || siteUrl?.startsWith("https://")) {
    return siteUrl;
  }

  return getOrigin();
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const displayName = getString(formData, "displayName");

  if (!email || !password) {
    redirect("/sign-up?error=missing-fields");
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/mypage`,
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?message=check-email");
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getSafeAuthRedirectPath(getString(formData, "next"));

  if (!email || !password) {
    redirect("/sign-in?error=missing-fields");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = getString(formData, "email");

  if (!email) {
    redirect("/forgot-password?error=missing-email");
  }

  const supabase = await createClient();
  const publicOrigin = await getPublicOrigin();
  const redirectTo = `${publicOrigin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    // TODO(auth): Configure Supabase Authentication -> SMTP Settings before production.
    // Supabase's default SMTP is intended for testing and can fail for general customer email delivery.
    console.error("[auth] resetPasswordForEmail failed", {
      name: error.name,
      message: error.message,
      status: error.status,
      redirectTo,
      hasNextPublicSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
    });
    redirect("/forgot-password?error=send-failed");
  }

  redirect("/forgot-password?message=sent");
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}
