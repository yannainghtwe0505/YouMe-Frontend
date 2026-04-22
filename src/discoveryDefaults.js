export const DISCOVER_MODES = [
  { id: 'for_you', label: 'For You' },
  { id: 'double_date', label: 'Double Date' },
  { id: 'astrology', label: 'Astrology' },
  { id: 'music', label: 'Music' },
];

export const INTERESTED_IN_OPTIONS = [
  { id: 'men', label: 'Men' },
  { id: 'women', label: 'Women' },
  { id: 'nonbinary', label: 'Non-binary' },
];

export const LANGUAGE_OPTIONS = [
  'English',
  'Japanese',
  'Spanish',
  'French',
  'Korean',
  'Mandarin',
  'Hindi',
  'Portuguese',
  'German',
  'Arabic',
];

export const SELECT_OPTIONS = {
  lookingFor: [
    '',
    'Long-term partner',
    'Short-term fun',
    'New friends',
    'Still figuring it out',
  ],
  zodiac: [
    '',
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ],
  education: [
    '',
    'High school',
    'Trade school',
    'In college',
    'Undergraduate degree',
    'Graduate degree',
  ],
  familyPlans: [
    '',
    'Want children',
    'Do not want children',
    'Open to children',
    'Not sure yet',
  ],
  communicationStyle: [
    '',
    'Big texter',
    'Bad texter',
    'Phone caller',
    'Video chatter',
    'Meet in person often',
  ],
  loveStyle: [
    '',
    'Time together',
    'Touch',
    'Compliments',
    'Gifts',
    'Acts of service',
  ],
  pets: [
    '',
    'Dog',
    'Cat',
    'Other pets',
    'Want a pet',
    'Allergic',
    'No pets',
  ],
  drinking: [
    '',
    'Never',
    'Sober',
    'Socially',
    'On special occasions',
    'Most weekends',
  ],
  smoking: [
    '',
    'Non-smoker',
    'Occasional',
    'Smoker',
    'Trying to quit',
  ],
  workout: [
    '',
    'Every day',
    'Often',
    'Sometimes',
    'Rarely',
  ],
  socialMedia: [
    '',
    'Passive scroller',
    'Influencer',
    'Off the grid',
  ],
};

/** Parallel to SELECT_OPTIONS[field] — i18n key suffixes under discover.options.{field}.{key} */
export const SELECT_OPTION_KEYS = {
  lookingFor: ['any', 'longTerm', 'shortTerm', 'newFriends', 'figuring'],
  zodiac: [
    'any',
    'aries',
    'taurus',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'scorpio',
    'sagittarius',
    'capricorn',
    'aquarius',
    'pisces',
  ],
  education: ['any', 'highSchool', 'tradeSchool', 'inCollege', 'undergrad', 'graduate'],
  familyPlans: ['any', 'wantChildren', 'noChildren', 'openChildren', 'notSure'],
  communicationStyle: ['any', 'bigTexter', 'badTexter', 'phoneCaller', 'videoChatter', 'meetOften'],
  loveStyle: ['any', 'timeTogether', 'touch', 'compliments', 'gifts', 'actsOfService'],
  pets: ['any', 'dog', 'cat', 'otherPets', 'wantPet', 'allergic', 'noPets'],
  drinking: ['any', 'never', 'sober', 'socially', 'specialOccasions', 'mostWeekends'],
  smoking: ['any', 'nonSmoker', 'occasional', 'smoker', 'tryingToQuit'],
  workout: ['any', 'everyDay', 'often', 'sometimes', 'rarely'],
  socialMedia: ['any', 'passiveScroller', 'influencer', 'offTheGrid'],
};

/**
 * Localized label for a stored select value (English string from API).
 * Unknown values are returned as-is so user-typed or future options still display.
 */
export function labelForSelectOption(field, value, t) {
  const options = SELECT_OPTIONS[field];
  const keys = SELECT_OPTION_KEYS[field];
  if (!options || !keys) return value || '';
  const idx = options.indexOf(value);
  if (idx < 0) return value || '';
  if (!value) return t('common.any');
  const suffix = keys[idx];
  return t(`discover.options.${field}.${suffix}`);
}

export function emptyFilters() {
  return {
    lookingFor: '',
    languages: [],
    zodiac: '',
    education: '',
    familyPlans: '',
    communicationStyle: '',
    loveStyle: '',
    pets: '',
    drinking: '',
    smoking: '',
    workout: '',
    socialMedia: '',
    mustShareInterest: '',
  };
}

export function emptyDiscoverySettings() {
  return {
    mode: 'for_you',
    interestedIn: [],
    requireBio: false,
    expandDistanceWhenEmpty: false,
    expandAgeWhenEmpty: false,
    minPhotos: 1,
    filters: emptyFilters(),
  };
}

export function emptyLifestyle() {
  return {
    appearsInModes: ['for_you'],
    lookingFor: '',
    languages: [],
    zodiac: '',
    education: '',
    familyPlans: '',
    communicationStyle: '',
    loveStyle: '',
    pets: '',
    drinking: '',
    smoking: '',
    workout: '',
    socialMedia: '',
  };
}

function deepMergeFilters(base, patch) {
  if (!patch || typeof patch !== 'object') return { ...base };
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    if (k === 'languages') {
      out.languages = Array.isArray(patch.languages) ? [...patch.languages] : [];
    } else {
      out[k] = patch[k];
    }
  }
  return out;
}

export function mergeDiscoveryFromApi(me) {
  const base = emptyDiscoverySettings();
  const raw = me?.discoverySettings;
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    filters: deepMergeFilters(base.filters, raw.filters),
  };
}

export function mergeLifestyleFromApi(me) {
  const base = emptyLifestyle();
  const raw = me?.lifestyle;
  if (!raw || typeof raw !== 'object') return base;
  const appears = Array.isArray(raw.appearsInModes) ? raw.appearsInModes : base.appearsInModes;
  return {
    ...base,
    ...raw,
    appearsInModes: appears.length ? appears : ['for_you'],
    languages: Array.isArray(raw.languages) ? raw.languages : [],
  };
}
