'use client';

import { COWS, ANOMALY_LOG, TELEMETRY_TAIL } from '@/lib/data';
import Sparkline from './Sparkline';

const STATE_CLASS = { OPEN: 't-red', ACK: 't-amber', CLEARED: 't-dim' } as const;

interface TerminalProps {
  focusEntity: string | null;            // cow id carried in from the glass layer
  onFocusEntity: (id: string | null) => void;
  compact?: boolean;                     // strip mode for the hybrid landing screen
}

export default function Terminal({ focusEntity, onFocusEntity, compact = false }: TerminalProps) {
  const focusCow = COWS.find(c => c.id === focusEntity) ?? null;

  return (
    <div>
      {/* ── Herd telemetry table ── */}
      <div className="term">
        <div className="term-head">
          <b>lucid://telemetry/herd</b>
          <span>SAMPLING 60s · 14 STREAMS</span>
          {focusEntity && (
            <span style={{ marginLeft: 'auto' }}>
              FILTER <b>{focusEntity}</b>{' '}
              <button
                onClick={() => onFocusEntity(null)}
                className="mono"
                style={{ background: 'none', border: 'none', color: 'var(--term-red)', cursor: 'pointer', fontSize: '0.62rem' }}
              >
                [clear]
              </button>
            </span>
          )}
        </div>
        <div className="term-body" style={{ overflowX: 'auto' }}>
          <table className="term-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>BARN</th>
                <th>TEMP °C</th>
                <th>24H</th>
                <th>YIELD L/D</th>
                <th>14D</th>
                <th>HYDR</th>
                <th>FCR</th>
                <th>RUM MIN/D</th>
                <th>MODEL OUTPUT</th>
                <th>STATE</th>
              </tr>
            </thead>
            <tbody>
              {COWS.map(cow => {
                const focused = cow.id === focusEntity;
                return (
                  <tr
                    key={cow.id}
                    className={`selectable ${focused ? 'row-focus' : ''}`}
                    onClick={() => onFocusEntity(focused ? null : cow.id)}
                  >
                    <td className="t-cyan" style={{ fontWeight: 600 }}>{cow.id}</td>
                    <td className="t-dim">{cow.barn}</td>
                    <td className={cow.temp >= 39.0 ? 't-amber' : undefined}>{cow.temp.toFixed(1)}</td>
                    <td><Sparkline data={cow.tempSeries} width={64} height={14} color={cow.temp >= 39.0 ? '#e0b145' : '#3ce58c'} /></td>
                    <td>{cow.yield.toFixed(1)}</td>
                    <td><Sparkline data={cow.yieldSeries} width={64} height={14} color="#45c8e0" /></td>
                    <td className={cow.hydration < 0.85 ? 't-amber' : undefined}>{cow.hydration.toFixed(2)}</td>
                    <td>{cow.fcr.toFixed(2)}</td>
                    <td>{Math.round(cow.rumination * 10)}</td>
                    <td>
                      {cow.riskModel
                        ? <span className={cow.riskModel.score >= 0.6 ? 't-red' : 't-amber'}>
                            {cow.riskModel.trait.toLowerCase().replace(/[^a-z0-9]+/g, '_')}={cow.riskModel.score.toFixed(2)}
                          </span>
                        : <span className="t-dim">—</span>}
                    </td>
                    <td className={cow.status === 'nominal' ? 't-green' : cow.status === 'watch' ? 't-amber' : 't-red'}>
                      {cow.status.toUpperCase()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!compact && (
        <div className="term-grid">
          {/* ── Anomaly log ── */}
          <div className="term">
            <div className="term-head">
              <b>lucid://anomaly/log</b>
              <span>{ANOMALY_LOG.filter(a => a.state === 'OPEN').length} OPEN · DETECTOR v2.3.1</span>
            </div>
            <div className="term-body" style={{ overflowX: 'auto' }}>
              <table className="term-table">
                <thead>
                  <tr>
                    <th>TS (UTC)</th><th>CODE</th><th>ENTITY</th><th>METRIC</th><th>VALUE</th><th>BASELINE</th><th>σ</th><th>STATE</th>
                  </tr>
                </thead>
                <tbody>
                  {ANOMALY_LOG
                    .filter(a => !focusEntity || a.entity === focusEntity)
                    .map(a => (
                      <tr key={a.code + a.ts}>
                        <td className="t-dim">{a.ts.slice(5, 16).replace('T', ' ')}</td>
                        <td className="t-cyan">{a.code}</td>
                        <td>{a.entity}</td>
                        <td className="t-dim">{a.metric}</td>
                        <td className={a.sigma >= 2 ? 't-amber' : undefined}>{a.value}</td>
                        <td className="t-dim">{a.baseline}</td>
                        <td className={a.sigma >= 3 ? 't-red' : a.sigma >= 2 ? 't-amber' : 't-dim'}>{a.sigma.toFixed(1)}</td>
                        <td className={STATE_CLASS[a.state]}>{a.state}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Prediction detail / model card ── */}
          <div className="term">
            <div className="term-head">
              <b>lucid://model/{focusCow?.riskModel ? 'inference' : 'registry'}</b>
              <span>{focusCow ? `ENTITY ${focusCow.id}` : 'SELECT ROW TO INSPECT'}</span>
            </div>
            <div className="term-body">
              {focusCow?.riskModel ? (
                <>
                  <dl className="term-kv">
                    <dt>target</dt><dd className="t-cyan">{focusCow.riskModel.trait}</dd>
                    <dt>p(event)</dt>
                    <dd className={focusCow.riskModel.score >= 0.6 ? 't-red' : 't-amber'}>
                      {focusCow.riskModel.score.toFixed(3)} @ {focusCow.riskModel.horizon}
                    </dd>
                    <dt>ensemble</dt><dd>gbm_v4 + rf_v2 (stacked)</dd>
                    <dt>features_in</dt><dd>142 / 142 fresh</dd>
                    <dt>last_infer</dt><dd>2026-06-12T06:50:11Z</dd>
                  </dl>
                  <div style={{ borderTop: '1px solid rgba(60,229,140,0.1)', margin: '0.6rem 0', paddingTop: '0.6rem' }}>
                    <p className="t-dim" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', marginBottom: '0.45rem' }}>SHAP ATTRIBUTION</p>
                    {focusCow.riskModel.drivers.map(d => (
                      <div key={d.feature} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', padding: '0.18rem 0' }}>
                        <span className="t-dim">{d.feature}</span>
                        <span className={d.weight >= 0 ? 't-red' : 't-cyan'}>{d.weight >= 0 ? '+' : ''}{d.weight.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : focusCow ? (
                <dl className="term-kv">
                  <dt>entity</dt><dd className="t-cyan">{focusCow.id}</dd>
                  <dt>state</dt><dd className="t-green">no active risk model — all detectors below trigger threshold</dd>
                  <dt>monitors</dt><dd>mastitis · ketosis · estrus · lameness · heat_stress</dd>
                  <dt>last_sweep</dt><dd>2026-06-12T06:50:11Z</dd>
                </dl>
              ) : (
                <dl className="term-kv">
                  <dt>models</dt><dd>5 active · 2 shadow</dd>
                  <dt>mastitis_gbm_v4</dt><dd>AUROC 0.91 · cal 0.97</dd>
                  <dt>estrus_rf_v2</dt><dd>AUROC 0.94 · cal 0.95</dd>
                  <dt>ketosis_gbm_v3</dt><dd>AUROC 0.88 · cal 0.93</dd>
                  <dt>retrained</dt><dd>2026-06-08 (weekly)</dd>
                  <dt>drift</dt><dd className="t-green">PSI 0.04 — within bounds</dd>
                </dl>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Raw telemetry tail ── */}
      <div className="term" style={{ marginTop: '0.9rem' }}>
        <div className="term-head">
          <b>lucid://stream/tail</b>
          <span>RAW SENSOR BUS · UTC+1</span>
        </div>
        <div className="term-stream">
          {TELEMETRY_TAIL.slice(0, compact ? 4 : TELEMETRY_TAIL.length).map((line, i) => (
            <div key={i} className={line.includes('flag=') ? 'flagged' : 'ok'}>{line}</div>
          ))}
          <div className="cursor-blink" />
        </div>
      </div>
    </div>
  );
}
