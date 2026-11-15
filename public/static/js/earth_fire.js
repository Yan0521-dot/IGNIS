"use strict";

(() => {
    const API_URL = "/api/earth-fire";
    const PAGE_SIZE = 20;

    const state = {
        observations: [],
        filtered: [],
        map: null,
        markerLayer: null,
        page: 1,
        loading: false,
        currentSource: "combined",
        currentDays: 3,
    };

    const elements = {
        source: document.getElementById("earth-source"),
        days: document.getElementById("earth-days"),
        refresh: document.getElementById("earth-refresh"),
        status: document.getElementById("earth-status"),
        search: document.getElementById("earth-search"),
        tableBody: document.getElementById("earth-table-body"),
        tableCount: document.getElementById("earth-register-count"),
        previous: document.getElementById("earth-prev"),
        next: document.getElementById("earth-next"),
        pageLabel: document.getElementById("earth-page-label"),
        mapCount: document.getElementById("map-visible-count"),
        metricObservations: document.getElementById("metric-observations"),
        metricHigh: document.getElementById("metric-high"),
        metricMaxFrp: document.getElementById("metric-max-frp"),
        metricMeanFrp: document.getElementById("metric-mean-frp"),
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        })[character]);
    }

    function formatNumber(value, decimals = 2) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString("en-US", {
            maximumFractionDigits: decimals,
        });
    }

    function confidenceName(value) {
        const names = {
            h: "High",
            n: "Nominal",
            l: "Low",
            unknown: "Unknown",
        };

        return names[value] || "Unknown";
    }

    function confidenceColor(value) {
        const colors = {
            h: "#ff765e",
            n: "#ffb35b",
            l: "#f3d66b",
            unknown: "#91a0b3",
        };

        return colors[value] || colors.unknown;
    }

    function selectedConfidences() {
        return new Set(
            [...document.querySelectorAll(".earth-check input:checked")]
                .map(input => input.value)
        );
    }

    function confidenceFor(record) {
        return record.confidence || "unknown";
    }

    function setStatus(message, type = "") {
        elements.status.textContent = message;
        elements.status.className = `earth-status ${type}`.trim();
    }

    function initializeMap() {
        if (typeof L === "undefined") {
            setStatus(
                "Leaflet could not load. Check your internet connection or CDN access.",
                "error"
            );
            return;
        }

        state.map = L.map("earth-map", {
            preferCanvas: true,
            zoomControl: true,
        }).setView([4.2, 109.5], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(state.map);

        state.markerLayer = L.layerGroup().addTo(state.map);
    }

    function createPopup(record) {
        return `
            <div class="earth-popup">
                <div class="earth-popup-title">THERMAL ANOMALY OBSERVATION</div>
                <div><strong>Satellite:</strong> ${escapeHTML(record.satellite)}</div>
                <div><strong>Source:</strong> ${escapeHTML(record.source)}</div>
                <div><strong>Date:</strong> ${escapeHTML(record.acquisition_date)} UTC</div>
                <div><strong>Time:</strong> ${escapeHTML(record.acquisition_time_utc || "Unknown")} UTC</div>
                <div><strong>Confidence:</strong> ${escapeHTML(confidenceName(confidenceFor(record)))}</div>
                <div><strong>FRP:</strong> ${formatNumber(record.fire_radiative_power_mw)} MW</div>
                <div><strong>Latitude:</strong> ${formatNumber(record.latitude, 5)}</div>
                <div><strong>Longitude:</strong> ${formatNumber(record.longitude, 5)}</div>
                <div><strong>Day/Night:</strong> ${escapeHTML(record.daynight || "Unknown")}</div>
            </div>
        `;
    }

    function renderMap(records) {
        if (!state.map || !state.markerLayer) return;

        state.markerLayer.clearLayers();

        const renderer = L.canvas({ padding: 0.5 });

        records.forEach(record => {
            if (
                !Number.isFinite(Number(record.latitude)) ||
                !Number.isFinite(Number(record.longitude))
            ) {
                return;
            }

            L.circleMarker(
                [Number(record.latitude), Number(record.longitude)],
                {
                    renderer,
                    radius: 4,
                    color: confidenceColor(confidenceFor(record)),
                    fillColor: confidenceColor(confidenceFor(record)),
                    fillOpacity: 0.78,
                    weight: 0.7,
                }
            )
                .bindPopup(createPopup(record))
                .addTo(state.markerLayer);
        });

        elements.mapCount.textContent = records.length.toLocaleString();
    }

    function renderMetrics(records) {
        const highCount = records.filter(
            record => confidenceFor(record) === "h"
        ).length;

        const frp = records
            .map(record => record.fire_radiative_power_mw)
            .filter(value => value !== null && Number.isFinite(Number(value)))
            .map(Number);

        const maximum = frp.length ? Math.max(...frp) : null;
        const mean = frp.length
            ? frp.reduce((sum, value) => sum + value, 0) / frp.length
            : null;

        elements.metricObservations.textContent = records.length.toLocaleString();
        elements.metricHigh.textContent = highCount.toLocaleString();
        elements.metricMaxFrp.textContent = formatNumber(maximum);
        elements.metricMeanFrp.textContent = formatNumber(mean);
    }

    function renderTable() {
        const total = state.filtered.length;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        state.page = Math.min(Math.max(1, state.page), pages);

        const start = (state.page - 1) * PAGE_SIZE;
        const pageRecords = state.filtered.slice(start, start + PAGE_SIZE);

        elements.tableCount.textContent =
            `${total.toLocaleString()} records`;

        elements.pageLabel.textContent =
            `Page ${state.page} of ${pages}`;

        elements.previous.disabled = state.page <= 1;
        elements.next.disabled = state.page >= pages;

        if (!pageRecords.length) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="earth-table-empty">
                        No observations match the selected filters.
                    </td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = pageRecords.map(record => {
            const confidence = confidenceFor(record);

            return `
                <tr>
                    <td>${escapeHTML(record.acquisition_date || "—")}</td>
                    <td>${escapeHTML(record.acquisition_time_utc || "—")}</td>
                    <td>${escapeHTML(record.satellite || "—")}</td>
                    <td>
                        <span class="earth-confidence-label">
                            <span class="confidence-dot ${escapeHTML(confidence)}"></span>
                            ${escapeHTML(confidenceName(confidence))}
                        </span>
                    </td>
                    <td>${formatNumber(record.fire_radiative_power_mw)}</td>
                    <td>${formatNumber(record.latitude, 5)}</td>
                    <td>${formatNumber(record.longitude, 5)}</td>
                    <td>${escapeHTML(record.daynight || "—")}</td>
                </tr>
            `;
        }).join("");
    }

    function applyFilters() {
        const confidences = selectedConfidences();
        const search = elements.search.value.trim().toLowerCase();

        state.filtered = state.observations.filter(record => {
            if (!confidences.has(confidenceFor(record))) {
                return false;
            }

            if (!search) return true;

            const searchable = [
                record.satellite,
                record.source,
                record.acquisition_date,
                record.acquisition_time_utc,
                record.confidence,
                record.latitude,
                record.longitude,
                record.daynight,
                record.fire_radiative_power_mw,
            ].join(" ").toLowerCase();

            return searchable.includes(search);
        });

        state.page = 1;

        renderMetrics(state.filtered);
        renderMap(state.filtered);
        renderTable();
    }

    async function loadObservations(forceRefresh = false) {
        if (state.loading) return;

        state.loading = true;
        elements.refresh.disabled = true;
        elements.refresh.textContent = "Loading...";

        const source = elements.source.value;
        const days = elements.days.value;

        state.currentSource = source;
        state.currentDays = Number(days);

        setStatus("Retrieving satellite observations from NASA FIRMS...");

        const params = new URLSearchParams({
            source,
            days,
        });

        if (forceRefresh) {
            params.set("refresh", "true");
        }

        try {
            const response = await fetch(`${API_URL}?${params.toString()}`, {
                headers: { "Accept": "application/json" },
            });

            const result = await response.json();

            if (!response.ok || result.status === "error") {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            state.observations = Array.isArray(result.observations)
                ? result.observations
                : [];

            applyFilters();

            const feedSummary = (result.sources || [])
                .map(feed => `${feed.satellite}: ${feed.record_count.toLocaleString()}`)
                .join(" · ");

            let message =
                `${result.record_count.toLocaleString()} satellite observations loaded · ` +
                `${result.days_requested} day window · ${feedSummary || result.source}`;

            if (result.status === "partial") {
                message += " · Some satellite feeds are unavailable.";
                setStatus(message, "error");
            } else {
                setStatus(message, "success");
            }

            if (result.failed_sources && result.failed_sources.length) {
                console.warn("Unavailable NASA FIRMS feeds:", result.failed_sources);
            }

        } catch (error) {
            console.error("Earth Fire data loading failed:", error);
            state.observations = [];
            applyFilters();
            setStatus(`Unable to load observations: ${error.message}`, "error");

            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="earth-table-empty">
                        NASA FIRMS data could not be loaded. Try refreshing later.
                    </td>
                </tr>
            `;

        } finally {
            state.loading = false;
            elements.refresh.disabled = false;
            elements.refresh.textContent = "↻ Refresh observations";
        }
    }

    function bindEvents() {
        elements.source.addEventListener("change", () => loadObservations());
        elements.days.addEventListener("change", () => loadObservations());

        elements.refresh.addEventListener("click", () => {
            loadObservations(true);
        });

        elements.search.addEventListener("input", applyFilters);

        document.querySelectorAll(".earth-check input").forEach(input => {
            input.addEventListener("change", applyFilters);
        });

        elements.previous.addEventListener("click", () => {
            if (state.page > 1) {
                state.page--;
                renderTable();
            }
        });

        elements.next.addEventListener("click", () => {
            const pages = Math.max(
                1,
                Math.ceil(state.filtered.length / PAGE_SIZE)
            );

            if (state.page < pages) {
                state.page++;
                renderTable();
            }
        });
    }

    function initialize() {
        initializeMap();
        bindEvents();
        loadObservations();
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
