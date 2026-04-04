'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalPortalProps = {
  isOpen: boolean;
  /** Fired when user clicks the dimmed backdrop (omit or no-op while a mutation is in flight). */
  onBackdropClose?: () => void;
  children: ReactNode;
};

/**
 * Renders modal content in document.body with a warm scrim and scroll lock.
 * Deduplicates portal + hydration + overflow logic shared by Upload and PDF modals.
 */
export function ModalPortal({ isOpen, onBackdropClose, children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="modal-scrim fixed inset-0 z-[1000] flex min-h-dvh w-full items-center justify-center p-4"
      onClick={() => onBackdropClose?.()}
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}
