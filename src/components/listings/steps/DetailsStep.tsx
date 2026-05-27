import type { UseFormReturn } from 'react-hook-form';
import type { ListingFormData } from '@/components/listings/CreateListingForm';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormError } from '@/components/ui/FormError';
import { CATEGORY_ATTRIBUTES } from '@/lib/listing-attributes';
import { cn } from '@/lib/utils';

const CITIES = [
  'Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama',
  'Deir ez-Zor', 'Raqqa', 'Al-Hasakah', 'Daraa',
  'As-Suwayda', 'Idlib', 'Tartus', 'Quneitra',
];

interface DetailsStepProps {
  form: UseFormReturn<ListingFormData>;
  categorySlug: string;
  attributes: Record<string, string>;
  onAttributeChange: (key: string, value: string) => void;
}

export function DetailsStep({ form, categorySlug, attributes, onAttributeChange }: DetailsStepProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const currency = watch('currency');
  const attrConfig = CATEGORY_ATTRIBUTES[categorySlug];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Listing Details</h2>
        <p className="text-sm text-gray-500">Fill in the details to help buyers find your listing.</p>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title" required>Title</Label>
        <Input
          id="title"
          placeholder="e.g. Toyota Corolla 2020 – Excellent Condition"
          error={!!errors.title}
          {...register('title')}
        />
        <FormError message={errors.title?.message} />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" required>Description</Label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe your item in detail — condition, features, reason for selling..."
          className={cn(
            'block w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-gray-900',
            'placeholder:text-gray-400 transition-colors resize-none',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            errors.description
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100'
          )}
          {...register('description')}
        />
        <FormError message={errors.description?.message} />
      </div>

      {/* Price + Currency */}
      <div>
        <Label required>Price</Label>
        <div className="flex gap-2">
          {/* Currency toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
            {(['SYP', 'USD'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('currency', c)}
                className={cn(
                  'px-4 py-2.5 text-sm font-semibold transition-colors',
                  currency === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Price input */}
          <div className="flex-1">
            <Input
              id="price"
              type="number"
              min={0}
              step="any"
              placeholder="0"
              error={!!errors.price}
              {...register('price', { valueAsNumber: true })}
            />
          </div>
        </div>
        <FormError message={errors.price?.message} />
      </div>

      {/* City */}
      <div>
        <Label htmlFor="city" required>City</Label>
        <select
          id="city"
          className={cn(
            'block w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-gray-900',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            errors.city
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100'
          )}
          {...register('city')}
        >
          <option value="">Select a city</option>
          {CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <FormError message={errors.city?.message} />
      </div>

      {/* ── Dynamic category attributes ── */}
      {attrConfig && (
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {attrConfig.sectionLabel}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attrConfig.fields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={`attr-${field.key}`}>{field.label}</Label>
                {field.type === 'select' ? (
                  <select
                    id={`attr-${field.key}`}
                    value={attributes[field.key] ?? ''}
                    onChange={(e) => onAttributeChange(field.key, e.target.value)}
                    className="block w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select…</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`attr-${field.key}`}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={attributes[field.key] ?? ''}
                    onChange={(e) => onAttributeChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
