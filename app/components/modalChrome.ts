/**
 * Shared Tailwind fragments for Corpus modals (above scrim z-index, stamped panel).
 * Keeps Upload and PDF viewers visually aligned without duplicating long class strings.
 */
export const MODAL_CONTENT_Z = 'z-[1001]';

/** Base panel: sits above ModalPortal scrim, stamped border, surface fill */
export const modalPanelBaseClass = `relative ${MODAL_CONTENT_Z} border-[3px] border-border bg-surface shadow-stamp`;
