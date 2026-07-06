import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  Plus,
  CheckCircle2
} from 'lucide-react';

interface WorkflowTicket {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  updated_at: string;
}

export default function WorkflowManager({ userRole }: { userRole: string }) {
  const [tickets, setTickets] = useState<WorkflowTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Water');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetch('/api/agent/workflows')
      .then(res => {
        if (!res.ok) throw new Error('API server unreachable');
        return res.json();
      })
      .then((data: WorkflowTicket[]) => {
        setTickets(data);
        setLoading(false);
      })
      .catch(() => {
        // Mock fallback if API offline
        setTimeout(() => {
          setTickets([
            {
              id: 'W-9843',
              title: 'Water Pipe Contamination Anomaly',
              description: 'Sensor pressure loss triggered warning block D Ward 102. Leakage check required.',
              category: 'Water',
              status: 'In Progress',
              priority: 'High',
              updated_at: '2026-07-06 17:45'
            },
            {
              id: 'W-9844',
              title: 'AQI Level Surge Response',
              description: 'PM2.5 values exceeding 170. Distributing air advisory warnings.',
              category: 'Environmental',
              status: 'Triggered',
              priority: 'High',
              updated_at: '2026-07-06 17:10'
            },
            {
              id: 'W-9841',
              title: 'Garbage Collection Overload',
              description: 'Smart waste bins reported 92% fill rates. Scheduling backup dump trucks.',
              category: 'Waste',
              status: 'Resolved',
              priority: 'Low',
              updated_at: '2026-07-06 14:30'
            }
          ]);
          setLoading(false);
        }, 800);
      });
  }, []);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'officer') {
      alert("Role Permission Error: Only District Officers are permitted to initiate manual escalations.");
      return;
    }

    const payload = { title, category, priority, description };

    try {
      const res = await fetch('/api/agent/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer simulated_jwt_token'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const newTicket = await res.json();
      setTickets(prev => [newTicket, ...prev]);
    } catch {
      // Simulator fallback
      const simulatedTicket: WorkflowTicket = {
        id: `W-${Math.floor(Math.random() * 9000) + 1000}`,
        title,
        description,
        category,
        status: 'Triggered',
        priority,
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setTickets(prev => [simulatedTicket, ...prev]);
    }

    // Reset Form
    setTitle('');
    setDescription('');
    setShowModal(false);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    // Optimistic local state update
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 16) } : t));

    // Hit backend
    fetch(`/api/agent/workflows/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer simulated_jwt_token'
      },
      body: JSON.stringify({ status: newStatus })
    }).catch(() => {
      // Silent pass locally
    });
  };

  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s.toLowerCase()) {
      case 'resolved':
        return <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />;
      case 'in progress':
        return <Clock size={13} className="text-blue-400 shrink-0" />;
      default:
        return <AlertCircle size={13} className="text-amber-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-white text-base">District Workflows & Action Plans</h3>
          <p className="text-xs text-slate-400">Track and create automated incident tickets stored in AlloyDB</p>
        </div>

        {/* Create ticket button (RBAC restriction check: Officers only) */}
        <button
          onClick={() => {
            if (userRole !== 'officer') {
              alert("Access Denied: Only District Officers are authorized to initiate manual escalations.");
              return;
            }
            setShowModal(true);
          }}
          disabled={userRole !== 'officer'}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-semibold transition ${userRole !== 'officer'
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750/30'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10'
            }`}
        >
          <Plus size={15} />
          <span>Escalate Incident</span>
        </button>
      </div>

      {/* Main Ticket Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="glass p-5 rounded-2xl flex flex-col justify-between border-t-2 border-t-slate-800 hover:border-slate-700/60 transition">
              <div>
                {/* Header info */}
                <div className="flex items-center justify-between text-[10px] mb-3">
                  <span className="font-mono text-slate-500 font-bold">{ticket.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full border ${getPriorityColor(ticket.priority)} font-bold font-mono text-[9px] uppercase`}>
                    {ticket.priority}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-200 line-clamp-1">{ticket.title}</h4>
                <p className="text-xs text-slate-400 mt-2.5 line-clamp-3 leading-relaxed">{ticket.description}</p>
              </div>

              {/* Status and Action bar */}
              <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                  {getStatusIcon(ticket.status)}
                  <span className="capitalize font-semibold text-[11px]">{ticket.status}</span>
                </div>

                {/* Status Switcher (For Officers only) */}
                {userRole === 'officer' && ticket.status !== 'Resolved' ? (
                  <div className="flex space-x-1">
                    {ticket.status === 'Triggered' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                        className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded hover:bg-blue-500/20 transition"
                      >
                        Acknowledge
                      </button>
                    )}
                    {ticket.status === 'In Progress' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                        className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">{ticket.updated_at}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Escalation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121829] border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <h3 className="font-bold text-white text-base mb-2">Escalate Municipal Incident</h3>
            <p className="text-xs text-slate-400 mb-6">Manually log a district incident and dispatch emergency SOP workflows</p>

            <form onSubmit={handleCreateWorkflow} className="space-y-4">

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Incident Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water Contamination Report Block D"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
                  >
                    <option value="Water">Water Supply</option>
                    <option value="Traffic">Traffic Control</option>
                    <option value="Waste">Waste / Sanitation</option>
                    <option value="Environmental">Environmental / AQI</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Description / Details</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise details of the anomaly, ward number, and action instructions..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition placeholder-slate-650"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-800 hover:bg-slate-800/40 text-xs text-slate-400 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/10 transition"
                >
                  Log Ticket
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
