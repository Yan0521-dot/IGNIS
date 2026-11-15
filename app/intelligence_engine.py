"""
IGNIS Spacecraft Fire Safety Intelligence Engine.

Current version:
- Deterministic investigation retrieval
- Evidence classification and availability assessment
- Metadata-aware environment filtering
- Experimental condition matching
- Scientific limitations and traceability
- Scenario input validation

Condition matching compares documented profiles. It does not predict
fire behaviour or establish equivalent experimental outcomes.
"""

from collections import Counter
from copy import deepcopy

from app.condition_matcher import match_scenario_to_experiments


ENGINE_VERSION = "0.2.0"

VALID_PILLARS = {
    "Prevention",
    "Detection",
    "Suppression",
    "Supporting Research",
}

VALID_ENVIRONMENTS = {
    "microgravity",
    "ground",
    "any",
}

VALID_FLOW_CONFIGURATIONS = {
    "opposed-flow",
    "concurrent-flow",
    "no-flow",
    "unknown",
}


class IntelligenceEngineError(ValueError):
    """Raised when an intelligence scenario is invalid."""


def classify_evidence(evidence_type):
    """Classify a record without changing its original evidence type."""

    normalized = str(evidence_type or "").strip().lower()

    if normalized.startswith("measured"):
        return "measured"

    if normalized.startswith("derived"):
        return "derived"

    if normalized in {
        "documented metadata",
        "documented metadata and configuration",
    }:
        return "documented_metadata"

    return "unclassified"


def validate_scenario(scenario):
    """Validate scenario inputs without inventing missing conditions."""

    if not isinstance(scenario, dict):
        raise IntelligenceEngineError(
            "Scenario must be a JSON object."
        )

    pillar = scenario.get("pillar", "All")

    if pillar != "All" and pillar not in VALID_PILLARS:
        raise IntelligenceEngineError(
            "Unsupported fire-safety pillar."
        )

    environment = str(
        scenario.get("environment", "any")
    ).strip().lower()

    if environment not in VALID_ENVIRONMENTS:
        raise IntelligenceEngineError(
            "Environment must be microgravity, ground or any."
        )

    material = scenario.get("material")

    if material is not None:
        if not isinstance(material, str) or not material.strip():
            raise IntelligenceEngineError(
                "Material must be a non-empty string."
            )

    oxygen = scenario.get("oxygen_percent")

    if oxygen is not None:
        try:
            oxygen = float(oxygen)
        except (TypeError, ValueError):
            raise IntelligenceEngineError(
                "Oxygen concentration must be numeric."
            )

        if not 0 <= oxygen <= 100:
            raise IntelligenceEngineError(
                "Oxygen concentration must be between 0 and 100."
            )

    airflow = scenario.get("airflow_cm_s")

    if airflow is not None:
        try:
            airflow = float(airflow)
        except (TypeError, ValueError):
            raise IntelligenceEngineError(
                "Airflow must be numeric."
            )

        if airflow < 0:
            raise IntelligenceEngineError(
                "Airflow cannot be negative."
            )

    flow_configuration = scenario.get(
        "flow_configuration"
    )

    if flow_configuration is not None:
        flow_configuration = str(
            flow_configuration
        ).strip().lower()

        if flow_configuration not in VALID_FLOW_CONFIGURATIONS:
            raise IntelligenceEngineError(
                "Unsupported flow configuration."
            )

    return {
        "name": str(
            scenario.get("name", "Untitled spacecraft scenario")
        ).strip(),
        "pillar": pillar,
        "environment": environment,
        "material": material.strip() if material else None,
        "oxygen_percent": oxygen,
        "airflow_cm_s": airflow,
        "flow_configuration": flow_configuration,
    }


def _matches_environment(investigation, environment):
    """
    Match the documented investigation environment.

    Prefer the explicit catalogue environment field. Fall back to
    the investigation type only for older records without that field.
    Unknown environments do not qualify for a specific environment
    filter because their classification cannot be established.
    """

    if environment == "any":
        return True

    documented_environment = str(
        investigation.get("environment") or ""
    ).strip().lower()

    if documented_environment not in {"microgravity", "ground"}:
        investigation_type = str(
            investigation.get("type", "")
        ).strip().lower()

        if "microgravity" in investigation_type:
            documented_environment = "microgravity"
        elif "ground" in investigation_type:
            documented_environment = "ground"
        else:
            return False

    return documented_environment == environment


def _source_summary(record):
    source = record.get("source") or {}

    return {
        "provider": source.get("provider"),
        "doi": source.get("doi"),
        "url": source.get("url"),
        "dataset": record.get("dataset"),
    }


def _evidence_summary(record):
    """Preserve source meaning, values, interpretation and limitations."""

    return {
        "id": record.get("id"),
        "evidence_type": record.get("evidence_type"),
        "classification": classify_evidence(
            record.get("evidence_type")
        ),
        "finding": record.get("finding"),
        "value": record.get("value"),
        "unit": record.get("unit"),
        "sample": record.get("sample"),
        "sensor": record.get("sensor"),
        "subject": record.get("subject"),
        "interpretation": record.get("interpretation"),
        "limitation": record.get("limitation"),
        "calculation": record.get("calculation"),
        "source": _source_summary(record),
    }


def _classify_scientific_relevance(investigation, scenario):
    """
    Classify scientific relevance from documented catalogue metadata.

    This is a qualitative IGNIS classification, not a NASA ranking.
    Evidence volume and condition-match status do not affect it.
    """

    research_role = investigation.get("research_role")
    classification_basis = investigation.get("classification_basis")

    if research_role == "direct_fire_safety":
        category = "directly_relevant"
        label = "Directly relevant"
        explanation = (
            classification_basis
            or "The catalogue identifies this as direct spacecraft "
               "fire-safety research."
        )

    elif research_role == "supporting_research":
        category = "supporting_research"
        label = "Supporting research"
        explanation = (
            classification_basis
            or "The catalogue identifies this as research supporting "
               "combustion science or fire-safety interpretation."
        )

    else:
        category = "limited_relevance"
        label = "Limited relevance"
        explanation = (
            "The catalogue does not contain enough documented research-role "
            "information to establish a direct or supporting classification."
        )

    selected_pillar = scenario.get("pillar", "All")
    investigation_pillar = investigation.get("pillar")

    if selected_pillar == "All":
        scope_note = (
            "No single fire-safety pillar was selected. "
            "This category reflects the investigation's documented "
            "research role across the broader fire-safety scope."
        )
    else:
        scope_note = (
            f"The investigation is catalogued under the selected "
            f"{selected_pillar} pillar."
            if investigation_pillar == selected_pillar
            else "The investigation does not match the selected pillar."
        )

    return {
        "category": category,
        "label": label,
        "research_role": research_role or "unclassified",
        "explanation": explanation,
        "scenario_scope": scope_note,
        "classification_basis": classification_basis,
        "method": "documented_catalogue_research_role",
        "is_official_nasa_ranking": False,
    }


def build_intelligence_assessment(
    scenario,
    investigations,
    evidence,
    availability,
):
    """
    Build a traceable, deterministic scientific assessment.

    Scientific relevance, experimental comparability and evidence
    availability are evaluated as separate dimensions.

    This engine does not predict fire outcomes or issue official
    NASA rankings or safety certifications.
    """

    validated = validate_scenario(scenario)

    condition_matching = match_scenario_to_experiments(validated)

    condition_profiles_by_investigation = {}

    for profile_result in condition_matching.get("results", []):
        investigation_id = profile_result.get("investigation_id")

        if investigation_id:
            condition_profiles_by_investigation.setdefault(
                investigation_id, []
            ).append({
                "profile_id": profile_result.get("profile_id"),
                "record_name": profile_result.get("record_name"),
                "record_level": profile_result.get("record_level"),
                "match_status": profile_result.get("match_status"),
                "coverage": profile_result.get("coverage"),
                "source": profile_result.get("source"),
            })

    if not isinstance(investigations, list):
        raise IntelligenceEngineError(
            "Investigation data must be a list."
        )

    if not isinstance(evidence, list):
        raise IntelligenceEngineError(
            "Evidence data must be a list."
        )

    availability_records = (
        availability.get("investigations", [])
        if isinstance(availability, dict)
        else []
    )

    availability_by_id = {
        item.get("id"): item
        for item in availability_records
        if isinstance(item, dict) and item.get("id")
    }

    selected_investigations = []

    for investigation in investigations:
        if not isinstance(investigation, dict):
            continue

        if (
            validated["pillar"] != "All"
            and investigation.get("pillar") != validated["pillar"]
        ):
            continue

        if not _matches_environment(
            investigation,
            validated["environment"],
        ):
            continue

        selected_investigations.append(investigation)

    results = []

    total_classifications = Counter()
    relevance_classifications = Counter()
    total_evidence = 0
    investigations_without_local_evidence = []

    for investigation in selected_investigations:
        investigation_id = investigation.get("id")

        records = [
            record
            for record in evidence
            if isinstance(record, dict)
            and record.get("investigation") == investigation_id
        ]

        summarized_records = []

        for record in records:
            summary = _evidence_summary(record)
            summarized_records.append(summary)
            total_classifications[
                summary["classification"]
            ] += 1

        total_evidence += len(summarized_records)

        availability_record = availability_by_id.get(
            investigation_id, {}
        )

        evidence_level = availability_record.get(
            "evidence_level",
            "not_classified",
        )

        if not summarized_records:
            investigations_without_local_evidence.append(
                investigation_id
            )

        scientific_relevance = _classify_scientific_relevance(
            investigation,
            validated,
        )

        relevance_classifications[
            scientific_relevance["category"]
        ] += 1

        condition_profiles = condition_profiles_by_investigation.get(
            investigation_id, []
        )

        if condition_profiles:
            condition_comparability = {
                "status": "assessed",
                "profile_count": len(condition_profiles),
                "profiles": condition_profiles,
                "note": (
                    "Comparability is reported separately for each "
                    "documented experimental profile. Profile-level "
                    "results are not merged into an investigation-level "
                    "experimental outcome."
                ),
            }
        else:
            condition_comparability = {
                "status": "not_assessed",
                "profile_count": 0,
                "profiles": [],
                "note": (
                    "No documented experimental profile is currently "
                    "available in the IGNIS condition matcher for this "
                    "investigation. This is not a finding of no match."
                ),
            }

        results.append({
            "investigation_id": investigation_id,
            "name": investigation.get("name"),
            "full_name": investigation.get("full_name"),
            "pillar": investigation.get("pillar"),
            "investigation_type": investigation.get("type"),
            "environment": investigation.get("environment"),
            "research_role": investigation.get("research_role"),
            "related_investigations": investigation.get(
                "related_investigations", []
            ),
            "classification_basis": investigation.get(
                "classification_basis"
            ),
            "scientific_relevance": scientific_relevance,
            "condition_comparability": condition_comparability,
            "platform": investigation.get("platform"),
            "focus": investigation.get("focus"),
            "relevance": investigation.get("relevance"),
            "doi": investigation.get("doi"),
            "source_url": investigation.get("url"),
            "evidence_availability": evidence_level,
            "evidence_count": len(summarized_records),
            "evidence": summarized_records,
            "assessment_note": (
                "Investigation classification is based on the "
                "documented scientific purpose and IGNIS catalogue "
                "rationale. Experimental condition matching is "
                "assessed separately against available documented "
                "profiles. This is not an official NASA ranking."
            ),
        })

    requested_conditions = {
        "material": validated["material"],
        "oxygen_percent": validated["oxygen_percent"],
        "airflow_cm_s": validated["airflow_cm_s"],
        "flow_configuration": validated["flow_configuration"],
    }

    supplied_conditions = {
        key: value
        for key, value in requested_conditions.items()
        if value is not None
    }

    limitations = [
        "Evidence retrieval is based on investigation pillar "
        "and documented investigation environment.",
        "Condition matching compares supplied scenario values against "
        "the currently documented experimental profiles; it does not "
        "establish equivalent experimental outcomes.",
        "Retrieved evidence does not establish that the proposed "
        "spacecraft scenario will produce the same outcomes.",
        "Derived measurements must not be interpreted as direct "
        "measurements of flame intensity or detector performance "
        "unless the source explicitly supports that interpretation.",
        "Investigations without locally available numerical results "
        "must not be treated as measured experimental evidence.",
    ]

    return {
        "engine": {
            "name": "IGNIS Spacecraft Fire Safety Intelligence Engine",
            "version": ENGINE_VERSION,
            "mode": "deterministic_evidence_retrieval",
        },
        "status": "success",
        "scenario": validated,
        "assessment": {
            "pillar": validated["pillar"],
            "environment": validated["environment"],
            "investigation_count": len(results),
            "scientific_relevance_counts": {
                "directly_relevant": relevance_classifications[
                    "directly_relevant"
                ],
                "supporting_research": relevance_classifications[
                    "supporting_research"
                ],
                "limited_relevance": relevance_classifications[
                    "limited_relevance"
                ],
            },
            "relevance_method": (
                "Qualitative IGNIS classification based on documented "
                "catalogue research roles; not an official NASA ranking."
            ),
            "evidence_count": total_evidence,
            "measured_evidence_count": (
                total_classifications["measured"]
            ),
            "derived_evidence_count": (
                total_classifications["derived"]
            ),
            "documented_metadata_count": (
                total_classifications["documented_metadata"]
            ),
            "unclassified_evidence_count": (
                total_classifications["unclassified"]
            ),
            "investigations_without_local_evidence": (
                investigations_without_local_evidence
            ),
            "condition_matching_status": "assessed",
            "conditions_supplied": supplied_conditions,
            "condition_profiles_compared": condition_matching["profile_count"],
            "exact_condition_matches": sum(
                item["match_status"] == "exact"
                for item in condition_matching["results"]
            ),
            "partial_condition_matches": sum(
                item["match_status"] == "partial"
                for item in condition_matching["results"]
            ),
            "contextual_condition_matches": sum(
                item["match_status"] == "contextual"
                for item in condition_matching["results"]
            ),
        },
        "results": results,
        "condition_matching": condition_matching,
        "limitations": limitations + condition_matching["limitations"],
        "traceability": {
            "evidence_records_include_source_references": True,
            "original_evidence_types_preserved": True,
            "unsupported_predictions_generated": False,
        },
    }
