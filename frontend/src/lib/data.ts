// ─────────────────────────────────────────────────────────────
// LUCID — operational dataset
// Every entity here exists in all three layers:
//   wireframe node → glass profile → terminal telemetry stream
// ─────────────────────────────────────────────────────────────

export type CowStatus = 'nominal' | 'watch' | 'alert';

export interface Cow {
  id: string;            // e.g. "B-17"
  barn: string;          // "Barn A" | "Barn B" | "Unit C"
  breed: string;
  ageMonths: number;
  lactationDay: number;
  status: CowStatus;
  statusNote: string;
  temp: number;          // °C
  yield: number;         // L/day
  hydration: number;     // 0–1 index
  fcr: number;           // feed conversion ratio
  rumination: number;    // min/day ÷ 10
  tempSeries: number[];  // last 24h, hourly
  yieldSeries: number[]; // last 14 days
  riskModel: {
    trait: string;
    score: number;
    horizon: string;
    drivers: { feature: string; weight: number }[];
  } | null;
  history: { date: string; entry: string; author: string }[];
}

export const COWS: Cow[] = [
  {
    id: 'B-17',
    barn: 'Barn A',
    breed: 'Holstein-Friesian',
    ageMonths: 47,
    lactationDay: 122,
    status: 'watch',
    statusNote: 'Mild temperature variance detected over 6 hours',
    temp: 39.1,
    yield: 21.8,
    hydration: 0.81,
    fcr: 1.42,
    rumination: 41.2,
    tempSeries: [38.5, 38.5, 38.6, 38.6, 38.5, 38.6, 38.7, 38.7, 38.8, 38.8, 38.9, 38.9, 38.9, 39.0, 39.0, 39.1, 39.0, 39.1, 39.1, 39.2, 39.1, 39.1, 39.1, 39.1],
    yieldSeries: [24.1, 24.3, 24.0, 24.4, 24.2, 23.9, 24.1, 23.7, 23.4, 23.1, 22.8, 22.5, 22.1, 21.8],
    riskModel: {
      trait: 'Subclinical mastitis',
      score: 0.34,
      horizon: '48h',
      drivers: [
        { feature: 'temp_deviation_6h', weight: 0.41 },
        { feature: 'yield_decline_7d', weight: 0.33 },
        { feature: 'rumination_delta', weight: -0.09 },
        { feature: 'conductivity_rf_quarter', weight: 0.22 },
      ],
    },
    history: [
      { date: '2026-06-12 06:14', entry: 'Collar temp trending +0.5°C above 7-day baseline. Auto-flagged for observation.', author: 'system' },
      { date: '2026-06-11 17:40', entry: 'Udder palpation normal, no swelling. Re-check at evening milking.', author: 'J. Okafor (vet tech)' },
      { date: '2026-06-09 08:02', entry: 'Yield down 1.9L vs trailing week. Feed intake normal.', author: 'system' },
      { date: '2026-05-28 09:15', entry: 'Hoof trim completed, rear left. No lameness observed.', author: 'M. Bello' },
    ],
  },
  {
    id: 'A-23',
    barn: 'Barn A',
    breed: 'Holstein-Friesian',
    ageMonths: 38,
    lactationDay: 88,
    status: 'nominal',
    statusNote: 'All telemetry within baseline',
    temp: 38.6,
    yield: 24.3,
    hydration: 0.93,
    fcr: 1.31,
    rumination: 47.8,
    tempSeries: [38.5, 38.6, 38.6, 38.5, 38.6, 38.6, 38.7, 38.6, 38.5, 38.6, 38.6, 38.6, 38.7, 38.6, 38.6, 38.5, 38.6, 38.6, 38.6, 38.7, 38.6, 38.6, 38.6, 38.6],
    yieldSeries: [23.8, 24.0, 24.1, 24.3, 24.2, 24.4, 24.1, 24.3, 24.5, 24.2, 24.4, 24.3, 24.2, 24.3],
    riskModel: null,
    history: [
      { date: '2026-06-10 07:30', entry: 'Routine body condition score: 3.25. Within target for lactation stage.', author: 'J. Okafor (vet tech)' },
      { date: '2026-06-02 14:20', entry: 'Moved to high-yield group, Barn A pen 3.', author: 'M. Bello' },
    ],
  },
  {
    id: 'A-08',
    barn: 'Barn A',
    breed: 'Jersey',
    ageMonths: 52,
    lactationDay: 201,
    status: 'nominal',
    statusNote: 'All telemetry within baseline',
    temp: 38.4,
    yield: 18.9,
    hydration: 0.90,
    fcr: 1.28,
    rumination: 49.1,
    tempSeries: [38.4, 38.4, 38.5, 38.4, 38.3, 38.4, 38.4, 38.5, 38.4, 38.4, 38.4, 38.3, 38.4, 38.4, 38.5, 38.4, 38.4, 38.4, 38.4, 38.5, 38.4, 38.4, 38.4, 38.4],
    yieldSeries: [19.2, 19.0, 19.1, 18.8, 19.0, 18.9, 19.1, 18.8, 18.9, 19.0, 18.8, 18.9, 19.0, 18.9],
    riskModel: null,
    history: [
      { date: '2026-06-08 09:00', entry: 'Late-lactation check. Drying-off projected for week of Jul 20.', author: 'Dr. F. Adeyemi' },
    ],
  },
  {
    id: 'B-04',
    barn: 'Barn B',
    breed: 'Holstein-Friesian',
    ageMonths: 41,
    lactationDay: 64,
    status: 'alert',
    statusNote: 'Activity z-score +3.6 over 14h — estrus probable',
    temp: 38.9,
    yield: 25.1,
    hydration: 0.87,
    fcr: 1.36,
    rumination: 35.6,
    tempSeries: [38.6, 38.6, 38.7, 38.7, 38.8, 38.8, 38.9, 38.9, 38.8, 38.9, 38.9, 39.0, 38.9, 38.9, 38.8, 38.9, 38.9, 38.9, 39.0, 38.9, 38.9, 38.9, 38.9, 38.9],
    yieldSeries: [24.8, 25.0, 24.9, 25.2, 25.0, 25.1, 25.3, 25.0, 25.2, 25.1, 24.9, 25.0, 25.2, 25.1],
    riskModel: {
      trait: 'Estrus onset',
      score: 0.91,
      horizon: '12h',
      drivers: [
        { feature: 'activity_zscore_14h', weight: 0.54 },
        { feature: 'lying_time_decline', weight: 0.27 },
        { feature: 'mounting_events_n', weight: 0.18 },
        { feature: 'temp_deviation_6h', weight: 0.06 },
      ],
    },
    history: [
      { date: '2026-06-12 04:55', entry: 'Step count 2.4× rolling baseline since 15:00 yesterday. Mounting behaviour logged twice on pen camera.', author: 'system' },
      { date: '2026-06-12 06:30', entry: 'Confirmed standing heat at morning check. AI service window opens ~14:00.', author: 'M. Bello' },
    ],
  },
  {
    id: 'B-11',
    barn: 'Barn B',
    breed: 'Brown Swiss',
    ageMonths: 60,
    lactationDay: 154,
    status: 'nominal',
    statusNote: 'All telemetry within baseline',
    temp: 38.5,
    yield: 22.6,
    hydration: 0.91,
    fcr: 1.33,
    rumination: 46.3,
    tempSeries: [38.5, 38.5, 38.4, 38.5, 38.5, 38.6, 38.5, 38.5, 38.4, 38.5, 38.5, 38.5, 38.6, 38.5, 38.5, 38.5, 38.4, 38.5, 38.5, 38.5, 38.6, 38.5, 38.5, 38.5],
    yieldSeries: [22.4, 22.7, 22.5, 22.6, 22.8, 22.5, 22.6, 22.7, 22.4, 22.6, 22.5, 22.7, 22.6, 22.6],
    riskModel: null,
    history: [
      { date: '2026-06-05 10:10', entry: 'Annual vaccination booster administered (clostridial 7-way).', author: 'Dr. F. Adeyemi' },
    ],
  },
  {
    id: 'C-02',
    barn: 'Unit C',
    breed: 'Holstein-Friesian',
    ageMonths: 33,
    lactationDay: 12,
    status: 'watch',
    statusNote: 'Fresh cow — post-calving ketosis monitoring, day 12 of 21',
    temp: 38.7,
    yield: 19.4,
    hydration: 0.84,
    fcr: 1.51,
    rumination: 38.9,
    tempSeries: [38.6, 38.7, 38.7, 38.6, 38.7, 38.8, 38.7, 38.7, 38.6, 38.7, 38.7, 38.8, 38.7, 38.7, 38.7, 38.6, 38.7, 38.7, 38.8, 38.7, 38.7, 38.7, 38.6, 38.7],
    yieldSeries: [12.1, 13.4, 14.8, 15.9, 16.7, 17.2, 17.8, 18.1, 18.5, 18.8, 19.0, 19.1, 19.3, 19.4],
    riskModel: {
      trait: 'Ketosis (post-calving)',
      score: 0.22,
      horizon: '7d',
      drivers: [
        { feature: 'dmi_recovery_slope', weight: -0.31 },
        { feature: 'bcs_loss_rate', weight: 0.28 },
        { feature: 'rumination_recovery', weight: -0.19 },
        { feature: 'milk_fat_protein_ratio', weight: 0.24 },
      ],
    },
    history: [
      { date: '2026-06-11 08:45', entry: 'BHB blood test: 0.9 mmol/L. Below intervention threshold, continue monitoring.', author: 'Dr. F. Adeyemi' },
      { date: '2026-05-31 23:10', entry: 'Calved unassisted, healthy heifer calf 38kg. Placenta passed within 4h.', author: 'night shift' },
    ],
  },
];

// ── Operational feed (glass layer) ──────────────────────────
export interface OpsEvent {
  id: number;
  time: string;
  kind: 'milking' | 'health' | 'feed' | 'schedule' | 'environment';
  text: string;
  cowId?: string;
  severity: 'info' | 'watch' | 'alert';
}

export const OPS_FEED: OpsEvent[] = [
  { id: 1, time: '06:42', kind: 'milking', text: 'Morning milking cycle completed: 92% efficiency across Barn A', severity: 'info' },
  { id: 2, time: '06:14', kind: 'health', text: 'Cow ID B-17: mild temperature variance detected over 6 hours', cowId: 'B-17', severity: 'watch' },
  { id: 3, time: '05:58', kind: 'feed', text: 'Feed batch #44 consumed 8% slower than baseline', severity: 'watch' },
  { id: 4, time: '05:30', kind: 'schedule', text: 'Vet inspection scheduled: Thursday 08:30, Unit C', severity: 'info' },
  { id: 5, time: '04:55', kind: 'health', text: 'Cow ID B-04: sustained activity spike — estrus window flagged for AI service', cowId: 'B-04', severity: 'alert' },
  { id: 6, time: '04:10', kind: 'environment', text: 'Barn B ventilation stepped up to 70% — interior humidity crossed 78%', severity: 'info' },
  { id: 7, time: '03:22', kind: 'milking', text: 'Bulk tank #2 at 4,180L (87% capacity). Collection truck due 11:00.', severity: 'info' },
];

// ── Farm map nodes (command center wireframe) ───────────────
export interface MapNode {
  id: string;
  label: string;
  sub: string;
  x: number;   // 0–100 viewbox coords
  y: number;
  kind: 'barn' | 'storage' | 'feed' | 'sensor' | 'water';
  status: CowStatus;
}

export const MAP_NODES: MapNode[] = [
  { id: 'barn-a', label: 'BARN A', sub: '64 head · milking', x: 22, y: 30, kind: 'barn', status: 'watch' },
  { id: 'barn-b', label: 'BARN B', sub: '58 head · milking', x: 50, y: 18, kind: 'barn', status: 'alert' },
  { id: 'unit-c', label: 'UNIT C', sub: '12 head · fresh/dry', x: 78, y: 32, kind: 'barn', status: 'watch' },
  { id: 'tank-1', label: 'BULK TANK 1', sub: '4,820L · 3.4°C', x: 32, y: 68, kind: 'storage', status: 'nominal' },
  { id: 'tank-2', label: 'BULK TANK 2', sub: '4,180L · 3.6°C', x: 50, y: 76, kind: 'storage', status: 'nominal' },
  { id: 'silo-1', label: 'FEED SILO 1', sub: 'TMR · 71% full', x: 10, y: 56, kind: 'feed', status: 'nominal' },
  { id: 'silo-2', label: 'FEED SILO 2', sub: 'Batch #44 · 38%', x: 66, y: 60, kind: 'feed', status: 'watch' },
  { id: 'env-1', label: 'ENV GRID', sub: '14 sensors · live', x: 88, y: 62, kind: 'sensor', status: 'nominal' },
  { id: 'water', label: 'WATER MAIN', sub: '2.1 bar · 16.4°C', x: 64, y: 86, kind: 'water', status: 'nominal' },
];

export const MAP_LINKS: [string, string][] = [
  ['barn-a', 'tank-1'],
  ['barn-b', 'tank-1'],
  ['barn-b', 'tank-2'],
  ['unit-c', 'tank-2'],
  ['silo-1', 'barn-a'],
  ['silo-2', 'barn-b'],
  ['silo-2', 'unit-c'],
  ['env-1', 'unit-c'],
  ['env-1', 'barn-b'],
  ['water', 'tank-2'],
  ['water', 'silo-2'],
];

// ── Anomaly log (terminal layer) ────────────────────────────
export interface AnomalyRow {
  ts: string;
  code: string;
  entity: string;
  metric: string;
  value: string;
  baseline: string;
  sigma: number;
  state: 'OPEN' | 'ACK' | 'CLEARED';
}

export const ANOMALY_LOG: AnomalyRow[] = [
  { ts: '2026-06-12T06:14:09Z', code: 'TMP-061', entity: 'B-17', metric: 'core_temp_6h_mean', value: '39.1°C', baseline: '38.6°C', sigma: 2.4, state: 'OPEN' },
  { ts: '2026-06-12T04:55:31Z', code: 'ACT-114', entity: 'B-04', metric: 'activity_z_14h', value: '+3.6σ', baseline: '0.0σ', sigma: 3.6, state: 'ACK' },
  { ts: '2026-06-12T03:47:50Z', code: 'FED-029', entity: 'SILO-2', metric: 'consumption_rate', value: '0.92×', baseline: '1.00×', sigma: 1.8, state: 'OPEN' },
  { ts: '2026-06-11T22:08:12Z', code: 'ENV-007', entity: 'BARN-B', metric: 'rel_humidity', value: '78.4%', baseline: '<75%', sigma: 1.2, state: 'CLEARED' },
  { ts: '2026-06-11T15:33:44Z', code: 'YLD-052', entity: 'B-17', metric: 'yield_7d_slope', value: '-0.27 L/d', baseline: '±0.10', sigma: 2.1, state: 'ACK' },
  { ts: '2026-06-10T19:02:27Z', code: 'HYD-013', entity: 'C-02', metric: 'hydration_index', value: '0.84', baseline: '≥0.88', sigma: 1.4, state: 'CLEARED' },
];

// ── KPI summary (command center) ────────────────────────────
export interface Kpi {
  id: string;
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaDir: 'up' | 'down' | 'flat';
  good: boolean;
  series: number[];
  detail: string; // shown in glass drill-down
}

export const KPIS: Kpi[] = [
  {
    id: 'yield',
    label: 'HERD MILK YIELD',
    value: '23.1',
    unit: 'L/head/day',
    delta: '-0.4 vs 7d avg',
    deltaDir: 'down',
    good: false,
    series: [23.6, 23.5, 23.7, 23.4, 23.5, 23.3, 23.4, 23.2, 23.3, 23.1, 23.2, 23.0, 23.1, 23.1],
    detail: 'The 7-day decline is concentrated in Barn A and tracks almost entirely to B-17 (-2.5L over the window) plus two late-lactation animals on planned taper. Excluding those three, barn yield is flat. No ration or weather covariates flagged.',
  },
  {
    id: 'feed',
    label: 'FEED EFFICIENCY',
    value: '1.36',
    unit: 'kg DMI / L',
    delta: '+0.03 vs target',
    deltaDir: 'up',
    good: false,
    series: [1.32, 1.33, 1.32, 1.34, 1.33, 1.35, 1.34, 1.35, 1.36, 1.35, 1.36, 1.37, 1.36, 1.36],
    detail: 'Conversion ratio drifted above the 1.33 target after batch #44 entered rotation on Jun 9. Intake rate at Silo 2 lanes is 8% below baseline — consistent with a palatability issue in the new batch rather than a herd health signal. Forage analysis sample sent Jun 11.',
  },
  {
    id: 'health',
    label: 'ACTIVE HEALTH FLAGS',
    value: '3',
    unit: 'animals under watch',
    delta: '1 new since 06:00',
    deltaDir: 'up',
    good: false,
    series: [2, 2, 1, 1, 2, 2, 2, 3, 2, 2, 3, 3, 2, 3],
    detail: 'B-17 (temperature variance, mastitis model at 0.34), B-04 (estrus — action window, not illness), C-02 (routine fresh-cow ketosis watch, day 12 of 21). No animal currently meets the criteria for vet escalation; B-17 re-check is scheduled at evening milking.',
  },
  {
    id: 'env',
    label: 'BARN ENVIRONMENT',
    value: '21.4',
    unit: '°C · 71% RH avg',
    delta: 'THI 68 — below stress line',
    deltaDir: 'flat',
    good: true,
    series: [20.8, 20.9, 21.0, 21.2, 21.5, 21.8, 21.6, 21.4, 21.3, 21.4, 21.5, 21.4, 21.3, 21.4],
    detail: 'Temperature-humidity index is 68, under the 72 mild-stress threshold. Barn B ventilation stepped to 70% overnight when humidity crossed 78% and has since pulled it back to 74%. Forecast high of 29°C tomorrow — pre-emptive fan schedule already queued.',
  },
];

// ── Raw telemetry tail (terminal footer stream) ─────────────
export const TELEMETRY_TAIL: string[] = [
  '06:51:02 collar/B-17  temp=39.1C act=41 rum=412min/d  flag=TMP-061',
  '06:51:00 collar/A-23  temp=38.6C act=52 rum=478min/d  ok',
  '06:50:58 parlor/lane3 flow=4.2L/min cond=5.1mS sess=AM-0612  ok',
  '06:50:55 env/barn-b   t=21.9C rh=74.2% nh3=8ppm co2=1840ppm  ok',
  '06:50:51 tank/2       vol=4180L t=3.6C agitator=on  ok',
  '06:50:47 collar/B-04  temp=38.9C act=96 rum=356min/d  flag=ACT-114',
  '06:50:44 silo/2       rate=0.92x hopper=38% bridge=no  flag=FED-029',
  '06:50:40 water/main   p=2.1bar t=16.4C flow=31L/min  ok',
];
