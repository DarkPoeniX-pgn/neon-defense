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
