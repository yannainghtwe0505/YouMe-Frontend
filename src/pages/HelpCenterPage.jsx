import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HELP_ARTICLE_IDS, HELP_CATEGORIES,
} from '../help/constants';
import { useHelp } from '../context/HelpProvider';

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

export default function HelpCenterPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { askHelpAi, trackHelp, resumeOnboarding, isOnboardingDone } = useHelp();
  const [query, setQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const articleFromUrl = searchParams.get('article');

  useEffect(() => {
    if (articleFromUrl && HELP_ARTICLE_IDS.includes(articleFromUrl)) {
      setActiveArticle(articleFromUrl);
      trackHelp('help_article_opened', { articleId: articleFromUrl, source: 'url' });
    }
  }, [articleFromUrl, trackHelp]);

  const faqItems = useMemo(() => HELP_ARTICLE_IDS.map((id) => ({
    id,
    category: t(`help.articles.${id}.category`, { defaultValue: 'gettingStarted' }),
    title: t(`help.articles.${id}.title`),
    summary: t(`help.articles.${id}.summary`),
    body: t(`help.articles.${id}.body`),
  })), [t]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return faqItems;
    return faqItems.filter((item) => (
      normalize(item.title).includes(q)
      || normalize(item.summary).includes(q)
      || normalize(item.body).includes(q)
    ));
  }, [faqItems, query]);

  const openArticle = useCallback((id) => {
    setActiveArticle(id);
    setSearchParams({ article: id }, { replace: true });
    trackHelp('help_article_viewed', { articleId: id });
  }, [setSearchParams, trackHelp]);

  const closeArticle = () => {
    setActiveArticle(null);
    setSearchParams({}, { replace: true });
  };

  const hasAuth = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('token'));

  const handleAiAsk = async (e) => {
    e.preventDefault();
    const q = aiQuestion.trim();
    if (!q) return;
    if (!hasAuth) {
      setAiError(t('help.ai.signInRequired'));
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiAnswer('');
    try {
      const ctx = activeArticle === 'what_is_super_like' ? 'super_like'
        : activeArticle === 'what_is_like' ? 'like'
          : activeArticle === 'how_matching_works' || activeArticle === 'after_match' ? 'matching'
            : activeArticle === 'safety_guide' || activeArticle === 'report_block' ? 'safety'
              : 'general';
      const data = await askHelpAi(q, ctx);
      setAiAnswer(data?.answer || t('help.ai.noAnswer'));
    } catch {
      setAiError(t('help.ai.error'));
    } finally {
      setAiLoading(false);
    }
  };

  const featureCards = [
    { id: 'like', icon: '♥', article: 'what_is_like' },
    { id: 'superLike', icon: '★', article: 'what_is_super_like' },
    { id: 'match', icon: '💬', article: 'how_matching_works' },
    { id: 'safety', icon: '🛡', article: 'safety_guide' },
  ];

  return (
    <div className="fade-in help-center-page">
      <header className="help-center-header">
        <button type="button" className="help-center-back" onClick={() => window.history.back()}>
          {t('common.back')}
        </button>
        <h1>{t('help.center.title')}</h1>
        <p>{t('help.center.subtitle')}</p>
      </header>

      {hasAuth && !isOnboardingDone ? (
        <div className="help-center-banner card card-surface">
          <p>{t('help.center.resumeOnboarding')}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resumeOnboarding}>
            {t('help.center.startTour')}
          </button>
        </div>
      ) : null}

      <section className="help-search card card-surface" aria-label={t('help.center.searchLabel')}>
        <input
          type="search"
          className="form-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('help.center.searchPlaceholder')}
          aria-label={t('help.center.searchLabel')}
        />
      </section>

      <section className="help-feature-cards" aria-label={t('help.center.featureCardsTitle')}>
        <h2 className="help-section-title">{t('help.center.featureCardsTitle')}</h2>
        <div className="help-feature-grid">
          {featureCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="help-feature-card"
              onClick={() => openArticle(card.article)}
            >
              <span className="help-feature-icon" aria-hidden>{card.icon}</span>
              <span className="help-feature-label">{t(`help.features.${card.id}.title`)}</span>
              <span className="help-feature-desc">{t(`help.features.${card.id}.desc`)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="help-ai card card-surface" aria-label={t('help.ai.title')}>
        <h2 className="help-section-title">{t('help.ai.title')}</h2>
        <p className="help-ai-lead">{t('help.ai.lead')}</p>
        <form onSubmit={handleAiAsk} className="help-ai-form">
          <input
            className="form-input"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder={t('help.ai.placeholder')}
            maxLength={500}
            disabled={aiLoading}
          />
          <button type="submit" className="btn btn-primary" disabled={aiLoading || !aiQuestion.trim()}>
            {aiLoading ? t('help.ai.asking') : t('help.ai.ask')}
          </button>
        </form>
        {aiError ? <p className="help-ai-error" role="alert">{aiError}</p> : null}
        {aiAnswer ? <div className="help-ai-answer">{aiAnswer}</div> : null}
      </section>

      {HELP_CATEGORIES.map((cat) => {
        const items = filtered.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="help-faq-section">
            <h2 className="help-section-title">{t(`help.categories.${cat}`)}</h2>
            <ul className="help-faq-list card card-surface">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="help-faq-item"
                    onClick={() => openArticle(item.id)}
                  >
                    <span>{item.title}</span>
                    <span className="help-faq-chevron" aria-hidden>›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {filtered.length === 0 ? (
        <p className="help-empty">{t('help.center.noResults')}</p>
      ) : null}

      <section className="help-contact card card-surface">
        <h2 className="help-section-title">{t('help.contact.title')}</h2>
        <p>{t('help.contact.body')}</p>
        <a className="btn btn-secondary" href={`mailto:${t('help.contact.email')}`}>
          {t('help.contact.cta')}
        </a>
      </section>

      {activeArticle ? (
        <div className="help-article-overlay" role="dialog" aria-modal="true">
          <div className="help-article-panel card card-surface">
            <button type="button" className="help-article-close" onClick={closeArticle} aria-label={t('common.back')}>
              ×
            </button>
            <h2>{t(`help.articles.${activeArticle}.title`)}</h2>
            <div className="help-article-body">
              {t(`help.articles.${activeArticle}.body`).split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <div className="help-article-footer">
              <Link to="/safety" className="btn btn-ghost btn-sm" onClick={closeArticle}>
                {t('help.articles.safety_guide.linkSafety')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
