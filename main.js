const { app, BrowserWindow, ipcMain } = require("electron"); // Tambahkan ipcMain di sini
const path = require("path");
require("electron-reload")(__dirname);
const Database = require("better-sqlite3");

// 1. Inisialisasi Database
const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

// 2. Membuat Tabel dan Mengisi Data Default Kategori
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
        status TEXT DEFAULT 'Belum Mulai',
        is_berulang INTEGER DEFAULT 0,
        FOREIGN KEY (id_kategori) REFERENCES kategori (id_kategori)
    );

    -- Masukkan kategori default ini jika tabel kategori masih kosong
    INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (1, 'Belajar', '#89b4fa');
    INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (2, 'Istirahat', '#f9e2af');
    INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (3, 'Hiburan', '#a6e3a1');
`);

// --- LOGIKA BARU: MENERIMA DATA DARI RENDERER LALU SIMPAN KE DATABASE ---
ipcMain.on('simpan-jadwal', (event, data) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO jadwal (id_kategori, judul_aktivitas, tanggal, waktu_mulai, waktu_selesai) 
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(data.kategoriId, data.judul, data.tanggal, data.mulai, data.selesai);
        
        event.reply('simpan-sukses', 'Mantap! Jadwal berhasil disimpan.');
    } catch (error) {
        console.error("Database error:", error);
        // Kita ubah pesannya agar memunculkan error asli dari mesin database
        event.reply('simpan-gagal', 'Gagal menyimpan: ' + error.message);
    }
});
// -------------------------------------------------------------------------
// ... (kode simpan-jadwal sebelumnya ada di atas sini) ...

// --- LOGIKA BARU: MENGAMBIL JADWAL DARI DATABASE ---
ipcMain.on('ambil-jadwal', (event, tanggalHariIni) => {
    try {
        // Mengambil jadwal yang tanggal nya sama dengan hari ini
        // Kita gabungkan (JOIN) dengan tabel kategori untuk mengambil warnanya
        const stmt = db.prepare(`
            SELECT jadwal.*, kategori.nama_kategori, kategori.kode_warna 
            FROM jadwal 
            JOIN kategori ON jadwal.id_kategori = kategori.id_kategori 
            WHERE jadwal.tanggal = ? 
            ORDER BY jadwal.waktu_mulai ASC
        `);
        
        const jadwalList = stmt.all(tanggalHariIni);
        
        // Kirim data nya kembali ke layar (renderer)
        event.reply('data-jadwal', jadwalList);
    } catch (error) {
        console.error("Gagal mengambil jadwal:", error);
    }
});


// --- LOGIKA BARU: MENGUBAH STATUS JADWAL (CHECKBOX) ---
ipcMain.on('update-status', (event, data) => {
    try {
        // Mengubah status di tabel jadwal berdasarkan id_jadwal
        const stmt = db.prepare(`UPDATE jadwal SET status = ? WHERE id_jadwal = ?`);
        stmt.run(data.status, data.id);
        
        // Beri tahu layar bahwa update berhasil agar layar me-refresh otomatis
        event.reply('update-sukses');
    } catch (error) {
        console.error("Gagal update status:", error);
    }
});

// --- LOGIKA BARU: MENGHAPUS JADWAL (DELETE) ---
ipcMain.on('hapus-jadwal', (event, idJadwal) => {
    try {
        const stmt = db.prepare(`DELETE FROM jadwal WHERE id_jadwal = ?`);
        stmt.run(idJadwal);
        
        // Gunakan sinyal 'update-sukses' yang sudah ada agar layar langsung me-refresh
        event.reply('update-sukses');
    } catch (error) {
        console.error("Gagal menghapus jadwal:", error);
    }
});

// --- LOGIKA BARU: MENGEDIT JADWAL (UPDATE) ---
ipcMain.on('edit-jadwal', (event, data) => {
    try {
        const stmt = db.prepare(`
            UPDATE jadwal 
            SET id_kategori = ?, judul_aktivitas = ?, tanggal = ?, waktu_mulai = ?, waktu_selesai = ?
            WHERE id_jadwal = ?
        `);
        stmt.run(data.kategoriId, data.judul, data.tanggal, data.mulai, data.selesai, data.id);
        
        // Kita bisa menggunakan sinyal 'simpan-sukses' agar form di-reset dan layar me-refresh
        event.reply('simpan-sukses', 'Jadwal berhasil diperbarui.');
    } catch (error) {
        console.error("Gagal edit jadwal:", error);
        event.reply('simpan-gagal', 'Gagal memperbarui: ' + error.message);
    }
});
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.setMenuBarVisibility(false);
    win.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    db.close(); 
    if (process.platform !== "darwin") {
        app.quit();
    }
});