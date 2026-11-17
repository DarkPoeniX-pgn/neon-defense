const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 12, ROWS = 10, TILE = 40;
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

let customMap = JSON.parse(localStorage.getItem('tdCustomMap')) || new Array({c:0,r:2},{c:11,r:2},{c:11,r:7},{c:0,r:7});
const maps = new Array(
  // K1: Neon-Pfad (Start)
  new Array({c:0,r:1},{c:9,r:1},{c:9,r:4},{c:2,r:4},{c:2,r:7},{c:10,r:7},{c:10,r:9}),
  // K2: Doppel-Schleife (ab K1 Welle 20)
  new Array({c:0,r:1},{c:10,r:1},{c:10,r:8},{c:1,r:8},{c:1,r:3},{c:8,r:3},{c:8,r:6},{c:4,r:6},{c:4,r:5}),
  // K3: Blitz-Zickzack (ab K2 Welle 20)
  new Array({c:1,r:0},{c:1,r:8},{c:4,r:8},{c:4,r:1},{c:7,r:1},{c:7,r:8},{c:10,r:8},{c:10,r:1}),
  // K4: Kreuz-Labyrinth (ab K3 Welle 20)
  new Array({c:0,r:4},{c:5,r:4},{c:5,r:1},{c:9,r:1},{c:9,r:8},{c:3,r:8},{c:3,r:6},{c:11,r:6}),
  // K5: Doppel-Schlange (ab K4 Welle 20)
  new Array({c:0,r:1},{c:11,r:1},{c:11,r:3},{c:1,r:3},{c:1,r:5},{c:11,r:5},{c:11,r:7},{c:1,r:7},{c:1,r:9},{c:11,r:9}),
  // K6: Neon-Zitadelle (ab K5 Welle 20)
  new Array({c:0,r:0},{c:11,r:0},{c:11,r:9},{c:0,r:9},{c:0,r:2},{c:9,r:2},{c:9,r:7},{c:2,r:7},{c:2,r:4},{c:7,r:4}),
  // Index 6: Eigene Map
  customMap
);

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
  laser:   { name: '⚪Laser',          cost: 50,  range: 115, dmg: 18,  rate: 25, color: '#38bdf8', slow: 0,   splash: 0 },
  ice:     { name: '⚪Eis',            cost: 75,  range: 105, dmg: 8,   rate: 35, color: '#a5f3fc', slow: 0.5, splash: 0 },
  sniper:  { name: '🔵Sniper',         cost: 95,  range: 215, dmg: 75,  rate: 85, color: '#4ade80', slow: 0,   splash: 0 },
  rocket:  { name: '🔵Rakete',         cost: 110, range: 135, dmg: 45,  rate: 65, color: '#f43f5e', slow: 0,   splash: 55 },
  mine:    { name: '🔵Bank',           cost: 100, range: 0,   dmg: 0,   rate: 0,  color: '#facc15', slow: 0,   splash: 0 },
  tesla:   { name: '🟣Tesla',          cost: 130, range: 130, dmg: 32,  rate: 32, color: '#c084fc', slow: 0,   splash: 0 },
  plasma:  { name: '🟣Plasma',         cost: 180, range: 150, dmg: 110, rate: 28, color: '#fb923c', slow: 0,   splash: 0 },
  cryo:    { name: '🟣 Kryo-Sturm',    cost: 160, range: 115, dmg: 18,  rate: 48, color: '#a855f7', slow: 1,   splash: 65 },
  orbital: { name: '🔴 Orbital-Laser', cost: 240, range: 210, dmg: 42,  rate: 16, color: '#ef4444', slow: 0,   splash: 0 },
  void:    { name: '🟡 Schwarzes Loch',cost: 320, range: 135, dmg: 135, rate: 55, color: '#facc15', slow: 1,   splash: 85 }
};

let currentMap = 0, diffMult = 0.75, waypoints = maps.at(0), hp = 20, maxHp = 20, gold = 175, wave = 0;
let bestScores = JSON.parse(localStorage.getItem('tdBestMaps')) || new Array(0, 0, 0, 0, 0, 0, 0);

while (bestScores.length < 7) bestScores.push(0);
let diffBest = JSON.parse(localStorage.getItem('tdDiffBest')) || { '0.75': 0, '1': 0, '1.35': 0 };

let bestScores = JSON.parse(localStorage.getItem('tdBestMaps')) || new Array(0, 0, 0, 0);
let gems = Number(localStorage.getItem('tdGems')) || 0;
let tech = JSON.parse(localStorage.getItem('tdTech')) || { gold: 0, hp: 0, dmg: 0, disc: 0 };
let unlocked = JSON.parse(localStorage.getItem('tdUnlocked')) || { tesla: false, plasma: false };
let playerName = localStorage.getItem('tdName') || 'NeonCommander';
let buildType = 'laser', selectedTower = null, gameSpeed = 1, paused = false, autoWave = false, autoCd = 0;
let editMode = false, editPts = new Array(), flashTimer = 0, waveRunning = false, gfxTick = 0;
let towers = new Array(), enemies = new Array(), bullets = new Array(), effects = new Array(), spawnQueue = new Array(), spawnTimer = 0, gameOver = false;
let pads = new Array(), rocks = new Array(), soundOn = true, audioCtx = null;

const bgStars = Array.from({ length: 45 }, () => ({ x: Math.random() * 480, y: Math.random() * 400, r: Math.random() * 1.6 + 0.4, a: Math.random() }));

function playSfx(type) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), now = audioCtx.currentTime;
  osc.connect(gain); gain.connect(audioCtx.destination);
  if (type === 'shoot') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(520, now); osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.14, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'boom') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(130, now); osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
    gain.gain.setValueAtTime(0.24, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'coin') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(780, now); osc.frequency.setValueAtTime(1040, now + 0.06);
    gain.gain.setValueAtTime(0.14, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.start(now); osc.stop(now + 0.16);
  }
}

function addHitFx(x, y, dmg, color) {
  effects.push({ x, y: y - 8, txt: '-' + Math.round(dmg), color, life: 26, vy: -0.7 });
  for (let i = 0; i < 4; i++) {
    let ang = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 2;
    effects.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, color, life: 16, dot: true });
  }
}
function closeOverlays(except) {
  new Array('lab-overlay', 'shop-overlay', 'rank-overlay', 'help-overlay').forEach(id => {
    if (id !== except) document.getElementById(id).style.display = 'none';
  });
}

function toggleSound() { soundOn = !soundOn; document.getElementById('btn-snd').textContent = soundOn ? '🔊' : '🔇'; if (soundOn) playSfx('coin'); }
function togglePause() { paused = !paused; const b = document.getElementById('btn-pause'); b.textContent = paused ? '▶️' : '⏸️'; b.classList.toggle('fast', paused); }
function toggleAuto() { autoWave = !autoWave; document.getElementById('btn-auto').classList.toggle('fast', autoWave); }

function toggleHelp() { closeOverlays('help-overlay'); const h = document.getElementById('help-overlay'); const open = h.style.display === 'none'; h.style.display = open ? 'flex' : 'none'; paused = open; }

function toggleShop() {
  closeOverlays('shop-overlay');
  const s = document.getElementById('shop-overlay');
  const open = s.style.display === 'none';
  s.style.display = open ? 'flex' : 'none';
  paused = open;
  if (open) updateShopUI();
}

function updateShopUI() {
  document.getElementById('shop-gems').textContent = gems;
  const shopItems = [
    { id: 'tesla', cost: 12, label: '🔵 [Selten] ⚡ Tesla-Turm (Kettenblitz, 130💰) – 12 💎', short: '🔵 ⚡ Tesla-Turm' },
    { id: 'cryo', cost: 20, label: '🟣 [Episch] 🌪️ Kryo-Sturm (Flächen-Eis, 160💰) – 20 💎', short: '🟣 🌪️ Kryo-Sturm' },
    { id: 'plasma', cost: 25, label: '🟣 [Episch] ☢️ Plasma-Werfer (Extrem-DPS, 180💰) – 25 💎', short: '🟣 ☢️ Plasma-Werfer' },
    { id: 'orbital', cost: 35, label: '🔴 [Mythisch] ☄️ Orbital-Laser (Mega-Reichweite, 240💰) – 35 💎', short: '🔴 ☄️ Orbital-Laser' },
    { id: 'void', cost: 55, label: '🟡 [Legendär] 🌌 Schwarzes Loch (Super-Nova, 320💰) – 55 💎', short: '🟡 🌌 Schwarzes Loch' }
  ];
  shopItems.forEach(item => {
    const btn = document.getElementById('buy-' + item.id);
    if (!btn) return;
    btn.textContent = unlocked[item.id] ? `✅ ${item.short} (Freigeschaltet)` : item.label;
    btn.disabled = unlocked[item.id] || gems < item.cost;
  });
}


function unlockTower(type, cost) {
  if (unlocked[type] || gems < cost) return;
  gems -= cost; unlocked[type] = true;
  localStorage.setItem('tdGems', gems);
  localStorage.setItem('tdUnlocked', JSON.stringify(unlocked));
  playSfx('coin'); updateShopUI(); updateUI();
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
  document.getElementById('lab-gems').textContent = gems;
  new Array('gold', 'hp', 'dmg', 'disc').forEach(k => {
    const lvl = tech[k] || 0;
    const isMax = k === 'disc' && lvl >= 8;
    const cost = (k === 'dmg' || k === 'disc' ? 4 : 3) + lvl * 2;
    document.getElementById('t-lvl-' + k).textContent = lvl;
    document.getElementById('t-cost-' + k).textContent = isMax ? 'MAX' : cost;
    document.getElementById('lab-' + k).disabled = isMax || gems < cost;
  });
}

function buyTech(k) {
  const lvl = tech[k] || 0;
  if (k === 'disc' && lvl >= 8) return;
  const cost = (k === 'dmg' || k === 'disc' ? 4 : 3) + lvl * 2;
  if (gems < cost) return;
  gems -= cost; tech[k] = lvl + 1;
  localStorage.setItem('tdGems', gems);
  localStorage.setItem('tdTech', JSON.stringify(tech));
  playSfx('coin'); updateLabUI();
  if (wave === 0) resetGame(); else updateUI();
}
function closeOverlays(except) {
  new Array('lab-overlay', 'shop-overlay', 'rank-overlay', 'help-overlay', 'road-overlay').forEach(id => {
    const el = document.getElementById(id);
    if (el && id !== except) el.style.display = 'none';
  });
}

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
    const connector = idx < mapMeta.length - 1
      ? `<div style="width:4px;height:14px;background:${cleared ? '#4ade80' : '#334155'};margin:2px 0;border-radius:2px;"></div>`
      : '';

    const statusTxt = isCustom
      ? 'Frei baubar'
      : !isUnlocked
        ? `🔒 Schaffe Welle 20 auf K${idx}`
        : cleared
          ? `✅ Geschafft (Rekord: W${bestScores[idx]})`
          : `🎯 Ziel: Welle 20 (Rekord: W${bestScores[idx]})`;

    return `
      <button class="upg" onclick="selectRoadMap(${idx})" ${!isUnlocked ? 'disabled' : ''}
        style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:8px 10px;
        border:${isCurrent ? '2px solid #38bdf8' : '1px solid #334155'};
        background:${isCurrent ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.85)'};
        opacity:${isUnlocked ? '1' : '0.55'};">
        <span style="font-weight:bold;">${isUnlocked ? '' : '🔒 '}${m.name}</span>
        <span style="font-size:11px;color:${cleared ? '#4ade80' : '#cbd5e1'};">${statusTxt}</span>
      </button>${connector}`;
  }).join('');
}

function selectRoadMap(idx) {
  if (idx > 0 && idx < 6 && bestScores[idx - 1] < 20) return;
  currentMap = idx;
  waypoints = maps.at(currentMap);
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

  sel.options.item(0).text = '🟢 Leicht';
  sel.options.item(1).disabled = !normalUnlocked;
  sel.options.item(1).text = normalUnlocked ? '🟡 Normal' : '🔒 Normal (Leicht W20)';
  sel.options.item(2).disabled = !extremUnlocked;
  sel.options.item(2).text = extremUnlocked ? '🔴 Extrem' : '🔒 Extrem (Normal W20)';

  if ((diffMult === 1 && !normalUnlocked) || (diffMult === 1.35 && !extremUnlocked)) {
    diffMult = 0.75;
    sel.value = '0.75';
  }
}


function toggleEditor() {
  if (!editMode) {
    editMode = true; editPts = new Array();
    currentMap = 6;
    const btn = document.getElementById('btn-road');
    if (btn) btn.textContent = '🛠️ Eigene';
    document.getElementById('btn-edit').textContent = '💾 Fertig';
    document.getElementById('btn-edit').classList.add('fast');
    alert('Tippe nacheinander auf Start- & Eckpunkte. Danach auf "💾 Fertig" tippen!');
  } else {
    if (editPts.length >= 2) { customMap = editPts; maps.splice(6, 1, customMap); localStorage.setItem('tdCustomMap', JSON.stringify(customMap)); }
    editMode = false;
    document.getElementById('btn-edit').textContent = '🛠️ Map';
    document.getElementById('btn-edit').classList.remove('fast');
    waypoints = maps.at(6); resetGame();
  }
}

function changeMap() { selectRoadMap(currentMap); }
function changeDiff() {
  const val = Number(document.getElementById('diff-sel').value);
  if (val === 1 && (diffBest['0.75'] || 0) < 20) return updateDiffLocks();
  if (val === 1.35 && (diffBest['1'] || 0) < 20) return updateDiffLocks();
  diffMult = val;
  resetGame();
}

function genFeatures() {
  pads = new Array(); rocks = new Array();
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (isPathTile(c, r)) continue;
      const hash = (c * 7 + r * 13 + currentMap * 5) % 19;
      if (hash === 2 || hash === 11) pads.push({ c, r });
      else if (hash === 5 || hash === 14 || hash === 17) rocks.push({ c, r });
    }
  }
}

function resetGame() {
  maxHp = 20 + (tech.hp || 0) * 5;
  hp = maxHp;
  gold = 175 + (tech.gold || 0) * 25;
  wave = 0; gameOver = false; waveRunning = false; paused = false; autoCd = 0;
  towers = new Array(); enemies = new Array(); bullets = new Array(); effects = new Array(); spawnQueue = new Array();
  selectedTower = null; genFeatures(); updateShopUI();
  closeOverlays('');
  document.getElementById('upgrade-bar').style.display = 'none';
  document.getElementById('gameover-overlay').style.display = 'none';
  document.getElementById('btn-wave').disabled = false;
  document.getElementById('btn-pause').textContent = '⏸️';
  updatePreview(); updateUI();
}

function isPathTile(c, r) {
  for (let i = 0; i < waypoints.length - 1; i++) {
    let a = waypoints.at(i), b = waypoints.at(i + 1);
    if (c >= Math.min(a.c, b.c) && c <= Math.max(a.c, b.c) && r >= Math.min(a.r, b.r) && r <= Math.max(a.r, b.r)) return true;
  }
  return false;
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('btn-spd');
  btn.textContent = gameSpeed === 2 ? '2x' : '1x';
  btn.classList.toggle('fast', gameSpeed === 2);
}

function healBase() {
  if (gold < 120 || hp >= maxHp || gameOver || paused) return;
  gold -= 120;
  hp = Math.min(maxHp, hp + 5);
  playSfx('coin');
  addHitFx(waypoints.at(waypoints.length - 1).c * TILE + 20, waypoints.at(waypoints.length - 1).r * TILE + 10, 5, '#4ade80');
  updateUI();
}

function airstrike() {
  if (gold < 90 || !enemies.length || gameOver || paused) return;
  gold -= 90; flashTimer = 12; playSfx('boom');
  const dmg = 80 + wave * 25;
  enemies.forEach(e => { e.hp -= dmg; addHitFx(e.x, e.y, dmg, '#c084fc'); });
  updateUI();
}
function selectType(type) {
  buildType = type; selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('t-' + type);
  if (btn) btn.classList.add('active');
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / TILE);
  const r = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / TILE);

  if (editMode) {
    if (editPts.length === 0) editPts.push({ c, r });
    else {
      const last = editPts.at(editPts.length - 1);
      if (Math.abs(c - last.c) >= Math.abs(r - last.r)) editPts.push({ c, r: last.r });
      else editPts.push({ c: last.c, r });
    }
    playSfx('coin'); return;
  }

  if (gameOver) return;
  const rockIdx = rocks.findIndex(rk => rk.c === c && rk.r === r);
  if (rockIdx !== -1) {
    if (gold >= 35 && confirm('🪨 Felsen für 35💰 sprengen?')) { gold -= 35; rocks.splice(rockIdx, 1); playSfx('boom'); updateUI(); }
    return;
  }

  const existing = towers.find(t => t.c === c && t.r === r);
  if (existing) { selectedTower = existing; updateUpgradeBar(); return; }
  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  const spec = towerTypes[buildType];
  if (!spec || isPathTile(c, r) || gold < spec.cost) return;
  if (buildType === 'mine' && towers.filter(t => t.type === 'mine').length >= 2) return alert('Maximal 2 Banken gleichzeitig erlaubt!');
  const onPad = pads.some(p => p.c === c && p.r === r);
  gold -= spec.cost; playSfx('coin');
  towers.push({ c, r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, type: buildType, lvl: 1, cd: 0, spent: spec.cost, boost: onPad ? 1.25 : 1 });
  if (typeof trackQuestProgress === 'function') trackQuestProgress('tower', 1);
  
  updateUI();
});

function getUpgCost(t) {
  const disc = 1 - Math.min(0.4, (tech.disc || 0) * 0.05);
  return Math.floor(towerTypes[t.type].cost * Math.pow(1.55, t.lvl) * disc);
}

function updateUpgradeBar() {
  if (!selectedTower) return;
  const spec = towerTypes[selectedTower.type], upgCost = getUpgCost(selectedTower);
  document.getElementById('upgrade-bar').style.display = 'flex';
  const padTxt = selectedTower.boost > 1 ? '⚡' : '';
  const extra = selectedTower.type === 'mine' ? ` (+${selectedTower.lvl >= 6 ? 300 : 35 * selectedTower.lvl}💰)` : (selectedTower.lvl >= 6 ? ' ⭐MAX' : '');
  document.getElementById('sel-info').textContent = `${padTxt}${spec.name} St.${selectedTower.lvl}${extra}`;
  document.getElementById('btn-upg').textContent = selectedTower.lvl >= 6 ? '⭐ MAX' : `⬆️ +1 (${upgCost}💰)`;
  document.getElementById('btn-upg').disabled = selectedTower.lvl >= 6 || gold < upgCost;
  document.getElementById('sel-info').textContent += ' | 💥 ' + (selectedTower.totalDmg || 0);
if (typeof updateTargetButton === 'function') updateTargetButton();
  
}


function upgradeTower() {
  if (!selectedTower || selectedTower.lvl >= 6) return;
  const upgCost = getUpgCost(selectedTower);
  if (gold < upgCost) return;
  gold -= upgCost; selectedTower.spent += upgCost; selectedTower.lvl++; playSfx('coin');
  updateUI(); updateUpgradeBar();
}

function sellTower() {
  if (!selectedTower) return;
  gold += Math.floor(selectedTower.spent * 0.7); playSfx('coin');
  towers = towers.filter(t => t !== selectedTower);
  selectedTower = null; document.getElementById('upgrade-bar').style.display = 'none';
  updateUI();
}

function updatePreview() {
  const nw = wave + 1;
  let txt = `🔮 W${nw}: `;
  if (nw % 5 === 0) txt += '👑 BOSS-WELLE!';
  else if (nw >= 8) txt += '💠 Schild + 🩷 Heiler + 🔵 Tank';
  else if (nw >= 4) txt += '🩷 Heiler + 🔵 Tank + 🟣 Schnell';
  else if (nw >= 3) txt += '🔵 Gepanzerte Tanks';
  else if (nw >= 2) txt += '🟣 Schnelle Sprinter';
  else txt += '🔴 Späher-Trupp';
  document.getElementById('wave-preview').textContent = txt;
}

function startWave() {
  if (spawnQueue.length || enemies.length || gameOver || editMode) return;
  if (paused) togglePause();
  wave++; waveRunning = true; updatePreview();
  if (wave > bestScores.at(currentMap)) {
    bestScores.splice(currentMap, 1, wave);
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
    const mult = isBoss ? 6 : isTank ? 2.6 : isShield ? 1.8 : isFast ? 0.75 : 1;
    const baseHp = scale * mult;

    spawnQueue.push({
      x: waypoints.at(0).c * TILE + TILE / 2, y: waypoints.at(0).r * TILE + TILE / 2, wp: 1, hp: baseHp, maxHp: baseHp,
      speed: isBoss ? 0.8 : isTank ? 0.9 : isFast ? 2.2 : 1.3 + Math.min(wave * 0.04, 1.1),
      reward: isBoss ? 50 : Math.min(14, 7 + Math.floor(wave / 3)), slowTimer: 0, isBoss,
      armor: isTank ? 0.45 : 1, shield: isShield, healer: isHealer, healCd: 85,
      color: isBoss ? '#facc15' : isShield ? '#22d3ee' : isHealer ? '#ec4899' : isTank ? '#3b82f6' : isFast ? '#a855f7' : '#ef4444',
      radius: isBoss ? 15 : isTank ? 13 : isFast ? 10 : 11
    });
  }
  updateUI();
}
function updateUI() {
  document.getElementById('hp').textContent = hp;
  document.getElementById('max-hp').textContent = maxHp;
  document.getElementById('gold').textContent = gold;
  document.getElementById('gems').textContent = gems;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = bestScores.at(currentMap);
  document.getElementById('btn-heal').disabled = gold < 120 || hp >= maxHp || gameOver || paused;
  document.getElementById('btn-nuke').disabled = gold < 90 || enemies.length === 0 || gameOver || paused;
    new Array('laser', 'ice', 'sniper', 'rocket', 'mine', 'tesla', 'plasma', 'cryo', 'orbital', 'void').forEach(t => {
    const el = document.getElementById('t-' + t);
    if (!el) return;
    el.style.opacity = gold < towerTypes[t].cost ? '0.4' : '1';
    if (['tesla', 'plasma', 'cryo', 'orbital', 'void'].includes(t)) {
      el.style.display = unlocked[t] ? 'inline-block' : 'none';
    }
  });
  
  if (selectedTower) updateUpgradeBar();
}

function step() {
  if (gameOver || paused || editMode) return;
  if (spawnQueue.length > 0) {
    if (--spawnTimer <= 0) { enemies.push(spawnQueue.shift()); spawnTimer = Math.max(18, 42 - wave * 2); }
  } else if (enemies.length === 0 && waveRunning) {
    waveRunning = false; autoCd = 90;
    if (typeof trackQuestProgress === 'function') trackQuestProgress('wave', wave);
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
    towers.forEach(t => { if (t.type === 'mine') mined += (t.lvl >= 6 ? 300 : 35 * t.lvl); });
    if (mined > 0) { gold += mined; playSfx('coin'); }
    updateUI();
  } else if (!waveRunning && autoWave && wave > 0 && --autoCd <= 0) {
    startWave();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies.at(i);
    if (e.slowTimer > 0) e.slowTimer--;
    if (e.healer && --e.healCd <= 0) {
      e.healCd = 110;
      enemies.forEach(other => {
        if (Math.hypot(other.x - e.x, other.y - e.y) <= 75) other.hp = Math.min(other.maxHp, other.hp + other.maxHp * 0.12);
      });
    }
    let spd = e.speed * (e.slowTimer > 0 ? 0.5 : 1);
    let target = waypoints.at(e.wp);
    let tx = target.c * TILE + TILE / 2, ty = target.r * TILE + TILE / 2;
    let dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);
    if (dist < spd) {
      if (++e.wp >= waypoints.length) {
        hp--; enemies.splice(i, 1); updateUI();
        if (hp <= 0) { gameOver = true; document.getElementById('end-wave').textContent = wave; document.getElementById('gameover-overlay').style.display = 'flex'; addScoreToLeaderboard(wave);
                     }
      }
    } else { e.x += (dx / dist) * spd; e.y += (dy / dist) * spd; }
  }

  const dmgTech = 1 + (tech.dmg || 0) * 0.1;
  towers.forEach(t => {
    if (t.type === 'mine') return;
    const spec = towerTypes[t.type], range = (spec.range + (t.lvl - 1) * 16) * t.boost;
    const isMax = t.lvl >= 6;
    const dmg = spec.dmg * (1 + (t.lvl - 1) * 0.55) * t.boost * dmgTech * (t.type === 'sniper' && isMax ? 1.5 : 1);
    if (t.cd > 0) { t.cd--; return; }
    const target = pickBestTarget(t, enemies.filter(e => Math.hypot(e.x - t.x, e.y - t.y) <= range));
    
    if (target) {
      t.cd = Math.max(8, spec.rate - (t.lvl - 1) * 3); playSfx('shoot');
            bullets.push({
        owner: t, x: t.x, y: t.y, target, dmg, color: spec.color, slow: spec.slow,
              
          
        splash: spec.splash * (t.type === 'rocket' && isMax ? 1.8 : 1),
        pierce: t.type === 'sniper' || t.type === 'plasma' || t.type === 'orbital',
              
        chain: (t.type === 'laser' && isMax) || t.type === 'tesla',
        chainCount: t.type === 'tesla' ? (isMax ? 4 : 2) : 1,
        superFreeze: t.type === 'ice' && isMax
      });
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets.at(i), dx = b.target.x - b.x, dy = b.target.y - b.y, dist = Math.hypot(dx, dy);
    if (dist < 10) {
      if (b.splash > 0) {
        playSfx('boom');
        enemies.forEach(e => {
          if (Math.hypot(e.x - b.target.x, e.y - b.target.y) <= b.splash) {
            let dealt = b.dmg * (e.shield ? 0.15 : 1); e.hp -= dealt; addHitFx(e.x, e.y, dealt, b.color);if (b.owner) b.owner.totalDmg = (b.owner.totalDmg || 0) + Math.round(dealt);
            
          }
        });
      } else {
        let dealt = b.dmg * (b.pierce ? 1 : b.target.armor);
        b.target.hp -= dealt; addHitFx(b.target.x, b.target.y, dealt, b.color);if (b.owner) b.owner.totalDmg = (b.owner.totalDmg || 0) + Math.round(dealt);
        
        if (b.slow > 0) { b.target.slowTimer = b.superFreeze ? 180 : 90; if (b.superFreeze) b.target.armor = Math.min(1, b.target.armor + 0.15); }
        if (b.chain) {
          let hits = 0, last = b.target;
          enemies.forEach(e => {
            if (hits < b.chainCount && e !== last && Math.hypot(e.x - last.x, e.y - last.y) <= 95) {
              e.hp -= dealt * 0.75; addHitFx(e.x, e.y, dealt * 0.75, '#c084fc'); last = e; hits++;
            }
          });
        }
      }
      bullets.splice(i, 1);
    } else { b.x += (dx / dist) * 8; b.y += (dy / dist) * 8; }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies.at(i);
    if (e.hp <= 0) {
      gold += e.reward;
      if (typeof trackQuestProgress === 'function') trackQuestProgress('kill', 1);
      
      if (e.isBoss) { gems += 2; localStorage.setItem('tdGems', gems); addHitFx(e.x, e.y - 12, 2, '#38bdf8'); }
      enemies.splice(i, 1); playSfx('coin'); updateUI();
    }
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    let fx = effects.at(i);
    if (fx.vx) fx.x += fx.vx;
    fx.y += fx.vy;
    if (--fx.life <= 0) effects.splice(i, 1);
  }
                          }
function drawTower(t) {
  const spec = towerTypes[t.type];
  const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= (spec.range + (t.lvl - 1) * 16) * t.boost);
  const ang = target ? Math.atan2(target.y - t.y, target.x - t.x) : 0;
  if (t.lvl >= 6) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, 18, 0, Math.PI * 2); ctx.stroke(); }

  ctx.save(); ctx.translate(t.x, t.y);
  ctx.fillStyle = '#0f172a'; ctx.strokeStyle = spec.color; ctx.lineWidth = 2;
  if (t.type === 'mine') {
    ctx.fillRect(-14, -14, 28, 28); ctx.strokeRect(-14, -14, 28, 28);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 6);
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(ang); ctx.fillStyle = spec.color;
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
  ctx.fillStyle = t.lvl >= 6 ? '#facc15' : '#090d16'; ctx.beginPath(); ctx.arc(t.x + 11, t.y + 11, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = t.lvl >= 6 ? '#090d16' : '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.lvl, t.x + 11, t.y + 14);
}

function drawEnemy(e) {
  const wp = waypoints.at(e.wp) || e;
  const ang = Math.atan2(wp.r * TILE + TILE / 2 - e.y, wp.c * TILE + TILE / 2 - e.x);
  const col = e.slowTimer > 0 ? '#67e8f9' : e.color;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.healer) { ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)'; ctx.beginPath(); ctx.arc(0, 0, 75, 0, Math.PI * 2); ctx.stroke(); }
  if (e.shield) {
    ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = 'rgba(56, 189, 248, 0.18)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 6; i++) { let a = (i * Math.PI) / 3 + gfxTick * 0.03; i === 0 ? ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16) : ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.save(); ctx.rotate(ang); ctx.fillStyle = col;
  if (e.speed > 2) { ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-15 - (gfxTick % 4), 0); ctx.lineTo(-6, 4); ctx.fill(); }
  else if (e.armor < 1) { ctx.fillRect(-13, -11, 26, 22); ctx.fillStyle = '#93c5fd'; ctx.fillRect(8, -11, 5, 22); }
  else if (e.isBoss) { ctx.beginPath(); for (let i = 0; i < 8; i++) { let a = (i * Math.PI) / 4, r = i % 2 === 0 ? 18 : 11; i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.textAlign = 'center';
  if (e.healer) { ctx.fillStyle = '#fff'; ctx.fillRect(-6, -2, 12, 4); ctx.fillRect(-2, -6, 4, 12); }
  else if (e.armor < 1) { ctx.font = 'bold 11px sans-serif'; ctx.fillText('🛡️', 0, 4); }
  else if (e.isBoss) { ctx.font = '13px sans-serif'; ctx.fillText('👑', 0, 4); }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(e.x - 12, e.y - e.radius - 10, 24, 4);
  ctx.fillStyle = '#4ade80'; ctx.fillRect(e.x - 12, e.y - e.radius - 10, 24 * (e.hp / e.maxHp), 4);
}

function draw() {
  if (!paused) gfxTick++;
  const hint = document.getElementById("tutorial-hint"); if (hint) hint.style.display = (wave === 0 && towers.length === 0 && !editMode) ? "block" : "none";
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  bgStars.forEach(s => { ctx.fillStyle = `rgba(148, 163, 184, ${0.25 + Math.sin(gfxTick * 0.03 + s.a * 6) * 0.2})`; ctx.fillRect(s.x, s.y, s.r, s.r); });
  const pts = editMode ? editPts : waypoints;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!editMode && isPathTile(c, r)) { ctx.fillStyle = '#162036'; ctx.fillRect(c * TILE, r * TILE, TILE, TILE); }
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)'; ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  if (!editMode) {
    pads.forEach(p => { ctx.fillStyle = 'rgba(250, 204, 21, 0.14)'; ctx.fillRect(p.c * TILE + 3, p.r * TILE + 3, TILE - 6, TILE - 6); ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚡', p.c * TILE + 20, p.r * TILE + 25); });
    rocks.forEach(rk => { ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(rk.c * TILE + 20, rk.r * TILE + 20, 14, 0, Math.PI * 2); ctx.fill(); ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🪨', rk.c * TILE + 20, rk.r * TILE + 25); });
  }
  if (pts.length > 0) {
    ctx.strokeStyle = editMode ? '#facc15' : 'rgba(56, 189, 248, 0.25)'; ctx.lineWidth = 3; ctx.beginPath();
    pts.forEach((w, idx) => { let wx = w.c * TILE + TILE / 2, wy = w.r * TILE + TILE / 2; idx === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy); });
    ctx.stroke(); ctx.lineWidth = 1;
    const start = pts.at(0), end = pts.at(pts.length - 1);
    ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(start.c * TILE + TILE / 2, start.r * TILE + TILE / 2, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(end.c * TILE + TILE / 2, end.r * TILE + TILE / 2, 13, 0, Math.PI * 2); ctx.fill();
  }
  enemies.forEach(drawEnemy);
    towers.forEach(t => {
    const spec = towerTypes[t.type], range = (spec.range + (t.lvl - 1) * 16) * t.boost;
    if (showAllRanges || (typeof selectedTower !== 'undefined' && selectedTower === t)) {
      ctx.beginPath(); ctx.arc(t.x, t.y, range, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)'; ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)'; ctx.stroke();
    }
    
  
       
    drawTower(t);
  });
  bullets.forEach(b => { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
  effects.forEach(fx => { ctx.globalAlpha = Math.min(1, fx.life / 12); ctx.fillStyle = fx.color; fx.dot ? ctx.fillRect(fx.x, fx.y, 3, 3) : (ctx.font = 'bold 11px sans-serif', ctx.textAlign = 'center', ctx.fillText(fx.txt, fx.x, fx.y)); });
  ctx.globalAlpha = 1;
  if (flashTimer > 0) { ctx.fillStyle = `rgba(168, 85, 247, ${flashTimer * 0.04})`; ctx.fillRect(0, 0, canvas.width, canvas.height); flashTimer--; }
}

function loop() {
  for (let s = 0; s < gameSpeed; s++) step();
  draw(); updateUI(); requestAnimationFrame(loop);
}
// === LOKALE BESTENLISTE (OHNE EXTERNE SEITE) ===
const STORAGE_KEY_SCORES = "neonTD_highscores";
const STORAGE_KEY_NAME = "neonTD_playerName";

// 1. Gespeicherten Spielernamen beim Laden ins Eingabefeld schreiben
window.addEventListener("DOMContentLoaded", () => {
  const savedName = localStorage.getItem(STORAGE_KEY_NAME) || "";
  const nameInput = document.getElementById("player-name");
  if (nameInput) nameInput.value = savedName;
  renderLeaderboard();
});

// 2. Namen speichern (wird vom Button "💾 Name" aufgerufen)
function saveName() {
  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim() || "Spieler";
  localStorage.setItem(STORAGE_KEY_NAME, name);
  alert("Name gespeichert: " + name);
  renderLeaderboard();
}

// 3. Erreichte Welle in der Bestenliste speichern
function addScoreToLeaderboard(reachedWave) {
  if (!reachedWave || reachedWave <= 0) return;

  const name = localStorage.getItem(STORAGE_KEY_NAME) || "Spieler";
  let scores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES)) || [];

  // Neuen Eintrag hinzufügen (inkl. Datum)
  const today = new Date().toLocaleDateString("de-DE");
  scores.push({ name: name, wave: reachedWave, date: today });

  // Nach höchster Welle sortieren und auf Top 10 begrenzen
  scores.sort((a, b) => b.wave - a.wave);
  scores = scores.slice(0, 10);

  localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(scores));
  renderLeaderboard();
}

// 4. Bestenliste im HTML-Fenster (#rank-list) anzeigen
function renderLeaderboard() {
  const listEl = document.getElementById("rank-list");
  if (!listEl) return;

  const scores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES)) || [];

  if (scores.length === 0) {
    listEl.innerHTML = "<div style='opacity:0.7;text-align:center;'>Noch keine Rekorde gespeichert.</div>";
    return;
  }

  listEl.innerHTML = scores.map((entry, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
    return `
      <div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid #334155;">
        <span>${medal} <b>${entry.name}</b> <small style="opacity:0.6;">(${entry.date})</small></span>
        <span>🌊 Welle <b>${entry.wave}</b></span>
      </div>
    `;
  }).join("");
}

// 5. Öffnen/Schließen des Ranglisten-Fensters (für deinen Button "🏆 Rang")
function toggleRank() {
  const overlay = document.getElementById("rank-overlay");
  if (!overlay) return;
  const isHidden = overlay.style.display === "none" || overlay.style.display === "";
  overlay.style.display = isHidden ? "flex" : "none";
  if (isHidden) renderLeaderboard();
}
// === VOLLBILD-MODUS ===
function toggleFullscreen() {
  const elem = document.documentElement;
  const btn = document.getElementById("btn-fs");

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    // Vollbild aktivieren (inkl. Safari/iOS-Unterstützung)
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
    if (btn) btn.textContent = "✖";
  } else {
    // Vollbild beenden
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    if (btn) btn.textContent = "⛶";
  }
}

// Symbol automatisch zurücksetzen, falls der Nutzer mit "ESC" oder Wischen beendet
document.addEventListener("fullscreenchange", () => {
  const btn = document.getElementById("btn-fs");
  if (btn) btn.textContent = document.fullscreenElement ? "✖" : "⛶";
});

// === 1. ALLE REICHWEITEN ANZEIGEN (👁️ KNOPF) ===
let showAllRanges = false;

function toggleAllRanges() {
  showAllRanges = !showAllRanges;
  const btn = document.getElementById("btn-ranges");
  if (btn) btn.style.background = showAllRanges ? "#0284c7" : "";
}

// === 2. ERFOLGE & TÄGLICHE AUFGABEN (🏅 ZIELE) ===
const QUEST_STORAGE = "neonTD_quests_v1";

function getQuestData() {
  const today = new Date().toLocaleDateString("de-DE");
  let data = JSON.parse(localStorage.getItem(QUEST_STORAGE));

  if (!data) {
    data = {
      lastDay: today,
      stats: { totalKills: 0, totalTowers: 0, maxWave: 0 },
      daily: { kills: 0, waves: 0, towers: 0 },
      claimed: {}
    };
  } else {
    if (!data.daily) data.daily = { kills: 0, waves: 0, towers: 0 };
    if (data.lastDay !== today) {
      data.lastDay = today;
      data.daily = { kills: 0, waves: 0, towers: 0 };
      delete data.claimed["daily_kills"];
      delete data.claimed["daily_waves"];
      delete data.claimed["daily_towers"];
      delete data.claimed["daily_kills_hard"];
    }
  }
  return data;
}

function saveQuestData(data) {
  localStorage.setItem(QUEST_STORAGE, JSON.stringify(data));
}

function trackQuestProgress(type, amount = 1) {
  const data = getQuestData();
  if (type === "kill") {
    data.stats.totalKills += amount;
    data.daily.kills += amount;
  } else if (type === "tower") {
    data.stats.totalTowers += amount;
    data.daily.towers = (data.daily.towers || 0) + amount;
  } else if (type === "wave") {
    if (amount > data.stats.maxWave) data.stats.maxWave = amount;
    data.daily.waves += 1;
  }
  saveQuestData(data);
}

function getQuestList(data) {
  return [
    // === 4 TÄGLICHE AUFGABEN (setzen sich jeden Tag neu zurück) ===
    { id: "daily_towers",     title: "📅 Tagesziel: 8 Türme errichten",           cur: data.daily.towers || 0, max: 8,    reward: 2 },
    { id: "daily_kills",      title: "📅 Tagesziel: 50 Gegner besiegen",          cur: data.daily.kills,       max: 50,   reward: 3 },
    { id: "daily_waves",      title: "📅 Tagesziel: 8 Wellen schaffen",           cur: data.daily.waves,       max: 8,    reward: 4 },
    { id: "daily_kills_hard", title: "📅 Tages-Profi: 180 Gegner an einem Tag",   cur: data.daily.kills,       max: 180,  reward: 6 },

    // === LANGZEIT-ERFOLGE (für echte Ausdauer & hohe Belohnungen) ===
    { id: "ach_tower15",      title: "🏆 Architekt I: 15 Türme bauen",            cur: data.stats.totalTowers, max: 15,   reward: 4 },
    { id: "ach_tower100",     title: "🏆 Architekt II: 100 Türme bauen",          cur: data.stats.totalTowers, max: 100,  reward: 10 },
    { id: "ach_tower350",     title: "🏆 Festungs-Meister: 350 Türme bauen",      cur: data.stats.totalTowers, max: 350,  reward: 20 },

    { id: "ach_kill250",      title: "🏆 Kammerjäger I: 250 Gegner besiegen",     cur: data.stats.totalKills,  max: 250,  reward: 5 },
    { id: "ach_kill1500",     title: "🏆 Kammerjäger II: 1.500 Gegner besiegen",  cur: data.stats.totalKills,  max: 1500, reward: 15 },
    { id: "ach_kill5000",     title: "🏆 Neon-Vernichter: 5.000 Gegner besiegen", cur: data.stats.totalKills,  max: 5000, reward: 30 },

    { id: "ach_wave10",       title: "🏆 Überlebender: Welle 10 erreichen",       cur: data.stats.maxWave,     max: 10,   reward: 5 },
    { id: "ach_wave20",       title: "🏆 Veteran: Welle 20 erreichen",            cur: data.stats.maxWave,     max: 20,   reward: 12 },
    { id: "ach_wave35",       title: "🏆 Großmeister: Welle 35 erreichen",        cur: data.stats.maxWave,     max: 35,   reward: 22 },
    { id: "ach_wave50",       title: "🏆 Unsterblich: Welle 50 erreichen",        cur: data.stats.maxWave,     max: 50,   reward: 40 }
  ];
}




// Diamanten einsammeln
function claimQuest(id, reward) {
  const data = getQuestData();
  if (data.claimed[id]) return;

  data.claimed[id] = true;
  saveQuestData(data);

  // Diamanten zu deiner Spiel-Variable hinzufügen
  if (typeof gems !== "undefined") {
    gems += reward;
    const gemEl = document.getElementById("gems");
    if (gemEl) gemEl.textContent = gems;
    localStorage.setItem("tdGemes", gems); // Falls du Diamanten so speicherst
  }
  renderQuests();
}

function renderQuests() {
  const listEl = document.getElementById("quest-list");
  if (!listEl) return;
  const data = getQuestData();
  const quests = getQuestList(data);

  listEl.innerHTML = quests.map(q => {
    const done = q.cur >= q.max;
    const isClaimed = !!data.claimed[q.id];
    const progress = Math.min(q.cur, q.max);

    let btnHtml = `<span style="opacity:0.6;font-size:12px;">${progress}/${q.max}</span>`;
    if (isClaimed) {
      btnHtml = `<span style="color:#4ade80;font-size:12px;">✅ Erhalten</span>`;
    } else if (done) {
      btnHtml = `<button class="upg" style="padding:4px 8px;background:#16a34a;" onclick="claimQuest('${q.id}', ${q.reward})">+${q.reward} 💎</button>`;
    }

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px;background:#0f172a;border-radius:6px;border:1px solid #334155;">
        <div style="text-align:left;font-size:13px;">
          <div><b>${q.title}</b></div>
          <div style="font-size:11px;opacity:0.75;">Fortschritt: ${progress} / ${q.max}</div>
        </div>
        <div>${btnHtml}</div>
      </div>
    `;
  }).join("");
}

function toggleQuests() {
  const overlay = document.getElementById("quest-overlay");
  if (!overlay) return;
  const isHidden = overlay.style.display === "none" || overlay.style.display === "";
  overlay.style.display = isHidden ? "flex" : "none";
  if (isHidden) renderQuests();
}

// === ZIEL-PRIORITÄT & TUTORIAL-HINWEIS ===
const TARGET_MODES = [
  { id: "first", label: "🎯 Erster" },
  { id: "strong", label: "🛡️ Stärkster" },
  { id: "fast", label: "⚡ Schnellster" }
];

function cycleTargetMode() {
  if (typeof selectedTower === "undefined" || !selectedTower) return;
  const idx = TARGET_MODES.findIndex(m => m.id === (selectedTower.targetMode || "first"));
  const next = TARGET_MODES[(idx + 1) % TARGET_MODES.length];
  selectedTower.targetMode = next.id;
  updateTargetButton();
}

function updateTargetButton() {
  const btn = document.getElementById("btn-target");
  if (!btn || typeof selectedTower === "undefined" || !selectedTower) return;
  const mode = TARGET_MODES.find(m => m.id === (selectedTower.targetMode || "first")) || TARGET_MODES[0];
  btn.textContent = mode.label;
}

function pickBestTarget(t, inRangeEnemies) {
  if (!inRangeEnemies || inRangeEnemies.length === 0) return null;
  const mode = t.targetMode || "first";
  if (mode === "strong") {
    return inRangeEnemies.reduce((a, b) => (b.hp > a.hp ? b : a));
  }
  if (mode === "fast") {
    return inRangeEnemies.reduce((a, b) => ((b.speed || 0) > (a.speed || 0) ? b : a));
  }
  return inRangeEnemies[0];
}



resetGame();
loop();
                                          

  
