import base from './es-PE.json';
import tasks from './tasks.es-PE.json';
import pricing from './pricing.es-PE.json';
import shell from './shell.es-PE.json';
import onboarding from './onboarding.es-PE.json';
import billing from './billing.es-PE.json';
import feedback from './feedback.es-PE.json';
import admin from './admin.es-PE.json';
import account from './account.es-PE.json';
import connectionLab from './connectionLab.es-PE.json';

/**
 * Everything the app says in Peruvian Spanish: the main file and the feature files, merged by the loader (catalogs.js,
 * mergeCatalog.js). Downloaded only by someone using the app in Peruvian Spanish. This file imports nothing but its own
 * text, so when it has to be fetched again under a new address (catalogs.js) nothing it depends on can still be
 * the copy that failed.
 */
export default { base, features: { tasks, pricing, shell, onboarding, billing, feedback, admin, account, connectionLab } };
