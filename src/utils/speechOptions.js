import i18n from 'i18next';

export function getSpeechOptions() {
  const locale = i18n.language || 'en';
  const voice = locale.startsWith('es') ? 'nova' : undefined;

  return {
    language: locale,
    ...(voice ? { voice } : {})
  };
}
