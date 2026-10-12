# LE SIGNAL.

Journal hebdomadaire IA, no-code et vibe coding.

## Structure
- `index.html` : édition courante (site Vercel).
- `editions/YYYY-MM-DD.html` : archives immuables des numéros.
- `editions/index.json` : catalogue chronologique des éditions.
- `data/sujets.json` : registre anti-doublons des sujets publiés.

Chaque nouvelle édition doit être ajoutée aux archives **avant** de remplacer `index.html`. Mettre à jour les deux fichiers JSON dans le même changement. Ne pas considérer la publication automatique comme active avant connexion et test Vercel + alimentation automatique de GitHub.
