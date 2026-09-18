import { tripletexConfigured } from '@/lib/config';
import { demoTripletex } from './demo';
import { ekteTripletex } from './ekte';
import type { TripletexPort } from './port';

export type { NyOrdre, NyOrdrelinje, NyTimeforing, TripletexPort } from './port';
export { TripletexError } from './client';

/**
 * Én inngang til Tripletex for hele appen.
 * Uten nøkler i miljøvariablene kjører vi mot testdata.
 */
export function tripletex(): TripletexPort {
  return tripletexConfigured ? ekteTripletex : demoTripletex;
}
