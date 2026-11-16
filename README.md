# LE SIGNAL.

Journal hebdomadaire interactif sur l'IA, le no-code, le vibe coding et les sujets produit.

## Publication automatique

GitHub Actions est le circuit de publication de LE SIGNAL. Le déclenchement est unique dans le dépôt, le lundi à 09:00 Europe/Paris, et une exécution manuelle avec `test_mode` produit un aperçu sans publication. Un changement du prompt ou du script de collecte sur main déclenche aussi un essai sans publication. La newsletter ne possède aucun calendrier d’envoi.

Le workflow lit le prompt intégral dans `PROMPT-MAITRE.md`, consulte les archives et le registre Git, puis soumet les faits à deux appels distincts de l’API OpenAI avec recherche web. Les URL doivent figurer dans les résultats de recherche des deux passages. Une revue contradictoire compare le brouillon aux sources et compare les événements à l’historique. Les contrôles déterministes vérifient ensuite les dates, métadonnées, doublons et conditions de publication. Un échec bloque le commit et laisse la dernière édition en ligne.

Configurer `OPENAI_API_KEY` dans GitHub Actions. Chaque passage est limité à 18 appels d’outil et 18 000 jetons de sortie. Après un refus de la revue contradictoire, une seule nouvelle collecte avec revue est autorisée. Le maximum est donc de quatre appels API par exécution. Les appels API sont facturés sur le compte API existant, indépendamment de ChatGPT. Le modèle par défaut est GPT-5.4 mini sur le compte API existant. Le coût comprend les recherches et les jetons traités. Le modèle de raisonnement peut être changé via OPENAI_MODEL.

L’édition validée est publiée sur `main` avec son dossier de revue, l’accueil, l’archive et le registre. Vercel est connecté à cette branche. Le workflow compare les fichiers servis par le domaine public aux fichiers produits. Le HTML autonome `Le_Signal_YYYY-MM-DD.html` et le rapport de revue sont disponibles dans les artefacts du lancement. Le formulaire d’abonnement reste sur le site public.

Pour restaurer le dernier état valide, relever le commit du numéro à retirer et créer un commit de réversion sur `main`. Attendre le déploiement Vercel et contrôler l’accueil et le catalogue publics. Examiner les erreurs GitHub Actions avant de relancer le workflow.
