from worker.workflows.collecte import (
    LANGUES_SUPPORTEES,
    CampagneInput,
    Prospect,
    _instruction,
    _langue_de,
    _parse_reponse,
)


def _campagne(**kwargs) -> CampagneInput:
    base = dict(
        nom_cause="Repas Solidaire",
        description_cause="Nous distribuons des repas aux personnes sans domicile à Lyon.",
        objectif_euros=3000,
        echeance="30 juin 2026",
        lien_don="https://www.helloasso.com/associations/repas-solidaire",
        nom_signataire="Alex",
        prospects=[],
    )
    base.update(kwargs)
    return CampagneInput(**base)


def test_input_par_defaut_en_dry_run():
    campagne = _campagne()
    assert campagne.dry_run is True


def test_parse_reponse_bien_formee():
    objet, corps = _parse_reponse(
        "OBJET: Soutenez Repas Solidaire\n---\nBonjour,\n\nMerci pour votre aide.",
        "Repas Solidaire",
    )
    assert objet == "Soutenez Repas Solidaire"
    assert corps.startswith("Bonjour,")
    assert "Merci pour votre aide." in corps


def test_parse_reponse_mal_formee_repli():
    objet, corps = _parse_reponse("Un e-mail sans format attendu.", "Repas Solidaire")
    assert objet == "Soutenez Repas Solidaire"
    assert corps == "Un e-mail sans format attendu."


def test_instruction_contient_les_elements_cles():
    prospect = Prospect(nom="Marie Dupont", email="marie@exemple.fr", type="proche", note="")
    texte = _instruction(_campagne(), prospect)
    assert "Repas Solidaire" in texte
    assert "3000 euros" in texte
    assert "30 juin 2026" in texte
    assert "helloasso.com" in texte
    assert "Marie Dupont" in texte


def test_instruction_angle_entreprise():
    prospect = Prospect(
        nom="Boulangerie Martin",
        email="contact@boulangerie.fr",
        type="entreprise",
        note="Commerçant du quartier",
    )
    texte = _instruction(_campagne(), prospect)
    assert "entreprise" in texte
    assert "réduction d'impôt de 60 %" in texte


def test_langue_par_defaut_francais():
    campagne = _campagne()
    prospect = Prospect(nom="Marie", email="m@exemple.fr", type="proche")
    assert _langue_de(campagne, prospect) == "français"
    assert "français" in _instruction(campagne, prospect)


def test_langue_de_campagne_personnalisee():
    campagne = _campagne(langue="anglais")
    prospect = Prospect(nom="John", email="j@exemple.fr", type="proche")
    assert _langue_de(campagne, prospect) == "anglais"
    assert "anglais" in _instruction(campagne, prospect)


def test_langue_surchargee_par_prospect():
    campagne = _campagne(langue="anglais")
    prospect = Prospect(nom="David", email="d@exemple.fr", type="proche", langue="hébreu")
    assert _langue_de(campagne, prospect) == "hébreu"
    assert "hébreu" in _instruction(campagne, prospect)


def test_langues_supportees_couvertes():
    assert set(LANGUES_SUPPORTEES) == {
        "français",
        "anglais",
        "espagnol",
        "hébreu",
        "allemand",
        "mandarin",
    }
