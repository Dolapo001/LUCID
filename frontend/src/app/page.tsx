'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Settings, LayoutDashboard, BrainCircuit, 
  AlertTriangle, FlaskConical, Database, User, LogOut, ChevronRight, CheckCircle2 
} from 'lucide-react';

// ==================== MOCK DATA FOR DEMO FALLBACKS ====================
const MOCK_COWS = [
  { cow_id: 'COW_001', breed: 'White Fulani', herd_id: 'Herd_A', status: 'Healthy', temp: 38.4, activity: 48.2, rumination: 32.5, lying: 8.2 },
  { cow_id: 'COW_002', breed: 'Crossbred', herd_id: 'Herd_A', status: 'In-Estrus', temp: 38.8, activity: 92.4, rumination: 26.1, lying: 4.1 },
  { cow_id: 'COW_003', breed: 'White Fulani', herd_id: 'Herd_B', status: 'Mastitis Risk', temp: 39.7, activity: 32.1, rumination: 14.2, lying: 11.8 },
  { cow_id: 'COW_004', breed: 'Sokoto Gudali', herd_id: 'Herd_B', status: 'Heat-Stressed', temp: 39.5, activity: 38.5, rumination: 24.8, lying: 7.1 },
  { cow_id: 'COW_005', breed: 'White Fulani', herd_id: 'Herd_A', status: 'Calving Imminent', temp: 38.6, activity: 62.8, rumination: 18.5, lying: 9.4 },
];

const MOCK_ALERTS = [
  {
    id: 1, cow: 'COW_003', cow_breed: 'White Fulani', trait: 'mastitis_risk', risk_score: 0.88, status: 'new', created_at: new Date().toISOString(),
    prediction: {
      score: 0.88,
      explanation: {
        human_readable_text: 'Elevated probability of subclinical mastitis driven by -35% rumination vs baseline.',
        shap_values: { rumination_delta_pct: -0.45, temp_deviation: 0.38, activity_roll_mean: -0.12 }
      }
    }
  },
  {
    id: 2, cow: 'COW_002', cow_breed: 'Crossbred', trait: 'estrus', risk_score: 0.94, status: 'new', created_at: new Date().toISOString(),
    prediction: {
      score: 0.94,
      explanation: {
        human_readable_text: 'Estrus detected. Primary driver: Activity deviation z-score +3.80.',
        shap_values: { activity_zscore: 0.52, lying_time_min: -0.31, nocturnal_activity_dev: 0.18 }
      }
    }
  }
];

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cows, setCows] = useState<any[]>(MOCK_COWS);
  const [alerts, setAlerts] = useState<any[]>(MOCK_ALERTS);
  const [selectedCow, setSelectedCow] = useState<any>(MOCK_COWS[0]);
  const [selectedAlert, setSelectedAlert] = useState<any>(MOCK_ALERTS[0]);
  const [isDemoMode] = useState(true);

  // Authentication Flow
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-black text-white" style={{ display: 'flex', minHeight: '100vh', background: '#000', color: '#fff' }}>
        <div style={{ flex: 1, background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            style={{ position: 'absolute', width: '600px', height: '600px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
             <div style={{ width: '400px', height: '400px', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={80} color="#3B82F6" opacity={0.5} />
             </div>
          </motion.div>
          <div style={{ zIndex: 10, textAlign: 'center' }}>
             <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '1rem' }}>LUCID AI</h1>
             <p style={{ color: 'var(--text-secondary)' }}>Explainable AI Decision Support System</p>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel"
            style={{ width: '400px', padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Welcome Back</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sign in to the dairy intelligence platform.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input type="email" placeholder="researcher@lucid.ai" className="form-input" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                  <a href="#" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Forgot?</a>
                </div>
                <input type="password" placeholder="••••••••" className="form-input" />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setIsAuthenticated(true)}>
              Authenticate Securely
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const formatTrait = (trait: string) => trait.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="app-container">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon"><BrainCircuit size={18} /></div>
          <div className="logo-text">
            <h1>LUCID</h1>
            <p>XAI Dairy System</p>
          </div>
        </div>

        <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Platform</p>
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={16} /> Overview
          </button>
          <button className={`nav-item ${activeTab === 'herd' ? 'active' : ''}`} onClick={() => setActiveTab('herd')}>
            <Database size={16} /> Herd Management
          </button>
          <button className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            <AlertTriangle size={16} /> Predictions & Alerts
          </button>
          <button className={`nav-item ${activeTab === 'evaluation' ? 'active' : ''}`} onClick={() => setActiveTab('evaluation')}>
            <FlaskConical size={16} /> Model Evaluation
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={16} /> Settings
          </button>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} color="var(--text-secondary)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>Dr. A. Researcher</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lead Data Scientist</p>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsAuthenticated(false)}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'dashboard' && (
              <div>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div>
                    <h2 className="page-title">Executive Dashboard</h2>
                    <p className="page-subtitle">Real-time inference and herd health overview</p>
                  </div>
                  <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-healthy)', boxShadow: '0 0 10px var(--status-healthy)' }}></span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>API: CONNECTED</span>
                  </div>
                </header>

                <div className="stats-grid">
                  <motion.div className="card glass-panel" whileHover={{ y: -2 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Monitored Cows</p>
                    <p style={{ fontSize: '2rem', fontWeight: 600, marginTop: '0.5rem', fontFamily: 'JetBrains Mono' }}>{cows.length}</p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--status-healthy)' }}>
                      <Activity size={12} /> Live Telemetry Active
                    </div>
                  </motion.div>
                  <motion.div className="card glass-panel" whileHover={{ y: -2 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Critical Alerts</p>
                    <p style={{ fontSize: '2rem', fontWeight: 600, marginTop: '0.5rem', fontFamily: 'JetBrains Mono', color: 'var(--status-danger)' }}>{alerts.filter(a => a.status === 'new').length}</p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Requires immediate review
                    </div>
                  </motion.div>
                  <motion.div className="card glass-panel" whileHover={{ y: -2 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Prediction Confidence</p>
                    <p style={{ fontSize: '2rem', fontWeight: 600, marginTop: '0.5rem', fontFamily: 'JetBrains Mono', color: 'var(--accent-primary)' }}>92.4%</p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Across ensemble models
                    </div>
                  </motion.div>
                  <motion.div className="card glass-panel" whileHover={{ y: -2 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Health</p>
                    <p style={{ fontSize: '2rem', fontWeight: 600, marginTop: '0.5rem', fontFamily: 'JetBrains Mono' }}>Optimal</p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--status-healthy)' }}>
                      <CheckCircle2 size={12} /> All nodes operational
                    </div>
                  </motion.div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="card glass-panel">
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={16} color="var(--accent-primary)" />
                      High Priority Alerts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {alerts.slice(0, 3).map(alert => (
                        <div key={alert.id} style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{alert.cow}</span>
                              <span className="badge badge-mastitis mono-text">{formatTrait(alert.trait)}</span>
                           </div>
                           <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{alert.prediction.explanation.human_readable_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="card glass-panel">
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={16} color="var(--accent-secondary)" />
                      Model Performance Summary
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                       {['Random Forest', 'Gradient Boosting', 'Logistic Regression'].map((model, i) => (
                         <div key={model} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <span style={{ width: '140px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{model}</span>
                           <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${95 - i * 5}%` }}
                                transition={{ duration: 1, delay: i * 0.2 }}
                                style={{ height: '100%', background: 'var(--accent-primary)' }}
                              />
                           </div>
                           <span className="mono-text" style={{ fontSize: '0.8rem', width: '40px' }}>0.{95 - i * 5}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HERD MANAGEMENT TAB ── */}
            {activeTab === 'herd' && (
              <div>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h2 className="page-title">Herd Management</h2>
                    <p className="page-subtitle">Directory and sensor telemetry for all registered animals</p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input type="text" placeholder="Search ID or Breed..." className="form-input" style={{ width: '250px' }} />
                    <button className="btn btn-primary">Add Cow</button>
                  </div>
                </header>

                <div className="card glass-panel">
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Cow ID</th>
                          <th>Breed</th>
                          <th>Herd ID</th>
                          <th>Current Status</th>
                          <th>Temp (°C)</th>
                          <th>Activity Index</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cows.map(cow => (
                          <motion.tr key={cow.cow_id} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <td className="mono-text" style={{ fontWeight: 600 }}>{cow.cow_id}</td>
                            <td>{cow.breed}</td>
                            <td className="mono-text">{cow.herd_id}</td>
                            <td>
                              <span className={`badge ${
                                cow.status === 'Healthy' ? 'badge-healthy' :
                                cow.status === 'In-Estrus' ? 'badge-estrus' :
                                cow.status === 'Mastitis Risk' ? 'badge-mastitis' :
                                cow.status === 'Heat-Stressed' ? 'badge-heatstress' :
                                'badge-calving'
                              }`}>
                                {cow.status}
                              </span>
                            </td>
                            <td className="mono-text">{cow.temp.toFixed(1)}</td>
                            <td className="mono-text">{cow.activity.toFixed(1)}</td>
                            <td>
                              <button className="btn btn-outline btn-sm" onClick={() => { setSelectedCow(cow); setActiveTab('alerts'); }}>
                                View Analytics
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── ALERTS & EXPLAINABILITY TAB ── */}
            {activeTab === 'alerts' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', minHeight: 'calc(100vh - 8rem)' }}>
                {/* Left Column: Alert Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Alert Feed</h2>
                  {alerts.map(alert => (
                    <motion.div 
                      key={alert.id}
                      className={`card ${selectedAlert?.id === alert.id ? 'glass-panel' : ''}`}
                      style={{ 
                        cursor: 'pointer',
                        borderColor: selectedAlert?.id === alert.id ? 'var(--accent-primary)' : 'var(--border-color)',
                        padding: '1.25rem'
                      }}
                      onClick={() => setSelectedAlert(alert)}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="mono-text" style={{ fontWeight: 600 }}>{alert.cow}</span>
                        <span className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                         <span className="badge badge-mastitis">{formatTrait(alert.trait)}</span>
                         <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--status-danger)' }}>Risk: {(alert.risk_score * 100).toFixed(0)}%</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{alert.prediction.explanation.human_readable_text.substring(0, 60)}...</p>
                    </motion.div>
                  ))}
                </div>

                {/* Right Column: XAI Inspection */}
                <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  {selectedAlert ? (
                    <>
                      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>XAI Inspector</h2>
                          <span className="badge badge-warning">NEW</span>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                           <div>
                             <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Animal</p>
                             <p className="mono-text" style={{ fontSize: '1.1rem', fontWeight: 500 }}>{selectedAlert.cow}</p>
                           </div>
                           <div>
                             <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Predicted Trait</p>
                             <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{formatTrait(selectedAlert.trait)}</p>
                           </div>
                           <div>
                             <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</p>
                             <p className="mono-text" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--status-danger)' }}>{(selectedAlert.risk_score * 100).toFixed(1)}%</p>
                           </div>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BrainCircuit size={16} color="var(--accent-primary)" />
                        Algorithmic Explanation (SHAP)
                      </h3>
                      
                      <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                         <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                           {selectedAlert.prediction.explanation.human_readable_text}
                         </p>
                      </div>

                      <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feature Contributions</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Object.entries(selectedAlert.prediction.explanation.shap_values).map(([key, val]: [string, any], index) => {
                          const numVal = Number(val);
                          const percentage = Math.min(100, Math.abs(numVal) * 150);
                          const isPositive = numVal >= 0;
                          
                          return (
                            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 0.5fr', alignItems: 'center', gap: '1rem' }}>
                              <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{key}</span>
                              <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', display: 'flex', justifyContent: isPositive ? 'flex-start' : 'flex-end', overflow: 'hidden' }}>
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.8, delay: index * 0.1 }}
                                  className={`shap-bar ${isPositive ? 'shap-bar-positive' : 'shap-bar-negative'}`}
                                />
                              </div>
                              <span className="mono-text" style={{ fontSize: '0.8rem', textAlign: 'right', color: isPositive ? 'var(--status-danger)' : 'var(--accent-primary)' }}>
                                {isPositive ? '+' : ''}{numVal.toFixed(3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                         <button className="btn btn-outline">Acknowledge</button>
                         <button className="btn btn-primary">Resolve Alert</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      Select an alert to view Explainable AI insights.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SETTINGS / EVALUATION STUB ── */}
            {(activeTab === 'evaluation' || activeTab === 'settings') && (
               <div>
                  <h2 className="page-title">{activeTab === 'evaluation' ? 'Model Evaluation' : 'Platform Settings'}</h2>
                  <p className="page-subtitle">Coming soon in production release.</p>
                  <div className="card glass-panel" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LayoutDashboard size={20} /> Module under construction
                     </p>
                  </div>
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
