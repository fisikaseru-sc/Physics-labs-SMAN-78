const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const fxInput = document.getElementById("fxInput");
const fyInput = document.getElementById("fyInput");
const massInput = document.getElementById("massInput");
const muInput = document.getElementById("muInput");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const velValue = document.getElementById("velValue");
const accelVal = document.getElementById("accelVal");
const netForceValue = document.getElementById("netForceValue");
const timeValue = document.getElementById("timeValue");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;

const obj = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  ax: 0,
  ay: 0,
};

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updatePhysicsState() {
  const Fx = parseFloat(fxInput.value) || 0;
  const Fy = parseFloat(fyInput.value) || 0;
  const m = Math.max(1, parseFloat(massInput.value) || 25);
  const mu = Math.max(0, parseFloat(muInput.value) || 0);
  const g = 9.8;

  const W = m * g;
  // Normal force N = max(0, W - Fy)
  const N = Math.max(0, W - Fy);
  const fMax = mu * N;

  let fActualX = 0;
  let netFx = 0;

  if (Math.abs(obj.vx) < 0.001) {
    if (Math.abs(Fx) <= fMax) {
      fActualX = -Fx;
      netFx = 0;
    } else {
      fActualX = -Math.sign(Fx) * fMax;
      netFx = Fx + fActualX;
    }
  } else {
    fActualX = -Math.sign(obj.vx) * fMax;
    netFx = Fx + fActualX;
  }

  let netFy = 0;
  if (Fy > W) {
    netFy = Fy - W; // Lift off ground
  }

  obj.ax = netFx / m;
  obj.ay = netFy / m;

  const netTotal = Math.hypot(netFx, netFy);
  const accelTotal = Math.hypot(obj.ax, obj.ay);
  const velTotal = Math.hypot(obj.vx, obj.vy);

  velValue.textContent = `${velTotal.toFixed(2)} m/s`;
  accelVal.textContent = `${accelTotal.toFixed(2)} m/s²`;
  netForceValue.textContent = netTotal.toFixed(1);
  timeValue.textContent = elapsedTime.toFixed(2);

  if (netTotal === 0 && velTotal === 0) {
    statusMessage.textContent = "Benda Diam (Resultan Gaya ΣF = 0 N)";
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Resultan gaya nol (ΣFx = 0 N, ΣFy = 0 N). Benda tetap diam sesuai Hukum I Newton.`;
  } else if (netTotal === 0 && velTotal > 0) {
    statusMessage.textContent = "Benda Bergerak Kecepatan Konstan (ΣF = 0 N)";
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Resultan gaya nol. Benda mempertahankan kecepatan konstan v = ${velTotal.toFixed(2)} m/s.`;
  } else {
    statusMessage.textContent = `Benda Mengalami Percepatan (a = ${accelTotal.toFixed(2)} m/s²)`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `Gaya total ΣF = ${netTotal.toFixed(1)} N pada massa m = ${m} kg menghasilkan percepatan total a = ${accelTotal.toFixed(2)} m/s² sesuai Hukum II Newton.`;
  }

  return { Fx, Fy, m, mu, g, W, N, fActualX, netFx, netFy, netTotal, accelTotal };
}

function updatePhysics(dt) {
  if (!isPlaying) return;

  const state = updatePhysicsState();

  obj.vx += obj.ax * dt;
  obj.vy += obj.ay * dt;

  obj.x += obj.vx * dt * 40;
  obj.y += obj.vy * dt * 40;

  const maxDist = canvas.width / 2 - 80;
  if (Math.abs(obj.x) >= maxDist) {
    obj.x = Math.sign(obj.x) * maxDist;
    obj.vx = 0;
    isPlaying = false;
    btnPlayPause.textContent = "Mulai Simulasi";
    toggleInputs(false);
  }

  elapsedTime += dt;
}

function drawArrow(x, y, dx, dy, color, label) {
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const angle = Math.atan2(dy, dx);
  const arrowHead = 10;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len - arrowHead, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - arrowHead, -6);
  ctx.lineTo(len - arrowHead, 6);
  ctx.fill();

  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, len / 2, -10);

  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const state = updatePhysicsState();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 + 50;

  // Ground Line
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, centerY + 30);
  ctx.lineTo(canvas.width, centerY + 30);
  ctx.stroke();

  const posX = centerX + obj.x;
  const posY = centerY - obj.y;

  // Box Object
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(posX - 30, posY - 30, 60, 60);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.strokeRect(posX - 30, posY - 30, 60, 60);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.m} kg`, posX, posY + 5);

  // Force Vectors
  const scale = 0.3;

  // Fx (Horizontal)
  if (Math.abs(state.Fx) > 0) {
    drawArrow(posX, posY, state.Fx * scale, 0, "#ef4444", `Fx=${state.Fx}N`);
  }

  // Fy (Vertical)
  if (Math.abs(state.Fy) > 0) {
    drawArrow(posX, posY, 0, -state.Fy * scale, "#10b981", `Fy=${state.Fy}N`);
  }

  // Friction f (Horizontal)
  if (Math.abs(state.fActualX) > 0) {
    drawArrow(posX, posY + 25, state.fActualX * scale, 0, "#8b5cf6", `f=${Math.abs(state.fActualX).toFixed(0)}N`);
  }

  // Net Force ΣF
  if (state.netTotal > 0) {
    drawArrow(posX, posY - 40, (state.Fx + state.fActualX) * scale, -state.netFy * scale, "#f59e0b", `ΣF=${state.netTotal.toFixed(1)}N`);
  }
}

function simulationLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (dt < 0.1) {
    updatePhysics(dt);
  }
  drawScene();
  requestAnimationFrame(simulationLoop);
}

btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Mulai Simulasi";
  toggleInputs(isPlaying);
});

function resetSim() {
  obj.x = 0;
  obj.y = 0;
  obj.vx = 0;
  obj.vy = 0;
  obj.ax = 0;
  obj.ay = 0;
  elapsedTime = 0;
  isPlaying = false;
  btnPlayPause.textContent = "Mulai Simulasi";
  toggleInputs(false);
  updatePhysicsState();
  drawScene();
}

btnReset.addEventListener("click", resetSim);

function toggleInputs(disabled) {
  [fxInput, fyInput, massInput, muInput].forEach((el) => {
    if (el) el.disabled = disabled;
  });
}

[fxInput, fyInput, massInput, muInput].forEach((el) => {
  if (el) {
    el.addEventListener("input", () => {
      updatePhysicsState();
      if (!isPlaying) drawScene();
    });
  }
});

updatePhysicsState();
requestAnimationFrame(simulationLoop);
