import React, { useEffect, useState } from 'react';
import {
  DISCOVER_MODES,
  INTERESTED_IN_OPTIONS,
  LANGUAGE_OPTIONS,
  SELECT_OPTIONS,
  emptyDiscoverySettings,
  emptyLifestyle,
} from './discoveryDefaults';

function FilterSelect({ label, options, value, onChange, id }) {
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
          <option key={o || '_any'} value={o}>{o || 'Any'}</option>
        ))}
      </select>
    </label>
  );
}

function LifestyleField({ label, field, lifestyle, setLifestyle, id }) {
  const list = SELECT_OPTIONS[field] || [''];
  return (
    <FilterSelect
      label={label}
      options={list}
      value={lifestyle[field]}
      id={id}
      onChange={(v) => setLifestyle((prev) => ({ ...prev, [field]: v }))}
    />
  );
}

export default function DiscoverSettingsPanel({
  open,
  onClose,
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
      setFilter('languages', (() => {
        const cur = [...(filters.languages || [])];
        const i = cur.indexOf(lang);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(lang);
        return cur;
      })());
    } else {
      setLifestyle((prev) => {
        const p = prev || emptyLifestyle();
        const cur = [...(p.languages || [])];
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
          <h2 id="discover-settings-title">Discovery settings</h2>
          <button
            type="button"
            className="discover-settings-done"
            onClick={onSave}
            disabled={saving}
            aria-label="Save and close"
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
            Show me
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'my'}
            className={`discover-settings-tab${tab === 'my' ? ' active' : ''}`}
            onClick={() => setTab('my')}
          >
            My profile
          </button>
        </div>

        {tab === 'show' ? (
          <>
            <p className="discover-settings-lead">
              Control which people appear in Discover. Stricter filters mean fewer profiles — you can loosen
              distance or age when you run out (below).
            </p>

            <div className="discover-settings-section">
              <h3 className="discover-settings-sub">Modes</h3>
              <div className="discover-mode-pills" role="group" aria-label="Discover mode">
                {DISCOVER_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`discover-mode-pill${disc.mode === m.id ? ' active' : ''}`}
                    onClick={() => setDiscoverySettings((prev) => ({ ...(prev || emptyDiscoverySettings()), mode: m.id }))}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="discover-settings-hint">Others choose modes they want to appear in on the My profile tab.</p>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">Interested in</h3>
              <div className="discover-chip-row">
                {INTERESTED_IN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`discover-pref-chip${(disc.interestedIn || []).includes(opt.id) ? ' active' : ''}`}
                    onClick={() => toggleInterested(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="discover-settings-hint">Leave all off to include every gender.</p>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">Age range</h3>
              <div className="discover-age-readout">
                <span>{minAge}</span>
                <span className="discover-age-sep">–</span>
                <span>{maxAge}</span>
              </div>
              <label className="discover-settings-sr" htmlFor="disc-min-age">Minimum age</label>
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
              <label className="discover-settings-sr" htmlFor="disc-max-age">Maximum age</label>
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
                <span>Limit maximum distance</span>
              </label>
              {limitEnabled ? (
                <div className="discover-settings-slider-block">
                  <div className="discover-settings-km-readout">
                    <span className="discover-settings-km-label">Maximum distance</span>
                    <span className="discover-settings-km-value">{maxKm} km</span>
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
                <span>Has a bio</span>
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
                <span>Show people further away if I run out of nearby profiles</span>
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
                <span>Show people slightly outside my age range if I run out</span>
              </label>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">Minimum photos in profile</h3>
              <div className="discover-settings-km-readout">
                <span className="discover-settings-km-label">At least this many photos</span>
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
              <h3 className="discover-settings-sub">Narrow by their profile</h3>
              <p className="discover-settings-hint">Only people who match these (they fill details on My profile). Leave &quot;Any&quot; to skip.</p>
              <div className="discover-filter-grid">
                <FilterSelect
                  label="Looking for"
                  options={SELECT_OPTIONS.lookingFor}
                  value={filters.lookingFor}
                  id="f-looking"
                  onChange={(v) => setFilter('lookingFor', v)}
                />
                <FilterSelect
                  label="Zodiac"
                  options={SELECT_OPTIONS.zodiac}
                  value={filters.zodiac}
                  id="f-zodiac"
                  onChange={(v) => setFilter('zodiac', v)}
                />
                <FilterSelect
                  label="Education"
                  options={SELECT_OPTIONS.education}
                  value={filters.education}
                  id="f-edu"
                  onChange={(v) => setFilter('education', v)}
                />
                <FilterSelect
                  label="Family plans"
                  options={SELECT_OPTIONS.familyPlans}
                  value={filters.familyPlans}
                  id="f-family"
                  onChange={(v) => setFilter('familyPlans', v)}
                />
                <FilterSelect
                  label="Communication style"
                  options={SELECT_OPTIONS.communicationStyle}
                  value={filters.communicationStyle}
                  id="f-comm"
                  onChange={(v) => setFilter('communicationStyle', v)}
                />
                <FilterSelect
                  label="Love style"
                  options={SELECT_OPTIONS.loveStyle}
                  value={filters.loveStyle}
                  id="f-love"
                  onChange={(v) => setFilter('loveStyle', v)}
                />
                <FilterSelect
                  label="Pets"
                  options={SELECT_OPTIONS.pets}
                  value={filters.pets}
                  id="f-pets"
                  onChange={(v) => setFilter('pets', v)}
                />
                <FilterSelect
                  label="Drinking"
                  options={SELECT_OPTIONS.drinking}
                  value={filters.drinking}
                  id="f-drink"
                  onChange={(v) => setFilter('drinking', v)}
                />
                <FilterSelect
                  label="Smoking"
                  options={SELECT_OPTIONS.smoking}
                  value={filters.smoking}
                  id="f-smoke"
                  onChange={(v) => setFilter('smoking', v)}
                />
                <FilterSelect
                  label="Workout"
                  options={SELECT_OPTIONS.workout}
                  value={filters.workout}
                  id="f-workout"
                  onChange={(v) => setFilter('workout', v)}
                />
                <FilterSelect
                  label="Social media"
                  options={SELECT_OPTIONS.socialMedia}
                  value={filters.socialMedia}
                  id="f-social"
                  onChange={(v) => setFilter('socialMedia', v)}
                />
              </div>
              <div className="discover-lang-block">
                <div className="discover-filter-label">Languages they speak (any match)</div>
                <div className="discover-lang-grid">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label key={lang} className="discover-lang-item">
                      <input
                        type="checkbox"
                        checked={(filters.languages || []).includes(lang)}
                        onChange={() => toggleLang(lang, 'filter')}
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
              <label className="discover-filter-field" htmlFor="f-interest">
                <span className="discover-filter-label">Must share interest tag</span>
                <input
                  id="f-interest"
                  className="form-input"
                  placeholder="e.g. Hiking"
                  value={filters.mustShareInterest || ''}
                  onChange={(e) => setFilter('mustShareInterest', e.target.value)}
                />
              </label>
            </div>

            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">Your position</h3>
              {hasCoords ? (
                <p className="discover-settings-hint discover-settings-hint-ok">Saved — needed for distance sorting and filters.</p>
              ) : (
                <p className="discover-settings-hint warn">Add your position to use distance limits accurately.</p>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-block discover-settings-loc-btn"
                onClick={onUseLocation}
                disabled={locLoading}
              >
                {locLoading ? 'Finding you…' : 'Use my current location'}
              </button>
              {geoHint ? <p className="discover-settings-hint err">{geoHint}</p> : null}
            </div>
          </>
        ) : (
          <>
            <p className="discover-settings-lead">
              These details let other people filter fairly — add what you&apos;re comfortable sharing.
            </p>
            <div className="discover-settings-section">
              <h3 className="discover-settings-sub">Appear in these modes</h3>
              <div className="discover-chip-row">
                {DISCOVER_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`discover-pref-chip${(life.appearsInModes || []).includes(m.id) ? ' active' : ''}`}
                    onClick={() => toggleAppearMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="discover-settings-section discover-settings-section-divider">
              <h3 className="discover-settings-sub">About you</h3>
              <div className="discover-filter-grid">
                <LifestyleField label="Looking for" field="lookingFor" lifestyle={life} setLifestyle={setLifestyle} id="l-looking" />
                <LifestyleField label="Zodiac" field="zodiac" lifestyle={life} setLifestyle={setLifestyle} id="l-zodiac" />
                <LifestyleField label="Education" field="education" lifestyle={life} setLifestyle={setLifestyle} id="l-edu" />
                <LifestyleField label="Family plans" field="familyPlans" lifestyle={life} setLifestyle={setLifestyle} id="l-family" />
                <LifestyleField label="Communication style" field="communicationStyle" lifestyle={life} setLifestyle={setLifestyle} id="l-comm" />
                <LifestyleField label="Love style" field="loveStyle" lifestyle={life} setLifestyle={setLifestyle} id="l-love" />
                <LifestyleField label="Pets" field="pets" lifestyle={life} setLifestyle={setLifestyle} id="l-pets" />
                <LifestyleField label="Drinking" field="drinking" lifestyle={life} setLifestyle={setLifestyle} id="l-drink" />
                <LifestyleField label="Smoking" field="smoking" lifestyle={life} setLifestyle={setLifestyle} id="l-smoke" />
                <LifestyleField label="Workout" field="workout" lifestyle={life} setLifestyle={setLifestyle} id="l-workout" />
                <LifestyleField label="Social media" field="socialMedia" lifestyle={life} setLifestyle={setLifestyle} id="l-social" />
              </div>
              <div className="discover-lang-block">
                <div className="discover-filter-label">Languages you speak</div>
                <div className="discover-lang-grid">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label key={lang} className="discover-lang-item">
                      <input
                        type="checkbox"
                        checked={(life.languages || []).includes(lang)}
                        onChange={() => toggleLang(lang, 'life')}
                      />
                      {lang}
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
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
