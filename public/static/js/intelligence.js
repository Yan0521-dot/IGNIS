"use strict";

const INTELLIGENCE_API = "/api/intelligence/assess";
const INTELLIGENCE_AI_API = "/api/intelligence/ai-assess";

let lastScenario = null;
let aiJobRunning = false;

const scenarioForm = document.getElementById("scenarioForm");
const assessButton = document.getElementById("assessButton");
const engineError = document.getElementById("engineError");
const resultsSection = document.getElementById("resultsSection");
const emptyResults = document.getElementById("emptyResults");
const aiAssessButton = document.getElementById("aiAssessButton");
const aiError = document.getElementById("aiError");
const aiResults = document.getElementById("aiResults");
const aiStatus = document.getElementById("aiStatus");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function optionalNumber(value) {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function classificationLabel(classification) {
    const labels = {
        measured: "MEASURED",
        derived: "DERIVED",
        documented_metadata: "DOCUMENTED METADATA",
        unclassified: "UNCLASSIFIED"
    };
    return labels[classification] || "UNCLASSIFIED";
}

function formatValue(value, unit) {
    if (value === null || value === undefined || value === "") {
        return "Value not supplied";
    }

    let formatted = value;

    if (typeof value === "number") {
        formatted = Number(value.toPrecision(8)).toString();
    }

    return `${formatted}${unit ? ` ${unit}` : ""}`;
}

function safeExternalURL(value) {
    if (!value) return null;

    try {
        const parsed = new URL(value, window.location.origin);
        if (parsed.protocol !== "https:") return null;
        return parsed.href;
    } catch {
        return null;
    }
}

function sourceLinks(source) {
    if (!source || typeof source !== "object") return "";

    const links = [];

    const url = safeExternalURL(source.url);
    if (url) {
        links.push(
            `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>`
        );
    }

    if (source.doi) {
        const doi = String(source.doi).trim();
        const doiURL = safeExternalURL(`https://doi.org/${doi}`);

        if (doiURL) {
            links.push(
                `<a href="${escapeHTML(doiURL)}" target="_blank" rel="noopener noreferrer">DOI: ${escapeHTML(doi)} ↗</a>`
            );
        }
    }

    return links.length
        ? `<div class="evidence-source">${links.join("")}</div>`
        : "";
}

function renderEvidence(record) {
    const classification = record.classification || "unclassified";
    const finding = escapeHTML(record.finding || "No finding description supplied.");
    const value = formatValue(record.value, record.unit);

    const details = [
        record.sample ? `Sample: ${record.sample}` : null,
        record.sensor ? `Sensor: ${record.sensor}` : null,
        record.subject ? `Subject: ${record.subject}` : null,
        record.interpretation || null
    ].filter(Boolean);

    return `
        <article class="evidence-record">
            <div class="evidence-record-top">
                <span class="evidence-record-id">${escapeHTML(record.id || "UNSPECIFIED RECORD")}</span>
                <span class="evidence-classification classification-${escapeHTML(classification)}">
                    ${escapeHTML(classificationLabel(classification))}
                </span>
            </div>

            <p class="evidence-finding">${finding}</p>
            <div class="evidence-value">${escapeHTML(value)}</div>

            ${details.length ? `
                <p class="evidence-detail">
                    ${details.map(escapeHTML).join(" · ")}
                </p>
            ` : ""}

            ${record.limitation ? `
                <div class="evidence-limitation">
                    <strong>LIMITATION:</strong>
                    ${escapeHTML(record.limitation)}
                </div>
            ` : ""}

            ${sourceLinks(record.source)}
        </article>
    `;
}

function renderIntelligenceDimensions(item) {
    const relevance = item.scientific_relevance || {};
    const comparability = item.condition_comparability || {};

    const relevanceCategories = [
        "directly_relevant",
        "supporting_research",
        "limited_relevance"
    ];

    const relevanceCategory = relevanceCategories.includes(relevance.category)
        ? relevance.category
        : "limited_relevance";

    const relevanceLabel = relevance.label || "Relevance not classified";
    const relevanceExplanation =
        relevance.explanation || "No classification explanation was supplied.";

    const profiles = Array.isArray(comparability.profiles)
        ? comparability.profiles
        : [];

    const comparabilityStatus = comparability.status || "not_assessed";

    const profileMarkup = profiles.length
        ? profiles.map(profile => {
            const status = profile.match_status || "not_assessed";
            const profileName = profile.record_name || profile.profile_id || "Experimental profile";

            return `
                <div class="dimension-profile">
                    <span>${escapeHTML(profileName)}</span>
                    <span class="match-status match-${matchStatusClass(status)}">
                        ${escapeHTML(matchStatusLabel(status))}
                    </span>
                </div>
            `;
        }).join("")
        : `<p class="dimension-note">
            No documented experimental profile is currently available.
            This is not a finding of no match.
           </p>`;

    const availabilityLabels = {
        telemetry_and_metadata: "Telemetry and metadata",
        numerical_results_and_metadata: "Numerical results and metadata",
        metadata_only: "Metadata only",
        source_record_only: "NASA source record only"
    };

    const availability = item.evidence_availability || "unclassified";
    const availabilityLabel =
        availabilityLabels[availability] || availability.replaceAll("_", " ");

    const evidenceCount = Number(item.evidence_count) || 0;

    return `
        <section class="investigation-intelligence">
            <div class="investigation-intelligence-heading">
                <strong>INTELLIGENCE DIMENSIONS</strong>
                <span>IGNIS assessment · Not an official NASA ranking</span>
            </div>

            <div class="investigation-intelligence-grid">
                <article class="intelligence-dimension">
                    <span class="dimension-label">01 / SCIENTIFIC RELEVANCE</span>
                    <strong class="dimension-value relevance-${relevanceCategory}">
                        ${escapeHTML(relevanceLabel)}
                    </strong>
                    <p>${escapeHTML(relevanceExplanation)}</p>
                </article>

                <article class="intelligence-dimension">
                    <span class="dimension-label">02 / EXPERIMENTAL COMPARABILITY</span>
                    <strong class="dimension-value">
                        ${escapeHTML(
                            comparabilityStatus === "assessed"
                                ? "Profiles assessed"
                                : comparabilityStatus.replaceAll("_", " ")
                        )}
                    </strong>
                    <span class="dimension-count">
                        ${Number(comparability.profile_count) || 0} documented profile(s)
                    </span>
                    <div class="dimension-profiles">
                        ${profileMarkup}
                    </div>
                    <p class="dimension-note">
                        ${escapeHTML(comparability.note || "No comparability explanation supplied.")}
                    </p>
                </article>

                <article class="intelligence-dimension">
                    <span class="dimension-label">03 / EVIDENCE AVAILABILITY</span>
                    <strong class="dimension-value">
                        ${escapeHTML(availabilityLabel)}
                    </strong>
                    <span class="dimension-count">
                        ${evidenceCount} integrated evidence record(s)
                    </span>
                    <p>
                        Availability describes the material currently integrated
                        into IGNIS, not the totality of NASA's published research.
                    </p>
                </article>
            </div>
        </section>
    `;
}

function renderInvestigation(item) {
    const sourceURL = safeExternalURL(item.source_url);
    const sourceLink = sourceURL
        ? `<a class="investigation-source-link" href="${escapeHTML(sourceURL)}" target="_blank" rel="noopener noreferrer">VIEW NASA INVESTIGATION ↗</a>`
        : "";

    const evidence = Array.isArray(item.evidence) ? item.evidence : [];

    return `
        <article class="investigation-result-card">
            <div class="investigation-result-head">
                <div>
                    <div class="investigation-result-id">${escapeHTML(item.investigation_id)}</div>
                    <h4>${escapeHTML(item.name || item.full_name || "Unnamed investigation")}</h4>
                    <p>${escapeHTML(item.focus || item.relevance || "NASA investigation record.")}</p>
                    ${sourceLink}
                </div>
                <span class="result-evidence-count">${Number(item.evidence_count) || 0} RECORDS</span>
            </div>

            <div class="investigation-result-meta">
                <span>${escapeHTML(item.pillar || "Unclassified pillar")}</span>
                <span>${escapeHTML(item.investigation_type || "Investigation type unavailable")}</span>
                <span>${escapeHTML(item.platform || "Platform not specified")}</span>
                <span>${escapeHTML(item.evidence_availability || "Availability not classified")}</span>
            </div>

            ${renderIntelligenceDimensions(item)}

            ${evidence.length
                ? `<div class="evidence-list">${evidence.map(renderEvidence).join("")}</div>`
                : `<div class="no-evidence-note">
                    No local numerical evidence records are currently attached to this investigation.
                    Its NASA source record remains available for research context.
                   </div>`
            }

            <div class="investigation-assessment-note">
                ${escapeHTML(item.assessment_note || "Investigation-level relevance only.")}
            </div>
        </article>
    `;
}

function renderConditions(scenario) {
    const labels = {
        name: "Scenario",
        pillar: "Pillar",
        environment: "Environment",
        material: "Material",
        oxygen_percent: "Oxygen",
        airflow_cm_s: "Airflow",
        flow_configuration: "Flow"
    };

    const units = {
        oxygen_percent: "%",
        airflow_cm_s: " cm/s"
    };

    const chips = Object.entries(labels)
        .filter(([key]) => scenario[key] !== null && scenario[key] !== undefined && scenario[key] !== "")
        .map(([key, label]) => {
            let value = scenario[key];

            if (key === "environment") {
                value = value === "microgravity"
                    ? "Microgravity"
                    : value === "ground" ? "Ground-based" : "Any";
            }

            if (key === "flow_configuration") {
                value = String(value).replaceAll("-", " ");
            }

            return `<span class="condition-chip"><strong>${escapeHTML(label)}:</strong> ${escapeHTML(value)}${units[key] || ""}</span>`;
        });

    document.getElementById("submittedConditions").innerHTML =
        chips.length ? chips.join("") : '<span class="condition-chip">No additional conditions supplied</span>';
}


function matchStatusLabel(status) {
    const labels = {
        exact: "EXACT ON SUPPLIED CONDITIONS",
        partial: "PARTIAL MATCH",
        contextual: "CONTEXTUAL MATCH",
        no_match: "NO MATCH",
        insufficient_data: "INSUFFICIENT DATA",
        not_assessed: "NOT ASSESSED"
    };

    return labels[status] || String(status || "UNKNOWN").replaceAll("_", " ").toUpperCase();
}

function matchStatusClass(status) {
    const allowed = [
        "exact",
        "partial",
        "contextual",
        "no_match",
        "insufficient_data",
        "not_assessed"
    ];

    return allowed.includes(status) ? status : "unknown";
}

function renderConditionDetail(key, item) {
    const labels = {
        material: "Material",
        oxygen_percent: "Oxygen concentration",
        airflow_cm_s: "Airflow",
        flow_configuration: "Flow configuration"
    };

    const status = item.status || "unknown";
    const requested = item.requested === null || item.requested === undefined
        ? "Not supplied"
        : String(item.requested);

    let documented = "Not established";

    if (item.documented !== undefined && item.documented !== null) {
        documented = typeof item.documented === "object"
            ? JSON.stringify(item.documented)
            : String(item.documented);
    } else if (item.documented_range) {
        documented = `${item.documented_range[0]}–${item.documented_range[1]}`;
    } else if (item.documented_approximate_value !== undefined) {
        documented = `Approximately ${item.documented_approximate_value}`;
    } else if (item.documented_maximum !== undefined) {
        documented = `Up to ${item.documented_maximum}`;
    } else if (item.documented_upper_bound_exclusive !== undefined) {
        documented = `Below ${item.documented_upper_bound_exclusive}`;
    } else if (item.documented_choices) {
        documented = item.documented_choices.join(", ");
    }

    const units = {
        oxygen_percent: "%",
        airflow_cm_s: " cm/s"
    };

    return `
        <div class="condition-match-row">
            <div class="condition-match-row-head">
                <strong>${escapeHTML(labels[key] || key)}</strong>
                <span class="match-status match-${matchStatusClass(status)}">
                    ${escapeHTML(status.replaceAll("_", " ").toUpperCase())}
                </span>
            </div>
            <div class="condition-match-values">
                <span><small>SCENARIO</small>${escapeHTML(requested)}${units[key] || ""}</span>
                <span><small>NASA RECORD</small>${escapeHTML(documented)}${units[key] || ""}</span>
            </div>
            <p>${escapeHTML(item.reason || "No comparison explanation supplied.")}</p>
        </div>
    `;
}

function renderConditionMatch(item) {
    const source = item.source || {};
    const sourceURL = safeExternalURL(source.url);

    const sourceLink = sourceURL
        ? `<a href="${escapeHTML(sourceURL)}" target="_blank" rel="noopener noreferrer">NASA SOURCE ↗</a>`
        : "";

    const conditions = item.conditions || {};
    const coverage = item.coverage || {};

    const conditionRows = Object.entries(conditions)
        .map(([key, value]) => renderConditionDetail(key, value))
        .join("");

    const undocumented = Array.isArray(
        coverage.undocumented_profile_conditions
    )
        ? coverage.undocumented_profile_conditions
        : [];

    const coveragePanel = `
        <div class="condition-coverage">
            <div class="condition-coverage-heading">
                <strong>COMPARISON COVERAGE</strong>
                <span>${escapeHTML(
                    coverage.coverage_label || "Coverage unavailable"
                )}</span>
            </div>

            <div class="condition-coverage-stats">
                <span>
                    <strong>${Number(coverage.exact_condition_count) || 0}</strong>
                    EXACT
                </span>
                <span>
                    <strong>${Number(coverage.partial_condition_count) || 0}</strong>
                    PARTIAL
                </span>
                <span>
                    <strong>${Number(coverage.mismatch_condition_count) || 0}</strong>
                    MISMATCH
                </span>
                <span>
                    <strong>${Number(coverage.unknown_requested_condition_count) || 0}</strong>
                    UNKNOWN
                </span>
                <span>
                    <strong>${Number(coverage.not_supplied_condition_count) || 0}</strong>
                    NOT SUPPLIED
                </span>
            </div>

            ${undocumented.length ? `
                <p class="condition-coverage-unknown">
                    <strong>NOT DOCUMENTED IN THIS NASA PROFILE:</strong>
                    ${undocumented.map(key =>
                        escapeHTML(key.replaceAll("_", " "))
                    ).join(", ")}
                </p>
            ` : ""}
        </div>
    `;

    const limitations = Array.isArray(item.limitations)
        ? item.limitations
        : [];

    const additional = item.additional_documented_conditions || {};
    const additionalEntries = Object.entries(additional);

    return `
        <article class="condition-match-card">
            <div class="condition-match-card-head">
                <div>
                    <span class="condition-match-id">${escapeHTML(item.profile_id || "PROFILE")}</span>
                    <h4>${escapeHTML(item.investigation_name || "NASA investigation")}</h4>
                    <p>${escapeHTML(item.record_name || "Experimental record")}</p>
                </div>
                <span class="match-status match-${matchStatusClass(item.match_status)}">
                    ${escapeHTML(matchStatusLabel(item.match_status))}
                </span>
            </div>

            <div class="condition-match-meta">
                <span>${escapeHTML(item.investigation_id || "")}</span>
                <span>${escapeHTML(String(item.record_level || "").replaceAll("_", " "))}</span>
                <span>${escapeHTML(item.pillar || "")}</span>
                <span>${escapeHTML(item.environment || "")}</span>
            </div>

            ${coveragePanel}

            <div class="condition-match-grid">
                ${conditionRows}
            </div>

            ${additionalEntries.length ? `
                <div class="additional-condition-data">
                    <strong>ADDITIONAL DOCUMENTED EXPERIMENT CONDITIONS</strong>
                    <p>${additionalEntries.map(([key, value]) =>
                        `${escapeHTML(key.replaceAll("_", " "))}: ${escapeHTML(value)}`
                    ).join(" · ")}</p>
                </div>
            ` : ""}

            ${limitations.length ? `
                <div class="condition-match-limitations">
                    <strong>PROFILE LIMITATIONS</strong>
                    <ul>${limitations.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
                </div>
            ` : ""}

            <div class="condition-match-source">
                ${sourceLink}
                ${source.doi ? `<span>DOI: ${escapeHTML(source.doi)}</span>` : ""}
            </div>
        </article>
    `;
}

function renderConditionMatching(data) {
    const container = document.getElementById("conditionMatchResults");
    if (!container) return;

    const matching = data.condition_matching || {};
    const results = Array.isArray(matching.results) ? matching.results : [];

    if (!results.length) {
        container.innerHTML = `
            <div class="no-evidence-note">
                No experimental profiles were available for the selected
                pillar and environment. This does not mean the scenario is safe
                or that no relevant research exists.
            </div>
        `;
        return;
    }

    const counts = {
        exact: results.filter(item => item.match_status === "exact").length,
        partial: results.filter(item => item.match_status === "partial").length,
        contextual: results.filter(item => item.match_status === "contextual").length,
        other: results.filter(item =>
            !["exact", "partial", "contextual"].includes(item.match_status)
        ).length
    };

    container.innerHTML = `
        <div class="matching-summary">
            <div><strong>${results.length}</strong><span>PROFILES COMPARED</span></div>
            <div><strong>${counts.exact}</strong><span>EXACT</span></div>
            <div><strong>${counts.partial}</strong><span>PARTIAL</span></div>
            <div><strong>${counts.contextual}</strong><span>CONTEXTUAL</span></div>
            <div><strong>${counts.other}</strong><span>OTHER</span></div>
        </div>
        ${results.map(renderConditionMatch).join("")}
        <p class="matching-disclaimer">
            IGNIS condition matching is a deterministic comparison of supplied
            values against documented profiles. It is not a fire-risk score,
            prediction, certification or proof of equivalent experimental outcomes.
        </p>
    `;
}

function renderAssessment(data) {
    const assessment = data.assessment || {};
    const results = Array.isArray(data.results) ? data.results : [];

    document.getElementById("metricInvestigations").textContent =
        assessment.investigation_count ?? results.length;

    document.getElementById("metricEvidence").textContent =
        assessment.evidence_count ?? 0;

    document.getElementById("metricMeasured").textContent =
        assessment.measured_evidence_count ?? 0;

    document.getElementById("metricDerived").textContent =
        assessment.derived_evidence_count ?? 0;

    document.getElementById("metricMetadata").textContent =
        assessment.documented_metadata_count ?? 0;

    document.getElementById("engineVersion").textContent =
        `v${data.engine?.version || "unknown"}`;

    document.getElementById("assessmentMode").textContent =
        String(data.engine?.mode || "DETERMINISTIC RETRIEVAL").replaceAll("_", " ").toUpperCase();

    document.getElementById("conditionStatus").textContent =
        assessment.condition_matching_status === "not_assessed"
            ? "CONDITION MATCHING NOT ASSESSED"
            : String(assessment.condition_matching_status || "NOT ASSESSED").toUpperCase();

    renderConditions(data.scenario || {});
    renderConditionMatching(data);

    const resultContainer = document.getElementById("investigationResults");

    resultContainer.innerHTML = results.length
        ? results.map(renderInvestigation).join("")
        : `<div class="no-evidence-note">
            No investigations matched the selected pillar and environment.
            Try selecting a different category or environment.
           </div>`;

    const limitations = Array.isArray(data.limitations) ? data.limitations : [];

    document.getElementById("limitationsList").innerHTML = limitations.length
        ? limitations.map(item => `<li>${escapeHTML(item)}</li>`).join("")
        : "<li>No limitations were returned by the engine.</li>";

    const traceability = data.traceability || {};
    const traceabilityPassed =
        traceability.evidence_records_include_source_references === true &&
        traceability.original_evidence_types_preserved === true &&
        traceability.unsupported_predictions_generated === false;

    document.getElementById("traceabilityStatus").textContent =
        traceabilityPassed ? "SOURCE REFERENCES PRESERVED" : "REVIEW TRACEABILITY";

    resultsSection.classList.remove("hidden");
    emptyResults.classList.add("hidden");

    aiAssessButton.disabled = false;
    aiStatus.textContent = "DETERMINISTIC RESULTS READY — AI OPTIONAL";

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function renderEvidenceReferences(ids) {
    if (!Array.isArray(ids) || !ids.length) {
        return '<span class="ai-no-references">No direct evidence references supplied.</span>';
    }

    return `
        <div class="ai-evidence-references">
            <span>EVIDENCE REFERENCES</span>
            <div class="ai-evidence-reference-list">
                ${ids.map(id => `
                    <code class="ai-evidence-reference">${escapeHTML(id)}</code>
                `).join(" ")}
            </div>
        </div>
    `;
}

function renderAIInterpretation(data) {
    const interpretation = data.ai_interpretation || data || {};
    const assessment = interpretation.assessment || {};

    if (interpretation.status !== "success" || !assessment) {
        throw new Error("Gemini did not return a valid interpretation.");
    }

    document.getElementById("aiValidationStatus").innerHTML = `
        <span>PROVIDER: ${escapeHTML(interpretation.provider || "Google Gemini API")}</span>
        <span>MODEL: ${escapeHTML(interpretation.model || "Unknown")}</span>
        <span>REFERENCES: ${escapeHTML(interpretation.evidence_reference_validation || "Not verified")}</span>
    `;

    document.getElementById("aiExecutiveSummary").textContent =
        assessment.executive_summary || "No executive summary returned.";

    const findings = Array.isArray(assessment.key_findings)
        ? assessment.key_findings : [];

    document.getElementById("aiKeyFindings").innerHTML = findings.length
        ? findings.map((item, index) => `
            <article class="ai-output-card">
                <span class="ai-item-number">FINDING ${String(index + 1).padStart(2, "0")}</span>
                <h5>${escapeHTML(item.title || "Scientific finding")}</h5>
                <p>${escapeHTML(item.explanation || "")}</p>
                <span class="ai-basis-label">${escapeHTML(
                    String(item.evidence_basis || "contextual").replaceAll("_", " ")
                )}</span>
                ${renderEvidenceReferences(item.evidence_ids)}
            </article>
        `).join("")
        : '<div class="no-evidence-note">No key findings returned.</div>';

    const gaps = Array.isArray(assessment.research_gaps)
        ? assessment.research_gaps : [];

    document.getElementById("aiResearchGaps").innerHTML = gaps.length
        ? gaps.map((item, index) => `
            <article class="ai-output-card">
                <span class="ai-item-number">GAP ${String(index + 1).padStart(2, "0")}</span>
                <h5>${escapeHTML(item.gap || "Research gap")}</h5>
                <p>${escapeHTML(item.why_it_matters || "")}</p>
                ${renderEvidenceReferences(item.evidence_ids)}
            </article>
        `).join("")
        : '<div class="no-evidence-note">No research gaps returned.</div>';

    const recommendations = Array.isArray(assessment.recommendations)
        ? assessment.recommendations : [];

    document.getElementById("aiRecommendations").innerHTML = recommendations.length
        ? recommendations.map((item, index) => `
            <article class="ai-output-card">
                <span class="ai-item-number">RECOMMENDATION ${String(index + 1).padStart(2, "0")}</span>
                <h5>${escapeHTML(item.recommendation || "Recommendation")}</h5>
                <p>${escapeHTML(item.rationale || "")}</p>
                ${renderEvidenceReferences(item.evidence_ids)}
            </article>
        `).join("")
        : '<div class="no-evidence-note">No recommendations returned.</div>';

    document.getElementById("aiScientificCaution").textContent =
        assessment.scientific_caution || "No scientific caution returned.";

    aiResults.classList.remove("hidden");
    aiStatus.textContent = "AI INTERPRETATION COMPLETED";
}


function setAILoading(loading) {
    const disabled = loading || aiJobRunning || !lastScenario;

    aiAssessButton.disabled = disabled;
    aiAssessButton.innerHTML = disabled
        ? "<span>◌</span> GENERATING INTERPRETATION..."
        : "<span>✧</span> GENERATE AI SCIENTIFIC INTERPRETATION";
}

function waitForNextPoll() {
    return new Promise(resolve => setTimeout(resolve, 5000));
}

async function generateAIInterpretation() {
    if (!lastScenario || aiJobRunning || aiAssessButton.disabled) {
        return;
    }

    aiJobRunning = true;
    aiError.classList.add("hidden");
    aiResults.classList.add("hidden");
    setAILoading(true);

    aiStatus.textContent = "STARTING GEMINI BACKGROUND ANALYSIS...";

    try {
        // STEP 1: Create the background interaction.
        const startResponse = await fetch(INTELLIGENCE_AI_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ scenario: lastScenario })
        });

        const startData = await startResponse.json();

        if (!startResponse.ok) {
            throw new Error(
                startData.error || "Could not start AI interpretation."
            );
        }

        const interactionId = startData.ai_job?.interaction_id;

        if (!interactionId) {
            throw new Error(
                "Gemini did not return a background interaction ID."
            );
        }

        aiStatus.textContent = "GEMINI ACCEPTED THE REQUEST. ANALYSING...";

        // STEP 2: Poll the backend every five seconds.
        const maxAttempts = 60;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await waitForNextPoll();

            const statusResponse = await fetch(
                `${INTELLIGENCE_AI_API}/${encodeURIComponent(interactionId)}`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );

            const statusData = await statusResponse.json();

            if (!statusResponse.ok) {
                throw new Error(
                    statusData.error || "Could not retrieve AI job status."
                );
            }

            if (statusData.status === "in_progress" ||
                statusData.status === "queued") {

                aiStatus.textContent =
                    `GEMINI IS ANALYSING SCIENTIFIC EVIDENCE... (${attempt}/${maxAttempts})`;

                continue;
            }

            if (statusData.status === "success") {
                // STEP 3: Render the validated scientific interpretation.
                renderAIInterpretation(statusData);

                document.getElementById("aiInterpretationPanel").scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                return;
            }

            throw new Error(
                statusData.error || "Gemini returned an unexpected job status."
            );
        }

        throw new Error(
            "AI analysis exceeded the five-minute waiting limit. " +
            "The background interaction may still be processing. " +
            "You can start a new interpretation."
        );

    } catch (error) {
        aiError.textContent =
            error.message || "Unable to generate AI interpretation.";

        aiError.classList.remove("hidden");
        aiStatus.textContent = "AI INTERPRETATION FAILED";

    } finally {
        aiJobRunning = false;
        setAILoading(false);
    }
}

aiAssessButton.addEventListener("click", generateAIInterpretation);


function setLoading(loading) {
    assessButton.disabled = loading;
    assessButton.innerHTML = loading
        ? "<span>◌</span> ANALYSING EVIDENCE..."
        : "<span>✧</span> RUN INTELLIGENCE ASSESSMENT";
}

scenarioForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (aiJobRunning) {
        engineError.textContent =
            "Wait for the current AI interpretation to finish before changing the scenario.";
        engineError.classList.remove("hidden");
        return;
    }


    engineError.classList.add("hidden");

    const scenario = {
        name: document.getElementById("scenarioName").value.trim(),
        pillar: document.getElementById("pillar").value,
        environment: document.getElementById("environment").value,
        material: document.getElementById("material").value.trim() || null,
        oxygen_percent: optionalNumber(document.getElementById("oxygen").value),
        airflow_cm_s: optionalNumber(document.getElementById("airflow").value),
        flow_configuration: document.getElementById("flowConfiguration").value || null
    };

    lastScenario = scenario;

    aiResults.classList.add("hidden");
    aiError.classList.add("hidden");
    aiStatus.textContent = "RUN THE DETERMINISTIC ASSESSMENT FIRST";
    setAILoading(false);

    setLoading(true);

    try {
        const response = await fetch(INTELLIGENCE_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ scenario })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "The assessment request failed.");
        }

        if (data.status !== "success") {
            throw new Error("The engine did not return a successful assessment.");
        }

        renderAssessment(data);

    } catch (error) {
        engineError.textContent = error.message || "Unable to complete the assessment.";
        engineError.classList.remove("hidden");
        engineError.scrollIntoView({ behavior: "smooth", block: "center" });

    } finally {
        setLoading(false);
    }
});
