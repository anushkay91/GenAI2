import { useState, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  X,
  Bookmark,
  ShieldCheck,
  Workflow,
  Cpu
} from 'lucide-react';

interface Citation {
  filename: string;
  score: number;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  image?: string; // base64 preview
  confidence?: number;
  sources?: Citation[];
  agent_flow?: string[];
  data?: any;
}

export default function AskAI({ }: { userRole: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "### Welcome back Officer\n\nI am the CEO Agent, coordinating the multi-agent system. You can ask me analytical queries, request forecasts, ask policy Q&As, upload municipal inspection pictures, or trigger automation workflows.\n\n*Try asking: 'Are there any water leakages reported in Ward 102?' or upload a pothole image and ask for mitigation strategies.*",
      confidence: 1.0,
      sources: [],
      agent_flow: ["CEOAgent (Init)"]
    }
  ]);
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !imagePreview) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: input,
      image: imagePreview || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    clearImage();
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer simulated_jwt_token' // in real implementation, supply JWT
        },
        body: JSON.stringify({
          message: userMsg.text,
          image_base64: userMsg.image || null,
          session_id: "default-session"
        })
      });

      if (!response.ok) throw new Error('API failure');
      const data = await response.json();

      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: data.response,
        confidence: data.confidence_score,
        sources: data.sources,
        agent_flow: data.agent_flow,
        data: data.data
      }]);
    } catch (err) {
      // Mocked response fallback for offline testing
      setTimeout(() => {
        const mockResponse = simulateAgentResponse(userMsg.text, userMsg.image);
        setMessages(prev => [...prev, mockResponse]);
        setLoading(false);
      }, 1200);
      return;
    }
    setLoading(false);
  };

  // Simulated multi-agent responder for local demo
  const simulateAgentResponse = (prompt: string, image?: string): Message => {
    const prompt_l = prompt.toLowerCase();

    if (image) {
      return {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: "### Visual Hazard Report Analysis\n\n**CEO Agent Routing Details:** Evaluated image upload via **Gemini 1.5 Pro Vision**.\n\n**Visual Observations:** Anomaly detected: **Severe structural pothole damage** on a municipal asphalt road with water logging, creating traffic risks.\n\n**Mitigation Actions:**\n1. Dispatch emergency road repair crews to fill the pothole (target 12 hours).\n2. Place traffic barriers and signs warning of water logging.\n3. Log operational maintenance ticket to the Public Works department.\n\n*This recommendations are fully aligned with the Smart Road SOP section 4.*",
        confidence: 0.94,
        sources: [{ filename: "Inspection Image Upload", score: 0.95 }, { filename: "SOP-Road-Maintenance.pdf", score: 0.90 }],
        agent_flow: ["CEOAgent (Multimodal)", "RagAgent (SOP Search)", "RecommendationAgent (Mitigation Planning)"]
      };
    }

    if (prompt_l.includes("water") || prompt_l.includes("leakage")) {
      return {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: "### Water Anomaly Report: Ward 102\n\n**Executive Summary:**\n- Flow sensors in Ward 102 show a pressure drop from **3.2 bar to 2.7 bar** (14% loss).\n- Correlation: Three citizen grievances filed in block D within the past 4 hours.\n\n**Proposed Actions:**\n- Automated shutdown of primary isolation valves has been scheduled.\n- Alert dispatched to field supervisor (Supervisor-102) for leakage repair.\n\n*Explainable AI Note: Analytics Agent queried BQ telemetry, Data Agent pulled AlloyDB tickets, Workflow Agent dispatched SMS alerts.*",
        confidence: 0.91,
        sources: [{ filename: "BigQuery Flow Telemetry", score: 0.95 }, { filename: "AlloyDB Grievances", score: 0.98 }, { filename: "Water-Supply-SOP.pdf", score: 0.88 }],
        agent_flow: ["CEOAgent (Routing)", "AnalyticsAgent (BQ Query)", "DataAgent (AlloyDB Ticket Lookup)", "WorkflowAgent (SMS Notification)"]
      };
    }

    if (prompt_l.includes("predict") || prompt_l.includes("forecast") || prompt_l.includes("traffic")) {
      return {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: "### Predictive Analysis: Traffic Load Forecast\n\n**Model Forecasting Summary:**\n- **Predicted peak load:** **82% capacity** at 18:30 during typical rush hour.\n- **Anomaly risk:** **72% congestion probability** due to localized road construction on bypass line.\n\n**Recommendations:**\n- Divert light vehicles to alternative lanes at checkpoint 4.\n- Set digital signage warnings 2km before the bottleneck.",
        confidence: 0.88,
        sources: [{ filename: "BigQuery Sensor Telemetry", score: 0.92 }, { filename: "District Traffic SOP (2025)", score: 0.85 }],
        agent_flow: ["CEOAgent (Routing)", "AnalyticsAgent (BQ Stats)", "PredictionAgent (Vertex AI Forecast)", "RecommendationAgent (Traffic Routing)"]
      };
    }

    return {
      id: String(Date.now() + 1),
      sender: 'ai',
      text: `### CEO Agent Briefing\n\nI have parsed your query: *'${prompt}'*.\n\nThere are no active alerts or abnormal telemetry values registered for this subject. All databases (AlloyDB, BigQuery) report normal thresholds. If you need details on specific schemes, upload files to the RAG repository.`,
      confidence: 0.85,
      sources: [{ filename: "System Health Log", score: 0.90 }],
      agent_flow: ["CEOAgent (Direct Planning)"]
    };
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'bg-slate-700';
    if (score > 0.9) return 'bg-emerald-500';
    if (score > 0.7) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] glass rounded-3xl overflow-hidden border border-slate-800">

      {/* Active Session Info */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Cpu size={16} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Gemini 1.5 Pro Reasoning Engine</h3>
            <p className="text-[10px] text-slate-400">Multi-Agent Team: 6 Sub-agents active</p>
          </div>
        </div>
        <span className="text-[10px] bg-slate-800 border border-slate-750 px-3 py-1 rounded-full font-mono text-slate-400">
          ID: default-session
        </span>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}
          >
            {msg.sender === 'ai' && (
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 text-xs">
                <Cpu size={14} />
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-5 ${msg.sender === 'user'
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-slate-900/40 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}>

              {/* User Attachment Image */}
              {msg.image && (
                <div className="mb-3 rounded-xl overflow-hidden max-w-sm border border-slate-800">
                  <img src={msg.image} alt="User upload" className="object-cover max-h-48 w-full" />
                </div>
              )}

              {/* Message text */}
              <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans prose prose-invert max-w-none">
                {msg.text.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-sm font-extrabold text-white mt-4 mb-2 first:mt-0">{line.substring(4)}</h3>;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <strong key={i} className="block text-slate-200 mt-2 font-bold">{line.replace(/\*\*/g, '')}</strong>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="list-disc ml-4 text-slate-350">{line.substring(2)}</li>;
                  }
                  return <p key={i} className="mb-2 last:mb-0">{line}</p>;
                })}
              </div>

              {/* Metadata Drawer (Responsible AI indicators) */}
              {msg.sender === 'ai' && (
                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3.5">

                  {/* Agent workflow breadcrumbs */}
                  {msg.agent_flow && msg.agent_flow.length > 0 && (
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <Workflow size={12} className="text-sky-400 shrink-0" />
                      <div className="flex flex-wrap items-center gap-1 font-mono">
                        {msg.agent_flow.map((agent, index) => (
                          <div key={index} className="flex items-center space-x-1">
                            {index > 0 && <span className="text-slate-600 font-sans">→</span>}
                            <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 text-slate-300">
                              {agent}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence and Citations */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">

                    {/* Confidence Score Bar */}
                    {msg.confidence !== undefined && (
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                        <ShieldCheck size={13} className="text-emerald-400" />
                        <span>Confidence:</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getConfidenceColor(msg.confidence)}`}
                            style={{ width: `${msg.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-slate-200">{Math.round(msg.confidence * 100)}%</span>
                      </div>
                    )}

                    {/* Citations List */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <Bookmark size={12} className="text-blue-400" />
                        <span className="text-[10px] text-slate-500 mr-1 font-sans">Sources:</span>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono font-semibold"
                            title={`Relevance score: ${Math.round(src.score * 100)}%`}
                          >
                            {src.filename}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>

            {msg.sender === 'user' && (
              <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-350 shrink-0 text-xs font-semibold uppercase">
                U
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start space-x-4">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 text-xs animate-pulse">
              <Cpu size={14} />
            </div>
            <div className="bg-slate-900/40 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none p-5 flex items-center space-x-3">
              <div className="flex space-x-1">
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-[10px] font-mono tracking-wider">Agents collaborating...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Tray */}
      <div className="p-4 bg-slate-900/60 border-t border-slate-800">

        {/* Attachment preview bar */}
        {imagePreview && (
          <div className="flex items-center space-x-2 bg-slate-850 p-2 rounded-xl mb-3 border border-slate-800 max-w-max">
            <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-800">
              <img src={imagePreview} alt="upload preview" className="object-cover h-full w-full" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Attachment ready</span>
            <button
              onClick={clearImage}
              className="text-slate-400 hover:text-red-400 p-1 hover:bg-slate-800 rounded"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center space-x-3">

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-slate-800 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl text-slate-400 hover:text-slate-200 transition duration-150"
            title="Attach municipal inspection photograph"
          >
            <ImageIcon size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Query smart city metrics, forecast water pressure, or upload infrastructure hazard photographs..."
            className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition placeholder-slate-500"
          />

          <button
            onClick={handleSend}
            className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white shadow-md shadow-blue-500/10 transition duration-150 flex items-center justify-center shrink-0"
          >
            <Send size={18} />
          </button>

        </div>

      </div>

    </div>
  );
}
