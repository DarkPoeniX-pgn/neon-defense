const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 12, ROWS = 10, TILE = 40;
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

const maps = new Array(
  new Array({c:0,r:1},{c:9,r:1},{c:9,r:4},{c:2,r:4},{c:2,r:7},{c:10,r:7},{c:10,r:9}),
  new Array({c:0,r:1},{c:10,r:1},{c:10,r:8},{c:1,r:8},{c:1,r:3},{c:8,r:3},{c:8,r:6},{c:4,r:6},{c:4,r:5}),
  new Array({c:1,r:0},{c:1,r:8},{c:4,r:8},{c:4,r:1},{c:7,r:1},{c:7,r:8},{c:10,r:8},{c:10,r:1})
);

const towerTypes = {
  laser:  { name: 'Laser',  cost: 50,  range: 115, dmg: 18, rate: 25, color: '#38bdf8', slow: 0,   splash: 0 },
  ice:    { name: 'Eis',    cost: 75,  range: 105, dmg: 8,  rate: 35, color: '#a5f3fc', slow: 0.5, splash: 0 },
  sniper: { name: 'Sniper', cost: 95,  range: 215, dmg: 75, rate: 85, color: '#4ade80', slow: 0,   splash: 0 },
  rocket: { name: 'Rakete', cost: 110, range: 135, dmg: 45, rate: 65, color: '#f43f5e', slow: 0,   splash: 55 },
  mine:   { name: 'Mine',   cost: 100, range: 0,   dmg: 0,  rate: 0,  color: '#facc15', slow: 0,   splash: 0 }
};

let currentMap = 0, diffMult = 1, waypoints = maps.at(0), hp = 20, gold = 175, wave = 0;
let bestScores = JSON.parse(localStorage.getItem('tdBestMaps')) || new Array(0, 0, 0);
let buildType = 'laser', selectedTower = null, gameSpeed = 1, flashTimer = 0, waveRunning = false, gfxTick = 0;
let towers = new Array(), enemies = new Array(), bullets = new Array(), effects = new Array(), spawnQueue = new Array(), spawnTimer = 0, gameOver = false;
let soundOn = true, audioCtx = null;

const bgStars = Array.from({ length: 45 }, () => ({ x: Math.random() * 480, y: Math.random() * 400, r: Math.random() * 1.6 + 0.4, a: Math.random() }));

function playSfx(type) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), now = audioCtx.currentTime;
  osc.connect(gain); gain.connect(audioCtx.destination);
  if (type === 'shoot') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(520, now); osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'boom') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(130, now); osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
    gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'coin') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(780, now); osc.frequency.setValueAtTime(1040, now + 0.06);
    gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.start(now); osc.stop(now + 0.16);
  }
}

function addHitFx(x, y, dmg, color) {
  effects.push({ x, y: y - 8, txt: '-' + Math.round(dmg), color, life: 28, vy: -0.7 });
  for (let i = 0; i < 5; i++) {
    let ang = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 2.2;
    effects.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, color, life: 18, dot: true });
  }
}

function toggleSound() { soundOn = !soundOn; document.getElementById('btn-snd').textContent = soundOn ? '🔊' : '🔇'; if (soundOn) playSfx('coin'); }
function changeMap() { currentMap = Number(document.getElementById('map-sel').value); waypoints = maps.at(currentMap); resetGame(); }
function changeDiff() { diffMult = Number(document.getElementById('diff-sel').value); resetGame(); }
function resetGame() {
  hp = 20; gold = 175; wave = 0; gameOver = false; waveRunning = false;
  towers = new Array(); enemies = new Array(); bullets = new Array(); effects = new Array(); spawnQueue = new Array();
  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  document.getElementById('gameover-overlay').style.display = 'none';
  document.getElementById('btn-wave').disabled = false;
  updateUI();
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

function airstrike() {
  if (gold < 90 || !enemies.length || gameOver) return;
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
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / TILE);
  const r = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / TILE);
  const existing = towers.find(t => t.c === c && t.r === r);
  if (existing) { selectedTower = existing; updateUpgradeBar(); return; }
  selectedTower = null;
  document.getElementById('upgrade-bar').style.display = 'none';
  const spec = towerTypes[buildType];
  if (!spec || isPathTile(c, r) || gold < spec.cost) return;
  if (buildType === 'mine' && towers.filter(t => t.type === 'mine').length >= 2) return alert('Maximal 2 Gold-Minen gleichzeitig erlaubt!');
  gold -= spec.cost; playSfx('coin');
  towers.push({ c, r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, type: buildType, lvl: 1, cd: 0, spent: spec.cost });
  updateUI();
});

function getUpgCost(t) { return Math.floor(towerTypes[t.type].cost * Math.pow(1.55, t.lvl)); }

function updateUpgradeBar() {
  if (!selectedTower) return;
  const spec = towerTypes[selectedTower.type], upgCost = getUpgCost(selectedTower);
  document.getElementById('upgrade-bar').style.display = 'flex';
  const extra = selectedTower.type === 'mine' ? ` (+${35 * selectedTower.lvl}💰/Welle)` : '';
  document.getElementById('sel-info').textContent = `${spec.name} St.${selectedTower.lvl}${extra}`;
  document.getElementById('btn-upg').textContent = selectedTower.lvl >= 6 ? 'MAX' : `⬆️ +1 (${upgCost}💰)`;
  document.getElementById('btn-upg').disabled = selectedTower.lvl >= 6 || gold < upgCost;
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
function startWave() {
  if (spawnQueue.length || enemies.length || gameOver) return;
  wave++; waveRunning = true;
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
      reward: isBoss ? 50 : Math.min(14, 7 + Math.floor(wave / 3)), slowTimer: 0,
      armor: isTank ? 0.45 : 1, shield: isShield, healer: isHealer, healCd: 85,
      color: isBoss ? '#facc15' : isShield ? '#22d3ee' : isHealer ? '#ec4899' : isTank ? '#3b82f6' : isFast ? '#a855f7' : '#ef4444',
      radius: isBoss ? 15 : isTank ? 13 : isFast ? 10 : 11
    });
  }
  updateUI();
}

function updateUI() {
  document.getElementById('hp').textContent = hp;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = bestScores.at(currentMap);
  document.getElementById('btn-nuke').disabled = gold < 90 || enemies.length === 0 || gameOver;
  new Array('laser', 'ice', 'sniper', 'rocket', 'mine').forEach(t => {
    document.getElementById('t-' + t).style.opacity = gold < towerTypes[t].cost ? '0.4' : '1';
  });
  if (selectedTower) updateUpgradeBar();
}

function step() {
  if (gameOver) return;
  if (spawnQueue.length > 0) {
    if (--spawnTimer <= 0) { enemies.push(spawnQueue.shift()); spawnTimer = Math.max(18, 42 - wave * 2); }
  } else if (enemies.length === 0 && waveRunning) {
    waveRunning = false;
    document.getElementById('btn-wave').disabled = false;
    let mined = 0;
    towers.forEach(t => { if (t.type === 'mine') mined += 35 * t.lvl; });
    if (mined > 0) { gold += mined; playSfx('coin'); }
    updateUI();
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
        if (hp <= 0) {
          gameOver = true;
          document.getElementById('end-wave').textContent = wave;
          document.getElementById('gameover-overlay').style.display = 'flex';
        }
      }
    } else { e.x += (dx / dist) * spd; e.y += (dy / dist) * spd; }
  }

  towers.forEach(t => {
    if (t.type === 'mine') return;
    const spec = towerTypes[t.type], range = spec.range + (t.lvl - 1) * 16, dmg = spec.dmg * (1 + (t.lvl - 1) * 0.55);
    if (t.cd > 0) { t.cd--; return; }
    const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= range);
    if (target) {
      t.cd = Math.max(8, spec.rate - (t.lvl - 1) * 3); playSfx('shoot');
      bullets.push({ x: t.x, y: t.y, target, dmg, color: spec.color, slow: spec.slow, splash: spec.splash, pierce: t.type === 'sniper' });
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets.at(i), dx = b.target.x - b.x, dy = b.target.y - b.y, dist = Math.hypot(dx, dy);
    if (dist < 10) {
      if (b.splash > 0) {
        playSfx('boom');
        enemies.forEach(e => {
          if (Math.hypot(e.x - b.target.x, e.y - b.target.y) <= b.splash) {
            let dealt = b.dmg * (e.shield ? 0.15 : 1); e.hp -= dealt; addHitFx(e.x, e.y, dealt, b.color);
          }
        });
      } else {
        let dealt = b.dmg * (b.pierce ? 1 : b.target.armor);
        b.target.hp -= dealt; addHitFx(b.target.x, b.target.y, dealt, b.color);
        if (b.slow > 0) b.target.slowTimer = 90;
      }
      bullets.splice(i, 1);
    } else { b.x += (dx / dist) * 8; b.y += (dy / dist) * 8; }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies.at(i).hp <= 0) { gold += enemies.at(i).reward; enemies.splice(i, 1); playSfx('coin'); updateUI(); }
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
  const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= spec.range + (t.lvl - 1) * 16);
  const ang = target ? Math.atan2(target.y - t.y, target.x - t.x) : 0;

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = '#0f172a'; ctx.strokeStyle = spec.color; ctx.lineWidth = 2;

  if (t.type === 'mine') {
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeRect(-14, -14, 28, 28);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$', 0, 6);
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(ang);
    ctx.fillStyle = spec.color;
    if (t.type === 'laser') {
      ctx.fillRect(0, -6, 17, 3.5); ctx.fillRect(0, 2.5, 17, 3.5);
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'ice') {
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(14, 0); ctx.lineTo(0, 2.5); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'sniper') {
      ctx.fillRect(0, -2.5, 22, 5);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
    } else if (t.type === 'rocket') {
      ctx.fillRect(-7, -10, 18, 7); ctx.fillRect(-7, 3, 18, 7);
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(15, -6.5); ctx.lineTo(10, -10); ctx.lineTo(10, -3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(15, 6.5); ctx.lineTo(10, 3); ctx.lineTo(10, 10); ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = '#090d16'; ctx.beginPath(); ctx.arc(t.x + 11, t.y + 11, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.lvl, t.x + 11, t.y + 14);
}

function drawEnemy(e) {
  const wp = waypoints.at(e.wp) || e;
  const ang = Math.atan2(wp.r * TILE + TILE / 2 - e.y, wp.c * TILE + TILE / 2 - e.x);
  const col = e.slowTimer > 0 ? '#67e8f9' : e.color;

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(ang);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8;

  if (e.speed > 2) {
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-9, -8); ctx.lineTo(-4, 0); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill();
  } else if (e.armor < 1) {
    ctx.fillRect(-12, -10, 24, 20); ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = col; ctx.fillRect(0, -2, 15, 4);
  } else if (e.healer) {
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-6, -2, 12, 4); ctx.fillRect(-2, -6, 4, 12);
  } else if (e.radius >= 15) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      let a = (i * Math.PI) / 4, r = i % 2 === 0 ? 17 : 11;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(0, -10); ctx.lineTo(-10, 0); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  if (e.shield) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
  if (e.healer) { ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)'; ctx.beginPath(); ctx.arc(e.x, e.y, 75, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(e.x - 12, e.y - e.radius - 9, 24, 4);
  ctx.fillStyle = '#4ade80'; ctx.fillRect(e.x - 12, e.y - e.radius - 9, 24 * (e.hp / e.maxHp), 4);
}

function draw() {
  gfxTick++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bgStars.forEach(s => {
    ctx.fillStyle = `rgba(148, 163, 184, ${0.25 + Math.sin(gfxTick * 0.03 + s.a * 6) * 0.2})`;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  });

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isPathTile(c, r)) {
        ctx.fillStyle = '#162036'; ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)'; ctx.strokeRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
      } else {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)'; ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)'; ctx.lineWidth = 3; ctx.beginPath();
  waypoints.forEach((w, idx) => { let wx = w.c * TILE + TILE / 2, wy = w.r * TILE + TILE / 2; idx === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy); });
  ctx.stroke(); ctx.lineWidth = 1;

  const start = waypoints.at(0), end = waypoints.at(waypoints.length - 1);
  ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(start.c * TILE + TILE / 2, start.r * TILE + TILE / 2, 12 + Math.sin(gfxTick * 0.08) * 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#22c55e'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(end.c * TILE + TILE / 2, end.r * TILE + TILE / 2, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 1;

  enemies.forEach(drawEnemy);
  towers.forEach(t => {
    const spec = towerTypes[t.type], range = spec.range + (t.lvl - 1) * 16;
    if (selectedTower === t && range > 0) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)'; ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath(); ctx.arc(t.x, t.y, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    drawTower(t);
  });

  bullets.forEach(b => {
    ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  });

  effects.forEach(fx => {
    ctx.globalAlpha = Math.min(1, fx.life / 12); ctx.fillStyle = fx.color;
    fx.dot ? ctx.fillRect(fx.x, fx.y, 3, 3) : (ctx.font = 'bold 11px sans-serif', ctx.textAlign = 'center', ctx.fillText(fx.txt, fx.x, fx.y));
  });
  ctx.globalAlpha = 1;
  if (flashTimer > 0) { ctx.fillStyle = `rgba(168, 85, 247, ${flashTimer * 0.04})`; ctx.fillRect(0, 0, canvas.width, canvas.height); flashTimer--; }
}

function loop() {
  for (let s = 0; s < gameSpeed; s++) step();
  draw(); updateUI(); requestAnimationFrame(loop);
}
updateUI();
loop();
      
