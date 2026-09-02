import { supabaseConfigured } from '@/lib/config';
import { minneButikk } from './minne';
import { supabaseButikk } from './supabase';
import type { Butikk } from './port';

export type { Butikk } from './port';

/** Én inngang til vår egen database for hele appen. */
export function butikk(): Butikk {
  return supabaseConfigured ? supabaseButikk : minneButikk;
}
