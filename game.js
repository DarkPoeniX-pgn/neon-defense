const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 12, ROWS = 10, TILE = 40;
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

const maps = [
  [{c:0,r:1},{c:9,r:1},{c:9,r:4},{c:2,r:4},{c:2,r:7},{c:10,r:7},{c:10,r:9}],
  [{c:0,r:1},{c:10,r:1},{c:10,r:8},{c:1,r:8},{c:1,r:3},{c:8,r:3},{c:8,r:6},{c:4,r:6},{c:4,r:5}],
  [{c:1,r:0},{c:1,r:8},{c:4,r:8},{c:4,r:1},{c:7,r:1},{c:7,r:8},{c:10,r:8},{c:10,r:1}]
];

const towerTypes = {
  laser:  { name: 'Laser',  cost: 50,  range: 115, dmg: 18, rate: 25, color: '#38bdf8', slow: 0,   splash: 0 },
  ice:    { name: 'Eis',    cost: 75,  range: 105, dmg: 8,  rate: 35, color: '#a5f3fc', slow: 0.5, splash: 0 },
  rocket: { name: 'Rakete', cost: 110, range: 135, dmg: 45, rate: 65, color: '#f43f5e', slow: 0,   splash: 55 }
};

let currentMap = 0, waypoints = maps[0], hp = 20, gold = 120, wave = 0;
let bestScores = JSON.parse(localStorage.getItem('tdBestMaps')) ||[0,0,0];
let buildType = 'laser', selectedTower = null, gameSpeed = 1, flashTimer = 0;
let towers = [], enemies = [], bullets = [], spawnQueue = [], spawnTimer = 0, gameOver = false;

function changeMap() {
  currentMap = Number(document.getElementById('map-sel').value);
  waypoints = maps[currentMap];
  resetGame();
}

function resetGame() {
  hp = 20; gold = 120; wave = 0; gameOver = false;
  towers = []; enemies = []; bullets = []; spawnQueue = [];
  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  document.getElementById('gameover-overlay').style.display = 'none';
  document.getElementById('btn-wave').disabled = false;
  updateUI();
}

function isPathTile(c, r) {
  for (let i = 0; i < waypoints.length - 1; i++) {
    let a = waypoints[i], b = waypoints[i + 1];
    if (c >= Math.min(a.c, b.c) && c <= Math.max(a.c, b.c) && r >= Math.min(a.r, b.r) && r <= Math.max(a.r, b.r)) return true;
  }
  return false;
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('btn-spd');
  btn.textContent = gameSpeed === 2 ? '2x ⏩' : '1x ⏩';
  btn.classList.toggle('fast', gameSpeed === 2);
}

function airstrike() {
  if (gold < 90 || !enemies.length || gameOver) return;
  gold -= 90; flashTimer = 12;
  const dmg = 80 + wave * 25;
  enemies.forEach(e => e.hp -= dmg);
  updateUI();
}

function selectType(type) {
  buildType = type; selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('t-' + type).classList.add('active');
}

canvas.addEventListener('click', e => {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / TILE);
  const r = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / TILE);

  const existing = towers.find(t => t.c === c && t.r === r);
  if (existing) { selectedTower = existing; updateUpgradeBar(); return; }

  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  if (isPathTile(c, r) || gold < towerTypes[buildType].cost) return;

  gold -= towerTypes[buildType].cost;
  towers.push({ c, r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, type: buildType, lvl: 1, cd: 0, spent: towerTypes[buildType].cost });
  updateUI();
});
  function updateUpgradeBar() {
  if (!selectedTower) return;
  const spec = towerTypes[selectedTower.type];
  const upgCost = Math.floor(spec.cost * 0.8 * selectedTower.lvl);
  document.getElementById('upgrade-bar').style.display = 'flex';
  document.getElementById('sel-info').textContent = `${spec.name} St.${selectedTower.lvl}`;
  document.getElementById('btn-upg').textContent = selectedTower.lvl >= 4 ? 'MAX' : `⬆️ +1 (${upgCost}💰)`;
  document.getElementById('btn-upg').disabled = selectedTower.lvl >= 4 || gold < upgCost;
}

function upgradeTower() {
  if (!selectedTower || selectedTower.lvl >= 4) return;
  const upgCost = Math.floor(towerTypes[selectedTower.type].cost * 0.8 * selectedTower.lvl);
  if (gold < upgCost) return;
  gold -= upgCost; selectedTower.spent += upgCost; selectedTower.lvl++;
  updateUI(); updateUpgradeBar();
}

function sellTower() {
  if (!selectedTower) return;
  gold += Math.floor(selectedTower.spent * 0.7);
  towers = towers.filter(t => t !== selectedTower);
  selectedTower = null; document.getElementById('upgrade-bar').style.display = 'none';
  updateUI();
}

function startWave() {
  if (spawnQueue.length || enemies.length || gameOver) return;
  wave++;
  if (wave > bestScores[currentMap]) {
    bestScores[currentMap] = wave;
    localStorage.setItem('tdBestMaps', JSON.stringify(bestScores));
  }
  document.getElementById('btn-wave').disabled = true;
  const count = 6 + wave * 3;
  for (let i = 0; i < count; i++) {
    const isBoss = wave % 5 === 0 && i === count - 1;
    const isFast = !isBoss && wave >= 2 && i % 4 === 0;
    const baseHp = (45 + wave * 22) * (isBoss ? 5 : isFast ? 0.7 : 1);
    spawnQueue.push({
      x: waypoints[0].c * TILE + TILE / 2, y: waypoints[0].r * TILE + TILE / 2, wp: 1, hp: baseHp, maxHp: baseHp,
      speed: isBoss ? 0.75 : isFast ? 2.1 : 1.25 + Math.min(wave * 0.04, 0.8),
      reward: isBoss ? 60 : 12 + Math.floor(wave / 2), slowTimer: 0,
      color: isBoss ? '#facc15' : isFast ? '#a855f7' : '#ef4444', radius: isBoss ? 15 : isFast ? 9 : 11
    });
  }
  updateUI();
}

function updateUI() {
  document.getElementById('hp').textContent = hp;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = bestScores[currentMap];
  document.getElementById('btn-nuke').disabled = gold < 90 || enemies.length === 0 || gameOver;
  if (selectedTower) updateUpgradeBar();
}

function step() {
  if (gameOver) return;
  if (spawnQueue.length > 0) {
    if (--spawnTimer <= 0) { enemies.push(spawnQueue.shift()); spawnTimer = Math.max(18, 42 - wave * 2); }
  } else if (enemies.length === 0) {
    document.getElementById('btn-wave').disabled = false;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (e.slowTimer > 0) e.slowTimer--;
    let spd = e.speed * (e.slowTimer > 0 ? 0.5 : 1);
    let target = waypoints[e.wp];
    let tx = target.c * TILE + TILE / 2, ty = target.r * TILE + TILE / 2;
    let dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);
    if (dist < spd) {
      if (++e.wp >= waypoints.length) {
        hp--; enemies.splice(i, 1); updateUI();
        if (hp <= 0) {
          gameOver = true;
          document.getElementById('end-wave').textContent = wave;
          document.getElementById('gameover-overlay').style.display = 'flex';
        }
      }
    } else { e.x += (dx / dist) * spd; e.y += (dy / dist) * spd; }
  }

  towers.forEach(t => {
    const spec = towerTypes[t.type];
    const range = spec.range + (t.lvl - 1) * 14;
    const dmg = spec.dmg * (1 + (t.lvl - 1) * 0.55);
    if (t.cd > 0) { t.cd--; return; }
    const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= range);
    if (target) {
      t.cd = Math.max(8, spec.rate - (t.lvl - 1) * 3);
      bullets.push({ x: t.x, y: t.y, target, dmg, color: spec.color, slow: spec.slow, splash: spec.splash });
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i], dx = b.target.x - b.x, dy = b.target.y - b.y, dist = Math.hypot(dx, dy);
    if (dist < 10) {
      if (b.splash > 0) enemies.forEach(e => { if (Math.hypot(e.x - b.target.x, e.y - b.target.y) <= b.splash) e.hp -= b.dmg; });
      else { b.target.hp -= b.dmg; if (b.slow > 0) b.target.slowTimer = 90; }
      bullets.splice(i, 1);
    } else { b.x += (dx / dist) * 7; b.y += (dy / dist) * 7; }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) { gold += enemies[i].reward; enemies.splice(i, 1); updateUI(); }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = isPathTile(c, r) ? '#1e293b' : '#0f172a';
      ctx.fillRect(c * TILE, r * TILE, TILE - 1, TILE - 1);
    }
  }
  const end = waypoints[waypoints.length - 1];
  ctx.fillStyle = '#22c55e'; ctx.fillRect(end.c * TILE + 6, end.r * TILE + 6, TILE - 12, TILE - 12);

  enemies.forEach(e => {
    ctx.fillStyle = e.slowTimer > 0 ? '#67e8f9' : e.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - 12, e.y - e.radius - 7, 24, 4);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(e.x - 12, e.y - e.radius - 7, 24 * (e.hp / e.maxHp), 4);
  });

  towers.forEach(t => {
    const spec = towerTypes[t.type], range = spec.range + (t.lvl - 1) * 14;
    if (selectedTower === t) { ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'; ctx.beginPath(); ctx.arc(t.x, t.y, range, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = spec.color; ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#090d16'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.lvl, t.x, t.y + 4);
  });

  bullets.forEach(b => { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
  if (flashTimer > 0) { ctx.fillStyle = `rgba(168, 85, 247, ${flashTimer * 0.04})`; ctx.fillRect(0, 0, canvas.width, canvas.height); flashTimer--; }
}

function loop() {
  for (let s = 0; s < gameSpeed; s++) step();
  draw();
  updateUI();
  requestAnimationFrame(loop);
}
updateUI();
loop();
  
  
