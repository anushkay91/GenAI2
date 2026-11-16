import { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, CircleAlert, CheckCircle2, X } from 'lucide-react';
import { AlertNotification } from '../types';

export default function AlertPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [alerts, setAlerts] = useState<AlertNotification[]>([
    {
      id: '1',
      title: 'Water Pipe Leakage',
      desc: 'Ward 102 smart flow meters detected a 14% drop in main line pressure.',
      time: '15 mins ago',
      priority: 'high',
      resolved: false
    },
    {
      id: '2',
      title: 'Air Quality Decline (AQI)',
      desc: 'Ward 104 PM2.5 sensors recorded 178 (Poor AQI range).',
      time: '1 hour ago',
      priority: 'medium',
      resolved: false
    },
    {
      id: '3',
      title: 'Traffic Congestion Spike',
      desc: 'Intersection 5 is experiencing delays of +12 minutes.',
      time: '2 hours ago',
      priority: 'low',
      resolved: false
    }
  ]);

  // Click outside and escape key handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeAlerts = alerts.filter(a => !a.resolved);

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button 
        type="button"
        id="alerts-button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Municipal Alerts: ${activeAlerts.length} active`}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700/50 rounded-xl transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      >
        <Bell size={18} className="text-slate-300" aria-hidden="true" />
        {activeAlerts.length > 0 && (
          <span 
            className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" 
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="alerts-dialog-title"
          className="absolute right-0 mt-3 w-84 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 id="alerts-dialog-title" className="font-bold text-sm text-white flex items-center space-x-2">
              <ShieldAlert size={16} className="text-red-400" aria-hidden="true" />
              <span>Real-Time Municipal Alerts</span>
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                {activeAlerts.length} Active
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close alerts panel"
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div 
            className="max-h-72 overflow-y-auto divide-y divide-slate-800 no-scrollbar"
            role="region"
            aria-label="Active alert notifications"
          >
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 size={24} className="text-emerald-500/60" aria-hidden="true" />
                <span>All sectors operating within normal thresholds.</span>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-slate-850 transition">
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-start space-x-2">
                      <div className="mt-0.5 shrink-0" aria-hidden="true">
                        <CircleAlert size={14} className={alert.priority === 'high' ? 'text-red-500' : 'text-amber-500'} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{alert.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">{alert.desc}</p>
                        <span className="text-[9px] text-slate-500 font-mono mt-2 block">{alert.time}</span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => resolveAlert(alert.id)}
                      aria-label={`Acknowledge alert: ${alert.title}`}
                      className="text-[9px] text-slate-400 hover:text-emerald-400 bg-slate-850 hover:bg-emerald-950 border border-slate-800 hover:border-emerald-800 px-2 py-0.5 rounded transition shrink-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
