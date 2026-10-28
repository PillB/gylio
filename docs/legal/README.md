# Legal pages: source, license and edits

The Terms of Service and Privacy Policy under `src/features/legal/content/` are
the CC0 1.0 boilerplate from
[Tupperbox/Policy-Templates](https://github.com/Tupperbox/Policy-Templates)
(`policies/terms-of-service.md`, `policies/privacy-policy.md`), fetched from `main` on
2026-10-28. CC0 needs no attribution; the license text is kept in
`LICENSE-tupperbox-policy-templates.txt`. The template is not legal advice.

The English edits are applied by `transform.py` (run on the two upstream files) and
each was approved by the owner one at a time:

1. `{{CompanyLegalName}}`, `{{CompanyName}}`, `{{AppName}}`, `{{WebsiteName}}` become "Gylio".
2. Postal-address lines removed; contact is email only.
3. Governing law: Peru; courts of Lima, Peru (Dispute Resolution and Governing Law).
4. "Support server" references replaced by support@gylio.app; Discord contact heading and
   the "#announcements channel" phrase dropped; the update notice no longer mentions an announcement.
5. Tupperbox example data lists, Discord sentences and sections removed (data lists stay empty).
6. Payment: Stripe becomes Paddle; Patreon, Discord and the FAQ-link paragraph removed.
7. `{{CopyrightEmail}}` becomes support@gylio.app; the "send a letter" sentence is removed.
8. Spanish (es-PE) is a sentence-for-sentence translation, not an official or lawyer-reviewed text.
9. All `<!-- ... -->` template comments removed.
10. Counter-notice court wording: "the courts of Lima, Peru" in place of the US court / "District of {{YourState}}".

Smallest consequential edits, also listed for review: "Discord bot" became "app"; "bot and website"
and "bot or website" lost the word "bot"; one clause about posting to "a public Discord server" was removed.
Upstream has an unclosed comment in the counter-notice clause, which the script repairs.

The page shows "Last updated" from `LEGAL_LAST_UPDATED` in `legalDocs.ts`.
