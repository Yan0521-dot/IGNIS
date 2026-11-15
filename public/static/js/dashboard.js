
const dashboardParams = new URLSearchParams(window.location.search);
const selectedInvestigation = dashboardParams.get("investigation");
const API_URL = "/api/dashboard-data";

// =========================================
// SENSOR CONFIGURATION
// =========================================

const sensorDefinitions = [
    { name: "Plume Temp 1 (TC1)", group: "plume", label: "TC1" },
    { name: "Plume Temp 2 (TC2)", group: "plume", label: "TC2" },
    { name: "Plume Temp 3 (TC3)", group: "plume", label: "TC3" },
    { name: "Plume Temp 4 (TC4)", group: "plume", label: "TC4" },
    { name: "Plume Temp 5 (TC5)", group: "plume", label: "TC5" },
    { name: "Plume Temp 6 (TC6)", group: "plume", label: "TC6" },

    { name: "Sample Temp 1 (TC7)", group: "sample", label: "TC7" },
    { name: "Sample Temp 2 (TC8)", group: "sample", label: "TC8" },
    { name: "Sample Temp 3 (TC9)", group: "sample", label: "TC9" },
    { name: "Sample Temp 4 (TC10)", group: "sample", label: "TC10" },
    { name: "Sample Temp 5 (TC11)", group: "sample", label: "TC11" },
    { name: "Sample Temp 6 (TC12)", group: "sample", label: "TC12" }
];

const sensorColors = [
    "#55b9f5",
    "#a78bfa",
    "#ff914d",
    "#48d6a0",
    "#f16d75",
    "#e5c46a",
    "#4dd0e1",
    "#c792ea",
    "#ffb74d",
    "#81c784",
    "#f06292",
    "#90a4ae"
];

let temperatureChart = null;
let sensorChart = null;
let eventTimelineChart = null;

let activeSensorGroup = "plume";

let selectedSensors = new Set(
    sensorDefinitions
        .filter(sensor => sensor.group === "plume")
        .map(sensor => sensor.name)
);

// =========================================
// GENERAL HELPERS
// =========================================

function formatNumber(value, decimals = 2) {
    return Number(value).toFixed(decimals);
}

function showError(message) {
    const element = document.getElementById("errorMessage");

    if (element) {
        element.textContent =
            "Unable to load investigation data: " + message;

        element.classList.remove("hidden");
    }
}

function getAnalysisRows(data) {
    return data.telemetry.filter(row => {
        const time = row["Elapsed Time (s)"];

        return time >= 60 && time <= 150;
    });
}

function getActiveSensors() {
    return sensorDefinitions.filter(sensor =>
        selectedSensors.has(sensor.name)
    );
}

// =========================================
// METRIC CARDS
// =========================================

function updateMetricCards(data) {
    const sensors = data.sensors;

    const highest = sensors.reduce(
        (a, b) => a.peak > b.peak ? a : b
    );

    document.getElementById("peakTemp").textContent =
        formatNumber(highest.peak) + "°C";

    document.getElementById("peakSensor").textContent =
        highest.sensor + " · " + highest.peak_time + " seconds";

    const ignition = data.ignition;

    if (ignition.start !== null && ignition.end !== null) {
        const duration = ignition.end - ignition.start;

        document.getElementById("ignitionDuration").textContent =
            formatNumber(duration, 3) + "s";

        document.getElementById("ignitionPeriod").textContent =
            ignition.start + "s – " + ignition.end + "s";
    }

    document.getElementById("recordCount").textContent =
        data.dataset.timestamped_rows.toLocaleString();

    document.getElementById("samplingRate").textContent =
        data.dataset.sampling_frequency_hz + " Hz sampling frequency";

    document.getElementById("channelCount").textContent =
        data.dataset.columns;
}

// =========================================
// SENSOR SELECTION CONTROLS
// =========================================

function renderSensorControls(data) {
    const container = document.getElementById("sensorCheckboxes");

    if (!container) return;

    const availableSensors = sensorDefinitions.filter(sensor =>
        data.telemetry.some(row =>
            row[sensor.name] !== null &&
            row[sensor.name] !== undefined
        )
    );

    container.innerHTML = availableSensors
        .filter(sensor => sensor.group === activeSensorGroup ||
                          activeSensorGroup === "all")
        .map(sensor => {
            const index = sensorDefinitions.indexOf(sensor);
            const checked = selectedSensors.has(sensor.name);

            return `
                <label class="sensor-checkbox ${checked ? "selected" : ""}">
                    <input
                        type="checkbox"
                        value="${sensor.name}"
                        ${checked ? "checked" : ""}
                    >
                    <span style="color:${sensorColors[index]}">
                        ●
                    </span>
                    ${sensor.label}
                </label>
            `;
        }).join("");

    container.querySelectorAll("input[type='checkbox']")
        .forEach(checkbox => {
            checkbox.addEventListener("change", event => {
                const name = event.target.value;

                if (event.target.checked) {
                    selectedSensors.add(name);
                } else {
                    selectedSensors.delete(name);
                }

                renderSensorControls(data);
                refreshSensorCharts(data);
            });
        });

    document.querySelectorAll(".sensor-group-btn")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.group === activeSensorGroup
            );

            button.onclick = () => {
                activeSensorGroup = button.dataset.group;

                selectedSensors = new Set(
                    sensorDefinitions
                        .filter(sensor =>
                            activeSensorGroup === "all" ||
                            sensor.group === activeSensorGroup
                        )
                        .map(sensor => sensor.name)
                );

                renderSensorControls(data);
                refreshSensorCharts(data);
            };
        });

    const resetButton = document.getElementById("resetSensors");

    if (resetButton) {
        resetButton.onclick = () => {
            selectedSensors = new Set(
                sensorDefinitions
                    .filter(sensor =>
                        activeSensorGroup === "all" ||
                        sensor.group === activeSensorGroup
                    )
                    .map(sensor => sensor.name)
            );

            renderSensorControls(data);
            refreshSensorCharts(data);
        };
    }
}

// =========================================
// TEMPERATURE TIME SERIES
// =========================================

function renderTemperatureChart(data) {
    const selected = getAnalysisRows(data);

    const labels = selected.map(row =>
        row["Elapsed Time (s)"]
    );

    const activeSensors = getActiveSensors();

    const datasets = activeSensors.map(sensor => {
        const index = sensorDefinitions.indexOf(sensor);
        const color = sensorColors[index];

        return {
            label: sensor.name,

            data: selected.map(row => row[sensor.name]),

            borderColor: color,
            backgroundColor: color + "18",

            borderWidth: sensor.name.includes("TC3") ? 2.8 : 1.8,

            pointRadius: 0,
            pointHoverRadius: 4,

            tension: 0.25,
            spanGaps: false
        };
    });

    const ctx = document.getElementById("temperatureChart");

    if (temperatureChart) {
        temperatureChart.destroy();
    }

    temperatureChart = new Chart(ctx, {
        type: "line",

        data: {
            labels,
            datasets
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        color: "#a9b8cb",
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 18,

                        font: {
                            size: 10,
                            family: "Inter"
                        }
                    }
                },

                tooltip: {
                    backgroundColor: "#152337",
                    borderColor: "#40536a",
                    borderWidth: 1,
                    titleColor: "#ffffff",
                    bodyColor: "#d5e1ef",

                    callbacks: {
                        title: items =>
                            "Elapsed time: " + items[0].label + " s",

                        label: item =>
                            item.dataset.label + ": " +
                            formatNumber(item.raw) + "°C"
                    }
                }
            },

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Elapsed Time (seconds)",
                        color: "#8292a8"
                    },

                    ticks: {
                        color: "#8292a8",
                        maxTicksLimit: 10
                    },

                    grid: {
                        color: "#26364b"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Temperature (°C)",
                        color: "#8292a8"
                    },

                    ticks: {
                        color: "#8292a8"
                    },

                    grid: {
                        color: "#26364b"
                    }
                }
            }
        }
    });
}

// =========================================
// SENSOR PEAK COMPARISON
// =========================================

function renderSensorChart(data) {
    const selected = getAnalysisRows(data);
    const activeSensors = getActiveSensors();

    const peaks = activeSensors.map(sensor => {
        const values = selected
            .map(row => Number(row[sensor.name]))
            .filter(value => Number.isFinite(value));

        return values.length ? Math.max(...values) : null;
    });

    const ctx = document.getElementById("sensorChart");

    if (sensorChart) {
        sensorChart.destroy();
    }

    const backgroundColors = activeSensors.map(sensor =>
        sensorColors[sensorDefinitions.indexOf(sensor)]
    );

    sensorChart = new Chart(ctx, {
        type: "bar",

        data: {
            labels: activeSensors.map(sensor => sensor.label),

            datasets: [{
                label: "Peak temperature",
                data: peaks,
                backgroundColor: backgroundColors,
                borderRadius: 5,
                borderSkipped: false
            }]
        },

        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: item =>
                            formatNumber(item.raw) + "°C"
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#8292a8"
                    },

                    grid: {
                        color: "#26364b"
                    },

                    title: {
                        display: true,
                        text: "Peak temperature (°C)",
                        color: "#8292a8"
                    }
                },

                y: {
                    ticks: {
                        color: "#b6c4d5",

                        font: {
                            size: 10
                        }
                    },

                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// =========================================
// REFRESH BOTH SENSOR CHARTS
// =========================================

function refreshSensorCharts(data) {
    renderTemperatureChart(data);
    renderSensorChart(data);
}

// =========================================
// TC3 THRESHOLD ANALYSIS
// =========================================

function renderThresholds(data) {
    const container = document.getElementById("thresholdList");

    const maxDuration = Math.max(
        ...data.tc3_thresholds.map(
            x => x.cumulative_seconds
        ),
        1
    );

    container.innerHTML = data.tc3_thresholds.map(item => {
        const percentage =
            item.cumulative_seconds / maxDuration * 100;

        return `
            <div class="threshold-row">
                <div class="threshold-label">
                    <span>Above ${item.threshold}°C</span>
                    <strong>
                        ${formatNumber(item.cumulative_seconds, 3)} s
                    </strong>
                </div>

                <div class="threshold-track">
                    <div
                        class="threshold-fill"
                        style="width:${percentage}%">
                    </div>
                </div>

                <div class="threshold-label">
                    <span>
                        ${item.readings.toLocaleString()} readings
                    </span>

                    <span>
                        ${item.first_time}s – ${item.last_time}s
                    </span>
                </div>
            </div>
        `;
    }).join("");
}

// =========================================
// IGNITION TIMELINE
// =========================================

function renderTimeline(data) {
    const ignition = data.ignition;

    document.getElementById("preIgnitionTime").textContent =
        "50.000 s";

    if (ignition.start !== null) {
        document.getElementById("ignitionStart").textContent =
            ignition.start + " s";

        document.getElementById("ignitionEnd").textContent =
            ignition.end + " s";
    }

    const tc3 = data.sensors.find(
        sensor => sensor.sensor === "Plume Temp 3 (TC3)"
    );

    if (tc3) {
        document.getElementById("peakTime").textContent =
            tc3.peak_time + " s";
    }
}

// =========================================
// INTERACTIVE EXPERIMENTAL EVENT TIMELINE
// =========================================

function renderEventTimeline(data) {
    const rows = data.telemetry.filter(row => {
        const time = Number(row["Elapsed Time (s)"]);
        return time >= 50 && time <= 150;
    });

    if (!rows.length) {
        console.warn("No telemetry available for event timeline.");
        return;
    }

    const labels = rows.map(row => row["Elapsed Time (s)"]);

    const selectedSensors = [
        {
            name: "Plume Temp 1 (TC1)",
            label: "TC1",
            color: "#55b9f5"
        },
        {
            name: "Plume Temp 3 (TC3)",
            label: "TC3",
            color: "#ff914d"
        },
        {
            name: "Plume Temp 4 (TC4)",
            label: "TC4",
            color: "#48d6a0"
        }
    ];

    const datasets = selectedSensors.map(sensor => ({
        label: sensor.label,
        data: rows.map(row => row[sensor.name]),
        borderColor: sensor.color,
        backgroundColor: sensor.color + "18",
        borderWidth: sensor.label === "TC3" ? 2.8 : 1.8,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
        spanGaps: false
    }));

    function nearestIndex(target) {
        if (target === null || target === undefined) {
            return null;
        }

        let bestIndex = 0;
        let bestDistance = Infinity;

        labels.forEach((time, index) => {
            const distance = Math.abs(Number(time) - Number(target));

            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        });

        return bestIndex;
    }

    const tc3 = data.sensors.find(
        sensor => sensor.sensor === "Plume Temp 3 (TC3)"
    );

    const markers = [
        {
            label: "IGNITER ON",
            time: data.ignition.start,
            color: "#f59e0b",
            index: nearestIndex(data.ignition.start)
        },
        {
            label: "IGNITER OFF",
            time: data.ignition.end,
            color: "#60a5fa",
            index: nearestIndex(data.ignition.end)
        },
        {
            label: "TC3 PEAK",
            time: tc3 ? tc3.peak_time : null,
            color: "#f87171",
            index: tc3 ? nearestIndex(tc3.peak_time) : null
        }
    ].filter(marker => marker.index !== null);

    const markerPlugin = {
        id: "ignisExperimentalEventMarkers",

        afterDatasetsDraw(chart) {
            const { ctx, chartArea, scales } = chart;

            markers.forEach((marker, markerIndex) => {
                const x = scales.x.getPixelForValue(marker.index);

                if (x < chartArea.left || x > chartArea.right) {
                    return;
                }

                ctx.save();
                ctx.strokeStyle = marker.color;
                ctx.fillStyle = marker.color;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);

                ctx.beginPath();
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();

                ctx.setLineDash([]);
                ctx.font = "bold 9px Inter, sans-serif";
                ctx.textAlign = "left";

                const labelX = Math.min(
                    x + 5,
                    chartArea.right - 76
                );

                ctx.fillText(
                    marker.label,
                    labelX,
                    chartArea.top + 14 + markerIndex * 13
                );

                ctx.restore();
            });
        }
    };

    const canvas = document.getElementById("eventTimelineChart");

    if (!canvas) return;

    if (eventTimelineChart) {
        eventTimelineChart.destroy();
    }

    eventTimelineChart = new Chart(canvas, {
        type: "line",

        data: {
            labels,
            datasets
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#a9b8cb",
                        usePointStyle: true,
                        padding: 18
                    }
                },

                tooltip: {
                    backgroundColor: "#152337",
                    borderColor: "#40536a",
                    borderWidth: 1,

                    callbacks: {
                        title: items =>
                            "Elapsed time: " + items[0].label + " s",

                        label: item =>
                            item.dataset.label + ": " +
                            formatNumber(item.raw) + "°C"
                    }
                }
            },

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Elapsed time (seconds)",
                        color: "#8292a8"
                    },
                    ticks: {
                        color: "#8292a8",
                        maxTicksLimit: 12
                    },
                    grid: {
                        color: "#26364b"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Temperature (°C)",
                        color: "#8292a8"
                    },
                    ticks: {
                        color: "#8292a8"
                    },
                    grid: {
                        color: "#26364b"
                    }
                }
            }
        },

        plugins: [markerPlugin]
    });
}

// =========================================
// =========================================
// SCIENTIFIC INSIGHTS
// =========================================

function renderInsights(data) {
    const tc3 = data.sensors.find(
        sensor => sensor.sensor === "Plume Temp 3 (TC3)"
    );

    const tc4 = data.sensors.find(
        sensor => sensor.sensor === "Plume Temp 4 (TC4)"
    );

    if (tc3 && tc4) {
        document.getElementById("thermalInsight").textContent =
            `TC3 reached ${tc3.peak.toFixed(3)}°C at ` +
            `${tc3.peak_time}s, rising ${tc3.rise.toFixed(3)}°C ` +
            `above its pre-ignition baseline average. TC4 also ` +
            `showed an increase of ${tc4.rise.toFixed(3)}°C. ` +
            `This indicates different thermal responses across ` +
            `the measured plume locations.`;
    }

    const ignition = data.ignition;

    document.getElementById("ignitionInsight").textContent =
        `The electrical igniter was enabled from ${ignition.start}s ` +
        `to ${ignition.end}s. The TC3 peak occurred later in the ` +
        `recording. This is a measured thermal response, not ` +
        `independent proof of flame establishment.`;

    const missing =
        data.dataset.raw_rows -
        data.dataset.timestamped_rows;

    document.getElementById("dataInsight").textContent =
        `${data.dataset.timestamped_rows.toLocaleString()} of ` +
        `${data.dataset.raw_rows.toLocaleString()} rows have valid ` +
        `elapsed timestamps. An additional ${missing.toLocaleString()} ` +
        `rows lack elapsed timestamps and are excluded from the ` +
        `time-series analysis.`;
}

// =========================================
// LOAD DASHBOARD
// =========================================

async function loadDashboard() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(
                "API returned HTTP " + response.status
            );
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        updateMetricCards(data);

        renderSensorControls(data);
        renderTemperatureChart(data);
        renderSensorChart(data);

        renderThresholds(data);
        renderTimeline(data);
        renderEventTimeline(data);
        renderInsights(data);

        // =========================================
        // IGNIS INVESTIGATION CONTEXT
        // =========================================

        if (selectedInvestigation === "PSI-98") {
            console.log(
                "IGNIS: SAFFIRE-I / PSI-98 analysis selected."
            );

            const analyticsSection =
                document.getElementById("analytics");

            if (analyticsSection) {
                setTimeout(() => {
                    analyticsSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }, 300);
            }
        }

        document.getElementById("currentDate").textContent =
            new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }).format(new Date()).toUpperCase();

        console.log(
            "IGNIS dashboard connected to NASA PSI data.",
            data
        );

    } catch (error) {
        console.error("IGNIS API error:", error);
        showError(error.message);
    }
}

// =========================================
// INITIALIZE
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    loadDashboard
);



function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}


// =========================================
// IGNIS EVIDENCE AVAILABILITY
// =========================================

async function loadEvidenceAvailability() {

    const container = document.getElementById(
        "evidenceInvestigationList"
    );

    if (!container) return;

    try {

        const response = await fetch(
            "/api/evidence-availability"
        );

        if (!response.ok) {
            throw new Error("API returned HTTP " + response.status);
        }

        const data = await response.json();

        document.getElementById(
            "evidenceTelemetry"
        ).textContent = data.with_telemetry;

        document.getElementById(
            "evidenceResults"
        ).textContent = data.with_numerical_results;

        document.getElementById(
            "evidenceMetadata"
        ).textContent = data.with_local_metadata;

        document.getElementById(
            "evidenceSourceOnly"
        ).textContent = data.source_record_only;

        document.getElementById(
            "evidenceClassification"
        ).textContent = data.classification_note;

        const statusClass = {
            telemetry_and_metadata: "telemetry",
            numerical_results_and_metadata: "test-results",
            metadata_only: "metadata",
            source_record_only: "source-only"
        };

        container.innerHTML = data.investigations.map(item => {

            const files = Array.isArray(item.files)
                ? item.files
                : [];

            const fileHTML = files.length
                ? files.map(file => `
                    <div class="evidence-file">
                        <span>${escapeHTML(file.name)}</span>
                        <span>${(
                            file.size_bytes / 1024
                        ).toFixed(1)} KB</span>
                    </div>
                `).join("")
                : `<p class="evidence-empty">
                    No local dataset files currently registered.
                   </p>`;

            const safeURL =
                typeof item.source_url === "string" &&
                item.source_url.startsWith(
                    "https://psi.nasa.gov/physci/repo/data/investigations/"
                )
                    ? item.source_url
                    : null;

            const status = statusClass[item.evidence_level]
                || "source-only";

            return `
                <article class="evidence-card">

                    <div class="evidence-card-header">

                        <div class="evidence-identity">
                            <span>${escapeHTML(item.id)}</span>
                            <h4>${escapeHTML(item.name)}</h4>
                            <span>${escapeHTML(item.pillar)}</span>
                        </div>

                        <span class="evidence-status ${status}">
                            ${escapeHTML(item.evidence_label)}
                        </span>

                    </div>

                    <div class="evidence-details">

                        <div class="evidence-detail">
                            <strong>${item.local_file_count}</strong>
                            <span>LOCAL FILES</span>
                        </div>

                        <div class="evidence-detail">
                            <strong>
                                ${item.has_numerical_telemetry ? "YES" : "NO"}
                            </strong>
                            <span>TIME-SERIES TELEMETRY</span>
                        </div>

                        <div class="evidence-detail">
                            <strong>
                                ${item.has_numerical_results ? "YES" : "NO"}
                            </strong>
                            <span>NUMERICAL TEST RESULTS</span>
                        </div>

                        <div class="evidence-detail">
                            <strong>
                                ${item.has_local_metadata ? "YES" : "NO"}
                            </strong>
                            <span>LOCAL METADATA</span>
                        </div>

                    </div>

                    <div class="evidence-file-list">
                        <h5>AVAILABLE LOCAL FILES</h5>
                        ${fileHTML}
                    </div>

                    ${
                        safeURL
                        ? `<a
                            class="evidence-source-link"
                            href="${escapeHTML(safeURL)}"
                            target="_blank"
                            rel="noopener noreferrer">
                            OPEN NASA PSI SOURCE ↗
                           </a>`
                        : ""
                    }

                </article>
            `;

        }).join("");

        console.log(
            "IGNIS Evidence Availability loaded.",
            data
        );

    } catch (error) {

        console.error(
            "IGNIS Evidence Availability error:",
            error
        );

        container.innerHTML = `
            <div class="evidence-error">
                Unable to load evidence availability:
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}

document.addEventListener(
    "DOMContentLoaded",
    loadEvidenceAvailability
);


// =========================================
// IGNIS SCIENTIFIC FINDINGS DASHBOARD
// =========================================

const SCIENTIFIC_FINDINGS_APIS = {
    evidence: "/api/scientific-evidence",
    investigations: "/api/investigations",
    availability: "/api/evidence-availability",
    sameRComparison: "/api/samer-t08-t11"
};


function getFindingRecord(records, id) {
    return records.find(record => record.id === id);
}


function formatFindingValue(record) {

    if (!record || record.value === undefined) {
        return "Not available";
    }

    let value = record.value;

    if (typeof value === "number") {
        const precision = Number.isInteger(record.value_precision)
            ? record.value_precision
            : 3;

        value = value.toLocaleString("en-US", {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });
    }

    return `${escapeHTML(value)}${record.unit
        ? " " + escapeHTML(record.unit)
        : ""}`;
}


function renderFindingMetric(record, label) {

    if (!record) {
        return "";
    }

    return `
        <article class="finding-metric">

            <span class="finding-metric-label">
                ${escapeHTML(label || record.finding)}
            </span>

            <strong>
                ${formatFindingValue(record)}
            </strong>

            <span class="finding-evidence-type">
                ${escapeHTML(record.evidence_type)}
            </span>

        </article>
    `;
}


function getFindingInvestigation(investigations, id) {
    return investigations.find(item => item.id === id);
}


function getFindingEvidenceCount(records, id) {
    return records.filter(
        record => record.investigation === id
    ).length;
}


function renderFindingInvestigationLink(item) {

    if (!item) {
        return "";
    }

    const detailURL = `/investigations/${encodeURIComponent(item.slug)}`;

    const sourceURL =
        typeof item.url === "string" &&
        item.url.startsWith(
            "https://psi.nasa.gov/physci/repo/data/investigations/"
        )
            ? item.url
            : null;

    return `
        <div class="finding-card-links">

            <a href="${escapeHTML(detailURL)}">
                INVESTIGATION DETAILS ↗
            </a>

            ${
                sourceURL
                ? `<a
                    href="${escapeHTML(sourceURL)}"
                    target="_blank"
                    rel="noopener noreferrer">
                    NASA PSI SOURCE ↗
                   </a>`
                : ""
            }

        </div>
    `;
}


function renderFindingCard(config) {

    const item = config.investigation;
    const count = config.evidenceCount;

    const statusClass = config.statusClass || "finding-status-limited";

    return `
        <article class="scientific-finding-card ${escapeHTML(config.cardClass)}">

            <div class="finding-card-top">

                <span class="finding-pillar-label">
                    ${escapeHTML(config.pillar)}
                </span>

                <span class="finding-status ${statusClass}">
                    ${escapeHTML(config.status)}
                </span>

            </div>

            <h4>${escapeHTML(config.title)}</h4>

            <p class="finding-card-description">
                ${escapeHTML(config.description)}
            </p>

            <div class="finding-investigation-identity">
                <strong>${escapeHTML(item.name)}</strong>
                <span>${escapeHTML(item.id)} · ${escapeHTML(item.type)}</span>
            </div>

            ${
                count > 0
                ? `<div class="finding-evidence-count">
                    ${count} LINKED EVIDENCE RECORD${count === 1 ? "" : "S"}
                   </div>`
                : `<div class="finding-no-data">
                    NO LOCAL NUMERICAL FINDINGS INTEGRATED
                   </div>`
            }

            <div class="finding-metrics">
                ${config.metrics || ""}
            </div>

            ${
                config.extra || ""
            }

            ${
                config.limitation
                ? `<div class="finding-limitation">
                    <strong>Interpretation boundary</strong>
                    <p>${escapeHTML(config.limitation)}</p>
                   </div>`
                : ""
            }

            ${renderFindingInvestigationLink(item)}

        </article>
    `;
}


function renderSameRPairComparison(comparison) {

    if (!comparison || !Array.isArray(comparison.instruments)) {
        return "";
    }

    const sts = comparison.instruments.find(
        item => item.key === "sts_voltage"
    );

    if (!sts) {
        return "";
    }

    const conditions = comparison.condition_summary || {};

    return `
        <div class="finding-comparison">

            <div class="finding-comparison-heading">
                T08 / T11 NEAR-MATCHED COMPARISON
            </div>

            <div class="finding-comparison-values">

                <div>
                    <span>T08 · STS OUTPUT</span>
                    <strong>${escapeHTML(sts.t08.toFixed(6))} V</strong>
                </div>

                <div>
                    <span>T11 · STS OUTPUT</span>
                    <strong>${escapeHTML(sts.t11.toFixed(6))} V</strong>
                </div>

            </div>

            <div class="finding-comparison-context">
                <strong>
                    ${conditions.matched_count ?? 0} matched conditions
                    ·
                    ${conditions.different_count ?? 0} different conditions
                </strong>

                <p>
                    T08 and T11 used the same material and detector
                    configuration, but their inlet velocities and
                    Rt/R0 values differed.
                </p>
            </div>

            <p class="finding-comparison-limitation">
                ${escapeHTML(comparison.limitation)}
            </p>

            <a href="/comparison#samer-t08-t11-comparison">
                EXPLORE FULL COMPARISON ↗
            </a>

        </div>
    `;
}


function renderScientificFindings(data) {

    const container = document.getElementById(
        "scientificFindingsGrid"
    );

    if (!container) return;

    const records = data.evidence;
    const investigations = data.investigations;
    const availability = data.availability;
    const comparison = data.sameRComparison;

    const numericalEvidenceIds = new Set(
        availability.investigations
            .filter(item =>
                item.has_numerical_telemetry ||
                item.has_numerical_results
            )
            .map(item => item.id)
    );

    document.getElementById(
        "findingsEvidenceCount"
    ).textContent = records.length;

    document.getElementById(
        "findingsInvestigationCount"
    ).textContent = new Set(
        records.map(item => item.investigation)
    ).size;

    document.getElementById(
        "findingsNumericalCount"
    ).textContent = numericalEvidenceIds.size;


    // =====================================
    // PREVENTION — SAFFIRE-I + BASS-II
    // =====================================

    const saffire = getFindingInvestigation(
        investigations,
        "PSI-98"
    );

    const bass = getFindingInvestigation(
        investigations,
        "PSI-25"
    );

    const saffirePeak = getFindingRecord(
        records,
        "PSI98-TC3-PEAK"
    );

    const saffireRise = getFindingRecord(
        records,
        "PSI98-TC3-RISE"
    );

    const bassAirflow = getFindingRecord(
        records,
        "PSI25-AIRFLOW"
    );

    const bassOxygen = getFindingRecord(
        records,
        "PSI25-OXYGEN"
    );

    const preventionMetrics = [
        renderFindingMetric(saffirePeak, "SAFFIRE-I · TC3 peak"),
        renderFindingMetric(saffireRise, "SAFFIRE-I · TC3 rise"),
        renderFindingMetric(bassAirflow, "BASS-II · airflow capability"),
        renderFindingMetric(bassOxygen, "BASS-II · oxygen conditions")
    ].join("");

    const preventionCard = `
        <article class="scientific-finding-card finding-prevention">

            <div class="finding-card-top">
                <span class="finding-pillar-label">PREVENTION</span>
                <span class="finding-status finding-status-measured">
                    TELEMETRY + METADATA
                </span>
            </div>

            <h4>Understand solid-fuel fire behaviour</h4>

            <p class="finding-card-description">
                Combine SAFFIRE-I thermal telemetry with BASS-II
                documented combustion conditions to examine material
                flammability, thermal response and experimental variables.
            </p>

            <div class="finding-investigation-identity">
                <strong>SAFFIRE-I · PSI-98</strong>
                <span>
                    ${getFindingEvidenceCount(records, "PSI-98")}
                    linked records
                </span>
            </div>

            <div class="finding-metrics">
                ${renderFindingMetric(saffirePeak, "TC3 measured peak")}
                ${renderFindingMetric(saffireRise, "TC3 derived temperature rise")}
            </div>

            <div class="finding-investigation-identity">
                <strong>BASS-II · PSI-25</strong>
                <span>
                    ${getFindingEvidenceCount(records, "PSI-25")}
                    documented records
                </span>
            </div>

            <div class="finding-metrics">
                ${renderFindingMetric(bassAirflow, "Maximum airflow capability")}
                ${renderFindingMetric(bassOxygen, "Oxygen conditions")}
            </div>

            <div class="finding-limitation">
                <strong>Interpretation boundary</strong>
                <p>
                    SAFFIRE-I values are measurements from Sample 2.
                    BASS-II values describe documented experimental
                    conditions, not individual test outcomes.
                </p>
            </div>

            ${renderFindingInvestigationLink(saffire)}
            ${renderFindingInvestigationLink(bass)}

        </article>
    `;


    // =====================================
    // DETECTION — SAME-R
    // =====================================

    const sameR = getFindingInvestigation(
        investigations,
        "PSI-101"
    );

    const sameRSts = getFindingRecord(
        records,
        "PSI101-T11-STS"
    );

    const sameRDustTrak = getFindingRecord(
        records,
        "PSI101-T11-DUSTTRAK"
    );

    const sameRPtrak = getFindingRecord(
        records,
        "PSI101-T11-PTRAK"
    );

    const sameRParticleSize = getFindingRecord(
        records,
        "PSI101-T11-AMD"
    );

    const sameRAnomaly = getFindingRecord(
        records,
        "PSI101-T11-ANOMALY"
    );

    const detectionMetrics = [
        renderFindingMetric(sameRSts, "T11 · STS output"),
        renderFindingMetric(sameRDustTrak, "T11 · DustTrak B"),
        renderFindingMetric(sameRPtrak, "T11 · P-Trak"),
        renderFindingMetric(sameRParticleSize, "T11 · average particle diameter")
    ].join("");

    const detectionCard = `
        <article class="scientific-finding-card finding-detection">

            <div class="finding-card-top">
                <span class="finding-pillar-label">DETECTION</span>
                <span class="finding-status finding-status-measured">
                    NUMERICAL TEST RESULTS
                </span>
            </div>

            <h4>Investigate smoke aerosol and detector response</h4>

            <p class="finding-card-description">
                SAME-R provides measured aerosol and detector-channel
                results that support investigation of smoke properties
                and detection behaviour in reduced gravity.
            </p>

            <div class="finding-investigation-identity">
                <strong>SAME-R · PSI-101 · T11 Teflon</strong>
                <span>
                    ${getFindingEvidenceCount(records, "PSI-101")}
                    linked records
                </span>
            </div>

            <div class="finding-metrics">
                ${detectionMetrics}
            </div>

            <div class="finding-anomaly">
                <span>RETAINED SCIENTIFIC ANOMALY</span>
                <strong>${formatFindingValue(sameRAnomaly)}</strong>
                <p>
                    The STS output is unusually low despite non-zero
                    readings from other aerosol measurement channels.
                    Its cause remains undetermined.
                </p>
            </div>

            ${renderSameRPairComparison(comparison)}

            <div class="finding-limitation">
                <strong>Interpretation boundary</strong>
                <p>
                    Different detector channels have different measurement
                    scales. The T08/T11 comparison is near-matched, not
                    fully controlled. The available report does not
                    establish STS-specific failure criteria.
                </p>
            </div>

            ${renderFindingInvestigationLink(sameR)}

        </article>
    `;


    // =====================================
    // SUPPRESSION — FLEX
    // =====================================

    const flex = getFindingInvestigation(
        investigations,
        "PSI-69"
    );

    const suppressionCard = renderFindingCard({
        pillar: "SUPPRESSION",
        title: "Explore flame extinction and suppressant research",
        description:
            "FLEX investigates liquid-fuel flame limits and gaseous fire suppressants, contributing to research relevant to spacecraft fire suppression.",
        investigation: flex,
        evidenceCount: getFindingEvidenceCount(records, "PSI-69"),
        status: "NASA SOURCE RECORD ONLY",
        statusClass: "finding-status-limited",
        cardClass: "finding-suppression",
        metrics: `
            <div class="finding-no-data-detail">
                <strong>Numerical findings not integrated locally</strong>
                <p>
                    IGNIS currently links the NASA investigation record,
                    but does not yet contain its numerical experimental
                    results.
                </p>
            </div>
        `,
        limitation:
            "The documented research focus is not a measured suppression-efficiency result."
    });


    // =====================================
    // SUPPORTING RESEARCH — PSI-62
    // =====================================

    const modelling = getFindingInvestigation(
        investigations,
        "PSI-62"
    );

    const supportingCard = renderFindingCard({
        pillar: "SUPPORTING RESEARCH",
        title: "Connect combustion experiments with modelling",
        description:
            "Flame Spread Modelling examines concurrent flame-spread behaviour using computational modelling. It provides supporting research, not another flight experiment.",
        investigation: modelling,
        evidenceCount: getFindingEvidenceCount(records, "PSI-62"),
        status: "NASA SOURCE RECORD ONLY",
        statusClass: "finding-status-limited",
        cardClass: "finding-supporting",
        metrics: `
            <div class="finding-no-data-detail">
                <strong>Ground-based modelling investigation</strong>
                <p>
                    Numerical modelling outputs are not currently
                    integrated into the IGNIS evidence register.
                </p>
            </div>
        `,
        limitation:
            "This investigation is ground-based computational research and must remain distinct from microgravity flight measurements."
    });


    container.innerHTML = [
        preventionCard,
        detectionCard,
        suppressionCard,
        supportingCard
    ].join("");

    console.log(
        "IGNIS Scientific Findings Dashboard loaded.",
        {
            evidenceRecords: records.length,
            investigationsRepresented: 3,
            numericalInvestigations: numericalEvidenceIds.size
        }
    );
}


async function loadScientificFindings() {

    const container = document.getElementById(
        "scientificFindingsGrid"
    );

    if (!container) return;

    try {

        const responses = await Promise.all([
            fetch(SCIENTIFIC_FINDINGS_APIS.evidence),
            fetch(SCIENTIFIC_FINDINGS_APIS.investigations),
            fetch(SCIENTIFIC_FINDINGS_APIS.availability),
            fetch(SCIENTIFIC_FINDINGS_APIS.sameRComparison)
        ]);

        for (const response of responses) {
            if (!response.ok) {
                throw new Error(
                    `API returned HTTP ${response.status}`
                );
            }
        }

        const [
            evidenceData,
            investigationData,
            availabilityData,
            sameRComparison
        ] = await Promise.all(
            responses.map(response => response.json())
        );

        if (
            !Array.isArray(evidenceData.evidence) ||
            !Array.isArray(investigationData.investigations) ||
            !Array.isArray(availabilityData.investigations) ||
            !Array.isArray(sameRComparison.instruments)
        ) {
            throw new Error(
                "Scientific findings API returned an unexpected structure."
            );
        }

        renderScientificFindings({
            evidence: evidenceData.evidence,
            investigations: investigationData.investigations,
            availability: availabilityData,
            sameRComparison
        });

    } catch (error) {

        console.error(
            "IGNIS Scientific Findings error:",
            error
        );

        container.innerHTML = `
            <div class="fire-safety-error">
                Unable to load scientific findings:
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


document.addEventListener(
    "DOMContentLoaded",
    loadScientificFindings
);
