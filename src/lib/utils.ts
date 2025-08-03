import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSupabaseUrl(): string {
  return 'https://wbkzczcqlorsewoofwqe.supabase.co';
}