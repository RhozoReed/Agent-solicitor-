"""Agent de collecte de fonds : rédige des e-mails de sollicitation personnalisés.

Workflow Mistral « campagne-de-collecte ». Mode dry_run (par défaut) : produit
uniquement des brouillons, n'envoie rien. L'envoi réel sera branché sur un
connecteur e-mail au moment du déploiement.
"""

from typing import Any

from pydantic import BaseModel, Field

import mistralai.workflows as workflows
from mistralai.workflows.client import get_mistral_client
from mistralai.workflows import Depends

MODELE = "mistral-medium-latest"

LANGUES_SUPPORTEES = [
    "français",
    "anglais",
    "espagnol",
    "hébreu",
    "allemand",
    "mandarin",
]


class Prospect(BaseModel):
    nom: str
    email: str
    type: str = Field(description="proche | entreprise | institution")
    note: str = Field(default="", description="Contexte personnel ou lien avec la cause")
    langue: str | None = Field(
        default=None,
        description=f"Langue de l'e-mail pour ce prospect, parmi : {', '.join(LANGUES_SUPPORTEES)}. Si absent, la langue de la campagne s'applique.",
    )


class CampagneInput(BaseModel):
    nom_cause: str
    description_cause: str
    objectif_euros: int
    echeance: str = Field(description="Date limite, ex. '30 juin 2026'")
    lien_don: str
    nom_signataire: str
    prospects: list[Prospect]
    langue: str = Field(
        default="français",
        description=f"Langue des e-mails, parmi : {', '.join(LANGUES_SUPPORTEES)}",
    )
    dry_run: bool = True


class EmailSollicitation(BaseModel):
    prospect: str
    email: str
    objet: str
    corps: str
    statut: str
    langue: str


def _langue_de(campagne: CampagneInput, prospect: Prospect) -> str:
    return prospect.langue or campagne.langue


def _instruction(campagne: CampagneInput, prospect: Prospect) -> str:
    langue = _langue_de(campagne, prospect)
    return f"""Tu es un expert en collecte de fonds pour des causes solidaires.

Cause : {campagne.nom_cause}
{campagne.description_cause}
Objectif : {campagne.objectif_euros} euros d'ici le {campagne.echeance}.
Lien de don : {campagne.lien_don}
Signataire : {campagne.nom_signataire}

Destinataire : {prospect.nom} ({prospect.type}). Contexte : {prospect.note or "aucun"}.

Rédige un e-mail de sollicitation **intégralement en {langue}** (objet et corps), avec les conventions de politesse usuelles de cette langue :
- maximum 150 mots, ton sincère et direct, sans superlatifs creux
- si le destinataire est une entreprise : angle partenariat, visibilité, réduction d'impôt de 60 %
- sinon : angle personnel et impact concret
- mentionne le lien de don deux fois (corps + signature)
- termine par une question ouverte si entreprise, sinon par un appel au don simple
- n'insère aucune traduction ni note entre parenthèses : l'e-mail est entièrement en {langue}

Réponds EXACTEMENT au format :
OBJET: <ligne d'objet>
---
<corps de l'e-mail>"""


def _parse_reponse(texte: str, nom_cause: str) -> tuple[str, str]:
    if "OBJET:" in texte and "---" in texte:
        objet, corps = texte.split("---", 1)
        return objet.replace("OBJET:", "").strip(), corps.strip()
    return f"Soutenez {nom_cause}", texte.strip()


@workflows.activity()
async def rediger_email(
    campagne: CampagneInput,
    prospect: Prospect,
    client: Any = Depends(get_mistral_client),
) -> EmailSollicitation:
    """Rédige un e-mail de sollicitation personnalisé pour un prospect."""
    reponse = await client.chat.complete_async(
        model=MODELE,
        temperature=0.4,
        messages=[
            {"role": "system", "content": "Tu rédiges des e-mails courts et efficaces."},
            {"role": "user", "content": _instruction(campagne, prospect)},
        ],
    )
    texte = reponse.choices[0].message.content or ""
    objet, corps = _parse_reponse(texte, campagne.nom_cause)
    return EmailSollicitation(
        prospect=prospect.nom,
        email=prospect.email,
        objet=objet,
        corps=corps,
        statut="brouillon" if campagne.dry_run else "a_envoyer",
        langue=_langue_de(campagne, prospect),
    )


@workflows.activity()
async def preparer_envoi(email: EmailSollicitation, dry_run: bool) -> EmailSollicitation:
    """Prépare l'envoi. En dry_run, ne fait rien : l'envoi réel passera par un connecteur e-mail."""
    if dry_run:
        return email
    raise NotImplementedError(
        "L'envoi réel nécessite un connecteur e-mail configuré sur le déploiement."
    )


@workflows.workflow.define(
    name="campagne-de-collecte",
    workflow_display_name="Campagne de collecte de fonds",
    workflow_description=(
        "Rédige des e-mails de sollicitation personnalisés pour une liste de "
        "prospects (parrains, mécènes, proches). Dry-run par défaut."
    ),
)
class CampagneCollecteWorkflow:
    @workflows.workflow.entrypoint
    async def run(self, input: CampagneInput) -> dict:
        brouillons: list[EmailSollicitation] = []
        for prospect in input.prospects:
            email = await rediger_email(input, prospect)
            email = await preparer_envoi(email, input.dry_run)
            brouillons.append(email)
        return {
            "cause": input.nom_cause,
            "objectif_euros": input.objectif_euros,
            "nombre_prospects": len(input.prospects),
            "mode": "dry_run" if input.dry_run else "envoi",
            "emails": [b.model_dump() for b in brouillons],
        }
