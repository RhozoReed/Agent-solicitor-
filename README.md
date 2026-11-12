# Agent de collecte de fonds

Agent Mistral Workflow qui rédige des **e-mails de sollicitation personnalisés** pour collecter des dons auprès de parrains, mécènes et proches, pour une cause charitable.

Workflow enregistré : `campagne-de-collecte`.

## Fonctionnement

En entrée, la campagne fournit :

- la cause (nom, description), l'objectif en euros et l'échéance,
- le lien de don (HelloAsso, Stripe…),
- la liste des prospects (nom, e-mail, type `proche`/`entreprise`/`institution`, note de contexte),
- la langue des e-mails (`langue`, par défaut `français`), avec surcharge possible par prospect.

Pour chaque prospect, l'agent rédige un e-mail adapté :

- **proche** : angle personnel et impact concret,
- **entreprise** : angle partenariat, visibilité et réduction d'impôt de 60 %,
- **institution** : angle subvention et intérêt général.

Par défaut, le workflow tourne en **mode `dry_run`** : il produit des brouillons et n'envoie rien. L'envoi réel nécessite un connecteur e-mail configuré sur le déploiement.

## Langues supportées

L'agent rédige les e-mails (objet et corps) dans l'une de ces langues : **français, anglais, espagnol, hébreu, allemand, mandarin**.

- langue par défaut de la campagne : champ `langue` (défaut : `français`),
- surcharge par prospect : champ `langue` d'un prospect (ex. un donateur anglophone dans une campagne francophone).

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

## Exemple d'entrée (Dovian Solutions)

```json
{
  "nom_cause": "Dovian Solutions",
  "description_cause": "Dovian Solutions recherche des soutiens financiers pour développer des projets qui résolvent des problèmes de la vie quotidienne dans quatre secteurs : courses alimentaires, santé mentale, carrière et développement professionnel, et connaissance de soi.",
  "objectif_euros": 10000,
  "echeance": "31 mars 2026",
  "lien_don": "https://[lien-de-don-a-creer]",
  "nom_signataire": "L'équipe Dovian Solutions",
  "langue": "français",
  "dry_run": true,
  "prospects": [
    {
      "nom": "Marie Dupont",
      "email": "marie.dupont@exemple.fr",
      "type": "proche",
      "note": "Amie de longue date, sensible à la santé mentale"
    },
    {
      "nom": "Boulangerie Martin",
      "email": "contact@boulangerie-martin.fr",
      "type": "entreprise",
      "note": "Commerçant du quartier, proche du secteur alimentaire",
      "langue": "anglais"
    }
  ]
}
```

> À ajuster : `objectif_euros`, `echeance` et surtout `lien_don` (à créer sur HelloAsso, Stripe ou équivalent).

## Feuille de route

- [x] Workflow de rédaction d'e-mails (dry-run)
- [x] Multilingue : français, anglais, espagnol, hébreu, allemand, mandarin
- [ ] Branchement d'un connecteur e-mail pour l'envoi réel
- [ ] Relances automatiques J+7 / J+14
- [ ] Planification hebdomadaire des campagnes
