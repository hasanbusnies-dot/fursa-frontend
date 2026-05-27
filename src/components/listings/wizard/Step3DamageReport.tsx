'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  SVG_PANELS, STATUS_LABELS, STATUS_COLORS, DAMAGE_STATUSES,
  nextDamageStatus,
  type DamageStatus, type DamageReportState,
} from './schema';

interface Props {
  damageReport: DamageReportState;
  onChange: (report: DamageReportState) => void;
}

function cyclePanel(report: DamageReportState, key: string): DamageReportState {
  const current = report[key]?.status ?? 'ORIGINAL';
  return { ...report, [key]: { ...report[key], status: nextDamageStatus(current), detail: report[key]?.detail ?? '' } };
}

function updateDetail(report: DamageReportState, key: string, detail: string): DamageReportState {
  return { ...report, [key]: { ...report[key], status: report[key]?.status ?? 'ORIGINAL', detail } };
}

// ── CSS-grid car map (top-down view, nose at top) ─────────────────────────────
//
// Grid rows:  front-bumper / fenders+hood / windshield / front-doors /
//             rear-doors / rear-window / fenders+trunk / rear-bumper
// Grid cols:  [left side 50px] [center 110px] [right side 50px]
// Bumpers only occupy center column; windshield/rear-window are decorative.
// Rockers are in PanelList only (too thin to show in grid map).

function CarGrid({
  report,
  onPanelClick,
}: {
  report: DamageReportState;
  onPanelClick: (key: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Label lookup — single source of truth is SVG_PANELS in schema.ts
  const labelOf = (key: string) => SVG_PANELS.find((p) => p.key === key)?.label ?? key;

  // Renders a single clickable panel div with damage-state color
  function block(
    key: string,
    gridCol: string,
    gridRow: string,
    opts?: { leftWheel?: boolean; rightWheel?: boolean },
  ) {
    const status = (report[key]?.status ?? 'ORIGINAL') as DamageStatus;
    const colors = STATUS_COLORS[status];
    const isHov  = hovered === key;
    return (
      <div
        key={key}
        onClick={() => onPanelClick(key)}
        onMouseEnter={() => setHovered(key)}
        onMouseLeave={() => setHovered(null)}
        title={labelOf(key)}
        className="cursor-pointer rounded-md flex items-center justify-center text-center leading-tight text-[9px] font-medium text-gray-500 transition-all duration-150 px-0.5"
        style={{
          gridColumn: gridCol,
          gridRow:    gridRow,
          position:   'relative',
          backgroundColor: colors.fill,
          border: `1px solid ${isHov ? '#2563eb' : colors.stroke}`,
          boxShadow:  isHov ? '0 0 0 2px #bfdbfe' : undefined,
        }}
      >
        {opts?.leftWheel && (
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-8 bg-gray-500 rounded-full z-10 pointer-events-none" />
        )}
        {opts?.rightWheel && (
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-8 bg-gray-500 rounded-full z-10 pointer-events-none" />
        )}
        {labelOf(key)}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">▲ أمام</span>

      {/* px-5 gives clearance for the wheel ovals; overflow:visible ensures they aren't clipped */}
      <div className="px-5" style={{ overflow: 'visible' }}>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: '50px 110px 50px',
            gridTemplateRows:    '26px 78px 10px 46px 46px 10px 78px 26px',
            overflow: 'visible',
          }}
        >
          {/* Row 1 – Front bumper (center only) */}
          {block('frontBumper', '2', '1')}

          {/*
            Row 2 – Fenders + Hood.
            RTL context: col '1' = visual RIGHT side, col '3' = visual LEFT side.
            So RIGHT panels go in col '1', LEFT panels go in col '3'.
          */}
          {block('rightFrontFender', '1', '2', { rightWheel: true })}
          {block('hood',             '2', '2')}
          {block('leftFrontFender',  '3', '2', { leftWheel:  true })}

          {/* Row 3 – Windshield strip (decorative, center only) */}
          <div key="ws" className="rounded-sm bg-blue-100" style={{ gridColumn: '2', gridRow: '3' }} />

          {/* Rows 4-5 – Doors (sides) + Roof spans both rows (center) */}
          {block('frontRightDoor', '1', '4')}
          {block('roofPanel',      '2', '4 / 6')}
          {block('frontLeftDoor',  '3', '4')}
          {block('rearRightDoor',  '1', '5')}
          {block('rearLeftDoor',   '3', '5')}

          {/* Row 6 – Rear window strip (decorative, center only) */}
          <div key="rw" className="rounded-sm bg-blue-100" style={{ gridColumn: '2', gridRow: '6' }} />

          {/* Row 7 – Rear fenders + Trunk */}
          {block('rightRearFender', '1', '7', { rightWheel: true })}
          {block('trunk',           '2', '7')}
          {block('leftRearFender',  '3', '7', { leftWheel:  true })}

          {/* Row 8 – Rear bumper (center only) */}
          {block('rearBumper', '2', '8')}
        </div>
      </div>

      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">▼ خلف</span>

      {/* Hover tooltip */}
      <div className="h-7 flex items-center justify-center">
        {hovered ? (
          <span className="text-xs text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
            <strong>{SVG_PANELS.find((p) => p.key === hovered)?.label}</strong>
            {' — '}
            {STATUS_LABELS[report[hovered]?.status ?? 'ORIGINAL']}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">انقر على قطعة لتغيير حالتها</span>
        )}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-1">
        {DAMAGE_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-sm border border-gray-300 shrink-0"
              style={{ backgroundColor: STATUS_COLORS[s].fill }}
            />
            <span className="text-[11px] text-gray-600">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel detail list ─────────────────────────────────────────────────────────

function PanelList({
  report, onCycle, onDetail,
}: {
  report: DamageReportState;
  onCycle: (key: string) => void;
  onDetail: (key: string, detail: string) => void;
}) {
  const sorted = [...SVG_PANELS].sort((a, b) => {
    const sa = report[a.key]?.status ?? 'ORIGINAL';
    const sb = report[b.key]?.status ?? 'ORIGINAL';
    const aOrig = sa === 'ORIGINAL';
    const bOrig = sb === 'ORIGINAL';
    if (aOrig !== bOrig) return aOrig ? 1 : -1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div className="space-y-1.5 overflow-y-auto max-h-[520px] pr-1">
      {sorted.map((panel) => {
        const status = (report[panel.key]?.status ?? 'ORIGINAL') as DamageStatus;
        const detail = report[panel.key]?.detail ?? '';
        const colors = STATUS_COLORS[status];

        return (
          <div
            key={panel.key}
            className={`rounded-lg border p-3 transition-colors ${
              status !== 'ORIGINAL' ? 'border-blue-100 bg-blue-50/40' : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-gray-800 truncate">{panel.label}</span>
              <button
                type="button"
                onClick={() => onCycle(panel.key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:scale-105 ${colors.badge}`}
              >
                {STATUS_LABELS[status]}
              </button>
            </div>
            <input
              type="text"
              value={detail}
              onChange={(e) => onDetail(panel.key, e.target.value)}
              placeholder={status === 'ORIGINAL' ? 'لا توجد ملاحظة' : 'صف الضرر أو الإصلاح…'}
              disabled={status === 'ORIGINAL'}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Step component ────────────────────────────────────────────────────────────

export function Step3DamageReport({ damageReport, onChange }: Props) {
  const modifiedCount = SVG_PANELS.filter(
    (p) => (damageReport[p.key]?.status ?? 'ORIGINAL') !== 'ORIGINAL',
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">تقرير الأضرار والدهان</h2>
        <p className="text-sm text-gray-500 mt-1">
          انقر على أي قطعة في رسم السيارة لتغيير حالتها.
        </p>
      </div>

      {modifiedCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{modifiedCount} قطعة</strong> مُحددة كغير أصلية.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Car grid map column */}
        <div className="w-full lg:w-auto lg:shrink-0 lg:max-w-[280px]">
          <CarGrid
            report={damageReport}
            onPanelClick={(key) => onChange(cyclePanel(damageReport, key))}
          />
        </div>

        {/* Panel detail list column */}
        <div className="flex-1 min-w-0 w-full">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            حالة القطع والملاحظات
          </p>
          <PanelList
            report={damageReport}
            onCycle={(key) => onChange(cyclePanel(damageReport, key))}
            onDetail={(key, detail) => onChange(updateDetail(damageReport, key, detail))}
          />
        </div>
      </div>
    </div>
  );
}
