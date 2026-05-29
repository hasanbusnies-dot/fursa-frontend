'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, PlusCircle, Menu, X, ChevronDown,
  User, LayoutDashboard, MessageSquare, FileText,
  Star, Bookmark, UserCheck, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { messagesService } from '@/services/messages.service';

const CATEGORIES = [
  'كل الفئات',
  'عقارات',
  'مركبات',
  'إلكترونيات',
  'وظائف',
  'خدمات',
  'أثاث',
  'أزياء',
];

export function Header() {
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [category,         setCategory]         = useState('كل الفئات');
  const [unreadCount,      setUnreadCount]      = useState(0);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const [favDropdownOpen,  setFavDropdownOpen]  = useState(false);

  const dropdownRef    = useRef<HTMLDivElement>(null);
  const favDropdownRef = useRef<HTMLDivElement>(null);

  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const displayName = user?.profile?.firstName
    ?? user?.email?.split('@')[0]
    ?? 'Hesabım';

  function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/listings?query=${encodeURIComponent(q)}`);
  }

  function handleLogout() {
    logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('forsa-auth');
      window.location.href = '/';
    }
  }

  useEffect(() => {
    if (pathname !== '/listings') setSearchQuery('');
  }, [pathname]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [dropdownOpen]);

  // Close favorites dropdown on outside click
  useEffect(() => {
    if (!favDropdownOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (favDropdownRef.current && !favDropdownRef.current.contains(e.target as Node)) {
        setFavDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [favDropdownOpen]);

  // Unread messages badge
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }
    function fetchUnread() {
      messagesService.getRooms()
        .then((rooms) => {
          const total = rooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
          setUnreadCount(total);
        })
        .catch(() => {});
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 10_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const closeFavDropdown  = () => setFavDropdownOpen(false);
  const closeUserDropdown = () => setDropdownOpen(false);

  if (['/login', '/register'].includes(pathname)) return null;
  if (pathname.startsWith('/m/')) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Main row ── */}
        <div className="flex items-center gap-3 h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-blue-600">Forsa</span>
            <span className="hidden sm:inline text-xs text-gray-400 font-medium">فرصة</span>
          </Link>

          {/* Desktop search bar */}
          <div className="hidden sm:flex flex-1 items-stretch border border-gray-300 rounded-lg overflow-hidden transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <div className="relative flex-shrink-0">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 pl-3 pr-7 text-sm text-gray-600 bg-gray-50 border-r border-gray-300 cursor-pointer appearance-none focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن أي شيء..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 h-10 px-4 text-sm focus:outline-none bg-white"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 h-10 flex items-center gap-1.5 transition-colors text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              بحث
            </button>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">

            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-1">

                {/* Admin link */}
                {user.userType === 'ADMIN' && (
                  <Link
                    href="/admin/listings"
                    className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors px-2 py-1.5"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                {/* ── Messages icon button ── */}
                <Link
                  href="/messages"
                  className="relative p-2 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-gray-100 transition-colors"
                  title="Mesajlar"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Link>

                {/* ── Favorites icon + dropdown ── */}
                <div className="relative" ref={favDropdownRef}>
                  <button
                    onClick={() => setFavDropdownOpen((o) => !o)}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-0.5 ${
                      favDropdownOpen
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
                    }`}
                    title="Favorilerim"
                  >
                    <Star className="w-5 h-5" />
                    <ChevronDown className={`w-3 h-3 transition-transform ${favDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {favDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        المفضلة
                      </p>
                      <Link
                        href="/account/favorites"
                        onClick={closeFavDropdown}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Star className="w-4 h-4 text-yellow-500 shrink-0" />
                        إعلاناتي المفضلة
                      </Link>
                      <Link
                        href="/account/saved-searches"
                        onClick={closeFavDropdown}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Bookmark className="w-4 h-4 text-orange-400 shrink-0" />
                        بحثي المفضل
                      </Link>
                      <Link
                        href="/account/favorite-sellers"
                        onClick={closeFavDropdown}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                        بائعيّ المفضلون
                      </Link>
                    </div>
                  )}
                </div>

                {/* ── User dropdown ── */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-orange-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span className="max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        href="/account"
                        onClick={closeUserDropdown}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0 text-orange-500" />
                        ملخص حسابي
                      </Link>
                      <div className="my-1 border-t border-gray-100" />
                      <Link
                        href="/account/listings"
                        onClick={closeUserDropdown}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        إعلاناتي
                      </Link>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-gray-100"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-gray-100"
                >
                  إنشاء حساب
                </Link>
              </div>
            )}

            {/* Post Ad CTA — desktop only; mobile uses BottomNav */}
            <Link
              href="/listings/create"
              prefetch={false}
              className="hidden md:flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              أضف إعلان
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="sm:hidden pb-3">
          <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              type="text"
              placeholder="ابحث عن أي شيء..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 h-10 px-4 text-sm focus:outline-none bg-white"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="flex-shrink-0 bg-blue-600 text-white px-4 h-10 flex items-center transition-colors hover:bg-blue-700"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile nav drawer ── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-0.5 shadow-lg">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-100 text-sm text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{displayName}</span>
              </div>

              <Link
                href="/account/listings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                إعلاناتي
              </Link>

              <Link
                href="/messages"
                onClick={() => setMobileOpen(false)}
                className="relative flex items-center gap-2.5 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Mesajlar
                {unreadCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[1rem] px-0.5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Favorites group */}
              <p className="pt-2 pb-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                المفضلة
              </p>
              <Link
                href="/account/favorites"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                <Star className="w-4 h-4 text-yellow-500" />
                إعلاناتي المفضلة
              </Link>
              <Link
                href="/account/saved-searches"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                <Bookmark className="w-4 h-4 text-orange-400" />
                بحثي المفضل
              </Link>
              <Link
                href="/account/favorite-sellers"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-green-500" />
                بائعيّ المفضلون
              </Link>

              {user.userType === 'ADMIN' && (
                <>
                  <div className="my-1 border-t border-gray-100" />
                  <Link
                    href="/admin/listings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Panel
                  </Link>
                </>
              )}

              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 py-2.5 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
