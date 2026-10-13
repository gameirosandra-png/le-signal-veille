import html

BASE = 'https://le-signal-veille.vercel.app'
DESCRIPTION = 'La gazette gratuite des personnes qui construisent avec l’IA et le no-code. Une sélection sourcée chaque semaine, validée avant publication.'

def social_meta(title, path='/', description=DESCRIPTION, kind='website'):
    esc = lambda value: html.escape(str(value), quote=True)
    tags = [
        '<meta name="description" content="' + esc(description) + '">',
        '<link rel="canonical" href="' + esc(BASE + path) + '">',
        '<meta property="og:locale" content="fr_FR">',
        '<meta property="og:site_name" content="LE SIGNAL.">',
        '<meta property="og:type" content="' + esc(kind) + '">',
        '<meta property="og:title" content="' + esc(title) + '">',
        '<meta property="og:description" content="' + esc(description) + '">',
        '<meta property="og:url" content="' + esc(BASE + path) + '">',
        '<meta property="og:image" content="' + BASE + '/assets/partage-signal.png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="LE SIGNAL. — La gazette IA, no-code et produit, dans ses couleurs vert profond, crème et cuivre.">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(title) + '">',
        '<meta name="twitter:description" content="' + esc(description) + '">',
        '<meta name="twitter:image" content="' + BASE + '/assets/partage-signal.png">',
        '<meta name="twitter:image:alt" content="LE SIGNAL. — La gazette IA, no-code et produit.">',
        '<link rel="apple-touch-icon" sizes="180x180" href="/assets/icone-signal.png">',
    ]
    return '\n'.join(tags)
