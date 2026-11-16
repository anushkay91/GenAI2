import { UserRole, DashboardMetrics, WorkflowTicket } from '../types';

const TOKEN_KEY = 'decision_intel_jwt';
const ROLE_KEY = 'decision_intel_role';

export async function authenticateRole(role: UserRole): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/demo-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error(`Auth failed with status ${res.status}`);
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.setItem(ROLE_KEY, role);
      return data.access_token;
    }
  } catch (err) {
    console.warn('Backend authentication endpoint unreachable, using fallback session.', err);
  }
  return null;
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/dashboard/metrics', { headers });
  if (!res.ok) throw new Error(`Dashboard API error: ${res.statusText}`);
  return res.json();
}

export async function sendChatMessage(
  message: string, 
  imageBase64?: string, 
  sessionId: string = 'web-session'
): Promise<{
  response: string;
  confidence_score: number;
  sources: { filename: string; score: number }[];
  agent_flow: string[];
  data?: Record<string, unknown>;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      image_base64: imageBase64 || null,
      session_id: sessionId
    })
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.statusText}`);
  return res.json();
}

export async function fetchWorkflows(): Promise<WorkflowTicket[]> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/agent/workflows', { headers });
  if (!res.ok) throw new Error(`Workflows API error: ${res.statusText}`);
  return res.json();
}

export async function createWorkflow(payload: {
  title: string;
  category: string;
  priority: string;
  description?: string;
}): Promise<WorkflowTicket> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/agent/workflows', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Permission Denied: Only Officers can trigger workflows.');
    }
    throw new Error(`Failed to create workflow: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadDocument(file: File, docType: string): Promise<{
  status: string;
  message: string;
  document_id: number;
  storage_path: string;
}> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/agent/upload', {
    method: 'POST',
    headers,
    body: formData
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Permission Denied: Citizens cannot upload or index knowledge documents.');
    }
    if (res.status === 413) {
      throw new Error('File Size Limit: Document exceeds the 10MB limit.');
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Upload failed: ${res.statusText}`);
  }
  return res.json();
}
