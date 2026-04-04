import { NextResponse } from 'next/server';

/**
 * Shared `{ error: string }` JSON for App Router handlers (search + documents).
 * Upload uses `{ success: false, error }` via its own helper.
 */
export function jsonErrorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
