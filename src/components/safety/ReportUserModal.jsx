import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { track } from '../../lib/analytics';

export const REPORT_REASON_CODES = [
  'HARASSMENT',
  'SPAM',
  'SCAM',
  'INAPPROPRIATE_CONTENT',
  'UNDERAGE',
  'OTHER',
];

export default function ReportUserModal({
  open,
  peerName,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [localError, setLocalError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setLocalError(t('messages.reportModal.reasonRequired'));
      return;
    }
    setLocalError(null);
    track('report_submitted', { reason });
    await onSubmit({ reason, details: details.trim() || null });
  };

  const handleClose = () => {
    setReason('');
    setDetails('');
    setLocalError(null);
    onClose();
  };

  return (
    <div className="modal-overlay report-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="modal-card report-modal-card card card-surface">
        <button type="button" className="report-modal-close" onClick={handleClose} aria-label={t('common.cancel')}>
          ×
        </button>
        <h2 id="report-modal-title">{t('messages.reportModal.title')}</h2>
        <p className="report-modal-lead">
          {peerName
            ? t('messages.reportModal.leadNamed', { name: peerName })
            : t('messages.reportModal.lead')}
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset className="report-reason-fieldset">
            <legend className="report-reason-legend">{t('messages.reportModal.reasonLabel')}</legend>
            {REPORT_REASON_CODES.map((code) => (
              <label key={code} className="report-reason-option">
                <input
                  type="radio"
                  name="reportReason"
                  value={code}
                  checked={reason === code}
                  onChange={() => setReason(code)}
                />
                <span>{t(`messages.reportModal.reasons.${code}`)}</span>
              </label>
            ))}
          </fieldset>

          <label className="report-details-label" htmlFor="report-details">
            {t('messages.reportModal.detailsLabel')}
          </label>
          <textarea
            id="report-details"
            className="form-input"
            rows={3}
            maxLength={2000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('messages.reportModal.detailsPlaceholder')}
          />

          {localError ? <p className="report-modal-error" role="alert">{localError}</p> : null}

          <p className="report-modal-help">
            <Link to="/help?article=report_block" onClick={handleClose}>
              {t('messages.reportModal.helpLink')}
            </Link>
          </p>

          <div className="report-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary danger" disabled={submitting || !reason}>
              {submitting ? t('messages.reportModal.submitting') : t('messages.reportModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
