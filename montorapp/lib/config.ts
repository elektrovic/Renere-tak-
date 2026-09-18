/**
 * Samler all lesing av miljøvariabler ett sted, slik at resten av koden slipper
 * å forholde seg til om noe er satt opp eller ikke.
 *
 * Ingenting her importeres fra klientkode – filen leses kun på serveren.
 */

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

export const config = {
  authSecret: env('AUTH_SECRET') ?? 'utrygg-standardnokkel-kun-for-lokal-utvikling',

  tripletex: {
    consumerToken: env('TRIPLETEX_CONSUMER_TOKEN'),
    employeeToken: env('TRIPLETEX_EMPLOYEE_TOKEN'),
    baseUrl: env('TRIPLETEX_BASE_URL') ?? 'https://api-test.tripletex.tech',
    companyId: env('TRIPLETEX_COMPANY_ID') ?? '0',
  },

  supabase: {
    url: env('SUPABASE_URL'),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  },

  anthropic: {
    apiKey: env('ANTHROPIC_API_KEY'),
  },

  kobbr: {
    apiKey: env('KOBBR_API_KEY'),
    baseUrl: env('KOBBR_BASE_URL'),
  },
};

/** Ekte Tripletex er koblet på når begge nøklene finnes. */
export const tripletexConfigured =
  Boolean(config.tripletex.consumerToken) && Boolean(config.tripletex.employeeToken);

/** Ekte database er koblet på når begge Supabase-verdiene finnes. */
export const supabaseConfigured =
  Boolean(config.supabase.url) && Boolean(config.supabase.serviceRoleKey);

export const anthropicConfigured = Boolean(config.anthropic.apiKey);

/**
 * Demomodus betyr: appen kjører med testdata i stedet for ekte Tripletex,
 * og lagrer i minnet i stedet for i databasen. Vises tydelig i grensesnittet.
 */
export const demoMode = !tripletexConfigured || !supabaseConfigured;

export const oppsettStatus = {
  tripletex: tripletexConfigured,
  supabase: supabaseConfigured,
  anthropic: anthropicConfigured,
  kobbr: Boolean(config.kobbr.apiKey),
};
