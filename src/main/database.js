// File: src/main/database.js
const Database = require("better-sqlite3");
const path = require("path");

// 1. Inisialisasi Koneksi Database
const dbPath = path.join(__dirname, "../../database.db");
const db = new Database(dbPath);

// 2. Fungsi untuk membuat tabel dan mengisi data default
function inisialisasiDatabase() {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS kategori (
                id_kategori INTEGER PRIMARY KEY AUTOINCREMENT,
                nama_kategori TEXT NOT NULL,
                kode_warna TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS jadwal (
                id_jadwal INTEGER PRIMARY KEY AUTOINCREMENT,
                id_kategori INTEGER,
                judul_aktivitas TEXT NOT NULL,
                tanggal TEXT NOT NULL,
                waktu_mulai TEXT NOT NULL,
                waktu_selesai TEXT NOT NULL,
                prioritas TEXT DEFAULT 'Sedang',
                status TEXT DEFAULT 'To Do',
                is_berulang INTEGER DEFAULT 0,
                FOREIGN KEY (id_kategori) REFERENCES kategori (id_kategori)
            );

            INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (1, 'Belajar', '#89b4fa');
            INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (2, 'Istirahat', '#f9e2af');
            INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (3, 'Hiburan', '#a6e3a1');

            CREATE TABLE IF NOT EXISTS rutinitas (
                id_rutinitas INTEGER PRIMARY KEY AUTOINCREMENT,
                id_kategori INTEGER,
                judul_aktivitas TEXT NOT NULL,
                waktu_mulai TEXT NOT NULL,
                waktu_selesai TEXT NOT NULL,
                prioritas TEXT DEFAULT 'Sedang'
            );

            INSERT OR IGNORE INTO rutinitas (id_rutinitas, id_kategori, judul_aktivitas, waktu_mulai, waktu_selesai, prioritas) 
            VALUES (1, 2, 'Tidur & Istirahat', '22:00', '05:00', 'Tinggi');
            
            INSERT OR IGNORE INTO rutinitas (id_rutinitas, id_kategori, judul_aktivitas, waktu_mulai, waktu_selesai, prioritas) 
            VALUES (2, 2, 'Makan Siang & Istirahat', '12:00', '13:00', 'Sedang');

            CREATE TABLE IF NOT EXISTS proyek (
                id_proyek INTEGER PRIMARY KEY AUTOINCREMENT,
                nama_proyek TEXT NOT NULL,
                target_tanggal TEXT
            );

            CREATE TABLE IF NOT EXISTS milestone (
                id_milestone INTEGER PRIMARY KEY AUTOINCREMENT,
                id_proyek INTEGER,
                nama_tugas TEXT NOT NULL,
                is_selesai INTEGER DEFAULT 0,
                FOREIGN KEY (id_proyek) REFERENCES proyek (id_proyek) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS pengaturan_sistem (
                kunci TEXT PRIMARY KEY,
                nilai TEXT NOT NULL
            );

            INSERT OR IGNORE INTO pengaturan_sistem (kunci, nilai) VALUES ('suara_notif', '../assets/sounds/suara-1.mp3');
            INSERT OR IGNORE INTO pengaturan_sistem (kunci, nilai) VALUES ('mute_notif', '0');
        `);
        console.log("✅ Database dan struktur tabel berhasil diinisialisasi.");
    } catch (error) {
        console.error("❌ Gagal menginisialisasi database:", error);
    }
}

// Jalankan inisialisasi saat file ini dipanggil
inisialisasiDatabase();

// Ekspor instance 'db' agar bisa dipakai di file lain
module.exports = db;