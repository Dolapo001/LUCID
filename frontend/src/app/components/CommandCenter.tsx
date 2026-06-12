'use client';

import { useEffect, useMemo, useState } from 'react';

/*
 * Three-layer operational dashboard for the Herd Overview tab.
 *  Layer 1 — glowing wireframe command center: live system map of barns,
 *            milking parlour, feed store and environmental sensors.
 *  Layer 2 — frosted glass operational feed: grounded, human-written events.
 *  Layer 3 — dense analytical terminal: monospace telemetry tables,
 *            sparklines, anomaly log and predictive model outputs.
 */

interface CommandCenterProps {
  cows: any[];
  alerts: any[];
  models: any[];
  onRefresh: () => void;
}

// Deterministic per-cow pseudo-telemetry so SSR and client renders agree.
function seedOf(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
}

function telemetryFor(cowId: string, alerts: any[]) {
  const s = seedOf(cowId);
  const flagged = alerts.find(a => a.cow === cowId && a.status !== 'resolved');
  const trait = flagged?.trait;
  return {
    temp: (38.2 + ((s % 9) / 10) + (trait === 'mastitis_risk' || trait === 'heat_stress' ? 0.9 : 0)).toFixed(1),
    yieldL: (21.5 + ((s % 60) / 10) - (trait === 'mastitis_risk' ? 4.2 : 0)).toFixed(1),
    hydration: (0.84 + ((s % 12) / 100) - (trait === 'heat_stress' ? 0.11 : 0)).toFixed(2),
    fcr: (1.28 + ((s % 22) / 100)).toFixed(2),
    trait,
    risk: flagged ? Math.round(flagged.risk_score * 100) : null,
  };
}

function sparkPath(cowId: string, w: number, h: number, disturbed: boolean): string {
  const s = seedOf(cowId);
  const pts: string[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const base = h / 2 + Math.sin((i + s) * 0.9) * (h * 0.22) + Math.sin((i + s) * 0.31) * (h * 0.12);
    const dip = disturbed && i > n - 6 ? (i - (n - 6)) * (h * 0.07) : 0;
    const y = Math.max(2, Math.min(h - 2, base + dip));
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}

const TRAIT_LABEL: Record<string, string> = {
  estrus: 'ESTRUS',
  mastitis_risk: 'MASTITIS',
  heat_stress: 'HEAT-STRESS',
  calving_imminent: 'CALVING',
};

// System map node layout (viewBox 1000 x 360)
const MAP_NODES = [
  { id: 'barn_a', label: 'BARN A', sub: 'lactating herd', x: 180, y: 110, r: 34, tone: 'cyan' },
  { id: 'barn_b', label: 'BARN B', sub: 'dry / transition', x: 180, y: 260, r: 30, tone: 'cyan' },
  { id: 'parlour', label: 'MILKING PARLOUR', sub: '2×6 herringbone', x: 470, y: 90, r: 30, tone: 'green' },
  { id: 'feed', label: 'FEED STORE', sub: 'batch #44 active', x: 470, y: 280, r: 28, tone: 'amber' },
  { id: 'tank', label: 'BULK TANK', sub: '4.1 °C · 62% full', x: 740, y: 90, r: 26, tone: 'green' },
  { id: 'env', label: 'ENV SENSORS', sub: 'THI · temp · RH', x: 740, y: 280, r: 26, tone: 'violet' },
  { id: 'core', label: 'LUCID CORE', sub: 'inference online', x: 880, y: 185, r: 22, tone: 'violet' },
];

const MAP_LINKS = [
  ['barn_a', 'parlour'], ['barn_b', 'feed'], ['barn_a', 'feed'],
  ['parlour', 'tank'], ['barn_b', 'parlour'], ['env', 'core'],
  ['tank', 'core'], ['feed', 'env'], ['parlour', 'core'],
];

const NODE_TONE: Record<string, string> = {
  cyan: '#22d3ee',
  green: '#34d399',
  amber: '#fbbf24',
  violet: '#a78bfa',
};

export default function CommandCenter({ cows, alerts, models, onRefresh }: CommandCenterProps) {
  const [clock, setClock] = useState<string | null>(null);
  const [focusCow, setFocusCow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB'));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const openAlerts = alerts.filter(a => a.status !== 'resolved');
  const herdYield = useMemo(() => {
    if (!cows.length) return '—';
    const total = cows.reduce((acc, c) => acc + parseFloat(telemetryFor(c.cow_id, alerts).yieldL), 0);
    return (total / cows.length).toFixed(1);
  }, [cows, alerts]);

  const shortId = (id: string) => {
    const m = id.match(/(\d+)$/);
    return m ? `B-${parseInt(m[1], 10)}` : id;
  };

  // Operational feed: grounded events, partly derived from live alerts.
  const feedItems = useMemo(() => {
    const items: { tag: string; tone: string; text: string; meta: string }[] = [
      { tag: 'MILKING', tone: 'green', text: 'Morning milking cycle completed: 92% efficiency across Barn A.', meta: '06:42 · parlour log' },
      { tag: 'FEED', tone: 'amber', text: 'Feed batch #44 consumed 8% slower than baseline. Bunk read-out flagged at second push-up.', meta: '11:15 · feed lane 2' },
      { tag: 'SCHEDULE', tone: 'violet', text: 'Vet inspection scheduled: Thursday 08:30, Unit C. Fasting not required.', meta: 'planner · recurring' },
    ];
    const byTrait: Record<string, (id: string, risk: number) => string> = {
      mastitis_risk: (id, risk) => `Cow ${id}: mild temperature variance detected over 6 hours. Rumination trending below baseline — model puts mastitis risk at ${risk}%.`,
      heat_stress: (id, risk) => `Cow ${id}: holding elevated body temperature under high THI. Heat-stress score ${risk}%. Shade and water access checked at 13:00.`,
      estrus: (id, risk) => `Cow ${id}: sustained activity spike with reduced lying time overnight. Estrus probability ${risk}% — flag for AI window.`,
      calving_imminent: (id, risk) => `Cow ${id}: restlessness pattern consistent with pre-calving behaviour (${risk}%). Moved to observation pen.`,
    };
    for (const a of openAlerts.slice(0, 3)) {
      const make = byTrait[a.trait];
      if (make) {
        items.splice(1, 0, {
          tag: TRAIT_LABEL[a.trait] || a.trait.toUpperCase(),
          tone: a.trait === 'estrus' ? 'pink' : a.trait === 'heat_stress' ? 'amber' : 'red',
          text: make(shortId(a.cow), Math.round(a.risk_score * 100)),
          meta: `${new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · sensor inference`,
        });
      }
    }
    return items.slice(0, 6);
  }, [openAlerts]);

  // Predictive modelling block: live AUC per trait from the model registry.
  const traitModels = useMemo(() => {
    const traits = ['estrus', 'mastitis_risk', 'heat_stress', 'calving_imminent'];
    return traits.map(t => {
      const ms = models.filter(m => m.trait === t && m.metrics?.roc_auc != null);
      const best = ms.sort((a, b) => (b.metrics.roc_auc || 0) - (a.metrics.roc_auc || 0))[0];
      return { trait: t, model: best };
    }).filter(x => x.model);
  }, [models]);

  const nodeById = (id: string) => MAP_NODES.find(n => n.id === id)!;

  return (
    <div className="cc-root">

      {/* ============ LAYER 1 — COMMAND CENTER ============ */}
      <section className="cc-map-shell">
        <div className="cc-map-header">
          <div>
            <h2 className="page-title" style={{ marginBottom: '0.15rem' }}>Farm Command</h2>
            <p className="page-subtitle" style={{ margin: 0 }}>Live system map · sensor mesh · inference core</p>
          </div>
          <div className="cc-map-readouts">
            <div className="cc-readout">
              <span className="cc-readout-label">HERD</span>
              <span className="cc-readout-value">{cows.length || '—'}</span>
              <span className="cc-readout-unit">head</span>
            </div>
            <div className="cc-readout">
              <span className="cc-readout-label">AVG YIELD</span>
              <span className="cc-readout-value">{herdYield}</span>
              <span className="cc-readout-unit">L/day</span>
            </div>
            <div className="cc-readout">
              <span className="cc-readout-label">FEED EFF</span>
              <span className="cc-readout-value">1.34</span>
              <span className="cc-readout-unit">FCR</span>
            </div>
            <div className="cc-readout">
              <span className="cc-readout-label">BARN THI</span>
              <span className="cc-readout-value cc-warm">78.2</span>
              <span className="cc-readout-unit">index</span>
            </div>
            <div className="cc-readout">
              <span className="cc-readout-label">ALERTS</span>
              <span className="cc-readout-value" style={{ color: openAlerts.length ? 'var(--status-mastitis)' : 'var(--status-healthy)' }}>
                {openAlerts.length}
              </span>
              <span className="cc-readout-unit">open</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onRefresh} style={{ alignSelf: 'center' }}>⟳ Sync</button>
          </div>
        </div>

        <div className="cc-map-stage">
          <svg viewBox="0 0 1000 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="cc-node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
            </defs>

            {/* perspective grid floor */}
            <g opacity="0.16">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <line key={`h${i}`} x1="0" y1={60 + i * 56} x2="1000" y2={60 + i * 56} stroke="#38bdf8" strokeWidth="0.5" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <line key={`v${i}`} x1={i * 100} y1="40" x2={i * 100} y2="340" stroke="#38bdf8" strokeWidth="0.5" />
              ))}
            </g>

            {/* energy flow links */}
            {MAP_LINKS.map(([a, b], i) => {
              const na = nodeById(a); const nb = nodeById(b);
              return (
                <g key={`${a}-${b}`}>
                  <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(56,189,248,0.18)" strokeWidth="1.5" />
                  <line
                    className="cc-flow"
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke={NODE_TONE[na.tone]} strokeWidth="1.5"
                    strokeDasharray="4 14"
                    style={{ animationDelay: `${i * 0.45}s` }}
                    opacity="0.8"
                  />
                </g>
              );
            })}

            {/* nodes */}
            {MAP_NODES.map(n => {
              const tone = NODE_TONE[n.tone];
              const hot = n.id === 'barn_a' && openAlerts.length > 0;
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={n.r + 16} fill="url(#cc-node-glow)" />
                  <circle className="cc-pulse" cx={n.x} cy={n.y} r={n.r} fill="none" stroke={tone} strokeWidth="1" opacity="0.5" />
                  <circle cx={n.x} cy={n.y} r={n.r * 0.62} fill="rgba(8,12,24,0.85)" stroke={tone} strokeWidth="1.4" />
                  <circle className="cc-core-dot" cx={n.x} cy={n.y} r="3.5" fill={hot ? '#ef4444' : tone} />
                  {/* wireframe ticks */}
                  {[0, 60, 120, 180, 240, 300].map(deg => {
                    const rad = (deg * Math.PI) / 180;
                    return (
                      <line key={deg}
                        x1={n.x + Math.cos(rad) * n.r * 0.62} y1={n.y + Math.sin(rad) * n.r * 0.62}
                        x2={n.x + Math.cos(rad) * n.r * 0.86} y2={n.y + Math.sin(rad) * n.r * 0.86}
                        stroke={tone} strokeWidth="1" opacity="0.55" />
                    );
                  })}
                  <text x={n.x} y={n.y + n.r + 18} textAnchor="middle" className="cc-node-label">{n.label}</text>
                  <text x={n.x} y={n.y + n.r + 31} textAnchor="middle" className="cc-node-sub">{n.sub}</text>
                </g>
              );
            })}
          </svg>

          <div className="cc-map-corner">
            <span className="cc-mono">SYS {clock ?? '--:--:--'}</span>
            <span className="cc-mono" style={{ color: 'var(--status-healthy)' }}>● MESH ONLINE</span>
            <span className="cc-mono">UPLINK 15-MIN WINDOWS</span>
          </div>
        </div>
      </section>

      {/* ============ LAYER 2 — GLASS OPERATIONAL FEED ============ */}
      <section className="cc-glass-row">
        {feedItems.map((item, i) => (
          <article key={i} className={`cc-glass-card cc-tone-${item.tone}`}>
            <header className="cc-glass-head">
              <span className={`cc-tag cc-tag-${item.tone}`}>{item.tag}</span>
              <span className="cc-glass-meta">{item.meta}</span>
            </header>
            <p className="cc-glass-text">{item.text}</p>
          </article>
        ))}
      </section>

      {/* ============ LAYER 3 — ANALYTICAL TERMINAL ============ */}
      <section className="cc-terminal">
        <header className="cc-term-header">
          <span className="cc-term-title">▣ HERD TELEMETRY — LIVE WINDOW</span>
          <span className="cc-mono" style={{ color: 'var(--text-muted)' }}>
            rows: {cows.length} · sampling: 15 min · split: leave-cow-out
          </span>
        </header>

        <div className="cc-term-grid">
          {/* telemetry table */}
          <div className="cc-term-pane" style={{ overflowX: 'auto' }}>
            <table className="cc-term-table">
              <thead>
                <tr>
                  <th>ID</th><th>TEMP °C</th><th>YIELD L/d</th><th>HYDR</th><th>FCR</th><th>24H ACTIVITY</th><th>STATE</th>
                </tr>
              </thead>
              <tbody>
                {cows.slice(0, 9).map(c => {
                  const t = telemetryFor(c.cow_id, alerts);
                  const disturbed = !!t.trait;
                  const tempHot = parseFloat(t.temp) >= 39.0;
                  return (
                    <tr
                      key={c.cow_id}
                      className={focusCow === c.cow_id ? 'cc-row-focus' : ''}
                      onClick={() => setFocusCow(c.cow_id === focusCow ? null : c.cow_id)}
                    >
                      <td className="cc-cell-id">{shortId(c.cow_id)}</td>
                      <td style={{ color: tempHot ? '#f87171' : undefined }}>{t.temp}</td>
                      <td>{t.yieldL}</td>
                      <td>{t.hydration}</td>
                      <td>{t.fcr}</td>
                      <td>
                        <svg width="92" height="22" viewBox="0 0 92 22">
                          <path d={sparkPath(c.cow_id, 92, 22, disturbed)} fill="none"
                            stroke={disturbed ? '#fbbf24' : '#34d399'} strokeWidth="1.4" />
                        </svg>
                      </td>
                      <td>
                        {t.trait
                          ? <span className="cc-state cc-state-warn">{TRAIT_LABEL[t.trait]} {t.risk}%</span>
                          : <span className="cc-state cc-state-ok">NOMINAL</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* anomaly log + model outputs */}
          <div className="cc-term-side">
            <div className="cc-term-pane">
              <div className="cc-term-pane-title">ANOMALY LOG</div>
              <div className="cc-log">
                {openAlerts.slice(0, 6).map(a => (
                  <div key={a.id} className="cc-log-line">
                    <span className="cc-log-time">
                      {new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="cc-log-sev">{a.risk_score >= 0.8 ? 'HIGH' : 'MED '}</span>
                    <span>
                      {shortId(a.cow)} {TRAIT_LABEL[a.trait] || a.trait} p={a.risk_score.toFixed(2)}
                    </span>
                  </div>
                ))}
                {openAlerts.length === 0 && (
                  <div className="cc-log-line"><span className="cc-log-time">--:--</span><span style={{ color: 'var(--status-healthy)' }}>no open anomalies in current window</span></div>
                )}
              </div>
            </div>

            <div className="cc-term-pane">
              <div className="cc-term-pane-title">PREDICTIVE HEALTH MODELS</div>
              <div className="cc-log">
                {traitModels.map(({ trait, model }) => (
                  <div key={trait} className="cc-log-line">
                    <span style={{ minWidth: '88px', color: '#7dd3fc' }}>{TRAIT_LABEL[trait]}</span>
                    <span className="cc-bar-track">
                      <span className="cc-bar-fill" style={{ width: `${Math.round((model.metrics.roc_auc || 0) * 100)}%` }} />
                    </span>
                    <span style={{ color: '#34d399' }}>AUC {(model.metrics.roc_auc || 0).toFixed(2)}</span>
                  </div>
                ))}
                {traitModels.length === 0 && (
                  <div className="cc-log-line"><span style={{ color: 'var(--text-muted)' }}>no trained models in registry — run the pipeline</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="cc-term-footer cc-mono">
          <span>SHAP explainers loaded · alerts always carry attribution</span>
          <span>{focusCow ? `focus: ${shortId(focusCow)} — open Alert Feed for full explanation` : 'select a row to focus an animal'}</span>
        </footer>
      </section>
    </div>
  );
}
