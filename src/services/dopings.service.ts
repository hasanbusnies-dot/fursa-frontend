import { api } from './api';

export type DopingType =
  | 'HOMEPAGE'
  | 'CATEGORY'
  | 'TOP_OF_SEARCH'
  | 'DETAILED_SEARCH'
  | 'URGENT'
  | 'HIGHLIGHT';

export const dopingsService = {
  apply: (listingId: string, dopingType: DopingType, durationInWeeks: number) =>
    api.post('/dopings/apply', { listingId, dopingType, durationInWeeks }),

  refreshDate: (listingId: string) =>
    api.post('/dopings/refresh-date', { listingId }),
};
