/**
 * Fire-and-forget analytics tracking
 * Never throws - always safe to call
 */
export async function track(
  supabase: any,
  payload: Record<string, any>
): Promise<void> {
  try {
    // Check feature flag
    if (Deno.env.get('FEATURE_SCANNER_ANALYTICS') !== 'true') {
      return;
    }

    // Remove undefined values
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    // Truncate query if present
    if (clean.query && typeof clean.query === 'string' && clean.query.length > 120) {
      clean.query = clean.query.substring(0, 120) + '...';
    }

    // Insert metrics (fire and forget)
    await supabase.from('scanner_metrics').insert([clean]);
  } catch (_e) {
    // Never throw - analytics must be non-blocking
    // Silently fail
  }
}
