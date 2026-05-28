import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { track, flushAnalytics } from '../lib/analytics';
import { PRODUCT_ONBOARDING_VERSION } from '../help/constants';

const HelpContext = createContext(null);

function isOnboardingDone(prefs) {
  if (!prefs || typeof prefs !== 'object') return false;
  const ver = Number(prefs.onboardingVersion) || 0;
  if (ver < PRODUCT_ONBOARDING_VERSION) return false;
  return Boolean(prefs.onboardingCompletedAt || prefs.onboardingSkippedAt);
}

export function HelpProvider({ children, user }) {
  const { i18n } = useTranslation();
  const [prefs, setPrefs] = useState({ tooltipsDismissed: [], onboardingVersion: 0 });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const loggedIn = Boolean(user?.token && user?.registrationComplete !== false);

  const loadPrefs = useCallback(async () => {
    if (!loggedIn) {
      setPrefs({ tooltipsDismissed: [], onboardingVersion: 0 });
      setPrefsLoaded(true);
      return;
    }
    try {
      const res = await api.get('/me/help/preferences');
      const data = res.data && typeof res.data === 'object' ? res.data : {};
      setPrefs(data);
      if (!isOnboardingDone(data)) {
        setShowOnboarding(true);
        track('onboarding_prompted', { version: PRODUCT_ONBOARDING_VERSION });
      }
    } catch {
      setPrefs({ tooltipsDismissed: [], onboardingVersion: 0 });
    } finally {
      setPrefsLoaded(true);
    }
  }, [loggedIn]);

  useEffect(() => {
    setPrefsLoaded(false);
    void loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    if (!loggedIn) return undefined;
    const onUnload = () => { void flushAnalytics(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [loggedIn]);

  const dismissedSet = useMemo(() => {
    const list = prefs?.tooltipsDismissed;
    return new Set(Array.isArray(list) ? list : []);
  }, [prefs]);

  const patchPrefs = useCallback(async (patch) => {
    if (!loggedIn) {
      setPrefs((p) => ({ ...p, ...patch }));
      return;
    }
    try {
      const res = await api.patch('/me/help/preferences', patch);
      setPrefs(res.data && typeof res.data === 'object' ? res.data : { ...prefs, ...patch });
    } catch {
      setPrefs((p) => ({ ...p, ...patch }));
    }
  }, [loggedIn, prefs]);

  const dismissTooltip = useCallback(async (tooltipId) => {
    if (!tooltipId || dismissedSet.has(tooltipId)) return;
    track('tooltip_dismissed', { tooltipId });
    const merged = [...dismissedSet, tooltipId];
    await patchPrefs({ tooltipsDismissed: [tooltipId] });
    setActiveTooltip(null);
    return merged;
  }, [dismissedSet, patchPrefs]);

  const completeOnboarding = useCallback(async (skipped = false) => {
    track(skipped ? 'onboarding_skipped' : 'onboarding_completed', {
      version: PRODUCT_ONBOARDING_VERSION,
    });
    const patch = {
      onboardingVersion: PRODUCT_ONBOARDING_VERSION,
      ...(skipped
        ? { onboardingSkippedAt: new Date().toISOString() }
        : { onboardingCompletedAt: new Date().toISOString() }),
    };
    await patchPrefs(patch);
    setShowOnboarding(false);
  }, [patchPrefs]);

  const resumeOnboarding = useCallback(() => {
    track('onboarding_resumed', { version: PRODUCT_ONBOARDING_VERSION });
    setShowOnboarding(true);
  }, []);

  const shouldShowTooltip = useCallback((tooltipId) => {
    if (!prefsLoaded || !loggedIn) return false;
    if (dismissedSet.has(tooltipId)) return false;
    return activeTooltip === tooltipId;
  }, [prefsLoaded, loggedIn, dismissedSet, activeTooltip]);

  const openTooltip = useCallback((tooltipId) => {
    if (!tooltipId || dismissedSet.has(tooltipId)) return;
    setActiveTooltip(tooltipId);
    track('tooltip_shown', { tooltipId });
  }, [dismissedSet]);

  const askHelpAi = useCallback(async (question, context = 'general') => {
    track('help_ai_asked', { context });
    const res = await api.post('/me/help/ask', {
      question,
      context,
      locale: i18n.language?.slice(0, 2) || 'en',
    });
    return res.data;
  }, [i18n.language]);

  const value = useMemo(() => ({
    prefs,
    prefsLoaded,
    dismissedSet,
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    resumeOnboarding,
    isOnboardingDone: isOnboardingDone(prefs),
    dismissTooltip,
    shouldShowTooltip,
    openTooltip,
    activeTooltip,
    setActiveTooltip,
    patchPrefs,
    askHelpAi,
    trackHelp: (name, props) => track(name, props),
  }), [
    prefs, prefsLoaded, dismissedSet, showOnboarding, completeOnboarding,
    resumeOnboarding, dismissTooltip, shouldShowTooltip, openTooltip,
    activeTooltip, patchPrefs, askHelpAi,
  ]);

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    throw new Error('useHelp must be used within HelpProvider');
  }
  return ctx;
}
