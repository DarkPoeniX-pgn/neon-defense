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
  laser:   { name: '⚪ Laser', cost: 50, range: 115, dmg: 20, rate: 25, color: '#38bdf8', slow: 0, splash: 0 },
  ice:     { name: '⚪ Eis', cost: 75, range: 105, dmg: 8, rate: 35, color: '#a5f3fc', slow: 0.55, splash: 0 },
  sniper:  { name: '🔵 Sniper', cost: 95, range: 215, dmg: 75, rate: 78, color: '#4ade80', slow: 0, splash: 0 },
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
// === GAME RESET & WAVE ===
function resetGame() {
  maxHp = 20 + (tech.hp || 0) * 5 + (commanderClass === 'def' ? 10 : 0);
  hp = maxHp;
   gold = 200 + (tech.gold || 0) * 25 + (commanderClass === 'econ' ? 100 : 0);
  wave = 0;
  gameOver = false;
  waveRunning = false;
  paused = false;
  autoCd = 0;
  towers = [];
  enemies = [];
  bullets = [];
  effects = [];
  spawnQueue = [];
  selectedTower = null;
  previewTile = null;
  recordBannerShown = false;
  lastPerkWave = 0;
  runPerks = { dmg: 1, range: 1, rate: 1, gold: 1, bossDmg: 1, splash: 1 };
  overdriveTimer = 0;
  overdriveCd = 0;
  freezeAllCd = 0;

  genFeatures();
  closeOverlays();
  document.getElementById('upgrade-bar').style.display = 'none';
  document.getElementById('gameover-overlay').style.display = 'none';
  document.getElementById('btn-wave').disabled = false;
  document.getElementById('btn-pause').textContent = '⏸️';
  updatePreview();
  updateUI();
  updateShopUI();
  updateLabUI();
}

function updatePreview() {
  const nw = wave + 1;
  let txt = `🔮 W${nw}: `;
  if (nw % 5 === 0) txt += '👑 BOSS-WELLE!';
  else if (nw >= 11) txt += '🧬 Splitter + 👻 Phantom + 💠 Schild';
  else if (nw >= 8) txt += '💠 Schild + 🩷 Heiler + 🔵 Tank';
  else if (nw >= 4) txt += '🩷 Heiler + 🔵 Tank + 🟣 Schnell';
  else if (nw >= 3) txt += '🔵 Gepanzerte Tanks';
  else if (nw >= 2) txt += '🟣 Schnelle Sprinter';
  else txt += '🔴 Späher-Trupp';
  document.getElementById('wave-preview').textContent = txt;
}

function startWave() {
  if (spawnQueue.length || enemies.length || gameOver || editMode) return;

  const isEarlyCall = waveRunning && spawnQueue.length === 0 && enemies.length > 0 && enemies.length <= 2;
  if (isEarlyCall) {
    gold += 25;
    playSfx('coin');
    effects.push({ x: 240, y: 210, txt: '⚡ FRÜHE WELLE! +25💰', color: '#fde047', life: 60, vy: -0.5 });
    waveRunning = false;
  }

  if (paused) togglePause();
  wave++;
  waveRunning = true;
  updatePreview();

  if (wave > bestScores[currentMap]) {
    bestScores[currentMap] = wave;
    localStorage.setItem('tdBestMaps', JSON.stringify(bestScores));
  }

  document.getElementById('btn-wave').disabled = true;
  const count = Math.min(45, 4 + wave * 2);
  const scale = (34 + wave * 18) * Math.pow(1.10, Math.max(0, wave - 7)) * diffMult;

  for (let i = 0; i < count; i++) {
    const isBoss = wave % 5 === 0 && i === count - 1;
    const isShield = !isBoss && wave >= 8 && i % 5 === 4;
    const isHealer = !isBoss && !isShield && wave >= 4 && i % 6 === 5;
    const isTank = !isBoss && !isShield && !isHealer && wave >= 3 && i % 5 === 3;
    const isFast = !isBoss && !isShield && !isHealer && !isTank && wave >= 2 && i % 4 === 0;
     const mult = isBoss ? 5.5 : isTank ? 2.6 : isShield ? 1.8 : isFast ? 0.75 : 1;
    const baseHp = scale * mult;

    spawnQueue.push({
      x: waypoints[0].c * TILE + TILE / 2,
      y: waypoints[0].r * TILE + TILE / 2,
      wp: 1,
      hp: baseHp,
      maxHp: baseHp,
      speed: isBoss ? 0.8 : isTank ? 0.9 : isFast ? 2.2 : 1.3 + Math.min(wave * 0.04, 1.1),
      reward: isBoss ? 50 : Math.min(14, 7 + Math.floor(wave / 3)),
      slowTimer: 0,
      frozenTimer: 0,
      isBoss,
      armor: isTank ? 0.45 : 1,
      shield: isShield,
      healer: isHealer,
      healCd: 85,
      color: isBoss ? '#facc15' : isShield ? '#22d3ee' : isHealer ? '#ec4899' : isTank ? '#3b82f6' : isFast ? '#a855f7' : '#ef4444',
      radius: isBoss ? 15 : isTank ? 13 : isFast ? 10 : 11
    });
  }

  if (wave >= 7) {
    const phantoms = Math.floor((wave - 5) / 2);
    for (let i = 0; i < phantoms; i++) {
      spawnQueue.push({
        x: waypoints[0].c * TILE + TILE / 2, y: waypoints[0].r * TILE + TILE / 2, wp: 1,
        hp: (45 + wave * 20) * diffMult, maxHp: (45 + wave * 20) * diffMult,
        speed: 2.05, reward: 14, slowTimer: 0, isBoss: false, armor: 1,
        phantom: true, phaseTick: i * 30, color: '#94a3b8', radius: 10
      });
    }
  }
  if (wave >= 11) {
    const splitters = Math.floor((wave - 9) / 2);
    for (let i = 0; i < splitters; i++) {
      spawnQueue.push({
        x: waypoints[0].c * TILE + TILE / 2, y: waypoints[0].r * TILE + TILE / 2, wp: 1,
        hp: (95 + wave * 32) * diffMult, maxHp: (95 + wave * 32) * diffMult,
        speed: 1.15, reward: 18, slowTimer: 0, isBoss: false, armor: 0.85,
        splitter: true, color: '#10b981', radius: 13
      });
    }
  }

  waveTotalEnemies = spawnQueue.length;
  if (wave % 5 === 0) {
    effects.push({ x: 240, y: 150, txt: '⚠️ BOSS-WELLE ' + wave + '!', color: '#f43f5e', life: 85, vy: -0.3 });
  }
  updateUI();
}
// === TOWER & BUILDING ===
function selectType(type) {
  buildType = type;
  selectedTower = null;
  previewTile = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('t-' + type);
  if (btn) btn.classList.add('active');

  const hints = {
    laser: '🔫 Laser: Schneller Allrounder',
    ice: '❄️ Eis: Verlangsamt Gegner',
    sniper: '🎯 Sniper: Hohe Reichweite',
    rocket: '🚀 Rakete: Flächenschaden',
    mine: '⛏️ Bank: Gold pro Welle',
    tesla: '⚡ Tesla: Kettenblitz',
    plasma: '☢️ Plasma: Hoher DPS',
    cryo: '🌪️ Kryo: Flächen-Frost',
    orbital: '☄️ Orbital: Große Reichweite',
    void: '🌌 Void: Massive Explosion'
  };
  const wp = document.getElementById('wave-preview');
  if (wp && !waveRunning && hints[type]) wp.textContent = hints[type];
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / TILE);
  const r = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / TILE);

  if (editMode) {
    if (editPts.length === 0) editPts.push({ c, r });
    else {
      const last = editPts[editPts.length - 1];
      if (Math.abs(c - last.c) >= Math.abs(r - last.r)) editPts.push({ c, r: last.r });
      else editPts.push({ c: last.c, r });
    }
    playSfx('coin');
    return;
  }

  if (gameOver) return;

  const rockIdx = rocks.findIndex(rk => rk.c === c && rk.r === r);
  if (rockIdx !== -1) {
    if (gold >= 35 && confirm('🪨 Felsen für 35💰 sprengen?')) {
      gold -= 35;
      rocks.splice(rockIdx, 1);
      playSfx('boom');
      updateUI();
    }
    return;
  }

  const existing = towers.find(t => t.c === c && t.r === r);
  if (existing) {
    selectedTower = existing;
    updateUpgradeBar();
    return;
  }

  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';

  const spec = towerTypes[buildType];
  if (!spec || isPathTile(c, r) || gold < spec.cost) return;
  if (buildType === 'mine' && towers.filter(t => t.type === 'mine').length >= 2) {
    alert('Maximal 2 Banken gleichzeitig!');
    return;
  }

  if (!previewTile || previewTile.c !== c || previewTile.r !== r) {
    previewTile = { c, r };
    playSfx('coin');
    return;
  }

  previewTile = null;
  const onPad = pads.some(p => p.c === c && p.r === r);
  gold -= spec.cost;
  playSfx('coin');
  towers.push({
    c, r,
    x: c * TILE + TILE / 2,
    y: r * TILE + TILE / 2,
    type: buildType,
    lvl: 1,
    cd: 0,
    spent: spec.cost,
    boost: onPad ? 1.25 : 1,
    totalDmg: 0,
    targetMode: 'first',
    evolved: false
  });
  trackQuestProgress('tower', 1);
  updateUI();
});

function getUpgCost(t) {
  const disc = 1 - Math.min(0.4, (tech.disc || 0) * 0.05);
  return Math.floor(towerTypes[t.type].cost * Math.pow(1.55, t.lvl) * disc);
}

function updateUpgradeBar() {
  if (!selectedTower) return;
  const spec = towerTypes[selectedTower.type];
  const upgCost = getUpgCost(selectedTower);
  document.getElementById('upgrade-bar').style.display = 'flex';
  const padTxt = selectedTower.boost > 1 ? '⚡' : '';
  const extra = selectedTower.type === 'mine' ? ` (+${selectedTower.lvl >= 6 ? 300 : 35 * selectedTower.lvl}💰)` : (selectedTower.lvl >= 6 ? ' ⭐MAX' : '');
  let info = `${padTxt}${spec.name} St.${selectedTower.lvl}${extra}`;
  if (selectedTower.evolved) info += ' 🧬EVO';
  info += ` | 💥 ${Math.round(selectedTower.totalDmg || 0)}`;
  document.getElementById('sel-info').textContent = info;

  document.getElementById('btn-upg').textContent = selectedTower.lvl >= 6 ? '⭐ MAX' : `⬆️ +1 (${upgCost}💰)`;
  document.getElementById('btn-upg').disabled = selectedTower.lvl >= 6 || gold < upgCost;

  const evoBtn = document.getElementById('btn-evo');
  if (evoBtn) {
    if (selectedTower.lvl >= 6 && !selectedTower.evolved) {
      const evo = EVO_SPECS[selectedTower.type];
      evoBtn.style.display = 'inline-block';
      evoBtn.textContent = `🧬 ${evo.name} (${evo.cost}💰)`;
      evoBtn.disabled = gold < evo.cost;
    } else {
      evoBtn.style.display = 'none';
    }
  }
  updateTargetButton();
}

function upgradeTower() {
  if (!selectedTower || selectedTower.lvl >= 6) return;
  const upgCost = getUpgCost(selectedTower);
  if (gold < upgCost) return;
  gold -= upgCost;
  selectedTower.spent += upgCost;
  selectedTower.lvl++;
  playSfx('coin');
  updateUI();
  updateUpgradeBar();
}

function evolveTower() {
  if (!selectedTower || selectedTower.lvl < 6 || selectedTower.evolved) return;
  const evo = EVO_SPECS[selectedTower.type];
  if (!evo || gold < evo.cost) return;
  gold -= evo.cost;
  selectedTower.spent += evo.cost;
  selectedTower.evolved = true;
  playSfx('coin');
  effects.push({ x: selectedTower.x, y: selectedTower.y - 16, txt: evo.name + '!', color: '#c084fc', life: 65, vy: -0.6 });
  updateUI();
  updateUpgradeBar();
}

function sellTower() {
  if (!selectedTower) return;
  gold += Math.floor(selectedTower.spent * 0.7);
  playSfx('coin');
  towers = towers.filter(t => t !== selectedTower);
  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  updateUI();
}

function cycleTargetMode() {
  if (!selectedTower) return;
  const idx = TARGET_MODES.findIndex(m => m.id === (selectedTower.targetMode || 'first'));
  selectedTower.targetMode = TARGET_MODES[(idx + 1) % TARGET_MODES.length].id;
  updateTargetButton();
}

function updateTargetButton() {
  const btn = document.getElementById('btn-target');
  if (!btn || !selectedTower) return;
  const mode = TARGET_MODES.find(m => m.id === (selectedTower.targetMode || 'first')) || TARGET_MODES[0];
  btn.textContent = mode.label;
}

function pickBestTarget(t, inRange) {
  if (!inRange.length) return null;
  const mode = t.targetMode || 'first';
  if (mode === 'strong') return inRange.reduce((a, b) => b.hp > a.hp ? b : a);
  if (mode === 'fast') return inRange.reduce((a, b) => (b.speed || 0) > (a.speed || 0) ? b : a);
  return inRange[0];
}

function healBase() {
  if (gold < 120 || hp >= maxHp || gameOver || paused) return;
  gold -= 120;
  hp = Math.min(maxHp, hp + 5);
  playSfx('coin');
  updateUI();
}

function airstrike() {
  if (gold < 90 || !enemies.length || gameOver || paused) return;
  gold -= 90;
  flashTimer = 12;
  playSfx('boom');
  const dmg = 80 + wave * 25;
  enemies.forEach(e => {
    e.hp -= dmg;
    addHitFx(e.x, e.y, dmg, '#c084fc');
  });
  updateUI();
}
// === SKILLS & PERKS ===
function triggerOverdrive() {
  if (overdriveCd > 0 || gameOver || paused) return;
  overdriveTimer = 480;
  overdriveCd = 1800;
  playSfx('coin');
  effects.push({ x: 240, y: 190, txt: '⚡ OVERDRIVE AKTIV!', color: '#38bdf8', life: 70, vy: -0.4 });
}

function triggerFreezeAll() {
  if (freezeAllCd > 0 || gameOver || paused || !enemies.length) return;
  freezeAllCd = 2100;
  flashTimer = 10;
  playSfx('boom');
  enemies.forEach(e => { e.slowTimer = 240; e.frozenTimer = 110; });
  effects.push({ x: 240, y: 190, txt: '❄️ KRYO-IMPULS!', color: '#a5f3fc', life: 70, vy: -0.4 });
}

function openPerkChoice() {
  const ov = document.getElementById('perk-overlay');
  const box = document.getElementById('perk-cards');
  if (!ov || !box) return;
  paused = true;
  const shuffled = PERK_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  box.innerHTML = shuffled.map(p => `
    <button class="upg" onclick="pickPerk('${p.id}')" style="width:100%;text-align:left;padding:10px 12px;background:rgba(30,41,59,0.95);color:#f8fafc;border:1px solid #facc15;">
      <div style="font-size:13px;font-weight:800;color:#fde047;">${p.title}</div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${p.desc}</div>
    </button>
  `).join('');
  ov.style.display = 'flex';
}

function pickPerk(id) {
  const perk = PERK_POOL.find(p => p.id === id);
  if (perk) perk.apply();
  document.getElementById('perk-overlay').style.display = 'none';
  paused = false;
  playSfx('coin');
  updateUI();
}

// === SHOP & LAB ===
function toggleShop() {
  closeOverlays('shop-overlay');
  const s = document.getElementById('shop-overlay');
  const open = s.style.display === 'none';
  s.style.display = open ? 'flex' : 'none';
  paused = open;
  if (open) updateShopUI();
}

function updateShopUI() {
  const el = document.getElementById('shop-gems');
  if (el) el.textContent = gems;
  const shopItems = [
    { id: 'tesla', cost: 12 },
    { id: 'cryo', cost: 20 },
    { id: 'plasma', cost: 25 },
    { id: 'orbital', cost: 35 },
    { id: 'void', cost: 55 }
  ];
  shopItems.forEach(item => {
    const btn = document.getElementById('buy-' + item.id);
    if (!btn) return;
    btn.disabled = unlocked[item.id] || gems < item.cost;
    btn.textContent = unlocked[item.id] ? `✅ ${item.id} freigeschaltet` : btn.dataset.original || btn.textContent;
  });
}

function unlockTower(type, cost) {
  if (unlocked[type] || gems < cost) return;
  gems -= cost;
  unlocked[type] = true;
  localStorage.setItem('tdGems', gems);
  localStorage.setItem('tdUnlocked', JSON.stringify(unlocked));
  playSfx('coin');
  updateShopUI();
  updateUI();
}

function toggleLab() {
  closeOverlays('lab-overlay');
  const l = document.getElementById('lab-overlay');
  const open = l.style.display === 'none';
  l.style.display = open ? 'flex' : 'none';
  paused = open;
  if (open) updateLabUI();
}

function updateLabUI() {
  const el = document.getElementById('lab-gems');
  if (el) el.textContent = gems;
  ['gold', 'hp', 'dmg', 'disc'].forEach(k => {
    const lvl = tech[k] || 0;
    const isMax = k === 'disc' && lvl >= 8;
    const cost = (k === 'dmg' || k === 'disc' ? 4 : 3) + lvl * 2;
    const lvlEl = document.getElementById('t-lvl-' + k);
    const costEl = document.getElementById('t-cost-' + k);
    const btn = document.getElementById('lab-' + k);
    if (lvlEl) lvlEl.textContent = lvl;
    if (costEl) costEl.textContent = isMax ? 'MAX' : cost;
    if (btn) btn.disabled = isMax || gems < cost;
  });
}

function buyTech(k) {
  const lvl = tech[k] || 0;
  if (k === 'disc' && lvl >= 8) return;
  const cost = (k === 'dmg' || k === 'disc' ? 4 : 3) + lvl * 2;
  if (gems < cost) return;
  gems -= cost;
  tech[k] = lvl + 1;
  localStorage.setItem('tdGems', gems);
  localStorage.setItem('tdTech', JSON.stringify(tech));
  playSfx('coin');
  updateLabUI();
  if (wave === 0) resetGame();
  else updateUI();
}
// === PRESTIGE ===
function updatePrestigeUI() {
  const btn = document.getElementById('btn-prestige');
  if (!btn) return;
  const maxW = Math.max(...bestScores);
  const reqWave = 40 + prestigeLevel * 10;
  if (maxW >= reqWave) {
    btn.disabled = false;
    btn.textContent = `✨ PRESTIGE AUSLÖSEN! -> Stufe ${prestigeLevel + 1} (+${(prestigeLevel + 1) * 10}% DMG)`;
    btn.style.background = 'linear-gradient(180deg, #fde047, #f59e0b)';
  } else {
    btn.disabled = true;
    btn.textContent = `✨ Prestige Stufe ${prestigeLevel} (+${prestigeLevel * 10}% DMG) • Ziel: W${reqWave}`;
    btn.style.background = '';
  }
}

function triggerPrestige() {
  const maxW = Math.max(...bestScores);
  const reqWave = 40 + prestigeLevel * 10;
  if (maxW < reqWave) return;
  if (!confirm(`✨ Prestige starten?\n\n+10% Schaden (Gesamt: +${(prestigeLevel + 1) * 10}%).\nKarten-Rekorde werden zurückgesetzt.`)) return;

  prestigeLevel++;
  localStorage.setItem('tdPrestige', prestigeLevel);
  bestScores = [0,0,0,0,0,0,0];
  localStorage.setItem('tdBestMaps', JSON.stringify(bestScores));
  gems += 25;
  localStorage.setItem('tdGems', gems);
  playSfx('coin');
  updatePrestigeUI();
  updateStartMenuUI();
  alert(`🎉 Prestige-Stufe ${prestigeLevel} erreicht!`);
}

function changeCommanderClass() {
  const sel = document.getElementById('menu-class-sel');
  if (!sel) return;
  commanderClass = sel.value;
  localStorage.setItem('tdClass', commanderClass);
}

// === QUESTS ===
const QUEST_STORAGE = 'neonTD_quests_v1';

function getQuestData() {
  const today = new Date().toLocaleDateString('de-DE');
  let data = JSON.parse(localStorage.getItem(QUEST_STORAGE));
  if (!data) {
    data = { lastDay: today, stats: { totalKills: 0, totalTowers: 0, maxWave: 0 }, daily: { kills: 0, waves: 0, towers: 0 }, claimed: {} };
  } else {
    if (!data.daily) data.daily = { kills: 0, waves: 0, towers: 0 };
    if (data.lastDay !== today) {
      data.lastDay = today;
      data.daily = { kills: 0, waves: 0, towers: 0 };
      ['daily_kills', 'daily_waves', 'daily_towers', 'daily_kills_hard'].forEach(k => delete data.claimed[k]);
    }
  }
  return data;
}

function saveQuestData(data) {
  localStorage.setItem(QUEST_STORAGE, JSON.stringify(data));
}

function trackQuestProgress(type, amount = 1) {
  const data = getQuestData();
  if (type === 'kill') { data.stats.totalKills += amount; data.daily.kills += amount; }
  else if (type === 'tower') { data.stats.totalTowers += amount; data.daily.towers = (data.daily.towers || 0) + amount; }
  else if (type === 'wave') { if (amount > data.stats.maxWave) data.stats.maxWave = amount; data.daily.waves += 1; }
  saveQuestData(data);
}

function getQuestList(data) {
  return [
    { id: 'daily_towers', title: '📅 8 Türme errichten', cur: data.daily.towers || 0, max: 8, reward: 2 },
    { id: 'daily_kills', title: '📅 50 Gegner besiegen', cur: data.daily.kills, max: 50, reward: 3 },
    { id: 'daily_waves', title: '📅 8 Wellen schaffen', cur: data.daily.waves, max: 8, reward: 4 },
    { id: 'daily_kills_hard', title: '📅 180 Gegner an einem Tag', cur: data.daily.kills, max: 180, reward: 6 },
    { id: 'ach_tower15', title: '🏆 15 Türme bauen', cur: data.stats.totalTowers, max: 15, reward: 4 },
    { id: 'ach_tower100', title: '🏆 100 Türme bauen', cur: data.stats.totalTowers, max: 100, reward: 10 },
    { id: 'ach_tower350', title: '🏆 350 Türme bauen', cur: data.stats.totalTowers, max: 350, reward: 20 },
    { id: 'ach_kill250', title: '🏆 250 Gegner', cur: data.stats.totalKills, max: 250, reward: 5 },
    { id: 'ach_kill1500', title: '🏆 1.500 Gegner', cur: data.stats.totalKills, max: 1500, reward: 15 },
    { id: 'ach_kill5000', title: '🏆 5.000 Gegner', cur: data.stats.totalKills, max: 5000, reward: 30 },
    { id: 'ach_wave10', title: '🏆 Welle 10', cur: data.stats.maxWave, max: 10, reward: 5 },
    { id: 'ach_wave20', title: '🏆 Welle 20', cur: data.stats.maxWave, max: 20, reward: 12 },
    { id: 'ach_wave35', title: '🏆 Welle 35', cur: data.stats.maxWave, max: 35, reward: 22 },
    { id: 'ach_wave50', title: '🏆 Welle 50', cur: data.stats.maxWave, max: 50, reward: 40 }
  ];
}

function claimQuest(id, reward) {
  const data = getQuestData();
  if (data.claimed[id]) return;
  data.claimed[id] = true;
  saveQuestData(data);
  gems += reward;
  localStorage.setItem('tdGems', gems);
  updateUI();
  renderQuests();
}

function renderQuests() {
  const listEl = document.getElementById('quest-list');
  if (!listEl) return;
  const data = getQuestData();
  const quests = getQuestList(data);
  listEl.innerHTML = quests.map(q => {
    const done = q.cur >= q.max;
    const isClaimed = !!data.claimed[q.id];
    const progress = Math.min(q.cur, q.max);
    let btnHtml = `<span style="opacity:0.6;font-size:12px;">${progress}/${q.max}</span>`;
    if (isClaimed) btnHtml = `<span style="color:#4ade80;font-size:12px;">✅ Erhalten</span>`;
    else if (done) btnHtml = `<button class="upg" style="padding:4px 8px;background:#16a34a;" onclick="claimQuest('${q.id}', ${q.reward})">+${q.reward} 💎</button>`;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px;background:#0f172a;border-radius:6px;border:1px solid #334155;">
        <div style="text-align:left;font-size:13px;">
          <div><b>${q.title}</b></div>
          <div style="font-size:11px;opacity:0.75;">Fortschritt: ${progress} / ${q.max}</div>
        </div>
        <div>${btnHtml}</div>
      </div>`;
  }).join('');
}

function toggleQuests() {
  const overlay = document.getElementById('quest-overlay');
  if (!overlay) return;
  const isHidden = overlay.style.display === 'none' || overlay.style.display === '';
  overlay.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) renderQuests();
}

// === LEADERBOARD ===
const STORAGE_KEY_SCORES = 'neonTD_highscores';
const STORAGE_KEY_NAME = 'neonTD_playerName';

function saveName() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput.value.trim() || 'Spieler';
  localStorage.setItem(STORAGE_KEY_NAME, name);
  alert('Name gespeichert: ' + name);
  renderLeaderboard();
}

function addScoreToLeaderboard(reachedWave) {
  if (!reachedWave || reachedWave <= 0) return;
  const name = localStorage.getItem(STORAGE_KEY_NAME) || 'Spieler';
  let scores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES)) || [];
  const today = new Date().toLocaleDateString('de-DE');
  scores.push({ name, wave: reachedWave, date: today });
  scores.sort((a, b) => b.wave - a.wave);
  scores = scores.slice(0, 10);
  localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(scores));
  renderLeaderboard();
}

function renderLeaderboard() {
  const listEl = document.getElementById('rank-list');
  if (!listEl) return;
  const scores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES)) || [];
  if (scores.length === 0) {
    listEl.innerHTML = "<div style='opacity:0.7;text-align:center;'>Noch keine Rekorde gespeichert.</div>";
    return;
  }
  listEl.innerHTML = scores.map((entry, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    return `
      <div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid #334155;">
        <span>${medal} <b>${entry.name}</b> <small style="opacity:0.6;">(${entry.date})</small></span>
        <span>🌊 Welle <b>${entry.wave}</b></span>
      </div>`;
  }).join('');
}

function toggleRank() {
  const overlay = document.getElementById('rank-overlay');
  if (!overlay) return;
  const isHidden = overlay.style.display === 'none' || overlay.style.display === '';
  overlay.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) renderLeaderboard();
                                     }
// === DAILY REWARDS ===
const DAILY_STORAGE = 'neonTD_dailyReward_v1';

function getTodayStr() { return new Date().toLocaleDateString('de-DE'); }
function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('de-DE');
}

function getDailyState() {
  let state = JSON.parse(localStorage.getItem(DAILY_STORAGE)) || { lastClaimDate: '', streakDay: 0 };
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  if (state.lastClaimDate && state.lastClaimDate !== today && state.lastClaimDate !== yesterday) {
    state.streakDay = 0;
  }
  return state;
}

function canClaimDaily() {
  return getDailyState().lastClaimDate !== getTodayStr();
}

function updateDailyButton() {
  const btn = document.getElementById('btn-daily');
  if (!btn) return;
  const state = getDailyState();
  const nextDay = (state.streakDay % 7) + 1;
  const reward = DAILY_REWARDS[nextDay - 1];
  if (canClaimDaily()) {
    btn.textContent = `🎁 Tag ${nextDay} Belohnung: +${reward} 💎 abholen!`;
    btn.style.opacity = '1';
  } else {
    btn.textContent = `✅ Tages-Belohnung abgeholt (Tag ${state.streakDay}/7)`;
    btn.style.opacity = '0.75';
  }
}

function openDailyReward() {
  const ov = document.getElementById('daily-overlay');
  if (!ov) return;
  renderDailyGrid();
  ov.style.display = 'flex';
}

function closeDailyReward() {
  document.getElementById('daily-overlay').style.display = 'none';
  updateDailyButton();
}

function renderDailyGrid() {
  const grid = document.getElementById('daily-grid');
  const claimBtn = document.getElementById('btn-claim-daily');
  const sub = document.getElementById('daily-sub');
  if (!grid) return;
  const state = getDailyState();
  const ready = canClaimDaily();
  const activeIdx = ready ? (state.streakDay % 7) : ((state.streakDay - 1 + 7) % 7);

  if (sub) {
    sub.textContent = ready
      ? `Deine Serie: Tag ${activeIdx + 1} von 7 wartet auf dich!`
      : `Stark! Komm morgen wieder für Tag ${((activeIdx + 1) % 7) + 1}!`;
  }

  grid.innerHTML = DAILY_REWARDS.map((amount, idx) => {
    const isClaimed = idx < activeIdx || (idx === activeIdx && !ready);
    const isCurrent = idx === activeIdx && ready;
    const isMega = idx === 6;
    return `
      <div style="
        grid-column:${isMega ? 'span 2' : 'span 1'};
        padding:8px 4px; border-radius:10px;
        background:${isCurrent ? 'rgba(250,204,21,0.22)' : isClaimed ? 'rgba(34,197,94,0.16)' : 'rgba(15,23,42,0.85)'};
        border:${isCurrent ? '2px solid #facc15' : isClaimed ? '1px solid #4ade80' : '1px solid #334155'};
        text-align:center;">
        <div style="font-size:10px;color:#94a3b8;font-weight:bold;">${isMega ? '👑 TAG 7' : 'TAG ' + (idx + 1)}</div>
        <div style="font-size:14px;font-weight:900;color:${isCurrent ? '#fde047' : '#fff'};margin:3px 0;">+${amount} 💎</div>
        <div style="font-size:10px;">${isClaimed ? '✅' : isCurrent ? '🎁 JETZT' : '🔒'}</div>
      </div>`;
  }).join('');

  if (claimBtn) {
    const reward = DAILY_REWARDS[activeIdx];
    claimBtn.disabled = !ready;
    claimBtn.textContent = ready ? `💎 +${reward} Diamanten abholen` : '✅ Heute schon abgeholt';
  }
}

function claimDailyReward() {
  if (!canClaimDaily()) return;
  const state = getDailyState();
  const nextIdx = state.streakDay % 7;
  const reward = DAILY_REWARDS[nextIdx];
  gems += reward;
  localStorage.setItem('tdGems', gems);
  state.lastClaimDate = getTodayStr();
  state.streakDay = nextIdx + 1;
  localStorage.setItem(DAILY_STORAGE, JSON.stringify(state));
  playSfx('coin');
  updateUI();
  updateStartMenuUI();
  renderDailyGrid();
  updateDailyButton();
}

// === BACKUP ===
const BACKUP_KEYS = [
  'tdCustomMap', 'tdBestMaps', 'tdDiffBest', 'tdGems', 'tdTech',
  'tdUnlocked', 'tdName', 'neonTD_highscores', 'neonTD_playerName',
  'neonTD_quests_v1', 'neonTD_dailyReward_v1', 'tdPrestige', 'tdClass'
];

function openBackupModal() {
  const ov = document.getElementById('backup-overlay');
  if (!ov) return;
  ov.style.display = 'flex';
  exportSaveCode(true);
}

function closeBackupModal() {
  document.getElementById('backup-overlay').style.display = 'none';
}

function exportSaveCode(silent) {
  const payload = {};
  BACKUP_KEYS.forEach(k => {
    const val = localStorage.getItem(k);
    if (val !== null) payload[k] = val;
  });
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const box = document.getElementById('backup-code');
  if (box) { box.value = code; box.select(); }
  if (!silent && navigator.clipboard) {
    navigator.clipboard.writeText(code).catch(() => {});
    alert('✅ Backup-Code erstellt und kopiert!');
  }
}

function importSaveCode() {
  const box = document.getElementById('backup-code');
  if (!box || !box.value.trim()) return alert('Bitte Backup-Code einfügen!');
  try {
    const jsonStr = decodeURIComponent(escape(atob(box.value.trim())));
    const payload = JSON.parse(jsonStr);
    BACKUP_KEYS.forEach(k => {
      if (payload[k] !== undefined) localStorage.setItem(k, payload[k]);
    });
    alert('🎉 Spielstand wiederhergestellt! Seite wird neu geladen.');
    location.reload();
  } catch (err) {
    alert('❌ Ungültiger Code!');
  }
}
// === GAME LOOP ===
function step() {
  if (gameOver || paused || editMode) return;

  if (spawnQueue.length > 0) {
    if (--spawnTimer <= 0) {
      enemies.push(spawnQueue.shift());
      spawnTimer = Math.max(18, 42 - wave * 2);
    }
  } else if (enemies.length === 0 && waveRunning) {
    waveRunning = false;
    autoCd = 90;
    trackQuestProgress('wave', wave);

    const diffKey = String(diffMult);
    if (wave > (diffBest[diffKey] || 0)) {
      diffBest[diffKey] = wave;
      localStorage.setItem('tdDiffBest', JSON.stringify(diffBest));
      updateDiffLocks();
    }

    if (wave === 20 && currentMap < 5) {
      effects.push({ x: 240, y: 180, txt: `🎉 K${currentMap + 2} FREIGESCHALTET!`, color: '#4ade80', life: 95, vy: -0.4 });
      playSfx('coin');
    }

    document.getElementById('btn-wave').disabled = false;
    let mined = 0;
    towers.forEach(t => { if (t.type === 'mine') mined += (t.lvl >= 6 ? 320 : 40 * t.lvl);
    if (mined > 0) { gold += Math.floor(mined * runPerks.gold); playSfx('coin'); }

    if (wave > 0 && wave % 5 === 0 && lastPerkWave !== wave) {
      lastPerkWave = wave;
      openPerkChoice();
    }

    updateUI();
  } else if (!waveRunning && autoWave && wave > 0 && --autoCd <= 0) {
    startWave();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.slowTimer > 0) e.slowTimer--;
    if (e.frozenTimer > 0) e.frozenTimer--;

    if (e.healer && --e.healCd <= 0) {
      e.healCd = 110;
      enemies.forEach(other => {
        if (Math.hypot(other.x - e.x, other.y - e.y) <= 75) {
          other.hp = Math.min(other.maxHp, other.hp + other.maxHp * 0.12);
        }
      });
    }

    let spd = e.speed * (e.slowTimer > 0 || e.frozenTimer > 0 ? 0.5 : 1);
    const target = waypoints[e.wp];
    if (!target) { enemies.splice(i, 1); continue; }
    const tx = target.c * TILE + TILE / 2;
    const ty = target.r * TILE + TILE / 2;
    const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);

    if (dist < spd) {
      if (++e.wp >= waypoints.length) {
        hp--;
        enemies.splice(i, 1);
        updateUI();
        if (hp <= 0) {
          gameOver = true;
          document.getElementById('end-wave').textContent = wave;
          document.getElementById('gameover-overlay').style.display = 'flex';
          addScoreToLeaderboard(wave);
        }
      }
    } else {
      e.x += (dx / dist) * spd;
      e.y += (dy / dist) * spd;
    }
  }

  const dmgTech = 1 + (tech.dmg || 0) * 0.1;
  const prestigeBonus = 1 + prestigeLevel * 0.10;
  const tactBonus = commanderClass === 'tact' ? 1.12 : 1;
  const totalDmgMult = dmgTech * prestigeBonus * tactBonus * runPerks.dmg;

  towers.forEach(t => {
    if (t.type === 'mine') return;
    const spec = towerTypes[t.type];
    const range = (spec.range + (t.lvl - 1) * 16) * t.boost * runPerks.range;
    const isMax = t.lvl >= 6;
    let dmg = spec.dmg * (1 + (t.lvl - 1) * 0.55) * t.boost * totalDmgMult;
    if (t.type === 'sniper' && isMax) dmg *= 1.5;
    if (t.evolved) dmg *= 1.25;

    if (t.cd > 0) { t.cd--; return; }

    const inRange = enemies.filter(e => Math.hypot(e.x - t.x, e.y - t.y) <= range);
    const target = pickBestTarget(t, inRange);
    if (target) {
      t.cd = Math.max(6, Math.floor((spec.rate - (t.lvl - 1) * 3) / runPerks.rate));
      playSfx('shoot');
      bullets.push({
        owner: t,
        x: t.x, y: t.y,
        target,
        dmg,
        color: spec.color,
        slow: spec.slow,
        splash: spec.splash * (t.type === 'rocket' && isMax ? 1.8 : 1) * runPerks.splash,
        pierce: t.type === 'sniper' || t.type === 'plasma' || t.type === 'orbital',
        chain: (t.type === 'laser' && isMax) || t.type === 'tesla',
        chainCount: t.type === 'tesla' ? (isMax ? 4 : 2) : 1,
        superFreeze: t.type === 'ice' && isMax
      });
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const dx = b.target.x - b.x, dy = b.target.y - b.y, dist = Math.hypot(dx, dy);
    if (dist < 10) {
      const applyDmg = (enemy, amount) => {
        const finalDmg = amount * (enemy.isBoss ? runPerks.bossDmg : 1) * (enemy.shield ? 0.15 : 1);
        enemy.hp -= finalDmg;
        addHitFx(enemy.x, enemy.y, finalDmg, b.color);
        if (b.owner) b.owner.totalDmg = (b.owner.totalDmg || 0) + finalDmg;
      };

      if (b.splash > 0) {
        playSfx('boom');
        enemies.forEach(e => {
          if (Math.hypot(e.x - b.target.x, e.y - b.target.y) <= b.splash) applyDmg(e, b.dmg);
        });
      } else {
        applyDmg(b.target, b.dmg * (b.pierce ? 1 : b.target.armor));
        if (b.slow > 0) {
          b.target.slowTimer = b.superFreeze ? 180 : 90;
          if (b.superFreeze) b.target.armor = Math.min(1, b.target.armor + 0.15);
        }
        if (b.chain) {
          let hits = 0, last = b.target;
          enemies.forEach(e => {
            if (hits < b.chainCount && e !== last && Math.hypot(e.x - last.x, e.y - last.y) <= 95) {
              applyDmg(e, b.dmg * 0.75);
              last = e;
              hits++;
            }
          });
        }
      }
      bullets.splice(i, 1);
    } else {
      b.x += (dx / dist) * 8;
      b.y += (dy / dist) * 8;
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.hp <= 0) {
      gold += Math.floor(e.reward * runPerks.gold);
      trackQuestProgress('kill', 1);
      if (e.isBoss) {
        gems += 2;
        localStorage.setItem('tdGems', gems);
        addHitFx(e.x, e.y - 12, 2, '#38bdf8');
      }
      if (e.splitter && !e.didSplit) {
        e.didSplit = true;
        for (let k = 0; k < 3; k++) {
          enemies.push({
            x: e.x + (k - 1) * 8, y: e.y + (k - 1) * 6, wp: e.wp,
            hp: e.maxHp * 0.25, maxHp: e.maxHp * 0.25,
            speed: 2.35, reward: 5, slowTimer: 0, isBoss: false, armor: 1,
            color: '#6ee7b7', radius: 7
          });
        }
      }
      enemies.splice(i, 1);
      playSfx('coin');
      updateUI();
    }
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    if (fx.vx) fx.x += fx.vx;
    fx.y += fx.vy;
    if (--fx.life <= 0) effects.splice(i, 1);
  }

  if (overdriveTimer > 0) overdriveTimer--;
  if (overdriveCd > 0) overdriveCd--;
  if (freezeAllCd > 0) freezeAllCd--;

  towers.forEach(t => {
    const hasBankNeighbor = towers.some(o => o !== t && o.type === 'mine' && Math.abs(o.c - t.c) <= 1 && Math.abs(o.r - t.r) <= 1);
    const bonusTicks = (overdriveTimer > 0 ? 1 : 0) + (hasBankNeighbor && Math.random() < 0.18 ? 1 : 0) + (t.evolved && Math.random() < 0.35 ? 1 : 0);
    if (t.cd > 0 && bonusTicks > 0) t.cd = Math.max(0, t.cd - bonusTicks);
  });

  if (wave > 1 && wave > (bestScores[currentMap] || 0) && !recordBannerShown) {
    recordBannerShown = true;
    effects.push({ x: 240, y: 120, txt: '🏆 NEUER KARTEN-REKORD!', color: '#fde047', life: 95, vy: -0.25 });
  }
                 }
function updateUI() {
  document.getElementById('hp').textContent = hp;
  document.getElementById('max-hp').textContent = maxHp;
  document.getElementById('gold').textContent = gold;
  document.getElementById('gems').textContent = gems;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = bestScores[currentMap] || 0;

  document.getElementById('btn-heal').disabled = gold < 120 || hp >= maxHp || gameOver || paused;
  document.getElementById('btn-nuke').disabled = gold < 90 || enemies.length === 0 || gameOver || paused;

  ['laser','ice','sniper','rocket','mine','tesla','plasma','cryo','orbital','void'].forEach(t => {
    const el = document.getElementById('t-' + t);
    if (!el) return;
    el.style.opacity = gold < towerTypes[t].cost ? '0.4' : '1';
    if (['tesla','plasma','cryo','orbital','void'].includes(t)) {
      el.style.display = unlocked[t] ? 'inline-block' : 'none';
    }
  });

  const wBtn = document.getElementById('btn-wave');
  if (wBtn && !gameOver && !editMode) {
    if (waveRunning && spawnQueue.length === 0 && enemies.length > 0 && enemies.length <= 2) {
      wBtn.disabled = false;
      wBtn.textContent = `⚡ Welle ${wave + 1} (+25💰)`;
      wBtn.style.background = 'linear-gradient(180deg, #fde047, #eab308)';
      wBtn.style.color = '#422006';
    } else if (!waveRunning) {
      wBtn.style.background = '';
      wBtn.style.color = '';
    }
  }

  const odBtn = document.getElementById('btn-overdrive');
  const frBtn = document.getElementById('btn-freezeall');
  if (odBtn) {
    odBtn.disabled = overdriveCd > 0 || gameOver;
    odBtn.textContent = overdriveTimer > 0 ? `⚡ AKTIV (${Math.ceil(overdriveTimer / 60)}s)` : overdriveCd > 0 ? `⚡ Overdrive (${Math.ceil(overdriveCd / 60)}s)` : '⚡ Overdrive (Bereit)';
  }
  if (frBtn) {
    frBtn.disabled = freezeAllCd > 0 || gameOver;
    frBtn.textContent = freezeAllCd > 0 ? `❄️ Kryo-Impuls (${Math.ceil(freezeAllCd / 60)}s)` : '❄️ Kryo-Impuls (Bereit)';
  }

  if (selectedTower) updateUpgradeBar();
}

// === DRAWING ===
function drawTower(t) {
  const spec = towerTypes[t.type];
  const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= (spec.range + (t.lvl - 1) * 16) * t.boost);
  const ang = target ? Math.atan2(target.y - t.y, target.x - t.x) : 0;

  if (t.lvl >= 6) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = spec.color;
  ctx.lineWidth = 2;

  if (t.type === 'mine') {
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeRect(-14, -14, 28, 28);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 6);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(ang);
    ctx.fillStyle = spec.color;

    if (t.type === 'laser') { ctx.fillRect(0, -6, 17, 3.5); ctx.fillRect(0, 2.5, 17, 3.5); ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); }
    else if (t.type === 'ice') { for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(14, 0); ctx.lineTo(0, 2.5); ctx.fill(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); }
    else if (t.type === 'sniper') { ctx.fillRect(0, -2.5, 22, 5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke(); }
    else if (t.type === 'rocket') { ctx.fillRect(-7, -10, 18, 7); ctx.fillRect(-7, 3, 18, 7); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(15, -6.5); ctx.lineTo(10, -10); ctx.lineTo(10, -3); ctx.fill(); ctx.beginPath(); ctx.moveTo(15, 6.5); ctx.lineTo(10, 3); ctx.lineTo(10, 10); ctx.fill(); }
    else if (t.type === 'tesla') { ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); }
    else if (t.type === 'plasma') { ctx.fillRect(-4, -7, 22, 14); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, 0, 5, 0, Math.PI * 2); ctx.fill(); }
    else if (t.type === 'cryo') { ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(-3, -14, 6, 28); ctx.fillRect(-14, -3, 28, 6); }
    else if (t.type === 'orbital') { ctx.fillRect(-5, -8, 24, 5); ctx.fillRect(-5, 3, 24, 5); ctx.fillStyle = '#fca5a5'; ctx.fillRect(2, -2, 22, 4); }
    else if (t.type === 'void') { ctx.fillStyle = '#090d16'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke(); }

    ctx.restore();
  }

  ctx.fillStyle = t.lvl >= 6 ? '#facc15' : '#090d16';
  ctx.beginPath();
  ctx.arc(t.x + 11, t.y + 11, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = t.lvl >= 6 ? '#090d16' : '#fff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.lvl, t.x + 11, t.y + 14);
}

function drawEnemy(e) {
  const wp = waypoints[e.wp] || e;
  const ang = Math.atan2(wp.r * TILE + TILE / 2 - e.y, wp.c * TILE + TILE / 2 - e.x);
  const col = e.slowTimer > 0 ? '#67e8f9' : e.color;

  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.healer) {
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (e.shield) {
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + gfxTick * 0.03;
      i === 0 ? ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16) : ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.save();
  ctx.rotate(ang);
  ctx.fillStyle = col;

  if (e.speed > 2) {
    ctx.beginPath();
    ctx.moveTo(13, 0); ctx.lineTo(-8, -8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 8);
    ctx.closePath(); ctx.fill();
  } else if (e.armor < 1) {
    ctx.fillRect(-13, -11, 26, 22);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(8, -11, 5, 22);
  } else if (e.isBoss) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? 18 : 11;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  if (e.healer) { ctx.fillStyle = '#fff'; ctx.fillRect(-6, -2, 12, 4); ctx.fillRect(-2, -6, 4, 12); }
  else if (e.armor < 1) { ctx.font = 'bold 11px sans-serif'; ctx.fillText('🛡️', 0, 4); }
  else if (e.isBoss) { ctx.font = '13px sans-serif'; ctx.fillText('👑', 0, 4); }

  ctx.restore();

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(e.x - 12, e.y - e.radius - 10, 24, 4);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(e.x - 12, e.y - e.radius - 10, 24 * Math.max(0, e.hp / e.maxHp), 4);
}

function draw() {
  if (!paused) gfxTick++;

  const hint = document.getElementById('tutorial-hint');
  if (hint) hint.style.display = (wave === 0 && towers.length === 0 && !editMode) ? 'block' : 'none';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bgStars.forEach(s => {
    ctx.fillStyle = `rgba(148, 163, 184, ${0.18 + Math.sin(gfxTick * 0.02 + s.a * 6) * 0.12})`;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  });

  const pts = editMode ? editPts : waypoints;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const onPath = !editMode && isPathTile(c, r);
      if (onPath) {
        ctx.fillStyle = '#0f182a';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
      ctx.strokeStyle = onPath ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.35)';
      ctx.strokeRect(c * TILE + 0.5, r * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }

  if (!editMode) {
    pads.forEach(p => {
      const px = p.c * TILE, py = p.r * TILE;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.10)';
      ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', px + 20, py + 25);
    });
    rocks.forEach(rk => {
      const rx = rk.c * TILE + 20, ry = rk.r * TILE + 20;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(rx, ry, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪨', rx, ry + 5);
    });
  }

  if (pts.length > 0) {
    ctx.save();
    ctx.strokeStyle = editMode ? '#facc15' : 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((w, idx) => {
      const wx = w.c * TILE + TILE / 2, wy = w.r * TILE + TILE / 2;
      idx === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    });
    ctx.stroke();

    if (!editMode && pts.length > 1) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 14]);
      ctx.lineDashOffset = -(gfxTick * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    const start = pts[0], end = pts[pts.length - 1];
    const sx = start.c * TILE + TILE / 2, sy = start.r * TILE + TILE / 2;
    const ex = end.c * TILE + TILE / 2, ey = end.r * TILE + TILE / 2;

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 11 + Math.sin(gfxTick * 0.06) * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.beginPath();
    ctx.arc(ex, ey, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(ex, ey, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  enemies.forEach(drawEnemy);

  towers.forEach(t => {
    const spec = towerTypes[t.type];
    const range = (spec.range + (t.lvl - 1) * 16) * t.boost * runPerks.range;
    if (showAllRanges || selectedTower === t) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, range, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.stroke();
    }

    ctx.fillStyle = '#0b1221';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = selectedTower === t ? '#facc15' : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = selectedTower === t ? 2 : 1;
    ctx.stroke();
    ctx.lineWidth = 1;

    drawTower(t);
  });

  if (previewTile && !editMode && !gameOver) {
    const pSpec = towerTypes[buildType];
    if (pSpec) {
      const px = previewTile.c * TILE + TILE / 2;
      const py = previewTile.r * TILE + TILE / 2;
      const onPad = pads.some(p => p.c === previewTile.c && p.r === previewTile.r);
      const rBoost = onPad ? 1.25 : 1;
      if (pSpec.range > 0) {
        ctx.beginPath();
        ctx.arc(px, py, pSpec.range * rBoost, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.strokeRect(previewTile.c * TILE + 2, previewTile.r * TILE + 2, TILE - 4, TILE - 4);
      ctx.lineWidth = 1;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Bauen', px, py + 4);
    }
  }

  if (towers.length > 0) {
    let mvp = towers[0];
    towers.forEach(t => { if ((t.totalDmg || 0) > (mvp.totalDmg || 0)) mvp = t; });
    if ((mvp.totalDmg || 0) > 0) {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', mvp.x, mvp.y - 17);
    }
  }

  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  effects.forEach(fx => {
    ctx.globalAlpha = Math.min(1, fx.life / 12);
    ctx.fillStyle = fx.color;
    if (fx.dot) {
      ctx.fillRect(fx.x, fx.y, 2.5, 2.5);
    } else {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fx.txt, fx.x, fx.y);
    }
  });
  ctx.globalAlpha = 1;

  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(168, 85, 247, ${flashTimer * 0.03})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flashTimer--;
  }

  if (gameOver) {
    const mvpEl = document.getElementById('mvp-summary');
    if (mvpEl && towers.length > 0) {
      let mvp = towers[0];
      towers.forEach(t => { if ((t.totalDmg || 0) > (mvp.totalDmg || 0)) mvp = t; });
      const spec = towerTypes[mvp.type];
      mvpEl.textContent = (mvp.totalDmg || 0) > 0
        ? `👑 MVP-Turm: ${spec.name} (${Math.round(mvp.totalDmg).toLocaleString('de-DE')} Schaden)`
        : '';
    }
  }
}

function loop() {
  for (let s = 0; s < gameSpeed; s++) step();
  draw();
  updateUI();
  requestAnimationFrame(loop);
}

// === INIT ===
window.addEventListener('DOMContentLoaded', () => {
  updateDiffLocks();
  updateDailyButton();
  updatePrestigeUI();
  openStartMenu();
  if (canClaimDaily()) setTimeout(openDailyReward, 350);
});

resetGame();
loop();
