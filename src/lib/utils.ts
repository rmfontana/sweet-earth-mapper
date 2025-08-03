import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSupabaseUrl(): string {
  return 'https://wbkzczcqlorsewoofwqe.supabase.co';
}

// this is apparently necessary to use as a bearer token and safe to expose for use as the "app key" and only allows access to public data
export function getPublishableKey(): string {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6India3pjemNxbG9yc2V3b29md3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTkyMDYsImV4cCI6MjA2NzczNTIwNn0.2SjN-hegbgQviXkjNULudnDuFJtNnePJhlNHGcr4Cfg';
}