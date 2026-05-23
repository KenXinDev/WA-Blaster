"use client";

import { useState, useRef } from "react";

type Step = 1 | 2 | 3;

interface ExcelFileData {
  id: string;
  originalName: string;
  headers: string[];
  rowCount: number;
  preview: any[];
}

export default function BroadcastPage() {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<ExcelFileData | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [phoneColumn, setPhoneColumn] = useState("");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/excel/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      setFileData(result);
      setFileName(file.name);
      setColumns(result.headers);
      
      console.log('File uploaded successfully:', result);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle file drop
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle broadcast send
  const handleSendBroadcast = async () => {
    if (!fileData || !phoneColumn || !message.trim()) {
      alert('Lengkapi semua field yang diperlukan');
      return;
    }

    setIsSending(true);

    try {
      // Fetch ALL rows from the server (not just preview)
      const dataRes = await fetch(`/api/excel?id=${fileData.id}`);
      if (!dataRes.ok) throw new Error('Gagal mengambil data file');
      const fullData = await dataRes.json();

      const allRows: any[] = fullData.rows || [];

      // Extract and normalize phone numbers
      const phoneNumbers = allRows
        .map((row: any) => {
          const val = row[phoneColumn];
          if (!val) return '';
          let num = val.toString().replace(/\D/g, '');
          // Normalize: 08xxx → 628xxx, 8xxx → 628xxx, 62xxx → keep
          if (num.startsWith('0')) num = '62' + num.slice(1);
          else if (num.startsWith('8')) num = '62' + num;
          return num;
        })
        .filter((p: string) => p.length >= 10 && p.length <= 15);

      if (phoneNumbers.length === 0) {
        throw new Error(`Tidak ada nomor telepon valid di kolom "${phoneColumn}"`);
      }

      // Build personalized messages — only for rows with valid phone
      const validRows = allRows.filter((row: any) => {
        const val = row[phoneColumn];
        if (!val) return false;
        let num = val.toString().replace(/\D/g, '');
        if (num.startsWith('0')) num = '62' + num.slice(1);
        else if (num.startsWith('8')) num = '62' + num;
        return num.length >= 10 && num.length <= 15;
      });

      const messages = validRows.map((row: any) => {
        let msg = message.trim();
        for (const col of fileData.headers) {
          const regex = new RegExp(`\\{${col}\\}`, 'gi');
          msg = msg.replace(regex, row[col] ?? '');
        }
        return msg;
      });

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: 'default',
          phoneNumbers,
          messages, // personalized per-recipient
          message: message.trim(), // fallback template
          delayMs: 30000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memulai broadcast');
      }

      const result = await response.json();
      alert(`Broadcast dimulai untuk ${phoneNumbers.length} nomor!\nHistory ID: ${result.historyId}`);
      window.location.href = '/dashboard/history';

    } catch (error) {
      console.error('Broadcast error:', error);
      alert(error instanceof Error ? error.message : 'Gagal memulai broadcast');
    } finally {
      setIsSending(false);
    }
  };

  const insertVariable = (v: string) => {
    setMessage((prev) => prev + `{${v}}`);
  };

  // Build preview using first row data
  const firstRow = fileData?.preview?.[0] ?? {};
  const preview = (() => {
    let msg = message;
    for (const col of (fileData?.headers ?? [])) {
      const val = firstRow[col] ?? `<b>{${col}}</b>`;
      msg = msg.replace(new RegExp(`\\{${col}\\}`, 'gi'), `<b>${val}</b>`);
    }
    return msg;
  })();

  const steps = [
    { n: 1, label: "Data Penerima" },
    { n: 2, label: "Komposer Pesan" },
    { n: 3, label: "Konfirmasi & Kirim" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Broadcast Baru</h1>
        <p className="text-gray-500 text-sm">Ikuti langkah-langkah berikut untuk mengirim pesan massal.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-10">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button onClick={() => step > s.n && setStep(s.n as Step)} className="flex items-center gap-3 group">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step === s.n ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200"
                : step > s.n ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                : "bg-white border-gray-200 text-gray-400"
              }`}>
                {step > s.n ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : s.n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step === s.n ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-4 rounded-full transition-all ${step > s.n ? "bg-emerald-400" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <h2 className="font-semibold text-gray-800">Upload File Kontak</h2>
              </div>
              <div className="p-6">
                <input 
                  ref={fileRef} 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{uploadError}</p>
                  </div>
                )}
                <div
                  onClick={() => !isUploading && fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isUploading ? "border-blue-300 bg-blue-50 cursor-wait" :
                    isDragging ? "border-emerald-400 bg-emerald-50" : 
                    fileName ? "border-emerald-300 bg-emerald-50/50" : 
                    "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <p className="font-semibold text-blue-800 mb-1">Mengupload file...</p>
                      <p className="text-sm text-blue-600">Mohon tunggu sebentar</p>
                    </>
                  ) : fileName && fileData ? (
                    <>
                      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="font-semibold text-gray-800 mb-1">{fileName}</p>
                      <p className="text-sm text-emerald-600">File berhasil dimuat · {fileData.headers.length} kolom · {fileData.rowCount} baris</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                      <p className="font-semibold text-gray-700 mb-1">Drag & drop atau klik untuk upload</p>
                      <p className="text-sm text-gray-400">Mendukung .xlsx, .xls, .csv</p>
                    </>
                  )}
                </div>
                {columns.length > 0 && (
                  <div className="mt-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kolom Nomor Telepon</label>
                    <select value={phoneColumn} onChange={(e) => setPhoneColumn(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white">
                      <option value="">-- Pilih kolom --</option>
                      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Ringkasan File</h3>
              <div className="space-y-3">
                {[
                  { label: "Total Baris", value: fileData ? fileData.rowCount.toLocaleString() : "—" },
                  { label: "Nomor Valid", value: fileData ? (fileData.rowCount - Math.floor(fileData.rowCount * 0.05)).toLocaleString() : "—", color: "text-emerald-600" },
                  { label: "Nomor Invalid", value: fileData ? Math.floor(fileData.rowCount * 0.05).toLocaleString() : "—", color: "text-red-500" },
                  { label: "Kolom Terdeteksi", value: fileData ? fileData.headers.length.toString() : "—" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    <span className={`text-sm font-semibold ${r.color || "text-gray-800"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Format yang Didukung</p>
                  <p className="text-xs text-amber-700 mt-1">Pastikan baris pertama adalah header kolom. Nomor telepon harus dalam format internasional (contoh: 628123456789).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <h2 className="font-semibold text-gray-800">Tulis Pesan</h2>
                </div>
                <span className="text-xs text-gray-400">{message.length} karakter</span>
              </div>
              <div className="p-6">
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Sisipkan Variabel:</p>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((v) => (
                      <button key={v} onClick={() => insertVariable(v)} className="px-3 py-1.5 text-xs font-mono font-medium bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-600 rounded-lg transition-colors border border-gray-200">{`{${v}}`}</button>
                    ))}
                  </div>
                </div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none text-gray-700 text-sm font-mono leading-relaxed"
                  placeholder={`Halo {nama},\n\nKami dari {perusahaan} ingin menawarkan produk terbaru kami...\n\nSalam,\nTim Marketing`}
                />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-800 text-sm">Preview Pesan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Contoh untuk kontak pertama</p>
              </div>
              <div className="p-5">
                <div className="bg-[#ECE5DD] rounded-2xl p-4 min-h-[200px]">
                  <div className="flex justify-end">
                    <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                      {message ? (
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: preview }} />
                      ) : (
                        <p className="text-sm text-gray-400 italic">Pesan akan muncul di sini...</p>
                      )}
                      <p className="text-right text-[10px] text-gray-400 mt-1">12:00 ✓✓</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-700"><span className="font-semibold">Tip:</span> Variabel dalam kurung kurawal akan diganti otomatis dengan data dari kolom Excel.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Ringkasan Broadcast</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "File Kontak", value: fileName || "—" },
                { label: "Kolom Nomor", value: phoneColumn || "—" },
                { label: "Total Penerima", value: fileData ? `${fileData.rowCount} kontak` : "—" },
                { label: "Panjang Pesan", value: `${message.length} karakter` },
                { label: "Estimasi Waktu", value: fileData ? `~${Math.ceil((fileData.rowCount * 30) / 60)} menit (jeda 30 dtk)` : "—" },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{r.label}</span>
                  <span className="text-sm font-semibold text-gray-800">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Perhatian Sebelum Mengirim</p>
                <p className="text-xs text-amber-700 mt-1">Pastikan nomor WhatsApp Anda sudah terhubung. Proses pengiriman tidak dapat dibatalkan setelah dimulai.</p>
              </div>
            </div>
          </div>
          <button onClick={handleSendBroadcast} disabled={isSending || !fileData || !phoneColumn || !message.trim()}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSending ? (
              <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Sedang Mengirim...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Mulai Kirim Sekarang</>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        <button onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Kembali
        </button>
        {step < 3 && (
          <button onClick={() => setStep((s) => Math.min(3, s + 1) as Step)} disabled={(step === 1 && !fileData) || (step === 2 && !message.trim())}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Lanjut
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
