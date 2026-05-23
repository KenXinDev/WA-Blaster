"use client";

import { useState, useEffect } from "react";

type Status = "completed" | "in_progress" | "failed" | "pending" | "cancelled";

interface HistoryItem {
  id: string;
  accountId: string;
  message: string;
  status: Status;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
  summary: { total: number; sent: number; failed: number };
  error?: string;
}

interface HistoryResponse {
  histories: HistoryItem[];
  pagination: {
    page: number; limit: number; total: number;
    totalPages: number; hasNext: boolean; hasPrev: boolean;
  };
}

const statusConfig: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  completed:   { label: "Selesai",   bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  in_progress: { label: "Berjalan",  bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500 animate-pulse" },
  failed:      { label: "Gagal",     bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  pending:     { label: "Menunggu",  bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400" },
  cancelled:   { label: "Dibatalkan", bg: "bg-orange-50", text: "text-orange-700",  dot: "bg-orange-500" },
};

export default function HistoryPage() {
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState<HistoryResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stopping, setStopping] = useState<string | null>(null);

  const loadHistories = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/history/list?page=${currentPage}&limit=10`);
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      const data: HistoryResponse = await res.json();
      setHistories(data.histories);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryDetails = async (historyId: string) => {
    try {
      const res = await fetch(`/api/history/details?historyId=${historyId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedDetails(data.details);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadHistories(page); }, [page]);

  useEffect(() => {
    if (selected) loadHistoryDetails(selected);
    else setSelectedDetails(null);
  }, [selected]);

  // Auto-refresh for in-progress
  useEffect(() => {
    const hasInProgress = histories.some(h => h.status === "in_progress");
    if (!hasInProgress) return;
    const interval = setInterval(() => loadHistories(page), 5000);
    return () => clearInterval(interval);
  }, [histories, page]);

  // Delete single history
  const handleDelete = async (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus riwayat ini?")) return;
    setDeleting(historyId);
    try {
      const res = await fetch(`/api/history/delete?historyId=${historyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      if (selected === historyId) { setSelected(null); setSelectedDetails(null); }
      setSelectedIds(prev => { const s = new Set(prev); s.delete(historyId); return s; });
      await loadHistories(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(null);
    }
  };

  // Delete selected histories
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} riwayat yang dipilih?`)) return;
    setDeletingAll(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/history/delete?historyId=${id}`, { method: "DELETE" })
        )
      );
      setSelectedIds(new Set());
      setSelected(null);
      setSelectedDetails(null);
      await loadHistories(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingAll(false);
    }
  };

  // Stop (cancel) a running broadcast
  const handleStop = async (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hentikan broadcast yang sedang berjalan ini?")) return;
    setStopping(historyId);
    try {
      const res = await fetch('/api/messages/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghentikan');
      }
      // Refresh list after a short delay so status updates
      setTimeout(() => loadHistories(page), 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghentikan broadcast');
    } finally {
      setStopping(null);
    }
  };

  // Delete all histories
  const handleDeleteAll = async () => {
    if (!confirm("Hapus SEMUA riwayat? Tindakan ini tidak dapat dibatalkan.")) return;
    setDeletingAll(true);
    try {
      const res = await fetch("/api/history/delete?all=true", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus semua riwayat");
      setSelected(null);
      setSelectedDetails(null);
      setSelectedIds(new Set());
      await loadHistories(1);
      setPage(1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(h => h.id)));
    }
  };

  const filtered = histories.filter(d => {
    const matchSearch = d.message.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || d.status === filter;
    return matchSearch && matchFilter;
  });

  const selectedItem = selectedDetails || histories.find(d => d.id === selected);
  const totalSent = histories.reduce((a, b) => a + (b.summary?.sent || 0), 0);
  const totalFailed = histories.reduce((a, b) => a + (b.summary?.failed || 0), 0);
  const avgRate = histories.length
    ? Math.round(histories.reduce((a, b) => a + (b.summary?.total ? ((b.summary?.sent || 0) / b.summary.total) * 100 : 0), 0) / histories.length)
    : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Riwayat Broadcast</h1>
          <p className="text-gray-500 text-sm">Pantau dan analisis semua kampanye broadcast Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deletingAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus {selectedIds.size} Dipilih
            </button>
          )}
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || histories.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deletingAll ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Hapus Semua
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Kampanye", value: pagination?.total || 0, icon: "📋", color: "bg-gray-50 border-gray-200" },
          { label: "Pesan Terkirim", value: totalSent.toLocaleString(), icon: "✅", color: "bg-emerald-50 border-emerald-200" },
          { label: "Pesan Gagal", value: totalFailed.toLocaleString(), icon: "❌", color: "bg-red-50 border-red-200" },
          { label: "Rata-rata Sukses", value: `${avgRate}%`, icon: "📊", color: "bg-blue-50 border-blue-200" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kampanye..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              {(["ALL", "completed", "in_progress", "failed"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f === "ALL" ? "Semua" : statusConfig[f].label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pesan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sukses</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gagal</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-gray-500 font-medium">Memuat data...</p>
                    </div>
                  </td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center">
                    <p className="text-red-600 font-medium">{error}</p>
                    <button onClick={() => loadHistories(page)} className="mt-2 text-sm text-blue-600 hover:underline">Coba lagi</button>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">Tidak ada data ditemukan</p>
                      <p className="text-gray-400 text-xs mt-1">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                  </td></tr>
                ) : filtered.map((row) => {
                  const rate = row.summary?.total ? Math.round(((row.summary?.sent || 0) / row.summary.total) * 100) : 0;
                  const cfg = statusConfig[row.status];
                  const msgPreview = row.message.length > 35 ? row.message.substring(0, 35) + "…" : row.message;
                  const date = new Date(row.createdAt).toLocaleString("id-ID");
                  const isSelected = selected === row.id;
                  const isChecked = selectedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(isSelected ? null : row.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-emerald-50/50" : "hover:bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectId(row.id, e as any)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{msgPreview}</div>
                        <div className="text-xs text-gray-400 mt-0.5">ID: {row.id.substring(0, 20)}…</div>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{date}</td>
                      <td className="px-4 py-4 text-center font-semibold text-gray-700">{(row.summary?.total || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-center font-semibold text-emerald-600">{(row.summary?.sent || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-center font-semibold text-red-500">{(row.summary?.failed || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-7">{rate}%</span>
                          </div>
                          {row.status === "in_progress" && (
                            <button
                              onClick={(e) => handleStop(row.id, e)}
                              disabled={stopping === row.id}
                              title="Hentikan broadcast"
                              className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {stopping === row.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(row.id, e)}
                            disabled={deleting === row.id}
                            title="Hapus riwayat ini"
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting === row.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} dipilih · `
                : ""}
              Menampilkan {filtered.length} dari {pagination?.total || 0} kampanye
            </span>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">←</button>
                <span className="px-3 py-1.5 bg-gray-900 text-white rounded-lg">{pagination.page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">→</button>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">Detail Kampanye</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <p className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">
                  {selectedItem.message?.substring(0, 80) || "Broadcast Message"}
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  {new Date(selectedItem.createdAt).toLocaleString("id-ID")}
                </p>

                {/* Donut chart */}
                <div className="relative w-28 h-28 mx-auto mb-5">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${selectedItem.summary?.total ? ((selectedItem.summary?.sent || 0) / selectedItem.summary.total) * 100 : 0} 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-gray-900">
                      {selectedItem.summary?.total ? Math.round(((selectedItem.summary?.sent || 0) / selectedItem.summary.total) * 100) : 0}%
                    </span>
                    <span className="text-xs text-gray-400">sukses</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: "Total Penerima", value: (selectedItem.summary?.total || 0).toLocaleString(), color: "text-gray-800" },
                    { label: "Berhasil", value: (selectedItem.summary?.sent || 0).toLocaleString(), color: "text-emerald-600" },
                    { label: "Gagal", value: (selectedItem.summary?.failed || 0).toLocaleString(), color: "text-red-500" },
                    { label: "Status", value: statusConfig[selectedItem.status as Status]?.label || selectedItem.status, color: statusConfig[selectedItem.status as Status]?.text || "text-gray-600" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-500">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {selectedItem.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 font-medium">Error:</p>
                    <p className="text-xs text-red-600 mt-1">{selectedItem.error}</p>
                  </div>
                )}

                {/* Stop button for in_progress */}
                {selectedItem.status === 'in_progress' && (
                  <button
                    onClick={(e) => handleStop(selectedItem.id, e)}
                    disabled={stopping === selectedItem.id}
                    className="w-full mt-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {stopping === selectedItem.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    )}
                    Hentikan Broadcast
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(selectedItem.id, e)}
                  disabled={deleting === selectedItem.id}
                  className="w-full mt-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Riwayat Ini
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
