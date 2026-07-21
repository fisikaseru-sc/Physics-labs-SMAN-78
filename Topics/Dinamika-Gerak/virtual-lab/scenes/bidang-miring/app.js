const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const angleInput = document.getElementById("angleInput");
const massInput = document.getElementById("massInput");
const muInput = document.getElementById("muInput");
const gravityInput = document.getElementById("gravityInput");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const wParallelVal = document.getElementById("wParallelVal");
const fricVal = document.getElementById("fricVal");
const netForceValue = document.getElementById("netForceValue");
const accelVal = document.getElementById("accelVal");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;

const box = {
  dist: 0, // distance traveled along incline (meters)
  speed: 0,
};

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updatePhysicsState() {
  const thetaDeg = Math.max(0, Math.min(60, parseFloat(angleInput.value) || 0));
  const theta = (thetaDeg * Math.PI) / 180;
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const mu = Math.max(0, parseFloat(muInput.value) || 0);
  const g = Math.max(0.1, parseFloat(gravityInput.value) || 9.8);

  const W = m * g;
  const wParallel = W * Math.sin(theta);
  const wPerp = W * Math.cos(theta);
  const N = wPerp;

  const fLimit = mu * N;
  let fActual = 0;
  let netForce = 0;
  let accel = 0;

  if (Math.abs(box.speed) < 0.001) {
    if (wParallel <= fLimit) {
      fActual = wParallel;
      netForce = 0;
      accel = 0;
      statusMessage.textContent = `Benda Diam di Bidang Miring (W_sejajar = ${wParallel.toFixed(1)} N ≤ f_gesek = ${fLimit.toFixed(1)} N)`;
      statusMessage.style.borderColor = "#f59e0b";
      conclusionText.textContent = `Gaya sejajar bidang W_sejajar = m·g·sin(${thetaDeg}°) = ${wParallel.toFixed(1)} N dilawan oleh gaya gesek statis. Karena W_sejajar ≤ f_gesek,0 (${fLimit.toFixed(1)} N), benda tetap diam.`;
    } else {
      fActual = fLimit;
      netForce = wParallel - fActual;
      accel = netForce / m;
      statusMessage.textContent = `Benda Meluncur Turun (a = ${accel.toFixed(2)} m/s²)`;
      statusMessage.style.borderColor = "#3b82f6";
      conclusionText.textContent = `Gaya sejajar bidang W_sejajar (${wParallel.toFixed(1)} N) melampaui gaya gesek kinetis f_k (${fActual.toFixed(1)} N). Resultan gaya ΣFx = ${netForce.toFixed(1)} N menyebabkan benda meluncur dipercepat a = ${accel.toFixed(2)} m/s².`;
    }
  } else {
    fActual = fLimit;
    netForce = wParallel - fActual;
    accel = netForce / m;
    statusMessage.textContent = `Benda Meluncur Turun (a = ${accel.toFixed(2)} m/s²)`;
    statusMessage.style.borderColor = "#3b82f6";
  }

  wParallelVal.textContent = wParallel.toFixed(1);
  fricVal.textContent = fActual.toFixed(1);
  netForceValue.textContent = Math.abs(netForce).toFixed(1);
  accelVal.textContent = accel.toFixed(2);

  return { theta, thetaDeg, m, mu, g, W, wParallel, wPerp, N, fActual, netForce, accel };
}

function updatePhysics(dt) {
  if (!isPlaying) return;

  const state = updatePhysicsState();
  if (state.accel > 0) {
    box.speed += state.accel * dt;
    box.dist += box.speed * dt;
  }

  const inclineLength = 5; // 5 meters max
  if (box.dist >= inclineLength) {
    box.dist = inclineLength;
    isPlaying = false;
    btnPlayPause.textContent = "Mulai Simulasi";
    toggleInputs(false);
  }

  elapsedTime += dt;
}

function drawArrow(x, y, length, angle, color, label) {
  if (Math.abs(length) < 1) return;
  const arrowHead = 10;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length - arrowHead, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(length - arrowHead, -6);
  ctx.lineTo(length - arrowHead, 6);
  ctx.fill();

  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, length / 2, -10);

  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const state = updatePhysicsState();

  const baseWidth = canvas.width * 0.7;
  const startX = canvas.width * 0.15;
  const startY = canvas.height * 0.75;

  const height = baseWidth * Math.tan(state.theta);
  const endX = startX + baseWidth;
  const endY = startY - height;

  // Draw Wedge (Bidang Miring)
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, startY);
  ctx.lineTo(startX, endY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Angle Arc
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(endX, startY, 40, Math.PI, Math.PI + state.theta, false);
  ctx.stroke();

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.fillText(`θ = ${state.thetaDeg}°`, endX - 60, startY - 15);

  // Box on incline
  const maxPixels = Math.hypot(baseWidth, height);
  const frac = Math.min(1, box.dist / 5);
  const boxDistPixels = frac * (maxPixels - 120);

  // Position of box center along slope
  const slopeAngle = -state.theta;
  const boxX = startX + 40 * Math.cos(slopeAngle) + boxDistPixels * Math.cos(-state.theta);
  const boxY = endY + 40 * Math.sin(-slopeAngle) + boxDistPixels * Math.sin(state.theta);

  ctx.save();
  ctx.translate(boxX, boxY);
  ctx.rotate(-state.theta);

  // Box Rect
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(-30, -50, 60, 50);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.strokeRect(-30, -50, 60, 50);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.m} kg`, 0, -25);

  // Vectors relative to box
  const scale = 0.25;

  // Normal Force N (perpendicular up)
  drawArrow(0, -25, state.N * scale, -Math.PI / 2, "#10b981", `N=${state.N.toFixed(0)}N`);

  // W parallel (down along incline)
  if (state.wParallel > 0) {
    drawArrow(0, -25, state.wParallel * scale, Math.PI, "#ef4444", `W_∥=${state.wParallel.toFixed(0)}N`);
  }

  // Friction (up along incline)
  if (state.fActual > 0) {
    drawArrow(0, -25, state.fActual * scale, 0, "#8b5cf6", `f=${state.fActual.toFixed(0)}N`);
  }

  ctx.restore();
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
  box.dist = 0;
  box.speed = 0;
  elapsedTime = 0;
  isPlaying = false;
  btnPlayPause.textContent = "Mulai Simulasi";
  toggleInputs(false);
  updatePhysicsState();
  drawScene();
}

btnReset.addEventListener("click", resetSim);

function toggleInputs(disabled) {
  [angleInput, massInput, muInput, gravityInput].forEach((el) => {
    if (el) el.disabled = disabled;
  });
}

[angleInput, massInput, muInput, gravityInput].forEach((el) => {
  if (el) {
    el.addEventListener("input", () => {
      updatePhysicsState();
      if (!isPlaying) drawScene();
    });
  }
});

updatePhysicsState();
requestAnimationFrame(simulationLoop);
