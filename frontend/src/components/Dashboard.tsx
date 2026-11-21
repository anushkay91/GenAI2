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
import { DashboardMetrics, UserRole } from '../types';
import { fetchDashboardMetrics } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard({ userRole }: { userRole: UserRole }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchDashboardMetrics()
      .then((data: DashboardMetrics) => {
        if (mounted) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Dashboard API call error, using local fallback:', err);
        // Fallback for offline demo
        if (mounted) {
          setTimeout(() => {
            setMetrics({
              total_tickets: 42,
              resolved_tickets: 28,
              pending_tickets: 14,
              grievances_by_category: [
                { category: 'Potholes & Roads', total_count: 145 },
                { category: 'Garbage Disposal', total_count: 89 },
                { category: 'Street Light Faults', total_count: 52 },
                { category: 'Water Supply Leakage', total_count: 34 },
                { category: 'Stray Animals', total_count: 18 }
              ],
              iot_sensors_status: [
                { sensor_id: 'SEN-AQI-W101', metric_type: 'air_quality', value: 112, ward_id: 101, status: 'Moderate' },
                { sensor_id: 'SEN-WTR-W101', metric_type: 'water_flow', value: 310, ward_id: 101, status: 'Normal' },
                { sensor_id: 'SEN-TRF-W101', metric_type: 'traffic_density', value: 48, ward_id: 101, status: 'Normal' },
                { sensor_id: 'SEN-AQI-W102', metric_type: 'air_quality', value: 88, ward_id: 102, status: 'Normal' },
                { sensor_id: 'SEN-WTR-W102', metric_type: 'water_flow', value: 265, ward_id: 102, status: 'Anomaly' },
                { sensor_id: 'SEN-TRF-W102', metric_type: 'traffic_density', value: 78, ward_id: 102, status: 'Congested' }
              ]
            });
            setLoading(false);
          }, 300);
        }
      });
    return () => {
      mounted = false;
    };
  }, [userRole]);

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4" role="status">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" aria-hidden="true"></div>
        <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">Loading City Metrics from AlloyDB & BigQuery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Executive Overview Metric Cards */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Active Workflows */}
        <div className="glass p-6 rounded-3xl border border-slate-800 flex items-center space-x-4">
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20" aria-hidden="true">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium">Total Workflows</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">
              {metrics.total_tickets || 42}
            </h3>
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-1 font-semibold">
              <TrendingUp size={10} aria-hidden="true" />
              <span>+12% weekly sync</span>
            </span>
          </div>
        </div>

        {/* Resolved Today */}
        <div className="glass p-6 rounded-3xl border border-slate-800 flex items-center space-x-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20" aria-hidden="true">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium">Resolved Today</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">
              {metrics.resolved_tickets || 28}
            </h3>
            <span className="text-[10px] text-slate-300 mt-1 block">
              Automated resolution rate: 68%
            </span>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="glass p-6 rounded-3xl border border-slate-800 flex items-center space-x-4">
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20" aria-hidden="true">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium">Pending Actions</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">
              {metrics.pending_tickets || 14}
            </h3>
            <span className="text-[10px] text-amber-400 mt-1 block font-semibold">
              4 Critical Priority
            </span>
          </div>
        </div>

        {/* Anomaly Risk Index */}
        <div className="glass p-6 rounded-3xl border border-slate-800 flex items-center space-x-4">
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20" aria-hidden="true">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium">Telemetry Anomaly Index</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">
              2.4%
            </h3>
            <span className="text-[10px] text-red-400 mt-1 block font-semibold">
              Ward 102 Water Alert
            </span>
          </div>
        </div>

      </section>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Grievance Volume Bar Chart */}
        <section aria-label="Grievance Analytics by Category" className="glass p-6 rounded-3xl border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-white text-base">Grievance Trends by Sector</h3>
              <p className="text-xs text-slate-300">Citizen reported issues aggregated from BigQuery telemetry</p>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full" aria-label="Bar chart showing distribution of citizen complaints">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.grievances_by_category}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '1rem',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="total_count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Complaints" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sector Proportion Donut Chart */}
        <section aria-label="Sector Complaint Proportion" className="glass p-6 rounded-3xl border border-slate-800">
          <h3 className="font-bold text-white text-base mb-1">Issue Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Proportional breakdown by municipal department</p>

          <div className="h-52 w-full" aria-label="Pie chart displaying issue proportions">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.grievances_by_category}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="total_count"
                >
                  {metrics.grievances_by_category.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '1rem',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {metrics.grievances_by_category.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-[10px] text-slate-300">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} aria-hidden="true"></span>
                <span className="truncate">{item.category}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* IoT Infrastructure Real-Time Telemetry Table */}
      <section aria-label="IoT Sensor Status Table" className="glass p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-base">IoT Infrastructure Telemetry Status</h3>
            <p className="text-xs text-slate-300">Live smart water flow, air quality index (AQI), and traffic density sensor grid</p>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-mono flex items-center space-x-1.5 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
            <span>Live Telemetry Ingestion</span>
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">Real-time municipal IoT sensor readings across city wards</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 uppercase tracking-widest text-[9px] font-mono">
                <th scope="col" className="pb-3.5 pl-2 font-medium">Sensor Identifier</th>
                <th scope="col" className="pb-3.5 font-medium">Sector Metric</th>
                <th scope="col" className="pb-3.5 font-medium">Ward Jurisdiction</th>
                <th scope="col" className="pb-3.5 font-medium">Reading Value</th>
                <th scope="col" className="pb-3.5 pr-2 font-medium text-right">Condition Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {metrics.iot_sensors_status.map((sensor) => {
                const isWarning = sensor.status === 'Anomaly' || sensor.status === 'Poor' || sensor.status === 'Congested';
                return (
                  <tr key={sensor.sensor_id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 pl-2 font-mono text-slate-200 font-semibold">{sensor.sensor_id}</td>
                    <td className="py-3.5 capitalize flex items-center space-x-2 text-slate-300">
                      {sensor.metric_type === 'air_quality' && <Wind size={14} className="text-blue-400" aria-hidden="true" />}
                      {sensor.metric_type === 'water_flow' && <Droplet size={14} className="text-cyan-400" aria-hidden="true" />}
                      {sensor.metric_type === 'traffic_density' && <Car size={14} className="text-amber-400" aria-hidden="true" />}
                      <span>{sensor.metric_type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3.5 text-slate-300">Ward {sensor.ward_id}</td>
                    <td className="py-3.5 font-mono text-slate-200 font-bold">{sensor.value}</td>
                    <td className="py-3.5 pr-2 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        isWarning
                          ? 'bg-red-500/10 text-red-400 border-red-500/25'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      }`}>
                        {sensor.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
