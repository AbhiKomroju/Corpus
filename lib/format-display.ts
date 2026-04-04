/**
 * Human-readable byte size for library tables and metadata.
 * @param bytes - Raw byte count (non-negative)
 */
export function formatFileSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Locale date/time for ingest timestamps; falls back to the raw string if parsing fails.
 * @param isoOrRaw - ISO string from API or legacy value
 */
export function formatLocaleDateTime(isoOrRaw: string): string {
  try {
    const d = new Date(isoOrRaw);
    return Number.isNaN(d.getTime())
      ? isoOrRaw
      : d.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
  } catch {
    return isoOrRaw;
  }
}
