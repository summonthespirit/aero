import { chooseWisp, testWisp, normalizeWisp } from './wisp-check.js';

const status = document.getElementById('status');
const bgVideo = document.getElementById('background-video');

bgVideo.play().catch(() => {
  window.addEventListener('click', () => { bgVideo.play(); }, { once: true });
});

const settings = document.getElementById('settings');
const gear = document.getElementById('gear');
const overlay = document.getElementById('overlay');
const wispInputForm = document.getElementById('wispInput');
const wispInputBox = document.getElementById('websocket');
const transports = document.querySelectorAll('input[name="transport"]');
const searchEnginePicker = document.getElementById('searchEnginePicker');
const iframe = document.getElementById('browser');
const titleDiv = document.querySelector('.title');
const searchForm = document.getElementById('search');
const urlInput = document.getElementById('url');
const loadBar = document.getElementById('load-bar');

gear.onclick = () => { overlay.classList.toggle('active'); settings.classList.toggle('open'); };
overlay.onclick = e => { if (e.target === overlay) { overlay.classList.remove('active'); settings.classList.remove('open'); } };
document.onkeydown = e => { if (e.key === 'Escape') { overlay.classList.remove('active'); settings.classList.remove('open'); } };

let pendingQuery = null;
let handleSearch = null;
searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const q = urlInput.value.trim();
  if (!q) return;
  if (handleSearch) {
    handleSearch(q);
  } else {
    pendingQuery = q;
    status.style.display = '';
    status.textContent = 'starting up… your search will open when ready';
  }
});
wispInputForm.addEventListener('submit', event => event.preventDefault());

function startLoadBar() {
  loadBar.style.transition = 'none';
  loadBar.style.width = '0%';
  loadBar.style.opacity = '1';
  void loadBar.offsetWidth;
  loadBar.style.transition = 'width 0.3s ease';
  loadBar.style.width = '85%';
}

function finishLoadBar() {
  loadBar.style.width = '100%';
  setTimeout(() => {
    loadBar.style.opacity = '0';
    setTimeout(() => { loadBar.style.width = '0%'; }, 300);
  }, 200);
}

const BASE = new URL('./', document.baseURI).pathname;
const WISP_SERVERS = [
  'wss://w.oneyplaysbestf.art/',
  'wss://wisp.mercurywork.shop/wisp/',
  'wss://wisp.mercurywork.shop/',
  'wss://wisp-85822.wasmer.app/',
  'wss://arctic.lat/wisp/',
  'wss://anura.pro/',
  'wss://arctic.lat/_q/',
  'wss://wisp.freewisp.org/',
  'wss://gointospace.app/wisp/'
];
const DEFAULT_WISP = WISP_SERVERS[0];
const DEFAULT_TRANSPORT = 'epoxy';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const getSavedTransport = () => {
  const t = store.get('fish-transport');
  return t === 'epoxy' || t === 'libcurl' ? t : DEFAULT_TRANSPORT;
};
const getSavedWisp = () => store.get('fish-wisp') || DEFAULT_WISP;

const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error('Failed to load ' + src));
  document.head.append(s);
});

async function makeTransport(method, wisp) {
  const mod = await import(BASE + method + '/index.mjs');
  const Client = mod.default;
  return new Client({ wisp });
}

try {
  status.textContent = 'registering service worker…';
  const registration = await navigator.serviceWorker.register(BASE + 'sw.js', {
    scope: BASE,
    updateViaCache: 'none',
  });
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    await new Promise(resolve =>
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
    );
  }
  const serviceworker = navigator.serviceWorker.controller ?? registration.active;
  if (!serviceworker) throw new Error('The service worker did not become active');

  status.textContent = 'loading engine…';
  for (const src of ['scram/scramjet.js', 'controller/controller.api.js']) {
    await loadScript(BASE + src);
  }
  const api = window.$scramjetController;

  let utils = null;
  for (const name of ['scramjet-utils.mjs', 'scramjet-utils.js']) {
    try {
      const mod = await import(BASE + 'utils/' + name);
      utils = { ...(mod.default ?? {}), ...mod };
      break;
    } catch (err) {
      console.warn('utils import failed for', name, err);
    }
  }
  if (!utils) console.warn('scramjet-utils not loaded: plugins disabled');

  status.textContent = 'connecting transport…';
  let currentTransport = getSavedTransport();
  status.textContent = 'checking wisp servers…';
  const picked = await chooseWisp({
    servers: [store.get('fish-wisp'), ...WISP_SERVERS],
    onStatus: t => { status.style.display = ''; status.textContent = t; },
  });
  let WISP = picked.url;
  if (picked.manual) store.set('fish-wisp', WISP);
  try {
    transport = await makeTransport(currentTransport, WISP);
  } catch (err) {
    console.warn('transport failed, falling back to libcurl', err);
    currentTransport = 'libcurl';
    store.set('fish-transport', 'libcurl');
    transport = await makeTransport('libcurl', WISP);
  }

  status.textContent = 'starting controller…';
  const controller = new api.Controller({
    serviceworker,
    transport,
    config: {
      prefix: BASE + '~/sj/',
      scramjetPath: BASE + 'scram/scramjet.js',
      wasmPath: BASE + 'scram/scramjet.wasm',
      injectPath: BASE + 'controller/controller.inject.js',
    },
  });
  await controller.wait();

  setInterval(() => {
    navigator.serviceWorker.controller?.postMessage('keepalive');
  }, 15000);

  const plugins = [];
  if (utils?.UrlWatcherPlugin) plugins.push(new utils.UrlWatcherPlugin(() => finishLoadBar()));
  const frame = controller.createFrame(iframe, { plugins });

  wispInputBox.value = WISP;
  const radioCheck = document.querySelector(`input[name="transport"][value="${currentTransport}"]`);
  if (radioCheck) radioCheck.checked = true;
  searchEnginePicker.value = store.get('selectedSearchEngine') || 'brave';

  status.textContent = 'ready';
  setTimeout(() => { status.style.display = 'none'; }, 1000);

  const searchTemplates = {
    google: 'https://www.google.com/search?q=%s',
    bing: 'https://www.bing.com/search?q=%s',
    duckduckgo: 'https://duckduckgo.com/?q=%s',
    brave: 'https://search.brave.com/search?q=%s',
  };

  function search(input) {
    if (!input) return '';
    try { return new URL(input).toString(); } catch {}
    try {
      const url = new URL(`http://${input}`);
      if (url.hostname.includes('.')) return url.toString();
    } catch {}
    const engine = store.get('selectedSearchEngine') || 'brave';
    const template = searchTemplates[engine] || searchTemplates.brave;
    return template.replace('%s', encodeURIComponent(input));
  }

  async function applyTransport() {
    const next = await makeTransport(currentTransport, WISP);
    await controller.setTransport(next);
  }

  function flashStatus(text, color) {
    status.style.display = '';
    status.style.color = color || '';
    status.textContent = text;
    setTimeout(() => { status.style.display = 'none'; status.style.color = ''; }, 4000);
  }

  wispInputForm.addEventListener('submit', async event => {
    event.preventDefault();
    const newWisp = normalizeWisp(wispInputBox.value);
    if (!newWisp) return flashStatus('enter a valid wisp address', '#f87171');
    flashStatus('testing wisp server…');
    if (!(await testWisp(newWisp))) {
      return flashStatus("couldn't reach that wisp server (blocked or offline)", '#f87171');
    }
    WISP = newWisp;
    wispInputBox.value = newWisp;
    store.set('fish-wisp', newWisp);
    await applyTransport();
    flashStatus('wisp server updated');
  });

  transports.forEach(radio => {
    radio.addEventListener('change', async event => {
      currentTransport = event.target.value;
      store.set('fish-transport', currentTransport);
      WISP = wispInputBox.value.trim() || WISP;
      await applyTransport();
    });
  });

  searchEnginePicker.addEventListener('change', event => {
    store.set('selectedSearchEngine', event.target.value);
  });

  iframe.addEventListener('load', finishLoadBar);

  handleSearch = query => {
    bgVideo.pause();
    bgVideo.muted = true;

    const target = search(query);

    titleDiv.style.display = 'none';
    searchForm.style.position = 'fixed';
    searchForm.style.top = '15px';
    searchForm.style.left = '2rem';
    searchForm.style.transform = 'none';

    startLoadBar();
    iframe.classList.add('visible');
    frame.go(target);
  };

  if (pendingQuery) {
    const q = pendingQuery;
    pendingQuery = null;
    handleSearch(q);
  }
} catch (err) {
  status.style.display = '';
  status.style.color = '#f87171';
  status.textContent = 'error: ' + err.message;
  console.error('init error:', err);
}