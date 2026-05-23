# WhatsApp Blast - Aplikasi Broadcast WhatsApp

Aplikasi web untuk mengirim pesan broadcast WhatsApp secara massal dengan dukungan personalisasi menggunakan data Excel.

## 🚀 Fitur Utama

- **Koneksi WhatsApp Web**: Integrasi langsung dengan WhatsApp Web menggunakan QR Code
- **Upload Excel**: Import kontak dari file Excel (.xlsx, .xls, .csv)
- **Personalisasi Pesan**: Gunakan variabel dari kolom Excel untuk personalisasi
- **Broadcast Massal**: Kirim pesan ke ribuan kontak dengan delay otomatis
- **Riwayat Lengkap**: Pantau status dan hasil setiap kampanye broadcast
- **Dashboard Real-time**: Monitor statistik dan status koneksi WhatsApp
- **Google Authentication**: Login aman menggunakan akun Google

## 🛠️ Teknologi

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **WhatsApp**: whatsapp-web.js
- **Authentication**: NextAuth.js dengan Google OAuth
- **File Processing**: ExcelJS, XLSX
- **Storage**: File-based storage (JSON files)
- **UI Components**: Custom components dengan Tailwind CSS

## 📋 Persyaratan Sistem

- Node.js 18+ 
- NPM atau Yarn
- Browser modern (Chrome, Firefox, Safari, Edge)
- Koneksi internet stabil
- WhatsApp di smartphone untuk scanning QR code

## 🔧 Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-blast
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   
   Buat file `.env.local` dan isi dengan:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```

5. **Buka browser**
   
   Akses `http://localhost:3000`

## 🔑 Setup Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Aktifkan Google+ API
4. Buat OAuth 2.0 credentials
5. Tambahkan authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy Client ID dan Client Secret ke `.env.local`

## 📱 Cara Penggunaan

### 1. Login
- Buka aplikasi di browser
- Klik "Login dengan Google"
- Authorize aplikasi

### 2. Hubungkan WhatsApp
- Di dashboard, klik "Hubungkan WhatsApp Sekarang"
- Scan QR code dengan WhatsApp di smartphone
- Tunggu hingga status berubah menjadi "Terhubung"

### 3. Siapkan File Excel
Format file Excel yang didukung:
```
| nama          | nomor        | perusahaan | kota    |
|---------------|--------------|------------|---------|
| Budi Santoso  | 628123456789 | PT ABC     | Jakarta |
| Siti Aminah   | 628987654321 | CV XYZ     | Bandung |
```

### 4. Buat Broadcast
- Klik "Broadcast Baru"
- Upload file Excel
- Pilih kolom nomor telepon
- Tulis pesan dengan variabel (contoh: `Halo {nama}`)
- Review dan kirim

### 5. Monitor Progress
- Lihat progress real-time di halaman History
- Cek detail hasil broadcast
- Export laporan jika diperlukan

## 📊 Format Pesan dengan Variabel

Gunakan kurung kurawal untuk variabel yang akan diganti otomatis:

```
Halo {nama},

Kami dari {perusahaan} ingin menawarkan produk terbaru untuk wilayah {kota}.

Hubungi kami untuk info lebih lanjut.

Terima kasih!
```

## 🔒 Keamanan

- Semua data disimpan lokal di server Anda
- Tidak ada data yang dikirim ke server eksternal
- Session WhatsApp tersimpan aman
- Authentication menggunakan Google OAuth
- File upload dibatasi ukuran dan tipe

## 📁 Struktur Project

```
whatsapp-blast/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   ├── dashboard/      # Dashboard pages
│   │   └── page.tsx        # Landing page
│   ├── components/         # React components
│   ├── lib/               # Utilities & services
│   │   ├── auth.ts        # Authentication
│   │   └── whatsapp/      # WhatsApp client
│   └── types/             # TypeScript types
├── data/                  # File storage
│   ├── excel/            # Uploaded Excel files
│   └── history/          # Broadcast history
├── .wwebjs_auth/         # WhatsApp sessions
└── public/               # Static assets
```

## 🚨 Troubleshooting

### WhatsApp tidak terhubung
- Pastikan QR code di-scan dengan benar
- Coba refresh halaman dan scan ulang
- Pastikan WhatsApp di smartphone aktif dan terhubung internet

### Upload Excel gagal
- Pastikan file format .xlsx, .xls, atau .csv
- Cek ukuran file tidak lebih dari 10MB
- Pastikan baris pertama adalah header kolom

### Pesan tidak terkirim
- Cek koneksi WhatsApp masih aktif
- Pastikan nomor telepon dalam format internasional (628xxx)
- Cek apakah nomor terdaftar di WhatsApp

### Error saat broadcast
- Tunggu beberapa menit jika ada rate limiting
- Cek log error di console browser
- Restart aplikasi jika diperlukan

## 📈 Optimasi Performance

- Gunakan delay 30-60 detik antar pesan untuk menghindari blocking
- Batch upload maksimal 1000 kontak per broadcast
- Monitor penggunaan memory saat broadcast besar
- Restart aplikasi secara berkala untuk performa optimal

## 🔄 Update & Maintenance

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## 📞 Support

Jika mengalami masalah:
1. Cek troubleshooting guide di atas
2. Lihat log error di browser console
3. Restart aplikasi dan coba lagi
4. Hubungi developer untuk bantuan lebih lanjut

## 📄 License

MIT License - Lihat file LICENSE untuk detail lengkap.

## ⚠️ Disclaimer

- Gunakan aplikasi ini dengan bijak dan sesuai kebijakan WhatsApp
- Tidak bertanggung jawab atas pemblokiran akun WhatsApp
- Pastikan pesan yang dikirim tidak melanggar hukum atau spam
- Selalu minta izin sebelum mengirim pesan broadcast

---

**Dibuat dengan ❤️ untuk memudahkan komunikasi bisnis Anda**