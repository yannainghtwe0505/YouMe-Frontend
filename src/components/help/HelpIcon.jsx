import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Small ? control — links to Help Center or fires onClick for contextual help. */
export default function HelpIcon({
  to = '/help',
  articleId,
  className = '',
  onClick,
  label,
}) {
  const { t } = useTranslation();
  const aria = label || t('help.iconLabel');

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(articleId);
    }
  };

  const href = articleId ? `${to}?article=${encodeURIComponent(articleId)}` : to;

  return (
    <Link
      to={href}
      className={`help-icon-btn ${className}`.trim()}
      aria-label={aria}
      title={aria}
      onClick={handleClick}
    >
      <span aria-hidden>?</span>
    </Link>
  );
}
