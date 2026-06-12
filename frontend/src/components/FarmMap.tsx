'use client';

import { MAP_NODES, MAP_LINKS, MapNode, CowStatus } from '@/lib/data';
import { Warehouse, Database, Wheat, RadioTower, Droplets } from 'lucide-react';

const STATUS_COLOR: Record<CowStatus, string> = {
  nominal: 'var(--st-nominal)',
  watch: 'var(--st-watch)',
  alert: 'var(--st-alert)',
};

const KIND_ICON = {
  barn: Warehouse,
  storage: Database,
  feed: Wheat,
  sensor: RadioTower,
  water: Droplets,
};

interface FarmMapProps {
  onSelectNode: (node: MapNode) => void;
}

export default function FarmMap({ onSelectNode }: FarmMapProps) {
  const byId = Object.fromEntries(MAP_NODES.map(n => [n.id, n]));

  return (
    <div className="map-wrap">
      <div className="map-grid-bg" />

      <div style={{ position: 'relative', height: 'clamp(340px, 38vw, 460px)' }}>
        {/* connection lines — percentage coordinate space shared with the HTML nodes */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          aria-hidden
        >
          {MAP_LINKS.map(([a, b], i) => {
            const na = byId[a];
            const nb = byId[b];
            const d = `M${na.x},${na.y} L${nb.x},${nb.y}`;
            return (
              <g key={`${a}-${b}`}>
                <path className="flow-line" d={d} vectorEffect="non-scaling-stroke" />
                <path
                  className="flow-pulse"
                  d={d}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: `${(i * 0.7) % 5}s` }}
                />
              </g>
            );
          })}
        </svg>

        {/* nodes */}
        {MAP_NODES.map(node => {
          const Icon = KIND_ICON[node.kind];
          const color = STATUS_COLOR[node.status];
          return (
            <button
              key={node.id}
              className="map-node"
              onClick={() => onSelectNode(node)}
              style={{
                position: 'absolute',
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(6, 7, 11, 0.85)',
                border: `1px solid ${node.status === 'nominal' ? 'rgba(96, 218, 255, 0.28)' : color}`,
                borderRadius: 9,
                padding: '0.5rem 0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                color: 'var(--text-hi)',
                boxShadow:
                  node.status === 'nominal'
                    ? '0 0 16px rgba(96, 218, 255, 0.08)'
                    : `0 0 18px ${color}33`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                zIndex: 2,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translate(-50%, -50%)'; }}
            >
              <span
                className={node.status !== 'nominal' ? 'node-ring' : undefined}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 10px ${color}`,
                  flexShrink: 0,
                }}
              />
              <Icon size={13} style={{ color: 'var(--wire-line-hot)', flexShrink: 0 }} />
              <span style={{ textAlign: 'left' }}>
                <span className="mono" style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {node.label}
                </span>
                <span className="mono" style={{ display: 'block', fontSize: '0.55rem', color: 'var(--text-low)', marginTop: 1 }}>
                  {node.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="map-legend">
        <span><span className="legend-dot" style={{ background: 'var(--st-nominal)' }} />NOMINAL</span>
        <span><span className="legend-dot" style={{ background: 'var(--st-watch)' }} />UNDER WATCH</span>
        <span><span className="legend-dot" style={{ background: 'var(--st-alert)' }} />ACTION REQUIRED</span>
      </div>

      <div className="map-readout">
        <div>HERD <b>134</b> · MILKING <b>122</b></div>
        <div>SENSOR UPTIME <b>99.2%</b></div>
        <div>LAST SYNC <b>00:00:06</b> AGO</div>
      </div>
    </div>
  );
}
