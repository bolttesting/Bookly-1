/**
 * Edge function slugs for supabase.functions.invoke().
 * Deploy with: supabase functions deploy send-test-emails
 *
 * If your project uses a different slug (e.g. legacy `rapid-processor`), set
 * VITE_SUPABASE_SEND_TEST_EMAILS_FUNCTION in .env and rebuild the frontend.
 */
export const SEND_TEST_EMAILS_FUNCTION =
  import.meta.env.VITE_SUPABASE_SEND_TEST_EMAILS_FUNCTION?.trim() || 'send-test-emails';
