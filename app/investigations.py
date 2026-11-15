INVESTIGATIONS = [
    {
        "id": "PSI-98",
        "slug": "saffire-i",
        "name": "SAFFIRE-I",
        "full_name": "Spacecraft Fire Safety Experiment-I",
        "pillar": "Prevention",
        "type": "Microgravity Investigation",
        "platform": "Cygnus cargo vehicle",
        "focus": "Large-scale flame growth and material flammability",
        "description": (
            "Investigates large-scale fire growth and low-gravity "
            "flammability using a composite fabric sample. "
            "Measurements include temperature, radiation, pressure, "
            "oxygen, carbon dioxide and airflow."
        ),
        "metadata_source": "datasets/PSI-98/metadata/i_Investigation.txt",
        "experimental_details": [
            {
                "label": "Test Material",
                "value": "SIBAL composite fabric: 75% cotton and 25% fiberglass by weight"
            },
            {
                "label": "Sample Dimensions",
                "value": "Approximately 0.94 m × 0.40 m"
            },
            {
                "label": "Airflow",
                "value": "20 cm/s"
            },
            {
                "label": "Test Environment",
                "value": "Cygnus cargo vehicle after departure from the ISS"
            },
            {
                "label": "Instrumentation",
                "value": "Two cameras, thermocouples, two radiometers, pressure, O₂, CO₂ and airflow sensors"
            }
        ],
        "relevance": (
            "Provides experimental evidence about material flammability "
            "and fire behaviour in a spacecraft-relevant environment."
        ),
        "doi": "10.60555/0t15-1z43",
        "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-98",
        "source_status": "NASA PSI record verified"
    ,
        'environment': 'microgravity',
        'research_role': 'direct_fire_safety',
        'related_investigations': [],
        'classification_basis': 'Prevention: directly investigates large-scale flame growth and material flammability in a spacecraft-relevant microgravity environment.',
},
    {
        "id": "PSI-25",
        "slug": "bass-ii",
        "name": "BASS-II",
        "full_name": "Burning and Suppression of Solids-II",
        "pillar": "Prevention",
        "type": "Microgravity Investigation",
        "platform": "International Space Station",
        "focus": "Ignition, flame growth, flame spread and extinction limits",
        "description": (
            "Studies solid-fuel combustion in low-velocity forced flows "
            "under microgravity conditions. Variables include airflow "
            "speed and direction, oxygen concentration and sample geometry."
        ),
                "hardware": "Microgravity Science Glovebox (MSG)",
        "experimental_details": [
            {
                "label": "Experimental Hardware",
                "value": "Microgravity Science Glovebox (MSG)"
            },
            {
                "label": "Maximum Airflow",
                "value": "Up to 40 cm/s"
            },
            {
                "label": "Oxygen Conditions",
                "value": "Below 21%, varied through nitrogen addition"
            },
            {
                "label": "Flow Configurations",
                "value": "Opposed-flow and concurrent-flow"
            },
            {
                "label": "Fuel Geometries",
                "value": "Rods, spherical sections, slabs, films and fabric sheets"
            },
            {
                "label": "Experimental Focus",
                "value": "Ignition, flame growth, flame spread and extinction limits"
            }
        ],
        "metadata_source": "datasets/PSI-25/metadata/i_Investigation.txt",
        "relevance": (
            "Supports understanding of material flammability and "
            "combustion limits for spacecraft fire-safety design."
        ),
        "doi": "10.60555/4qc4-de67",
        "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25",
        "source_status": "NASA PSI record verified"
    ,
        'environment': 'microgravity',
        'research_role': 'direct_fire_safety',
        'related_investigations': ['PSI-62'],
        'classification_basis': 'Prevention: investigates solid-fuel ignition, flame growth, spread and extinction limits under controlled microgravity airflow and oxygen conditions.',
},
    {
        "id": "PSI-101",
        "slug": "same-r",
        "name": "SAME-R",
        "full_name": "Smoke Aerosol Measurement Experiment-Reflight",
        "pillar": "Detection",
        "type": "Microgravity Investigation",
        "platform": "International Space Station",
        "focus": "Smoke particle size and transport in low gravity",
        "description": (
            "Studies smoke aerosol particle sizes and their relationship "
            "to smoke generation and transport conditions in microgravity."
        ),
        "metadata_source": "datasets/PSI-101/metadata/i_Investigation.txt",
        "experimental_details": [
            {
                "label": "Reported Flight Test Points",
                "value": "66 test points, as reported in NASA investigation metadata"
            },
            {
                "label": "Test Environment",
                "value": "International Space Station"
            },
            {
                "label": "Diagnostic Hardware",
                "value": "Modified SAME hardware with a M-PASS instrument replacing one Commercial Diagnostic Enclosure"
            },
            {
                "label": "Sample Material Change",
                "value": "Pyrell intumescent fire-retardant foam replaced the earlier DBP material"
            },
            {
                "label": "Research Focus",
                "value": "Smoke aerosol particle size, distribution, generation and transport in microgravity"
            }
        ],
        "relevance": (
            "Provides research relevant to evaluating smoke detector "
            "performance in spacecraft environments."
        ),
        "doi": "10.60555/2np7-jv14",
        "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-101",
        "source_status": "NASA PSI record verified"
    ,
        'environment': 'microgravity',
        'research_role': 'direct_fire_safety',
        'related_investigations': ['PSI-102'],
        'classification_basis': 'Detection: investigates smoke aerosol properties and transport relevant to spacecraft smoke detector performance.',
},
    {
        "id": "PSI-69",
        "slug": "flex",
        "name": "FLEX",
        "full_name": "Flame Extinguishment Experiment",
        "pillar": "Suppression",
        "type": "Microgravity Investigation",
        "platform": "International Space Station",
        "focus": "Liquid-fuel flame limits and gaseous fire suppressants",
        "description": (
            "Investigates liquid-fuel droplet combustion and the "
            "effectiveness of gaseous suppressants including carbon "
            "dioxide, helium and sulfur hexafluoride."
        ),
        "relevance": (
            "Provides experimental research into flame extinguishment "
            "and suppressant effectiveness under microgravity conditions."
        ),
        "doi": "10.60555/mbq8-0451",
        "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-69",
        "source_status": "NASA PSI record verified"
    ,
        'environment': 'microgravity',
        'research_role': 'direct_fire_safety',
        'related_investigations': [],
        'classification_basis': 'Suppression: directly investigates flame extinguishment and gaseous suppressant effectiveness under microgravity.',
},
    {
        "id": "PSI-62",
        "slug": "flame-spread-modelling",
        "name": "Flame Spread Modelling",
        "full_name": (
            "Concurrent Flame Spread Modeling using Flamelet "
            "Generated Manifolds in Microgravity"
        ),
        "pillar": "Supporting Research",
        "type": "Ground Investigation",
        "platform": "Ground-based research",
        "focus": "Computational modelling of concurrent flame spread",
        "description": (
            "Develops and validates flamelet-generated-manifold "
            "modelling techniques for concurrent flame spread in "
            "microgravity, with comparison to BASS experiments."
        ),
        "relevance": (
            "Provides supporting computational research for interpreting "
            "and modelling microgravity flame-spread behaviour."
        ),
        "doi": "10.60555/e9xp-ex83",
        "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-62",
        "source_status": "NASA PSI record verified"
    ,
        'environment': 'ground',
        'research_role': 'supporting_research',
        'related_investigations': ['PSI-25'],
        'classification_basis': 'Supporting Research: ground-based computational modelling of flame spread, including comparison with BASS experiments.',
},
    {'id': 'PSI-102', 'slug': 'same', 'name': 'SAME', 'full_name': 'Smoke and Aerosol Measurement Experiment', 'pillar': 'Detection', 'type': 'Microgravity Investigation', 'environment': 'microgravity', 'platform': 'International Space Station', 'research_role': 'direct_fire_safety', 'focus': 'Smoke particle size, growth and transport in microgravity', 'description': 'Investigates the size and distribution of liquid smoke particles generated from overheated spacecraft materials under microgravity conditions. The research examines how smoke generation and transport affect particle properties and spacecraft smoke detector response.', 'relevance': 'Provides foundational experimental evidence for evaluating spacecraft smoke detector sensitivity to smoke produced under microgravity conditions.', 'related_investigations': ['PSI-101'], 'classification_basis': 'Classified under Detection because NASA identifies this investigation with Spacecraft Fire Safety and its objectives include smoke properties relevant to detector performance.', 'doi': '10.60555/gd4k-8h62', 'url': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-102', 'source_status': 'NASA PSI record verified'},
    {'id': 'PSI-107', 'slug': 'spice', 'name': 'SPICE', 'full_name': 'Smoke Point In Co-flow Experiment', 'pillar': 'Supporting Research', 'type': 'Microgravity Investigation', 'environment': 'microgravity', 'platform': 'International Space Station', 'research_role': 'supporting_research', 'focus': 'Non-buoyant jet flames, smoke points and soot formation', 'description': 'Studies laminar smoke-point properties of non-buoyant jet diffusion flames under different co-flow conditions. Variables include fuel type, burner diameter, co-flow velocity and fuel flow rate.', 'relevance': 'Contributes scientific understanding of soot formation and non-buoyant flame behaviour, supporting combustion modelling and spacecraft fire-safety research.', 'classification_basis': 'Classified as Supporting Research because its documented objectives focus on fundamental flame and soot behaviour rather than directly testing spacecraft fire detection, material flammability or suppression systems.', 'doi': '10.60555/9kbh-e962', 'url': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-107', 'source_status': 'NASA PSI record verified',
        'related_investigations': [],
}
]
