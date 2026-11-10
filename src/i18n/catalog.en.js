import base from './en.json';
import tasks from './tasks.en.json';
import pricing from './pricing.en.json';
import shell from './shell.en.json';
import onboarding from './onboarding.en.json';
import billing from './billing.en.json';
import feedback from './feedback.en.json';
import admin from './admin.en.json';
import account from './account.en.json';
import connectionLab from './connectionLab.en.json';

/**
 * Everything the app says in English: the main file and the feature files, merged by the loader (catalogs.js,
 * mergeCatalog.js). Downloaded only by someone using the app in English. This file imports nothing but its own
 * text, so when it has to be fetched again under a new address (catalogs.js) nothing it depends on can still be
 * the copy that failed.
 */
export default { base, features: { tasks, pricing, shell, onboarding, billing, feedback, admin, account, connectionLab } };
