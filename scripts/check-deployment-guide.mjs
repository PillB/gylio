import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'public', 'deployment-guide.html');
const appIndexPath = path.join(root, 'index.html');
const reactEntryPath = path.join(root, 'src', 'index.jsx');
const utilityFooterPath = path.join(root, 'src', 'components', 'SiteUtilityFooter.tsx');
const html = fs.readFileSync(htmlPath, 'utf8');
const appIndex = fs.readFileSync(appIndexPath, 'utf8');
const reactEntry = fs.readFileSync(reactEntryPath, 'utf8');
const utilityFooter = fs.existsSync(utilityFooterPath) ? fs.readFileSync(utilityFooterPath, 'utf8') : '';

let failures = 0;
const pass = (round, label) => console.log(`[deployment-guide] pass ${round}/6 ✓ ${label}`);
const fail = (round, label, details) => {
  failures += 1;
  console.error(`[deployment-guide] pass ${round}/6 ✗ ${label}: ${details}`);
};
const requireAll = (round, label, needles, haystack = html) => {
  const missing = needles.filter((needle) => !haystack.includes(needle));
  if (missing.length) fail(round, label, `missing ${missing.join(', ')}`);
  else pass(round, label);
};

// Pass 1 — freshness and authoritative-source coverage.
requireAll(1, 'source freshness and current official documentation', [
  'name="gylio-guide-validated" content="2026-08-23"',
  'hostinger.com/support/5726606-how-to-use-the-vps-dashboard-in-hostinger',
  'ubuntu.com/server/docs/how-to/security/firewalls',
  'nginx.org/en/docs/http/ngx_http_proxy_module.html',
  'pm2.keymetrics.io/docs/usage/startup',
  'certbot.eff.org/instructions',
  'mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster',
  'clerk.com/docs/react/getting-started/quickstart',
  'clerk.com/docs/guides/development/deployment/production',
  'nodejs.org/docs/latest-v24.x/api/cli.html',
]);

// Pass 2 — content topology and completeness.
const stepIds = [...html.matchAll(/id="step-(\d{2})"\s+data-step="\1"/g)].map((match) => match[1]);
const uniqueSteps = new Set(stepIds);
if (stepIds.length !== 24 || uniqueSteps.size !== 24 || stepIds[0] !== '01' || stepIds.at(-1) !== '24') {
  fail(2, '24 ordered unique steps', `found ${stepIds.length} step tags and ${uniqueSteps.size} unique IDs`);
} else {
  pass(2, '24 ordered unique steps');
}
requireAll(2, 'complete local-to-production path', [
  'id="phase-local"', 'id="phase-vps-foundation"', 'id="phase-prod-services"',
  'id="phase-deploy"', 'id="phase-public"', 'id="phase-release"',
  'Local laptop lab', 'Hostinger KVM 1', 'MongoDB Atlas', 'Clerk production',
  'Nginx', 'PM2', 'HTTPS', 'rollback', 'Expected:',
]);

// Pass 3 — command and basic-security safety invariants.
const sshRuleAt = html.indexOf("sudo ufw allow OpenSSH");
const ufwEnableAt = html.indexOf('sudo ufw enable');
if (sshRuleAt < 0 || ufwEnableAt < 0 || sshRuleAt > ufwEnableAt) {
  fail(3, 'safe UFW ordering', 'OpenSSH must be allowed before ufw enable');
} else {
  pass(3, 'safe UFW ordering');
}
requireAll(3, 'deployment safety checks', [
  "sudo ufw allow 'Nginx Full'", 'sudo nginx -t', 'sudo certbot renew --dry-run',
  'Never add a UFW allow rule for port 3001', 'Do not use <code>0.0.0.0/0</code>',
  'VITE_BILLING_ENABLED=false', 'chmod 640', 'databaseReady:true',
]);
for (const forbidden of ['ufw allow 3001', 'npm audit fix --force', 'MONGODB_URI=0.0.0.0/0']) {
  if (html.includes(forbidden)) fail(3, 'forbidden command inventory', `found ${forbidden}`);
}
if (!failures) pass(3, 'forbidden command inventory');

// Pass 4 — ELI5 + accessibility fundamentals.
requireAll(4, 'accessible ELI5 presentation', [
  'viewport-fit=cover', 'class="skip-link"', 'prefers-reduced-motion: reduce',
  'aria-live="polite"', 'min-height: 44px', '<strong>ELI5:</strong>',
  'role="progressbar"', 'aria-label="Deployment progress"',
]);
const eli5Count = (html.match(/<strong>ELI5:<\/strong>/g) || []).length;
if (eli5Count < 20) fail(4, 'ELI5 coverage', `only ${eli5Count} step explanations`);
else pass(4, `ELI5 coverage (${eli5Count} explanations)`);

// Pass 5 — persistence and phone responsiveness.
requireAll(5, 'persistent progress and responsive safeguards', [
  'gylio-deploy-guide-progress-v1', 'gylio-deploy-guide-settings-v1',
  'env(safe-area-inset-top)', 'env(safe-area-inset-bottom)',
  '@media (max-width: 430px)', 'overflow: auto', 'overflow-x: auto',
  'document.documentElement.scrollWidth',
]);

// Pass 6 — standalone artifact, prompts, bibliography and app integration.
requireAll(6, 'standalone guide features', [
  '<style>', '<script>', 'id="agent-prompts"', 'id="bibliography"',
  'System prompt — deployment tutor + skeptical verifier',
  'User prompt — regenerate/repair the complete academy',
  'Run guide self-check', 'Resume next step', 'Print / save PDF',
]);
const externalAssets = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="https?:\/\//gi)];
if (externalAssets.length) fail(6, 'no required CDN JavaScript/CSS', `${externalAssets.length} external script/link assets found`);
else pass(6, 'no required CDN JavaScript/CSS');

// The product footer may be static in index.html or, preferably, rendered
// inside the React/i18next provider tree so it follows the active locale.
const staticFooterLink = appIndex.includes('deployment-guide.html');
const localizedReactFooter =
  utilityFooter.includes('deployment-guide.html') &&
  utilityFooter.includes("t('shell.deploymentAcademy')") &&
  reactEntry.includes("import SiteUtilityFooter") &&
  reactEntry.includes('<SiteUtilityFooter />');
if (!staticFooterLink && !localizedReactFooter) {
  fail(6, 'main-site footer integration', 'neither index.html nor the rendered SiteUtilityFooter links deployment-guide.html');
} else {
  pass(6, localizedReactFooter ? 'localized React footer integration' : 'main-site footer integration');
}

if (failures) {
  console.error(`\n[deployment-guide] FAILED with ${failures} validation issue(s).`);
  process.exit(1);
}
console.log('\n[deployment-guide] All 6 Solarize validation passes are green.');
