'use client';

/**
 * Dismiss control for modal panels; matches Corpus chrome (mono-friendly hit target).
 * @param props - Close handler and optional className for layout (e.g. shrink-0).
 * @returns Accessible icon button
 */
export function ModalCloseButton({
  onClick,
  className = '',
  disabled = false,
}: {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'border-2 border-transparent p-2 text-ink-muted transition-colors hover:border-border hover:bg-paper/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Close"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
