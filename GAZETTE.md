# Rubriques de la gazette

Le rendu conserve le thème vert profond/crème/cuivre et ajoute trois formats éditoriaux : sujet phare, exercice court et regard personnel de l’éditrice.

Les rubriques propres à une édition se trouvent dans `data/rubriques.json`, sous son identifiant. Le générateur les intègre à son HTML, qui reste soumis à la validation éditoriale avant l’envoi.

- `signal` choisit l’article mis en avant et ajoute une lecture pratique et le public concerné. Sans sélection manuelle, le premier article est présenté avec son impact existant ; aucun témoignage personnel n’est inventé.
- `practice` décrit un exercice proposé, les prérequis, les étapes minutées, le résultat attendu, les limites gratuites et une source primaire. Vérifier la documentation et la somme des durées avant publication. Un exercice proposé n’est pas présenté comme déjà testé par Sandra.
- `sandra` contient un texte relu et approuvé par Sandra. Seul `approved: true` permet son affichage. Ne jamais activer cette valeur pour un texte non approuvé. Une note d’une ancienne édition n’est pas recyclée dans les suivantes.

Les favoris et la recherche ne ciblent que les cartes d’actualités. Les rubriques éditoriales ne deviennent pas des actualités supplémentaires.

L’édition du 13 octobre a été enrichie après accord sur la note personnelle. Son empreinte HTML a été recalculée, sans changer ses résumés d’e-mail ni son horodatage initial de validation qui détermine les destinataires. L’archive pilote du 12 octobre reste inchangée. Une révision du journal ne déclenche pas une nouvelle campagne pour les destinataires déjà traités.

Pour une nouvelle édition, préparer ses rubriques puis relire l’ensemble avant la validation habituelle. La collecte automatique n’attribue pas de nouvelles opinions personnelles à Sandra et ne reprend pas un ancien exercice comme s’il était nouveau.
