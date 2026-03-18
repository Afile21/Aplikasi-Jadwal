// File: src/renderer/js/pengaturan.js

// Kita export variabel ini agar sistem alarm di renderer.js tetap bisa membacanya
export let suaraNotifPilihan = 'sounds/suara-1.mp3';
export let isMuteNotif = false;

// Fungsi untuk memperbarui dropdown kategori di pop-up tambah jadwal
export function loadKategori() {
    window.electronAPI.send('ambil-kategori-dropdown');
}

export function initPengaturan() {
    // --- 1. Menerima dan merender data Kategori & Rutinitas ---
    window.electronAPI.receive('data-pengaturan', (data) => {
        const wadahKategori = document.getElementById('list-kategori-container');
        const wadahRutinitas = document.getElementById('list-rutinitas-container');
        
        wadahKategori.innerHTML = '';
        data.kategori.forEach(kat => {
            wadahKategori.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-sidebar); border-radius: 4px; border-left: 4px solid ${kat.kode_warna};">
                    <span>${kat.nama_kategori}</span>
                    <button class="btn-hapus-kat" data-id="${kat.id_kategori}" style="background: transparent; border: none; cursor: pointer;">🗑️</button>
                </div>
            `;
        });

        wadahRutinitas.innerHTML = '';
        data.rutinitas.forEach(rutin => {
            wadahRutinitas.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-sidebar); border-radius: 4px;">
                    <div>
                        <strong>${rutin.judul_aktivitas}</strong><br>
                        <span style="font-size: 12px; color: var(--text-secondary);">🕒 ${rutin.waktu_mulai} - ${rutin.waktu_selesai}</span>
                    </div>
                    <button class="btn-hapus-rutin" data-id="${rutin.id_rutinitas}" style="background: transparent; border: none; cursor: pointer;">🗑️</button>
                </div>
            `;
        });

        // Event Listener Hapus
        document.querySelectorAll('.btn-hapus-kat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm("Hapus kategori ini?")) window.electronAPI.send('hapus-kategori', e.target.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.btn-hapus-rutin').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm("Hapus rutinitas ini? Jadwal otomatis tidak akan muncul lagi besok.")) window.electronAPI.send('hapus-rutinitas', e.currentTarget.getAttribute('data-id'));
            });
        });
    });

    // --- 2. Event Tambah ---
    document.getElementById('form-tambah-kategori').addEventListener('submit', (e) => {
        e.preventDefault();
        const nama = document.getElementById('input-nama-kat').value;
        const warna = document.getElementById('input-warna-kat').value;
        window.electronAPI.send('tambah-kategori', { nama, warna });
        e.target.reset();
    });

    document.getElementById('form-tambah-rutinitas').addEventListener('submit', (e) => {
        e.preventDefault();
        const judul = document.getElementById('input-judul-rutin').value;
        const mulai = document.getElementById('input-mulai-rutin').value;
        const selesai = document.getElementById('input-selesai-rutin').value;
        window.electronAPI.send('tambah-rutinitas', { judul, mulai, selesai });
        e.target.reset();
    });

    // --- 3. Refresh UI Jika Sukses ---
    window.electronAPI.receive('update-pengaturan-sukses', () => {
        window.electronAPI.send('ambil-pengaturan');
        loadKategori();
    });

    window.electronAPI.receive('gagal-hapus-kategori', (pesan) => {
        alert(pesan);
    });

    // --- 4. Dropdown Kategori ---
    window.electronAPI.receive('data-kategori-dropdown', (kategoriList) => {
        const select = document.getElementById('input-kategori');
        select.innerHTML = ''; 
        kategoriList.forEach(k => {
            const option = document.createElement('option');
            option.value = k.id_kategori;
            option.textContent = k.nama_kategori;
            select.appendChild(option);
        });
    });

    // --- 5. PENGATURAN NOTIFIKASI ---
    // A. Minta daftar file audio dari folder lokal terlebih dahulu
    window.electronAPI.send('ambil-daftar-suara');
    
    window.electronAPI.receive('data-daftar-suara', (fileAudio) => {
        const selectSuara = document.getElementById('input-suara-notif');
        if(selectSuara) {
            selectSuara.innerHTML = ''; // Kosongkan teks "Memuat..."
            
            if(fileAudio.length === 0) {
                selectSuara.innerHTML = '<option value="">(Tidak ada file audio)</option>';
            } else {
                fileAudio.forEach(file => {
                    const pathAudio = `../assets/sounds/${file}`;
                    
                    // [LOGIKA BARU] Hapus teks dari titik (.) terakhir, apapun ekstensinya
                    const namaTanpaEkstensi = file.substring(0, file.lastIndexOf('.'));
                    // Rapikan tanda strip menjadi spasi dan jadikan huruf kapital
                    const namaTampil = namaTanpaEkstensi.replace(/-/g, ' ').toUpperCase();
                    
                    selectSuara.innerHTML += `<option value="${pathAudio}">${namaTampil}</option>`;
                });
            }
        }
        
        // B. SETELAH dropdown terisi, baru kita minta preferensi yang tersimpan di database
        window.electronAPI.send('ambil-pengaturan-notif');
    });

    window.electronAPI.receive('data-pengaturan-notif', (data) => {
        suaraNotifPilihan = data.suara;
        isMuteNotif = (data.mute === '1');

        const selectSuara = document.getElementById('input-suara-notif');
        const checkMute = document.getElementById('input-mute-notif');
        if (selectSuara) selectSuara.value = data.suara; // Menandai opsi yang sedang aktif
        if (checkMute) checkMute.checked = isMuteNotif;
    });

    document.getElementById('form-pengaturan-notif').addEventListener('submit', (e) => {
        e.preventDefault();
        const suara = document.getElementById('input-suara-notif').value;
        const mute = document.getElementById('input-mute-notif').checked ? '1' : '0';
        window.electronAPI.send('simpan-pengaturan-notif', { suara, mute });
    });

    window.electronAPI.receive('update-notif-sukses', () => {
        alert("Preferensi notifikasi berhasil disimpan!");
        window.electronAPI.send('ambil-pengaturan-notif'); 
    });

    document.getElementById('btn-tes-suara').addEventListener('click', () => {
        const suaraTes = document.getElementById('input-suara-notif').value;
        const audio = new Audio(suaraTes);
        audio.play().catch(e => alert("Gagal memutar suara. Pastikan file " + suaraTes + " ada di dalam folder 'sounds'."));
    });
}