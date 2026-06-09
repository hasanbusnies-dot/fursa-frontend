'use client';

import { useParams, useRouter } from 'next/navigation';
import { CreateListingForm } from '@/components/listings/CreateListingForm';
import { agentStoresService } from '@/services/stores.service';
import type { CreateListingPayload } from '@/services/listings.service';
import { ApiError } from '@/services/api';

// Reuses the full consumer listing wizard, but retargets the submit to the
// store-scoped endpoint (POST /agent/stores/:id/listings). The listing is owned by
// the store owner; the owner's cap applies (member-active ⇒ unlimited, else 403).

export default function AgentStoreAddListingPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const createListing = async (payload: CreateListingPayload) => {
    try {
      return await agentStoresService.createListing(id, payload);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Owner hit the free cap (3) and isn't member-active.
        throw new Error('تم بلوغ الحد، فعّل الاشتراك للإعلانات غير المحدودة.');
      }
      throw err;
    }
  };

  return (
    <CreateListingForm
      createListing={createListing}
      successMessage="تم إنشاء الإعلان، بانتظار المراجعة."
      onSuccess={() => router.push(`/agent/stores/${id}`)}
    />
  );
}
