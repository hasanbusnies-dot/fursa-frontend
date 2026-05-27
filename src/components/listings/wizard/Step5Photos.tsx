import { ImagesStep } from '@/components/listings/steps/ImagesStep';

interface Props {
  photos: File[];
  onChange: (files: File[]) => void;
}

export function Step5Photos({ photos, onChange }: Props) {
  return <ImagesStep images={photos} onChange={onChange} />;
}
