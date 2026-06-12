'use client';

import { useState, useEffect } from 'react';
import CommandCenter from './components/CommandCenter';

// ==================== MOCK DATA FOR DEMO FALLBACKS ====================
const MOCK_COWS = [
  { cow_id: 'COW_001', breed: 'White Fulani', herd_id: 'Herd_A', status: 'Healthy', temp: 38.4, activity: 48.2, rumination: 32.5, lying: 8.2 },
  { cow_id: 'COW_002', breed: 'Crossbred (HF x WF)', herd_id: 'Herd_A', status: 'In-Estrus', temp: 38.8, activity: 92.4, rumination: 26.1, lying: 4.1 },
  { cow_id: 'COW_003', breed: 'White Fulani', herd_id: 'Herd_B', status: 'Mastitis Risk', temp: 39.7, activity: 32.1, rumination: 14.2, lying: 11.8 },
  { cow_id: 'COW_004', breed: 'Sokoto Gudali', herd_id: 'Herd_B', status: 'Heat-Stressed', temp: 39.5, activity: 38.5, rumination: 24.8, lying: 7.1 },
  { cow_id: 'COW_005', breed: 'White Fulani', herd_id: 'Herd_A', status: 'Calving Imminent', temp: 38.6, activity: 62.8, rumination: 18.5, lying: 9.4 },
];

const MOCK_ALERTS = [
  {
    id: 1,
    cow: 'COW_003',
    cow_breed: 'White Fulani',
    trait: 'mastitis_risk',
    risk_score: 0.88,
    status: 'new',
    created_at: new Date().toISOString(),
    prediction: {
      score: 0.88,
      feature_snapshot: { rumination_delta_pct: -35.2, temp_deviation: 1.2, activity_roll_mean: 34.2, thi: 74.5 },
      explanation: {
        human_readable_text: 'Cow COW_003 shows elevated probability (88.0%) of subclinical mastitis risk. This is primarily driven by: a -35.2% change in rumination vs baseline (negative contribution), a body temperature deviation of +1.20°C (positive contribution), and a 15% drop in rolling average activity.',
        shap_values: { rumination_delta_pct: -0.45, temp_deviation: 0.38, activity_roll_mean: -0.12, thi: 0.05 }
      }
    }
  },
  {
    id: 2,
    cow: 'COW_002',
    cow_breed: 'Crossbred (HF x WF)',
    trait: 'estrus',
    risk_score: 0.94,
    status: 'new',
    created_at: new Date().toISOString(),
    prediction: {
      score: 0.94,
      feature_snapshot: { activity_zscore: 3.8, lying_time_min: 4.1, nocturnal_activity_dev: 2.5, thi: 72.1 },
      explanation: {
        human_readable_text: 'Cow COW_002 shows elevated probability (94.0%) of estrus (heat). This is primarily driven by: an activity deviation z-score of +3.80 (positive contribution), lying time being 4.10 minutes (negative contribution), and a night-time activity deviation of +2.50.',
        shap_values: { activity_zscore: 0.52, lying_time_min: -0.31, nocturnal_activity_dev: 0.18, thi: -0.02 }
      }
    }
  },
  {
    id: 3,
    cow: 'COW_004',
    cow_breed: 'Sokoto Gudali',
    trait: 'heat_stress',
    risk_score: 0.82,
    status: 'acknowledged',
    created_at: new Date().toISOString(),
    prediction: {
      score: 0.82,
      feature_snapshot: { thi: 83.4, temp_deviation: 1.0, activity_roll_mean: 36.8, rumination_roll_mean: 22.5 },
      explanation: {
        human_readable_text: 'Cow COW_004 shows elevated probability (82.0%) of heat stress. This is primarily driven by: an environmental Temperature-Humidity Index (THI) of 83.4 (positive contribution), a body temperature deviation of +1.00°C (positive contribution), and reduced rolling activity.',
        shap_values: { thi: 0.48, temp_deviation: 0.32, activity_roll_mean: -0.15, rumination_roll_mean: -0.08 }
      }
    }
  }
];

const MOCK_MODELS = [
  { id: 1, name: 'Logistic Regression (v1.0)', trait: 'estrus', family: 'interpretable', algorithm: 'logistic_regression', metrics: { roc_auc: 0.99, f1: 0.69, biological_consistency: { is_consistent: true } } },
  { id: 2, name: 'Decision Tree (v1.0)', trait: 'estrus', family: 'interpretable', algorithm: 'decision_tree', metrics: { roc_auc: 1.0, f1: 1.0, biological_consistency: { is_consistent: true } } },
  { id: 3, name: 'Random Forest (v1.0)', trait: 'estrus', family: 'black_box', algorithm: 'random_forest', metrics: { roc_auc: 1.0, f1: 1.0, biological_consistency: { is_consistent: true } } },
  { id: 4, name: 'Gradient Boosting (v1.0)', trait: 'estrus', family: 'black_box', algorithm: 'gradient_boosting', metrics: { roc_auc: 1.0, f1: 1.0, biological_consistency: { is_consistent: true } } },
  { id: 5, name: 'Decision Tree (v1.0)', trait: 'mastitis_risk', family: 'interpretable', algorithm: 'decision_tree', metrics: { roc_auc: 0.82, f1: 0.74, biological_consistency: { is_consistent: true } } },
  { id: 6, name: 'Gradient Boosting (v1.0)', trait: 'mastitis_risk', family: 'black_box', algorithm: 'gradient_boosting', metrics: { roc_auc: 0.86, f1: 0.78, biological_consistency: { is_consistent: true } } },
  { id: 7, name: 'Logistic Regression (v1.0)', trait: 'heat_stress', family: 'interpretable', algorithm: 'logistic_regression', metrics: { roc_auc: 0.99, f1: 0.96, biological_consistency: { is_consistent: true } } },
  { id: 8, name: 'Gradient Boosting (v1.0)', trait: 'heat_stress', family: 'black_box', algorithm: 'gradient_boosting', metrics: { roc_auc: 1.0, f1: 1.0, biological_consistency: { is_consistent: true } } },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [cows, setCows] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  
  // Selection States
  const [selectedCow, setSelectedCow] = useState<any>(null);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  
  // Pipeline Trigger States
  const [genHerdSize, setGenHerdSize] = useState(30);
  const [genDuration, setGenDuration] = useState(30);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);

  // Diagnosis Form State
  const [diagConfirm, setDiagConfirm] = useState(true);
  const [diagComment, setDiagComment] = useState('');

  // API URL base (override with NEXT_PUBLIC_API_BASE)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

  // DRF list endpoints are paginated ({ count, results }); normalise to a plain array.
  const asList = (data: any) => (Array.isArray(data) ? data : data?.results ?? []);

  // Load Initial Data
  useEffect(() => {
    fetchBackendData();
  }, []);

  const fetchBackendData = async () => {
    try {
      // Test if API is alive
      const res = await fetch(`${API_BASE}/cows/?page_size=1000`);
      if (!res.ok) throw new Error('API not available');

      const cowsData = asList(await res.json());
      setCows(cowsData);

      const alertsRes = await fetch(`${API_BASE}/alerts/?page_size=1000`);
      const alertsData = asList(await alertsRes.json());
      setAlerts(alertsData);

      const modelsRes = await fetch(`${API_BASE}/models/?page_size=1000`);
      const modelsData = asList(await modelsRes.json());
      setModels(modelsData);

      const datasetsRes = await fetch(`${API_BASE}/datasets/?page_size=1000`);
      const datasetsData = asList(await datasetsRes.json());
      setDatasets(datasetsData);

      const diagRes = await fetch(`${API_BASE}/diagnoses/?page_size=1000`);
      const diagData = asList(await diagRes.json());
      setDiagnoses(diagData);

      setIsDemoMode(false);
      
      // Select first item by default
      if (cowsData.length > 0) setSelectedCow(cowsData[0]);
      if (alertsData.length > 0) setSelectedAlert(alertsData[0]);
    } catch (err) {
      console.warn('Backend API not responding, falling back to rich Demo Mode.');
      setIsDemoMode(true);
      // Populate Fallbacks
      setCows(MOCK_COWS);
      setAlerts(MOCK_ALERTS);
      setModels(MOCK_MODELS);
      setDatasets([
        { id: 1, name: 'Tropical White-Fulani Dataset', version: 'seed_synthetic_v1', source_type: 'synthetic', is_active: true, created_at: new Date().toISOString() }
      ]);
      setSelectedCow(MOCK_COWS[0]);
      setSelectedAlert(MOCK_ALERTS[0]);
    }
  };

  // Run full pipeline
  const handleRunPipeline = async () => {
    setIsPipelineRunning(true);
    setPipelineLog(['Initializing pipeline triggers...', 'Running dataset generation...']);
    
    if (isDemoMode) {
      // Mock pipeline progression
      setTimeout(() => {
        setPipelineLog(prev => [...prev, 'Dataset generated successfully! ID: 1, Version: seed_synthetic_v1']);
      }, 1000);
      setTimeout(() => {
        setPipelineLog(prev => [...prev, 'Running validation: 0 errors detected. Status: Validated']);
      }, 2000);
      setTimeout(() => {
        setPipelineLog(prev => [...prev, 'Feature engineering: derived THI, rolling averages, nocturnals...']);
      }, 3500);
      setTimeout(() => {
        setPipelineLog(prev => [...prev, 'Training models for estrus, mastitis, heat_stress, calving...']);
      }, 5000);
      setTimeout(() => {
        setPipelineLog(prev => [
          ...prev, 
          'Models trained: Random Forest, Gradient Boosting, Logistic Regression, Decision Tree.',
          'Saved evaluation reports in database.',
          'Pipeline completed successfully! All exports updated.'
        ]);
        setIsPipelineRunning(false);
        fetchBackendData();
      }, 7000);
      return;
    }

    try {
      setPipelineLog(prev => [...prev, 'Calling dataset generator...']);
      const genRes = await fetch(`${API_BASE}/datasets/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herd_size: genHerdSize, duration_days: genDuration })
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Generation failed');
      
      setPipelineLog(prev => [...prev, `Dataset generated. Version: ${genData.version}. Starting validation...`]);
      const valRes = await fetch(`${API_BASE}/datasets/${genData.id}/validate/`);
      const valData = await valRes.json();
      setPipelineLog(prev => [...prev, `Validation: ${JSON.stringify(valData)}. Starting features build...`]);

      const featRes = await fetch(`${API_BASE}/datasets/${genData.id}/build_features/`, { method: 'POST' });
      const featData = await featRes.json();
      setPipelineLog(prev => [...prev, `Features build: ${featData.message}. Launching comparative training...`]);

      const trainRes = await fetch(`${API_BASE}/models/evaluate_report/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: genData.id })
      });
      const trainData = await trainRes.json();
      setPipelineLog(prev => [
        ...prev, 
        `Completed ML training across traits. Ingested models count: ${trainData.length}`,
        'Comparative figures and CSV reports saved in /evaluation_exports/!',
        'Pipeline execution completed successfully!'
      ]);
      fetchBackendData();
    } catch (err: any) {
      setPipelineLog(prev => [...prev, `ERROR: ${err.message}`]);
    } finally {
      setIsPipelineRunning(false);
    }
  };

  // Ingest public dataset
  const handleImportPublic = async () => {
    setIsPipelineRunning(true);
    setPipelineLog(['Initializing public dataset ingestion...']);
    try {
      const res = await fetch(`${API_BASE}/datasets/import/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setPipelineLog(prev => [...prev, `Imported dataset: ${data.name}. Starting feature build...`]);
      
      const featRes = await fetch(`${API_BASE}/datasets/${data.id}/build_features/`, { method: 'POST' });
      const featData = await featRes.json();
      setPipelineLog(prev => [...prev, `Features build completed. Ingestion complete!`]);
      fetchBackendData();
    } catch (err: any) {
      setPipelineLog(prev => [...prev, `ERROR: ${err.message}`]);
    } finally {
      setIsPipelineRunning(false);
    }
  };

  // Update alert status
  const handleUpdateAlertStatus = async (alertId: number, status: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
    if (selectedAlert && selectedAlert.id === alertId) {
      setSelectedAlert((prev: any) => ({ ...prev, status }));
    }
    
    if (!isDemoMode) {
      try {
        await fetch(`${API_BASE}/alerts/${alertId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Log diagnosis
  const handleLogDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    
    const newDiag = {
      cow: selectedAlert.cow,
      alert: selectedAlert.id,
      diagnosed_trait: selectedAlert.trait,
      is_confirmed: diagConfirm,
      comments: diagComment,
      created_at: new Date().toISOString()
    };

    setDiagnoses(prev => [newDiag, ...prev]);
    setDiagComment('');
    
    // Auto resolve alert on diagnosis log
    handleUpdateAlertStatus(selectedAlert.id, 'resolved');
    
    if (!isDemoMode) {
      try {
        await fetch(`${API_BASE}/diagnoses/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDiag)
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Format Text Helpers
  const formatTrait = (trait: string) => {
    return trait.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const activeDataset = datasets.find(d => d.is_active);

  // Group models by trait for the Chapter 4 view
  const traits = ['estrus', 'mastitis_risk', 'heat_stress', 'calving_imminent'];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">L</div>
          <div className="logo-text">
            <h1>LUCID</h1>
            <p>Livestock Intelligence Platform</p>
          </div>
        </div>

        <nav style={{ flexGrow: 1, marginBottom: '2rem' }}>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <span>📊</span> Herd Overview
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
                onClick={() => setActiveTab('alerts')}
              >
                <span>🚨</span> Alert Feed & XAI
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'evaluation' ? 'active' : ''}`}
                onClick={() => setActiveTab('evaluation')}
              >
                <span>🔬</span> Model Evaluation
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'pipeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('pipeline')}
              >
                <span>⚙️</span> Data & Training
              </button>
            </li>
          </ul>
        </nav>

        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>System Mode</span>
            <span style={{ 
              fontWeight: 700, 
              color: isDemoMode ? 'var(--status-heatstress)' : 'var(--status-healthy)' 
            }}>
              {isDemoMode ? 'Demo Mode' : 'API Active'}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Active Dataset: </span>
            <span style={{ fontWeight: 600 }}>{activeDataset ? activeDataset.version : 'None'}</span>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        
        {/* ==================== TAB: DASHBOARD OVERVIEW ==================== */}
        {activeTab === 'dashboard' && (
          <CommandCenter
            cows={cows}
            alerts={alerts}
            models={models}
            onRefresh={fetchBackendData}
          />
        )}

        {/* ==================== TAB: ALERTS & EXPLAINABLE AI ==================== */}
        {activeTab === 'alerts' && (
          <div>
            <h2 className="page-title">Alerts Feed & Explainable AI</h2>
            <p className="page-subtitle">Inspect local feature attributions using SHAP explainers</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '2rem' }}>
              
              {/* Alerts List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Recent Alerts</h3>
                
                {alerts.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                    No alerts raised. Everything is stable!
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div 
                      key={alert.id}
                      className="card"
                      style={{ 
                        cursor: 'pointer',
                        borderColor: selectedAlert?.id === alert.id ? 'var(--accent-primary)' : 'var(--border-color)',
                        backgroundColor: alert.status === 'resolved' ? 'rgba(255,255,255,0.01)' : 'var(--bg-secondary)',
                        opacity: alert.status === 'resolved' ? 0.7 : 1
                      }}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem' }}>{alert.cow}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className={`badge ${
                          alert.trait === 'estrus' ? 'badge-estrus' :
                          alert.trait === 'mastitis_risk' ? 'badge-mastitis' :
                          alert.trait === 'heat_stress' ? 'badge-heatstress' :
                          'badge-calving'
                        }`}>
                          {formatTrait(alert.trait)}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-mastitis)' }}>
                          Risk: {Math.round(alert.risk_score * 100)}%
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '0.75rem' }}>
                        {alert.prediction?.explanation?.human_readable_text}
                      </p>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {alert.status === 'new' && (
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateAlertStatus(alert.id, 'acknowledged');
                            }}
                          >
                            👁️ Acknowledge
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateAlertStatus(alert.id, 'resolved');
                            }}
                          >
                            ✓ Resolve
                          </button>
                        )}
                        {alert.status === 'resolved' && (
                          <span style={{ color: 'var(--status-healthy)', fontSize: '0.8rem', fontWeight: 600 }}>✓ Resolved</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* SHAP Explanation Layer */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {selectedAlert ? (
                  <div>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Local Explanation Layer (SHAP)</span>
                        <span className={`badge ${
                          selectedAlert.status === 'new' ? 'badge-mastitis' :
                          selectedAlert.status === 'acknowledged' ? 'badge-heatstress' :
                          'badge-healthy'
                        }`}>
                          {selectedAlert.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedAlert.cow}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Breed: {selectedAlert.cow_breed} | Event: {formatTrait(selectedAlert.trait)}
                      </p>
                    </div>

                    {/* Explainer Box */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-primary)', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💡</span> biological Interpretation
                      </h4>
                      <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                        {selectedAlert.prediction?.explanation?.human_readable_text}
                      </p>
                    </div>

                    {/* SHAP Waterfall / Force Plot Representation */}
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Feature Contributions (SHAP Values)</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {Object.entries(selectedAlert.prediction?.explanation?.shap_values || {}).map(([key, val]: [string, any]) => {
                          const numVal = Number(val);
                          const percentage = Math.min(100, Math.abs(numVal) * 150);
                          const isPositive = numVal >= 0;
                          
                          return (
                            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.5fr', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                                {key}
                              </span>
                              
                              <div style={{ background: 'rgba(255,255,255,0.03)', height: '14px', borderRadius: '6px', overflow: 'hidden', display: 'flex', justifyContent: isPositive ? 'flex-start' : 'flex-end', position: 'relative' }}>
                                <div 
                                  className={`shap-bar ${isPositive ? 'shap-bar-positive' : 'shap-bar-negative'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'right', color: isPositive ? 'var(--status-estrus)' : 'var(--status-calving)' }}>
                                {isPositive ? '+' : ''}{numVal.toFixed(3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center', fontSize: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'linear-gradient(90deg, #ec4899, #f43f5e)', borderRadius: '3px' }}></span>
                          Increases Risk
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: '3px' }}></span>
                          Decreases Risk
                        </span>
                      </div>
                    </div>

                    {/* Veterinarian Feedback Log */}
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>👩‍⚕️ Veterinary Diagnosis Feedback</h4>
                      
                      <form onSubmit={handleLogDiagnosis} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="diag_confirm" 
                              checked={diagConfirm} 
                              onChange={() => setDiagConfirm(true)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            Confirm Alert (True Positive)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="diag_confirm" 
                              checked={!diagConfirm} 
                              onChange={() => setDiagConfirm(false)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            Reject Alert (False Positive)
                          </label>
                        </div>
                        
                        <textarea 
                          className="form-input"
                          style={{ height: '70px', resize: 'none' }}
                          placeholder="Add diagnostic comments or veterinary notes..."
                          value={diagComment}
                          onChange={(e) => setDiagComment(e.target.value)}
                          required
                        />
                        
                        <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                          💾 Submit & Resolve Alert
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    Select an alert from the feed to inspect explanations.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: MODEL EVALUATION ==================== */}
        {activeTab === 'evaluation' && (
          <div>
            <h2 className="page-title">Model Comparison & Evaluation</h2>
            <p className="page-subtitle">Chapter 4 Thesis Deliverables: side-by-side performance of Interpretable vs Black-Box models</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Metrics Summary Table */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Side-by-Side Model Benchmarks</h3>
                
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Target Trait</th>
                        <th>Model Family</th>
                        <th>Algorithm</th>
                        <th>ROC-AUC</th>
                        <th>F1 Score</th>
                        <th>Bio Consistent?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 700 }}>{formatTrait(m.trait)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{m.family.replace('_', ' ')}</td>
                          <td><code>{m.algorithm}</code></td>
                          <td style={{ fontWeight: 700, color: 'var(--status-healthy)' }}>
                            {m.metrics?.roc_auc?.toFixed(3) || '0.500'}
                          </td>
                          <td>{m.metrics?.f1?.toFixed(3) || '0.000'}</td>
                          <td>
                            <span style={{ 
                              color: m.metrics?.biological_consistency?.is_consistent ? 'var(--status-healthy)' : 'var(--status-mastitis)',
                              fontWeight: 600
                            }}>
                              {m.metrics?.biological_consistency?.is_consistent ? '✓ YES' : '✗ NO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <a href={`${API_BASE}/models/download_report/`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                    📥 Download CSV Report
                  </a>
                  <a href={`${API_BASE}/models/download_plot/`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                    🖼️ Download AUC Chart
                  </a>
                </div>
              </div>

              {/* Research Metrics Explanation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Academic Requirements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Target Accuracy:</span>
                      <span style={{ fontWeight: 700 }}>AUC ≥ 0.80 | F1 ≥ 0.70</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Accuracy Gap (BB - Interp):</span>
                      <span style={{ fontWeight: 700, color: 'var(--status-healthy)' }}>≤ 0.05 (Small)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Explanation Stability:</span>
                      <span style={{ fontWeight: 700 }}>≥ 80% Top-k overlap</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      * The system utilizes a <b>leave-cow-out split</b> to evaluate generalization performance. This ensures that metrics represent capability on unseen animals.
                    </p>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Biological Consistency Rules</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--status-estrus)' }}>Estrus:</span>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Activity Spike (↑), Lying Time Decrease (↓), Restlessness Dev (↑)</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--status-mastitis)' }}>Mastitis:</span>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Rumination Decline (↓), Activity Drop (↓), Temperature Deviation (↑)</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--status-heatstress)' }}>Heat Stress:</span>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>High Environmental THI (↑), Body Temp Rise (↑), Activity Drop (↓)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: PIPELINE & SYSTEM SETTINGS ==================== */}
        {activeTab === 'pipeline' && (
          <div>
            <h2 className="page-title">Pipeline & Data Controls</h2>
            <p className="page-subtitle">Configure parameters, generate datasets, and train the model registry</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              
              {/* Form Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Synthetic Generator */}
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Literature-Calibrated Synthetic Generator</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Herd Size (Cows)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={genHerdSize} 
                          onChange={(e) => setGenHerdSize(Number(e.target.value))}
                          min="5" 
                          max="150"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Duration (Days)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={genDuration} 
                          onChange={(e) => setGenDuration(Number(e.target.value))}
                          min="5" 
                          max="90"
                        />
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary" 
                      onClick={handleRunPipeline}
                      disabled={isPipelineRunning}
                    >
                      {isPipelineRunning ? '⏳ Pipeline Running...' : '🚀 Generate Data, Clean & Train Registry'}
                    </button>
                  </div>
                </div>

                {/* Public Ingestion */}
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Public Accelerometer Ingestor</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Validates the ML model pipeline against real dairy-sensor datasets.
                  </p>
                  
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleImportPublic}
                    disabled={isPipelineRunning}
                  >
                    📂 Import & Map Public Dataset CSV
                  </button>
                </div>
              </div>

              {/* Logs output */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Pipeline execution logs</h3>
                
                <div style={{ 
                  flexGrow: 1, 
                  background: '#070a13', 
                  borderRadius: '10px', 
                  padding: '1rem', 
                  fontFamily: 'monospace', 
                  fontSize: '0.8rem', 
                  color: '#10b981', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)'
                }}>
                  {pipelineLog.length === 0 ? (
                    <span style={{ color: 'var(--text-secondary)' }}>Ready. Trigger an event to stream live log status.</span>
                  ) : (
                    pipelineLog.map((log, i) => (
                      <div key={i} style={{ marginBottom: '0.35rem' }}>{`> ${log}`}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
