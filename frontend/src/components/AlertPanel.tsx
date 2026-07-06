import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CircleAlert, CheckCircle2 } from 'lucide-react';

interface AlertItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
}

export default function AlertPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([
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

  const activeAlerts = alerts.filter(a => !a.resolved);

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700/50 rounded-xl transition duration-150"
      >
        <Bell size={18} className="text-slate-300" />
        {activeAlerts.length > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <ShieldAlert size={16} className="text-red-400" />
              <span>Real-Time Municipal Alerts</span>
            </h3>
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
              {activeAlerts.length} Active
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 no-scrollbar">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 size={24} className="text-emerald-500/60" />
                <span>All sectors operating within normal thresholds.</span>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-slate-850 transition">
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-start space-x-2">
                      <div className="mt-0.5">
                        <CircleAlert size={14} className={alert.priority === 'high' ? 'text-red-500' : 'text-amber-500'} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{alert.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">{alert.desc}</p>
                        <span className="text-[9px] text-slate-500 font-mono mt-2 block">{alert.time}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => resolveAlert(alert.id)}
                      className="text-[9px] text-slate-400 hover:text-emerald-400 bg-slate-850 hover:bg-emerald-950 border border-slate-800 hover:border-emerald-800 px-2 py-0.5 rounded transition"
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
