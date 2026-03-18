// File: src/main/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Mengekspos API khusus ke window global di sisi renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Fungsi untuk MENGIRIM pesan dari Renderer ke Main
    send: (channel, data) => {
        // Daftar channel yang diizinkan (Whitelisting) untuk keamanan
        let validChannels = [
            'simpan-jadwal', 'ambil-jadwal', 'update-status', 'hapus-jadwal', 'edit-jadwal',
            'ambil-proyek', 'tambah-proyek', 'hapus-proyek', 'update-milestone',
            'ambil-statistik',
            'ambil-pengaturan', 'tambah-kategori', 'hapus-kategori', 'tambah-rutinitas', 'hapus-rutinitas', 'ambil-kategori-dropdown', 'ambil-pengaturan-notif', 'simpan-pengaturan-notif',
            'tampilkan-notifikasi','ambil-daftar-suara'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    // Fungsi untuk MENERIMA pesan dari Main ke Renderer
    receive: (channel, func) => {
        let validChannels = [
            'simpan-sukses', 'simpan-gagal', 'data-jadwal', 'update-sukses',
            'data-proyek', 'update-proyek-sukses',
            'data-statistik',
            'data-pengaturan', 'update-pengaturan-sukses', 'gagal-hapus-kategori', 'data-kategori-dropdown', 'data-pengaturan-notif', 'update-notif-sukses', 'data-daftar-suara'
        ];
        if (validChannels.includes(channel)) {
            // Hapus listener lama sebelum menambah yang baru agar tidak terjadi kebocoran memori (memory leak) / pemanggilan ganda
            ipcRenderer.removeAllListeners(channel);
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});