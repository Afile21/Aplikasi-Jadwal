// File: src/main/main.js
const { app, BrowserWindow, ipcMain, Notification } = require("electron"); 
const path = require("path");
require("electron-reload")(path.join(__dirname, "../../"));

// 1. Panggil Database
const db = require("./database");

// 2. Registrasi Semua Modul IPC
const initIpcJadwal = require("./ipcJadwal");
initIpcJadwal();

const initIpcProyek = require("./ipcProyek");
initIpcProyek();

const initIpcStatistik = require("./ipcStatistik");
initIpcStatistik();

const initIpcPengaturan = require("./ipcPengaturan");
initIpcPengaturan();

// 3. Konfigurasi Notifikasi Bawaan OS
app.setAppUserModelId("Aplikasi.Jadwal.Ku"); 
ipcMain.on('tampilkan-notifikasi', (event, data) => {
    if (Notification.isSupported()) {
        const notif = new Notification({ title: data.title, body: data.body });
        notif.show(); 
    }
});

// 4. Siklus Hidup Aplikasi (Window Creation)
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false, // [UBAH INI] Matikan akses langsung ke Node.js dari UI
            contextIsolation: true, // [UBAH INI] Lindungi objek window global agar tidak tercemar
            preload: path.join(__dirname, "preload.js") // [TAMBAHAN BARU] Siapkan jembatan komunikasi
        },
    });

    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    db.close(); 
    if (process.platform !== "darwin") app.quit();
});