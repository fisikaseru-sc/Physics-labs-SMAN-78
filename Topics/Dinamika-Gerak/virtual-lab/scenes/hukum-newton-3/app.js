// ===== CANVAS & CHART SETUP =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

// UI - selectors
const scenarioSelect = document.getElementById("scenarioSelect");
const massInput = document.getElementById("massInput");
const gravityInput = document.getElementById("gravityInput");
const pushForce = document.getElementById("pushForce");
const muSInput = document.getElementById("muSInput");
const muKInput = document.getElementById("muKInput");
const tensionMode = document.getElementById("tensionMode");
const hangMass2 = document.getElementById("hangMass2");
const tensionLiftAccel = document.getElementById("tensionLiftAccel");
const tensionGravity = document.getElementById("tensionGravity");
const liftAccel = document.getElementById("liftAccel");
const liftGravity = document.getElementById("liftGravity");

// UI - extras panels
const normalExtras = document.getElementById("normalExtras");
const frictionExtras = document.getElementById("frictionExtras");
const tensionExtras = document.getElementById("tensionExtras");
const liftExtras = document.getElementById("liftExtras");
const tensionHang2Extras = document.getElementById("tensionHang2Extras");
const tensionLiftExtras = document.getElementById("tensionLiftExtras");

// UI - stats
const stat1Label = document.getElementById("stat1Label");
const stat1Value = document.getElementById("stat1Value");
const stat1Unit = document.getElementById("stat1Unit");
const stat2Label = document.getElementById("stat2Label");
const stat2Value = document.getElementById("stat2Value");
const stat2Unit = document.getElementById("stat2Unit");
const stat3Label = document.getElementById("stat3Label");
const stat3Value = document.getElementById("stat3Value");
const stat3Unit = document.getElementById("stat3Unit");
const stat4Label = document.getElementById("stat4Label");
const stat4Value = document.getElementById("stat4Value");
const stat4Unit = document.getElementById("stat4Unit");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");
const chartTitle = document.getElementById("chartTitle");

// UI - buttons
const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

// ===== STATE =====
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;

// Friction sim state
const frictionObj = { x: 0, v: 0, state: "static" }; // state: static | sliding

// Lift sim state  
const liftObj = { y: 0, vy: 0, direction: 1 }; // direction: 1=up, -1=down

// Chart
let chart = null;
const MAX_CHART_POINTS = 80;
const chartData = { labels: [], datasets: [] };

// ===== CANVAS RESIZE =====
function resizeCanvas() {
  const c = canvas.parentElement;
  canvas.width = c.clientWidth;
  canvas.height = c.clientHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); drawScene(); });
resizeCanvas();

// ===== CHART HELPERS =====
function initChart(label1, color1, label2, color2) {
  if (chart) chart.destroy();
  chartData.labels = [];
  chartData.datasets = [{
    label: label1, data: [], borderColor: color1, backgroundColor: color1 + "33",
    borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3
  }];
  if (label2) {
    chartData.datasets.push({
      label: label2, data: [], borderColor: color2, backgroundColor: color2 + "22",
      borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3
    });
  }
  chart = new Chart(chartCanvas, {
    type: "line",
    data: chartData,
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: "#334155", font: { family: "Inter", size: 11 }, boxWidth: 14 } } },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 8, font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b", font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

function pushChartData(t, val1, val2) {
  chartData.labels.push(t.toFixed(1));
  chartData.datasets[0].data.push(parseFloat(val1.toFixed(2)));
  if (val2 !== undefined && chartData.datasets[1]) chartData.datasets[1].data.push(parseFloat(val2.toFixed(2)));
  if (chartData.labels.length > MAX_CHART_POINTS) {
    chartData.labels.shift();
    chartData.datasets.forEach(ds => ds.data.shift());
  }
  chart.update("none");
}

// ===== DRAW UTILITIES =====
function drawArrow(x, y, dx, dy, color, label, lineW = 3) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const angle = Math.atan2(dy, dx);
  const ah = Math.min(14, len * 0.35);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lineW;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len - ah, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(len - ah, -6); ctx.lineTo(len - ah, 6); ctx.fill();
  if (label) {
    ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, len / 2, -10);
  }
  ctx.restore();
}

function drawBox(x, y, w, h, fillColor, strokeColor, label, subLabel) {
  // shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = fillColor;
  ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 8); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = strokeColor; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 8); ctx.stroke();
  if (label) {
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 14px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x, y + (subLabel ? -6 : 5));
  }
  if (subLabel) {
    ctx.fillStyle = "#475569"; ctx.font = "11px Inter,sans-serif"; ctx.fillText(subLabel, x, y + 10);
  }
}

function drawGround(y, color = "#94a3b8") {
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  // hatching below
  ctx.strokeStyle = color + "55"; ctx.lineWidth = 1;
  for (let x = 10; x < canvas.width; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 12); ctx.stroke();
  }
}

function drawCeiling(y, color = "#94a3b8") {
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  ctx.strokeStyle = color + "55"; ctx.lineWidth = 1;
  for (let x = 10; x < canvas.width; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y - 12); ctx.stroke();
  }
}

// ===== SCENARIO: GAYA NORMAL & BERAT =====
function drawNormalScenario() {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(0.1, parseFloat(gravityInput.value) || 9.8);
  const W = m * g;
  const N = W;

  stat1Label.textContent = "Gaya Berat (W)"; stat1Value.textContent = W.toFixed(1); stat1Unit.textContent = "N";
  stat2Label.textContent = "Gaya Normal (N)"; stat2Value.textContent = N.toFixed(1); stat2Unit.textContent = "N";
  stat3Label.textContent = "Gravitasi (g)"; stat3Value.textContent = g.toFixed(2); stat3Unit.textContent = "m/s²";
  stat4Label.textContent = "ΣF Vertikal"; stat4Value.textContent = "0.0"; stat4Unit.textContent = "N";

  const cx = canvas.width / 2, cy = canvas.height * 0.55;
  const groundY = cy + 50;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround(groundY);

  // Box
  const bw = 90, bh = 70;
  drawBox(cx, groundY - bh/2, bw, bh, "#e2e8f0", "#3b82f6", `${m} kg`, `W = ${W.toFixed(0)} N`);

  // W arrow down
  const wLen = Math.min(120, W * 0.15 + 30);
  drawArrow(cx, groundY - bh/2, 0, wLen, "#ef4444", `W = ${W.toFixed(0)} N`);

  // N arrow up
  drawArrow(cx, groundY - bh/2, 0, -wLen, "#10b981", `N = ${N.toFixed(0)} N`);

  // label W=mg
  ctx.fillStyle = "#ef4444"; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "left";
  ctx.fillText(`W = m·g = ${m}×${g.toFixed(2)} = ${W.toFixed(1)} N`, cx + 60, groundY + 20);
  ctx.fillStyle = "#10b981"; ctx.fillText(`N = W = ${N.toFixed(1)} N`, cx + 60, groundY + 38);

  statusMessage.textContent = `Benda Diam → N = W = m·g = ${W.toFixed(1)} N`;
  statusMessage.style.borderColor = "#10b981";
  conclusionText.textContent = `Gaya berat W = m·g = ${m}×${g.toFixed(2)} = ${W.toFixed(1)} N menarik benda ke bawah. Karena benda diam di atas lantai, lantai memberikan Gaya Normal N = ${N.toFixed(1)} N ke atas sebagai reaksi. ΣF = N − W = 0 N (kesetimbangan).`;
}

// ===== SCENARIO: GAYA GESEK =====
function drawFrictionScenario(dt = 0) {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = 9.8;
  const F = Math.max(0, parseFloat(pushForce.value) || 0);
  const muS = Math.max(0, parseFloat(muSInput.value) || 0.6);
  const muK = Math.max(0, parseFloat(muKInput.value) || 0.4);

  const W = m * g;
  const N = W;
  const fsMax = muS * N;
  const fk = muK * N;

  let fActual = 0, netF = 0;

  if (frictionObj.state === "static") {
    if (F <= fsMax) {
      fActual = F; netF = 0;
    } else {
      frictionObj.state = "sliding";
      fActual = fk; netF = F - fk;
    }
  } else {
    fActual = fk; netF = F - fk;
    if (netF < 0 && frictionObj.v <= 0) {
      frictionObj.state = "static"; frictionObj.v = 0; netF = 0; fActual = F;
    }
  }

  if (isPlaying && dt > 0) {
    const a = netF / m;
    frictionObj.v += a * dt;
    if (frictionObj.v < 0) frictionObj.v = 0;
    frictionObj.x += frictionObj.v * dt * 60;
    const maxX = canvas.width / 2 - 60;
    if (frictionObj.x > maxX) frictionObj.x = maxX;
    elapsedTime += dt;
    pushChartData(elapsedTime, frictionObj.v, netF);
  }

  stat1Label.textContent = "fs,max (Gesek Statis)"; stat1Value.textContent = fsMax.toFixed(1); stat1Unit.textContent = "N";
  stat2Label.textContent = "fk (Gesek Kinetis)"; stat2Value.textContent = fk.toFixed(1); stat2Unit.textContent = "N";
  stat3Label.textContent = "Gaya Dorong (F)"; stat3Value.textContent = F.toFixed(1); stat3Unit.textContent = "N";
  stat4Label.textContent = "ΣF / Percepatan"; stat4Value.textContent = `${netF.toFixed(1)} N / ${(netF/m).toFixed(2)}`; stat4Unit.textContent = "m/s²";

  const cx = canvas.width / 2, cy = canvas.height * 0.55, groundY = cy + 50;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Surface texture
  const surfaceName = document.querySelector(".surface-btn.active")?.dataset.name || "Beton";
  const surfaceColors = { Beton:"#94a3b8", Kayu:"#b45309", Es:"#bae6fd", Pasir:"#d97706" };
  ctx.fillStyle = surfaceColors[surfaceName] || "#94a3b8";
  ctx.fillRect(0, groundY, canvas.width, 20);
  ctx.fillStyle = "#0f172a88"; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "right";
  ctx.fillText(`Permukaan: ${surfaceName} | μs=${muS.toFixed(2)} μk=${muK.toFixed(2)}`, canvas.width - 10, groundY + 14);
  drawGround(groundY, surfaceColors[surfaceName]);

  const boxX = cx + frictionObj.x - canvas.width * 0.15;
  const bw = 90, bh = 65;
  const boxColor = frictionObj.state === "static" ? "#fef3c7" : "#dbeafe";
  drawBox(boxX, groundY - bh/2, bw, bh, boxColor, frictionObj.state === "static" ? "#f59e0b" : "#3b82f6",
    `${m}kg`, `v=${frictionObj.v.toFixed(1)}m/s`);

  // F arrow right
  if (F > 0) drawArrow(boxX + bw/2, groundY - bh/2, Math.min(120, F * 0.2 + 20), 0, "#ef4444", `F=${F.toFixed(0)}N`);
  // friction arrow left
  if (fActual > 0) drawArrow(boxX - bw/2, groundY - bh/2 + 10, -Math.min(100, fActual * 0.15 + 20), 0, "#8b5cf6", `f=${fActual.toFixed(0)}N`);
  // N arrow up
  drawArrow(boxX, groundY - bh, 0, -60, "#10b981", `N=${N.toFixed(0)}N`);
  // W arrow down
  drawArrow(boxX, groundY, 0, 50, "#ef4444", `W=${W.toFixed(0)}N`);

  // State badge
  ctx.fillStyle = frictionObj.state === "static" ? "#f59e0b" : "#3b82f6";
  ctx.beginPath(); ctx.roundRect(10, 10, 160, 30, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(frictionObj.state === "static" ? "GESEK STATIS" : "GESEK KINETIS", 90, 30);

  if (frictionObj.state === "static") {
    statusMessage.textContent = `Benda Diam — F (${F.toFixed(0)} N) ≤ fs,max (${fsMax.toFixed(0)} N)`;
    statusMessage.style.borderColor = "#f59e0b";
    conclusionText.textContent = `Gaya dorong F = ${F.toFixed(0)} N belum melampaui gaya gesek statis maksimum fs,max = μs·N = ${muS.toFixed(2)}×${N.toFixed(0)} = ${fsMax.toFixed(1)} N. Benda tetap diam.`;
  } else {
    const a = netF / m;
    statusMessage.textContent = `Benda Bergerak — a = ${a.toFixed(2)} m/s² (v = ${frictionObj.v.toFixed(1)} m/s)`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `F (${F.toFixed(0)} N) > fs,max (${fsMax.toFixed(0)} N) → benda meluncur. Gaya gesek kinetis fk = μk·N = ${muK.toFixed(2)}×${N.toFixed(0)} = ${fk.toFixed(1)} N. ΣF = ${netF.toFixed(1)} N → a = F/m = ${a.toFixed(2)} m/s².`;
  }
}

// ===== SCENARIO: TEGANGAN TALI =====
function drawTensionScenario(dt = 0) {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(0.1, parseFloat(tensionGravity.value) || 9.8);
  const mode = tensionMode.value;

  let T = 0, T2 = 0, netF = 0, accel = 0, W1 = m * g;

  if (mode === "hang1") {
    T = W1; netF = 0;
    stat1Label.textContent = "Tegangan Tali T"; stat1Value.textContent = T.toFixed(1); stat1Unit.textContent = "N";
    stat2Label.textContent = "Gaya Berat W"; stat2Value.textContent = W1.toFixed(1); stat2Unit.textContent = "N";
    stat3Label.textContent = "ΣF"; stat3Value.textContent = "0.0"; stat3Unit.textContent = "N";
    stat4Label.textContent = "T = W = mg"; stat4Value.textContent = T.toFixed(1); stat4Unit.textContent = "N";
  } else if (mode === "hang2") {
    const m2 = Math.max(1, parseFloat(hangMass2.value) || 30);
    const W2 = m2 * g;
    // m1 on table, m2 hanging → T = m2*g*m1/(m1+m2)
    // ignoring friction: a = m2*g/(m1+m2), T = m1*m2*g/(m1+m2)
    accel = W2 / (m + m2);
    T = m * accel; T2 = W2 - m2 * accel; // both should equal
    netF = W2;
    stat1Label.textContent = "Tegangan Tali T"; stat1Value.textContent = T.toFixed(1); stat1Unit.textContent = "N";
    stat2Label.textContent = "Berat Beban W₂"; stat2Value.textContent = W2.toFixed(1); stat2Unit.textContent = "N";
    stat3Label.textContent = "Percepatan a"; stat3Value.textContent = accel.toFixed(2); stat3Unit.textContent = "m/s²";
    stat4Label.textContent = "ΣF Sistem"; stat4Value.textContent = netF.toFixed(1); stat4Unit.textContent = "N";
  } else {
    const a = parseFloat(tensionLiftAccel.value) || 3;
    T = m * (g + a);
    netF = Math.abs(T - W1);
    stat1Label.textContent = "Tegangan Tali T"; stat1Value.textContent = T.toFixed(1); stat1Unit.textContent = "N";
    stat2Label.textContent = "Gaya Berat W"; stat2Value.textContent = W1.toFixed(1); stat2Unit.textContent = "N";
    stat3Label.textContent = "Percepatan Lift a"; stat3Value.textContent = a.toFixed(1); stat3Unit.textContent = "m/s²";
    stat4Label.textContent = "T = m(g+a)"; stat4Value.textContent = T.toFixed(1); stat4Unit.textContent = "N";
  }

  const cx = canvas.width / 2, cy = canvas.height * 0.5;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCeiling(80);

  if (mode === "hang1") {
    // Rope from ceiling to box
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, 80); ctx.lineTo(cx, cy - 40); ctx.stroke();
    drawBox(cx, cy, 90, 70, "#e2e8f0", "#3b82f6", `${m} kg`, `W=${W1.toFixed(0)}N`);
    drawArrow(cx, cy - 35, 0, -(T * 0.12 + 40), "#10b981", `T=${T.toFixed(0)}N`);
    drawArrow(cx, cy + 35, 0, T * 0.12 + 40, "#ef4444", `W=${W1.toFixed(0)}N`);
    statusMessage.textContent = `Benda Gantung → T = W = mg = ${T.toFixed(1)} N`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Tali menarik benda ke atas dengan tegangan T. Karena benda diam (a = 0), maka ΣF = T − W = 0 → T = W = m·g = ${m}×${g.toFixed(2)} = ${T.toFixed(1)} N.`;
  } else if (mode === "hang2") {
    const m2 = Math.max(1, parseFloat(hangMass2.value) || 30);
    const tableY = cy + 30;
    // Table
    ctx.fillStyle = "#92400e"; ctx.fillRect(cx - 150, tableY, 300, 15);
    ctx.fillStyle = "#b45309"; ctx.fillRect(cx - 140, tableY + 15, 20, 60); ctx.fillRect(cx + 120, tableY + 15, 20, 60);
    // m1 on table
    drawBox(cx - 50, tableY - 35, 80, 60, "#dbeafe", "#3b82f6", `m₁=${m}kg`);
    // rope over edge
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx + 30, tableY - 35); ctx.lineTo(cx + 150, tableY - 35); ctx.lineTo(cx + 150, tableY + 30); ctx.stroke();
    // m2 hanging
    drawBox(cx + 150, tableY + 70, 70, 55, "#fce7f3", "#ec4899", `m₂=${m2}kg`);
    drawArrow(cx + 150, tableY + 95, 0, 50, "#ef4444", `W₂=${(m2*g).toFixed(0)}N`);
    // T arrows
    drawArrow(cx - 10, tableY - 35, 60, 0, "#10b981", `T=${T.toFixed(0)}N`);
    statusMessage.textContent = `a = ${accel.toFixed(2)} m/s², T = ${T.toFixed(1)} N`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `Sistem: m₁=${m}kg di meja, m₂=${m2}kg menggantung. Resultan gaya ΣF = W₂ = ${(m2*g).toFixed(0)} N menggerakkan sistem total (m₁+m₂=${m+m2}kg). Percepatan a = W₂/(m₁+m₂) = ${accel.toFixed(2)} m/s², Tegangan T = m₁·a = ${T.toFixed(1)} N.`;
  } else {
    // Elevator
    const a = parseFloat(tensionLiftAccel.value) || 3;
    const liftY = cy;
    // Rope from ceiling
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, 80); ctx.lineTo(cx, liftY - 80); ctx.stroke();
    // Lift box (elevator)
    ctx.fillStyle = "#1e40af22"; ctx.fillRect(cx - 60, liftY - 80, 120, 130);
    ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 3; ctx.strokeRect(cx - 60, liftY - 80, 120, 130);
    // Person inside
    ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(cx, liftY - 30, 16, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, liftY - 14); ctx.lineTo(cx, liftY + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, liftY); ctx.lineTo(cx - 20, liftY + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, liftY); ctx.lineTo(cx + 20, liftY + 20); ctx.stroke();
    // T arrow
    drawArrow(cx, liftY - 80, 0, -(T * 0.08 + 40), "#10b981", `T=${T.toFixed(0)}N`);
    // W arrow
    drawArrow(cx, liftY + 50, 0, W1 * 0.08 + 30, "#ef4444", `W=${W1.toFixed(0)}N`);
    // accel direction
    if (a > 0) { ctx.fillStyle = "#10b981"; ctx.font = "bold 14px Inter"; ctx.textAlign = "center"; ctx.fillText("Dipercepat Naik", cx, liftY - 110); }
    else if (a < -9.7) { ctx.fillStyle = "#ef4444"; ctx.font = "bold 14px Inter"; ctx.fillText("JATUH BEBAS (T = 0)", cx, liftY - 110); }
    else { ctx.fillStyle = "#ef4444"; ctx.font = "bold 14px Inter"; ctx.fillText("Dipercepat Turun", cx, liftY - 110); }

    statusMessage.textContent = `T = m(g${a >= 0 ? "+" : ""}${a.toFixed(1)}) = ${T.toFixed(1)} N`;
    statusMessage.style.borderColor = T > W1 ? "#10b981" : (T < 0 ? "#ef4444" : "#f59e0b");
    conclusionText.textContent = `Tegangan tali = gaya normal pada benda dalam lift. T = m(g + a) = ${m}×(${g.toFixed(1)}${a >= 0 ? "+" : ""}${a.toFixed(1)}) = ${T.toFixed(1)} N. ${a > 0 ? "Dipercepat naik → benda terasa lebih berat." : a < 0 ? "Dipercepat turun → benda terasa lebih ringan." : "Konstan → T = W."}`;
  }
}

// ===== SCENARIO: BERAT SEMU LIFT =====
function drawLiftScenario(dt = 0) {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(0.1, parseFloat(liftGravity.value) || 9.8);
  const a = parseFloat(liftAccel.value) || 3;
  const W = m * g;
  const N = Math.max(0, m * (g + a)); // apparent weight

  if (isPlaying && dt > 0) {
    liftObj.vy = a;
    liftObj.y += liftObj.vy * dt * 30;
    if (liftObj.y > 80) liftObj.y = 80;
    if (liftObj.y < -80) liftObj.y = -80;
    elapsedTime += dt;
    pushChartData(elapsedTime, N, W);
  }

  stat1Label.textContent = "Berat Asli (W = mg)"; stat1Value.textContent = W.toFixed(1); stat1Unit.textContent = "N";
  stat2Label.textContent = "Berat Semu (N)"; stat2Value.textContent = N.toFixed(1); stat2Unit.textContent = "N";
  stat3Label.textContent = "Percepatan Lift (a)"; stat3Value.textContent = a.toFixed(1); stat3Unit.textContent = "m/s²";
  stat4Label.textContent = "N = m(g+a)"; stat4Value.textContent = N.toFixed(1); stat4Unit.textContent = "N";

  const cx = canvas.width / 2, cy = canvas.height * 0.52;
  const liftY = cy + liftObj.y;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Lift shaft
  ctx.fillStyle = "#f1f5f9"; ctx.fillRect(cx - 90, 60, 180, canvas.height - 80);
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2; ctx.strokeRect(cx - 90, 60, 180, canvas.height - 80);

  // Rope
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx, 60); ctx.lineTo(cx, liftY - 70); ctx.stroke();

  // Lift box
  ctx.fillStyle = a > 0 ? "#dcfce7" : a < -9.7 ? "#fee2e2" : "#dbeafe";
  ctx.beginPath(); ctx.roundRect(cx - 70, liftY - 70, 140, 120, 8); ctx.fill();
  ctx.strokeStyle = a > 0 ? "#10b981" : a < -9.7 ? "#ef4444" : "#3b82f6"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(cx - 70, liftY - 70, 140, 120, 8); ctx.stroke();

  // Floor scale
  ctx.fillStyle = "#475569"; ctx.fillRect(cx - 35, liftY + 42, 70, 8);
  // Scale reading
  const pct = Math.min(1, N / (W * 2));
  ctx.fillStyle = "#1e293b"; ctx.fillRect(cx - 30, liftY + 52, 60, 14);
  ctx.fillStyle = N > W ? "#10b981" : N < W ? "#f59e0b" : "#3b82f6";
  ctx.font = "bold 11px Inter"; ctx.textAlign = "center"; ctx.fillText(`${N.toFixed(0)} N`, cx, liftY + 63);

  // Person (stick figure)
  ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(cx, liftY - 35, 14, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, liftY - 21); ctx.lineTo(cx, liftY + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, liftY - 10); ctx.lineTo(cx - 18, liftY + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, liftY - 10); ctx.lineTo(cx + 18, liftY + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, liftY + 10); ctx.lineTo(cx - 14, liftY + 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, liftY + 10); ctx.lineTo(cx + 14, liftY + 38); ctx.stroke();

  // Direction arrow
  if (Math.abs(a) > 0.1) {
    const aDir = a > 0 ? -1 : 1;
    drawArrow(cx + 85, liftY, 0, aDir * Math.min(50, Math.abs(a) * 8), a > 0 ? "#10b981" : "#ef4444", `a=${Math.abs(a).toFixed(1)}m/s²`);
  }

  // Labels outside
  ctx.fillStyle = "#ef4444"; ctx.font = "bold 12px Inter"; ctx.textAlign = "left";
  ctx.fillText(`W = ${W.toFixed(0)} N`, cx + 95, liftY + 10);
  ctx.fillStyle = N > W ? "#10b981" : "#f59e0b";
  ctx.fillText(`N = ${N.toFixed(0)} N`, cx + 95, liftY + 28);

  const label = a > 0 ? "Berat Semu BERTAMBAH" : a < -9.7 ? "⚠️ BERAT SEMU NOL (Jatuh Bebas)" : "Berat Semu BERKURANG";
  statusMessage.textContent = `${label} → N = m(g${a>=0?"+":""}${a.toFixed(1)}) = ${N.toFixed(1)} N`;
  statusMessage.style.borderColor = a > 0 ? "#10b981" : a < -9.7 ? "#ef4444" : "#f59e0b";
  conclusionText.textContent = `Berat semu adalah gaya normal N yang dirasakan tubuh. N = m(g + a) = ${m}×(${g.toFixed(1)}${a>=0?"+":""}${a.toFixed(1)}) = ${N.toFixed(1)} N. ${a > 0 ? `Lift dipercepat naik → N > W → tubuh terasa lebih berat.` : a < -9.7 ? `Lift jatuh bebas → N = 0 → tidak terasa berat sama sekali.` : `Lift dipercepat turun → N < W → tubuh terasa lebih ringan.`}`;
}

// ===== MAIN DRAW =====
function drawScene(dt = 0) {
  const scenario = scenarioSelect.value;
  if (scenario === "normal") drawNormalScenario();
  else if (scenario === "friction") drawFrictionScenario(dt);
  else if (scenario === "tension") drawTensionScenario(dt);
  else if (scenario === "lift") drawLiftScenario(dt);
}

// ===== ANIMATION LOOP =====
function simulationLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  drawScene(isPlaying ? dt : 0);
  requestAnimationFrame(simulationLoop);
}

// ===== SCENARIO SWITCHING =====
function switchScenario() {
  const sc = scenarioSelect.value;
  [normalExtras, frictionExtras, tensionExtras, liftExtras].forEach(el => el.style.display = "none");
  if (sc === "normal") {
    normalExtras.style.display = "";
    chartTitle.textContent = "Grafik Berat vs Gravitasi";
    initChart("W = mg (N)", "#ef4444");
  } else if (sc === "friction") {
    frictionExtras.style.display = "";
    chartTitle.textContent = "Grafik Kecepatan & ΣF vs Waktu";
    initChart("Kecepatan v (m/s)", "#3b82f6", "ΣF (N)", "#ef4444");
  } else if (sc === "tension") {
    tensionExtras.style.display = "";
    chartTitle.textContent = "Grafik Tegangan Tali T vs Waktu";
    initChart("Tegangan T (N)", "#10b981");
    updateTensionModeExtras();
  } else if (sc === "lift") {
    liftExtras.style.display = "";
    chartTitle.textContent = "Grafik Berat Semu N vs Waktu";
    initChart("Berat Semu N (N)", "#8b5cf6", "Berat Asli W (N)", "#ef4444");
  }
  resetSim(false);
}

function updateTensionModeExtras() {
  const m = tensionMode.value;
  tensionHang2Extras.style.display = m === "hang2" ? "" : "none";
  tensionLiftExtras.style.display = m === "elevator" ? "" : "none";
}

// ===== RESET =====
function resetSim(resetChart = true) {
  isPlaying = false;
  elapsedTime = 0;
  lastTime = 0;
  frictionObj.x = 0; frictionObj.v = 0; frictionObj.state = "static";
  liftObj.y = 0; liftObj.vy = 0;
  btnPlayPause.textContent = "Mulai Simulasi";
  if (resetChart && chart) { chart.data.labels = []; chart.data.datasets.forEach(d => d.data = []); chart.update("none"); }
  drawScene(0);
}

// ===== EVENT LISTENERS =====
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Lanjutkan";
});

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
  drawScene(0);
});
btnViewChart?.addEventListener("click", () => {
  btnViewChart.classList.add("active");
  btnViewSim.classList.remove("active");
  simulationContainer.classList.add("hidden");
  overlayStats.classList.add("hidden");
  chartPanel.classList.add("active");
});
btnReset.addEventListener("click", () => resetSim(true));
scenarioSelect.addEventListener("change", switchScenario);
tensionMode.addEventListener("change", () => { updateTensionModeExtras(); resetSim(true); });

// Planet buttons
document.querySelectorAll(".planet-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".planet-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    gravityInput.value = btn.dataset.g;
    drawScene(0);
  });
});

// Surface buttons
document.querySelectorAll(".surface-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".surface-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    muSInput.value = btn.dataset.mus;
    muKInput.value = btn.dataset.muk;
    resetSim(true);
  });
});

// All inputs
[massInput, gravityInput, pushForce, muSInput, muKInput, hangMass2,
 tensionLiftAccel, tensionGravity, liftAccel, liftGravity].forEach(el => {
  if (el) el.addEventListener("input", () => drawScene(0));
});

// ===== INIT =====
switchScenario();
requestAnimationFrame(simulationLoop);
