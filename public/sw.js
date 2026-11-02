// Service Worker pour Catalogue GMI PWA
const CACHE_NAME = 'gmi-catalogue-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.png'
];

// Installation : mise en cache des assets statiques initiaux
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches éventuels
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch : priorité au réseau pour les appels API / Supabase, et cache pour les assets statiques
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non GET ou externes non standard
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Pour les appels Supabase ou API : toujours réseau direct (jamais de cache périmé pour les prix/produits)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Pour l'application : réseau en priorité, fallback cache si hors-ligne
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Mettre en cache une copie de la réponse valide
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si navigation HTML hors-ligne, renvoyer la racine en cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
