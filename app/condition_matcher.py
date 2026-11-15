"""
IGNIS deterministic experimental condition matcher.

This module compares scenario inputs against documented experiment profiles.
It does not predict fire behaviour, calculate risk, or certify safety.
"""

import re

from app.experiment_profiles import get_experiment_profiles


ENGINE_MATCH_TOLERANCES = {
    "airflow_cm_s": {
        "absolute": 0.5,
        "unit": "cm/s",
        "explanation": (
            "IGNIS comparison tolerance: ±0.5 cm/s. "
            "This is a software matching tolerance, not a NASA standard."
        ),
    },
    "oxygen_percent": {
        "absolute": 0.2,
        "unit": "%",
        "explanation": (
            "IGNIS comparison tolerance: ±0.2 percentage points. "
            "This is a software matching tolerance, not a NASA standard."
        ),
    },
}


def _normalize_material(value):
    """Normalize text for conservative material alias matching."""
    value = str(value or "").strip().lower()
    value = value.replace("polytetrafluoroethylene", "ptfe")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _compare_material(requested, profile_material):
    if not requested:
        return {
            "status": "not_supplied",
            "requested": None,
            "documented": profile_material.get("description"),
            "reason": "No material was supplied in the scenario.",
        }

    if profile_material.get("kind") == "unknown":
        return {
            "status": "unknown",
            "requested": requested,
            "documented": profile_material.get("description"),
            "reason": (
                "The profile does not identify a specific material "
                "for an individual experiment."
            ),
        }

    requested_normalized = _normalize_material(requested)

    canonical = _normalize_material(
        profile_material.get("canonical")
    )

    aliases = {
        _normalize_material(alias)
        for alias in profile_material.get("aliases", [])
    }

    if requested_normalized == canonical or requested_normalized in aliases:
        return {
            "status": "exact",
            "requested": requested,
            "documented": profile_material.get("description"),
            "reason": (
                "The requested material matches the documented "
                "material name or a defined material alias."
            ),
        }

    components = {
        _normalize_material(component)
        for component in profile_material.get("components", [])
    }

    requested_tokens = set(requested_normalized.split())

    if requested_tokens and requested_tokens.intersection(components):
        matched_components = sorted(
            requested_tokens.intersection(components)
        )

        return {
            "status": "partial",
            "requested": requested,
            "documented": profile_material.get("description"),
            "reason": (
                "The requested material shares a component with "
                "the documented material, but does not establish "
                "an exact composition match."
            ),
            "shared_components": matched_components,
        }

    return {
        "status": "mismatch",
        "requested": requested,
        "documented": profile_material.get("description"),
        "reason": (
            "The requested material does not match the documented "
            "material or its listed components."
        ),
    }


def _compare_numeric(field, requested, documented):
    if requested is None:
        return {
            "status": "not_supplied",
            "requested": None,
            "documented": documented.get("description"),
            "reason": "This condition was not supplied.",
        }

    kind = documented.get("kind")
    tolerance = ENGINE_MATCH_TOLERANCES[field]["absolute"]

    if kind == "unknown":
        return {
            "status": "unknown",
            "requested": requested,
            "documented": documented.get("description"),
            "reason": (
                "The individual experimental record does not "
                "provide this condition."
            ),
        }

    if kind == "exact":
        reference = float(documented["value"])
        difference = abs(float(requested) - reference)

        status = (
            "exact"
            if difference <= tolerance
            else "mismatch"
        )

        return {
            "status": status,
            "requested": requested,
            "documented": reference,
            "difference": round(difference, 6),
            "tolerance": tolerance,
            "reason": (
                "The requested value is within the IGNIS comparison "
                "tolerance of the documented value."
                if status == "exact"
                else "The requested value differs from the documented value "
                     "beyond the IGNIS comparison tolerance."
            ),
        }

    if kind == "range":
        minimum = float(documented["minimum"])
        maximum = float(documented["maximum"])

        inside = minimum - tolerance <= requested <= maximum + tolerance

        return {
            "status": "exact" if inside else "mismatch",
            "requested": requested,
            "documented_range": [minimum, maximum],
            "tolerance": tolerance,
            "reason": (
                "The requested value falls within the documented "
                "experimental range, allowing the stated IGNIS tolerance."
                if inside
                else "The requested value falls outside the documented "
                     "experimental range and its IGNIS tolerance."
            ),
        }

    if kind == "approximate":
        reference = float(documented["value"])
        documented_tolerance = float(
            documented.get("tolerance", tolerance)
        )
        allowed_difference = max(tolerance, documented_tolerance)
        difference = abs(float(requested) - reference)

        status = (
            "exact"
            if difference <= allowed_difference
            else "mismatch"
        )

        return {
            "status": status,
            "requested": requested,
            "documented_approximate_value": reference,
            "documented_tolerance": documented_tolerance,
            "comparison_tolerance": allowed_difference,
            "difference": round(difference, 6),
            "reason": (
                "The requested value falls within the documented "
                "approximate value and comparison tolerance."
                if status == "exact"
                else "The requested value falls outside the documented "
                     "approximate value and comparison tolerance."
            ),
        }

    if kind == "upper_bound":
        maximum = float(documented["maximum"])
        inside = requested <= maximum + tolerance

        return {
            "status": "contextual" if inside else "mismatch",
            "requested": requested,
            "documented_maximum": maximum,
            "reason": (
                "The requested value is within the stated equipment "
                "capability. This is not evidence that an individual "
                "experiment was performed at this value."
                if inside
                else "The requested value exceeds the documented "
                     "equipment capability."
            ),
        }

    if kind == "upper_bound_exclusive":
        maximum = float(documented["maximum_exclusive"])
        inside = requested < maximum

        return {
            "status": "contextual" if inside else "mismatch",
            "requested": requested,
            "documented_upper_bound_exclusive": maximum,
            "reason": (
                "The requested value falls within the investigation-level "
                "oxygen range. No individual test concentration is "
                "established by this profile."
                if inside
                else "The requested value is not below the documented "
                     "oxygen upper bound."
            ),
        }

    return {
        "status": "unknown",
        "requested": requested,
        "documented": documented.get("description"),
        "reason": "The documented numeric condition uses an unsupported format.",
    }


def _compare_flow(requested, documented):
    if requested is None:
        return {
            "status": "not_supplied",
            "requested": None,
            "documented": documented.get("description"),
            "reason": "Flow configuration was not supplied.",
        }

    kind = documented.get("kind")

    if kind == "unknown":
        return {
            "status": "unknown",
            "requested": requested,
            "documented": documented.get("description"),
            "reason": (
                "The individual experiment record does not establish "
                "its directional flow configuration."
            ),
        }

    if kind == "exact":
        reference = documented.get("value")
        matched = requested == reference

        return {
            "status": "exact" if matched else "mismatch",
            "requested": requested,
            "documented": reference,
            "reason": (
                "The flow configuration matches the documented experiment."
                if matched
                else "The requested flow configuration differs from "
                     "the documented experiment."
            ),
        }

    if kind == "choices":
        choices = documented.get("values", [])
        matched = requested in choices

        return {
            "status": "contextual" if matched else "mismatch",
            "requested": requested,
            "documented_choices": choices,
            "reason": (
                "This configuration was studied within the investigation, "
                "but no individual run is identified by this profile."
                if matched
                else "The requested configuration is not among the "
                     "documented investigation configurations."
            ),
        }

    return {
        "status": "unknown",
        "requested": requested,
        "documented": documented.get("description"),
        "reason": "The documented flow condition cannot be compared.",
    }


def _overall_status(profile, conditions):
    record_level = profile.get("record_level")

    assessed = [
        item["status"]
        for item in conditions.values()
        if item["status"] != "not_supplied"
    ]

    if not assessed:
        return "not_assessed"

    if record_level == "investigation_metadata":
        if "mismatch" in assessed:
            return "partial"
        return "contextual"

    if all(status == "exact" for status in assessed):
        return "exact"

    if "exact" in assessed or "partial" in assessed:
        return "partial"

    if "contextual" in assessed:
        return "contextual"

    if all(status == "mismatch" for status in assessed):
        return "no_match"

    if all(status == "unknown" for status in assessed):
        return "insufficient_data"

    if "mismatch" in assessed:
        return "partial"

    return "insufficient_data"


def _build_condition_coverage(conditions, profile):
    """Describe comparison coverage separately from match quality."""

    requested = {
        key: item
        for key, item in conditions.items()
        if item.get("status") != "not_supplied"
    }

    comparable_statuses = {
        "exact", "partial", "mismatch", "contextual"
    }

    comparable = {
        key: item
        for key, item in requested.items()
        if item.get("status") in comparable_statuses
    }

    status_counts = {
        status: sum(
            item.get("status") == status
            for item in conditions.values()
        )
        for status in (
            "exact",
            "partial",
            "mismatch",
            "contextual",
            "unknown",
            "not_supplied",
        )
    }

    undocumented = [
        key
        for key in conditions
        if profile.get(key, {}).get("kind") == "unknown"
    ]

    requested_count = len(requested)
    comparable_count = len(comparable)

    return {
        "requested_condition_count": requested_count,
        "comparable_condition_count": comparable_count,
        "exact_condition_count": status_counts["exact"],
        "partial_condition_count": status_counts["partial"],
        "mismatch_condition_count": status_counts["mismatch"],
        "contextual_condition_count": status_counts["contextual"],
        "unknown_requested_condition_count": status_counts["unknown"],
        "not_supplied_condition_count": status_counts["not_supplied"],
        "undocumented_profile_conditions": undocumented,
        "coverage_label": (
            f"{comparable_count} of {requested_count} supplied "
            "conditions comparable"
        ),
        "coverage_complete_for_supplied_conditions": (
            requested_count == comparable_count
        ),
    }


def match_experiment_profile(scenario, profile):
    """Compare one scenario against one documented experiment profile."""

    conditions = {
        "material": _compare_material(
            scenario.get("material"),
            profile.get("material", {}),
        ),
        "oxygen_percent": _compare_numeric(
            "oxygen_percent",
            scenario.get("oxygen_percent"),
            profile.get("oxygen_percent", {}),
        ),
        "airflow_cm_s": _compare_numeric(
            "airflow_cm_s",
            scenario.get("airflow_cm_s"),
            profile.get("airflow_cm_s", {}),
        ),
        "flow_configuration": _compare_flow(
            scenario.get("flow_configuration"),
            profile.get("flow_configuration", {}),
        ),
    }

    overall = _overall_status(profile, conditions)
    coverage = _build_condition_coverage(conditions, profile)

    return {
        "profile_id": profile.get("profile_id"),
        "investigation_id": profile.get("investigation_id"),
        "investigation_name": profile.get("investigation_name"),
        "record_name": profile.get("record_name"),
        "record_level": profile.get("record_level"),
        "pillar": profile.get("pillar"),
        "environment": profile.get("environment"),
        "match_status": overall,
        "match_scope": (
            "supplied_conditions_only"
            if overall == "exact"
            else "documented_condition_comparison"
        ),
        "coverage": coverage,
        "conditions": conditions,
        "additional_documented_conditions": profile.get(
            "additional_conditions", {}
        ),
        "source": profile.get("source", {}),
        "limitations": profile.get("limitations", []),
        "matching_tolerances": ENGINE_MATCH_TOLERANCES,
    }


def match_scenario_to_experiments(scenario):
    """Match a validated scenario against relevant documented profiles."""

    profiles = get_experiment_profiles()
    results = []

    for profile in profiles:
        if (
            scenario.get("pillar") != "All"
            and profile.get("pillar") != scenario.get("pillar")
        ):
            continue

        environment = scenario.get("environment", "any")

        if (
            environment != "any"
            and profile.get("environment") != environment
        ):
            continue

        results.append(
            match_experiment_profile(scenario, profile)
        )

    priority = {
        "exact": 0,
        "partial": 1,
        "contextual": 2,
        "insufficient_data": 3,
        "no_match": 4,
        "not_assessed": 5,
    }

    results.sort(
        key=lambda item: (
            priority.get(item["match_status"], 99),
            item["investigation_id"],
            item["profile_id"],
        )
    )

    return {
        "matching_method": "deterministic_documented_condition_comparison",
        "profile_count": len(results),
        "results": results,
        "limitations": [
            "A condition match does not predict fire behaviour or establish safety.",
            "Investigation-level context is not an individual experimental run.",
            "Unknown conditions are not treated as matches.",
            "IGNIS numeric tolerances are software comparison settings, not NASA standards.",
            "Material component overlap is partial matching, not exact composition equivalence.",
        ],
    }
