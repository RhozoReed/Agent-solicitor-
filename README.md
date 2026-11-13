# Agent de collecte de fonds

Assistant de campagne de collecte : chat en français, génération de brouillons d'e-mails, dépôt de fichiers, dictée et lecture vocales, et aperçu caméra. L'interface est un prototype web local qui complète le workflow Mistral `campagne-de-collecte`.

## Lancer le prototype

Prérequis : Python 3.11 ou supérieur.

```bash
# Installer les dépendances du projet
python -m pip install -e .

# (Facultatif) activer les réponses générées par Mistral
export MISTRAL_API_KEY="votre-cle-api-mistral"

# Démarrer l'application
uvicorn web.app:app --reload
```

Ouvrez ensuite <http://127.0.0.1:8000>. Sans clé API, l'interface et la préparation de message fonctionnent en mode démo local. Avec `MISTRAL_API_KEY`, le chat et les brouillons sont générés par Mistral. Les brouillons ne sont jamais envoyés automatiquement. Le workflow de collecte conserve son mode `dry_run` par défaut.

## Fonctions du prototype

- Chat conversationnel avec suggestions de démarrage et contexte de campagne.
- Formulaire de campagne (cause, description, objectif, échéance et lien de don) et bouton de préparation d'un brouillon personnalisé.
- Dépôt de fichiers jusqu'à 5 Mo. Les fichiers texte, Markdown, CSV, JSON, HTML et XML sont transmis pour fournir du contexte; les autres formats sont reçus mais leur contenu n'est pas analysé.
- Dictée vocale et lecture des réponses via les API vocales du navigateur, selon la compatibilité et les autorisations disponibles.
- Aperçu caméra local, uniquement après autorisation. La vidéo n'est ni transmise à l'agent ni stockée. Il s'agit d'un aperçu, pas d'un appel vidéo en direct.
- Mode démo sans clé et intégration Mistral facultative côté serveur.

La dictée et la caméra nécessitent généralement localhost ou HTTPS, un navigateur compatible et l'autorisation de l'utilisateur. La disponibilité de la reconnaissance vocale dépend du navigateur.

## Tests

```bash
python -m pip install -e '.[dev]'
python -m pytest -q
```

Le worker et le workflow existants se lancent toujours avec :

```bash
python -m worker.entrypoints.worker
```

Pour le déploiement géré du worker, utilisez `deploy/docker/Dockerfile.worker`. Pour le prototype web, déployez l'application ASGI `web.app:app` avec les dépendances du `pyproject.toml` et configurez `MISTRAL_API_KEY` comme secret d'environnement si vous souhaitez activer l'IA.
