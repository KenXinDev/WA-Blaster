"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [delayMin, setDelayMin] = useState(20);
  const [delayMax, setDelayMax] = useState(40);
  const [maxRetries, setMaxRetries] = useState(3);
  const [logLevel, setLogLevel] = useState("info");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rate" | "account" | "danger">("rate");

  // Load config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setDelayMin(data.config.delayMin ?? 20);
          setDelayMax(data.config.delayMax ?? 40);
          setMaxRetries(data.config.maxRetries ?? 3);
          setLogLevel(data.config.logLevel ?? "info");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMin, delayMax, maxRetries, logLevel }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Yakin ingin menghapus semua riwayat? Tindakan ini tidak dapat dibatalkan.")) return;
    // TODO: implement clear history API
    alert("Fitur ini akan segera tersedia.");
  };

  const tabs = [
    { id: "rate" as const, label: "Rate Limiting", icon: "⏱️" },
    { id: "account" as const, label: "Akun & Profil", icon: "👤" },
    { id: "danger" as const, label: "Danger Zone", icon: "⚠️" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pengaturan</h1>
        <p className="text-gray-500 text-sm">Kelola konfigurasi sistem dan preferensi akun Anda.</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {activeTab === "rate" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Konfigurasi Jeda Pengiriman</h2>
              <p className="text-sm text-gray-500 mt-0.5">Atur interval antar pesan untuk menghindari pemblokiran akun WhatsApp.</p>
            </div>
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Jeda Minimum</label>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{delayMin} detik</span>
                    </div>
                    <input type="range" min={5} max={60} value={delayMin}
                      onChange={(e) => setDelayMin(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-600" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5 dtk</span><span>60 dtk</span></div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Jeda Maksimum</label>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{delayMax} detik</span>
                    </div>
                    <input type="range" min={10} max={120} value={delayMax}
                      onChange={(e) => setDelayMax(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-600" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10 dtk</span><span>120 dtk</span></div>
                  </div>
                  {delayMin < 15 && (
                    <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm text-amber-700">Jeda terlalu pendek dapat meningkatkan risiko pemblokiran. Disarankan minimal 20 detik.</p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Estimasi Kecepatan</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        { label: "Per Jam", value: Math.floor(3600 / ((delayMin + delayMax) / 2)) },
                        { label: "Per Hari (8 jam)", value: Math.floor(3600 * 8 / ((delayMin + delayMax) / 2)) },
                        { label: "Jeda Rata-rata", value: `${Math.round((delayMin + delayMax) / 2)} dtk` },
                      ].map((e) => (
                        <div key={e.label}>
                          <div className="text-xl font-black text-gray-900">{typeof e.value === "number" ? e.value.toLocaleString() : e.value}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{e.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Konfigurasi Lanjutan</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maksimum Percobaan Ulang</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setMaxRetries(Math.max(0, maxRetries - 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg">−</button>
                  <span className="w-12 text-center text-lg font-bold text-gray-900">{maxRetries}</span>
                  <button onClick={() => setMaxRetries(Math.min(10, maxRetries + 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg">+</button>
                  <span className="text-sm text-gray-400">kali percobaan jika gagal</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Level Log</label>
                <div className="flex gap-2">
                  {["debug", "info", "warn", "error"].map((l) => (
                    <button key={l} onClick={() => setLogLevel(l)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${logLevel === l ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ${saved ? "bg-emerald-600 text-white" : "bg-gray-900 hover:bg-black text-white"}`}>
              {saving ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Menyimpan...</>
              ) : saved ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Tersimpan!</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>Simpan Pengaturan</>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Informasi Akun</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-100 flex-shrink-0">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-700 text-xl font-bold">
                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{session?.user?.name || "User"}</p>
                <p className="text-sm text-gray-500">{session?.user?.email || ""}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                  Google Account
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Nama Lengkap", value: session?.user?.name || "" },
                { label: "Email", value: session?.user?.email || "" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                  <input type="text" value={f.value} readOnly
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">Dikelola oleh Google. Tidak dapat diubah di sini.</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar dari Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "danger" && (
        <div className="space-y-4">
          {[
            {
              title: "Hapus Semua Riwayat",
              desc: "Hapus semua data riwayat kampanye dan laporan pengiriman secara permanen.",
              action: "Hapus Riwayat",
              onClick: handleClearHistory,
            },
            {
              title: "Reset Pengaturan",
              desc: "Kembalikan semua pengaturan ke nilai default awal.",
              action: "Reset Pengaturan",
              onClick: async () => {
                setDelayMin(20); setDelayMax(40); setMaxRetries(3); setLogLevel("info");
                await fetch("/api/config", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ delayMin: 20, delayMax: 40, maxRetries: 3, logLevel: "info" }),
                });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              },
            },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button onClick={item.onClick}
                  className="flex-shrink-0 px-5 py-2.5 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold text-sm rounded-xl transition-all whitespace-nowrap">
                  {item.action}
                </button>
              </div>
            </div>
          ))}
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700">Semua tindakan di zona ini bersifat permanen dan tidak dapat dibatalkan. Harap berhati-hati.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
