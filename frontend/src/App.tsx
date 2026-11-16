import { useState, useEffect, useRef } from 'react';
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
import { UserRole } from './types';
import { authenticateRole } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'workflows' | 'documents'>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('officer');
  const [username, setUsername] = useState('Director_Karthik');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Authenticate role and obtain real JWT token
  useEffect(() => {
    authenticateRole(userRole);
  }, [userRole]);

  // Click outside listener for accessible dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleSelector(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowRoleSelector(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleRoleChange = async (role: UserRole) => {
    setUserRole(role);
    if (role === 'citizen') {
      setUsername('Aarav_Sharma');
      if (activeTab === 'documents') {
        setActiveTab('chat');
      }
    } else if (role === 'analyst') {
      setUsername('Analyst_Priya');
    } else {
      setUsername('Director_Karthik');
    }
    await authenticateRole(role);
  };

  return (
    <div className="flex h-screen bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans">
      
      {/* Accessibility Skip Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Sidebar Navigation */}
      <aside 
        aria-label="Application Sidebar"
        className="w-64 bg-[#121829] border-r border-[#1e293b] flex flex-col justify-between z-10 shrink-0"
      >
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-[#1e293b] flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-500/20 text-white" aria-hidden="true">
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

          {/* Navigation Tablist */}
          <nav 
            aria-label="Main Navigation Tabs" 
            role="tablist"
            className="p-4 space-y-1"
          >
            <button
              id="tab-dashboard"
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              aria-controls="panel-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              <span className="text-sm">Officer Dashboard</span>
            </button>

            <button
              id="tab-chat"
              role="tab"
              aria-selected={activeTab === 'chat'}
              aria-controls="panel-chat"
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === 'chat'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={18} aria-hidden="true" />
              <span className="text-sm">Ask AI (Multi-Agent)</span>
            </button>

            <button
              id="tab-workflows"
              role="tab"
              aria-selected={activeTab === 'workflows'}
              aria-controls="panel-workflows"
              onClick={() => setActiveTab('workflows')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === 'workflows'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <GitFork size={18} aria-hidden="true" />
              <span className="text-sm">Action Workflows</span>
            </button>

            {/* Knowledge Base (RBAC Controlled) */}
            <button
              id="tab-documents"
              role="tab"
              aria-selected={activeTab === 'documents'}
              aria-controls="panel-documents"
              onClick={() => {
                if (userRole === 'citizen') return;
                setActiveTab('documents');
              }}
              disabled={userRole === 'citizen'}
              aria-disabled={userRole === 'citizen'}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                userRole === 'citizen' ? 'opacity-40 cursor-not-allowed' : ''
              } ${
                activeTab === 'documents'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText size={18} aria-hidden="true" />
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

        {/* Database & Service Status Indicator */}
        <div className="p-4 border-t border-[#1e293b]">
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center space-x-1.5">
                <Database size={12} className="text-emerald-400" aria-hidden="true" />
                <span>AlloyDB / pgvector</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Database Connected"></span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Database size={12} className="text-emerald-400" aria-hidden="true" />
                <span>BigQuery Telemetry</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Telemetry Service Active"></span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 bg-[#121829] border-b border-[#1e293b] px-8 flex items-center justify-between z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              District Decision Engine
            </h2>
            <p className="text-xs text-slate-400">
              Varanasi Administration & Smart Infrastructure Hub
            </p>
          </div>

          <div className="flex items-center space-x-6">
            
            {/* Real-time Alerts Notification Panel */}
            <AlertPanel />

            {/* Accessible Role Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="role-switcher-button"
                aria-haspopup="listbox"
                aria-expanded={showRoleSelector}
                aria-label={`Current Role: ${userRole}. Click to switch role.`}
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-850 border border-slate-700/60 rounded-xl hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <UserCheck size={16} className="text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold capitalize text-slate-200">
                  Role: {userRole}
                </span>
              </button>
              
              {showRoleSelector && (
                <div 
                  role="listbox" 
                  aria-labelledby="role-switcher-button"
                  className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                >
                  <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-widest font-mono border-b border-slate-800">
                    Switch Access Role (RBAC)
                  </div>
                  {(['citizen', 'analyst', 'officer'] as const).map((r) => (
                    <button
                      key={r}
                      role="option"
                      aria-selected={userRole === r}
                      onClick={() => {
                        handleRoleChange(r);
                        setShowRoleSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800/80 transition flex items-center justify-between focus-visible:bg-slate-800 focus-visible:outline-none ${
                        userRole === r ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'
                      }`}
                    >
                      <span className="capitalize">{r} Access</span>
                      {userRole === r && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Session Profile */}
            <div className="flex items-center space-x-3 border-l border-slate-700/50 pl-6">
              <div 
                className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-md"
                aria-hidden="true"
              >
                {username.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-200">{username}</p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole} Account</p>
              </div>
            </div>

          </div>
        </header>

        {/* Tab Page Router / Main Content Landmark */}
        <main 
          id="main-content" 
          role="main" 
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-8 relative no-scrollbar focus:outline-none"
        >
          <div 
            id={`panel-${activeTab}`} 
            role="tabpanel" 
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === 'dashboard' && <Dashboard userRole={userRole} />}
            {activeTab === 'chat' && <AskAI userRole={userRole} />}
            {activeTab === 'workflows' && <WorkflowManager userRole={userRole} />}
            {activeTab === 'documents' && <DocumentManager userRole={userRole} />}
          </div>
        </main>
      </div>

    </div>
  );
}
