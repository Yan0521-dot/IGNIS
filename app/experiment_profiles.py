"""
IGNIS experimental condition profiles.

These profiles describe documented sample-level or investigation-level
conditions. They are not predictive models or fire-safety certifications.
"""

from copy import deepcopy


EXPERIMENT_PROFILES = [
    {
        "profile_id": "PSI98-SAFFIRE-I-SAMPLE-1",
        "investigation_id": "PSI-98",
        "investigation_name": "SAFFIRE-I",
        "record_name": "Sample 1",
        "record_level": "sample_level",
        "environment": "microgravity",
        "pillar": "Prevention",

        "material": {
            "canonical": "sibal_composite_fabric",
            "description": (
                "SIBAL composite fabric: 75% cotton and "
                "25% fiberglass by weight"
            ),
            "components": ["cotton", "fiberglass"],
            "aliases": [
                "sibal",
                "sibal fabric",
                "SIBAL composite",
                "cotton fiberglass composite",
                "SIBAL composite fabric (75% cotton, 25% fiberglass)",
            ],
        },

        "oxygen_percent": {
            "kind": "range",
            "minimum": 21.5,
            "maximum": 21.7,
            "description": "Reported condition: approximately 21.5–21.7%",
        },

        "airflow_cm_s": {
            "kind": "exact",
            "value": 20.0,
            "description": "Documented airflow velocity",
        },

        "flow_configuration": {
            "kind": "exact",
            "value": "concurrent-flow",
        },

        "additional_conditions": {
            "burn_time_seconds": 420,
            "ignition_power_watts": 182,
            "ignition_time_seconds": 8,
        },

        "source": {
            "provider": "NASA Physical Sciences Informatics",
            "doi": "10.60555/0t15-1z43",
            "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-98",
        },

        "limitations": [
            "SIBAL is a cotton/fiberglass composite, not pure cotton.",
            "These conditions describe Sample 1, not every SAFFIRE experiment.",
            "The recorded burn time is not a prediction for another scenario.",
        ],
    },

    {
        "profile_id": "PSI98-SAFFIRE-I-SAMPLE-2",
        "investigation_id": "PSI-98",
        "investigation_name": "SAFFIRE-I",
        "record_name": "Sample 2",
        "record_level": "sample_level",
        "environment": "microgravity",
        "pillar": "Prevention",

        "material": {
            "canonical": "sibal_composite_fabric",
            "description": (
                "SIBAL composite fabric: 75% cotton and "
                "25% fiberglass by weight"
            ),
            "components": ["cotton", "fiberglass"],
            "aliases": [
                "sibal",
                "sibal fabric",
                "SIBAL composite",
                "cotton fiberglass composite",
                "SIBAL composite fabric (75% cotton, 25% fiberglass)",
            ],
        },

        "oxygen_percent": {
            "kind": "approximate",
            "value": 21.5,
            "tolerance": 0.2,
            "description": "Approximately 21.5% oxygen",
        },

        "airflow_cm_s": {
            "kind": "exact",
            "value": 20.0,
            "description": "Documented airflow velocity",
        },

        "flow_configuration": {
            "kind": "exact",
            "value": "opposed-flow",
        },

        "additional_conditions": {
            "burn_time_seconds": 70,
            "ignition_power_watts": 182,
            "ignition_time_seconds": 8,
        },

        "source": {
            "provider": "NASA Physical Sciences Informatics",
            "doi": "10.60555/0t15-1z43",
            "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-98",
        },

        "limitations": [
            "SIBAL is a cotton/fiberglass composite, not pure cotton.",
            "Oxygen is represented as an approximate condition.",
            "Sample 1 and Sample 2 differ in flow configuration and reported burn time; this alone does not establish flow direction as the cause.",
            "The recorded burn time is not a prediction for another scenario.",
        ],
    },

    {
        "profile_id": "PSI101-SAME-R-T11",
        "investigation_id": "PSI-101",
        "investigation_name": "SAME-R",
        "record_name": "T11 / Test 64T / SAME #111",
        "record_level": "individual_test",
        "environment": "microgravity",
        "pillar": "Detection",

        "material": {
            "canonical": "teflon",
            "description": "Teflon",
            "components": ["teflon"],
            "aliases": [
                "ptfe",
                "polytetrafluoroethylene",
            ],
        },

        "oxygen_percent": {
            "kind": "unknown",
            "description": (
                "No individual T11 oxygen concentration "
                "is established in the extracted record."
            ),
        },

        "airflow_cm_s": {
            "kind": "exact",
            "value": 2.0,
            "description": "T11 inlet velocity",
        },

        "flow_configuration": {
            "kind": "unknown",
            "description": (
                "Directional flow configuration is not "
                "established by the extracted T11 record."
            ),
        },

        "additional_conditions": {
            "duration_seconds": 60,
            "primary_aging_seconds": 11,
            "primary_mixing_seconds": 8,
            "sts_detector_enabled": True,
            "comm_diag_a_enabled": False,
            "comm_diag_b_enabled": True,
            "ptrak_enabled": True,
            "rt_r0": 1.45,
        },

        "source": {
            "provider": "NASA Physical Sciences Informatics / SAME-R Final Report",
            "doi": "10.60555/2np7-jv14",
            "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-101",
        },

        "limitations": [
            "SAME-R is a smoke-aerosol detection investigation, not a solid-fuel flammability test.",
            "Oxygen concentration and directional flow configuration are unavailable for this individual test.",
            "The low STS reading does not establish detector failure.",
        ],
    },

    {
        "profile_id": "PSI25-BASS-II-CONTEXT",
        "investigation_id": "PSI-25",
        "investigation_name": "BASS-II",
        "record_name": "Investigation-level experimental context",
        "record_level": "investigation_metadata",
        "environment": "microgravity",
        "pillar": "Prevention",

        "material": {
            "kind": "unknown",
            "description": (
                "Multiple solid-fuel materials and geometries; "
                "no specific material is matched by this profile."
            ),
        },

        "oxygen_percent": {
            "kind": "upper_bound_exclusive",
            "maximum_exclusive": 21.0,
            "description": (
                "Oxygen conditions varied below 21% through "
                "nitrogen addition."
            ),
        },

        "airflow_cm_s": {
            "kind": "upper_bound",
            "maximum": 40.0,
            "description": (
                "Wind-tunnel airflow capability up to 40 cm/s; "
                "not a specific test value."
            ),
        },

        "flow_configuration": {
            "kind": "choices",
            "values": [
                "opposed-flow",
                "concurrent-flow",
            ],
            "description": (
                "Both configurations were studied; no individual "
                "run is identified in this profile."
            ),
        },

        "additional_conditions": {},

        "source": {
            "provider": "NASA Physical Sciences Informatics",
            "doi": "10.60555/4qc4-de67",
            "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25",
        },

        "limitations": [
            "This is investigation-level metadata, not an individual experimental run.",
            "Up to 40 cm/s is a stated capability, not a measured value for a specific test.",
            "Below 21% oxygen is a documented experimental range, not an individual test concentration.",
            "Material-specific matching is unavailable from this profile.",
        ],
    },
]


def get_experiment_profiles():
    """Return a copy so callers cannot mutate the source profiles."""
    return deepcopy(EXPERIMENT_PROFILES)
