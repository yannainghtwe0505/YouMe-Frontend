import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DISCOVER_MODES,
  INTERESTED_IN_OPTIONS,
  LANGUAGE_OPTIONS,
  SELECT_OPTIONS,
  emptyDiscoverySettings,
  emptyLifestyle,
  labelForSelectOption,
} from './discoveryDefaults';

const LANG_NAME_KEYS = {
  English: 'english',
  Japanese: 'japanese',
  Spanish: 'spanish',
  French: 'french',
  Korean: 'korean',
  Mandarin: 'mandarin',
  Hindi: 'hindi',
  Portuguese: 'portuguese',
  German: 'german',
  Arabic: 'arabic',
};

function FilterSelect({ label, field, options, value, onChange, id, t }) {
  const safe = Array.isArray(options) ? options : [''];
  const list = safe[0] === '' ? safe : ['', ...safe.filter(Boolean)];
  return (
    <label className="discover-filter-field" htmlFor={id}>
      <span className="discover-filter-label">{label}</span>
      <select
        id={id}
        className="form-input discover-filter-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {list.map((o) => (
          <option key={o || '_any'} value={o}>
            {labelForSelectOption(field, o, t)}
          </option>
        ))}
      </select>
    </label>
  );
}

function LifestyleField({ label, field, lifestyle, setLifestyle, id, t }) {
  const list = SELECT_OPTIONS[field] || [''];
  return (
    <FilterSelect
      label={label}
      field={field}
      options={list}
      value={lifestyle[field]}
      id={id}
      t={t}
      onChange={(v) => setLifestyle((prev) => ({ ...prev, [field]: v }))}
    />
  );
}

export default function DiscoverSettingsPanel({
  open,
  onClose,
  hydrating = false,
  discoverySettings,
  setDiscoverySettings,
  lifestyle,
  setLifestyle,
  minAge,
  maxAge,
  setMinAge,
  setMaxAge,
  limitEnabled,
  setLimitEnabled,
  maxKm,
  setMaxKm,
  hasCoords,
  locLoading,
  geoHint,
  onUseLocation,
  onSave,
  saving,
  saveError,
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('show');

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setTab('show');
  }, [open]);

  if (!open) return null;

  if (hydrating) {
    return (
      <div
        className="discover-settings-overlay"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="discover-settings-title"
        onClick={onClose}
      >
        <div
          className="discover-settings-sheet card-surface discover-settings-sheet-wide"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="discover-settings-head">
            <h2 id="discover-settings-title">{t('discover.settings.title')}</h2>
            <button
              type="button"
              className="discover-settings-done"
              onClick={onClose}
              disabled={saving}
              aria-label={t('discover.settings.saveAndCloseAria')}
            >
              ✓
            </button>
          </div>
          <p className="discover-settings-lead" style={{ marginTop: 24, textAlign: 'center' }}>
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  const disc = discoverySettings || emptyDiscoverySettings();
  const filters = disc.filters || emptyDiscoverySettings().filters;
  const life = lifestyle || emptyLifestyle();

  const setFilter = (key, value) => {
    setDiscoverySettings((prev) => {
      const p = prev || emptyDiscoverySettings();
      const baseF = emptyDiscoverySettings().filters;
      const merged = { ...baseF, ...(p.filters || {}) };
      merged[key] = value;
      return { ...p, filters: merged };
    });
  };

  const toggleInterested = (id) => {
    setDiscoverySettings((prev) => {
      const p = prev || emptyDiscoverySettings();
      const raw = p.interestedIn || [];
      const set = new Set(raw);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, interestedIn: [...set] };
    });
  };

  const toggleLang = (lang, which) => {
    if (which === 'filter') {
      setDiscoverySettings((prev) => {
        const p = prev || emptyDiscoverySettings();
        const baseF = emptyDiscoverySettings().filters;
        const merged = { ...baseF, ...(p.filters || {}) };
        const cur = [...(Array.isArray(merged.languages) ? merged.languages : [])];
        const i = cur.indexOf(lang);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(lang);
        merged.languages = cur;
        return { ...p, filters: merged };
      });
    } else {
      setLifestyle((prev) => {
        const p = prev || emptyLifestyle();
        const cur = [...(Array.isArray(p.languages) ? p.languages : [])];
        const i = cur.indexOf(lang);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(lang);
        return { ...p, languages: cur };
      });
    }
  };

  const toggleAppearMode = (modeId) => {
    setLifestyle((prev) => {
      const p = prev || emptyLifestyle();
      const cur = [...(p.appearsInModes || [])];
      const i = cur.indexOf(modeId);
      if (i >= 0) {
        if (cur.length > 1) cur.splice(i, 1);
      } else cur.push(modeId);
      return { ...p, appearsInModes: cur.length ? cur : ['for_you'] };
    });
  };

  return (
    <div
      className="discover-settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discover-settings-title"
      onClick={onClose}
    >
      <div
        className="discover-settings-sheet card-surface discover-settings-sheet-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="discover-settings-head">
          <h2 id="discover-settings-title">{t('discover.settings.title')}</h2>
          <button
            type="button"
            className="discover-settings-done"
            onClick={onSave}
            disabled={saving}
            aria-label={t('discover.settings.saveAndCloseAria')}
          >
            ✓
          </button>
        </div>

        <div className="discover-settings-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'show'}
            className={`discover-settings-tab${tab === 'show' ? ' active' : ''}`}
            onClick={() => setTab('show')}
          >
            {t('discover.settings.tabShowMe')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'my'}
            className={`discover-settings-tab${tab === 'my' ? ' active' : ''}`}
            onClick={() => setTab('my')}
          >
            {t('discover.settings.tabMyProfile')}
          </button>
        </div>

        {tab === 'show' ? (
          <>
            <p className="discover-settings-lead">
              {t('discover.settings.leadShow')}
            </p>

            <div className="discover-settings-section">
              <h3 className="discover-settings-sub">{t('discover.settings.modes')}</h3>
              <div className="discover-mode-pills" role="group" aria-label={t('discover.settings.modesAria')}>
                {DISCOVER_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`discover-mode-pill${disc.mode === m.id ? ' active' : ''}`}
                    onClick={() => setDiscoverySettings((prev) => ({ ...(prev || emptyDiscoverySettings()), mode: m.id }))}
                  >
                    {t(`discover.mode.${m.id}`)}
                  </button>
                ))}
              </div>
              <p className="discover-settings-hint">{t('discover.settings.modesHint')}</p>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">{t('discover.settings.interestedIn')}</h3>
              <div className="discover-chip-row">
                {INTERESTED_IN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`discover-pref-chip${(disc.interestedIn || []).includes(opt.id) ? ' active' : ''}`}
                    onClick={() => toggleInterested(opt.id)}
                  >
                    {t(`discover.interestedIn.${opt.id}`)}
                  </button>
                ))}
              </div>
              <p className="discover-settings-hint">{t('discover.settings.interestedInHint')}</p>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">{t('discover.settings.ageRange')}</h3>
              <div className="discover-age-readout">
                <span>{minAge}</span>
                <span className="discover-age-sep">–</span>
                <span>{maxAge}</span>
              </div>
              <label className="discover-settings-sr" htmlFor="disc-min-age">{t('discover.settings.minAge')}</label>
              <input
                id="disc-min-age"
                type="range"
                className="discover-settings-range"
                min={18}
                max={80}
                value={minAge}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinAge(Math.min(v, maxAge));
                }}
              />
              <label className="discover-settings-sr" htmlFor="disc-max-age">{t('discover.settings.maxAge')}</label>
              <input
                id="disc-max-age"
                type="range"
                className="discover-settings-range"
                min={18}
                max={80}
                value={maxAge}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxAge(Math.max(v, minAge));
                }}
              />
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <label className="discover-settings-toggle">
                <input
                  type="checkbox"
                  checked={limitEnabled}
                  onChange={(e) => setLimitEnabled(e.target.checked)}
                />
                <span>{t('discover.settings.limitDistance')}</span>
              </label>
              {limitEnabled ? (
                <div className="discover-settings-slider-block">
                  <div className="discover-settings-km-readout">
                    <span className="discover-settings-km-label">{t('discover.settings.maxDistance')}</span>
                    <span className="discover-settings-km-value">{t('discover.settings.kmValue', { km: maxKm })}</span>
                  </div>
                  <input
                    type="range"
                    className="discover-settings-range"
                    min={1}
                    max={200}
                    value={maxKm}
                    onChange={(e) => setMaxKm(Number(e.target.value))}
                  />
                </div>
              ) : null}
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <label className="discover-settings-toggle">
                <input
                  type="checkbox"
                  checked={!!disc.requireBio}
                  onChange={(e) => setDiscoverySettings((prev) => ({
                    ...(prev || emptyDiscoverySettings()),
                    requireBio: e.target.checked,
                  }))}
                />
                <span>{t('discover.settings.requireBio')}</span>
              </label>
              <label className="discover-settings-toggle">
                <input
                  type="checkbox"
                  checked={!!disc.expandDistanceWhenEmpty}
                  onChange={(e) => setDiscoverySettings((prev) => ({
                    ...(prev || emptyDiscoverySettings()),
                    expandDistanceWhenEmpty: e.target.checked,
                  }))}
                />
                <span>{t('discover.settings.expandDistance')}</span>
              </label>
              <label className="discover-settings-toggle">
                <input
                  type="checkbox"
                  checked={!!disc.expandAgeWhenEmpty}
                  onChange={(e) => setDiscoverySettings((prev) => ({
                    ...(prev || emptyDiscoverySettings()),
                    expandAgeWhenEmpty: e.target.checked,
                  }))}
                />
                <span>{t('discover.settings.expandAge')}</span>
              </label>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">{t('discover.settings.minPhotosTitle')}</h3>
              <div className="discover-settings-km-readout">
                <span className="discover-settings-km-label">{t('discover.settings.minPhotosLabel')}</span>
                <span className="discover-settings-km-value">{disc.minPhotos ?? 1}</span>
              </div>
              <input
                type="range"
                className="discover-settings-range"
                min={1}
                max={6}
                value={disc.minPhotos ?? 1}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setDiscoverySettings((prev) => ({
                    ...(prev || emptyDiscoverySettings()),
                    minPhotos: n,
                  }));
                }}
              />
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">{t('discover.settings.narrowTitle')}</h3>
              <p className="discover-settings-hint">{t('discover.settings.narrowHint')}</p>
              <div className="discover-filter-grid">
                <FilterSelect
                  label={t('discover.settings.filter.lookingFor')}
                  field="lookingFor"
                  options={SELECT_OPTIONS.lookingFor}
                  value={filters.lookingFor}
                  id="f-looking"
                  t={t}
                  onChange={(v) => setFilter('lookingFor', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.zodiac')}
                  field="zodiac"
                  options={SELECT_OPTIONS.zodiac}
                  value={filters.zodiac}
                  id="f-zodiac"
                  t={t}
                  onChange={(v) => setFilter('zodiac', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.education')}
                  field="education"
                  options={SELECT_OPTIONS.education}
                  value={filters.education}
                  id="f-edu"
                  t={t}
                  onChange={(v) => setFilter('education', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.familyPlans')}
                  field="familyPlans"
                  options={SELECT_OPTIONS.familyPlans}
                  value={filters.familyPlans}
                  id="f-family"
                  t={t}
                  onChange={(v) => setFilter('familyPlans', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.communicationStyle')}
                  field="communicationStyle"
                  options={SELECT_OPTIONS.communicationStyle}
                  value={filters.communicationStyle}
                  id="f-comm"
                  t={t}
                  onChange={(v) => setFilter('communicationStyle', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.loveStyle')}
                  field="loveStyle"
                  options={SELECT_OPTIONS.loveStyle}
                  value={filters.loveStyle}
                  id="f-love"
                  t={t}
                  onChange={(v) => setFilter('loveStyle', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.pets')}
                  field="pets"
                  options={SELECT_OPTIONS.pets}
                  value={filters.pets}
                  id="f-pets"
                  t={t}
                  onChange={(v) => setFilter('pets', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.drinking')}
                  field="drinking"
                  options={SELECT_OPTIONS.drinking}
                  value={filters.drinking}
                  id="f-drink"
                  t={t}
                  onChange={(v) => setFilter('drinking', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.smoking')}
                  field="smoking"
                  options={SELECT_OPTIONS.smoking}
                  value={filters.smoking}
                  id="f-smoke"
                  t={t}
                  onChange={(v) => setFilter('smoking', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.workout')}
                  field="workout"
                  options={SELECT_OPTIONS.workout}
                  value={filters.workout}
                  id="f-workout"
                  t={t}
                  onChange={(v) => setFilter('workout', v)}
                />
                <FilterSelect
                  label={t('discover.settings.filter.socialMedia')}
                  field="socialMedia"
                  options={SELECT_OPTIONS.socialMedia}
                  value={filters.socialMedia}
                  id="f-social"
                  t={t}
                  onChange={(v) => setFilter('socialMedia', v)}
                />
              </div>
              <div className="discover-lang-block">
                <div className="discover-filter-label">{t('discover.settings.langTheySpeak')}</div>
                <div className="discover-lang-grid">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label key={lang} className="discover-lang-item" htmlFor={`disc-lang-filter-${lang}`}>
                      <input
                        id={`disc-lang-filter-${lang}`}
                        type="checkbox"
                        checked={(Array.isArray(filters.languages) ? filters.languages : []).includes(lang)}
                        onChange={() => toggleLang(lang, 'filter')}
                      />
                      <span className="discover-lang-label-text">
                        {t(`discover.langName.${LANG_NAME_KEYS[lang] || lang}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="discover-filter-field" htmlFor="f-interest">
                <span className="discover-filter-label">{t('discover.settings.mustShareInterest')}</span>
                <input
                  id="f-interest"
                  className="form-input"
                  placeholder={t('discover.settings.mustShareInterestPlaceholder')}
                  value={filters.mustShareInterest || ''}
                  onChange={(e) => setFilter('mustShareInterest', e.target.value)}
                />
              </label>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">{t('discover.settings.yourPosition')}</h3>
              {hasCoords ? (
                <p className="discover-settings-hint discover-settings-hint-ok">{t('discover.settings.positionOk')}</p>
              ) : (
                <p className="discover-settings-hint warn">{t('discover.settings.positionWarn')}</p>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-block discover-settings-loc-btn"
                onClick={onUseLocation}
                disabled={locLoading}
              >
                {locLoading ? t('discover.settings.findingYou') : t('discover.settings.useLocation')}
              </button>
              {geoHint ? <p className="discover-settings-hint err">{geoHint}</p> : null}
            </div>
          </>
        ) : (
          <>
            <p className="discover-settings-lead">
              {t('discover.settings.leadMy')}
            </p>
            <div className="discover-settings-section">
              <h3 className="discover-settings-sub">{t('discover.settings.appearInModes')}</h3>
              <div className="discover-chip-row">
                {DISCOVER_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`discover-pref-chip${(life.appearsInModes || []).includes(m.id) ? ' active' : ''}`}
                    onClick={() => toggleAppearMode(m.id)}
                  >
                    {t(`discover.mode.${m.id}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">{t('discover.settings.aboutYou')}</h3>
              <div className="discover-filter-grid">
                <LifestyleField label={t('discover.settings.filter.lookingFor')} field="lookingFor" lifestyle={life} setLifestyle={setLifestyle} id="l-looking" t={t} />
                <LifestyleField label={t('discover.settings.filter.zodiac')} field="zodiac" lifestyle={life} setLifestyle={setLifestyle} id="l-zodiac" t={t} />
                <LifestyleField label={t('discover.settings.filter.education')} field="education" lifestyle={life} setLifestyle={setLifestyle} id="l-edu" t={t} />
                <LifestyleField label={t('discover.settings.filter.familyPlans')} field="familyPlans" lifestyle={life} setLifestyle={setLifestyle} id="l-family" t={t} />
                <LifestyleField label={t('discover.settings.filter.communicationStyle')} field="communicationStyle" lifestyle={life} setLifestyle={setLifestyle} id="l-comm" t={t} />
                <LifestyleField label={t('discover.settings.filter.loveStyle')} field="loveStyle" lifestyle={life} setLifestyle={setLifestyle} id="l-love" t={t} />
                <LifestyleField label={t('discover.settings.filter.pets')} field="pets" lifestyle={life} setLifestyle={setLifestyle} id="l-pets" t={t} />
                <LifestyleField label={t('discover.settings.filter.drinking')} field="drinking" lifestyle={life} setLifestyle={setLifestyle} id="l-drink" t={t} />
                <LifestyleField label={t('discover.settings.filter.smoking')} field="smoking" lifestyle={life} setLifestyle={setLifestyle} id="l-smoke" t={t} />
                <LifestyleField label={t('discover.settings.filter.workout')} field="workout" lifestyle={life} setLifestyle={setLifestyle} id="l-workout" t={t} />
                <LifestyleField label={t('discover.settings.filter.socialMedia')} field="socialMedia" lifestyle={life} setLifestyle={setLifestyle} id="l-social" t={t} />
              </div>
              <div className="discover-lang-block">
                <div className="discover-filter-label">{t('discover.settings.langYouSpeak')}</div>
                <div className="discover-lang-grid">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label key={lang} className="discover-lang-item" htmlFor={`disc-lang-life-${lang}`}>
                      <input
                        id={`disc-lang-life-${lang}`}
                        type="checkbox"
                        checked={(Array.isArray(life.languages) ? life.languages : []).includes(lang)}
                        onChange={() => toggleLang(lang, 'life')}
                      />
                      <span className="discover-lang-label-text">
                        {t(`discover.langName.${LANG_NAME_KEYS[lang] || lang}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {saveError ? <p className="discover-settings-hint err">{saveError}</p> : null}

        <div className="discover-settings-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            {t('discover.settings.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : t('discover.settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
