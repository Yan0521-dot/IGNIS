# 🔥 IGNIS
### Understand Fire. Protect Exploration.

**NASA Space Apps Challenge 2026**

**Selected Challenge:** Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data

IGNIS is a scientific intelligence platform that helps researchers, engineers, and space-safety enthusiasts discover, compare, rank, and interpret NASA combustion science investigations.

It transforms difficult-to-navigate microgravity combustion research into structured, traceable fire-safety insights to support safer human space exploration.

---

## 👥 Team IGNIS

| Team Member | Role |
|---|---|
| Aathityan Jayaratnam | Software Developer |
| Siti Aminah Binti Abdul Razak | AI Prompter |

---

## 🚨 The Problem

Fire is a serious safety risk in spacecraft and future human habitats. However, combustion research data is distributed across NASA's Physical Sciences Informatics (PSI) repository and can be difficult to locate, compare, and interpret.

Important experimental information includes:

- Fuel and material properties
- Oxygen concentration
- Airflow and flow configuration
- Flame behaviour and propagation
- Smoke and particle measurements
- Ignition and suppression methods

Understanding these conditions in their experimental context is essential when evaluating fire-safety research.

IGNIS addresses this challenge by bringing relevant investigations and their available evidence into one interactive scientific intelligence platform.

## 💡 Our Solution

IGNIS organises NASA combustion investigations into four research pillars:

| Research Pillar | Focus |
|---|---|
| **Prevention** | Material flammability, ignition conditions, and flame spread |
| **Detection** | Smoke, aerosol, particle-size, and transport research |
| **Suppression** | Flame extinction and suppressant-related investigations |
| **Supporting Research** | Modelling and fundamental combustion research that provides additional scientific context |

### What IGNIS enables

- Discover relevant NASA combustion investigations.
- Explore investigation objectives, materials, and experimental conditions.
- Compare documented conditions such as oxygen concentration, airflow, material, and flow configuration where experimental profiles are available.
- Assess scientific relevance, experimental comparability, and evidence availability as separate dimensions.
- Trace findings back to investigation records and available research evidence.
- Generate AI-assisted scientific interpretations with evidence references and limitations.

**Scientific transparency:** IGNIS relevance categories are our own assessment, not official NASA rankings. The platform does not invent experimental results or claim to predict fire behaviour.

---

## 🖥️ Platform Features

| Module | Purpose |
|---|---|
| Dashboard | Main platform overview and navigation |
| Investigation Catalogue | Browse NASA combustion investigations |
| Investigation Intelligence | Assess relevance, experimental comparability, and evidence availability |
| Comparison | Compare documented experimental conditions |
| AI-Assisted Intelligence | Generate evidence-grounded scientific interpretations using Gemini |
| Earth Fire Detection | Explore satellite thermal-anomaly detections using NASA FIRMS |

### 1. Investigation Intelligence

The intelligence engine evaluates investigations through three distinct dimensions:

- **Scientific relevance:** How closely an investigation relates to a fire-safety research pillar.
- **Experimental comparability:** Whether documented experimental conditions can be compared.
- **Evidence availability:** What supporting research evidence is available within the platform.

These dimensions are kept separate to avoid treating missing data as proof of scientific irrelevance.

### 2. Experimental Comparison

Users can explore and compare documented experimental conditions, including oxygen concentration, airflow, materials, and flow configuration where data is available.

Comparisons depend on documented values and explicitly defined IGNIS tolerances.

### 3. AI-Assisted Scientific Interpretation

IGNIS integrates Google's Gemini API to provide AI-assisted interpretation of structured investigation information and available scientific evidence.

The AI component is designed to:
- Summarise relevant scientific information.
- Interpret available experimental conditions.
- Reference supporting evidence.
- Identify limitations and missing information.

Gemini does not independently validate NASA experiments or replace the original research.

---

## 🌍 Earth Applications Extension

In addition to spacecraft fire safety, IGNIS includes an Earth Fire Detection module.

It integrates the **NASA Fire Information for Resource Management System (FIRMS) API** to retrieve satellite fire and thermal-anomaly observations for a selected geographical region.

### Features

- Interactive geographical mapping.
- Satellite detection information.
- Fire radiative power (FRP) observations where available.
- Date and geographical-region filtering.
- Data-source and methodology information.

**Important scientific limitation:** Satellite thermal anomalies are not automatically confirmed wildfires. FRP is a satellite-derived estimate and must not be interpreted as direct ground-level fire intensity.

This is an additional Earth-applications feature, separate from the core spacecraft combustion intelligence engine.

---

## 🛠️ Technology Stack

| Technology | Usage |
|---|---|
| Python | Backend processing and intelligence logic |
| Flask | Web application and API routes |
| Pandas | Scientific data processing |
| JavaScript | Interactive frontend functionality |
| HTML5 / CSS3 | Interface and responsive layouts |
| Chart.js | Data visualisation |
| Google Gemini API (`gemini-3.8-flash`) | AI-assisted scientific interpretation |
| NASA PSI | Combustion investigation research and evidence |
| NASA FIRMS | Satellite fire and thermal-anomaly data |
| Leaflet / OpenStreetMap | Interactive Earth Fire Detection map |
| Git / GitHub | Version control and project collaboration |
| Kali Linux | Development environment |

---

## 🤖 AI Tools and Development Assistance

AI tools were used throughout the development workflow.

**ChatGPT**
- Supported implementation and coding.
- Assisted with debugging and architecture discussions.
- Helped with testing and technical documentation.

**Google Gemini**
- Integrated directly into IGNIS through the Gemini API.
- Provides AI-assisted interpretation of scientific investigation data.
- Helps interpret structured information and available evidence.

Gemini does not replace NASA's original research, independently validate experimental results, or turn missing data into scientific facts.

Scientific claims should always be evaluated against their referenced source material.

---

## 🏗️ System Architecture

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
             Scientific Intelligence
                    Engine
                       |
          +------------+------------+
          |            |            |
          v            v            v
      Relevance   Condition     Evidence
      Assessment  Comparison   Availability
          |            |            |
          +------------+------------+
                       |
                       v
              Interactive IGNIS
                  Dashboard
                       |
                       +------> Gemini AI
                       |        Interpretation
                       |
                       +------> Scientific
                                Evidence References


              NASA FIRMS API
                    |
                    v
            Earth Fire Detection
                 Extension
                    |
                    v
             Interactive Map
             and Observations
```

---

# 🚀 Installation and Setup

Follow these instructions to run IGNIS locally from the GitHub repository.

## Requirements

- Python 3.11 or later
- Git
- Internet connection
- Optional: Google Gemini API key
- Optional: NASA FIRMS MAP_KEY

The tested clean installation uses Python 3.14.7.

### Step 1 — Clone the repository

Open your terminal:

```bash
git clone https://github.com/Yan0521-dot/IGNIS.git
```

Navigate into the project directory:

```bash
cd IGNIS
```

### Step 2 — Create a Python virtual environment

```bash
python3 -m venv venv
```

### Step 3 — Activate the virtual environment

**Linux / Kali Linux / macOS:**

```bash
source venv/bin/activate
```

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

### Step 4 — Install dependencies

Upgrade pip:

```bash
python -m pip install --upgrade pip
```

Install the project requirements:

```bash
pip install -r requirements.txt
```

### Step 5 — Configure environment variables

Create your local environment configuration file:

```bash
cp .env.example .env
```

Open it using Nano:

```bash
nano .env
```

Add your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key
NASA_FIRMS_MAP_KEY=your_nasa_firms_map_key
```

Save the file.

**API configuration:**

| Service | Purpose | Required? |
|---|---|---|
| Google Gemini API | AI-assisted scientific interpretation | Optional |
| NASA FIRMS API | Earth Fire Detection observations | Optional |

Both integrations are optional. Features that depend on an API key may be unavailable until a valid key is configured.

You can obtain API credentials from:

- Google AI Studio: https://aistudio.google.com/
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/api/

**Security warning:** Never commit your actual `.env` file or expose API keys publicly. The repository includes `.env.example` as a configuration template.

### Step 6 — Run IGNIS

Start the Flask application:

```bash
python run.py
```

The application should start on:

```text
http://127.0.0.1:5000
```

### Step 7 — Open the platform

Open your browser and visit:

**http://127.0.0.1:5000**

IGNIS should now be running locally.

---

## 🧭 Platform Routes

| Route | Description |
|---|---|
| `/` | IGNIS landing page |
| `/dashboard` | Main dashboard |
| `/investigations` | Investigation catalogue |
| `/intelligence` | Scientific intelligence and relevance assessment |
| `/comparison` | Experimental comparison |
| `/earth-fire` | Earth Fire Detection |

---

## ☁️ Deployment

IGNIS is also deployed using Vercel.

The repository includes a Flask entry point at `app/index.py`, a `.python-version` file, and static frontend assets under `public/static/`.

For a Vercel deployment:

1. Import the GitHub repository into Vercel.
2. Keep the project root directory as `./`.
3. Configure the `GEMINI_API_KEY` and `NASA_FIRMS_MAP_KEY` environment variables if those integrations are required.
4. Deploy the project.

Configure API keys through Vercel's project environment-variable settings. Do not upload `.env`.

---

## 🔬 Scientific Integrity and Limitations

IGNIS is designed around evidence traceability and transparent interpretation.

The following principles guide the platform:

1. NASA investigation records are distinguished from locally integrated research files.
2. Scientific relevance, experimental comparability, and evidence availability are assessed separately.
3. An investigation without a locally integrated dataset is not automatically scientifically irrelevant.
4. Experimental condition matches depend on documented values and explicitly defined IGNIS tolerances.
5. IGNIS relevance categories are not official NASA classifications or rankings.
6. Microgravity research must not be presented as actual partial-gravity experimental data.
7. Partial-gravity combustion data is not currently represented as an available PSI dataset in this platform.
8. AI-generated interpretations are assistance, not authoritative scientific conclusions.

Some large raw research video files are excluded from Git to keep the repository manageable. Consequently, certain local-data features may require additional research files.

---

## 📚 Data Sources

- NASA Physical Sciences Informatics (PSI): https://psi.nasa.gov/
- NASA Fire Information for Resource Management System (FIRMS): https://firms.modaps.eosdis.nasa.gov/
- Google Gemini API: https://ai.google.dev/

NASA research data and third-party services remain subject to their respective terms and conditions.

---

## 📂 Project Repository

**GitHub:** https://github.com/Yan0521-dot/IGNIS

---

## 🔥 IGNIS

**Understand Fire. Protect Exploration.**

*Turning microgravity combustion research into structured, traceable fire-safety intelligence for the future of human space exploration.*

**NASA Space Apps Challenge 2026 — Team IGNIS**
