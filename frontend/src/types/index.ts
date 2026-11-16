// Shared TypeScript domain types for Smart City Decision Intelligence Platform

export type UserRole = 'citizen' | 'analyst' | 'officer';

export interface UserSession {
  username: string;
  role: UserRole;
  token?: string;
}

export interface Citation {
  filename: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  image?: string; // base64 preview
  confidence?: number;
  sources?: Citation[];
  agent_flow?: string[];
  data?: Record<string, unknown>;
  timestamp?: string;
}

export interface GrievanceSummary {
  category: string;
  total_count: number;
}

export interface IoTSensorStatus {
  sensor_id: string;
  metric_type: string;
  value: number;
  ward_id: number;
  status: string;
}

export interface DashboardMetrics {
  total_tickets: number;
  resolved_tickets: number;
  pending_tickets: number;
  grievances_by_category: GrievanceSummary[];
  iot_sensors_status: IoTSensorStatus[];
}

export interface WorkflowTicket {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  created_at?: string;
  updated_at: string;
}

export interface IndexedDoc {
  id: string;
  filename: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  chunks: number;
}

export interface AlertNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
}
