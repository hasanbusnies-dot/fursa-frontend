import { api } from './api';
import type { ApiResponse, Listing, User } from '@/types';

interface QuestionProfile {
  firstName: string;
  lastName: string;
}

export interface QuestionAsker {
  id?: string;
  email?: string;
  /** New backend relation name */
  individualProfile?: QuestionProfile;
  /** Legacy fallback */
  profile?: QuestionProfile;
}

export interface Question {
  id: string;
  /** Backend now returns the text as `question`; `content` kept for backward compat */
  question?: string;
  content?: string;
  answer?: string | null;
  askedById?: string;
  /** New backend relation name (was `askedBy`) */
  asker?: QuestionAsker;
  /** Legacy fallback */
  askedBy?: User;
  listingId: string;
  listing?: Listing;
  createdAt: string;
  answeredAt?: string | null;
}

/** Resolve question text regardless of which field name the backend used */
export function questionText(q: Question): string {
  return q.question ?? q.content ?? '';
}

/** Resolve asker display name with full fallback chain */
export function askerName(q: Question): string {
  const prof = q.asker?.individualProfile ?? q.asker?.profile ?? q.askedBy?.profile;
  if (prof?.firstName) return `${prof.firstName} ${prof.lastName ?? ''}`.trim();
  return q.asker?.email ?? q.askedBy?.email ?? 'مستخدم';
}

/** Privacy-safe asker name: "Ahmad M." */
export function maskedAskerName(q: Question): string {
  const prof = q.asker?.individualProfile ?? q.asker?.profile ?? q.askedBy?.profile;
  if (prof?.firstName) {
    return `${prof.firstName} ${(prof.lastName ?? '').charAt(0)}.`.trimEnd();
  }
  return q.asker?.email?.split('@')[0] ?? q.askedBy?.email?.split('@')[0] ?? 'مستخدم';
}

/** Asker avatar initials */
export function askerInitials(q: Question): string {
  const prof = q.asker?.individualProfile ?? q.asker?.profile ?? q.askedBy?.profile;
  if (prof?.firstName) {
    return `${prof.firstName[0] ?? ''}${(prof.lastName ?? '')[0] ?? ''}`.toUpperCase() || '؟';
  }
  const email = q.asker?.email ?? q.askedBy?.email;
  return (email?.[0] ?? '؟').toUpperCase();
}

function toList(raw: unknown): Question[] {
  if (Array.isArray(raw)) return raw as Question[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions as Question[];
    if (Array.isArray(obj.data))      return obj.data      as Question[];
  }
  return [];
}

export const qaService = {
  // Returns questions split by the backend into incoming (received) and outgoing (asked)
  getMyQuestions: async (): Promise<{ incoming: Question[]; outgoing: Question[] }> => {
    const res = await api.get<ApiResponse<Record<string, unknown>>>('/questions/me');
    const raw = res.data as Record<string, unknown> | undefined;
    return {
      incoming: Array.isArray(raw?.incoming) ? (raw!.incoming as Question[]) : [],
      outgoing: Array.isArray(raw?.outgoing) ? (raw!.outgoing as Question[]) : [],
    };
  },

  // Public questions for a specific listing (visible to all)
  getForListing: async (listingId: string): Promise<Question[]> => {
    try {
      const res = await api.get<ApiResponse<unknown>>(`/listings/${listingId}/questions`);
      return toList(res.data);
    } catch {
      const res = await api.get<ApiResponse<unknown>>(`/questions?listingId=${listingId}`);
      return toList(res.data);
    }
  },

  // Ask a question — backend request field is "question"; normalise response
  askQuestion: async (listingId: string, content: string): Promise<Question> => {
    const res = await api.post<ApiResponse<Record<string, unknown>>>(
      '/questions',
      { listingId, question: content },
    );
    const raw = (res.data ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      // Ensure both aliases are populated so rendering helpers always find text
      question: (raw.question ?? raw.content ?? content) as string,
      content:  (raw.content  ?? raw.question ?? content) as string,
    } as Question;
  },

  // Answer a received question via PATCH
  answer: async (questionId: string, answer: string): Promise<Question> => {
    const res = await api.patch<ApiResponse<Question>>(
      `/questions/${questionId}/answer`,
      { answer },
    );
    return res.data;
  },
};
