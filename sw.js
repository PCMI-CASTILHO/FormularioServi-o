// Nome do cache — altere o número sempre que mudar algo
const CACHE_NAME = 'formulario-cache-v18';

// Instala o service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalado');
  
  // Pula a fase de waiting e ativa imediatamente
  self.skipWaiting();
});

// Ativação — remove caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativado');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Assume o controle de todas as abas imediatamente
  return self.clients.claim();
});

// Intercepta requisições (estratégia: Network First)
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET e de outros origens
  if (event.request.method !== 'GET') return;
  
  // Para a API de sincronização, sempre vai para a rede
  if (event.request.url.includes('pesoexato.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a rede respondeu, cacheia e retorna
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseClone);
          });
        return response;
      })
      .catch(() => {
        // Se a rede falhou, tenta buscar do cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se não tem no cache e é uma página HTML, retorna a página offline
            if (event.request.destination === 'document' || 
                event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // Para outros recursos, retorna erro offline
            return new Response('Recurso offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
