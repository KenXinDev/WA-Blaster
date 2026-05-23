import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] bg-emerald-600/20 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/20 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-16 py-5 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">Blast<span className="text-emerald-400">App</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Fitur</a>
          <a href="#how" className="hover:text-white transition-colors">Cara Kerja</a>
          <a href="#pricing" className="hover:text-white transition-colors">Harga</a>
        </div>
        <div className="flex items-center gap-3">
          <GoogleAuthButton compact />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-16 pt-24 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-300 tracking-widest uppercase">Platform Broadcast WhatsApp #1</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
          Kirim Ribuan Pesan<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-cyan-400">
            Dalam Hitungan Menit
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Broadcast WhatsApp massal dengan personalisasi dari file Excel. Kelola banyak nomor, pantau pengiriman secara real-time, dan tingkatkan engagement bisnis Anda.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500" />
            <div className="relative bg-[#0A1628] border border-white/10 p-1.5 rounded-2xl">
              <GoogleAuthButton />
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["bg-emerald-400","bg-blue-400","bg-purple-400","bg-pink-400"].map((c,i) => (
                <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-[#050A14]`} />
              ))}
            </div>
            <span>2,000+ pengguna aktif</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(i => (
              <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            ))}
            <span>4.9/5 rating</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-16 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "50M+", label: "Pesan Terkirim" },
            { value: "99.9%", label: "Uptime" },
            { value: "2,000+", label: "Pengguna Aktif" },
            { value: "<2s", label: "Waktu Respons" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 md:px-16 py-24">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Fitur Unggulan</div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Semua yang Anda Butuhkan</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Dirancang untuk bisnis yang ingin berkomunikasi lebih efisien dan personal dengan pelanggan mereka.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              color: "emerald",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
              title: "Import Excel Instan",
              desc: "Upload file .xlsx atau .xls berisi ribuan kontak. Sistem otomatis mendeteksi kolom nomor telepon dan data personalisasi.",
            },
            {
              color: "blue",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
              title: "Pesan Dinamis",
              desc: "Gunakan variabel seperti {nama}, {kota}, {produk} untuk membuat setiap pesan terasa personal dan meningkatkan open rate.",
            },
            {
              color: "purple",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
              title: "Analitik Real-Time",
              desc: "Dashboard lengkap dengan statistik pengiriman, tingkat keberhasilan, dan riwayat kampanye yang bisa diekspor.",
            },
            {
              color: "orange",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
              title: "Multi-Nomor WhatsApp",
              desc: "Hubungkan beberapa nomor WhatsApp sekaligus. Distribusikan pengiriman untuk menghindari pembatasan dan meningkatkan kapasitas.",
            },
            {
              color: "pink",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
              title: "Keamanan Enterprise",
              desc: "Sesi WhatsApp dienkripsi AES-256-GCM. Login aman via Google OAuth. Data Anda tidak pernah dibagikan ke pihak ketiga.",
            },
            {
              color: "cyan",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
              title: "Rate Limiting Cerdas",
              desc: "Jeda pengiriman otomatis yang dapat dikonfigurasi untuk meniru perilaku manusia dan meminimalkan risiko pemblokiran akun.",
            },
          ].map((f) => {
            const colorMap: Record<string, string> = {
              emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
              purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
              orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
              pink: "bg-pink-500/10 border-pink-500/20 text-pink-400",
              cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
            };
            return (
              <div key={f.title} className="group p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl ${colorMap[f.color]} border flex items-center justify-center mb-5`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">{f.icon}</svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 bg-white/[0.02] border-y border-white/5 py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-16">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Cara Kerja</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Mulai dalam 3 Langkah</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Login & Hubungkan WA", desc: "Masuk dengan akun Google Anda, lalu scan QR code untuk menghubungkan nomor WhatsApp." },
              { step: "02", title: "Upload File Excel", desc: "Unggah spreadsheet berisi daftar kontak. Pilih kolom nomor telepon dan kolom data personalisasi." },
              { step: "03", title: "Kirim & Pantau", desc: "Tulis pesan dengan variabel dinamis, klik kirim, dan pantau progress pengiriman secara real-time." },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-0" style={{width: "calc(100% - 2rem)", left: "calc(100% - 1rem)"}} />
                )}
                <div className="relative z-10 flex flex-col items-start">
                  <div className="text-6xl font-black text-white/5 mb-4 leading-none">{s.step}</div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20 -mt-8">
                    <span className="text-white font-bold text-sm">{parseInt(s.step)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-16 py-24 text-center">
        <div className="relative p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Siap Memulai?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">Bergabung dengan ribuan bisnis yang sudah menggunakan BlastApp untuk meningkatkan komunikasi mereka.</p>
            <div className="inline-flex">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-50 group-hover:opacity-80 transition duration-500" />
                <div className="relative bg-[#050A14] border border-white/10 p-1.5 rounded-2xl">
                  <GoogleAuthButton />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-4">Gratis untuk memulai. Tidak perlu kartu kredit.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-gray-600">
        <p>© 2025 BlastApp. Dibuat dengan ❤️ untuk bisnis Indonesia.</p>
      </footer>
    </main>
  );
}
