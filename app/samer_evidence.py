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
