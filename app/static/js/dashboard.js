
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



// =========================================
// IGNIS FIRE SAFETY INTELLIGENCE
// =========================================

const FIRE_SAFETY_API =
    "/api/fire-safety-intelligence";

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

function getPillarIcon(name) {
    const icons = {
        "Prevention": "⬡",
        "Detection": "◉",
        "Suppression": "✧",
        "Supporting Research": "⌘"
    };

    return icons[name] || "◇";
}

function renderFireInvestigation(item) {

    const detailURL =
        typeof item.detail_url === "string" &&
        item.detail_url.startsWith("/investigations/")
            ? item.detail_url
            : "#";

    const sourceURL =
        typeof item.url === "string" &&
        item.url.startsWith(
            "https://psi.nasa.gov/physci/repo/data/investigations/"
        )
            ? item.url
            : "#";

    return `
        <article class="fire-investigation-card">

            <div class="fire-investigation-top">
                <span class="fire-investigation-id">
                    ${escapeHTML(item.id)}
                </span>

                <span class="fire-investigation-type">
                    ${escapeHTML(item.type)}
                </span>
            </div>

            <h5>${escapeHTML(item.name)}</h5>

            <p class="fire-investigation-focus">
                ${escapeHTML(item.focus)}
            </p>

            <p class="fire-investigation-platform">
                PLATFORM · ${escapeHTML(item.platform)}
            </p>

            <div class="fire-investigation-links">
                <a href="${escapeHTML(detailURL)}">
                    INVESTIGATION DETAILS ↗
                </a>

                <a
                    href="${escapeHTML(sourceURL)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    NASA PSI SOURCE ↗
                </a>
            </div>

        </article>
    `;
}

function renderFirePillar(pillar) {

    const investigations =
        Array.isArray(pillar.investigations)
            ? pillar.investigations
            : [];

    const cards = investigations.length
        ? investigations.map(renderFireInvestigation).join("")
        : `<p class="fire-pillar-empty">
               No investigations currently registered.
           </p>`;

    return `
        <article class="fire-pillar-card">

            <div class="fire-pillar-header">

                <div class="fire-pillar-heading">

                    <div class="fire-pillar-icon">
                        ${getPillarIcon(pillar.name)}
                    </div>

                    <div>
                        <h4>${escapeHTML(pillar.name)}</h4>

                        <span class="fire-pillar-count">
                            ${investigations.length}
                            INVESTIGATION${investigations.length === 1 ? "" : "S"}
                        </span>
                    </div>

                </div>

            </div>

            <p class="fire-pillar-description">
                ${escapeHTML(pillar.description)}
            </p>

            <div class="fire-investigation-list">
                ${cards}
            </div>

        </article>
    `;
}

async function loadFireSafetyIntelligence() {

    const container =
        document.getElementById("fireSafetyPillars");

    if (!container) {
        return;
    }

    try {

        const response = await fetch(FIRE_SAFETY_API);

        if (!response.ok) {
            throw new Error(
                "API returned HTTP " + response.status
            );
        }

        const data = await response.json();

        if (
            !Array.isArray(data.pillars) ||
            data.total_investigations === undefined
        ) {
            throw new Error(
                "Invalid fire-safety intelligence response."
            );
        }

        document.getElementById(
            "intelligenceTotal"
        ).textContent = data.total_investigations;

        document.getElementById(
            "intelligencePillars"
        ).textContent = data.total_pillars;

        document.getElementById(
            "intelligenceClassification"
        ).textContent = data.classification_note;

        container.innerHTML = data.pillars
            .map(renderFirePillar)
            .join("");

        console.log(
            "IGNIS Fire Safety Intelligence loaded.",
            data
        );

    } catch (error) {

        console.error(
            "IGNIS Fire Safety Intelligence error:",
            error
        );

        container.innerHTML = `
            <div class="fire-safety-error">
                Unable to load the fire-safety research catalogue.
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}

// =========================================
// INITIALIZE FIRE SAFETY INTELLIGENCE
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    loadFireSafetyIntelligence
);


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
