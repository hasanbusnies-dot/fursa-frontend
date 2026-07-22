'use client';

import { useState } from 'react';
import {
  PANEL_LABELS, STATUS_COLORS, STATUS_LABELS, DAMAGE_STATUSES,
  type DamageStatus,
} from './wizard/schema';

/**
 * Damage & paint diagram: the founder's car artwork
 * (public/car-damage-base.png, 500×520 transparent PNG) as the base layer,
 * with one traced <path> per panel on top. Each path is both the tap target
 * and the color fill — tinting with mix-blend-mode:multiply keeps the
 * artwork's shading and seams visible through the color.
 *
 * One component, two modes: pass `onPanelClick` for the add-listing editor
 * (tap cycles the status), omit it for the read-only listing-detail view
 * (tap/hover just reveals the status line — touch devices have no hover).
 *
 * PANEL_PATHS was traced from the artwork's own pixels, not by eye: the art
 * uses distinct gray levels, so thresholding at the panel-face gray isolates
 * exactly the paintable sheet metal (wheels, glass and the body outline are
 * lighter and fall out automatically), and each connected region became one
 * path — hence the exact alignment. The two side strips' doors share an outer
 * edge in the art and were split along their measured diagonal seam.
 *
 * ⚠ The paths are absolute coordinates in the image's own 500×520 pixel grid.
 * Re-cropping, re-scaling or re-exporting car-damage-base.png at a different
 * framing invalidates every path — replace the art only with a pixel-identical
 * framing, or re-run the trace.
 *
 * Only 13 of the 15 reportable panels are drawable: the artwork has no rocker
 * (عتبة) pieces, so those two stay list-only in Step3DamageReport. All 15 keys
 * remain in the data model and wire format.
 */

const PANEL_PATHS: Record<string, string> = {
  frontBumper:      'M 194 41 L 192 43 L 192 65 L 195 68 L 320 68 L 324 64 L 324 44 L 322 41 Z',
  hood:             'M 236 81 L 201 89 L 195 95 L 189 144 L 188 180 L 326 180 L 326 149 L 321 95 L 314 88 L 286 81 Z',
  leftFrontFender:  'M 92 84 L 88 88 L 88 113 L 101 116 L 110 121 L 121 137 L 123 137 L 124 93 L 111 88 L 110 84 Z',
  rightFrontFender: 'M 405 84 L 404 88 L 389 93 L 390 137 L 393 137 L 406 120 L 425 114 L 425 88 L 423 84 Z',
  frontLeftDoor:    'M 122 156 L 118 166 L 112 173 L 102 179 L 88 183 L 88 258 L 147 271 L 183 272 L 183 275 L 171 276 L 186 279 L 188 279 L 183 251 L 172 220 L 161 198 L 146 176 L 126 156 Z',
  frontRightDoor:   'M 389 156 L 367 178 L 349 206 L 333 244 L 325 281 L 326 281 L 349 275 L 332 274 L 333 269 L 376 268 L 425 255 L 425 182 L 409 178 L 403 174 L 396 165 L 393 156 Z',
  roofPanel:        'M 212 280 L 212 346 L 303 346 L 303 280 Z',
  rearLeftDoor:     'M 88 259 L 88 265 L 90 266 L 88 268 L 88 339 L 101 342 L 110 347 L 118 356 L 123 372 L 126 372 L 187 348 L 188 280 L 89 259 Z',
  rearRightDoor:    'M 423 256 L 325 282 L 326 347 L 387 372 L 392 372 L 395 359 L 400 351 L 411 343 L 425 339 L 425 268 L 416 267 L 425 265 L 425 256 Z',
  leftRearFender:   'M 121 386 L 118 393 L 108 403 L 88 410 L 88 435 L 93 437 L 96 442 L 110 442 L 115 437 L 124 434 L 124 386 Z',
  rightRearFender:  'M 389 386 L 389 434 L 399 437 L 405 442 L 419 442 L 425 436 L 425 409 L 406 402 L 392 386 Z',
  trunk:            'M 195 407 L 192 415 L 192 432 L 213 440 L 249 444 L 266 444 L 301 440 L 322 432 L 323 422 L 319 407 Z',
  rearBumper:       'M 195 460 L 192 463 L 192 484 L 194 487 L 322 487 L 324 484 L 324 463 L 321 460 Z',
};

export const DIAGRAM_PANEL_KEYS = Object.keys(PANEL_PATHS);

interface Props {
  report: Record<string, { status: DamageStatus }>;
  onPanelClick?: (key: string) => void;
}

export function CarDamageDiagram({ report, onPanelClick }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const interactive = !!onPanelClick;

  const statusOf = (key: string): DamageStatus => report[key]?.status ?? 'ORIGINAL';

  return (
    <div className="flex flex-col items-center gap-2 select-none w-full">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">▲ أمام</span>

      <svg viewBox="0 0 500 520" className="w-full max-w-[300px]">
        <image href="/car-damage-base.png" x="0" y="0" width="500" height="520" />

        {DIAGRAM_PANEL_KEYS.map((key) => {
          const status = statusOf(key);
          const isActive = active === key;
          return (
            <path
              key={key}
              d={PANEL_PATHS[key]}
              fill={status === 'ORIGINAL' ? 'transparent' : STATUS_COLORS[status].fill}
              fillOpacity={status === 'ORIGINAL' ? 0 : 0.55}
              stroke={isActive ? '#2563eb' : 'transparent'}
              // Transparent stroke widens the touch target beyond the fill;
              // pointer-events:all keeps unpainted panels tappable.
              strokeWidth={isActive ? 3 : 8}
              style={{ mixBlendMode: 'multiply', pointerEvents: 'all' }}
              className={interactive ? 'cursor-pointer' : undefined}
              onMouseEnter={() => setActive(key)}
              onMouseLeave={() => setActive(null)}
              onClick={() => (onPanelClick ? onPanelClick(key) : setActive(key))}
            >
              <title>{`${PANEL_LABELS[key]} — ${STATUS_LABELS[status]}`}</title>
            </path>
          );
        })}
      </svg>

      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">▼ خلف</span>

      {/* Status readout — the diagram itself carries no labels (see report) */}
      <div className="h-7 flex items-center justify-center">
        {active ? (
          <span className="text-xs text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
            <strong>{PANEL_LABELS[active] ?? active}</strong>
            {' — '}
            {STATUS_LABELS[statusOf(active)]}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">
            {interactive ? 'انقر على قطعة لتغيير حالتها' : 'مرّر على قطعة لمعرفة حالتها'}
          </span>
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
