
from flask import Blueprint, jsonify, render_template
from pathlib import Path
import pandas as pd
import json

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
        chart_columns = [
            "Elapsed Time (s)"
        ] + PLUME_SENSORS

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
