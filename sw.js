importScripts('https://cdn.jsdelivr.net/npm/idb@8/build/umd.js');
// Nome do cache — altere sempre que atualizar
const CACHE_NAME = 'formulario-cache-46';

// Arquivos para cache inicial - URLs ABSOLUTAS
const ASSETS_TO_CACHE = [
  'https://pcmi-castilho.github.io/FormularioServi-o/',
  'https://pcmi-castilho.github.io/FormularioServi-o/index.html',
  'https://pcmi-castilho.github.io/FormularioServi-o/manifest.json',
  // CDNs externos que você usa
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js'
];

// Instalação - cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  console.log('🟢 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cacheando arquivos essenciais');
        // Cache apenas os arquivos principais, ignora erros em outros
        return cache.addAll([
          'https://pcmi-castilho.github.io/FormularioServi-o/',
          'https://pcmi-castilho.github.io/FormularioServi-o/index.html'
        ]).catch(error => {
          console.warn('⚠️ Alguns arquivos não puderam ser cacheados:', error);
        });
      })
      .then(() => {
        console.log('✅ Service Worker: Instalação completa');
        return self.skipWaiting();
      })
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('🔵 Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Ativação completa');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições - ESTRATÉGIA INTELIGENTE
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Para APIs de sincronização, sempre vai para rede
  if (url.hostname === 'vps.com') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Para CDNs externas, tenta cache primeiro, depois rede
  if (url.hostname !== 'servicos.com') {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }
  
  // Para recursos do próprio site (servicos.pesoexato.com)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // SEMPRE tenta a rede primeiro para conteúdo dinâmico
        return fetch(event.request)
          .then((networkResponse) => {
            // Se conseguiu da rede, atualiza o cache
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            // Se a rede falhou, usa o cache
            if (cachedResponse) {
              console.log('📂 Servindo do cache (offline):', event.request.url);
              return cachedResponse;
            }
            
            // Fallback para páginas HTML
            if (event.request.destination === 'document' || 
                event.request.mode === 'navigate') {
              return caches.match('https://pcmi-castilho.github.io/FormularioServi-o/index.html')
                .then(html => html || criarPaginaOffline());
            }
            
            // Para outros recursos, retorna erro
            return new Response('Recurso offline', { status: 503 });
          });
      })
  );
});

// Página offline customizada
function criarPaginaOffline() {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modo Offline - Serviço Selaves</title>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .offline-container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
        }
        .offline-icon {
            font-size: 80px;
            color: #667eea;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 15px;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .btn {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📶</div>
        <h1>Você está offline</h1>
        <p>O aplicativo de formulários de serviço continua funcionando, mas algumas funcionalidades que requerem internet estarão temporariamente indisponíveis.</p>
        <p>Você pode continuar preenchendo formulários e eles serão sincronizados automaticamente quando a conexão voltar.</p>
        <button class="btn" onclick="window.location.reload()">Tentar Novamente</button>
    </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// ADICIONE no final do seu sw.js:
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-formularios') {
        console.log('📱 Background Sync disparado!');
        event.waitUntil(sincronizarFormulariosEmBackground());
    }
});

async function sincronizarFormulariosEmBackground() {
    try {
        // Abre o banco
        const db = await idb.openDB('FormulariosDB', 4);
        const todosForms = await db.getAll('formularios');
        const pendentes = todosForms.filter(f => !f.sincronizado);
        
        console.log(`🔄 Sincronizando ${pendentes.length} formulários em background...`);
        
        for (const form of pendentes) {
            const dados = form.formData || {};

            // Monta o payload limpo (sem fotos/assinaturas)
            const payload = {
                json_dados: {
                    id: form.id,
                    createdAt: form.createdAt || new Date().toISOString(),
                    cliente: dados.cliente || '',
                    tecnico: dados.tecnico || '',
                    servico: dados.servico || '',
                    cidade: dados.cidade || '',
                    equipamento: dados.equipamento || '',
                    numeroSerie: dados.numeroSerie || '',
                    dataInicial: dados.dataInicial || '',
                    dataFinal: dados.dataFinal || '',
                    horaInicial: dados.horaInicial || '',
                    horaFinal: dados.horaFinal || '',
                    veiculo: dados.veiculo || '',
                    estoque: dados.estoque || '',
                    relatorioMaquina: dados.relatorioMaquina || '',
                    materiais: Array.isArray(form.materiais) ? form.materiais : [],
                    hasFotos: Array.isArray(form.fotos) && form.fotos.length > 0,
                    hasAssinaturas: !!(form.assinaturas && (form.assinaturas.cliente || form.assinaturas.tecnico)),
                    chaveUnica: form.chaveUnica || ''
                },
                chave: form.chaveUnica
            };

            console.log('[SW] Enviando PDFs:', {
              ficha: form.pdfFicha ? form.pdfFicha.length : 0,
              relatorio: form.pdfRelatorio ? form.pdfRelatorio.length : 0
            });

            // Anexa PDFs (se existirem)
            if (form.pdfFicha) {
                payload.json_dados.pdfFicha = form.pdfFicha;
            }
            if (form.pdfRelatorio) {
                payload.json_dados.pdfRelatorio = form.pdfRelatorio;
            }

            // Envia ao servidor
            const response = await fetch('https://vps.pesoexato.com/servico_set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                form.sincronizado = true;
                form.syncedAt = new Date().toISOString();
                await db.put('formularios', form);
                console.log(`✅ Formulário ${form.id} sincronizado em background`);
            } else {
                console.warn(`⚠️ Falha ao sincronizar formulário ${form.id}: ${response.status}`);
            }
        }
    } catch (error) {
        console.error('❌ Erro no Background Sync:', error);
    }
}
