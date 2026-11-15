"""
IGNIS - NASA FIRMS integration.

Fetches regional VIIRS active-fire detections from NASA FIRMS.
API credentials are read from the local .env file.
"""

import csv
import io
import os
import time
from pathlib import Path
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

API_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

# Regional coverage: Malaysia and surrounding Southeast Asia.
# NASA order: west, south, east, north.
REGION = {
    "name": "Malaysia and Maritime Southeast Asia",
    "bbox": "94,-8,127,24",
    "center": [4.2, 109.5],
    "zoom": 4,
}

ALLOWED_SOURCES = {
    "VIIRS_SNPP_NRT",
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
}

CACHE_SECONDS = 600

_cache = {}
_cache_lock = Lock()


class FirmsAPIError(Exception):
    """Safe, user-facing FIRMS API error."""


def _load_map_key():
    """Load the NASA FIRMS key from the environment or local .env file."""

    key = os.environ.get("NASA_FIRMS_MAP_KEY", "").strip().strip('"').strip("'")
    if key:
        return key

    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            name, value = line.split("=", 1)

            if name.strip() == "NASA_FIRMS_MAP_KEY":
                value = value.strip().strip('"').strip("'")
                if value:
                    return value

    raise FirmsAPIError("NASA FIRMS credentials are not configured.")

def _number(value):
    """Convert a CSV value to a finite numeric value or None."""

    if value is None:
        return None

    try:
        result = float(value.strip())

        if result != result or result in (float("inf"), float("-inf")):
            return None

        return result

    except (ValueError, AttributeError):
        return None


def _parse_detection(row, index, source):
    """Validate and normalize one NASA FIRMS CSV record."""

    latitude = _number(row.get("latitude"))
    longitude = _number(row.get("longitude"))

    if latitude is None or longitude is None:
        return None

    if not -90 <= latitude <= 90:
        return None

    if not -180 <= longitude <= 180:
        return None

    acquisition_date = (row.get("acq_date") or "").strip()
    acquisition_time = (row.get("acq_time") or "").strip().zfill(4)

    if len(acquisition_time) != 4 or not acquisition_time.isdigit():
        acquisition_time = None

    satellite = (row.get("satellite") or "").strip()
    confidence = (row.get("confidence") or "").strip().lower()

    return {
        "id": (
            f"{source}-{acquisition_date}-{acquisition_time}-"
            f"{latitude:.5f}-{longitude:.5f}-{index}"
        ),
        "latitude": latitude,
        "longitude": longitude,
        "acquisition_date": acquisition_date,
        "acquisition_time_utc": acquisition_time,
        "satellite": satellite,
        "instrument": (row.get("instrument") or "").strip(),
        "confidence": confidence,
        "brightness_temperature_k": _number(row.get("bright_ti4")),
        "brightness_temperature_ti5_k": _number(row.get("bright_ti5")),
        "fire_radiative_power_mw": _number(row.get("frp")),
        "scan_km": _number(row.get("scan")),
        "track_km": _number(row.get("track")),
        "daynight": (row.get("daynight") or "").strip(),
        "source": source,
    }


def _fetch_csv(source, days):
    """Fetch and parse one bounded NASA FIRMS Area API request."""

    map_key = _load_map_key()

    url = (
        f"{API_BASE}/{map_key}/{source}/"
        f"{REGION['bbox']}/{days}"
    )

    request = Request(
        url,
        headers={
            "User-Agent": "IGNIS-Research-Prototype/1.0",
            "Accept": "text/csv",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            status = response.status
            payload = response.read().decode("utf-8-sig")

    except HTTPError as error:
        # Never return the original URL or request details:
        # the MAP_KEY is embedded in the URL path.
        if error.code in (401, 403, 404):
            raise FirmsAPIError(
                "NASA FIRMS rejected the request. Check the MAP_KEY "
                "and selected data source."
            ) from None

        raise FirmsAPIError(
            f"NASA FIRMS returned HTTP {error.code}."
        ) from None

    except (URLError, TimeoutError, OSError):
        raise FirmsAPIError(
            "Could not connect to NASA FIRMS. Check network access "
            "and try again."
        ) from None

    if status != 200:
        raise FirmsAPIError("NASA FIRMS returned an unsuccessful response.")

    try:
        reader = csv.DictReader(io.StringIO(payload))

        required = {"latitude", "longitude", "acq_date", "satellite"}

        if not reader.fieldnames or not required.issubset(
            set(reader.fieldnames)
        ):
            raise FirmsAPIError(
                "NASA FIRMS returned an unexpected CSV format. "
                "The request may have been rejected."
            )

        detections = []

        for index, row in enumerate(reader):
            record = _parse_detection(row, index, source)

            if record is not None:
                detections.append(record)

        return detections

    except csv.Error:
        raise FirmsAPIError(
            "NASA FIRMS returned CSV data that could not be parsed."
        ) from None


def get_fire_observations(source="VIIRS_NOAA20_NRT", days=3, force_refresh=False):
    """Return cached or freshly retrieved NASA FIRMS observations."""

    if source not in ALLOWED_SOURCES:
        raise FirmsAPIError("The selected NASA FIRMS source is not supported.")

    try:
        days = int(days)
    except (TypeError, ValueError):
        raise FirmsAPIError("Day range must be between 1 and 5.")

    if not 1 <= days <= 5:
        raise FirmsAPIError("Day range must be between 1 and 5.")

    cache_key = (source, days)
    now = time.monotonic()

    with _cache_lock:
        cached = _cache.get(cache_key)

        if (
            cached
            and not force_refresh
            and now - cached["cached_at"] < CACHE_SECONDS
        ):
            result = dict(cached["result"])
            result["cache"] = {
                "hit": True,
                "ttl_seconds": CACHE_SECONDS,
            }
            return result

    detections = _fetch_csv(source, days)

    confidence_counts = {}
    for record in detections:
        confidence = record["confidence"] or "unknown"
        confidence_counts[confidence] = (
            confidence_counts.get(confidence, 0) + 1
        )

    frp_values = [
        record["fire_radiative_power_mw"]
        for record in detections
        if record["fire_radiative_power_mw"] is not None
    ]

    result = {
        "status": "success",
        "region": REGION,
        "source": source,
        "days_requested": days,
        "record_count": len(detections),
        "confidence_counts": confidence_counts,
        "statistics": {
            "max_frp_mw": max(frp_values) if frp_values else None,
            "mean_frp_mw": (
                sum(frp_values) / len(frp_values)
                if frp_values else None
            ),
            "records_with_frp": len(frp_values),
        },
        "observations": detections,
        "attribution": "NASA FIRMS",
        "limitations": [
            "Satellite detections are thermal anomalies, not confirmed fires.",
            "Cloud cover and satellite overpass timing can affect detection.",
            "FRP is a satellite-derived estimate, not a direct measurement "
            "of ground fire intensity.",
            "Acquisition times are reported in UTC.",
        ],
        "cache": {
            "hit": False,
            "ttl_seconds": CACHE_SECONDS,
        },
    }

    with _cache_lock:
        _cache[cache_key] = {
            "cached_at": time.monotonic(),
            "result": result,
        }

    return result


def get_combined_fire_observations(days=3, force_refresh=False):
    """
    Combine NOAA-20 and NOAA-21 observations.

    Observations are retained individually. No geographic deduplication
    is performed because separate satellite observations are not
    necessarily duplicate records.
    """

    sources = [
        "VIIRS_NOAA20_NRT",
        "VIIRS_NOAA21_NRT",
    ]

    successful_feeds = []
    failed_feeds = []
    observations = []

    for source in sources:
        try:
            result = get_fire_observations(
                source=source,
                days=days,
                force_refresh=force_refresh,
            )

            successful_feeds.append({
                "source": source,
                "satellite": (
                    result["observations"][0]["satellite"]
                    if result["observations"]
                    else source.replace("VIIRS_", "").replace("_NRT", "")
                ),
                "record_count": result["record_count"],
                "cache_hit": result["cache"]["hit"],
            })

            observations.extend(result["observations"])

        except FirmsAPIError as error:
            failed_feeds.append({
                "source": source,
                "error": str(error),
            })

    if not successful_feeds:
        raise FirmsAPIError(
            "NASA FIRMS is currently unavailable from both satellite feeds."
        )

    observations.sort(
        key=lambda item: (
            item["acquisition_date"],
            item["acquisition_time_utc"] or "",
        ),
        reverse=True,
    )

    confidence_counts = {}

    for record in observations:
        confidence = record["confidence"] or "unknown"
        confidence_counts[confidence] = (
            confidence_counts.get(confidence, 0) + 1
        )

    frp_values = [
        record["fire_radiative_power_mw"]
        for record in observations
        if record["fire_radiative_power_mw"] is not None
    ]

    status = "partial" if failed_feeds else "success"

    return {
        "status": status,
        "region": REGION,
        "days_requested": int(days),
        "sources": successful_feeds,
        "failed_sources": failed_feeds,
        "source_count": len(successful_feeds),
        "record_count": len(observations),
        "confidence_counts": confidence_counts,
        "statistics": {
            "max_frp_mw": max(frp_values) if frp_values else None,
            "mean_frp_mw": (
                sum(frp_values) / len(frp_values)
                if frp_values else None
            ),
            "records_with_frp": len(frp_values),
        },
        "observations": observations,
        "attribution": "NASA FIRMS — VIIRS NOAA-20 and NOAA-21",
        "deduplication": {
            "applied": False,
            "reason": (
                "Satellite observations are retained individually. "
                "Overlapping observations are not assumed to be duplicates."
            ),
        },
        "limitations": [
            "Satellite detections are thermal anomalies, not confirmed fires.",
            "Cloud cover and satellite overpass timing affect detection.",
            "FRP is a satellite-derived estimate, not direct ground fire intensity.",
            "Acquisition times are reported in UTC.",
            "Combined records are satellite observations, not unique fire counts.",
        ],
    }
