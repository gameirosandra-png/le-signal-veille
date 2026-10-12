# LE SIGNAL.

Journal hebdomadaire interactif sur l'IA, le no-code, le vibe coding et les sujets produit.

## Publication automatique

Workflow : `.github/workflows/publier.yml`. Il s'exécute le lundi à 09:00 **Europe/Paris**, été comme hiver, et peut être lancé manuellement dans **GitHub → Actions → LE SIGNAL — publication hebdomadaire → Run workflow**.

**Configuration requise avant le premier lancement :**

1. Créer une clé API OpenAI avec une limite de dépenses adaptée sur https://platform.openai.com/api-keys.
2. Dans GitHub → dépôt `le-signal-veille` → Settings → Secrets and variables → Actions → New repository secret, créer le secret `OPENAI_API_KEY` et y coller la clé. Ne jamais mettre cette clé dans un fichier ou dans le chat.
3. Dans GitHub → Settings → Actions → General, vérifier que le workflow dispose de la permission **Read and write permissions** pour publier les fichiers (ou que la politique du dépôt permet le `GITHUB_TOKEN` en écriture).
4. Lancer une première exécution manuelle, vérifier les logs, le commit, la nouvelle archive et la publication Vercel.

La génération utilise l'API OpenAI avec recherche web, facturée **séparément de ChatGPT**. Modèle par défaut : `gpt-4.1-mini` (modifiable avec `OPENAI_MODEL` au niveau du workflow). La tâche ChatGPT « Veille IA & No-code » existe toujours, mais **ne fournit pas directement son HTML à GitHub** : le workflow utilise son propre générateur et risque donc de produire une veille distincte. Éviter les doubles publications et aligner les prompts si nécessaire.

## Organisation

- `index.html` : édition affichée à l'accueil.
- `editions/YYYY-MM-DD.html` : archives conservées.
- `editions/index.json` : catalogue des numéros.
- `data/sujets.json` : registre des sujets publiés.
- `scripts/publish.py` : collecte des nouveautés, contrôle de base des doublons, génération HTML, mise à jour du registre.

La publication n'a lieu que si le générateur retient de nouveaux sujets. Le filtrage automatique des doublons compare ID, URL et titre ; il ne garantit pas l'absence de doublons sémantiques. Les sources et faits doivent être vérifiés éditorialement : les réponses du modèle peuvent être inexactes. Le catalogue marque donc les numéros automatiques `verifiedNews: false` tant qu'une vérification indépendante n'a pas eu lieu.

## État

GitHub est connecté au projet Vercel existant `le-signal-veille` ; un déploiement Git est confirmé. L'automatisation **ne sera complètement opérationnelle qu'après ajout du secret, vérification des permissions et premier test réussi**. Discord n'est pas connecté.
