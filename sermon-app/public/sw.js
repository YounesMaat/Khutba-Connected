// Nom du cache pour permettre un fonctionnement fluide
const CACHE_NAME = 'jumuaa-live-v1';

// Lors de l'installation, on force le SW à prendre le contrôle immédiatement
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Stratégie de "Network First" : On cherche toujours le son le plus récent sur le réseau
// mais le fait d'avoir ce gestionnaire autorise l'installation PWA sur mobile.
self.addEventListener('fetch', (event) => {
    // On ne met pas l'audio en cache pour éviter de saturer la mémoire du téléphone
    // et pour garantir que l'on écoute bien le direct.
    event.respondWith(fetch(event.request));
});