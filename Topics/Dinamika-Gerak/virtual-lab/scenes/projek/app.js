// ===== CANVAS & CHART =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

// UI
const presetProjectile = document.getElementById("presetProjectile");
const presetCollision = document.getElementById("presetCollision");
const presetSystem = document.getElementById("presetSystem");
const presetFree = document.getElementById("presetFree");

const projectileControls = document.getElementById("projectileControls");
const collisionControls = document.getElementById("collisionControls");
const systemControls = document.getElementById("systemControls");
const freeControls = document.getElementById("freeControls");

const v0Input = document.getElementById("v0Input");
const angleInput = document.getElementById("angleInput");
const projMass = document.getElementById("projMass");
const btnNoAir = document.getElementById("btnNoAir");
const btnWithAir = document.getElementById("btnWithAir");

const col_m1 = document.getElementById("col_m1");
const col_v1 = document.getElementById("col_v1");
const col_m2 = document.getElementById("col_m2");
const col_e = document.getElementById("col_e");

const sys_mA = document.getElementById("sys_mA");
const sys_mB = document.getElementById("sys_mB");
const sys_mu = document.getElementById("sys_mu");

const fxInput = document.getElementById("fxInput");
const fyInput = document.getElementById("fyInput");
const freeMass = document.getElementById("freeMass");
const freeMu = document.getElementById("freeMu");
const gravityInput = document.getElementById("gravityInput");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const velValue = document.getElementById("velValue");
const accelValue = document.getElementById("accelValue");
const netForceValue = document.getElementById("netForceValue");
const timeValue = document.getElementById("timeValue");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");
const chartTitle = document.getElementById("chartTitle");

// ===== STATE =====
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;
let currentPreset = "projectile";
let airResistance = false;

// Projectile state
const proj = { x: 0, y: 0, vx: 0, vy: 0, trail: [] };

// Collision state
const col = { x1: 0, x2: 0, v1: 0, v2: 0, collided: false };

// Multi-body state
const sys = { xA: 0, xB: 0, vA: 0, vB: 0, a: 0 };

// Free sandbox state
const freeObj = { x: 0, y: 0, vx: 0, vy: 0 };

// ===== CANVAS RESIZE =====
function resizeCanvas() {
  const c = canvas.parentElement;
  canvas.width = c.clientWidth;
  canvas.height = c.clientHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); drawScene(); });
resizeCanvas();

// ===== CHART =====
let chart = null;
const MAX_PTS = 100;

function initChart(label1, color1, label2, color2, yLabel = "") {
  if (chart) chart.destroy();
  const ds = [{ label: label1, data: [], borderColor: color1, backgroundColor: color1 + "25", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }];
  if (label2) ds.push({ label: label2, data: [], borderColor: color2, backgroundColor: color2 + "15", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 });
  chart = new Chart(chartCanvas, {
    type: "line",
    data: { labels: [], datasets: ds },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: "#334155", font: { family: "Inter", size: 10 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 8, font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" }, title: { display: !!yLabel, text: yLabel, color: "#64748b", font: { size: 9 } } }
      }
    }
  });
}

function pushChart(t, v1, v2) {
  chart.data.labels.push(t.toFixed(2));
  chart.data.datasets[0].data.push(parseFloat(v1.toFixed(3)));
  if (v2 !== undefined && chart.data.datasets[1]) chart.data.datasets[1].data.push(parseFloat(v2.toFixed(3)));
  chart.update("none");
}

// ===== DRAW UTILS =====
function drawArrow(x1, y1, dx, dy, color, label) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const nx = dx/len, ny = dy/len, ah = 11;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1+dx-nx*ah, y1+dy-ny*ah); ctx.stroke();
  const px=-ny*5, py=nx*5;
  ctx.beginPath(); ctx.moveTo(x1+dx, y1+dy); ctx.lineTo(x1+dx-nx*ah+px, y1+dy-ny*ah+py); ctx.lineTo(x1+dx-nx*ah-px, y1+dy-ny*ah-py); ctx.fill();
  if (label) { ctx.font = "bold 11px Inter"; ctx.textAlign = "center"; ctx.fillText(label, x1+dx/2+px*1.5, y1+dy/2+py*1.5-5); }
}

function drawGround(y) {
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  ctx.strokeStyle = "#94a3b855"; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 22) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x-10, y+12); ctx.stroke(); }
}

function drawBall(x, y, r, color, label) {
  ctx.save(); ctx.shadowColor = color + "99"; ctx.shadowBlur = 12;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  if (label) { ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(9, r*0.6)}px Inter`; ctx.textAlign = "center"; ctx.fillText(label, x, y+4); }
}

// ===== PROJECTILE =====
function drawProjectileScene() {
  const g = Math.max(0, parseFloat(gravityInput.value) || 9.8);
  const v0 = parseFloat(v0Input.value) || 30;
  const angle = (parseFloat(angleInput.value) || 45) * Math.PI / 180;
  const m = Math.max(0.01, parseFloat(projMass.value) || 1);
  const v0x = v0 * Math.cos(angle), v0y = v0 * Math.sin(angle);

  const groundY = canvas.height * 0.82;
  const SCALE = 6;
  const originX = 80;
  const projX = originX + proj.x * SCALE;
  const projY = groundY - proj.y * SCALE;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky gradient
  const sg = ctx.createLinearGradient(0, 0, 0, groundY);
  sg.addColorStop(0, "#f0f9ff"); sg.addColorStop(1, "#e0f2fe");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, canvas.width, groundY);
  drawGround(groundY);

  // Ideal parabola trajectory
  const tTotal = 2 * v0y / g;
  ctx.strokeStyle = "#94a3b855"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.beginPath();
  for (let ti = 0; ti <= tTotal; ti += 0.1) {
    const tx = originX + v0x * ti * SCALE;
    const ty = groundY - (v0y * ti - 0.5 * g * ti * ti) * SCALE;
    if (ti === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
  }
  ctx.stroke(); ctx.setLineDash([]);

  // Trail
  ctx.strokeStyle = "#3b82f680"; ctx.lineWidth = 2;
  ctx.beginPath();
  proj.trail.forEach((pt, i) => {
    const px = originX + pt.x * SCALE, py = groundY - pt.y * SCALE;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Ball
  if (proj.y >= 0) drawBall(projX, projY, 14, "#3b82f6", `${m}kg`);

  // Launch point angle indicator
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(originX, groundY, 35, -angle, 0); ctx.stroke();
  ctx.fillStyle = "#f59e0b"; ctx.font = "bold 12px Inter"; ctx.textAlign = "center";
  ctx.fillText(`θ=${Math.round(parseFloat(angleInput.value))}°`, originX + 55, groundY - 12);

  // Range label
  const range = v0x * tTotal;
  ctx.fillStyle = "#475569"; ctx.font = "12px Inter"; ctx.textAlign = "left";
  ctx.fillText(`Jangkauan maks: ${range.toFixed(1)} m`, originX, groundY + 22);
  const hMax = v0y * v0y / (2 * g);
  ctx.fillText(`Tinggi maks: ${hMax.toFixed(1)} m`, originX, groundY + 38);

  // Velocity arrows on ball
  if (proj.y >= 0) {
    const va = 30;
    drawArrow(projX, projY, proj.vx * va / v0, 0, "#ef4444", `vx=${proj.vx.toFixed(1)}`);
    drawArrow(projX, projY, 0, -proj.vy * va / v0, "#10b981", `vy=${proj.vy.toFixed(1)}`);
  }

  const v = Math.hypot(proj.vx, proj.vy);
  velValue.textContent = v.toFixed(2);
  accelValue.textContent = g.toFixed(2);
  netForceValue.textContent = (m * g).toFixed(1);
  timeValue.textContent = elapsedTime.toFixed(2);

  if (!isPlaying && elapsedTime === 0) {
    statusMessage.textContent = `Siap — v₀=${v0} m/s, θ=${Math.round(parseFloat(angleInput.value))}°, Jangkauan=${range.toFixed(1)} m, H=${hMax.toFixed(1)} m`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `Gerak proyektil: v₀x = ${v0x.toFixed(1)} m/s (konstan), v₀y = ${v0y.toFixed(1)} m/s (berkurang karena gravitasi). Jangkauan R = v₀² sin(2θ)/g = ${range.toFixed(1)} m. Tinggi maks H = v₀y²/(2g) = ${hMax.toFixed(1)} m.`;
  }
}

function updateProjectile(dt) {
  const g = Math.max(0, parseFloat(gravityInput.value) || 9.8);
  const drag = airResistance ? 0.05 : 0;
  const v = Math.hypot(proj.vx, proj.vy);
  proj.vx += -drag * proj.vx * v * dt;
  proj.vy += (-g - drag * proj.vy * v) * dt;
  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
  proj.trail.push({ x: proj.x, y: proj.y });
  if (proj.trail.length > 120) proj.trail.shift();
  if (proj.y < 0) { proj.y = 0; isPlaying = false; btnPlayPause.textContent = "Mulai Simulasi"; }
  pushChart(elapsedTime, proj.x, proj.y);
  const vt = Math.hypot(proj.vx, proj.vy);
  velValue.textContent = vt.toFixed(2);
  statusMessage.textContent = `Proyektil Melayang: x=${proj.x.toFixed(1)}m, y=${proj.y.toFixed(1)}m, v=${vt.toFixed(1)}m/s`;
  statusMessage.style.borderColor = "#3b82f6";
}

// ===== COLLISION =====
function drawCollisionScene() {
  const m1 = Math.max(1, parseFloat(col_m1.value) || 10);
  const m2 = Math.max(1, parseFloat(col_m2.value) || 20);
  const g = Math.max(0, parseFloat(gravityInput.value) || 9.8);
  const e_coeff = Math.max(0, Math.min(1, parseFloat(col_e.value) || 1));

  const groundY = canvas.height * 0.72;
  const SCALE = 18;
  const originX = 80;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround(groundY);

  const r1 = Math.max(18, m1 * 0.6 + 12), r2 = Math.max(22, m2 * 0.7 + 14);
  const b1x = originX + col.x1 * SCALE, b2x = originX + col.x2 * SCALE;
  const bY = groundY - r1;

  drawBall(b1x, bY, r1, "#ef4444", `m₁=${m1}kg`);
  drawBall(b2x - r2, bY, r2, "#3b82f6", `m₂=${m2}kg`);

  if (col.v1 !== 0) drawArrow(b1x + r1, bY, Math.min(60, col.v1 * 3), 0, "#ef4444", `v₁=${col.v1.toFixed(1)}`);
  if (col.v2 !== 0) drawArrow(b2x - r2 - 10, bY, Math.min(60, col.v2 * 3) * Math.sign(col.v2), 0, "#3b82f6", `v₂=${col.v2.toFixed(1)}`);

  // Momentum labels
  const p1 = m1 * col.v1, p2 = m2 * col.v2;
  ctx.fillStyle = "#475569"; ctx.font = "12px Inter"; ctx.textAlign = "center";
  ctx.fillText(`p₁=${p1.toFixed(1)} kg·m/s`, b1x, groundY + 22);
  ctx.fillText(`p₂=${p2.toFixed(1)} kg·m/s`, b2x - r2, groundY + 38);
  ctx.fillText(`p_total=${(p1+p2).toFixed(1)} kg·m/s (kekal!)`, canvas.width/2, groundY + 55);

  velValue.textContent = `${col.v1.toFixed(1)} / ${col.v2.toFixed(1)}`;
  netForceValue.textContent = (p1 + p2).toFixed(1);
  timeValue.textContent = elapsedTime.toFixed(2);
  accelValue.textContent = col.collided ? "Tabrakan!" : "Belum";
}

function updateCollision(dt) {
  const m1 = Math.max(1, parseFloat(col_m1.value) || 10);
  const m2 = Math.max(1, parseFloat(col_m2.value) || 20);
  const e_coeff = Math.max(0, Math.min(1, parseFloat(col_e.value) || 1));
  const SCALE = 18;
  const r1 = Math.max(18, m1 * 0.6 + 12), r2 = Math.max(22, m2 * 0.7 + 14);

  col.x1 += col.v1 * dt * 0.8;

  // Collision detection: x2 - x1 < r1 + r2 (in scaled units)
  if (!col.collided && col.x2 - col.x1 <= (r1 + r2) / SCALE) {
    col.collided = true;
    const u1 = col.v1, u2 = col.v2;
    col.v1 = ((m1 - e_coeff * m2) * u1 + (1 + e_coeff) * m2 * u2) / (m1 + m2);
    col.v2 = ((m2 - e_coeff * m1) * u2 + (1 + e_coeff) * m1 * u1) / (m1 + m2);
    statusMessage.textContent = `💥 TABRAKAN! v₁ setelah=${col.v1.toFixed(1)} m/s, v₂ setelah=${col.v2.toFixed(1)} m/s`;
    statusMessage.style.borderColor = "#ef4444";
    const pBefore = m1 * u1 + m2 * u2;
    const pAfter = m1 * col.v1 + m2 * col.v2;
    conclusionText.textContent = `Hukum Kekekalan Momentum: p_sebelum = m₁u₁+m₂u₂ = ${pBefore.toFixed(1)} kg·m/s = p_sesudah = ${pAfter.toFixed(1)} kg·m/s. e=${e_coeff}.`;
  }

  col.x2 += col.v2 * dt * 0.8;
  pushChart(elapsedTime, col.v1, col.v2);
}

// ===== MULTI-BODY =====
function drawSystemScene() {
  const mA = Math.max(1, parseFloat(sys_mA.value) || 10);
  const mB = Math.max(1, parseFloat(sys_mB.value) || 30);
  const mu = Math.max(0, parseFloat(sys_mu.value) || 0.1);
  const g = Math.max(0, parseFloat(gravityInput.value) || 9.8);
  // Block A on table (pulled by Block B hanging)
  const fric = mu * mA * g;
  const netF = mB * g - fric;
  const a = Math.max(0, netF / (mA + mB));
  const T = mB * (g - a);

  const groundY = canvas.height * 0.6;
  const tableH = 30;
  const SCALE = 30;
  const tableX = 60;
  const tableW = canvas.width * 0.55;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Table
  ctx.fillStyle = "#92400e"; ctx.fillRect(tableX, groundY, tableW, tableH);
  ctx.fillStyle = "#b45309"; ctx.fillRect(tableX - 15, groundY + tableH, 20, 80); ctx.fillRect(tableX + tableW - 5, groundY + tableH, 20, 80);

  // Block A
  const axCanvas = tableX + 60 + sys.xA * SCALE;
  drawBall(axCanvas, groundY - 30, 0, "", ""); // clear
  ctx.fillStyle = "#dbeafe"; ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(axCanvas - 30, groundY - 60, 60, 55, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px Inter"; ctx.textAlign = "center";
  ctx.fillText(`mA=${mA}kg`, axCanvas, groundY - 30);
  ctx.font = "11px Inter"; ctx.fillStyle = "#475569"; ctx.fillText(`v=${sys.vA.toFixed(1)} m/s`, axCanvas, groundY - 14);

  // Rope over edge
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(axCanvas + 30, groundY - 32); ctx.lineTo(tableX + tableW + 20, groundY - 32); ctx.lineTo(tableX + tableW + 20, groundY + 40); ctx.stroke();

  // Block B hanging
  const byCanvas = groundY + 40 + sys.xA * SCALE;
  ctx.fillStyle = "#fce7f3"; ctx.strokeStyle = "#ec4899"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(tableX + tableW, byCanvas, 50, 55, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px Inter"; ctx.textAlign = "center";
  ctx.fillText(`mB=${mB}kg`, tableX + tableW + 25, byCanvas + 33);

  // Force arrows
  drawArrow(axCanvas + 30, groundY - 32, 50, 0, "#10b981", `T=${T.toFixed(0)}N`);
  drawArrow(tableX + tableW + 25, byCanvas, 0, Math.min(50, mB * g * 0.04 + 15), "#ef4444", `WB=${(mB*g).toFixed(0)}N`);
  drawArrow(axCanvas - 30, groundY - 32, -Math.min(40, fric * 0.08 + 10), 0, "#8b5cf6", `f=${fric.toFixed(0)}N`);

  velValue.textContent = sys.vA.toFixed(2);
  accelValue.textContent = a.toFixed(2);
  netForceValue.textContent = netF.toFixed(1);
  timeValue.textContent = elapsedTime.toFixed(2);
  statusMessage.textContent = `a = ${a.toFixed(2)} m/s², T = ${T.toFixed(1)} N`;
  statusMessage.style.borderColor = a > 0 ? "#3b82f6" : "#10b981";
  conclusionText.textContent = `Sistem mA+mB: ΣF = WB − f = ${(mB*g).toFixed(0)} − ${fric.toFixed(0)} = ${netF.toFixed(1)} N. a = ΣF/(mA+mB) = ${a.toFixed(2)} m/s². Tegangan tali T = mB(g−a) = ${T.toFixed(1)} N.`;
}

function updateSystem(dt) {
  const mA = Math.max(1, parseFloat(sys_mA.value) || 10);
  const mB = Math.max(1, parseFloat(sys_mB.value) || 30);
  const mu = Math.max(0, parseFloat(sys_mu.value) || 0.1);
  const g = Math.max(0, parseFloat(gravityInput.value) || 9.8);
  const fric = mu * mA * g;
  const netF = mB * g - fric;
  const a = Math.max(0, netF / (mA + mB));
  sys.vA += a * dt;
  sys.xA += sys.vA * dt;
  if (sys.xA > 3) { sys.xA = 3; isPlaying = false; btnPlayPause.textContent = "Mulai Simulasi"; }
  pushChart(elapsedTime, sys.vA, a);
}

// ===== FREE SANDBOX =====
function drawFreeScene() {
  const Fx = parseFloat(fxInput.value) || 0;
  const Fy = parseFloat(fyInput.value) || 0;
  const m = Math.max(1, parseFloat(freeMass.value) || 25);
  const mu = Math.max(0, parseFloat(freeMu.value) || 0.1);
  const g = parseFloat(gravityInput.value) || 9.8;
  const W = m * g;
  const N = Math.max(0, W - Fy);
  const fMax = mu * N;
  let fActualX = 0, netFx = 0;
  if (Math.abs(freeObj.vx) < 0.001) {
    if (Math.abs(Fx) <= fMax) { fActualX = -Fx; netFx = 0; }
    else { fActualX = -Math.sign(Fx) * fMax; netFx = Fx + fActualX; }
  } else { fActualX = -Math.sign(freeObj.vx) * fMax; netFx = Fx + fActualX; }
  const netFy = Math.max(0, Fy - W);
  freeObj.ax = netFx / m; freeObj.ay = netFy / m;
  const netTotal = Math.hypot(netFx, netFy);
  const vTotal = Math.hypot(freeObj.vx, freeObj.vy);
  const a = Math.hypot(freeObj.ax, freeObj.ay);

  const groundY = canvas.height * 0.72;
  const cx = canvas.width / 2;
  const posX = cx + freeObj.x;
  const posY = groundY - 30 - freeObj.y;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround(groundY);

  ctx.fillStyle = "#e2e8f0"; ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(posX - 30, posY - 30, 60, 60, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px Inter"; ctx.textAlign = "center";
  ctx.fillText(`${m}kg`, posX, posY + 5);

  const sc = 0.3;
  if (Math.abs(Fx) > 0) drawArrow(posX, posY, Fx * sc, 0, "#ef4444", `Fx=${Fx}N`);
  if (Math.abs(Fy) > 0) drawArrow(posX, posY - 10, 0, -Fy * sc, "#10b981", `Fy=${Fy}N`);
  if (Math.abs(fActualX) > 0) drawArrow(posX, posY + 20, fActualX * sc, 0, "#8b5cf6", `f=${Math.abs(fActualX).toFixed(0)}N`);

  velValue.textContent = vTotal.toFixed(2);
  accelValue.textContent = a.toFixed(2);
  netForceValue.textContent = netTotal.toFixed(1);
  timeValue.textContent = elapsedTime.toFixed(2);
  statusMessage.textContent = netTotal < 0.01 ? `Benda ${vTotal > 0.1 ? "Bergerak Konstan (ΣF = 0)" : "Diam (ΣF = 0)"}` : `Dipercepat: a = ${a.toFixed(2)} m/s²`;
  statusMessage.style.borderColor = netTotal < 0.01 ? "#10b981" : "#3b82f6";
  conclusionText.textContent = `ΣFx = ${netFx.toFixed(1)} N, ΣFy = ${netFy.toFixed(1)} N. a = (${freeObj.ax.toFixed(2)}, ${freeObj.ay.toFixed(2)}) m/s². v = ${vTotal.toFixed(2)} m/s.`;
}

function updateFree(dt) {
  const Fx = parseFloat(fxInput.value) || 0;
  const Fy = parseFloat(fyInput.value) || 0;
  const m = Math.max(1, parseFloat(freeMass.value) || 25);
  const mu = Math.max(0, parseFloat(freeMu.value) || 0.1);
  const g = parseFloat(gravityInput.value) || 9.8;
  const W = m * g;
  const N = Math.max(0, W - Fy);
  const fMax = mu * N;
  let fActualX = 0, netFx = 0;
  if (Math.abs(freeObj.vx) < 0.001) {
    if (Math.abs(Fx) <= fMax) { fActualX = -Fx; netFx = 0; }
    else { fActualX = -Math.sign(Fx) * fMax; netFx = Fx + fActualX; }
  } else { fActualX = -Math.sign(freeObj.vx) * fMax; netFx = Fx + fActualX; }
  const netFy = Math.max(0, Fy - W);
  freeObj.vx += (netFx / m) * dt;
  freeObj.vy += (netFy / m) * dt;
  freeObj.x += freeObj.vx * dt * 40;
  freeObj.y += freeObj.vy * dt * 40;
  const maxX = canvas.width / 2 - 80;
  if (Math.abs(freeObj.x) >= maxX) { freeObj.x = Math.sign(freeObj.x) * maxX; freeObj.vx = 0; }
  pushChart(elapsedTime, Math.hypot(freeObj.vx, freeObj.vy), Math.hypot(netFx / m, netFy / m));
}

// ===== MAIN DRAW & UPDATE =====
function drawScene() {
  if (currentPreset === "projectile") drawProjectileScene();
  else if (currentPreset === "collision") drawCollisionScene();
  else if (currentPreset === "system") drawSystemScene();
  else drawFreeScene();
}

function updatePhysics(dt) {
  if (!isPlaying || dt <= 0) return;
  elapsedTime += dt;
  if (currentPreset === "projectile") updateProjectile(dt);
  else if (currentPreset === "collision") updateCollision(dt);
  else if (currentPreset === "system") updateSystem(dt);
  else updateFree(dt);
}

// ===== ANIMATION LOOP =====
function simulationLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  updatePhysics(dt);
  drawScene();
  requestAnimationFrame(simulationLoop);
}

// ===== RESET =====
function resetSim() {
  isPlaying = false; elapsedTime = 0; lastTime = 0;
  proj.x = 0; proj.y = 0; proj.trail = [];
  const v0 = parseFloat(v0Input.value) || 30;
  const angle = (parseFloat(angleInput.value) || 45) * Math.PI / 180;
  proj.vx = v0 * Math.cos(angle); proj.vy = v0 * Math.sin(angle);
  col.x1 = 0; col.x2 = 8; col.v1 = parseFloat(col_v1.value) || 20; col.v2 = 0; col.collided = false;
  sys.xA = 0; sys.xB = 0; sys.vA = 0; sys.vB = 0;
  freeObj.x = 0; freeObj.y = 0; freeObj.vx = 0; freeObj.vy = 0;
  btnPlayPause.textContent = "Mulai Simulasi";
  if (chart) { chart.data.labels = []; chart.data.datasets.forEach(d => d.data = []); chart.update("none"); }
  drawScene();
}

// ===== SWITCH PRESET =====
function switchPreset(preset) {
  currentPreset = preset;
  [presetProjectile, presetCollision, presetSystem, presetFree].forEach(b => b.classList.remove("active"));
  [projectileControls, collisionControls, systemControls, freeControls].forEach(el => el.style.display = "none");
  if (preset === "projectile") {
    presetProjectile.classList.add("active"); projectileControls.style.display = "block";
    chartTitle.textContent = "Grafik Posisi x (biru) & y (hijau) vs Waktu";
    initChart("x (m)", "#3b82f6", "y (m)", "#10b981");
  } else if (preset === "collision") {
    presetCollision.classList.add("active"); collisionControls.style.display = "block";
    chartTitle.textContent = "Grafik Kecepatan v₁ (merah) & v₂ (biru) vs Waktu";
    initChart("v₁ (m/s)", "#ef4444", "v₂ (m/s)", "#3b82f6");
  } else if (preset === "system") {
    presetSystem.classList.add("active"); systemControls.style.display = "block";
    chartTitle.textContent = "Grafik Kecepatan v & Percepatan a vs Waktu";
    initChart("v sistem (m/s)", "#3b82f6", "a (m/s²)", "#ef4444");
  } else {
    presetFree.classList.add("active"); freeControls.style.display = "block";
    chartTitle.textContent = "Grafik Kecepatan v & Percepatan a vs Waktu";
    initChart("v (m/s)", "#8b5cf6", "a (m/s²)", "#ef4444");
  }
  resetSim();
}

// ===== EVENT LISTENERS =====
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Lanjutkan";
});
btnReset.addEventListener("click", resetSim);

const btnViewSim = document.getElementById("btnViewSim");
const btnViewChart = document.getElementById("btnViewChart");
const simulationContainer = document.querySelector(".simulation-container");
const chartPanel = document.querySelector(".chart-panel");
const overlayStats = document.getElementById("overlayStats");

btnViewSim?.addEventListener("click", () => {
  btnViewSim.classList.add("active");
  btnViewChart.classList.remove("active");
  simulationContainer.classList.remove("hidden");
  overlayStats.classList.remove("hidden");
  chartPanel.classList.remove("active");
  drawScene();
});
btnViewChart?.addEventListener("click", () => {
  btnViewChart.classList.add("active");
  btnViewSim.classList.remove("active");
  simulationContainer.classList.add("hidden");
  overlayStats.classList.add("hidden");
  chartPanel.classList.add("active");
  if (chart) chart.update();
});


presetProjectile.addEventListener("click", () => switchPreset("projectile"));
presetCollision.addEventListener("click", () => switchPreset("collision"));
presetSystem.addEventListener("click", () => switchPreset("system"));
presetFree.addEventListener("click", () => switchPreset("free"));

btnNoAir?.addEventListener("click", () => { airResistance = false; btnNoAir.classList.add("active"); btnWithAir.classList.remove("active"); resetSim(); });
btnWithAir?.addEventListener("click", () => { airResistance = true; btnWithAir.classList.add("active"); btnNoAir.classList.remove("active"); resetSim(); });

[v0Input, angleInput, projMass, col_m1, col_v1, col_m2, col_e, sys_mA, sys_mB, sys_mu, fxInput, fyInput, freeMass, freeMu, gravityInput].forEach(el => {
  if (el) el.addEventListener("input", () => { if (!isPlaying) resetSim(); });
});

// ===== INIT =====
switchPreset("projectile");
requestAnimationFrame(simulationLoop);
