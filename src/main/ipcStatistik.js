// File: src/main/ipcStatistik.js
const { ipcMain } = require("electron");
const db = require("./database");

function formatTglDB(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function initIpcStatistik() {
    ipcMain.on('ambil-statistik', (event) => {
        try {
            const hitungPoin = (tanggal) => {
                const tugasSelesai = db.prepare(`SELECT prioritas FROM jadwal WHERE tanggal = ? AND status = 'Done'`).all(tanggal);
                let poin = 0;
                tugasSelesai.forEach(t => {
                    if (t.prioritas === 'Tinggi') poin += 3;
                    else if (t.prioritas === 'Sedang') poin += 2;
                    else poin += 1;
                });
                return poin;
            };

            const hariIni = new Date();
            const kemarin = new Date(); kemarin.setDate(kemarin.getDate() - 1);
            
            const poinHariIni = hitungPoin(formatTglDB(hariIni));
            const poinKemarin = hitungPoin(formatTglDB(kemarin));

            const labelHari = [];
            const dataSelesai = [];
            const dataBelum = [];
            const namaHariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

            for (let i = 6; i >= 0; i--) {
                const tgl = new Date(); tgl.setDate(tgl.getDate() - i);
                const strTglDB = formatTglDB(tgl);
                
                labelHari.push(i === 0 ? 'Hari Ini' : namaHariArr[tgl.getDay()]);

                const selesai = db.prepare(`SELECT COUNT(*) as jml FROM jadwal WHERE tanggal = ? AND status = 'Done'`).get(strTglDB).jml;
                const belum = db.prepare(`SELECT COUNT(*) as jml FROM jadwal WHERE tanggal = ? AND status != 'Done'`).get(strTglDB).jml;

                dataSelesai.push(selesai);
                dataBelum.push(belum);
            }

            event.reply('data-statistik', {
                skor: { hariIni: poinHariIni, kemarin: poinKemarin },
                grafik: { label: labelHari, selesai: dataSelesai, belum: dataBelum }
            });
        } catch (err) { console.error(err); }
    });
}

module.exports = initIpcStatistik;