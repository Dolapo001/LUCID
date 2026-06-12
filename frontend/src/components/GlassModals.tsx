'use client';

import { motion } from 'framer-motion';
import { X, TerminalSquare, Stethoscope, FileClock, BrainCircuit } from 'lucide-react';
import { Cow, Kpi } from '@/lib/data';
import Sparkline from './Sparkline';

const STATUS_LABEL = { nominal: 'NOMINAL', watch: 'UNDER WATCH', alert: 'ACTION REQUIRED' } as const;
const CHIP_CLASS = { nominal: 'chip-nominal', watch: 'chip-watch', alert: 'chip-alert' } as const;

function Veil({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="modal-veil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── Animal profile (glass layer for a cow entity) ───────────

export function CowProfileModal({ cow, onClose, onTechnicalView }: {
  cow: Cow;
  onClose: () => void;
  onTechnicalView: (cowId: string) => void;
}) {
  return (
    <Veil onClose={onClose}>
      <div className="modal-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <h2 className="modal-title">Cow {cow.id}</h2>
            <span className={`cow-chip ${CHIP_CLASS[cow.status]}`}>{STATUS_LABEL[cow.status]}</span>
          </div>
          <p className="modal-sub">
            {cow.breed} · {Math.floor(cow.ageMonths / 12)}y {cow.ageMonths % 12}m · {cow.barn} · lactation day {cow.lactationDay}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.55, marginBottom: '1.2rem' }}>
        {cow.statusNote}
      </p>

      <div className="vitals-grid">
        <div className="vital">
          <div className="vital-label">Core temp</div>
          <div className="vital-value" style={{ color: cow.temp >= 39.0 ? 'var(--st-watch)' : 'var(--text-hi)' }}>
            {cow.temp.toFixed(1)}<span className="vital-unit">°C</span>
          </div>
          <Sparkline data={cow.tempSeries} width={96} height={20} color={cow.temp >= 39.0 ? '#e0b145' : '#45c8e0'} />
        </div>
        <div className="vital">
          <div className="vital-label">Milk yield</div>
          <div className="vital-value">{cow.yield.toFixed(1)}<span className="vital-unit">L/day</span></div>
          <Sparkline data={cow.yieldSeries} width={96} height={20} color="#8b6eff" />
        </div>
        <div className="vital">
          <div className="vital-label">Hydration index</div>
          <div className="vital-value" style={{ color: cow.hydration < 0.85 ? 'var(--st-watch)' : 'var(--text-hi)' }}>
            {cow.hydration.toFixed(2)}
          </div>
        </div>
        <div className="vital">
          <div className="vital-label">Feed conversion</div>
          <div className="vital-value">{cow.fcr.toFixed(2)}<span className="vital-unit">kg/L</span></div>
        </div>
        <div className="vital">
          <div className="vital-label">Rumination</div>
          <div className="vital-value">{Math.round(cow.rumination * 10)}<span className="vital-unit">min/d</span></div>
        </div>
      </div>

      {cow.riskModel && (
        <div className="glass-section">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <BrainCircuit size={13} style={{ color: 'var(--accent-violet)' }} />
            Model assessment — {cow.riskModel.trait} · {(cow.riskModel.score * 100).toFixed(0)}% within {cow.riskModel.horizon}
          </h4>
          {cow.riskModel.drivers.map((d, i) => {
            const pos = d.weight >= 0;
            const width = Math.min(100, Math.abs(d.weight) * 160);
            return (
              <div className="driver-row" key={d.feature}>
                <span className="driver-name">{d.feature}</span>
                <div className={`driver-track ${pos ? '' : 'neg'}`}>
                  <motion.div
                    className={pos ? 'driver-fill-pos' : 'driver-fill-neg'}
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    style={{ height: '100%' }}
                  />
                </div>
                <span className="driver-val" style={{ color: pos ? 'var(--st-alert)' : 'var(--accent-cyan)' }}>
                  {pos ? '+' : ''}{d.weight.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-section">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileClock size={13} style={{ color: 'var(--accent-violet)' }} />
          Care &amp; observation log
        </h4>
        {cow.history.map((h, i) => (
          <div className="history-item" key={i}>
            <span className="history-date">{h.date}</span>
            <div>
              <p className="history-text">{h.entry}</p>
              <p className="history-author">— {h.author}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost"><Stethoscope size={14} /> Add health note</button>
        <button className="btn btn-term" onClick={() => onTechnicalView(cow.id)}>
          <TerminalSquare size={14} /> SWITCH TO TECHNICAL VIEW
        </button>
      </div>
    </Veil>
  );
}

// ── KPI drill-down: "explain this" (glass layer) ────────────

export function KpiExplainModal({ kpi, onClose, onTechnicalView }: {
  kpi: Kpi;
  onClose: () => void;
  onTechnicalView: () => void;
}) {
  return (
    <Veil onClose={onClose}>
      <div className="modal-head">
        <div>
          <h2 className="modal-title" style={{ fontSize: '1.1rem' }}>{kpi.label}</h2>
          <p className="modal-sub">
            <span className="mono" style={{ color: 'var(--text-hi)', fontSize: '1.05rem' }}>{kpi.value}</span>
            {' '}{kpi.unit} · {kpi.delta}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      <div style={{ margin: '0.4rem 0 1.2rem' }}>
        <Sparkline data={kpi.series} width={440} height={64} color={kpi.good ? '#3ce58c' : '#e0b145'} fill />
        <p className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-low)', marginTop: 4, letterSpacing: '0.1em' }}>
          TRAILING 14 DAYS
        </p>
      </div>

      <div className="glass-section" style={{ marginTop: 0 }}>
        <h4>What this means</h4>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.65 }}>{kpi.detail}</p>
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-term" onClick={onTechnicalView}>
          <TerminalSquare size={14} /> SWITCH TO TECHNICAL VIEW
        </button>
      </div>
    </Veil>
  );
}
