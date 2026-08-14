import { RecentAds } from '@/components/listings/RecentAds';
import { HomeCategorySidebar } from '@/components/categories/HomeCategorySidebar';
import { MobileCategoryList } from '@/components/categories/MobileCategoryList';
import { HeroSection } from '@/components/home/HeroSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* ── Main layout: sidebar + feed ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-5">
        <div className="flex gap-6 items-start">

          {/* Left sidebar — hidden on mobile, visible lg+.
              Deliberately NOT sticky and NOT height-capped: the category list renders
              at its full natural height and the PAGE scroll reveals it. It used to be
              `sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto`, which pinned it
              to the viewport and gave it a second scrollbar of its own — so reaching
              the last categories meant scrolling inside the box. `items-start` on the
              flex row above keeps it at its own height instead of stretching to the
              feed's, and both columns now grow with the page. */}
          <aside className="hidden lg:block w-72 shrink-0">
            <HomeCategorySidebar />
          </aside>

          {/* Recent ads feed */}
          <main className="flex-1 min-w-0">
            <MobileCategoryList />
            <RecentAds sectionClassName="pb-8" />
          </main>

        </div>
      </div>
    </>
  );
}
