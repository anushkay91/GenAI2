import logging
import re
from typing import Optional, List, Dict, Any
from app.services.bigquery import execute_query

logger = logging.getLogger("app.agents.analytics")

class AnalyticsAgent:
    def __init__(self):
        self.name = "AnalyticsAgent"
        self.description = "Executes analytics queries on BigQuery smart city metrics to retrieve trend insights."

    def _sanitize_filter_value(self, val: str) -> str:
        """Sanitizes text values for query filtering."""
        return re.sub(r"[^a-zA-Z0-9_\-\s]", "", str(val))

    def get_grievance_insights(self, category: Optional[str] = None, ward_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieves summaries of grievance volumes, average resolution times, and categories from BigQuery.
        Enforces input sanitization to guard against injection.
        """
        query = "SELECT created_date, category, ward_id, severity, volume, avg_resolution_days FROM smart_city_metrics.citizen_grievances"
        conditions = []
        if category:
            safe_cat = self._sanitize_filter_value(category)
            conditions.append(f"category = '{safe_cat}'")
        if ward_id is not None:
            try:
                safe_ward = int(ward_id)
                conditions.append(f"ward_id = {safe_ward}")
            except (ValueError, TypeError):
                pass
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY created_date DESC LIMIT 100"
        
        logger.info(f"AnalyticsAgent querying BigQuery grievances: {query}")
        return execute_query(query)

    def get_iot_telemetry_insights(self, metric_type: Optional[str] = None, ward_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieves real-time and historical sensor metrics (air quality, traffic, water flow) from BigQuery.
        Enforces input sanitization to guard against injection.
        """
        query = "SELECT timestamp, sensor_id, metric_type, value, ward_id, status FROM smart_city_metrics.iot_telemetry"
        conditions = []
        if metric_type:
            safe_metric = self._sanitize_filter_value(metric_type)
            conditions.append(f"metric_type = '{safe_metric}'")
        if ward_id is not None:
            try:
                safe_ward = int(ward_id)
                conditions.append(f"ward_id = {safe_ward}")
            except (ValueError, TypeError):
                pass
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " ORDER BY timestamp DESC LIMIT 50"
        
        logger.info(f"AnalyticsAgent querying BigQuery telemetry: {query}")
        return execute_query(query)
