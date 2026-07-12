import { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  GitFork, 
  FileText, 
  Database,
  UserCheck,
  Building
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import AskAI from './components/AskAI';
import WorkflowManager from './components/WorkflowManager';
import DocumentManager from './components/DocumentManager';
import AlertPanel from './components/AlertPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'workflows' | 'documents'>('dashboard');
  const [userRole, setUserRole] = useState<'citizen' | 'analyst' | 'officer'>('officer');
  
  // Dummy authentication login handling
  const [username, setUsername] = useState('Admin_Officer');
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  const handleRoleChange = (role: 'citizen' | 'analyst' | 'officer') => {
    setUserRole(role);
    if (role === 'citizen') {
      setUsername('Aarav_Sharma');
      if (activeTab === 'documents') {
        setActiveTab('chat'); // Citizens are not allowed to index docs
      }
    } else if (role === 'analyst') {
      setUsername('Analyst_Priya');
    } else {
      setUsername('Director_Karthik');
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0f1d] text-slate-100 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#121829] border-r border-[#1e293b] flex flex-col justify-between z-10">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-[#1e293b] flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-500/20 text-white">
              <Building size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                DI-PLATFORM
              </h1>
              <p className="text-[10px] text-slate-400 tracking-widest font-mono uppercase">
                Smart City Command
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-150 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={18} />
              <span className="text-sm">Officer Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-150 ${
                activeTab === 'chat'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-sm">Ask AI (Multi-Agent)</span>
            </button>

            <button
              onClick={() => setActiveTab('workflows')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-150 ${
                activeTab === 'workflows'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <GitFork size={18} />
              <span className="text-sm">Action Workflows</span>
            </button>

            {/* Admin only / RBAC check */}
            <button
              onClick={() => {
                if (userRole === 'citizen') return;
                setActiveTab('documents');
              }}
              disabled={userRole === 'citizen'}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition duration-150 ${
                userRole === 'citizen' ? 'opacity-40 cursor-not-allowed' : ''
              } ${
                activeTab === 'documents'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText size={18} />
                <span className="text-sm">Knowledge Base (RAG)</span>
              </div>
              {userRole === 'citizen' && (
                <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/25">
                  Restricted
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Database Status Info */}
        <div className="p-4 border-t border-[#1e293b]">
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center space-x-1.5">
                <Database size={12} className="text-emerald-400" />
                <span>AlloyDB Connection</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Database size={12} className="text-emerald-400" />
                <span>BigQuery Service</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 bg-[#121829] border-b border-[#1e293b] px-8 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              District Decision Engine
            </h2>
            <p className="text-xs text-slate-400">
              Varanasi Administration & Smart Infrastructure Hub
            </p>
          </div>

          <div className="flex items-center space-x-6">
            
            {/* Real-time alerts count */}
            <AlertPanel />

            {/* Interactive Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-850 border border-slate-700/60 rounded-xl hover:bg-slate-800 transition"
              >
                <UserCheck size={16} className="text-blue-400" />
                <span className="text-xs font-semibold capitalize text-slate-200">
                  Role: {userRole}
                </span>
              </button>
              
              {showRoleSelector && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
                  <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-widest font-mono border-b border-slate-800">
                    Switch Access Role
                  </div>
                  {(['citizen', 'analyst', 'officer'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        handleRoleChange(r);
                        setShowRoleSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800/80 transition flex items-center justify-between ${
                        userRole === r ? 'text-blue-400 font-bold bg-blue-500/5' : 'text-slate-300'
                      }`}
                    >
                      <span className="capitalize">{r} Access</span>
                      {userRole === r && <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Session Profile */}
            <div className="flex items-center space-x-3 border-l border-slate-700/50 pl-6">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                {username.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-200">{username}</p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole} Account</p>
              </div>
            </div>

          </div>
        </header>

        {/* Tab Page Router */}
        <main className="flex-1 overflow-y-auto p-8 relative no-scrollbar">
          {activeTab === 'dashboard' && <Dashboard userRole={userRole} />}
          {activeTab === 'chat' && <AskAI userRole={userRole} />}
          {activeTab === 'workflows' && <WorkflowManager userRole={userRole} />}
          {activeTab === 'documents' && <DocumentManager userRole={userRole} />}
        </main>
      </div>

    </div>
  );
}
