# IGNIS
### Understand Fire. Protect Exploration.

**NASA Space Apps Challenge 2026**

**Selected Challenge:** Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data

IGNIS is a scientific intelligence platform that helps researchers, engineers, and space-safety enthusiasts discover, compare, rank, and interpret NASA combustion science investigations. It transforms difficult-to-navigate microgravity combustion research into structured, traceable fire-safety insights for human space exploration.

---

## Team IGNIS

| Team Member | Role |
|---|---|
| Aathityan Jayaratnam | Software Developer |
| Siti Aminah Binti Abdul Razak | AI Prompter |

---

## The Problem

Fire is a serious safety risk in spacecraft and future human habitats. However, combustion research data is distributed across NASA's Physical Sciences Informatics (PSI) repository and can be difficult to locate, compare, and interpret.

Important experimental information—including fuel materials, oxygen concentration, airflow, flame behaviour, smoke measurements, and suppression methods—needs to be understood in context.

IGNIS addresses this challenge by bringing relevant investigations and their available evidence into one interactive scientific intelligence platform.

## Our Solution

IGNIS organises NASA combustion investigations into four research pillars:

- **Prevention:** Understand material flammability, ignition conditions, and flame spread.
- **Detection:** Explore smoke, aerosol, particle-size, and transport research.
- **Suppression:** Examine flame extinction and suppressant-related investigations.
- **Supporting Research:** Include modelling and fundamental combustion research that provides additional scientific context.

The platform helps users:

1. Discover relevant NASA combustion investigations.
2. Explore investigation objectives, materials, and experimental conditions.
3. Compare documented conditions such as oxygen concentration, airflow, material, and flow configuration where experimental profiles are available.
4. Assess scientific relevance, experimental comparability, and local evidence availability as separate dimensions.
5. Trace findings back to investigation records and available research evidence.
6. Obtain AI-assisted scientific interpretation with evidence references and limitations.

**Important:** IGNIS relevance categories are our own transparent assessment, not official NASA rankings. The platform does not invent experimental results or claim to predict fire behaviour.

---

## Platform Features

| Module | Purpose |
|---|---|
| Dashboard | Main platform overview and navigation |
| Investigation Catalogue | Browse NASA combustion investigations |
| Investigation Intelligence | Assess relevance, experimental comparability, and evidence availability |
| Comparison | Compare documented experimental conditions |
| AI-Assisted Intelligence | Generate evidence-grounded scientific interpretations using Gemini |
| Earth Fire Detection | Explore satellite thermal-anomaly detections using NASA FIRMS |

### Earth Applications Extension

In addition to spacecraft fire safety, IGNIS includes an Earth Fire Detection module.

It integrates the **NASA FIRMS API** to retrieve satellite fire and thermal-anomaly observations for a selected geographical region.

The module provides:
- Interactive geographical mapping.
- Satellite detection information.
- Fire radiative power (FRP) observations where available.
- Date and region filtering.
- Data-source and methodology information.

Satellite thermal anomalies are not automatically confirmed wildfires. FRP is a satellite-derived estimate and should not be interpreted as direct ground-level fire intensity.

This is an additional Earth-applications feature, separate from the core spacecraft combustion intelligence engine.

---

## Technology Stack

| Technology | Usage |
|---|---|
| Python | Backend processing and intelligence logic |
| Flask | Web application and API routes |
| Pandas | Scientific data processing |
| JavaScript | Interactive frontend functionality |
| HTML5 / CSS3 | Interface and responsive layouts |
| Chart.js | Data visualisation |
| Gemini API (`gemini-3.8-flash`) | AI-assisted scientific interpretation |
| NASA PSI | Combustion investigation research and evidence |
| NASA FIRMS | Satellite fire and thermal-anomaly data |
| Leaflet / OpenStreetMap | Interactive Earth Fire Detection map |
| Git / GitHub | Version control and project collaboration |
| Kali Linux | Development environment |

## AI Tools and Development Assistance

AI tools were used as part of the development workflow.

- **ChatGPT:** Used as a development and coding assistant to support implementation, debugging, architecture discussions, testing, and documentation.
- **Google Gemini:** Integrated directly into the IGNIS platform through the Gemini API to provide AI-assisted interpretation of scientific investigation data.

Gemini is used to help interpret structured information and available evidence. It does not replace NASA's original research, independently validate experimental results, or turn missing data into scientific facts.

Scientific claims should always be evaluated against their referenced source material.

---

## System Architecture

```text
NASA PSI Research Data
        |
        v
Investigation Catalogue
        |
        v
Data Processing and
Experimental Profiles
        |
        v
Scientific Intelligence Engine
        |
        +---- Relevance Assessment
        |
        +---- Condition Comparability
        |
        +---- Evidence Availability
        |
        v
Interactive IGNIS Dashboard
        |
        +---- Gemini AI Interpretation
        |
        +---- Scientific Evidence References


NASA FIRMS API
        |
        v
Earth Fire Detection Extension
        |
        v
Interactive Map and Observations
```

---

## Installation and Setup

### Requirements

- Python 3.11 or later
- Git
- Internet connection
- Optional: NASA FIRMS API key
- Optional: Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Yan0521-dot/IGNIS.git
cd IGNIS
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
```

### 3. Activate the environment

```bash
source venv/bin/activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Add your own API keys when available:

```env
GEMINI_API_KEY=your_gemini_api_key
NASA_FIRMS_MAP_KEY=your_nasa_firms_map_key
```

Both integrations are optional. Features that depend on an API key may be unavailable until a valid key is configured.

**Security:** Never commit your actual `.env` file or expose API keys publicly. The repository includes `.env.example` as a configuration template.

### 6. Run IGNIS

```bash
python run.py
```

### 7. Open the platform

Visit:

http://127.0.0.1:5000

---

## Platform Routes

| Route | Description |
|---|---|
| `/` | IGNIS landing page |
| `/dashboard` | Main dashboard |
| `/investigations` | Investigation catalogue |
| `/intelligence` | Scientific intelligence and relevance assessment |
| `/comparison` | Experimental comparison |
| `/earth-fire` | Earth Fire Detection |

---

## Scientific Integrity and Limitations

IGNIS is designed around evidence traceability and transparent interpretation.

- NASA investigation records are distinguished from locally integrated research files.
- Scientific relevance, experimental comparability, and evidence availability are assessed separately.
- An investigation without a locally integrated dataset is not automatically scientifically irrelevant.
- Experimental condition matches depend on documented values and explicitly defined IGNIS tolerances.
- IGNIS relevance categories are not official NASA classifications or rankings.
- Microgravity research must not be presented as actual partial-gravity experimental data.
- Partial-gravity combustion data is not currently represented as an available PSI dataset in this platform.
- AI-generated interpretations are assistance, not authoritative scientific conclusions.

Some large raw research video files are excluded from Git to keep the repository manageable. Consequently, certain local-data features may require additional research files.

---

## Data Sources

- [NASA Physical Sciences Informatics (PSI)](https://psi.nasa.gov/)
- [NASA Fire Information for Resource Management System (FIRMS)](https://firms.modaps.eosdis.nasa.gov/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)

NASA research data and third-party services remain subject to their respective terms and conditions.

---

## Project Repository

GitHub: https://github.com/Yan0521-dot/IGNIS

**IGNIS — Understand Fire. Protect Exploration.**
