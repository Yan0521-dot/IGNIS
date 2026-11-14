const API_URL = "/api/investigations";

let allInvestigations = [];
let activeFilter = "All";

const grid = document.getElementById("investigationGrid");
const searchInput = document.getElementById("searchInput");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function renderInvestigations() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = allInvestigations.filter(item => {
        const matchesCategory =
            activeFilter === "All" || item.pillar === activeFilter;

        const searchable = [
            item.id,
            item.name,
            item.full_name,
            item.focus,
            item.description,
            item.platform,
            item.type,
            item.pillar
        ].join(" ").toLowerCase();

        return matchesCategory && searchable.includes(query);
    });

    resultsCount.textContent =
        `SHOWING ${filtered.length} OF ${allInvestigations.length} INVESTIGATIONS`;

    grid.innerHTML = filtered.map(item => `
        <article class="investigation-card">
            <div class="card-topline">
                <span class="psi-id">${escapeHTML(item.id)}</span>
                <span class="pillar-tag">${escapeHTML(item.pillar)}</span>
            </div>

            <h3>${escapeHTML(item.name)}</h3>
            <h4>${escapeHTML(item.full_name)}</h4>

            <p>${escapeHTML(item.description)}</p>

            <div class="card-meta">
                <span>${escapeHTML(item.type)}</span>
                <span>${escapeHTML(item.platform)}</span>
            </div>

            <div class="card-focus">
                <span>RESEARCH FOCUS</span>
                <strong>${escapeHTML(item.focus)}</strong>
            </div>

<div class="card-actions">
    <a href="/investigations/${encodeURIComponent(item.slug)}">
        EXPLORE INVESTIGATION →
    </a>
           ${
        item.id === "PSI-98"
        ? `
            <a href="/comparison" class="comparison-link">
                COMPARE WITH BASS-II →
            </a>
          `
        : item.id === "PSI-25"
        ? `
            <a href="/comparison" class="comparison-link">
                COMPARE WITH SAFFIRE-I →
            </a>
          `
        : ""
    }
    ${
        item.id === "PSI-98"
        ? `
            <a href="/?investigation=PSI-98#analytics"
               class="analysis-link">
                OPEN DATA ANALYSIS →
            </a>
          `
        : ""
    }

    <a href="${escapeHTML(item.url)}"
       target="_blank"
       rel="noopener noreferrer"
       class="external-link">
        NASA ↗
    </a>
</div>
        </article>
    `).join("");

    emptyState.classList.toggle("hidden", filtered.length !== 0);
    grid.classList.toggle("hidden", filtered.length === 0);
}

async function loadInvestigations() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        allInvestigations = data.investigations;

        document.getElementById("totalInvestigations").textContent =
            String(data.total).padStart(2, "0");

        renderInvestigations();

        console.log("IGNIS investigation catalogue loaded.", data);

    } catch (error) {
        console.error("Catalogue error:", error);

        grid.innerHTML = `
            <div class="loading-card">
                Unable to load the investigation catalogue.
                Please check the Flask API.
            </div>
        `;
    }
}

searchInput.addEventListener("input", renderInvestigations);

document.getElementById("filterGroup").addEventListener("click", event => {
    const button = event.target.closest(".filter-btn");

    if (!button) return;

    document.querySelectorAll(".filter-btn").forEach(item => {
        item.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    renderInvestigations();
});

document.addEventListener("DOMContentLoaded", loadInvestigations);
