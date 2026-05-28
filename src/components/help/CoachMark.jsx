import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHelp } from '../../context/HelpProvider';

/**
 * Non-blocking spotlight tooltip anchored to a child element.
 * Shows once per tooltipId until dismissed (synced via HelpProvider).
 */
export default function CoachMark({
  tooltipId,
  titleKey,
  bodyKey,
  placement = 'top',
  delayMs = 600,
  children,
}) {
  const { t } = useTranslation();
  const {
    prefsLoaded, dismissedSet, openTooltip, dismissTooltip,
    shouldShowTooltip, activeTooltip,
  } = useHelp();
  const anchorRef = useRef(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!prefsLoaded || dismissedSet.has(tooltipId) || shownRef.current) return undefined;
    const timer = setTimeout(() => {
      if (!dismissedSet.has(tooltipId)) {
        openTooltip(tooltipId);
        shownRef.current = true;
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [prefsLoaded, dismissedSet, tooltipId, openTooltip, delayMs]);

  const visible = shouldShowTooltip(tooltipId) && activeTooltip === tooltipId;

  return (
    <span className={`coach-mark-anchor coach-mark-anchor--${placement}`} ref={anchorRef}>
      {children}
      {visible ? (
        <div
          className={`coach-mark coach-mark--${placement}`}
          role="dialog"
          aria-labelledby={`coach-title-${tooltipId}`}
        >
          <p id={`coach-title-${tooltipId}`} className="coach-mark-title">{t(titleKey)}</p>
          <p className="coach-mark-body">{t(bodyKey)}</p>
          <div className="coach-mark-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void dismissTooltip(tooltipId)}
            >
              {t('help.tooltips.gotIt')}
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}
