
const API_URL = "/api/dashboard-data";

const sensorColors = [
    "#55b9f5",
    "#a78bfa",
    "#ff914d",
    "#48d6a0",
    "#f16d75",
    "#e5c46a"
];

let temperatureChart = null;
let sensorChart = null;

function formatNumber(value, decimals = 2) {
    return Number(value).toFixed(decimals);
}

function showError(message) {
    const element = document.getElementById("errorMessage");
    element.textContent = "Unable to load investigation data: " + message;
    element.classList.remove("hidden");
}

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

function renderTemperatureChart(data) {
    const selected = data.telemetry.filter(row =>
        row["Elapsed Time (s)"] >= 60 &&
        row["Elapsed Time (s)"] <= 150
    );

    const labels = selected.map(row => row["Elapsed Time (s)"]);

    const datasets = data.sensors.map((sensor, index) => ({
        label: sensor.sensor,
        data: selected.map(row => row[sensor.sensor]),
        borderColor: sensorColors[index],
        backgroundColor: sensorColors[index] + "18",
        borderWidth: sensor.sensor.includes("TC3") ? 2.8 : 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.25,
        spanGaps: false
    }));

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

function renderSensorChart(data) {
    const sensors = data.sensors;

    const ctx = document.getElementById("sensorChart");

    if (sensorChart) {
        sensorChart.destroy();
    }

    sensorChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sensors.map(s => s.sensor.replace("Plume Temp ", "")),
            datasets: [{
                label: "Peak temperature",
                data: sensors.map(s => s.peak),
                backgroundColor: sensorColors,
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
                        text: "Temperature (°C)",
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

function renderThresholds(data) {
    const container = document.getElementById("thresholdList");

    const maxDuration = Math.max(
        ...data.tc3_thresholds.map(x => x.cumulative_seconds),
        1
    );

    container.innerHTML = data.tc3_thresholds.map(item => {
        const percentage =
            item.cumulative_seconds / maxDuration * 100;

        return `
            <div class="threshold-row">
                <div class="threshold-label">
                    <span>Above ${item.threshold}°C</span>
                    <strong>${formatNumber(item.cumulative_seconds, 3)} s</strong>
                </div>
                <div class="threshold-track">
                    <div class="threshold-fill"
                         style="width:${percentage}%"></div>
                </div>
                <div class="threshold-label">
                    <span>${item.readings.toLocaleString()} readings</span>
                    <span>${item.first_time}s – ${item.last_time}s</span>
                </div>
            </div>
        `;
    }).join("");
}

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

    const missing = data.dataset.raw_rows -
                    data.dataset.timestamped_rows;

    document.getElementById("dataInsight").textContent =
        `${data.dataset.timestamped_rows.toLocaleString()} of ` +
        `${data.dataset.raw_rows.toLocaleString()} rows have valid ` +
        `elapsed timestamps. An additional ${missing.toLocaleString()} ` +
        `rows lack elapsed timestamps and are excluded from the ` +
        `time-series analysis.`;
}

async function loadDashboard() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("API returned HTTP " + response.status);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        updateMetricCards(data);
        renderTemperatureChart(data);
        renderSensorChart(data);
        renderThresholds(data);
        renderTimeline(data);
        renderInsights(data);

        document.getElementById("currentDate").textContent =
            new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }).format(new Date()).toUpperCase();

        console.log("IGNIS dashboard connected to NASA PSI data.", data);

    } catch (error) {
        console.error("IGNIS API error:", error);
        showError(error.message);
    }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
