/**
 * FeedbackButton — a header button that opens the report form in a native
 * <dialog> (focus trap, Escape to close and focus return come from the browser).
 */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import FeedbackForm from './FeedbackForm';

export function FeedbackButton() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  // The form is only mounted while the dialog is open: a fresh form each time,
  // and no hidden second submit button on the page behind it.
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    setSentId(null);
    setIsOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" onClick={open} style={{
        minHeight: 44, padding: `0 ${theme.spacing.sm}px`, borderRadius: theme.shape.radiusFull,
        border: `1px solid ${theme.colors.border}`, background: 'transparent', color: theme.colors.text, cursor: 'pointer',
      }}>
        {t('feedback.button')}
      </button>
      <dialog ref={dialogRef} aria-labelledby="feedback-dialog-title" onClose={() => setIsOpen(false)} style={{
        width: 'min(560px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 32px)', boxSizing: 'border-box',
        padding: theme.spacing.lg, borderRadius: theme.shape.radiusLg, border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface, color: theme.colors.text,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
          <h2 id="feedback-dialog-title" style={{ margin: 0, fontSize: '1.25rem' }}>{t('feedback.dialogTitle')}</h2>
          <button type="button" onClick={close} aria-label={t('feedback.close')} style={{
            minWidth: 44, minHeight: 44, border: 'none', background: 'transparent', color: theme.colors.text, fontSize: '1.25rem', cursor: 'pointer',
          }}>×</button>
        </div>
        {isOpen && (sentId ? (
          <div role="status" style={{ display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
            <p style={{ margin: 0 }}>{t('feedback.thanks')}</p>
            <Link to="/qa" onClick={close} style={{ color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' }}>
              {t('feedback.seeMyReports')}
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: theme.spacing.md }}>
            <FeedbackForm onSubmitted={(report) => setSentId(report.id)} />
          </div>
        ))}
      </dialog>
    </>
  );
}

export default FeedbackButton;
