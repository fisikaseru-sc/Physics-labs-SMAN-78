// ============================================================
// Hukum I Newton — Virtual Lab SMAN 78
// Improvements: v-t chart, percepatan stat, animasi roda,
//   penanda posisi semua skenario, background kaya,
//   tarik tambang animasi kaki, mode tanpa gesekan,
//   skenario ruang angkasa
// ============================================================

// ===== DOM REFS =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");
const btnCompare = document.getElementById("btnCompare");
const btnSetVelocity = document.getElementById("btnSetVelocity");

const scenarioSelect = document.getElementById("scenarioSelect");
const genericControls = document.getElementById("genericControls");
const tarikTambangControls = document.getElementById("tarikTambangControls");
const customControls = document.getElementById("customControls");
const compareGroup = document.getElementById("compareGroup");

const force1Input = document.getElementById("force1");
const dir1Select = document.getElementById("dir1");
const force2Input = document.getElementById("force2");
const dir2Select = document.getElementById("dir2");
const numPeopleLeftInput = document.getElementById("numPeopleLeft");
const numPeopleRightInput = document.getElementById("numPeopleRight");
const customObject = document.getElementById("customObject");
const customVelocity = document.getElementById("customVelocity");
const frictionForceInput = document.getElementById("frictionForce");
const massInput = document.getElementById("mass");

const velValue = document.getElementById("velValue");
const netForceValue = document.getElementById("netForceValue");
const accelValue = document.getElementById("accelValue");
const timeValue = document.getElementById("timeValue");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");
const chartTitle = document.getElementById("chartTitle");

// ===== STATE =====
let isPlaying = false;
let lastTime = 0;
let elapsedTime = 0;
let showCompare = false; // show ideal (frictionless) ghost object
let wheelAngle = 0;      // for car wheel rotation animation

const SCALE = 100;
const PIXELS_PER_NEWTON = 0.45;
const FORCE_PER_PERSON = 50;

const box = { x: 0, velocity: 0, acceleration: 0, mass: 50 };
const ghostBox = { x: 0, velocity: 0 }; // frictionless compare ghost

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
const MAX_CHART_PTS = 100;

function initChart() {
  if (chart) chart.destroy();
  const datasets = [
    {
      label: "v benda (m/s)",
      data: [], borderColor: "#3b82f6", backgroundColor: "#3b82f620",
      borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3
    }
  ];
  if (showCompare) {
    datasets.push({
      label: "v tanpa gesekan (m/s)",
      data: [], borderColor: "#a855f7", backgroundColor: "#a855f710",
      borderWidth: 2, borderDash: [5, 4], pointRadius: 0, fill: false, tension: 0.3
    });
  }
  chart = new Chart(chartCanvas, {
    type: "line",
    data: { labels: [], datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { labels: { color: "#334155", font: { family: "Inter", size: 10 }, boxWidth: 12 } }
      },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 8, font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: {
          ticks: { color: "#64748b", font: { size: 9 } },
          grid: { color: "rgba(0,0,0,0.05)" },
          title: { display: true, text: "v (m/s)", color: "#64748b", font: { size: 9 } }
        }
      }
    }
  });
}

function pushChart(t, v, vGhost) {
  if (!chart) return;
  chart.data.labels.push(t.toFixed(1));
  chart.data.datasets[0].data.push(parseFloat(v.toFixed(3)));
  if (showCompare && chart.data.datasets[1]) {
    chart.data.datasets[1].data.push(parseFloat((vGhost || 0).toFixed(3)));
  }
  if (chart.data.labels.length > MAX_CHART_PTS) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(d => d.data.shift());
  }
  chart.update("none");
}

// ===== PHYSICS HELPERS =====
function getEffectiveForces() {
  if (scenarioSelect.value === "tariktambang") {
    const nL = Math.max(0, Math.min(5, parseInt(numPeopleLeftInput.value) || 0));
    const nR = Math.max(0, Math.min(5, parseInt(numPeopleRightInput.value) || 0));
    return { f1: nL * FORCE_PER_PERSON, dir1: "left", f2: nR * FORCE_PER_PERSON, dir2: "right" };
  }
  const f1 = Math.max(0, Math.min(500, parseFloat(force1Input.value) || 0));
  const f2 = Math.max(0, Math.min(500, parseFloat(force2Input.value) || 0));
  return { f1, dir1: dir1Select.value, f2, dir2: dir2Select.value };
}

function getCurrentFriction(fApp) {
  const fl = Math.max(0, parseFloat(frictionForceInput.value) || 0);
  if (Math.abs(box.velocity) < 0.001) {
    return Math.abs(fApp) <= fl ? -fApp : -Math.sign(fApp || 1) * fl;
  }
  return -Math.sign(box.velocity) * fl;
}

function computeNet() {
  const forces = getEffectiveForces();
  const fApp = (forces.dir1 === "right" ? forces.f1 : -forces.f1) +
               (forces.dir2 === "right" ? forces.f2 : -forces.f2);
  const fFric = getCurrentFriction(fApp);
  const net = fApp + fFric;
  return { forces, fApp, fFric, net };
}

function updatePhysicsState() {
  const { net } = computeNet();
  box.mass = Math.max(1, parseFloat(massInput.value) || 50);
  box.acceleration = net / box.mass;

  netForceValue.textContent = net.toFixed(1);
  velValue.textContent = Math.abs(box.velocity) < 0.005 ? "0.00" : box.velocity.toFixed(2);
  accelValue.textContent = box.acceleration.toFixed(2);
  timeValue.textContent = elapsedTime.toFixed(2);

  updateStatusMessage(net);
}

function updateStatusMessage(netForce) {
  const scenario = scenarioSelect.value;
  const { forces, fApp, fFric } = computeNet();
  const frictionLimit = Math.max(0, parseFloat(frictionForceInput.value) || 0);

  if (scenario === "angkasa") {
    if (Math.abs(box.velocity) < 0.01) {
      statusMessage.textContent = "Benda Diam di Ruang Angkasa (tidak ada gaya)";
      statusMessage.style.borderColor = "#6366f1";
      conclusionText.textContent = "Di ruang angkasa tanpa gaya luar dan tanpa gesekan, benda tetap diam (ΣF = 0). Hukum I Newton berlaku sempurna.";
    } else {
      statusMessage.textContent = `🚀 Bergerak Abadi: v = ${box.velocity.toFixed(2)} m/s (ΣF = 0)`;
      statusMessage.style.borderColor = "#6366f1";
      conclusionText.textContent = `Di ruang angkasa tidak ada gesekan maupun hambatan. Begitu benda diberi dorongan, benda bergerak SELAMANYA dengan kecepatan konstan v = ${box.velocity.toFixed(2)} m/s. Inilah inti Hukum I Newton!`;
    }
    return;
  }

  if (Math.abs(box.velocity) < 0.01 && Math.abs(netForce) < 0.01) {
    statusMessage.textContent = "Benda Diam (Resultan Gaya ΣF = 0)";
    statusMessage.style.borderColor = "#f59e0b";
    if (scenario === "tariktambang") {
      conclusionText.textContent = "Tarik tambang seimbang (ΣF = 0). Gaya tarik kiri = kanan → tali diam.";
    } else if (scenario === "gesekan") {
      conclusionText.textContent = `Gaya dorong ${Math.abs(fApp).toFixed(0)} N dilawan gaya gesek statis ${Math.abs(fFric).toFixed(0)} N → ΣF = 0. Meja diam!`;
    } else if (scenario === "berlawanan") {
      conclusionText.textContent = "Dua gaya berlawanan sama besar → saling meniadakan (ΣF = 0). Benda diam!";
    } else {
      conclusionText.textContent = "ΣF = 0 → Benda yang diam tetap diam (Hukum I Newton).";
    }
  } else if (Math.abs(box.velocity) >= 0.01 && Math.abs(netForce) < 0.01) {
    statusMessage.textContent = `Bergerak Konstan: v = ${box.velocity.toFixed(2)} m/s (ΣF = 0)`;
    statusMessage.style.borderColor = "#10b981";
    if (scenario === "konstan") {
      conclusionText.textContent = `Gaya mesin ${forces.f1} N = Gaya hambatan ${frictionLimit} N → ΣF = 0. Mobil bergerak konstan v = ${box.velocity.toFixed(2)} m/s. Hukum I Newton!`;
    } else {
      conclusionText.textContent = `ΣF = 0 → Benda yang bergerak terus bergerak dengan kecepatan konstan v = ${box.velocity.toFixed(2)} m/s. Hukum I Newton!`;
    }
  } else {
    statusMessage.textContent = `Benda Dipercepat: a = ${box.acceleration.toFixed(2)} m/s²`;
    statusMessage.style.borderColor = "#3b82f6";
    if (scenario === "searah") {
      conclusionText.textContent = `Dua gaya searah: ΣF = F1+F2 = ${Math.abs(fApp).toFixed(0)} N → a = ΣF/m = ${box.acceleration.toFixed(2)} m/s². ΣF ≠ 0 → kecepatan berubah!`;
    } else if (scenario === "berlawanan") {
      conclusionText.textContent = `Gaya tidak seimbang: ΣF = ${netForce.toFixed(1)} N → a = ${box.acceleration.toFixed(2)} m/s². Benda bergerak ke arah gaya dominan.`;
    } else if (scenario === "gesekan") {
      conclusionText.textContent = `F_dorong (${Math.abs(fApp).toFixed(0)} N) > f_gesek (${frictionLimit} N) → ΣF = ${netForce.toFixed(1)} N → a = ${box.acceleration.toFixed(2)} m/s²!`;
    } else {
      conclusionText.textContent = `ΣF = ${netForce.toFixed(1)} N ≠ 0 → Kecepatan berubah (a = ${box.acceleration.toFixed(2)} m/s²). Hukum I Newton dilanggar!`;
    }
  }
}

// ===== DRAW UTILS =====
function drawArrow(x, y, length, direction, color, label) {
  if (length === 0) return;
  const sign = direction === "right" ? 1 : -1;
  const ah = 14, len = Math.abs(length);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sign * Math.max(1, len - ah), y);
  ctx.lineWidth = 10; ctx.strokeStyle = color; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + sign * Math.max(1, len - ah), y - ah);
  ctx.lineTo(x + sign * len, y);
  ctx.lineTo(x + sign * Math.max(1, len - ah), y + ah);
  ctx.fillStyle = color; ctx.fill();

  ctx.fillStyle = color;
  ctx.font = "bold 13px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + sign * (len / 2), y - ah - 6);
}

// ===== DRAW PERSON (improved tug-of-war legs) =====
function drawPerson(x, y, actionDir, color, isPulling, time) {
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.save(); ctx.translate(x, y);

  const wobble = isPulling ? Math.sin(time * 8) * 1.5 : 0;
  const lean = isPulling ? (actionDir === "right" ? -0.22 : 0.22) : 0;
  ctx.rotate(lean);

  // Head
  ctx.beginPath(); ctx.arc(0, -40 + wobble, 12, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.lineWidth = 14; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -25 + wobble); ctx.lineTo(0, 5 + wobble); ctx.stroke();

  // Arms
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, -15 + wobble);
  ctx.lineTo(actionDir === "right" ? 28 : -28, -5 + wobble); ctx.stroke();

  // Legs — [6. tarik tambang animasi kaki]: alternate stride animation
  ctx.lineWidth = 8;
  const stride = isPulling ? Math.sin(time * 9) * 12 : 0;
  const braceDir = actionDir === "right" ? 1 : -1;

  ctx.beginPath();
  ctx.moveTo(0, 5 + wobble);
  ctx.lineTo(-braceDir * 12 + stride, 22);
  ctx.lineTo(-braceDir * 20 + stride, 38);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 5 + wobble);
  ctx.lineTo(braceDir * 8 - stride, 22);
  ctx.lineTo(braceDir * 18 - stride, 38);
  ctx.stroke();

  ctx.restore();
}

// ===== DRAW TABLE =====
function drawTable(x, y, w, h) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#92400e"; ctx.fillRect(x - w/2, y + h/2, w, 14);
  ctx.restore();
  ctx.fillStyle = "#b45309"; ctx.fillRect(x - w/2, y + h/2, w, 14);
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x - w/2 + 10, y + h/2 + 14, 14, h/2 - 10);
  ctx.fillRect(x + w/2 - 24, y + h/2 + 14, 14, h/2 - 10);
  // table top wood grain
  ctx.fillStyle = "#d97706"; ctx.fillRect(x - w/2, y, w, h/2 + 2);
  ctx.strokeStyle = "#b45309"; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(x - w/2 + i * (w/4), y);
    ctx.lineTo(x - w/2 + i * (w/4), y + h/2 + 2); ctx.stroke();
  }
}

// ===== DRAW CAR (with animated wheels) =====
function drawCar(x, y, w, h, wheelRot) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;

  // Body
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.roundRect(x - w/2, y + h/2.5, w, h/2.5, 10); ctx.fill();

  // Cabin
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath(); ctx.roundRect(x - w/4, y + h/6, w/2, h/3, [20,20,0,0]); ctx.fill();

  // Windows
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(x - w/4 + 10, y + h/6 + 10, w/4 - 15, h/3 - 10);
  ctx.fillRect(x + 5, y + h/6 + 10, w/4 - 15, h/3 - 10);

  ctx.restore();

  // Headlights
  ctx.fillStyle = "#fde047";
  const facing = box.velocity >= 0 ? 1 : -1;
  ctx.beginPath();
  ctx.arc(facing > 0 ? x + w/2 - 5 : x - w/2 + 5, y + h/2.5 + 15, 8, 0, Math.PI*2); ctx.fill();

  // [3. Animasi roda berputar] — draw animated wheels
  const drawWheel = (wx, wy) => {
    ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(wx, wy, 20, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.arc(wx, wy, 8, 0, Math.PI*2); ctx.fill();
    // spokes
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a = wheelRot + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(wx + 9 * Math.cos(a), wy + 9 * Math.sin(a));
      ctx.lineTo(wx + 18 * Math.cos(a), wy + 18 * Math.sin(a)); ctx.stroke();
    }
  };
  drawWheel(x - w/3, y + h - 10);
  drawWheel(x + w/3, y + h - 10);
}

// ===== DRAW GHOST (frictionless comparison) =====
function drawGhost(gx, y, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#a855f7";
  ctx.beginPath(); ctx.roundRect(gx - w/2, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.roundRect(gx - w/2, y, w, h, 8); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px Inter"; ctx.textAlign = "center";
  ctx.fillText("Ideal (μ=0)", gx, y + h/2 + 5);
  ctx.restore();
}

// ===== RICH BACKGROUNDS per scenario =====
function drawBackground(scenario, centerX, centerY) {
  const W = canvas.width, H = canvas.height;

  if (scenario === "angkasa") {
    // Space: deep black sky with stars
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, H);
    spaceGrad.addColorStop(0, "#0a0a1a"); spaceGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = spaceGrad; ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 80; i++) {
      const sx = (W * Math.sin(i * 137.5) + W) % W;
      const sy = (H * Math.cos(i * 97.3) + H) % H;
      const sr = 0.5 + (i % 4) * 0.5;
      ctx.globalAlpha = 0.4 + (i % 5) * 0.12;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Planet in background
    ctx.fillStyle = "#1e40af22";
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.22, 60, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#3b82f644"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.22, 60, 0, Math.PI*2); ctx.stroke();
    // Ground line (space station floor)
    ctx.fillStyle = "#1e293b"; ctx.fillRect(0, centerY, W, H - centerY);
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(W, centerY); ctx.stroke();

  } else if (scenario === "konstan") {
    // Highway scene
    const skyGrad = ctx.createLinearGradient(0, 0, 0, centerY);
    skyGrad.addColorStop(0, "#7dd3fc"); skyGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, centerY);
    // Clouds
    const drawCloud = (cx, cy, r) => {
      ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.7, cy - r * 0.2, r * 0.7, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - r * 0.7, cy - r * 0.1, r * 0.6, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    drawCloud(W * 0.2, centerY * 0.3, 25);
    drawCloud(W * 0.7, centerY * 0.4, 20);
    // Road
    ctx.fillStyle = "#374151"; ctx.fillRect(0, centerY, W, H - centerY);
    ctx.fillStyle = "#4b5563"; ctx.fillRect(0, centerY, W, 20);
    // Road dashes (moving, camera follows car)
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 4; ctx.setLineDash([40, 30]);
    ctx.lineDashOffset = -(box.x * SCALE * 0.5) % 70;
    ctx.beginPath(); ctx.moveTo(0, centerY + 10); ctx.lineTo(W, centerY + 10); ctx.stroke();
    ctx.setLineDash([]);
    // Green grass
    ctx.fillStyle = "#4ade80"; ctx.fillRect(0, H - 30, W, 30);

  } else if (scenario === "tariktambang") {
    // Outdoor green field
    const skyGrad = ctx.createLinearGradient(0, 0, 0, centerY);
    skyGrad.addColorStop(0, "#93c5fd"); skyGrad.addColorStop(1, "#dbeafe");
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, centerY);
    ctx.fillStyle = "#86efac"; ctx.fillRect(0, centerY, W, H - centerY);
    // Crowd lines
    ctx.fillStyle = "#22c55e"; ctx.fillRect(0, centerY, W, 15);

  } else {
    // Default room / warehouse
    const wallGrad = ctx.createLinearGradient(0, 0, 0, centerY);
    wallGrad.addColorStop(0, "#f1f5f9"); wallGrad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = wallGrad; ctx.fillRect(0, 0, W, centerY);
    // Floor
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, centerY, W, H - centerY);
    // Floor tiles
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 60) {
      ctx.beginPath(); ctx.moveTo(gx, centerY); ctx.lineTo(gx - 20, H); ctx.stroke();
    }
    // Wall-floor border
    ctx.fillStyle = "#d97706"; ctx.fillRect(0, centerY - 14, W, 14);
  }
}

// ===== [4. PENANDA POSISI di semua skenario] =====
function drawPositionMarkers(centerX, centerY, scenario) {
  if (scenario === "konstan" || scenario === "angkasa") return; // konstan: camera follows

  const maxDist = Math.floor((canvas.width / 2) / SCALE - 0.7);
  ctx.fillStyle = "#1e293b"; ctx.font = "bold 12px Inter"; ctx.textAlign = "center";

  const drawMark = (xPx, label) => {
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xPx, centerY + 4); ctx.lineTo(xPx, centerY + 20); ctx.stroke();
    ctx.fillStyle = "#92400e"; ctx.font = "bold 11px Inter";
    ctx.fillText(label, xPx, centerY + 36);
  };

  drawMark(centerX, "0 m");
  drawMark(centerX + maxDist * SCALE, `+${maxDist} m`);
  drawMark(centerX - maxDist * SCALE, `-${maxDist} m`);
  // Midpoints
  if (maxDist >= 2) {
    const half = Math.floor(maxDist / 2);
    ctx.strokeStyle = "#f59e0b44"; ctx.lineWidth = 1;
    [half, -half].forEach(d => {
      const xPx = centerX + d * SCALE;
      ctx.beginPath(); ctx.moveTo(xPx, centerY); ctx.lineTo(xPx, centerY + 14); ctx.stroke();
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px Inter";
      ctx.fillText(`${d > 0 ? "+" : ""}${d} m`, xPx, centerY + 26);
    });
  }

  // Current position indicator
  const curXpx = centerX + box.x * SCALE;
  ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(curXpx, centerY); ctx.lineTo(curXpx, centerY + 40); ctx.stroke();
  ctx.fillStyle = "#3b82f6"; ctx.font = "bold 11px Inter";
  ctx.fillText(`x = ${box.x.toFixed(1)} m`, curXpx, centerY + 52);
}

// ===== MAIN DRAW SCENE =====
function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 + 70;
  const scenario = scenarioSelect.value;

  // [5. Latar belakang kaya per skenario]
  drawBackground(scenario, centerX, centerY);

  // Ground line
  if (scenario !== "konstan") {
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY); ctx.stroke();
  }

  // [4. Penanda posisi]
  drawPositionMarkers(centerX, centerY, scenario);

  // Determine object type
  let drawShape = "box";
  if (scenario === "searah" || scenario === "berlawanan" || scenario === "gesekan") drawShape = "table";
  else if (scenario === "konstan") drawShape = "car";
  else if (scenario === "tariktambang") drawShape = "rope";
  else if (scenario === "custom") drawShape = customObject.value;
  else if (scenario === "angkasa") drawShape = "box";

  const isCar = drawShape === "car";
  const boxPixelX = isCar ? centerX : centerX + box.x * SCALE;
  const boxPixelY = centerY - box.mass * 0.012 * SCALE - 40;
  const boxW = Math.max(80, Math.min(160, box.mass * 2 + 60));
  const boxH = Math.max(50, Math.min(100, box.mass * 1.2 + 40));
  const bpY = centerY - boxH;

  const forces = getEffectiveForces();

  // [1/2. Ghost frictionless benda]
  if (showCompare && !isCar && scenario !== "tariktambang" && scenario !== "angkasa") {
    const ghostX = centerX + ghostBox.x * SCALE;
    drawGhost(ghostX, bpY, boxW, boxH);
  }

  // Draw the object
  if (drawShape === "table") {
    drawTable(boxPixelX, bpY, boxW, boxH);
  } else if (drawShape === "car") {
    const carW = 180, carH = 80;
    drawCar(boxPixelX, centerY - carH, carW, carH, wheelAngle);
  } else if (drawShape === "rope") {
    const ropeLen = boxW * 3.5;
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(boxPixelX - ropeLen, bpY + boxH/2);
    ctx.lineTo(boxPixelX + ropeLen, bpY + boxH/2); ctx.stroke();
    // Rope texture
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2;
    for (let tx = boxPixelX - ropeLen; tx < boxPixelX + ropeLen; tx += 10) {
      ctx.beginPath(); ctx.moveTo(tx, bpY + boxH/2 - 4); ctx.lineTo(tx + 6, bpY + boxH/2 + 4); ctx.stroke();
    }
    // Center flag
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.moveTo(boxPixelX, bpY + boxH/2); ctx.lineTo(boxPixelX + 12, bpY + boxH/2 + 28); ctx.lineTo(boxPixelX - 12, bpY + boxH/2 + 28); ctx.fill();
    // flag pole
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(boxPixelX, bpY + boxH/2); ctx.lineTo(boxPixelX, bpY + boxH/2 - 30); ctx.stroke();
    ctx.fillStyle = "#f59e0b"; ctx.font = "20px Inter"; ctx.textAlign = "center"; ctx.fillText("🚩", boxPixelX, bpY + boxH/2 - 28);
  } else {
    // Box — use shadow + rounded rect
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = scenario === "angkasa" ? "#1e3a5f" : "#e2e8f0";
    ctx.beginPath(); ctx.roundRect(boxPixelX - boxW/2, bpY, boxW, boxH, 10); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = scenario === "angkasa" ? "#6366f1" : "#3b82f6"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(boxPixelX - boxW/2, bpY, boxW, boxH, 10); ctx.stroke();
  }

  // Mass label
  ctx.fillStyle = scenario === "angkasa" ? "#c7d2fe" : "#0f172a";
  ctx.font = "bold 14px Inter"; ctx.textAlign = "center";
  ctx.fillText(`${box.mass} kg`, boxPixelX, bpY + boxH/2 + 5);
  ctx.font = "11px Inter"; ctx.fillStyle = "#475569";
  if (!isCar) ctx.fillText(`v = ${box.velocity.toFixed(1)} m/s`, boxPixelX, bpY + boxH/2 + 20);

  // Draw people avatars
  const personY = bpY + boxH/2;
  if (scenario === "tariktambang") {
    const nL = parseInt(numPeopleLeftInput.value) || 0;
    const nR = parseInt(numPeopleRightInput.value) || 0;
    for (let i = 0; i < nL; i++) drawPerson(boxPixelX - ropeLen(boxW) - i * 46, personY, "right", "#ef4444", true, isPlaying ? elapsedTime : 0);
    for (let i = 0; i < nR; i++) drawPerson(boxPixelX + ropeLen(boxW) + i * 46, personY, "left", "#10b981", true, isPlaying ? elapsedTime : 0);
  } else if (scenario !== "konstan" && !(scenario === "custom" && customObject.value === "car")) {
    if (forces.f1 > 0) {
      const px = forces.dir1 === "right" ? boxPixelX - boxW/2 - 38 : boxPixelX + boxW/2 + 38;
      drawPerson(px, personY, forces.dir1, "#ef4444", true, isPlaying ? elapsedTime : 0);
    }
    if (forces.f2 > 0) {
      const px = forces.dir2 === "right" ? boxPixelX - boxW/2 - 80 : boxPixelX + boxW/2 + 80;
      drawPerson(px, personY, forces.dir2, "#10b981", true, isPlaying ? elapsedTime : 0);
    }
  }

  // Force arrows
  const yForceBase = bpY - 30;
  const { fApp, fFric } = computeNet();

  if (forces.f1 > 0) {
    const xStart = forces.dir1 === "right" ? boxPixelX - boxW/2 : boxPixelX + boxW/2;
    const lbl = scenario === "tariktambang" ? `Tarik Kiri: ${forces.f1}N` :
                scenario === "konstan" ? `Mesin: ${forces.f1}N` : `F1: ${forces.f1}N`;
    drawArrow(xStart, yForceBase, forces.f1 * PIXELS_PER_NEWTON, forces.dir1, "#ef4444", lbl);
  }
  if (forces.f2 > 0) {
    const xStart = forces.dir2 === "right" ? boxPixelX - boxW/2 : boxPixelX + boxW/2;
    const lbl = scenario === "tariktambang" ? `Tarik Kanan: ${forces.f2}N` : `F2: ${forces.f2}N`;
    drawArrow(xStart, yForceBase - 38, forces.f2 * PIXELS_PER_NEWTON, forces.dir2, "#10b981", lbl);
  }
  if (Math.abs(fFric) > 0.01) {
    const fDir = fFric > 0 ? "right" : "left";
    const xStart = fDir === "right" ? boxPixelX - boxW/2 : boxPixelX + boxW/2;
    drawArrow(xStart, centerY - 18, Math.abs(fFric) * PIXELS_PER_NEWTON, fDir, "#8b5cf6", `Gesek: ${Math.abs(fFric).toFixed(0)}N`);
  }
  const net = parseFloat(netForceValue.textContent);
  if (Math.abs(net) > 0.01) {
    const dir = net > 0 ? "right" : "left";
    drawArrow(boxPixelX, yForceBase - 76, Math.abs(net) * PIXELS_PER_NEWTON, dir, "#f59e0b", `ΣF: ${Math.abs(net).toFixed(1)}N`);
  }

  // Angkasa: label "tidak ada gesekan"
  if (scenario === "angkasa") {
    ctx.fillStyle = "#6366f1"; ctx.font = "bold 13px Inter"; ctx.textAlign = "left";
    ctx.fillText("🚀 Ruang Angkasa — μ = 0, Tidak Ada Hambatan", 14, 22);
    ctx.fillStyle = "#818cf8"; ctx.font = "12px Inter";
    ctx.fillText("Hukum I Newton berlaku sempurna di sini!", 14, 40);
  }
}

// Helper for rope length
function ropeLen(boxW) { return boxW * 3.2; }

// ===== PHYSICS UPDATE =====
function updatePhysics(dt) {
  if (!isPlaying) return;
  box.mass = Math.max(1, parseFloat(massInput.value) || 50);

  const { forces, fApp, fFric } = computeNet();
  const frictionLimit = Math.max(0, parseFloat(frictionForceInput.value) || 0);

  // Static check
  if (Math.abs(box.velocity) < 0.001) {
    if (Math.abs(fApp) <= frictionLimit) {
      box.velocity = 0;
    }
  } else {
    const fFricKin = -Math.sign(box.velocity) * frictionLimit;
    const netKin = fApp + fFricKin;
    const nextVel = box.velocity + (netKin / box.mass) * dt;
    if (Math.sign(box.velocity) !== Math.sign(nextVel) && Math.abs(fApp) <= frictionLimit) {
      box.velocity = 0;
    }
  }

  const { net } = computeNet();
  box.acceleration = net / box.mass;
  box.velocity += box.acceleration * dt;
  if (Math.abs(box.velocity) < 1e-4 && Math.abs(net) < 0.01) box.velocity = 0;
  box.x += box.velocity * dt;

  // [3. Wheel rotation] — track rotation by velocity
  wheelAngle += box.velocity * dt * 3.5;

  // Ghost frictionless
  if (showCompare) {
    const ghostAcc = fApp / box.mass;
    ghostBox.velocity += ghostAcc * dt;
    ghostBox.x += ghostBox.velocity * dt;
  }

  // Boundary stop (not car/angkasa)
  const isCar = scenarioSelect.value === "konstan" ||
    (scenarioSelect.value === "custom" && customObject.value === "car");
  const isAngkasa = scenarioSelect.value === "angkasa";

  if (!isCar && !isAngkasa) {
    const maxDist = (canvas.width / 2) / SCALE - 0.8;
    if (box.x >= maxDist || box.x <= -maxDist) {
      box.x = Math.sign(box.x) * maxDist;
      box.velocity = 0;
      isPlaying = false;
      btnPlayPause.textContent = "Mulai Simulasi";
      btnPlayPause.style.backgroundColor = "";
      toggleInputs(false);
    }
  }

  elapsedTime += dt;
  pushChart(elapsedTime, box.velocity, ghostBox.velocity);
  updatePhysicsState();
}

// ===== ANIMATION LOOP =====
function simulationLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  if (dt < 0.1) updatePhysics(dt);
  if (!isPlaying) updatePhysicsState();
  drawScene();
  requestAnimationFrame(simulationLoop);
}

// ===== RESET =====
function resetSim() {
  box.x = 0; box.velocity = 0; box.acceleration = 0;
  ghostBox.x = 0; ghostBox.velocity = 0;
  wheelAngle = 0;
  elapsedTime = 0; lastTime = 0; isPlaying = false;
  btnPlayPause.textContent = "Mulai Simulasi";
  btnPlayPause.style.backgroundColor = "";
  toggleInputs(false);
  initChart();
  updatePhysicsState();
  drawScene();
}

// ===== TOGGLE INPUTS =====
function toggleInputs(disabled) {
  [scenarioSelect, force1Input, force2Input, dir1Select, dir2Select,
   frictionForceInput, massInput, numPeopleLeftInput, numPeopleRightInput,
   customObject, customVelocity, btnSetVelocity].forEach(el => {
    if (el) el.disabled = disabled;
  });
}

// ===== SCENARIO CHANGE =====
scenarioSelect.addEventListener("change", (e) => {
  const val = e.target.value;
  genericControls.style.display = val === "tariktambang" ? "none" : "block";
  tarikTambangControls.style.display = val === "tariktambang" ? "block" : "none";
  customControls.style.display = val === "custom" ? "block" : "none";
  compareGroup.style.display = (val === "gesekan" || val === "konstan") ? "block" : "none";

  // Show/hide friction row based on angkasa
  frictionForceInput.parentElement.parentElement.style.display = val === "angkasa" ? "none" : "";

  // Preset values
  const presets = {
    searah:      { f1: 150, d1: "right", f2: 80, d2: "right", fr: 0 },
    berlawanan:  { f1: 120, d1: "right", f2: 80, d2: "left",  fr: 0 },
    tariktambang:{ f1: 0,   d1: "right", f2: 0,  d2: "right", fr: 0 },
    gesekan:     { f1: 100, d1: "right", f2: 0,  d2: "right", fr: 150 },
    konstan:     { f1: 120, d1: "right", f2: 0,  d2: "right", fr: 120 },
    angkasa:     { f1: 0,   d1: "right", f2: 0,  d2: "right", fr: 0 },
    custom:      { f1: 0,   d1: "right", f2: 0,  d2: "right", fr: 0 },
  };
  const p = presets[val] || presets.custom;
  force1Input.value = p.f1; dir1Select.value = p.d1;
  force2Input.value = p.f2; dir2Select.value = p.d2;
  frictionForceInput.value = p.fr;

  if (val === "konstan") { box.velocity = 2; ghostBox.velocity = 2; }
  if (val === "angkasa") frictionForceInput.value = 0;

  chartTitle.textContent = val === "angkasa"
    ? "Grafik Kecepatan v vs Waktu — Tidak Ada Perlambatan di Ruang Angkasa!"
    : showCompare ? "Grafik v: Benda Nyata vs Benda Ideal (μ=0)"
    : "Grafik Kecepatan v vs Waktu t";

  resetSim();
});

// ===== [7. COMPARE TOGGLE] =====
btnCompare?.addEventListener("click", () => {
  showCompare = !showCompare;
  btnCompare.classList.toggle("active", showCompare);
  btnCompare.textContent = showCompare
    ? "✅ Membandingkan dengan Benda Ideal (μ=0)"
    : "🔍 Bandingkan dengan Benda Ideal (Tanpa Gesekan)";
  chartTitle.textContent = showCompare
    ? "Grafik v: Benda Nyata (biru) vs Benda Ideal μ=0 (ungu)"
    : "Grafik Kecepatan v vs Waktu t";
  resetSim();
});

// ===== PLAY/PAUSE =====
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Lanjutkan";
  btnPlayPause.style.backgroundColor = isPlaying ? "#f59e0b" : "";
  if (isPlaying) toggleInputs(true); else toggleInputs(false);
});

btnReset.addEventListener("click", resetSim);

btnSetVelocity?.addEventListener("click", () => {
  let val = Math.max(-20, Math.min(20, parseFloat(customVelocity.value) || 0));
  customVelocity.value = val;
  box.velocity = val;
  ghostBox.velocity = val;
  updatePhysicsState();
  if (!isPlaying) drawScene();
});

customObject?.addEventListener("change", () => { updatePhysicsState(); if (!isPlaying) drawScene(); });

// ===== VALIDATE & LIVE UPDATE =====
const validateInput = (el) => {
  let val = parseFloat(el.value);
  if (isNaN(val)) { el.value = el === massInput ? 50 : 0; val = parseFloat(el.value); }
  if (el === massInput) el.value = Math.max(1, Math.min(1000, val));
  else if (el === force1Input || el === force2Input) el.value = Math.max(0, Math.min(500, val));
  else if (el === frictionForceInput) el.value = Math.max(0, Math.min(500, val));
  else if (el === numPeopleLeftInput || el === numPeopleRightInput) el.value = Math.max(0, Math.min(5, Math.round(val)));
  else if (el === customVelocity) el.value = Math.max(-20, Math.min(20, val));
};

[force1Input, force2Input, frictionForceInput, massInput,
 numPeopleLeftInput, numPeopleRightInput, customVelocity].forEach(el => {
  if (!el) return;
  ["change", "input"].forEach(evt => {
    el.addEventListener(evt, () => {
      validateInput(el);
      updatePhysicsState();
      if (!isPlaying) drawScene();
    });
  });
});

[dir1Select, dir2Select].forEach(el => {
  el?.addEventListener("change", () => { updatePhysicsState(); if (!isPlaying) drawScene(); });
});

// ===== INIT =====
scenarioSelect.value = "searah";
scenarioSelect.dispatchEvent(new Event("change"));
requestAnimationFrame(simulationLoop);
