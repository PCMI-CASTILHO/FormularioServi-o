// Nome do cache — altere o número sempre que mudar algo
const CACHE_NAME = 'formulario-cache-v17';

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
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando arquivos essenciais...');
        return cache.addAll(ASSETS);
      })
      .catch(error => {
        console.error('Service Worker: Erro ao fazer cache:', error);
        // Mesmo se falhar, continua a instalação
        return caches.open(CACHE_NAME);
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
  // Ignora requisições não GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se tiver no cache, retorna
        if (response) {
          return response;
        }

        // Caso contrário, busca na rede
        return fetch(event.request)
          .then(networkResponse => {
            // Verifica se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clona a resposta para armazenar no cache
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Se falhar e for uma página, retorna a página offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            // Para outros recursos, retorna uma resposta vazia ou fallback
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
