import re, sys
src, out, kind = sys.argv[1], sys.argv[2], sys.argv[3]
t = open(src, encoding='utf-8').read()
log = []
def sub(old, new, count=1):
    global t
    n = t.count(old)
    assert n == count, (old[:60], n)
    t = t.replace(old, new)
    log.append((old, new))
def cut_block(start, end_exclusive):
    global t
    i = t.index(start); j = t.index(end_exclusive, i)
    log.append((t[i:j], ''))
    t = t[:i] + t[j:]

# change 9: template comments
t = re.sub(r'<!--.*?-->[ \t]*\n?', lambda m: '' if '(?s)' else '', t, flags=re.S) if False else t
if kind == 'terms':
    i = t.index('<!-- Use your jurisdiction here'); j = t.index(', and that you will accept service')
    log.append((t[i:j], 'the courts of Lima, Peru'))
    t = t[:i] + 'the courts of Lima, Peru' + t[j:]
t = re.sub(r'<!--.*?-->', '', t, flags=re.S)

if kind == 'privacy':
    sub('Contact information and other content provided directly to us via email, phone, mail, Discord message, etc.',
        'Contact information and other content provided directly to us via email, phone, mail, etc.')
    sub(', such as sending your User Content to Discord', '')
    cut_block('### Third-Party Account Identifiers\n\nWhen a user begins', '### Diagnostic Information\n\nDiagnostic information')
    cut_block('In many cases it is necessary to disclose your User Data (for example', '{{CompanyName}} will only share User Data')
    cut_block('Most User Data can be made publicly searchable', '{{CompanyName}} may also disclose User Data to comply')
    cut_block('{{AppName}} does not directly keep accounts', '## How Long We Retain User Data')
    sub('{{AppName}} bot or website', '{{AppName}} website')
    sub('or you can contact us via the [support server]({{SupportServerLink}}) or email us at', 'or you can email us at')
    sub('via an announcement in the [support server]({{SupportServerLink}}) and a prominent notice', 'via a prominent notice')
    cut_block('The best place to contact us regarding issues', 'If you have any questions regarding')
    cut_block('\n\nFor inquiries of a more formal nature', '@@END@@') if False else None
    i = t.index('For inquiries of a more formal nature'); log.append((t[i:], '')); t = t[:i].rstrip() + '\n'
    sub('(/policy/terms-of-service)', '(/terms)')
    sub('Normal operation of bot and website', 'Normal operation of website')
else:
    sub('and the {{AppName}} Discord bot,', 'and the {{AppName}} app,')
    sub("- Otherwise violates Discord's [Terms of Service](https://discord.com/terms) or [Community Guidelines](https://discord.com/guidelines).\n", '')
    sub(' (for example, using a command on Discord)', '')
    sub(' (such as sending content to Discord)', '')
    sub('to third parties like Discord.', 'to third parties.')
    sub(', for example if you post it to a public Discord server or you otherwise elect to make', ' if you elect to make')
    sub(" such as the [support server]({{SupportServerLink}})'s \\#announcements channel,", '')
    sub('by contacting us in the [support server]({{SupportServerLink}}) using', 'by contacting us at [{{PolicyEmail}}](mailto:{{PolicyEmail}}) using')
    sub('such as Stripe', 'such as Paddle and Mercado Pago')
    sub('through {{WebsiteName}}, Patreon, or Discord.', 'through {{WebsiteName}}.')
    cut_block('**Learn More:**', '## Intellectual Property')
    sub('mailto:{{CopyrightEmail}}) or send a letter to:\n\nCopyright Manager of {{CompanyMailingAddress}}\n', 'mailto:{{CopyrightEmail}}).\n')
    sub('brought exclusively in  ,', 'brought exclusively in the courts of Lima, Peru,')
    sub('laws of the State of , without', 'laws of the State of Peru, without')
    sub('federal courts of  hold', 'federal courts of Lima, Peru hold')
    cut_block('### Discord\n', '### Email')
    i = t.index('### Mail'); log.append((t[i:], '')); t = t[:i].rstrip() + '\n'
    sub('/policy/privacy', '/privacy')
    sub('(/privacy)', '(/privacy)')

HOLDER = 'Pablo Illescas'  # change 11: data holder named in the Privacy Policy only
if kind == 'privacy':
    t = t.replace('{{CompanyLegalName}}', HOLDER)
for ph, v in [('{{CompanyLegalName}}','Gylio'),('{{CompanyName}}','Gylio'),('{{AppName}}','Gylio'),('{{WebsiteName}}','Gylio'),
              ('{{PolicyEmail}}','support@gylio.app'),('{{SupportEmail}}','support@gylio.app'),('{{CopyrightEmail}}','support@gylio.app')]:
    t = t.replace(ph, v)
t = re.sub(r'\n{3,}', '\n\n', t).strip() + '\n'
open(out, 'w', encoding='utf-8').write(t)
left = re.findall(r'\{\{[^}]*\}\}|@@\w+@@|Discord|Patreon|Stripe|tupper', t, flags=re.I)
print(kind, 'leftovers:', left)
