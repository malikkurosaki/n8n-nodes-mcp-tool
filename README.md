# n8n Node: Wajs

Ini adalah *community node* n8n untuk berinteraksi dengan layanan Wajs.

[![n8n-compatible](https://img.shields.io/badge/n8n-compatible-success.svg)](https://n8n.io)
[![npm version](https://img.shields.io/npm/v/n8n-nodes-wajs.svg)](https://www.npmjs.com/package/n8n-nodes-wajs)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://spdx.org/licenses/MIT.html)

## Kompatibilitas n8n

Telah diuji dengan n8n versi `1.117.1` dan yang lebih baru.

## Instalasi

1.  Buka n8n.
2.  Pergi ke **Settings > Community Nodes**.
3.  Pilih **Install**.
4.  Masukkan `n8n-nodes-wajs` sebagai nama paket npm.
5.  Klik **Install**.

Setelah instalasi selesai, node akan muncul di panel node Anda.

## Kredensial

Node ini memerlukan kredensial untuk terhubung ke Wajs.

1.  Dari sidebar n8n, buka **Credentials > New**.
2.  Cari **Wajs Credentials** dan pilih.
3.  Isi informasi yang diperlukan untuk mengautentikasi akun Wajs Anda.

## Operasi

Node ini menyediakan operasi berikut:
*   **Wajs**: Operasi utama untuk berinteraksi dengan API Wajs.

## Pengembangan (Development)

Berikut adalah cara untuk melakukan pengembangan pada node ini secara lokal.

### Prasyarat
-   [Bun](https://bun.sh/) terinstal di sistem Anda.
-   Lingkungan n8n untuk pengujian.

### Setup
1.  Clone repositori ini.
2.  Jalankan `bun install` untuk menginstal semua dependensi.

### Skrip yang Tersedia

-   `bun run init`: Menginisialisasi proyek.
-   `bun run build`: Mem-build node dari source code TypeScript.
-   `bun run generate`: Men-generate file definisi node.
-   `bun run version:update`: Memperbarui versi patch pada `package.json`.
-   `bun run publish`: Menjalankan proses build, update versi, dan publikasi (memerlukan konfigurasi lebih lanjut).

## Lisensi

Dilisensikan di bawah [Lisensi MIT](LICENSE.md).