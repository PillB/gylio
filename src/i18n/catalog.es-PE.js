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
import { mergeCatalog } from './mergeCatalog.js';

/** Everything the app says in Peruvian Spanish, in one object. Downloaded only by someone using the app in Spanish. */
export default mergeCatalog(base, { tasks, pricing, shell, onboarding, billing, feedback, admin, account, connectionLab });
