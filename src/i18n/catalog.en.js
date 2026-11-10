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
import { mergeCatalog } from './mergeCatalog.js';

/** Everything the app says in English, in one object. Downloaded only by someone using the app in English. */
export default mergeCatalog(base, { tasks, pricing, shell, onboarding, billing, feedback, admin, account, connectionLab });
