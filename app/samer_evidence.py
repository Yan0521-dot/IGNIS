from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent

WORKBOOK = (
    BASE_DIR
    / "datasets"
    / "PSI-101"
    / "analysed_data"
    / "Combined SAMER Results 06 02 14.xlsx"
)

REPORT = (
    BASE_DIR
    / "datasets"
    / "PSI-101"
    / "reports"
    / "SAMER_Final_0602_2014.pdf"
)

NASA_SOURCE = {
    "provider": "NASA Physical Sciences Informatics",
    "doi": "10.60555/2np7-jv14",
    "url": (
        "https://psi.nasa.gov/"
        "physci/repo/data/investigations/PSI-101"
    )
}

REPORT_SOURCE = {
    "provider": "NASA Glenn Research Center — SAME-R Final Report",
    "doi": "10.60555/2np7-jv14",
    "url": (
        "https://psi.nasa.gov/"
        "physci/repo/data/investigations/PSI-101"
    )
}


def load_t11():
    if not WORKBOOK.is_file():
        raise FileNotFoundError(
            f"SAME-R workbook not found: {WORKBOOK}"
        )

    df = pd.read_excel(
        WORKBOOK,
        sheet_name="SAME R Results",
        header=1
    )

    required = [
        "SAME #",
        "Sample Type",
        "Sample ID",
        "Test ID Number",
        "STS Detector (volts)",
        "STS Detector offset (volts)",
        "ISS Detector Scatter (volts)",
        "DustTrak B (mg/m3)",
        "Ptrak (PT/cc)",
        "M1/M0 (micro-m)--AMD",
        "Mass Loss (mg)",
    ]

    missing = [
        column for column in required
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            "Missing SAME-R workbook columns: "
            + ", ".join(missing)
        )

    matches = df[
        pd.to_numeric(df["SAME #"], errors="coerce") == 111
    ]

    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one SAME #111 record; found {len(matches)}"
        )

    return matches.iloc[0]


def number(row, column):
    value = pd.to_numeric(
        pd.Series([row[column]]),
        errors="coerce"
    ).iloc[0]

    if pd.isna(value):
        raise ValueError(
            f"Missing numerical value for {column}"
        )

    return float(value)


def build_samer_evidence():
    row = load_t11()

    sts = number(row, "STS Detector (volts)")
    sts_offset = number(row, "STS Detector offset (volts)")
    sts_difference = sts - sts_offset

    scatter = number(row, "ISS Detector Scatter (volts)")
    dusttrak = number(row, "DustTrak B (mg/m3)")
    ptrak = number(row, "Ptrak (PT/cc)")
    amd = number(row, "M1/M0 (micro-m)--AMD")
    workbook_mass_loss = number(row, "Mass Loss (mg)")

    test_id = str(row["Test ID Number"]).strip()
    sample_id = str(row["Sample ID"]).strip()
    material = str(row["Sample Type"]).strip()

    airflow = number(row, "Inlet Velocity (cm/sec)")
    duration = number(row, "Duration (sec)")
    aging = number(row, "Primary Aging Duration (sec)")
    mixing = number(row, "Primary Mixing Duration (sec)")
    rt_r0 = number(row, "Rt/R0")

    records = [
        {
            "id": "PSI101-T11-STS",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "Recorded STS detector output",
            "value": sts,
            "value_precision": 9,
            "unit": "V",
            "evidence_type": "Measured test result",
            "dataset": WORKBOOK.name,
            "sensor": "STS Detector",
            "calculation": (
                "Raw STS Detector (volts) value transcribed "
                "from the SAME-R Results worksheet for SAME #111."
            ),
            "interpretation": (
                "The workbook records a very low STS output "
                "for this enabled-detector test."
            ),
            "limitation": (
                "The final report does not establish the STS "
                "detector voltage range, calibration response "
                "or a failure threshold. A low output alone "
                "does not establish detector malfunction."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-STS-OFFSET",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "Recorded STS detector offset",
            "value": sts_offset,
            "value_precision": 9,
            "unit": "V",
            "evidence_type": "Measured test result",
            "dataset": WORKBOOK.name,
            "sensor": "STS Detector offset",
            "calculation": (
                "Recorded STS Detector offset (volts) value "
                "for SAME #111."
            ),
            "interpretation": (
                "The workbook contains a separate offset "
                "value associated with the STS detector channel."
            ),
            "limitation": (
                "The report does not document the STS-specific "
                "offset correction procedure or calibration "
                "acceptance limits."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-STS-OFFSET-DIFF",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "STS output minus recorded offset",
            "value": sts_difference,
            "value_precision": 9,
            "unit": "V",
            "evidence_type": "Derived test result",
            "dataset": WORKBOOK.name,
            "sensor": "STS Detector",
            "calculation": (
                f"{sts:.10f} V raw output minus "
                f"{sts_offset:.10f} V recorded offset."
            ),
            "interpretation": (
                "The arithmetic difference is approximately "
                "0.000336 V for this record."
            ),
            "limitation": (
                "This is an IGNIS-derived arithmetic difference, "
                "not a verified calibrated detector output. "
                "The report does not confirm that this subtraction "
                "is the instrument's prescribed correction method."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-ISS-SCATTER",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "ISS detector scatter reading",
            "value": scatter,
            "value_precision": 7,
            "unit": "V",
            "evidence_type": "Measured test result",
            "dataset": WORKBOOK.name,
            "sensor": "ISS Detector Scatter",
            "calculation": (
                "Recorded ISS Detector Scatter (volts) "
                "value for SAME #111."
            ),
            "interpretation": (
                "The ISS scatter channel has a non-zero recorded "
                "reading in the same test where the STS output "
                "is unusually low."
            ),
            "limitation": (
                "ISS Detector Scatter and STS Detector are "
                "different channels. Their voltage values are "
                "not directly interchangeable or necessarily "
                "on equivalent calibration scales."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-DUSTTRAK",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "DustTrak B aerosol mass concentration",
            "value": dusttrak,
            "value_precision": 5,
            "unit": "mg/m³",
            "evidence_type": "Measured test result",
            "dataset": WORKBOOK.name,
            "sensor": "DustTrak B",
            "calculation": (
                "Recorded DustTrak B (mg/m3) value for SAME #111. "
                "This is the uncorrected column, not the separate "
                "dilution-corrected value."
            ),
            "interpretation": (
                "The DustTrak B channel records a non-zero "
                "aerosol mass concentration for this test."
            ),
            "limitation": (
                "This value must not be confused with the "
                "separate dilution-corrected DustTrak B value. "
                "Instrument calibration and dilution context "
                "must be considered when comparing records."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-PTRAK",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "P-Trak particle number concentration",
            "value": ptrak,
            "value_precision": 0,
            "unit": "PT/cc",
            "evidence_type": "Measured test result",
            "dataset": WORKBOOK.name,
            "sensor": "P-Trak",
            "calculation": (
                "Recorded P-Trak (PT/cc) value for SAME #111."
            ),
            "interpretation": (
                "The P-Trak channel records a non-zero particle "
                "number concentration in this test."
            ),
            "limitation": (
                "This is an instrument-specific particle count "
                "concentration, not a direct measurement of "
                "particle mass or detector alarm performance."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-AMD",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "Reported mass-based average particle diameter",
            "value": amd,
            "value_precision": 6,
            "unit": "µm",
            "evidence_type": "Derived test result",
            "dataset": WORKBOOK.name,
            "sensor": "M1/M0 — AMD",
            "calculation": (
                "Recorded M1/M0 (micro-m)--AMD result for "
                "SAME #111. This value is not recalculated by IGNIS."
            ),
            "interpretation": (
                "The workbook provides a particle-size metric "
                "for the T11 aerosol test."
            ),
            "limitation": (
                "This is a processed workbook result based on "
                "the study's moment methodology, not a direct "
                "single-particle measurement."
            ),
            "source": NASA_SOURCE
        },
        {
            "id": "PSI101-T11-MASS-LOSS",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "T11 sample mass loss reported in Appendix C",
            "value": 9.95,
            "value_precision": 2,
            "unit": "mg",
            "evidence_type": "Documented metadata",
            "dataset": REPORT.name,
            "subject": "Sample mass loss",
            "calculation": (
                "NASA SAME-R Final Report Appendix C lists "
                "T11 preflight average 1.00898 g and postflight "
                "average 0.99903 g, with reported mass loss "
                "of 9.95 mg. The workbook independently records "
                f"{workbook_mass_loss:.5f} mg."
            ),
            "interpretation": (
                "The original report documents measurable "
                "mass loss for the T11 test sample."
            ),
            "limitation": (
                "Mass loss alone does not establish the precise "
                "combustion process, aerosol concentration, "
                "detector response or fire intensity."
            ),
            "source": REPORT_SOURCE
        },
        {
            "id": "PSI101-T11-CONFIG",
            "investigation": "PSI-101",
            "investigation_name": "SAME-R",
            "sample": "T11 — Teflon",
            "finding": "T11 low-flow STS test configuration",
            "value": "2 cm/s; STS enabled",
            "unit": "",
            "evidence_type": "Documented metadata",
            "dataset": REPORT.name,
            "subject": "Experimental configuration",
            "calculation": (
                "Appendix A identifies test 64T / SAME #111, "
                "Teflon sample T11, low-flow run with STS, "
                "2 cm/s inlet velocity, 60 s duration, "
                "11 s primary aging and 8 s primary mixing. "
                "STS, Comm Diag B and P-Trak were enabled; "
                "Comm Diag A was disabled."
            ),
            "interpretation": (
                "The original report independently confirms "
                "the configuration associated with the T11 "
                "workbook record."
            ),
            "limitation": (
                "Configuration confirmation does not explain "
                "the unusually low STS output or establish "
                "whether that output is valid."
            ),
            "source": REPORT_SOURCE
        }
    ]

    # Attach the anomaly as a separate derived interpretation.
    records.append({
        "id": "PSI101-T11-ANOMALY",
        "investigation": "PSI-101",
        "investigation_name": "SAME-R",
        "sample": "T11 — Teflon",
        "finding": "Unusually low STS output despite other non-zero aerosol readings",
        "value": sts,
        "value_precision": 9,
        "unit": "V",
        "evidence_type": "Derived test result",
        "dataset": WORKBOOK.name,
        "sensor": "STS Detector compared with ISS Scatter, DustTrak B and P-Trak",
        "calculation": (
            "Interpretation of the T11 record: STS output "
            f"{sts:.9f} V; ISS scatter {scatter:.6f} V; "
            f"DustTrak B {dusttrak:.5f} mg/m3; "
            f"P-Trak {ptrak:.0f} PT/cc. The NASA report "
            "confirms STS was enabled for test 64T."
        ),
        "interpretation": (
            "The low STS output is a documented measurement "
            "anomaly worth retaining for further investigation."
        ),
        "limitation": (
            "The available report does not document STS-specific "
            "calibration, voltage range or offset correction "
            "criteria. The cause is undetermined; do not infer "
            "detector failure or discard the reading."
        ),
        "source": NASA_SOURCE
    })

    return records


def build_samer_anomaly_analysis():
    """
    Build a descriptive comparison of SAME-R STS-enabled tests.
    T11 is compared against the other STS-enabled records.
    This is not a detector calibration or pass/fail assessment.
    """
    df = pd.read_excel(
        WORKBOOK,
        sheet_name="SAME R Results",
        header=1
    )

    required = [
        "SAME #",
        "Test ID Number",
        "Sample Type",
        "Use STS Detector",
        "STS Detector (volts)",
        "STS Detector offset (volts)",
        "ISS Detector Scatter (volts)",
        "DustTrak B (mg/m3)",
        "Ptrak (PT/cc)",
    ]

    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(
            "Missing SAME-R anomaly columns: " + ", ".join(missing)
        )

    enabled = df[
        df["Use STS Detector"].astype(str).str.strip().str.lower() == "y"
    ].copy()

    enabled["STS Detector (volts)"] = pd.to_numeric(
        enabled["STS Detector (volts)"], errors="coerce"
    )
    enabled["SAME # numeric"] = pd.to_numeric(
        enabled["SAME #"], errors="coerce"
    )

    enabled = enabled.dropna(
        subset=["STS Detector (volts)", "SAME # numeric"]
    )

    target_rows = enabled[enabled["SAME # numeric"] == 111]
    if len(target_rows) != 1:
        raise ValueError(
            f"Expected one enabled T11 record; found {len(target_rows)}"
        )

    target = target_rows.iloc[0]
    reference = enabled[enabled["SAME # numeric"] != 111].copy()

    if len(reference) < 2:
        raise ValueError("Insufficient reference tests for comparison.")

    values = reference["STS Detector (volts)"]
    median = float(values.median())

    def optional_number(row, column):
        value = pd.to_numeric(
            pd.Series([row[column]]), errors="coerce"
        ).iloc[0]
        return None if pd.isna(value) else float(value)

    comparison = []
    for _, row in enabled.sort_values(
        "STS Detector (volts)"
    ).iterrows():
        comparison.append({
            "same_number": int(row["SAME # numeric"]),
            "test_id": str(row["Test ID Number"]).strip(),
            "material": str(row["Sample Type"]).strip(),
            "sts_voltage": float(row["STS Detector (volts)"]),
            "is_target": int(row["SAME # numeric"]) == 111
        })

    return {
        "investigation": "SAME-R",
        "target": {
            "same_number": 111,
            "test_id": str(target["Test ID Number"]).strip(),
            "material": str(target["Sample Type"]).strip(),
            "sts_voltage": float(target["STS Detector (volts)"]),
            "sts_offset": optional_number(
                target, "STS Detector offset (volts)"
            ),
            "iss_scatter": optional_number(
                target, "ISS Detector Scatter (volts)"
            ),
            "dusttrak_b": optional_number(
                target, "DustTrak B (mg/m3)"
            ),
            "ptrak": optional_number(target, "Ptrak (PT/cc)")
        },
        "reference": {
            "count": int(len(reference)),
            "median": median,
            "minimum": float(values.min()),
            "maximum": float(values.max())
        },
        "cohort": {
            "enabled_test_count": int(len(enabled)),
            "valid_reading_count": int(len(enabled)),
            "comparison_tests": int(len(reference))
        },
        "comparison": comparison,
        "interpretation": (
            "T11 has a substantially lower recorded STS voltage than "
            "the other STS-enabled tests in this workbook cohort. "
            "This is a descriptive anomaly, not proof of detector failure."
        ),
        "limitation": (
            "The available report does not establish STS-specific "
            "calibration limits, voltage range, or the prescribed offset "
            "correction procedure. Differences in material and test "
            "conditions also limit direct comparisons. The cause remains "
            "undetermined."
        ),
        "source": NASA_SOURCE
    }


def build_samer_t08_t11_comparison():
    """
    Compare T08 and T11, two Teflon SAME-R tests.

    The comparison is near-matched, not fully controlled:
    inlet velocity and Rt/R0 differ.
    """
    df = pd.read_excel(
        WORKBOOK,
        sheet_name="SAME R Results",
        header=1
    )

    required = [
        "SAME #",
        "Sample Type",
        "Sample ID",
        "Test ID Number",
        "Description",
        "Inlet Velocity (cm/sec)",
        "Rt/R0",
        "Duration (sec)",
        "Primary Aging Duration (sec)",
        "Primary Mixing Duration (sec)",
        "Use STS Detector",
        "Use Comm Diag A",
        "Use Comm Diag B",
        "Use P-Trak",
        "ISS Detector Scatter (volts)",
        "STS Detector (volts)",
        "STS Detector offset (volts)",
        "Ptrak (PT/cc)",
        "DustTrak B (mg/m3)",
        "Mass Loss (mg)",
    ]

    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(
            "Missing T08/T11 comparison columns: " + ", ".join(missing)
        )

    df["_same_numeric"] = pd.to_numeric(
        df["SAME #"], errors="coerce"
    )

    def get_record(same_number):
        matches = df[df["_same_numeric"] == same_number]

        if len(matches) != 1:
            raise ValueError(
                f"Expected one SAME #{same_number} record; found {len(matches)}"
            )

        row = matches.iloc[0]

        if str(row["Sample Type"]).strip().lower() != "teflon":
            raise ValueError(
                f"SAME #{same_number} is not recorded as Teflon."
            )

        def numeric(column):
            value = pd.to_numeric(
                pd.Series([row[column]]), errors="coerce"
            ).iloc[0]

            return None if pd.isna(value) else float(value)

        def text(column):
            value = row[column]
            return "" if pd.isna(value) else str(value).strip()

        def flag(column):
            value = text(column).lower()
            return value == "y"

        return {
            "same_number": same_number,
            "sample_id": text("Sample ID"),
            "test_id": text("Test ID Number"),
            "material": text("Sample Type"),
            "description": text("Description"),
            "date": (
                row["Date (EST)"].isoformat()
                if not pd.isna(row["Date (EST)"])
                else None
            ),
            "conditions": {
                "inlet_velocity": numeric("Inlet Velocity (cm/sec)"),
                "rt_r0": numeric("Rt/R0"),
                "duration": numeric("Duration (sec)"),
                "primary_aging": numeric("Primary Aging Duration (sec)"),
                "primary_mixing": numeric("Primary Mixing Duration (sec)"),
                "sts_enabled": flag("Use STS Detector"),
                "comm_diag_a_enabled": flag("Use Comm Diag A"),
                "comm_diag_b_enabled": flag("Use Comm Diag B"),
                "ptrak_enabled": flag("Use P-Trak"),
            },
            "instruments": {
                "sts_voltage": numeric("STS Detector (volts)"),
                "sts_offset": numeric("STS Detector offset (volts)"),
                "iss_scatter": numeric("ISS Detector Scatter (volts)"),
                "dusttrak_b": numeric("DustTrak B (mg/m3)"),
                "ptrak": numeric("Ptrak (PT/cc)"),
                "mass_loss": numeric("Mass Loss (mg)"),
            }
        }

    t08 = get_record(89)
    t11 = get_record(111)

    if t08["sample_id"] != "T08" or t11["sample_id"] != "T11":
        raise ValueError("SAME # records do not match expected T08/T11 samples.")

    condition_labels = {
        "inlet_velocity": ("Inlet velocity", "cm/s"),
        "rt_r0": ("Rt/R0", ""),
        "duration": ("Test duration", "s"),
        "primary_aging": ("Primary aging", "s"),
        "primary_mixing": ("Primary mixing", "s"),
        "sts_enabled": ("STS detector", ""),
        "comm_diag_a_enabled": ("Comm Diag A", ""),
        "comm_diag_b_enabled": ("Comm Diag B", ""),
        "ptrak_enabled": ("P-Trak", ""),
    }

    matched = []
    different = []

    for key, (label, unit) in condition_labels.items():
        left = t08["conditions"][key]
        right = t11["conditions"][key]

        entry = {
            "key": key,
            "label": label,
            "t08": left,
            "t11": right,
            "unit": unit,
        }

        if left == right:
            matched.append(entry)
        else:
            different.append(entry)

    instrument_labels = {
        "sts_voltage": ("STS Detector output", "V"),
        "iss_scatter": ("ISS Detector scatter", "V"),
        "dusttrak_b": ("DustTrak B", "mg/m³"),
        "ptrak": ("P-Trak", "PT/cc"),
    }

    instruments = []

    for key, (label, unit) in instrument_labels.items():
        instruments.append({
            "key": key,
            "label": label,
            "unit": unit,
            "t08": t08["instruments"][key],
            "t11": t11["instruments"][key],
        })

    return {
        "investigation": "SAME-R",
        "comparison_type": "Near-matched experimental comparison",
        "records": {
            "t08": t08,
            "t11": t11,
        },
        "condition_summary": {
            "matched_count": len(matched),
            "different_count": len(different),
            "matched": matched,
            "different": different,
        },
        "instruments": instruments,
        "interpretation": (
            "Both tests used Teflon, a 60-second test duration, "
            "11-second primary aging, 8-second primary mixing, "
            "and the same enabled/disabled detector configuration. "
            "T11 records a much lower STS output while ISS scatter, "
            "DustTrak B and P-Trak also have non-zero readings."
        ),
        "limitation": (
            "This is not a fully controlled comparison. Inlet velocity "
            "differs (T08: 8.1 cm/s; T11: 2.0 cm/s), and Rt/R0 differs "
            "(1.445 versus 1.450). The available report does not establish "
            "STS-specific calibration limits or the prescribed offset "
            "correction. Different instrument channels have different "
            "measurement scales. The cause of the low T11 STS output "
            "remains undetermined."
        ),
        "source": NASA_SOURCE,
        "dataset": WORKBOOK.name,
    }
