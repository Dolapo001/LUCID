'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export default function Sparkline({ data, width = 88, height = 26, color = '#45c8e0', fill = false }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg className="spark-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {fill && <path d={area} fill={color} opacity={0.1} />}
      <path d={line} stroke={color} strokeWidth={1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={1.8} fill={color} />
    </svg>
  );
}
