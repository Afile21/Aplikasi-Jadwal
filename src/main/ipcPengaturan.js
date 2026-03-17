// File: src/main/ipcPengaturan.js
const { ipcMain } = require("electron");
const db = require("./database");

function initIpcPengaturan() {
    ipcMain.on('ambil-pengaturan', (event) => {
        try {
            const kategoriList = db.prepare(`SELECT * FROM kategori`).all();
            const rutinitasList = db.prepare(`SELECT * FROM rutinitas`).all();
            event.reply('data-pengaturan', { kategori: kategoriList, rutinitas: rutinitasList });
        } catch (err) { console.error(err); }
    });

    ipcMain.on('tambah-kategori', (event, data) => {
        db.prepare(`INSERT INTO kategori (nama_kategori, kode_warna) VALUES (?, ?)`).run(data.nama, data.warna);
        event.reply('update-pengaturan-sukses');
    });

    ipcMain.on('hapus-kategori', (event, idKategori) => {
        const cekTerpakai = db.prepare(`SELECT COUNT(*) as total FROM jadwal WHERE id_kategori = ?`).get(idKategori);
        if (cekTerpakai.total > 0) {
            event.reply('gagal-hapus-kategori', 'Kategori ini sedang digunakan pada jadwal/rutinitas dan tidak bisa dihapus.');
        } else {
            db.prepare(`DELETE FROM kategori WHERE id_kategori = ?`).run(idKategori);
            event.reply('update-pengaturan-sukses');
        }
    });

    ipcMain.on('tambah-rutinitas', (event, data) => {
        db.prepare(`INSERT INTO rutinitas (id_kategori, judul_aktivitas, waktu_mulai, waktu_selesai, prioritas) VALUES (?, ?, ?, ?, ?)`).run(1, data.judul, data.mulai, data.selesai, 'Sedang');
        event.reply('update-pengaturan-sukses');
    });

    ipcMain.on('hapus-rutinitas', (event, idRutinitas) => {
        db.prepare(`DELETE FROM rutinitas WHERE id_rutinitas = ?`).run(idRutinitas);
        event.reply('update-pengaturan-sukses');
    });

    ipcMain.on('ambil-kategori-dropdown', (event) => {
        try {
            const kategori = db.prepare(`SELECT * FROM kategori`).all();
            event.reply('data-kategori-dropdown', kategori);
        } catch (err) { console.error(err); }
    });

    ipcMain.on('ambil-pengaturan-notif', (event) => {
        try {
            const suara = db.prepare(`SELECT nilai FROM pengaturan_sistem WHERE kunci = 'suara_notif'`).get();
            const mute = db.prepare(`SELECT nilai FROM pengaturan_sistem WHERE kunci = 'mute_notif'`).get();
            
            event.reply('data-pengaturan-notif', {
                suara: suara ? suara.nilai : 'sounds/suara-1.mp3',
                mute: mute ? mute.nilai : '0'
            });
        } catch (err) { console.error(err); }
    });

    ipcMain.on('simpan-pengaturan-notif', (event, data) => {
        try {
            db.prepare(`UPDATE pengaturan_sistem SET nilai = ? WHERE kunci = 'suara_notif'`).run(data.suara);
            db.prepare(`UPDATE pengaturan_sistem SET nilai = ? WHERE kunci = 'mute_notif'`).run(data.mute);
            event.reply('update-notif-sukses');
        } catch (err) { console.error(err); }
    });
}

module.exports = initIpcPengaturan;