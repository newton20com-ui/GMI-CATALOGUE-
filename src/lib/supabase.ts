import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vknzaptggqkcdwadlemm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbnphcHRnZ3FrY2R3YWRsZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzE0MzgsImV4cCI6MjEwODk0NzQzOH0.4TzjqhQEXYAZAQoU0kqYZSm9h_UeDpHDFkdfCxToxeY';

// Indicateur si Supabase est effectivement configuré avec des clés réelles
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20
);

// Client Supabase réel (ou dummy sécurisé si non configuré pour éviter de planter)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://mock-gmi-project.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock_key');
