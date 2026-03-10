const { app, BrowserWindow, ipcMain } = require("electron"); // Tambahkan ipcMain di sini
const path = require("path");
require("electron-reload")(__dirname);
const Database = require("better-sqlite3");

// 1. Inisialisasi Database
const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

// 2. Membuat Tabel
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
`);

// --- LOGIKA BARU: MENERIMA DATA DARI RENDERER LALU SIMPAN KE DATABASE ---
ipcMain.on('simpan-jadwal', (event, data) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO jadwal (id_kategori, judul_aktivitas, tanggal, waktu_mulai, waktu_selesai) 
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(data.kategoriId, data.judul, data.tanggal, data.mulai, data.selesai);
        
        // Kirim pesan balik kalau sukses
        event.reply('simpan-sukses', 'Mantap! Jadwal berhasil disimpan.');
    } catch (error) {
        console.error("Database error:", error);
        // Kirim pesan balik kalau gagal
        event.reply('simpan-gagal', 'Gagal menyimpan jadwal ke database.');
    }
});
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