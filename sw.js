// Nome do cache — altere o número sempre que mudar algo
const CACHE_NAME = 'formulario-cache-v6';

// Lista de arquivos que o app precisa para funcionar offline
const ASSETS = [
  'index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instala o service worker e faz o cache dos arquivos base
self.addEventListener('install', event => {
  console.log('Service Worker: Instalado');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Cacheando arquivos essenciais...');
      return cache.addAll(ASSETS);
    })
  );

  // Força o SW a ser ativado imediatamente
  self.skipWaiting();
});

// Ativação — remove caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativado');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  // Faz o SW assumir o controle imediatamente
  return self.clients.claim();
});

// Intercepta requisições (modo offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Se tiver no cache, retorna
      if (response) return response;

      // Caso contrário, busca na rede e armazena no cache
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Aqui você pode retornar uma página offline customizada se quiser
      });
    })
  );
});
