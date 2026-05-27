import { RecentAds } from '@/components/listings/RecentAds';
import { HomeCategorySidebar } from '@/components/categories/HomeCategorySidebar';
import { HeroSection } from '@/components/home/HeroSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* ── Main layout: sidebar + feed ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex gap-6 items-start">

          {/* Left sidebar — hidden on mobile, visible lg+ */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <HomeCategorySidebar />
          </aside>

          {/* Recent ads feed */}
          <main className="flex-1 min-w-0">
            <RecentAds sectionClassName="pb-8" />
          </main>

        </div>
      </div>
    </>
  );
}
