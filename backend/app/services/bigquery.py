import logging
import random
import datetime
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger("app.services.bigquery")

try:
    from google.cloud import bigquery
    # Check if we can build a client (this will fail if no credentials / project set)
    bq_client = bigquery.Client(project=settings.GCP_PROJECT_ID)
    HAS_BIGQUERY = True
    logger.info("BigQuery client initialized successfully.")
except Exception as e:
    logger.warning(f"Could not initialize BigQuery client ({e}). Running in Mock/Simulator Mode.")
    bq_client = None
    HAS_BIGQUERY = False


def execute_query(query: str) -> List[Dict[str, Any]]:
    """Runs a query on BigQuery or returns mocked data if not available."""
    if HAS_BIGQUERY and bq_client:
        try:
            query_job = bq_client.query(query)
            results = query_job.result()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"BigQuery query failed: {e}. Falling back to simulator.")
    
    # Simulate queries based on keywords in query string
    query_lower = query.lower()
    if "grievances" in query_lower or "grievance_id" in query_lower:
        return get_mock_grievance_stats()
    elif "telemetry" in query_lower or "sensor_id" in query_lower:
        return get_mock_sensor_telemetry()
    else:
        return [{"message": "Mock success", "timestamp": datetime.datetime.now().isoformat()}]


def get_mock_grievance_stats() -> List[Dict[str, Any]]:
    """Returns realistic-looking grievance analytics data for charts."""
    categories = ["Potholes & Roads", "Garbage Disposal", "Street Light Faults", "Water Supply Leakage", "Stray Animals"]
    wards = [101, 102, 103, 104, 105, 106, 107]
    severities = ["Low", "Medium", "High"]
    
    # Daily counts over the last 7 days
    results = []
    base_date = datetime.date.today() - datetime.timedelta(days=7)
    
    for day_offset in range(8):
        current_date = base_date + datetime.timedelta(days=day_offset)
        for category in categories:
            for ward in wards:
                # Add some randomness to data
                count = random.randint(2, 15) if category != "Potholes & Roads" else random.randint(5, 25)
                avg_resolution = round(random.uniform(1.2, 5.8), 2)
                results.append({
                    "created_date": current_date.isoformat(),
                    "category": category,
                    "ward_id": ward,
                    "severity": random.choice(severities),
                    "volume": count,
                    "avg_resolution_days": avg_resolution
                })
    return results


def get_mock_sensor_telemetry() -> List[Dict[str, Any]]:
    """Returns realistic sensor telemetry for air quality, water flow, traffic."""
    metrics = ["air_quality_aqi", "water_flow_m3h", "traffic_density_cars_per_min"]
    wards = [101, 102, 103, 104, 105]
    results = []
    
    now = datetime.datetime.utcnow()
    # Telemetry over the last 12 hours hourly
    for hour_offset in range(12):
        timestamp = now - datetime.timedelta(hours=hour_offset)
        for ward in wards:
            # Air quality (AQI index)
            results.append({
                "timestamp": timestamp.isoformat(),
                "sensor_id": f"SEN-AQI-W{ward}",
                "metric_type": "air_quality",
                "value": float(random.randint(60, 180)), # PM2.5 / AQI range for Indian cities
                "ward_id": ward,
                "status": "Moderate" if random.random() > 0.4 else "Poor"
            })
            # Water flow
            results.append({
                "timestamp": timestamp.isoformat(),
                "sensor_id": f"SEN-WTR-W{ward}",
                "metric_type": "water_flow",
                "value": float(random.randint(250, 400)),
                "ward_id": ward,
                "status": "Normal" if random.random() > 0.1 else "Anomaly"
            })
            # Traffic density
            results.append({
                "timestamp": timestamp.isoformat(),
                "sensor_id": f"SEN-TRF-W{ward}",
                "metric_type": "traffic_density",
                "value": float(random.randint(10, 85)),
                "ward_id": ward,
                "status": "Normal" if random.random() > 0.3 else "Congested"
            })
    return results
