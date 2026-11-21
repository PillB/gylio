import { FAILED_KEY } from './catalogs.js';
import { LANGUAGE_KEY, firstLanguageFile } from './detection.js';

/**
 * The script the build puts in index.html (vite.config.ts, languagePreload). It starts the download of the first
 * language's text while the app's own code is still arriving, instead of after it: the app draws nothing until that
 * text is in (i18n.js, `ready`), so on a slow line this saves one whole round trip before the first screen.
 *
 * It looks at the same codes, in the same order, as i18next's language detector (detection.js) and preloads that
 * one file, under the address the app will import. After a failed download the app imports a new address
 * (catalogs.js), so then it preloads nothing. Storage that throws counts as empty, as it does for the detector.
 *
 * @param {Record<string, string>} files Each language file's address in the build, by catalogue name.
 */
export const languagePreloadScript = (files) =>
  `(function (files, pick) {
  var codes = [];
  try { if (sessionStorage.getItem(${JSON.stringify(FAILED_KEY)})) return; } catch (e) {}
  try { codes.push(localStorage.getItem(${JSON.stringify(LANGUAGE_KEY)})); } catch (e) {}
  var browser = navigator.languages || [];
  for (var i = 0; i < browser.length; i++) codes.push(browser[i]);
  if (navigator.userLanguage) codes.push(navigator.userLanguage);
  if (navigator.language) codes.push(navigator.language);
  codes.push(document.documentElement.getAttribute('lang'));
  var file = files[pick(codes)];
  if (!file) return;
  var link = document.createElement('link');
  link.rel = 'modulepreload';
  link.crossOrigin = '';
  link.href = file;
  document.head.appendChild(link);
})(${JSON.stringify(files)}, ${firstLanguageFile.toString()});`;
