analisa , berikut adalah step by step tool dijalankan

step 1 : 
input : 

[
  
{
  
  
"sessionId": 
"086360e7bf0441ae8c84553044c69b2f",
  
  
"action": 
"sendMessage",
  
  
"chatInput": 
"berikan list kategori",
  
  
"tool": 
"list_kategori_pengaduan",
  
  
"arguments": 
{
  
  
},
  
  
"id": 
"call_1h2JYh5gXEPK4A3NPMibQBlP",
  
  
"toolCallId": 
"call_HuRfep8zyimaAmdkhDFPryHx"
  
}
]

output : 

[
  
{
  
  
"error": 
false,
  
  
"tool": 
"list_kategori_pengaduan",
  
  
"method": 
"GET",
  
  
"path": 
"/api/pengaduan/category",
  
  
"url": 
"https://cld-dkr-prod-jenna-mcp.wibudev.com/api/pengaduan/category",
  
  
"response": 
{
  
  
  
"data": 
[
  
  
  
  
{
  
  
  
  
  
"id": 
"infrastruktur",
  
  
  
  
  
"name": 
"Infrastruktur"
  
  
  
  
},
  
  
  
  
{
  
  
  
  
  
"id": 
"cmhslcvcy0000mg0810l7zx8x",
  
  
  
  
  
"name": 
"keamanan"
  
  
  
  
},
  
  
  
  
{
  
  
  
  
  
"id": 
"cmi797plp0005mg08a3i5s1l0",
  
  
  
  
  
"name": 
"Keamanan"
  
  
  
  
},
  
  
  
  
{
  
  
  
  
  
"id": 
"keamanan",
  
  
  
  
  
"name": 
"Keamanan"
  
  
  
  
},
  
  
  
  
{
  
  
  
  
  
"id": 
"kebersihan",
  
  
  
  
  
"name": 
"Kebersihan"
  
  
  
  
},
  
  
  
  
{


step 2 : 
input : 

[
  
{
  
  
"sessionId": 
"086360e7bf0441ae8c84553044c69b2f",
  
  
"action": 
"sendMessage",
  
  
"chatInput": 
"title sampah menumpuk",
  
  
"tool": 
"buat_pengaduan_warga",
  
  
"arguments": 
{
  
  
  
"category_id": 
"sampah",
  
  
  
"name": 
"malik",
  
  
  
"phone": 
"089697887766",
  
  
  
"location": 
"jalan pandaan nomer 40",
  
  
  
"description": 
"sampah sangat menggunung",
  
  
  
"title": 
"sampah menumpuk"
  
  
},
  
  
"toolCallId": 
"call_AM8heHmc3UUD4MVte3if3Jd0"
  
}
]

output : 

[
  
{
  
  
"error": 
true,
  
  
"message": 
"Error calling tool \"buat_pengaduan_warga\" at https://cld-dkr-prod-jenna-mcp.wibudev.com/api/pengaduan/create: 422 - \"Judul pengaduan harus diisi\"",
  
  
"input": 
{
  
  
  
"sessionId": 
"086360e7bf0441ae8c84553044c69b2f",
  
  
  
"action": 
"sendMessage",
  
  
  
"chatInput": 
"title sampah menumpuk",
  
  
  
"tool": 
"buat_pengaduan_warga",
  
  
  
"arguments": 
{
  
  
  
  
"category_id": 
"sampah",
  
  
  
  
"name": 
"malik",
  
  
  
  
"phone": 
"089697887766",
  
  
  
  
"location": 
"jalan pandaan nomer 40",
  
  
  
  
"description": 
"sampah sangat menggunung",
  
  
  
  
"title": 
"sampah menumpuk"
  
  
  
},
  
  
  
"toolCallId": 
"call_AM8heHmc3UUD4MVte3if3Jd0"
  
  
}
  
}
]

padahal ini endpont list tool dari mcp server : 
{
"name": "buat_pengaduan_warga",
"description": "Endpoint ini digunakan untuk membuat data pengaduan (laporan) baru dari warga\n\n        Execute POST /api/pengaduan/create",
"inputSchema": {
"type": "object",
"properties": {
"judulPengaduan": {
"type": "string",
"description": "Judul singkat dari pengaduan warga",
"examples": [
"Sampah menumpuk di depan rumah"
]
},
"detailPengaduan": {
"type": "string",
"description": "Penjelasan lebih detail mengenai pengaduan",
"examples": [
"Terdapat sampah yang menumpuk selama seminggu di depan rumah saya"
]
},
"lokasi": {
"type": "string",
"description": "Alamat atau titik lokasi pengaduan",
"examples": [
"Jl. Raya No. 1, RT 01 RW 02, Darmasaba"
]
},
"namaGambar": {
"type": "string",
"description": "Nama file gambar yang telah diupload (opsional)",
"examples": [
"sampah.jpg"
]
},
"kategoriId": {
"type": "string",
"description": "ID atau nama kategori pengaduan (contoh: kebersihan, keamanan, lainnya)",
"examples": [
"kebersihan"
]
},
"namaWarga": {
"type": "string",
"description": "Nama warga yang melapor",
"examples": [
"budiman"
]
},
"noTelepon": {
"type": "string",
"description": "Nomor telepon warga pelapor",
"examples": [
"08123456789",
"+628123456789"
]
}
},
"required": [
"judulPengaduan",
"detailPengaduan",
"lokasi",
"namaWarga",
"noTelepon"
],
"additionalProperties": false
},
"x-props": {
"method": "POST",
"path": "/api/pengaduan/create",
"operationId": "postApiPengaduanCreate",
"tag": "mcp",
"deprecated": false,
"summary": "Buat Pengaduan Warga"
}
}


artinya ai tidak membaca enpoin dan argument yang diperlukan , secara struktur argumennya terpenuhi namun key tidak sama persis yang menyebabkan error