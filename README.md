# Agent de collecte de fonds

Agent Mistral Workflow qui rédige des **e-mails de sollicitation personnalisés** pour collecter des dons auprès de parrains, mécènes et proches, pour une cause charitable.

Workflow enregistré : `campagne-de-collecte`.

## Fonctionnement

En entrée, la campagne fournit :

- la cause (nom, description), l'objectif en euros et l'échéance,
- le lien de don (HelloAsso, Stripe…),
- la liste des prospects (nom, e-mail, type `proche`/`entreprise`/`institution`, note de contexte).

Pour chaque prospect, l'agent rédige un e-mail adapté :

- **proche** : angle personnel et impact concret,
- **entreprise** : angle partenariat, visibilité et réduction d'impôt de 60 %,
- **institution** : angle subvention et intérêt général.

Par défaut, le workflow tourne en **mode `dry_run`** : il produit des brouillons et n'envoie rien. L'envoi réel nécessite un connecteur e-mail configuré sur le déploiement.

## Structure

```
apps/worker/src/worker/
├── entrypoints/worker.py      # point d'entrée du worker (découverte des workflows)
└── workflows/collecte.py      # workflow « campagne-de-collecte » et activités
deploy/docker/Dockerfile.worker  # image pour le déploiement géré Mistral
tests/test_collecte.py           # tests unitaires (parsing, instructions)
```

## Développement local

```bash
cp .env.example .env        # puis renseigner MISTRAL_API_KEY
uv sync --extra dev
uv run pytest
```

Pour lancer le worker localement :

```bash
uv run python -m worker.entrypoints.worker
```

## Déploiement géré

1. Pousser le code sur GitHub.
2. Créer un déploiement sur la branche `main` avec **Dockerfile path** = `deploy/docker/Dockerfile.worker`.
3. Attendre le statut **Active**, puis exécuter `campagne-de-collecte` en `dry_run` avec l'exemple d'entrée ci-dessous.

## Exemple d'entrée

```json
{
  "nom_cause": "Repas Solidaire",
  "description_cause": "Nous distribuons des repas aux personnes sans domicile à Lyon.",
  "objectif_euros": 3000,
  "echeance": "30 juin 2026",
  "lien_don": "https://www.helloasso.com/associations/repas-solidaire",
  "nom_signataire": "Alex",
  "dry_run": true,
  "prospects": [
    {
      "nom": "Marie Dupont",
      "email": "marie.dupont@exemple.fr",
      "type": "proche",
      "note": "Amie de longue date, sensible au sujet"
    },
    {
      "nom": "Boulangerie Martin",
      "email": "contact@boulangerie-martin.fr",
      "type": "entreprise",
      "note": "Commerçant du quartier"
    }
  ]
}
```

## Feuille de route

- [x] Workflow de rédaction d'e-mails (dry-run)
- [ ] Branchement d'un connecteur e-mail pour l'envoi réel
- [ ] Relances automatiques J+7 / J+14
- [ ] Planification hebdomadaire des campagnes
