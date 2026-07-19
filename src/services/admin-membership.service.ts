import { api } from './api';

// ─── Admin membership-plan pricing (GET/PUT /admin/membership-plan) ─────────────
// The single active plan with dual MANUAL prices (SYP + USD) — no FX coupling.
// Money is a STRING end-to-end (wallet contract; backend serializes Decimals via
// planView). Price edits affect the NEXT charge only — historical MembershipCharge
// rows snapshot their amounts and are never recomputed.

export interface MembershipPlan {
  id: string;
  name: string;
  priceUsd: string;        // money-STRING — never coerce to number
  priceSyp: string | null; // null = SYP not payable yet («غير مسعّر»)
  billingPeriodMonths: number;
  isActive: boolean;
}

/** Partial update — send ONLY the changed fields (backend requires ≥ 1). Prices are
 *  plain decimal strings (backend validates ^\d+(\.\d{1,2})?$, > 0, and sanity caps:
 *  priceUsd ≤ 10,000 / priceSyp ≤ 10,000,000). */
export interface UpdateMembershipPlanDto {
  name?: string;
  priceUsd?: string;
  priceSyp?: string;
  billingPeriodMonths?: number;
}

export const adminMembershipService = {
  getPlan: async (): Promise<MembershipPlan> => {
    const res = await api.get<{ data: MembershipPlan }>('/admin/membership-plan');
    return res.data;
  },

  updatePlan: async (dto: UpdateMembershipPlanDto): Promise<MembershipPlan> => {
    const res = await api.put<{ data: MembershipPlan }>('/admin/membership-plan', dto);
    return res.data;
  },
};
