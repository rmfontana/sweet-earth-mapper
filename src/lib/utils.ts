import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fetch Supabase URL for local or edge environments (e.g., Lovable)
export async function getSupabaseUrl(): Promise<string> {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  try {
    const response = await fetch("/functions/v1/supabase-url");

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data?.url) {
      throw new Error("Response did not contain a valid `url` key");
    }

    return data.url;
  } catch (error) {
    console.error("[getSupabaseUrl] Error fetching Supabase URL:", error);
    throw new Error("Supabase URL could not be determined");
  }
}
