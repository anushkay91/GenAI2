import logging
from app.services.bigquery import execute_query

logger = logging.getLogger("app.agents.analytics")

class AnalyticsAgent:
    def __init__(self):
        self.name = "AnalyticsAgent"
        self.description = "Executes analytics queries on BigQuery smart city metrics to retrieve trend insights."

    def get_grievance_insights(self, category: str = None, ward_id: int = None) -> list:
        """
        Retrieves summaries of grievance volumes, average resolution times, and categories from BigQuery.
        """
        query = "SELECT created_date, category, ward_id, severity, volume, avg_resolution_days FROM smart_city_metrics.citizen_grievances"
        conditions = []
        if category:
            conditions.append(f"category = '{category}'")
        if ward_id:
            conditions.append(f"ward_id = {ward_id}")
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY created_date DESC LIMIT 100"
        
        logger.info(f"AnalyticsAgent querying BigQuery grievances: {query}")
        return execute_query(query)

    def get_iot_telemetry_insights(self, metric_type: str = None, ward_id: int = None) -> list:
        """
        Retrieves real-time and historical sensor metrics (air quality, traffic, water flow) from BigQuery.
        """
        query = "SELECT timestamp, sensor_id, metric_type, value, ward_id, status FROM smart_city_metrics.iot_telemetry"
        conditions = []
        if metric_type:
            conditions.append(f"metric_type = '{metric_type}'")
        if ward_id:
            conditions.append(f"ward_id = {ward_id}")
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " ORDER BY timestamp DESC LIMIT 50"
        
        logger.info(f"AnalyticsAgent querying BigQuery telemetry: {query}")
        return execute_query(query)
