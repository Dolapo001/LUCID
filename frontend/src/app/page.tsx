'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hexagon, Radar, Layers, TerminalSquare, TrendingDown, TrendingUp, Minus } from 'lucide-react';

import { COWS, KPIS, Cow, Kpi, MapNode } from '@/lib/data';
import FarmMap from '@/components/FarmMap';
import OpsBand from '@/components/OpsBand';
import Terminal from '@/components/Terminal';
import Sparkline from '@/components/Sparkline';
import { CowProfileModal, KpiExplainModal } from '@/components/GlassModals';

type View = 'command' | 'terminal';

// barn node → representative flagged animal, so map drill-down lands somewhere useful
const NODE_TO_COW: Record<string, string> = {
  'barn-a': 'B-17',
  'barn-b': 'B-04',
  'unit-c': 'C-02',
};

const DELTA_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export default function Lucid() {
  const [view, setView] = useState<View>('command');
  const [openCow, setOpenCow] = useState<Cow | null>(null);
  const [openKpi, setOpenKpi] = useState<Kpi | null>(null);
  const [focusEntity, setFocusEntity] = useState<string | null>(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // context sync: an entity opened in glass carries into the terminal layer
  const goTechnical = (entityId: string | null) => {
    setFocusEntity(entityId);
    setOpenCow(null);
    setOpenKpi(null);
    setView('terminal');
  };

  const selectCow = (cowId: string) => {
    const cow = COWS.find(c => c.id === cowId);
    if (cow) setOpenCow(cow);
  };

  const selectNode = (node: MapNode) => {
    const cowId = NODE_TO_COW[node.id];
    if (cowId) selectCow(cowId);
    else goTechnical(null);
  };

  return (
    <div className="shell">
      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Hexagon size={15} /></div>
          <div>
            <div className="brand-name">LUCID</div>
            <div className="brand-sub">Dairy Intelligence · Site NG-04</div>
          </div>
        </div>

        <div className="layer-switch">
          <button className={`layer-btn ${view === 'command' ? 'active' : ''}`} onClick={() => setView('command')}>
            <Radar size={12} /> COMMAND
          </button>
          <button className={`layer-btn ${view === 'terminal' ? 'active' : ''}`} onClick={() => setView('terminal')}>
            <TerminalSquare size={12} /> TERMINAL
          </button>
        </div>

        <div className="sys-clock">
          <span className="live-dot" />
          <span>LIVE</span>
          <span style={{ color: 'var(--text-low)' }}>{clock || '—'}</span>
        </div>
      </header>

      <main className="main">
        <AnimatePresence mode="wait">
          {view === 'command' ? (
            <motion.div
              key="command"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* ════ Layer 1 — what is happening right now ════ */}
              <section className="band">
                <div className="section-tag"><Radar size={11} /> COMMAND CENTER — LIVE SYSTEM STATE</div>

                <div className="kpi-grid">
                  {KPIS.map(kpi => {
                    const Icon = DELTA_ICON[kpi.deltaDir];
                    return (
                      <div key={kpi.id} className="kpi-card" onClick={() => setOpenKpi(kpi)}>
                        <span className="kpi-hint">EXPLAIN ▸</span>
                        <div className="kpi-label">{kpi.label}</div>
                        <div className="kpi-value-row">
                          <span className="kpi-value">{kpi.value}</span>
                          <span className="kpi-unit">{kpi.unit}</span>
                        </div>
                        <div className={`kpi-delta ${kpi.good ? 'ok' : 'warn'}`}>
                          <Icon size={11} /> {kpi.delta}
                        </div>
                        <div className="kpi-spark">
                          <Sparkline data={kpi.series} color={kpi.good ? '#3ce58c' : '#e0b145'} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <FarmMap onSelectNode={selectNode} />
              </section>

              {/* ════ Layer 2 — what it means ════ */}
              <hr className="fade-divider" />
              <section className="band">
                <div className="section-tag"><Layers size={11} /> OPERATIONS — TODAY&apos;S CONTEXT</div>
                <OpsBand onSelectCow={selectCow} />
              </section>

              {/* ════ Layer 3 — why (compact strip; full view via TERMINAL) ════ */}
              <hr className="fade-divider" />
              <section className="band">
                <div className="section-tag">
                  <TerminalSquare size={11} /> TELEMETRY — RAW SIGNAL
                  <button
                    onClick={() => goTechnical(null)}
                    className="mono"
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--term-green)', fontSize: '0.6rem', letterSpacing: '0.12em',
                    }}
                  >
                    OPEN FULL TERMINAL ▸
                  </button>
                </div>
                <Terminal compact focusEntity={focusEntity} onFocusEntity={setFocusEntity} />
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="section-tag">
                <TerminalSquare size={11} /> EXPERT MODE — DIAGNOSTICS &amp; MODEL INTERNALS
                <button
                  onClick={() => setView('command')}
                  className="mono"
                  style={{
                    marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent-cyan)', fontSize: '0.6rem', letterSpacing: '0.12em',
                  }}
                >
                  ◂ BACK TO COMMAND
                </button>
              </div>
              <Terminal focusEntity={focusEntity} onFocusEntity={setFocusEntity} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Glass drill-down modals (Layer 2) ── */}
      <AnimatePresence>
        {openCow && (
          <CowProfileModal
            key={openCow.id}
            cow={openCow}
            onClose={() => setOpenCow(null)}
            onTechnicalView={goTechnical}
          />
        )}
        {openKpi && (
          <KpiExplainModal
            key={openKpi.id}
            kpi={openKpi}
            onClose={() => setOpenKpi(null)}
            onTechnicalView={() => goTechnical(openKpi.id === 'health' ? 'B-17' : null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
