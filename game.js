const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 12, ROWS = 10, TILE = 40;
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

// === KONSTANTEN & DATEN ===
const maps = [
  [{c:0,r:1},{c:9,r:1},{c:9,r:4},{c:2,r:4},{c:2,r:7},{c:10,r:7},{c:10,r:9}],
  [{c:0,r:1},{c:10,r:1},{c:10,r:8},{c:1,r:8},{c:1,r:3},{c:8,r:3},{c:8,r:6},{c:4,r:6},{c:4,r:5}],
  [{c:1,r:0},{c:1,r:8},{c:4,r:8},{c:4,r:1},{c:7,r:1},{c:7,r:8},{c:10,r:8},{c:10,r:1}],
  [{c:0,r:4},{c:5,r:4},{c:5,r:1},{c:9,r:1},{c:9,r:8},{c:3,r:8},{c:3,r:6},{c:11,r:6}],
  [{c:0,r:1},{c:11,r:1},{c:11,r:3},{c:1,r:3},{c:1,r:5},{c:11,r:5},{c:11,r:7},{c:1,r:7},{c:1,r:9},{c:11,r:9}],
  [{c:0,r:0},{c:11,r:0},{c:11,r:9},{c:0,r:9},{c:0,r:2},{c:9,r:2},{c:9,r:7},{c:2,r:7},{c:2,r:4},{c:7,r:4}],
  JSON.parse(localStorage.getItem('tdCustomMap')) || [{c:0,r:2},{c:11,r:2},{c:11,r:7},{c:0,r:7}]
];

const mapMeta = [
  { name: '🗺️ K1: Neon-Pfad' },
  { name: '🌀 K2: Doppel-Schleife' },
  { name: '⚡ K3: Blitz-Zickzack' },
  { name: '💠 K4: Kreuz-Labyrinth' },
  { name: '🐍 K5: Doppel-Schlange' },
  { name: '👑 K6: Neon-Zitadelle' },
  { name: '🛠️ Eigene Map' }
];

const towerTypes = {
  laser:   { name: '⚪ Laser', cost: 50, range: 115, dmg: 18, rate: 25, color: '#38bdf8', slow: 0, splash: 0 },
  ice:     { name: '⚪ Eis', cost: 75, range: 105, dmg: 8, rate: 35, color: '#a5f3fc', slow: 0.5, splash: 0 },
  sniper:  { name: '🔵 Sniper', cost: 95, range: 215, dmg: 75, rate: 85, color: '#4ade80', slow: 0, splash: 0 },
  rocket:  { name: '🔵 Rakete', cost: 110, range: 135, dmg: 45, rate: 65, color: '#f43f5e', slow: 0, splash: 55 },
  mine:    { name: '🔵 Bank', cost: 100, range: 0, dmg: 0, rate: 0, color: '#facc15', slow: 0, splash: 0 },
  tesla:   { name: '🟣 Tesla', cost: 130, range: 130, dmg: 32, rate: 32, color: '#c084fc', slow: 0, splash: 0 },
  plasma:  { name: '🟣 Plasma', cost: 180, range: 150, dmg: 110, rate: 28, color: '#fb923c', slow: 0, splash: 0 },
  cryo:    { name: '🟣 Kryo-Sturm', cost: 160, range: 115, dmg: 18, rate: 48, color: '#a855f7', slow: 1, splash: 65 },
  orbital: { name: '🔴 Orbital-Laser', cost: 240, range: 210, dmg: 42, rate: 16, color: '#ef4444', slow: 0, splash: 0 },
  void:    { name: '🟡 Schwarzes Loch', cost: 320, range: 135, dmg: 135, rate: 55, color: '#facc15', slow: 1, splash: 85 }
};
const PERK_POOL = [
  { id: 'dmg', title: '⚔️ Cyber-Munition', desc: '+18% Turm-Schaden', apply: () => { runPerks.dmg += 0.18; } },
  { id: 'range', title: '🔭 Langstrecken-Optik', desc: '+20% Reichweite', apply: () => { runPerks.range += 0.20; } },
  { id: 'rate', title: '⚡ Übertaktung', desc: '+15% Feuerrate', apply: () => { runPerks.rate += 0.15; } },
  { id: 'gold', title: '💰 Zinseszins', desc: '+25% Gold', apply: () => { runPerks.gold += 0.25; } },
  { id: 'bossDmg', title: '👑 Titanen-Jäger', desc: '+40% gegen Bosse', apply: () => { runPerks.bossDmg += 0.40; } },
  { id: 'splash', title: '💥 Ketten-Sprengstoff', desc: '+30% Explosionsradius', apply: () => { runPerks.splash += 0.30; } },
  { id: 'heal', title: '❤️ Reaktor-Reparatur', desc: '+8 Leben & +150💰', apply: () => { hp = Math.min(maxHp, hp + 8); gold += 150; } }
];

const EVO_SPECS = {
  laser: { name: '🔥 Hyper-Strahl', cost: 350 },
  ice: { name: '🧊 Permafrost', cost: 380 },
  sniper: { name: '💀 Railgun-Crit', cost: 450 },
  rocket: { name: '☢️ Cluster-Bombe', cost: 480 },
  mine: { name: '🏦 Mega-Tresor', cost: 420 },
  tesla: { name: '⛈️ Gewitter-Kern', cost: 520 },
  plasma: { name: '☀️ Sonnen-Fackel', cost: 600 },
  cryo: { name: '❄️ Polar-Vortex', cost: 550 },
  orbital: { name: '🛰️ Todesstern', cost: 700 },
  void: { name: '🌀 Singularität', cost: 850 }
};

const TARGET_MODES = [
  { id: 'first', label: '🎯 Erster' },
  { id: 'strong', label: '🛡️ Stärkster' },
  { id: 'fast', label: '⚡ Schnellster' }
];

const DAILY_REWARDS = [5, 8, 12, 15, 20, 25, 40];
// === SPIELZUSTAND ===
let currentMap = 0;
let diffMult = 0.75;
let waypoints = maps[0];
let hp = 20, maxHp = 20, gold = 175, wave = 0;
let bestScores = JSON.parse(localStorage.getItem('tdBestMaps')) || [0,0,0,0,0,0,0];
while (bestScores.length < 7) bestScores.push(0);
let diffBest = JSON.parse(localStorage.getItem('tdDiffBest')) || { '0.75': 0, '1': 0, '1.35': 0 };
let gems = Number(localStorage.getItem('tdGems')) || 0;
let tech = JSON.parse(localStorage.getItem('tdTech')) || { gold: 0, hp: 0, dmg: 0, disc: 0 };
let unlocked = JSON.parse(localStorage.getItem('tdUnlocked')) || { tesla: false, plasma: false, cryo: false, orbital: false, void: false };
let playerName = localStorage.getItem('tdName') || 'NeonCommander';
let prestigeLevel = Number(localStorage.getItem('tdPrestige')) || 0;
let commanderClass = localStorage.getItem('tdClass') || 'econ';

let buildType = 'laser';
let selectedTower = null;
let gameSpeed = 1;
let paused = false;
let autoWave = false;
let autoCd = 0;
let editMode = false;
let editPts = [];
let flashTimer = 0;
let waveRunning = false;
let gfxTick = 0;
let showAllRanges = false;
let previewTile = null;
let inStartMenu = true;
let recordBannerShown = false;
let lastPerkWave = 0;

let towers = [];
let enemies = [];
let bullets = [];
let effects = [];
let spawnQueue = [];
let spawnTimer = 0;
let gameOver = false;
let pads = [];
let rocks = [];
let soundOn = true;
let audioCtx = null;

let runPerks = { dmg: 1, range: 1, rate: 1, gold: 1, bossDmg: 1, splash: 1 };
let overdriveTimer = 0, overdriveCd = 0;
let freezeAllCd = 0;
let waveTotalEnemies = 0;

const bgStars = Array.from({ length: 45 }, () => ({
  x: Math.random() * 480, y: Math.random() * 400, r: Math.random() * 1.6 + 0.4, a: Math.random()
}));
// === AUDIO ===
function playSfx(type) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'shoot') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'boom') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'coin') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.setValueAtTime(1040, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.start(now); osc.stop(now + 0.16);
  }
}

function addHitFx(x, y, dmg, color) {
  effects.push({ x, y: y - 8, txt: '-' + Math.round(dmg), color, life: 26, vy: -0.7 });
  for (let i = 0; i < 4; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 2;
    effects.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, color, life: 16, dot: true });
  }
}

// === UI HELPER ===
function closeOverlays(except = '') {
  ['lab-overlay', 'shop-overlay', 'rank-overlay', 'help-overlay', 'road-overlay', 'quest-overlay', 'perk-overlay', 'daily-overlay', 'backup-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el && id !== except) el.style.display = 'none';
  });
}

function toggleSound() {
  soundOn = !soundOn;
  const btn = document.getElementById('btn-snd');
  if (btn) btn.textContent = soundOn ? '🔊' : '🔇';
  if (soundOn) playSfx('coin');
}

function togglePause() {
  paused = !paused;
  const b = document.getElementById('btn-pause');
  if (b) {
    b.textContent = paused ? '▶️' : '⏸️';
    b.classList.toggle('fast', paused);
  }
}

function toggleAuto() {
  autoWave = !autoWave;
  document.getElementById('btn-auto')?.classList.toggle('fast', autoWave);
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('btn-spd');
  if (btn) {
    btn.textContent = gameSpeed === 2 ? '2x' : '1x';
    btn.classList.toggle('fast', gameSpeed === 2);
  }
}

function toggleAllRanges() {
  showAllRanges = !showAllRanges;
  const btn = document.getElementById('btn-ranges');
  if (btn) btn.style.background = showAllRanges ? '#0284c7' : '';
}

function toggleMoreMenu() {
  const m = document.getElementById('more-menu');
  const btn = document.getElementById('btn-more');
  if (!m) return;
  const isOpen = m.style.display === 'grid';
  m.style.display = isOpen ? 'none' : 'grid';
  if (btn) btn.textContent = isOpen ? '⚙️ Menü' : '✖ Zu';
}
function toggleFullscreen() {
  const elem = document.documentElement;
  const btn = document.getElementById('btn-fs');
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    elem.requestFullscreen?.() || elem.webkitRequestFullscreen?.();
    if (btn) btn.textContent = '✖';
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    if (btn) btn.textContent = '⛶';
  }
}

document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('btn-fs');
  if (btn) btn.textContent = document.fullscreenElement ? '✖' : '⛶';
});

// === START MENU ===
function updateStartMenuUI() {
  const gEl = document.getElementById('menu-gems');
  const bEl = document.getElementById('menu-best');
  const mBtn = document.getElementById('menu-map-btn');
  const mDiff = document.getElementById('menu-diff-sel');
  const cSel = document.getElementById('menu-class-sel');

  if (gEl) gEl.textContent = gems;
  if (bEl) bEl.textContent = Math.max(...bestScores);
  if (mBtn && mapMeta[currentMap]) mBtn.textContent = '🗺️ Karte: ' + mapMeta[currentMap].name.replace(/^[^\s]+\s/, '');
  if (cSel) cSel.value = commanderClass;

  if (mDiff) {
    const normalUnlocked = (diffBest['0.75'] || 0) >= 20;
    const extremUnlocked = (diffBest['1'] || 0) >= 20;
    mDiff.options[0].text = '🟢 Schwierigkeit: Leicht';
    mDiff.options[1].disabled = !normalUnlocked;
    mDiff.options[1].text = normalUnlocked ? '🟡 Schwierigkeit: Normal' : '🔒 Normal (Leicht W20)';
    mDiff.options[2].disabled = !extremUnlocked;
    mDiff.options[2].text = extremUnlocked ? '🔴 Schwierigkeit: Extrem' : '🔒 Extrem (Normal W20)';
    mDiff.value = String(diffMult);
  }
  updatePrestigeUI();
}

function openStartMenu() {
  inStartMenu = true;
  paused = true;
  closeOverlays();
  document.getElementById('gameover-overlay').style.display = 'none';
  const scr = document.getElementById('start-screen');
  if (scr) scr.style.display = 'flex';
  updateStartMenuUI();
}

function startFromMenu() {
  inStartMenu = false;
  const scr = document.getElementById('start-screen');
  if (scr) scr.style.display = 'none';
  resetGame();
  paused = false;
  playSfx('coin');
}

function syncDiffFromMenu() {
  const mDiff = document.getElementById('menu-diff-sel');
  const gDiff = document.getElementById('diff-sel');
  if (!mDiff) return;
  if (gDiff) gDiff.value = mDiff.value;
  changeDiff();
  updateStartMenuUI();
}

function openRoadFromMenu() {
  const scr = document.getElementById('start-screen');
  if (scr) scr.style.display = 'none';
  toggleRoad();
}

function openOverlayFromMenu(id) {
  const scr = document.getElementById('start-screen');
  if (scr) scr.style.display = 'none';
  if (id === 'shop-overlay') toggleShop();
  else if (id === 'lab-overlay') toggleLab();
  else if (id === 'rank-overlay') toggleRank();
  else if (id === 'quest-overlay') toggleQuests();
      }
// === MAP & DIFFICULTY ===
function toggleRoad() {
  closeOverlays('road-overlay');
  const r = document.getElementById('road-overlay');
  const open = r.style.display === 'none';
  r.style.display = open ? 'flex' : 'none';
  paused = open;
  if (open) renderRoad();
}

function renderRoad() {
  const list = document.getElementById('road-list');
  if (!list) return;
  list.innerHTML = mapMeta.map((m, idx) => {
    const isCustom = idx === 6;
    const isUnlocked = idx === 0 || isCustom || bestScores[idx - 1] >= 20;
    const cleared = !isCustom && bestScores[idx] >= 20;
    const isCurrent = currentMap === idx;
    const statusTxt = isCustom ? 'Frei baubar' : !isUnlocked ? `🔒 Schaffe Welle 20 auf K${idx}` : cleared ? `✅ Geschafft (Rekord: W${bestScores[idx]})` : `🎯 Ziel: Welle 20 (Rekord: W${bestScores[idx]})`;

    return `
      <button class="upg" onclick="selectRoadMap(${idx})" ${!isUnlocked ? 'disabled' : ''}
        style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:8px 10px;
        border:${isCurrent ? '2px solid #38bdf8' : '1px solid #334155'};
        background:${isCurrent ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.85)'};
        opacity:${isUnlocked ? '1' : '0.55'};">
        <span style="font-weight:bold;">${isUnlocked ? '' : '🔒 '}${m.name}</span>
        <span style="font-size:11px;color:${cleared ? '#4ade80' : '#cbd5e1'};">${statusTxt}</span>
      </button>`;
  }).join('');
}

function selectRoadMap(idx) {
  if (idx > 0 && idx < 6 && bestScores[idx - 1] < 20) return;
  currentMap = idx;
  waypoints = maps[currentMap];
  const btn = document.getElementById('btn-road');
  if (btn) btn.textContent = idx === 6 ? '🛠️ Eigene' : `🗺️ K${idx + 1}`;
  toggleRoad();
  resetGame();
}

function updateDiffLocks() {
  const sel = document.getElementById('diff-sel');
  if (!sel) return;
  const normalUnlocked = (diffBest['0.75'] || 0) >= 20;
  const extremUnlocked = (diffBest['1'] || 0) >= 20;

  sel.options[0].text = '🟢 Leicht';
  sel.options[1].disabled = !normalUnlocked;
  sel.options[1].text = normalUnlocked ? '🟡 Normal' : '🔒 Normal (Leicht W20)';
  sel.options[2].disabled = !extremUnlocked;
  sel.options[2].text = extremUnlocked ? '🔴 Extrem' : '🔒 Extrem (Normal W20)';

  if ((diffMult === 1 && !normalUnlocked) || (diffMult === 1.35 && !extremUnlocked)) {
    diffMult = 0.75;
    sel.value = '0.75';
  }
}

function changeDiff() {
  const val = Number(document.getElementById('diff-sel').value);
  if (val === 1 && (diffBest['0.75'] || 0) < 20) return updateDiffLocks();
  if (val === 1.35 && (diffBest['1'] || 0) < 20) return updateDiffLocks();
  diffMult = val;
  resetGame();
}

function toggleEditor() {
  if (!editMode) {
    editMode = true;
    editPts = [];
    currentMap = 6;
    document.getElementById('btn-road').textContent = '🛠️ Eigene';
    alert('Tippe nacheinander auf Start- & Eckpunkte. Danach auf "💾 Fertig" tippen!');
  } else {
    if (editPts.length >= 2) {
      maps[6] = editPts;
      localStorage.setItem('tdCustomMap', JSON.stringify(editPts));
    }
    editMode = false;
    waypoints = maps[6];
    resetGame();
  }
}

function genFeatures() {
  pads = [];
  rocks = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (isPathTile(c, r)) continue;
      const hash = (c * 7 + r * 13 + currentMap * 5) % 19;
      if (hash === 2 || hash === 11) pads.push({ c, r });
      else if (hash === 5 || hash === 14 || hash === 17) rocks.push({ c, r });
    }
  }
}

function isPathTile(c, r) {
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    if (c >= Math.min(a.c, b.c) && c <= Math.max(a.c, b.c) && r >= Math.min(a.r, b.r) && r <= Math.max(a.r, b.r)) return true;
  }
  return false;
      }
