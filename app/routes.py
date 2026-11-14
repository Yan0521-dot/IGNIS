
from flask import Blueprint, jsonify, render_template
from pathlib import Path
import pandas as pd
import json
from app.investigations import INVESTIGATIONS

main = Blueprint("main", __name__)

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET = (
    BASE_DIR
    / "datasets"
    / "PSI-98"
    / "Saffire-I Sample 2 Sensor Data Complete TM graphs.xlsx"
)

PLUME_SENSORS = [
    f"Plume Temp {i} (TC{i})"
    for i in range(1, 7)
]

SAMPLE_SENSORS = [
    f"Sample Temp {i} (TC{i + 6})"
    for i in range(1, 7)
]


def load_dataset():
    if not DATASET.exists():
        raise FileNotFoundError(
            f"NASA dataset not found: {DATASET}"
        )

    df = pd.read_excel(
        DATASET,
        sheet_name="Calibrated Data",
        skiprows=[1]
    )

    return df


@main.route("/")
def dashboard():
    return render_template("index.html")


@main.route("/api/dashboard-data")
def dashboard_data():

    try:
        raw = load_dataset()

        total_rows = len(raw)

        # Only use records with valid elapsed timestamps.
        df = raw.dropna(
            subset=["Elapsed Time (s)"]
        ).copy()

        df = df.sort_values(
            "Elapsed Time (s)"
        ).reset_index(drop=True)

        if df.empty:
            raise ValueError("No timestamped telemetry found.")

        # Sampling information
        interval = df["Elapsed Time (s)"].diff().median()

        # Ignition activation
        ignition = df[
            df["Igniter Power Enable"] == 1
        ]

        ignition_start = None
        ignition_end = None

        if not ignition.empty:
            ignition_start = round(
                float(ignition["Elapsed Time (s)"].min()), 3
            )
            ignition_end = round(
                float(ignition["Elapsed Time (s)"].max()), 3
            )

        # Baseline and analysis window
        baseline = df[
            (df["Elapsed Time (s)"] >= 50) &
            (df["Elapsed Time (s)"] < 59.9)
        ]

        analysis = df[
            (df["Elapsed Time (s)"] >= 60) &
            (df["Elapsed Time (s)"] <= 150)
        ]

        sensor_summary = []

        for sensor in PLUME_SENSORS:

            values = analysis.dropna(
                subset=[sensor]
            )

            if values.empty:
                continue

            peak_idx = values[sensor].idxmax()

            baseline_values = baseline[sensor].dropna()

            baseline_avg = (
                float(baseline_values.mean())
                if not baseline_values.empty
                else None
            )

            peak = float(values.loc[peak_idx, sensor])

            sensor_summary.append({
                "sensor": sensor,
                "baseline": (
                    round(baseline_avg, 3)
                    if baseline_avg is not None else None
                ),
                "peak": round(peak, 3),
                "peak_time": round(
                    float(values.loc[peak_idx, "Elapsed Time (s)"]),
                    3
                ),
                "rise": (
                    round(peak - baseline_avg, 3)
                    if baseline_avg is not None else None
                )
            })

        # TC3 threshold analysis in the 60–150 second window
        tc3 = analysis[
            ["Elapsed Time (s)", "Plume Temp 3 (TC3)"]
        ].dropna()

        thresholds = []

        for threshold in [50, 60, 70, 80, 90]:

            above = tc3[
                tc3["Plume Temp 3 (TC3)"] >= threshold
            ]

            thresholds.append({
                "threshold": threshold,
                "readings": int(len(above)),
                "cumulative_seconds": round(
                    len(above) * interval, 3
                ),
                "first_time": (
                    round(float(above["Elapsed Time (s)"].min()), 3)
                    if not above.empty else None
                ),
                "last_time": (
                    round(float(above["Elapsed Time (s)"].max()), 3)
                    if not above.empty else None
                )
            })

        # Downsample telemetry for browser charts
        chart_columns = (
    ["Elapsed Time (s)"]
    + PLUME_SENSORS
    + SAMPLE_SENSORS
)

        step = max(1, len(df) // 600)

        chart_data = df[chart_columns].iloc[::step].copy()

        # Preserve the final measurement
        if chart_data.index[-1] != df.index[-1]:
            chart_data = pd.concat([
                chart_data,
                df.iloc[[-1]][chart_columns]
            ])

        chart_data = chart_data.round(3)

        records = json.loads(
            chart_data.to_json(
                orient="records"
            )
        )

        return jsonify({

            "investigation": {
                "id": "PSI-98",
                "name": "SAFFIRE-I",
                "sample": "Sample 2",
                "doi": "10.60555/0t15-1z43",
                "source": "NASA Physical Sciences Informatics"
            },

            "dataset": {
                "raw_rows": int(total_rows),
                "timestamped_rows": int(len(df)),
                "columns": int(len(raw.columns)),
                "start_time": round(
                    float(df["Elapsed Time (s)"].min()), 3
                ),
                "end_time": round(
                    float(df["Elapsed Time (s)"].max()), 3
                ),
                "sampling_interval": round(
                    float(interval), 5
                ),
                "sampling_frequency_hz": round(
                    1 / interval, 2
                )
            },

            "ignition": {
                "enabled_readings": int(len(ignition)),
                "start": ignition_start,
                "end": ignition_end
            },

            "sensors": sensor_summary,

            "tc3_thresholds": thresholds,

            "telemetry": records

        })

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


@main.route("/investigations")
def investigations_page():
    return render_template("investigations.html")


@main.route("/investigations/<slug>")
def investigation_detail(slug):
    investigation = next(
        (item for item in INVESTIGATIONS if item["slug"] == slug),
        None
    )

    if investigation is None:
        return render_template("404.html"), 404

    return render_template(
        "investigation_detail.html",
        investigation=investigation
    )


@main.route("/api/investigations")
def investigations_api():
    return jsonify({
        "total": len(INVESTIGATIONS),
        "investigations": INVESTIGATIONS
    })



# =========================================
# IGNIS FIRE SAFETY INTELLIGENCE API
# =========================================

@main.route("/api/fire-safety-intelligence")
def fire_safety_intelligence():

    pillar_descriptions = {
        "Prevention": (
            "Research into material flammability, ignition, "
            "flame growth and flame spread."
        ),
        "Detection": (
            "Research into smoke aerosols, particle behaviour "
            "and spacecraft fire detection."
        ),
        "Suppression": (
            "Research into flame extinction and the effectiveness "
            "of gaseous fire suppressants."
        ),
        "Supporting Research": (
            "Ground-based computational research supporting "
            "the interpretation and modelling of combustion."
        )
    }

    pillar_order = [
        "Prevention",
        "Detection",
        "Suppression",
        "Supporting Research"
    ]

    pillars = []

    for pillar in pillar_order:

        records = [
            item for item in INVESTIGATIONS
            if item["pillar"] == pillar
        ]

        investigations = []

        for item in records:

            investigations.append({
                "id": item["id"],
                "name": item["name"],
                "full_name": item["full_name"],
                "slug": item["slug"],
                "focus": item["focus"],
                "type": item["type"],
                "platform": item["platform"],
                "relevance": item["relevance"],
                "url": item["url"],
                "detail_url": f"/investigations/{item['slug']}"
            })

        pillars.append({
            "name": pillar,
            "description": pillar_descriptions[pillar],
            "count": len(investigations),
            "investigations": investigations
        })

    return jsonify({
        "total_investigations": len(INVESTIGATIONS),
        "total_pillars": len(pillars),
        "pillars": pillars,
        "classification_note": (
            "These are IGNIS-developed research categories, "
            "not official NASA classifications."
        )
    })

# =========================================
# IGNIS EVIDENCE AVAILABILITY API
# =========================================

@main.route("/api/evidence-availability")
def evidence_availability():

    evidence_files = {
        "PSI-98": [
            "datasets/PSI-98/metadata/i_Investigation.txt",
            "datasets/PSI-98/metadata/s_PSI-98.txt",
            "datasets/PSI-98/Saffire-I Sample 2 Sensor Data Complete TM graphs.xlsx"
        ],
        "PSI-25": [
            "datasets/PSI-25/metadata/i_Investigation.txt"
        ],
        "PSI-101": [],
        "PSI-69": [],
        "PSI-62": []
    }

    results = []

    for investigation in INVESTIGATIONS:

        investigation_id = investigation["id"]

        expected_files = evidence_files.get(
            investigation_id, []
        )

        available_files = []

        for relative_path in expected_files:

            file_path = BASE_DIR / relative_path

            if file_path.is_file():

                available_files.append({
                    "name": file_path.name,
                    "path": relative_path,
                    "size_bytes": file_path.stat().st_size
                })

        has_telemetry = any(
            file["name"].lower().endswith((".xlsx", ".csv"))
            for file in available_files
        )

        has_metadata = any(
            file["name"] == "i_Investigation.txt"
            for file in available_files
        )

        if has_telemetry:
            evidence_level = "telemetry_and_metadata"
            evidence_label = "Numerical telemetry + metadata"

        elif has_metadata:
            evidence_level = "metadata_only"
            evidence_label = "Metadata only"

        else:
            evidence_level = "source_record_only"
            evidence_label = "NASA PSI record only"

        results.append({
            "id": investigation_id,
            "name": investigation["name"],
            "pillar": investigation["pillar"],
            "type": investigation["type"],
            "doi": investigation.get("doi"),
            "source_url": investigation["url"],
            "source_status": investigation.get(
                "source_status",
                "Not verified"
            ),
            "source_verified": (
                investigation.get("source_status")
                == "NASA PSI record verified"
            ),
            "evidence_level": evidence_level,
            "evidence_label": evidence_label,
            "has_numerical_telemetry": has_telemetry,
            "has_local_metadata": has_metadata,
            "local_file_count": len(available_files),
            "files": available_files
        })

    return jsonify({
        "total_investigations": len(results),
        "with_telemetry": sum(
            item["has_numerical_telemetry"]
            for item in results
        ),
        "with_local_metadata": sum(
            item["has_local_metadata"]
            for item in results
        ),
        "source_record_only": sum(
            item["evidence_level"] == "source_record_only"
            for item in results
        ),
        "investigations": results,
        "classification_note": (
            "Evidence availability reflects files currently "
            "present in the IGNIS local dataset directory. "
            "A verified NASA PSI source record does not mean "
            "its numerical dataset has been downloaded or analysed."
        )
    })

# =========================================
# SAFFIRE-I DEDICATED DATA ANALYSIS
# =========================================

@main.route("/investigations/saffire-i/analysis")
def saffire_analysis():
    return render_template(
        "index.html",
        analysis_mode=True
    )
# =========================================
# IGNIS SCIENTIFIC COMPARISON
# =========================================

@main.route("/comparison")
def comparison_page():
    return render_template("comparison.html")
