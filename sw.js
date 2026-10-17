// Keeps the sign-up page (fonts, logos, team photo) working if the booth's wifi drops.
// Bump the version number whenever you change index.html.
const CACHE = 'tpa-signup-v5';

const SITE_ASSETS = [
  'https://teamperezaguilar.com/uploads/team-photo.jpg',
  'https://teamperezaguilar.com/sfr-logo.png',
  'https://teamperezaguilar.com/alterra-logo.png',
  'https://teamperezaguilar.com/realtor-mls-logo.png',
  'https://teamperezaguilar.com/uploads/eb1f234b-b60c-46e5-ae0d-5562820f772a.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(['./', './index.html', './tile-band.jpg', './footer-limewash.jpg']);
    // Website images: saved ahead of time so the booth works offline from the first visit.
    await Promise.all(SITE_ASSETS.map(u =>
      fetch(new Request(u, { mode: 'no-cors' })).then(res => c.put(u, res)).catch(() => {})
    ));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  const scope = new URL(self.registration.scope);
  const isPage = req.mode === 'navigate' && url.origin === scope.origin &&
    (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');

  if (isPage) {
    // Network first, fall back to the saved copy when offline.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const ownImage = url.origin === scope.origin && /\.(jpg|jpeg|png)$/i.test(url.pathname);
  if (ownImage || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'teamperezaguilar.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
