const { app, BrowserWindow } = require("electron");
const path = require("path");
require("electron-reload")(__dirname);
const Database = require("better-sqlite3"); // Memanggil modul database

// 1. Inisialisasi Database (Akan otomatis membuat file database.db jika belum ada)
const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

// 2. Membuat Tabel (Hanya dibuat jika tabel belum ada)
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

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Menyembunyikan menu bar bawaan agar terlihat lebih modern
    win.setMenuBarVisibility(false);

    win.loadFile("index.html");

    //win.webContents.openDevTools();
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
    // Menutup koneksi database saat aplikasi ditutup
    db.close(); 
    if (process.platform !== "darwin") {
        app.quit();
    }
});