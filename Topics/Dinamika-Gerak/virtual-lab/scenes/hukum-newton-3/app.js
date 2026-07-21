const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const scenarioSelect = document.getElementById("scenarioSelect");
const massInput = document.getElementById("massInput");
const gravityInput = document.getElementById("gravityInput");

const frictionControls = document.getElementById("frictionControls");
const pushForceInput = document.getElementById("pushForceInput");
const muSInput = document.getElementById("muSInput");
const muKInput = document.getElementById("muKInput");

const elevatorControls = document.getElementById("elevatorControls");
const elevatorAccelInput = document.getElementById("elevatorAccelInput");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const weightVal = document.getElementById("weightVal");
const normalVal = document.getElementById("normalVal");
const netForceValue = document.getElementById("netForceValue");
const accelVal = document.getElementById("accelVal");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

// State
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;

const obj = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  width: 120,
  height: 120,
};

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawArrow(x, y, length, direction, color, label) {
  if (Math.abs(length) < 1) return;
  const arrowHead = 12;
  const sign = (direction === "right" || direction === "down") ? 1 : -1;
  const isHorizontal = direction === "right" || direction === "left";

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(x, y);
  if (isHorizontal) {
    ctx.lineTo(x + sign * (length - arrowHead), y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + sign * length, y);
    ctx.lineTo(x + sign * (length - arrowHead), y - 8);
    ctx.lineTo(x + sign * (length - arrowHead), y + 8);
    ctx.fill();
  } else {
    ctx.lineTo(x, y + sign * (length - arrowHead));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + sign * length);
    ctx.lineTo(x - 8, y + sign * (length - arrowHead));
    ctx.lineTo(x + 8, y + sign * (length - arrowHead));
    ctx.fill();
  }

  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  if (isHorizontal) {
    ctx.fillText(label, x + sign * (length / 2), y - 10);
  } else {
    const labelX = sign > 0 ? x + 50 : x - 50;
    ctx.fillText(label, labelX, y + sign * (length / 2));
  }
  ctx.restore();
}

function updatePhysicsState() {
  const scenario = scenarioSelect.value;
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(0.1, parseFloat(gravityInput.value) || 9.8);

  const weight = m * g;
  weightVal.textContent = weight.toFixed(1);

  let normal = weight;
  let netForce = 0;
  let accel = 0;

  if (scenario === "normal_weight") {
    normal = weight;
    netForce = 0;
    accel = 0;
    normalVal.textContent = normal.toFixed(1);
    accelVal.textContent = "0.00";
    statusMessage.textContent = "Benda Seimbang di Lantai (N = W, ΣF = 0)";
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Gaya Berat W = m × g = ${m} kg × ${g} m/s² = ${weight.toFixed(1)} N (ke bawah). Gaya Normal N = ${normal.toFixed(1)} N (tegak lurus bidang ke atas). Keduanya seimbang (ΣF_y = 0).`;
  } else if (scenario === "friction") {
    normal = weight;
    const F = Math.max(0, parseFloat(pushForceInput.value) || 0);
    const muS = Math.max(0, parseFloat(muSInput.value) || 0.4);
    const muK = Math.max(0, Math.min(muS, parseFloat(muKInput.value) || 0.25));

    const fSMax = muS * normal;
    let fActual = 0;

    if (Math.abs(obj.vx) < 0.001) {
      if (F <= fSMax) {
        fActual = F;
        netForce = 0;
        accel = 0;
        statusMessage.textContent = `Benda Diam (Gaya Gesek Statis f_s = ${fActual.toFixed(1)} N ≤ f_s,max = ${fSMax.toFixed(1)} N)`;
        statusMessage.style.borderColor = "#f59e0b";
        conclusionText.textContent = `Gaya dorong F (${F} N) dilawan penuh oleh Gaya Gesek Statis f_s (${fActual.toFixed(1)} N). Karena F ≤ f_s,max (${fSMax.toFixed(1)} N), benda tetap diam.`;
      } else {
        fActual = muK * normal;
        netForce = F - fActual;
        accel = netForce / m;
        statusMessage.textContent = `Benda Bergerak (Gaya Gesek Kinetis f_k = ${fActual.toFixed(1)} N, a = ${accel.toFixed(2)} m/s²)`;
        statusMessage.style.borderColor = "#3b82f6";
        conclusionText.textContent = `Gaya dorong F (${F} N) melampaui f_s,max (${fSMax.toFixed(1)} N). Benda meluncur dengan Gaya Gesek Kinetis f_k = ${fActual.toFixed(1)} N dan dipercepat sebesar a = ${accel.toFixed(2)} m/s².`;
      }
    } else {
      fActual = muK * normal;
      netForce = F - fActual;
      accel = netForce / m;
      statusMessage.textContent = `Benda Meluncur (f_k = ${fActual.toFixed(1)} N, a = ${accel.toFixed(2)} m/s²)`;
      statusMessage.style.borderColor = "#3b82f6";
    }

    normalVal.textContent = normal.toFixed(1);
    accelVal.textContent = accel.toFixed(2);
  } else if (scenario === "tension") {
    normal = weight; // Tegangan Tali T = W saat diam
    normalVal.textContent = weight.toFixed(1);
    accelVal.textContent = "0.00";
    statusMessage.textContent = "Benda Digantung Seimbang (T = W = mg, ΣF = 0)";
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Gaya Berat W = ${weight.toFixed(1)} N menarik benda ke bawah. Gaya Tegangan Tali T = ${weight.toFixed(1)} N menahan benda ke atas. Resultan gaya ΣF_y = T - W = 0.`;
  } else if (scenario === "elevator") {
    const aLift = parseFloat(elevatorAccelInput.value) || 0;
    normal = m * (g + aLift);
    netForce = m * aLift;
    accel = aLift;

    normalVal.textContent = normal.toFixed(1);
    accelVal.textContent = accel.toFixed(2);

    if (aLift > 0) {
      statusMessage.textContent = `Lift Dipercepat NAIK (N = m(g+a) = ${normal.toFixed(1)} N > W)`;
      statusMessage.style.borderColor = "#3b82f6";
      conclusionText.textContent = `Saat lift dipercepat NAIK (a = ${aLift} m/s²), timbangan tertekan lebih kuat. Berat semu N = m(g + a) = ${normal.toFixed(1)} N (terasa lebih BERAT).`;
    } else if (aLift < 0) {
      statusMessage.textContent = `Lift Dipercepat TURUN (N = m(g+a) = ${normal.toFixed(1)} N < W)`;
      statusMessage.style.borderColor = "#ef4444";
      conclusionText.textContent = `Saat lift dipercepat TURUN (a = ${aLift} m/s²), tekanan pada lantai berkurang. Berat semu N = m(g - |a|) = ${normal.toFixed(1)} N (terasa lebih RINGAN).`;
    } else {
      statusMessage.textContent = `Lift Diam / Kecepatan Konstan (N = W = ${normal.toFixed(1)} N)`;
      statusMessage.style.borderColor = "#10b981";
      conclusionText.textContent = `Saat lift diam atau bergerak dengan kecepatan konstan (a = 0), Berat Semu N sama persis dengan Berat Asli W = ${weight.toFixed(1)} N.`;
    }
  }

  netForceValue.textContent = Math.abs(netForce).toFixed(1);
  return { m, g, weight, normal, netForce, accel };
}

function updatePhysics(dt) {
  if (!isPlaying) return;
  const state = updatePhysicsState();

  if (scenarioSelect.value === "friction") {
    obj.vx += state.accel * dt;
    obj.x += obj.vx * dt * 50; // Scale position
    const maxDist = canvas.width / 2 - 100;
    if (obj.x >= maxDist) {
      obj.x = maxDist;
      isPlaying = false;
      btnPlayPause.textContent = "Mulai Simulasi";
      toggleInputs(false);
    }
  }

  elapsedTime += dt;
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scenario = scenarioSelect.value;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 + 50;

  const state = updatePhysicsState();

  if (scenario === "elevator") {
    // Draw Elevator Shaft & Cabin
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 6;
    ctx.strokeRect(centerX - 120, centerY - 200, 240, 260);

    ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
    ctx.fillRect(centerX - 115, centerY - 195, 230, 250);

    // Cable
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 200);
    ctx.lineTo(centerX, 0);
    ctx.stroke();

    // Scale on floor
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(centerX - 50, centerY + 45, 100, 10);
  } else {
    // Ground line
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, centerY + 50);
    ctx.lineTo(canvas.width, centerY + 50);
    ctx.stroke();
  }

  // Draw Object
  let posX = centerX + (scenario === "friction" ? obj.x : 0);
  let posY = centerY - 10;

  if (scenario === "tension") {
    posY = centerY - 50;
    // Rope
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, posY - 40);
    ctx.stroke();
  }

  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(posX - 40, posY - 40, 80, 80);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.strokeRect(posX - 40, posY - 40, 80, 80);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.m} kg`, posX, posY + 5);

  // Force Vectors
  const scale = 0.25;

  if (scenario === "normal_weight" || scenario === "elevator" || scenario === "friction") {
    // Weight Arrow W (down)
    drawArrow(posX, posY, state.weight * scale, "down", "#ef4444", `W = ${state.weight.toFixed(1)} N`);
    // Normal Arrow N (up)
    drawArrow(posX, posY - 40, state.normal * scale, "up", "#10b981", `N = ${state.normal.toFixed(1)} N`);
  } else if (scenario === "tension") {
    // Weight W (down)
    drawArrow(posX, posY, state.weight * scale, "down", "#ef4444", `W = ${state.weight.toFixed(1)} N`);
    // Tension T (up)
    drawArrow(posX, posY - 40, state.weight * scale, "up", "#10b981", `T = ${state.weight.toFixed(1)} N`);
  }

  if (scenario === "friction") {
    const F = parseFloat(pushForceInput.value) || 0;
    if (F > 0) {
      drawArrow(posX + 40, posY, F * scale, "right", "#3b82f6", `F = ${F} N`);
    }
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

// Event Listeners
scenarioSelect.addEventListener("change", (e) => {
  const sc = e.target.value;
  frictionControls.style.display = sc === "friction" ? "block" : "none";
  elevatorControls.style.display = sc === "elevator" ? "block" : "none";
  resetSim();
});

btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Mulai Simulasi";
  toggleInputs(isPlaying);
});

function resetSim() {
  obj.x = 0;
  obj.vx = 0;
  elapsedTime = 0;
  isPlaying = false;
  btnPlayPause.textContent = "Mulai Simulasi";
  toggleInputs(false);
  updatePhysicsState();
  drawScene();
}

btnReset.addEventListener("click", resetSim);

function toggleInputs(disabled) {
  [scenarioSelect, massInput, gravityInput, pushForceInput, muSInput, muKInput, elevatorAccelInput].forEach((el) => {
    if (el) el.disabled = disabled;
  });
}

[massInput, gravityInput, pushForceInput, muSInput, muKInput, elevatorAccelInput].forEach((el) => {
  if (el) {
    el.addEventListener("input", () => {
      updatePhysicsState();
      if (!isPlaying) drawScene();
    });
  }
});

// Init
updatePhysicsState();
requestAnimationFrame(simulationLoop);
