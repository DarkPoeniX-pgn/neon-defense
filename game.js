const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 12, ROWS = 10, TILE = 40;
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

// Pfad-Wegpunkte (Spalte, Reihe)
const waypoints = [
  {c:0,r:1},{c:9,r:1},{c:9,r:4},{c:2,r:4},{c:2,r:7},{c:10,r:7},{c:10,r:9}
];

const towerTypes = {
  laser:  { name: 'Laser',  cost: 50,  range: 115, dmg: 18, rate: 25, color: '#38bdf8', slow: 0,   splash: 0 },
  ice:    { name: 'Eis',    cost: 75,  range: 105, dmg: 8,  rate: 35, color: '#a5f3fc', slow: 0.5, splash: 0 },
  rocket: { name: 'Rakete', cost: 110, range: 135, dmg: 45, rate: 65, color: '#f43f5e', slow: 0,   splash: 55 }
};

let hp = 20, gold = 120, wave = 0, buildType = 'laser', selectedTower = null;
let towers = [], enemies = [], bullets = [], spawnQueue = [], spawnTimer = 0, gameOver = false;

function isPathTile(c, r) {
  for (let i = 0; i < waypoints.length - 1; i++) {
    let a = waypoints[i], b = waypoints[i + 1];
    if (c >= Math.min(a.c, b.c) && c <= Math.max(a.c, b.c) &&
        r >= Math.min(a.r, b.r) && r <= Math.max(a.r, b.r)) return true;
  }
  return false;
}

function selectType(type) {
  buildType = type;
  selectedTower = null;
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
  if (existing) {
    selectedTower = existing;
    updateUpgradeBar();
    return;
  }

  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';

  if (isPathTile(c, r)) return;
  const spec = towerTypes[buildType];
  if (gold < spec.cost) return;

  gold -= spec.cost;
  towers.push({ c, r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, type: buildType, lvl: 1, cd: 0, spent: spec.cost });
  updateUI();
});

function updateUpgradeBar() {
  if (!selectedTower) return;
  const bar = document.getElementById('upgrade-bar');
  const spec = towerTypes[selectedTower.type];
  const upgCost = Math.floor(spec.cost * 0.8 * selectedTower.lvl);
  bar.style.display = 'flex';
  document.getElementById('sel-info').textContent = `${spec.name} St.${selectedTower.lvl}`;
  document.getElementById('btn-upg').textContent = selectedTower.lvl >= 4 ? 'MAX' : `⬆️ +1 (${upgCost}💰)`;
  document.getElementById('btn-upg').disabled = selectedTower.lvl >= 4 || gold < upgCost;
}

function upgradeTower() {
  if (!selectedTower || selectedTower.lvl >= 4) return;
  const spec = towerTypes[selectedTower.type];
  const upgCost = Math.floor(spec.cost * 0.8 * selectedTower.lvl);
  if (gold < upgCost) return;
  gold -= upgCost;
  selectedTower.spent += upgCost;
  selectedTower.lvl++;
  updateUI();
  updateUpgradeBar();
}

function sellTower() {
  if (!selectedTower) return;
  gold += Math.floor(selectedTower.spent * 0.7);
  towers = towers.filter(t => t !== selectedTower);
  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  updateUI();
}

function startWave() {
  if (spawnQueue.length || enemies.length || gameOver) return;
  wave++;
  document.getElementById('btn-wave').disabled = true;
  const count = 6 + wave * 3;
  for (let i = 0; i < count; i++) {
    const isBoss = wave % 5 === 0 && i === count - 1;
    const isFast = !isBoss && wave >= 2 && i % 4 === 0;
    spawnQueue.push({
      x: waypoints[0].c * TILE + TILE / 2,
      y: waypoints[0].r * TILE + TILE / 2,
      wp: 1,
      hp: (45 + wave * 22) * (isBoss ? 5 : isFast ? 0.7 : 1),
      maxHp: (45 + wave * 22) * (isBoss ? 5 : isFast ? 0.7 : 1),
      speed: isBoss ? 0.75 : isFast ? 2.1 : 1.25 + Math.min(wave * 0.04, 0.8),
      reward: isBoss ? 60 : 12 + Math.floor(wave / 2),
      slowTimer: 0,
      color: isBoss ? '#facc15' : isFast ? '#a855f7' : '#ef4444',
      radius: isBoss ? 15 : isFast ? 9 : 11
    });
  }
  updateUI();
}

function updateUI() {
  document.getElementById('hp').textContent = hp;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  if (selectedTower) updateUpgradeBar();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Raster & Pfad zeichnen
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = isPathTile(c, r) ? '#1e293b' : '#0f172a';
      ctx.fillRect(c * TILE, r * TILE, TILE - 1, TILE - 1);
    }
  }

  // Basis-Ziel markieren
  const end = waypoints[waypoints.length - 1];
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(end.c * TILE + 6, end.r * TILE + 6, TILE - 12, TILE - 12);

  // Gegner spawnen
  if (spawnQueue.length > 0) {
    spawnTimer--;
    if (spawnTimer <= 0) {
      enemies.push(spawnQueue.shift());
      spawnTimer = Math.max(18, 42 - wave * 2);
    }
  } else if (enemies.length === 0 && !gameOver) {
    document.getElementById('btn-wave').disabled = false;
  }

  // Gegner bewegen
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (e.slowTimer > 0) e.slowTimer--;
    let spd = e.speed * (e.slowTimer > 0 ? 0.5 : 1);
    let target = waypoints[e.wp];
    let tx = target.c * TILE + TILE / 2, ty = target.r * TILE + TILE / 2;
    let dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);

    if (dist < spd) {
      e.wp++;
      if (e.wp >= waypoints.length) {
        hp--;
        enemies.splice(i, 1);
        updateUI();
        if (hp <= 0) { gameOver = true; alert('💀 Game Over! Du hast Welle ' + wave + ' erreicht.'); }
        continue;
      }
    } else {
      e.x += (dx / dist) * spd;
      e.y += (dy / dist) * spd;
    }

    ctx.fillStyle = e.slowTimer > 0 ? '#67e8f9' : e.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - 12, e.y - e.radius - 7, 24, 4);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(e.x - 12, e.y - e.radius - 7, 24 * (e.hp / e.maxHp), 4);
  }

  // Türme zeichnen & schießen
  towers.forEach(t => {
    const spec = towerTypes[t.type];
    const range = spec.range + (t.lvl - 1) * 14;
    const dmg = spec.dmg * (1 + (t.lvl - 1) * 0.55);

    if (selectedTower === t) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath(); ctx.arc(t.x, t.y, range, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = spec.color;
    ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#090d16'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(t.lvl, t.x, t.y + 4);

    if (t.cd > 0) { t.cd--; return; }
    const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= range);
    if (target) {
      t.cd = Math.max(8, spec.rate - (t.lvl - 1) * 3);
      bullets.push({ x: t.x, y: t.y, target, dmg, color: spec.color, slow: spec.slow, splash: spec.splash });
    }
  });

  // Geschosse bewegen
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    let dx = b.target.x - b.x, dy = b.target.y - b.y, dist = Math.hypot(dx, dy);
    if (dist < 10) {
      if (b.splash > 0) {
        enemies.forEach(e => { if (Math.hypot(e.x - b.target.x, e.y - b.target.y) <= b.splash) e.hp -= b.dmg; });
      } else {
        b.target.hp -= b.dmg;
        if (b.slow > 0) b.target.slowTimer = 90;
      }
      bullets.splice(i, 1);
    } else {
      b.x += (dx / dist) * 7;
      b.y += (dy / dist) * 7;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Besiegte Gegner entfernen & Gold gutschreiben
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      gold += enemies[i].reward;
      enemies.splice(i, 1);
      updateUI();
    }
  }

  requestAnimationFrame(loop);
}
loop();
                                                            
