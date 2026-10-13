# Newsletter — préparation et activation

Le formulaire et les fonctions sont préparés pour Resend et PostgreSQL. **Aucun envoi réel ni base de production n’a été testé.** Les fonctions restent indisponibles tant que les deux interrupteurs d’activation ne sont pas vrais. L’archive pilote reste inchangée et non éligible.

## Connexions requises

1. Resend : domaine expéditeur vérifié, clé limitée à l’envoi (`RESEND_API_KEY`), expéditeur (`NEWSLETTER_FROM`). Désactiver le suivi des ouvertures et des clics. Configurer et contrôler les rebonds/plaintes avant de lancer une campagne publique ; supprimer les abonnés concernés via un accès administratif privé.
2. PostgreSQL privé en région UE (par exemple Neon), connexion TLS vérifiée (`DATABASE_URL`, avec `sslmode=verify-full`, exigé par le code). Exécuter `db/newsletter.sql` avec le rôle de migration ; utiliser un rôle applicatif restreint aux trois tables, sans accès public. Définir une politique de sauvegarde et d’expiration des sauvegardes.
3. Vercel : renseigner les variables de `.env.example`. Générer `NEWSLETTER_SECRET` aléatoirement (au moins 32 octets) et renseigner la même valeur comme secret GitHub Actions. Ne jamais coller de secret dans le chat. Le connecteur Vercel a refusé l’inspection des intégrations du compte `sandra-9783` ; accès à rétablir avant configuration.
4. Compléter `confidentialite.html` : identité du responsable, contact réel, hébergeur de base, durées des journaux prestataires et sauvegardes, lieux de traitement et garanties des transferts. Vérifier les accords Vercel/Resend/base. Renseigner `NEWSLETTER_CONTACT`. Mettre `NEWSLETTER_PRIVACY_READY=true` seulement après ces vérifications, puis `NEWSLETTER_ENABLED=true`.

## Publication et validation

Le générateur et le workflow de publication restent identiques, hormis l’insertion du formulaire dans les futurs numéros. Ils ne valident pas les faits. Après revue indépendante des sources, exécuter `python scripts/validate_edition.py YYYY-MM-DD`, puis committer le catalogue. Une édition bloquée ou sans trois articles archivés ne peut pas être validée par ce script. Ne pas modifier `verifiedNews` automatiquement dans le générateur.

Le workflow newsletter appelle la production toutes les 30 minutes. Il ne traite que le dernier numéro, avec `status=validee`, `verifiedNews=true` et date de validation. Il vérifie le catalogue public et l’empreinte du HTML public contre les fichiers du déploiement. Seuls les abonnés confirmés avant validation sont inclus. Lots de 8 ; les exécutions suivantes terminent la campagne. Aucun rattrapage des archives pour les nouveaux abonnés.

Une clé unique édition/abonné protège les relances et exécutions concurrentes. `accepted` signifie accepté par l’API Resend, **pas livré**. Les états `sending` restés après interruption et `uncertain` ne sont jamais relancés automatiquement : rechercher l’envoi dans les journaux Resend avant toute correction administrative. Ce choix peut omettre un message plutôt que provoquer un doublon. La clé d’idempotence Resend apporte une protection supplémentaire, limitée dans le temps.

## Recette avant activation publique

Installer les dépendances et lancer `node --test tests/*.test.js`. Appliquer la migration à une base de test puis contrôler : inscription, réception réelle du message, confirmation, exclusion des non-confirmés, suppression, expiration et limites de demandes. Sur un déploiement de test, contrôler le formulaire sur mobile et ordinateur.

Tester un numéro fictif validé sur un environnement isolé avec un destinataire de test consenti : publication absente/différente → aucun appel Resend ; publication identique → ID Resend enregistré ; deuxième exécution → aucun doublon ; édition bloquée/non vérifiée → aucun appel. Vérifier ensuite le statut de livraison dans Resend et la réception dans la boîte. Ne pas déclarer la recette réussie sur la seule base des tests simulés.

Les tests automatisés fournis utilisent des doubles de la base et du transport : ils ne prouvent ni le déploiement, ni le stockage réel, ni la livraison. Les garanties RGPD dépendent également des informations de l’éditeur et de la configuration des prestataires.
