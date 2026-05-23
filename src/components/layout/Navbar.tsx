"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const pageTitles: Record<string, { title: string; desc: string }> = {
  "/dashboard": { title: "Dashboard", desc: "Ringkasan aktivitas broadcast Anda" },
  "/dashboard/broadcast": { title: "Broadcast Baru", desc: "Kirim pesan massal ke kontak Anda" },
  "/dashboard/history": { title: "Riwayat Broadcast", desc: "Pantau semua kampanye yang pernah dikirim" },
  "/dashboard/settings": { title: "Pengaturan", desc: "Konfigurasi sistem dan preferensi akun" },
};

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageInfo = pageTitles[pathname] ?? { title: "Dashboard", desc: "" };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-10 flex-shrink-0">
      {/* Left: Page title */}
      <div className="flex flex-col justify-center">
        <h2 className="text-base font-semibold text-gray-900 leading-tight">{pageInfo.title}</h2>
        {pageInfo.desc && (
          <p className="text-xs text-gray-400 hidden sm:block">{pageInfo.desc}</p>
        )}
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-2">
        {/* Quick action: New Broadcast */}
        {pathname !== "/dashboard/broadcast" && (
          <Link
            href="/dashboard/broadcast"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-emerald-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Broadcast
          </Link>
        )}

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 border-2 border-white shadow-sm flex-shrink-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-700 text-xs font-bold">
                  {initials}
                </div>
              )}
            </div>
            {/* Name */}
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-gray-700 leading-tight">
                {session?.user?.name?.split(" ")[0] || "User"}
              </span>
              <span className="text-[11px] text-gray-400 leading-tight">
                {session?.user?.email?.split("@")[0] || ""}
              </span>
            </div>
            {/* Chevron */}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {/* User info header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                    {session?.user?.image ? (
                      <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-700 font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || "User"}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email || ""}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pengaturan
                </Link>
                <Link
                  href="/dashboard/history"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Riwayat Broadcast
                </Link>
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
