import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components ("use client").
 * Reads the public URL/anon key baked in at build time.
 *
 * Not parameterized with a generated `Database` type (there isn't one yet — see
 * src/lib/types.ts). Query results are typed at the call site via the domain
 * types in src/lib/types.ts instead. Swap in `createBrowserClient<Database>`
 * once you've run `supabase gen types` against a real project.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
