import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { WorkflowTicket, UserRole } from '../types';
import { fetchWorkflows, createWorkflow } from '../services/api';

export default function WorkflowManager({ userRole }: { userRole: UserRole }) {
  const [tickets, setTickets] = useState<WorkflowTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const modalRef = useRef<HTMLDivElement>(null);
  const initialInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Water');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchWorkflows()
      .then((data: WorkflowTicket[]) => {
        if (mounted) {
          setTickets(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Workflows fetch error, using fallback:', err);
        if (mounted) {
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
          }, 300);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Modal keyboard, focus trap, and focus restoration handling
  useEffect(() => {
    if (showModal) {
      initialInputRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowModal(false);
        } else if (e.key === 'Tab') {
          if (!modalRef.current) return;
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        triggerButtonRef.current?.focus();
      };
    }
  }, [showModal]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'officer') {
      setFormError("Role Restriction: Only District Officers are permitted to initiate manual escalations.");
      return;
    }
    if (!title.trim()) {
      setFormError("Ticket title cannot be empty.");
      return;
    }

    setFormError(null);
    const payload = { title, category, priority, description };

    try {
      const newTicket = await createWorkflow(payload);
      setTickets(prev => [newTicket, ...prev]);
      setShowModal(false);
      setTitle('');
      setDescription('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create ticket';
      console.warn('API ticket creation failed, falling back to local simulation:', msg);
      // Local fallback simulator
      const simulatedTicket: WorkflowTicket = {
        id: `W-${Math.floor(Math.random() * 9000 + 1000)}`,
        title,
        description,
        category,
        priority,
        status: 'Triggered',
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setTickets(prev => [simulatedTicket, ...prev]);
      setShowModal(false);
      setTitle('');
      setDescription('');
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/25';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'medium':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      default:
        return 'bg-slate-700/20 text-slate-400 border-slate-700/30';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s.toLowerCase()) {
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchCat = filterCategory === 'all' || t.category.toLowerCase() === filterCategory.toLowerCase();
    const matchPri = filterPriority === 'all' || t.priority.toLowerCase() === filterPriority.toLowerCase();
    return matchCat && matchPri;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Action Header & Filtering */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Action Workflows & Incident Escalations</span>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-mono">
              AlloyDB Operational Store
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous agent dispatched and officer escalated action tickets
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter size={12} className="text-slate-400" aria-hidden="true" />
            <select
              aria-label="Filter by Sector Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-slate-200"
            >
              <option value="all" className="bg-slate-900">All Sectors</option>
              <option value="water" className="bg-slate-900">Water</option>
              <option value="environmental" className="bg-slate-900">Environmental</option>
              <option value="waste" className="bg-slate-900">Waste</option>
              <option value="traffic" className="bg-slate-900">Traffic</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <select
              aria-label="Filter by Priority Level"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-slate-200"
            >
              <option value="all" className="bg-slate-900">All Priorities</option>
              <option value="critical" className="bg-slate-900">Critical</option>
              <option value="high" className="bg-slate-900">High</option>
              <option value="medium" className="bg-slate-900">Medium</option>
              <option value="low" className="bg-slate-900">Low</option>
            </select>
          </div>

          {/* Trigger Workflow Button (Officer Only) */}
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => {
              if (userRole !== 'officer') {
                alert("Permission Denied: Only District Officers have authorization to dispatch new workflows.");
                return;
              }
              setShowModal(true);
            }}
            disabled={userRole !== 'officer'}
            aria-disabled={userRole !== 'officer'}
            title={userRole !== 'officer' ? 'Restricted to Officers' : 'Trigger new municipal workflow'}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-blue-500 ${
              userRole !== 'officer'
                ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            <Plus size={16} aria-hidden="true" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="glass rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">Active and historical municipal incident workflows</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[9px] font-mono bg-slate-900/40">
                <th scope="col" className="py-4 pl-6 font-medium">Ticket ID</th>
                <th scope="col" className="py-4 font-medium">Workflow Subject</th>
                <th scope="col" className="py-4 font-medium">Sector</th>
                <th scope="col" className="py-4 font-medium">Priority</th>
                <th scope="col" className="py-4 font-medium">Status</th>
                <th scope="col" className="py-4 pr-6 font-medium text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    <div className="inline-block h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                    <span>Synchronizing operational workflows from AlloyDB...</span>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No incident tickets found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-900/30 transition">
                    <td className="py-4 pl-6 font-mono font-bold text-slate-300">{ticket.id}</td>
                    <td className="py-4 max-w-md pr-4">
                      <p className="font-semibold text-slate-100">{ticket.title}</p>
                      {ticket.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ticket.description}</p>
                      )}
                    </td>
                    <td className="py-4 text-slate-300">{ticket.category}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getPriorityBadge(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right text-slate-500 font-mono text-[10px]">
                      {ticket.updated_at ? ticket.updated_at.substring(0, 16) : 'Just now'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessible Create Workflow Modal */}
      {showModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-workflow-title"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div 
            ref={modalRef}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 id="modal-workflow-title" className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck size={18} className="text-blue-400" aria-hidden="true" />
                <span>Trigger Municipal Workflow</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label htmlFor="workflow-title-input" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Workflow Title *
                </label>
                <input
                  id="workflow-title-input"
                  ref={initialInputRef}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Emergency Pipeline Depressurization"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="workflow-category-select" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Municipal Sector
                  </label>
                  <select
                    id="workflow-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="Water">Water Infrastructure</option>
                    <option value="Environmental">Environmental & AQI</option>
                    <option value="Traffic">Traffic Management</option>
                    <option value="Waste">Sanitation & Waste</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="workflow-priority-select" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Escalation Priority
                  </label>
                  <select
                    id="workflow-priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="workflow-desc-input" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Action Directives & Details
                </label>
                <textarea
                  id="workflow-desc-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify sensor triggers, target ward, or field supervisor notification instructions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition"
                >
                  Dispatch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
