import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Sunucu tarafı service-role istemcisi.
 * RLS kilitli olduğu için loyalty_store dahil tüm tablo erişimleri bu istemciyle yapılır.
 * Bu istemci YALNIZCA route handler / server kodu içinde kullanılmalıdır; anahtar istemciye sızdırılmamalıdır.
 */
export function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const isConfigured = supabaseUrl && supabaseUrl !== "your-supabase-url"
  if (!isConfigured) {
    return null
  }

  if (!serviceRoleKey) {
    console.error(
      "GÜVENLİK UYARISI: NEXT_PUBLIC_SUPABASE_URL tanımlı ancak SUPABASE_SERVICE_ROLE_KEY eksik. " +
        "RLS kilitli olduğundan Supabase erişimi devre dışı; Redis/dosya yedek katmanı kullanılıyor."
    )
    return null
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
