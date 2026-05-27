import type { Metadata } from 'next';
import { CreateListingForm } from '@/components/listings/CreateListingForm';

export const metadata: Metadata = { title: 'أضف إعلان جديد' };

export default function CreateListingPage() {
  return <CreateListingForm />;
}
