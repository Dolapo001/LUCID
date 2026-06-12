'use client';

import { OPS_FEED, COWS } from '@/lib/data';
import { ListTodo, HeartPulse, ChevronRight } from 'lucide-react';

interface OpsBandProps {
  onSelectCow: (cowId: string) => void;
}

export default function OpsBand({ onSelectCow }: OpsBandProps) {
  const watchlist = COWS.filter(c => c.status !== 'nominal');

  return (
    <div className="ops-grid">
      {/* Operations feed */}
      <div className="glass ops-panel">
        <h3 className="panel-title"><ListTodo size={15} /> Operations feed — today</h3>
        {OPS_FEED.map(ev => (
          <div
            key={ev.id}
            className={`ops-item ${ev.cowId ? 'clickable' : ''}`}
            onClick={ev.cowId ? () => onSelectCow(ev.cowId!) : undefined}
          >
            <span className={`sev-bar sev-${ev.severity}`} />
            <span className="ops-time">{ev.time}</span>
            <span className="ops-text">{ev.text}</span>
            {ev.cowId && <ChevronRight size={14} style={{ color: 'var(--text-low)', marginLeft: 'auto', flexShrink: 0, alignSelf: 'center' }} />}
          </div>
        ))}
      </div>

      {/* Health watchlist */}
      <div className="glass ops-panel">
        <h3 className="panel-title"><HeartPulse size={15} /> Health watchlist</h3>
        {watchlist.map(cow => (
          <div key={cow.id} className="watchlist-row" onClick={() => onSelectCow(cow.id)}>
            <span className={`cow-chip chip-${cow.status}`}>{cow.id}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-hi)', fontWeight: 500 }}>
                {cow.riskModel ? cow.riskModel.trait : 'Observation'}
                {cow.riskModel && (
                  <span className="mono" style={{ color: 'var(--text-low)', fontWeight: 400, marginLeft: 6, fontSize: '0.66rem' }}>
                    p={cow.riskModel.score.toFixed(2)}
                  </span>
                )}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-low)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cow.statusNote}
              </p>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--text-low)', flexShrink: 0 }} />
          </div>
        ))}
        <p style={{ fontSize: '0.68rem', color: 'var(--text-low)', marginTop: '0.8rem', lineHeight: 1.5, padding: '0 0.6rem' }}>
          Remaining 131 head within baseline. Next scheduled review: Thursday 08:30, Unit C (Dr. Adeyemi).
        </p>
      </div>
    </div>
  );
}
