/**
 * ========================================================
 * ZettBOT 2.1 - PWA SERVICE WORKER (sw.js)
 * Koperasi PANEN - Penanganan Caching Shell dan Offline Fallback
 * ========================================================
 */

const CACHE_NAME = 'panen-pwa-cache-v2.2'; // ZETTBOS FIX: Naikkan versi cache untuk memicu instalasi ulang SW
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'sw.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
  // ZETTBOS FIX: Dihapus -> 'https://lh3.googleusercontent.com/...'. 
  // Alasan: Google Drive menolak caching langsung dari Service Worker (Opaque Response).
];

// 1. Tahap INSTALL: Menyimpan aset-aset statis penting ke dalam Cache storage browser
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Zettbos PWA Cache Pre-loading assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Tahap ACTIVATE: Membersihkan cache versi lama jika ada pembaruan sistem baru
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Zettbos PWA Clearing old cache: ', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Tahap FETCH: Mengambil aset dari cache secara instan (Offline-first untuk PWA Shell)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // =========================================================================
  // ZETTBOS FIX: PENGECUALIAN MUTLAK (BYPASS CACHE) UNTUK DOMAIN EKSTERNAL
  // Mencegah error "Failed to fetch / Opaque Response" dan logo gambar pecah (crash)
  // =========================================================================
  if (
    url.hostname.includes('lh3.googleusercontent.com') || 
    url.hostname.includes('drive.google.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com')
  ) {
    // Dengan mereturn tanpa event.respondWith, Service Worker akan membiarkan 
    // browser melakukan request HTTP biasa secara native.
    return; 
  }

  // Hanya tangani request HTTP/HTTPS (hindari memproses ekstensi Chrome atau skema chrome-extension://)
  if (event.request.url.startsWith('http')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Kembalikan file dari cache jika ada, jika tidak lakukan request jaringan (network) biasa
          return response || fetch(event.request);
        })
    );
  }
});
