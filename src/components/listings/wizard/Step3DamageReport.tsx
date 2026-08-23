'use client';

import { Info } from 'lucide-react';
import { CarDamageDiagram } from '../CarDamageDiagram';
import {
  SVG_PANELS, STATUS_LABELS, STATUS_COLORS,
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
              className="w-full px-2.5 py-1.5 text-[16px] border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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
        {/* Car diagram column */}
        <div className="w-full lg:w-auto lg:shrink-0 lg:max-w-[280px]">
          <CarDamageDiagram
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
