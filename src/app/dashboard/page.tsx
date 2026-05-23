"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type WAStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "QR_READY";

interface WhatsAppStatusResponse {
  status: WAStatus;
  qr?: string;
  qrDataUrl?: string;
  phoneNumber?: string;
  lastError?: string;
  connectionAttempts?: number;
  lastConnected?: string;
  isInitializing?: boolean;
}

interface DashboardStats {
  totalMessages: number;
  totalContacts: number;
  successRate: number;
  totalCampaigns: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [waStatus, setWaStatus] = useState<WAStatus>("DISCONNECTED");
  const [waData, setWaData] = useState<WhatsAppStatusResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalContacts: 0,
    successRate: 0,
    totalCampaigns: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch WhatsApp status
  const fetchWAStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status?accountId=default");
      if (res.ok) {
        const data: WhatsAppStatusResponse = await res.json();
        setWaStatus(data.status);
        setWaData(data);
      }
    } catch (err) {
      console.error("Error fetching WA status", err);
    }
  };

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/history/list?limit=100");
      if (res.ok) {
        const data = await res.json();
        const histories = data.histories || [];
        
        const totalMessages = histories.reduce((sum: number, h: any) => sum + (h.summary?.sent || 0), 0);
        const totalFailed = histories.reduce((sum: number, h: any) => sum + (h.summary?.failed || 0), 0);
        const totalContacts = histories.reduce((sum: number, h: any) => sum + (h.summary?.total || 0), 0);
        const successRate = totalContacts > 0 ? Math.round((totalMessages / (totalMessages + totalFailed)) * 100) : 0;
        
        setStats({
          totalMessages,
          totalContacts,
          successRate,
          totalCampaigns: histories.length
        });
      }
    } catch (err) {
      console.error("Error fetching stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWAStatus();
    fetchStats();
    
    // Poll WhatsApp status every 3 seconds
    const interval = setInterval(fetchWAStatus, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setWaStatus("CONNECTING");
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: "default" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to connect");
      }

      // Immediately start polling faster (every 1.5s) until QR appears
      // The interval in useEffect already polls every 3s,
      // but we do a few quick polls right away so QR shows fast
      let attempts = 0;
      const quickPoll = setInterval(async () => {
        attempts++;
        await fetchWAStatus();
        if (attempts >= 20) clearInterval(quickPoll); // stop after 30s
      }, 1500);
    } catch (err) {
      console.error(err);
      setWaStatus("DISCONNECTED");
      alert(err instanceof Error ? err.message : "Failed to connect WhatsApp. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch("/api/whatsapp/disconnect", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: "default" })
      });
      
      if (res.ok) {
        setWaStatus("DISCONNECTED");
        setWaData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Selamat Datang, {session?.user?.name?.split(" ")[0] || "User"} 👋
        </h1>
        <p className="text-gray-500">
          Kelola kampanye broadcast WhatsApp Anda dari satu tempat.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total Pesan Terkirim</h3>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                stats.totalMessages.toLocaleString()
              )}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total Kontak</h3>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                stats.totalContacts.toLocaleString()
              )}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Tingkat Kesuksesan</h3>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                `${stats.successRate}%`
              )}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total Kampanye</h3>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                stats.totalCampaigns.toLocaleString()
              )}
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Connection Status Widget */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Status Koneksi WhatsApp</h2>
          {waStatus === "CONNECTED" && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Terhubung
            </span>
          )}
        </div>
        
        <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center">
          {waStatus === "DISCONNECTED" && (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Belum Terhubung</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Pindai kode QR menggunakan aplikasi WhatsApp di handphone Anda untuk mulai mengirim pesan broadcast.
              </p>
              <button 
                onClick={handleConnect}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5"
              >
                Hubungkan WhatsApp Sekarang
              </button>
            </>
          )}

          {waStatus === "CONNECTING" && (
            <>
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sedang Menyiapkan Koneksi...</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Mohon tunggu beberapa saat, sistem sedang menyiapkan kode QR untuk Anda.
              </p>
            </>
          )}

          {waStatus === "QR_READY" && waData?.qrDataUrl && (
            <>
              <div className="p-4 bg-white border-2 border-green-100 rounded-3xl shadow-sm mb-6 inline-block">
                <img src={waData.qrDataUrl} alt="WhatsApp QR Code" className="w-64 h-64 rounded-xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Scan QR Code</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Buka WhatsApp di HP Anda, ketuk Menu (Titik Tiga) &gt; Perangkat Tertaut &gt; Tautkan Perangkat. Arahkan kamera ke layar ini.
              </p>
              {waData.lastError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-red-600">{waData.lastError}</p>
                </div>
              )}
            </>
          )}

          {waStatus === "CONNECTED" && (
            <>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
                <svg className="w-12 h-12 text-green-600 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Sudah Terhubung!</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                Sistem siap digunakan untuk mengirim pesan massal secara otomatis.
              </p>
              {waData?.phoneNumber && (
                <p className="text-sm text-green-600 font-medium mb-6">
                  Terhubung sebagai: +{waData.phoneNumber}
                </p>
              )}
              <div className="flex gap-4">
                <button 
                  onClick={() => window.location.href = '/dashboard/broadcast'}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5"
                >
                  Mulai Broadcast Baru
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="px-6 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-all"
                >
                  Putuskan Koneksi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


