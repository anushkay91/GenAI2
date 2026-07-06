import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Wind,
  Droplet,
  Car
} from 'lucide-react';

interface Metrics {
  total_tickets: number;
  resolved_tickets: number;
  pending_tickets: number;
  grievances_by_category: { category: string; total_count: number }[];
  iot_sensors_status: {
    sensor_id: string;
    metric_type: string;
    value: number;
    ward_id: number;
    status: string;
  }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard({ }: { userRole: string }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    // Attempt to query the backend dashboard endpoint
    fetch('/api/dashboard/metrics')
      .then(res => {
        if (!res.ok) throw new Error('API server unreachable');
        return res.json();
      })
      .then((data: Metrics) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => {
        // Mock fallback if API not running locally yet
        setTimeout(() => {
          setMetrics({
            total_tickets: 42,
            resolved_tickets: 28,
            pending_tickets: 14,
            grievances_by_category: [
              { category: "Potholes & Roads", total_count: 145 },
              { category: "Garbage Disposal", total_count: 89 },
              { category: "Street Light Faults", total_count: 52 },
              { category: "Water Supply Leakage", total_count: 34 },
              { category: "Stray Animals", total_count: 18 }
            ],
            iot_sensors_status: [
              { sensor_id: "SEN-AQI-W101", metric_type: "air_quality", value: 110.0, ward_id: 101, status: "Moderate" },
              { sensor_id: "SEN-WTR-W101", metric_type: "water_flow", value: 312.0, ward_id: 101, status: "Normal" },
              { sensor_id: "SEN-TRF-W101", metric_type: "traffic_density", value: 45.0, ward_id: 101, status: "Normal" },
              { sensor_id: "SEN-AQI-W104", metric_type: "air_quality", value: 178.0, ward_id: 104, status: "Poor" },
              { sensor_id: "SEN-WTR-W102", metric_type: "water_flow", value: 210.0, ward_id: 102, status: "Anomaly" },
              { sensor_id: "SEN-TRF-W105", metric_type: "traffic_density", value: 85.0, ward_id: 105, status: "Congested" }
            ]
          });
          setLoading(false);
        }, 800);
      });
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-mono">Querying data from AlloyDB & BigQuery...</span>
        </div>
      </div>
    );
  }

  // Formatting telemetry icons
  const renderSensorIcon = (type: string) => {
    switch (type) {
      case 'air_quality':
        return <Wind className="text-sky-400" size={16} />;
      case 'water_flow':
        return <Droplet className="text-blue-400" size={16} />;
      case 'traffic_density':
        return <Car className="text-amber-400" size={16} />;
      default:
        return <Activity className="text-slate-400" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'normal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'moderate':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      case 'anomaly':
      case 'poor':
        return 'bg-red-500/10 text-red-400 border-red-500/25';
      case 'congested':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/25';
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="glass p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Active System Load</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">94%</h3>
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-2">
              <TrendingUp size={12} />
              <span>Normal system latency</span>
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Activity size={24} />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Total Incidents</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.total_tickets}</h3>
            <span className="text-[10px] text-slate-400 mt-2 block">Logged in AlloyDB</span>
          </div>
          <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Pending Response</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.pending_tickets}</h3>
            <span className="text-[10px] text-amber-400 flex items-center space-x-1 mt-2">
              <Clock size={12} />
              <span>Avg response: 18m</span>
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Clock size={24} />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Resolved Tickets</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.resolved_tickets}</h3>
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-2">
              <CheckCircle size={12} />
              <span>Resolution Rate: 66%</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckCircle size={24} />
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recharts Bar Chart */}
        <div className="glass p-6 rounded-2xl lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-bold text-white text-base">Grievance Distribution Analysis</h3>
            <p className="text-xs text-slate-400">Aggregated volumes categorized within the BigQuery warehouse</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.grievances_by_category} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="total_count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {metrics.grievances_by_category.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharts Pie Chart */}
        <div className="glass p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-bold text-white text-base">Operational Status</h3>
            <p className="text-xs text-slate-400">Relative allocation of logged incidents</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Resolved', value: metrics.resolved_tickets },
                    { name: 'Pending', value: metrics.pending_tickets }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 text-xs mt-2">
            <span className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500 block"></span>
              <span className="text-slate-300">Resolved ({metrics.resolved_tickets})</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 block"></span>
              <span className="text-slate-300">Pending ({metrics.pending_tickets})</span>
            </span>
          </div>
        </div>

      </div>

      {/* Telemetry Sensor Logs */}
      <div className="glass p-6 rounded-2xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-base">Live IoT Telemetry (BigQuery Feed)</h3>
            <p className="text-xs text-slate-400">Live environmental and sensor readings from administrative wards</p>
          </div>
          <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Auto-polling enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.iot_sensors_status.map((sensor) => (
            <div key={sensor.sensor_id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700/60 transition">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-800 rounded-lg">
                  {renderSensorIcon(sensor.metric_type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{sensor.sensor_id}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ward {sensor.ward_id} • {sensor.metric_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-white font-mono">{sensor.value}</p>
                <span className={`text-[9px] px-2 py-0.5 rounded border ${getStatusColor(sensor.status)} font-semibold mt-1 inline-block`}>
                  {sensor.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
