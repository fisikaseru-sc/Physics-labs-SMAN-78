// --- INIT MATTER.JS ---
const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint;

const engine = Engine.create();
const world = engine.world;
engine.gravity.y = 1; // 1 scale gravity

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- MOUSE INTERACTION ---
const mouse = Mouse.create(canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);

// UI Elements
const btnPlayPause = document.getElementById('btnPlayPause');
const btnReset = document.getElementById('btnReset');
const scenarioSelect = document.getElementById('scenarioSelect');

const trolleyControls = document.getElementById('trolleyControls');
const trolleyMassSelect = document.getElementById('trolleyMassSelect');
const trolleyForce = document.getElementById('trolleyForce');

const rocketControls = document.getElementById('rocketControls');
const rocketThrust = document.getElementById('rocketThrust');
const btnLaunch = document.getElementById('btnLaunch');

const brakingControls = document.getElementById('brakingControls');
const carSpeed = document.getElementById('carSpeed');
const btnBrake = document.getElementById('btnBrake');

const raceControls = document.getElementById('raceControls');
const raceForce = document.getElementById('raceForce');

const velValue = document.getElementById('velValue');
const netForceValue = document.getElementById('netForceValue');
const accelValue = document.getElementById('accelValue');
const timeValue = document.getElementById('timeValue');
const statusMessage = document.getElementById('statusMessage');

let isPlaying = false;
let lastTime = 0;
let elapsedTime = 0;
let currentScenario = 'trolley';
let particles = [];
let activeBodies = {}; // Store references to Matter bodies
let logicalWidth = 800;
let logicalHeight = 600;

function resizeCanvas() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    logicalWidth = container.clientWidth;
    logicalHeight = container.clientHeight;
    
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';
    
    ctx.scale(dpr, dpr);
    
    buildScenario(); // Rebuild world on resize
}
window.addEventListener('resize', resizeCanvas);

// --- DRAWING FUNCTIONS (CUSTOM CANVAS) ---
function drawArrow(x, y, length, direction, color, label, isVertical = false) {
    if (Math.abs(length) < 5) return;
    const arrowWidth = 8;
    const arrowHeadSize = 12;
    const actualLength = Math.max(20, Math.abs(length));
    const sign = direction === 'positive' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (isVertical) ctx.lineTo(x, y - sign * Math.max(1, actualLength - arrowHeadSize));
    else ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y);
    ctx.lineWidth = arrowWidth; ctx.strokeStyle = color; ctx.stroke();
    ctx.beginPath();
    if (isVertical) {
        ctx.moveTo(x - arrowHeadSize/2, y - sign * Math.max(1, actualLength - arrowHeadSize));
        ctx.lineTo(x + arrowHeadSize/2, y - sign * Math.max(1, actualLength - arrowHeadSize));
        ctx.lineTo(x, y - sign * actualLength);
    } else {
        ctx.moveTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y - arrowHeadSize/2);
        ctx.lineTo(x + sign * actualLength, y);
        ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y + arrowHeadSize/2);
    }
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Inter, sans-serif'; ctx.textAlign = 'center';
    if (isVertical) ctx.fillText(label, x + 35, y - sign * (actualLength / 2));
    else ctx.fillText(label, x + sign * (actualLength / 2), y - arrowHeadSize - 5);
}

function drawTrolley(x, y, angle, isFull) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(-25, 25, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 25, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.5)';
    ctx.beginPath(); ctx.moveTo(-35, -30); ctx.lineTo(35, -30); ctx.lineTo(25, 15); ctx.lineTo(-25, 15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-35, -30); ctx.lineTo(35, -30); ctx.lineTo(25, 15); ctx.lineTo(-25, 15); ctx.closePath(); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i=-20; i<=20; i+=10) { ctx.beginPath(); ctx.moveTo(i, -30); ctx.lineTo(i * 0.8, 15); ctx.stroke(); }
    for (let j=-20; j<=10; j+=10) { ctx.beginPath(); ctx.moveTo(-32 + (j+20)*0.1, j); ctx.lineTo(32 - (j+20)*0.1, j); ctx.stroke(); }
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-35, -30); ctx.lineTo(-45, -45); ctx.lineTo(-55, -45); ctx.stroke();
    if (isFull) {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-20, -20, 15, 35);
        ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-12, -28); ctx.lineTo(-5, -20); ctx.fill();
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, -10, 20, 25);
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(10, -15, 10, 0, Math.PI*2); ctx.arc(15, -20, 8, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function drawPersonPushing(x, y) {
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(x, y - 85, 12, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 73); ctx.lineTo(x + 15, y - 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 15, y - 35); ctx.lineTo(x - 5, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 15, y - 35); ctx.lineTo(x + 30, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y - 65); ctx.lineTo(x + 40, y - 55); ctx.stroke();
}

function drawRocketObj(x, y, angle, thrusting) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const grad = ctx.createLinearGradient(-15, 0, 15, 0);
    grad.addColorStop(0, '#e2e8f0'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad; 
    ctx.beginPath(); ctx.roundRect(-15, -40, 30, 100, 4); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.fillRect(-16, -10, 32, 12);
    ctx.fillStyle = '#475569'; ctx.fillRect(-22, -30, 7, 2); ctx.fillRect(15, -30, 7, 2);
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(-15, 20); ctx.lineTo(-25, 60); ctx.lineTo(-15, 55); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, 20); ctx.lineTo(25, 60); ctx.lineTo(15, 55); ctx.fill();
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath(); ctx.moveTo(-15, -40); ctx.bezierCurveTo(-15, -70, -5, -85, 0, -90); ctx.bezierCurveTo(5, -85, 15, -70, 15, -40); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 9px Inter, sans-serif';
    ctx.save(); ctx.translate(0, 35); ctx.rotate(-Math.PI/2); ctx.fillText("SPACEX", 0, 3); ctx.restore();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.moveTo(-10, 60); ctx.lineTo(-14, 72); ctx.lineTo(14, 72); ctx.lineTo(10, 60); ctx.fill();
    
    if (thrusting) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.moveTo(-10, 68); ctx.lineTo(0, 100 + Math.random()*30); ctx.lineTo(10, 68); ctx.fill();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.beginPath(); ctx.moveTo(-12, 68); ctx.lineTo(0, 120 + Math.random()*40); ctx.lineTo(12, 68); ctx.fill();
    }
    
    ctx.restore();
}

function drawCarObj(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(-25, 12, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 12, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.arc(-25, 12, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 12, 4, 0, Math.PI*2); ctx.fill();
    const bGrad = ctx.createLinearGradient(-40, 0, 40, 0);
    bGrad.addColorStop(0, '#2563eb'); bGrad.addColorStop(1, '#60a5fa');
    ctx.fillStyle = bGrad;
    ctx.beginPath(); ctx.moveTo(-45, 8); ctx.lineTo(-45, -5); ctx.lineTo(-30, -5); ctx.lineTo(-10, -25);
    ctx.lineTo(20, -25); ctx.lineTo(40, -5); ctx.lineTo(50, 0); ctx.lineTo(50, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath(); ctx.moveTo(-25, -5); ctx.lineTo(-10, -20); ctx.lineTo(0, -20); ctx.lineTo(0, -5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(20, -20); ctx.lineTo(35, -5); ctx.lineTo(5, -5); ctx.fill();
    ctx.restore();
}

function drawSportsCar(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(-38, -13, 85, 26, 8); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(-28, -16, 16, 32, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(22, -16, 14, 32, 3); ctx.fill();
    const grad = ctx.createLinearGradient(0, -15, 0, 15);
    grad.addColorStop(0, '#ef4444'); grad.addColorStop(0.5, '#fca5a5'); grad.addColorStop(1, '#dc2626');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-35, -12); ctx.lineTo(25, -10); ctx.bezierCurveTo(45, -8, 45, 8, 25, 10);
    ctx.lineTo(-35, 12); ctx.lineTo(-40, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(15, -6); ctx.bezierCurveTo(25, -4, 25, 4, 15, 6);
    ctx.lineTo(-10, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.fillRect(-38, -10, 6, 20);
    ctx.restore();
}

function drawTruckObj(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(-58, -18, 125, 36, 4); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(-50, -22, 20, 44, 3); ctx.fill(); 
    ctx.beginPath(); ctx.roundRect(-20, -22, 20, 44, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(40, -20, 16, 40, 3); ctx.fill(); 
    const tGrad = ctx.createLinearGradient(0, -15, 0, 15);
    tGrad.addColorStop(0, '#94a3b8'); tGrad.addColorStop(0.5, '#cbd5e1'); tGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = tGrad;
    ctx.beginPath(); ctx.roundRect(-60, -16, 95, 32, 2); ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
    for(let i=-50; i<30; i+=10) { ctx.beginPath(); ctx.moveTo(i, -15); ctx.lineTo(i, 15); ctx.stroke(); }
    const cGrad = ctx.createLinearGradient(0, -15, 0, 15);
    cGrad.addColorStop(0, '#f59e0b'); cGrad.addColorStop(0.5, '#fcd34d'); cGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = cGrad;
    ctx.beginPath(); ctx.roundRect(35, -14, 25, 28, 6); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(50, -12, 8, 24, 2); ctx.fill();
    ctx.restore();
}

// --- MATTER.JS SCENARIO BUILDERS ---
function buildScenario() {
    World.clear(world);
    Engine.clear(engine);
    activeBodies = {};
    const groundY = logicalHeight - 50;
    engine.gravity.y = 1; // Default for side-view scenarios
    
    // Add ground and walls
    const ground = Bodies.rectangle(logicalWidth/2, groundY + 25, logicalWidth*3, 50, { isStatic: true });
    World.add(world, ground);

    if (currentScenario === 'trolley') {
        const mass = parseFloat(trolleyMassSelect.value) || 10;
        activeBodies.trolley = Bodies.rectangle(logicalWidth/2 - 100, groundY - 50, 100, 80, { mass: mass, friction: 0.05, restitution: 0.2 });
        World.add(world, activeBodies.trolley);
    } 
    else if (currentScenario === 'rocket') {
        engine.gravity.y = 1; // Earth gravity
        // Match visual dimensions of the SpaceX rocket perfectly (width 30, height 145)
        activeBodies.rocket = Bodies.rectangle(logicalWidth/2, groundY - 72.5, 30, 145, { mass: 100, frictionAir: 0.02, friction: 0.5, restitution: 0 });
        World.add(world, activeBodies.rocket);
        activeBodies.isThrusting = false;
        activeBodies.launchInitiated = false;
        activeBodies.rocketLaunchTime = 0;
    }
    else if (currentScenario === 'braking') {
        activeBodies.car = Bodies.rectangle(logicalWidth/2 - 150, groundY - 30, 140, 60, { mass: 1000, friction: 0.01 });
        activeBodies.box = Bodies.rectangle(logicalWidth/2 - 150, groundY - 75, 40, 30, { mass: 50, friction: 0.3 }); // Mu=0.3
        
        let startSpeed = parseFloat(carSpeed.value) || 15;
        // Need to scale speed to Matter.js units (~0.1 of actual meter/s)
        Body.setVelocity(activeBodies.car, { x: startSpeed * 0.5, y: 0 });
        Body.setVelocity(activeBodies.box, { x: startSpeed * 0.5, y: 0 });
        
        World.add(world, [activeBodies.car, activeBodies.box]);
        activeBodies.braking = false;
        activeBodies.hasBraked = false;
    }
    else if (currentScenario === 'race') {
        engine.gravity.y = 0; // Top-Down view (no vertical gravity)
        
        const tMass = parseFloat(document.getElementById('truckMass')?.value) || 5000;
        activeBodies.car = Bodies.rectangle(logicalWidth/4 - 100, logicalHeight/2 + 50, 80, 30, { mass: 1000, frictionAir: 0.05, restitution: 0 });
        activeBodies.truck = Bodies.rectangle(logicalWidth/4 - 100, logicalHeight/2 - 50, 120, 40, { mass: tMass, frictionAir: 0.05, restitution: 0 });
        World.add(world, [activeBodies.car, activeBodies.truck]);
    }
    
    elapsedTime = 0;
    particles = [];
}

// --- UPDATE & DRAW ---
function updateStatusMessage(msg) {
    statusMessage.textContent = msg;
    statusMessage.style.backgroundColor = "rgba(0,0,0,0.8)";
}

function updatePhysics(dt) {
    if (!isPlaying) return;
    
    // Convert dt (seconds) to milliseconds for Matter.js
    Engine.update(engine, dt * 1000);
    elapsedTime += dt;

    if (currentScenario === 'trolley' && activeBodies.trolley) {
        const force = parseFloat(trolleyForce.value) || 0;
        // applyForce takes a vector. Multiply by a small scale to make it look right.
        Body.applyForce(activeBodies.trolley, activeBodies.trolley.position, { x: force * 0.0001, y: 0 });
        
        const a = force / activeBodies.trolley.mass;
        const v = activeBodies.trolley.velocity.x * 2; // Scale for display
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = a.toFixed(2);
        velValue.textContent = v.toFixed(2);
        updateStatusMessage(force > 0 ? `Troli dipercepat (a = ${a.toFixed(2)} m/s²)` : "Troli Diam");
    }
    else if (currentScenario === 'rocket' && activeBodies.rocket) {
        const thrust = activeBodies.isThrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
        if (thrust > 0) {
            Body.applyForce(activeBodies.rocket, activeBodies.rocket.position, { x: 0, y: -thrust * 0.0001 });
            for(let i=0; i<3; i++) {
                particles.push({
                    x: activeBodies.rocket.position.x + (Math.random()*16-8),
                    y: activeBodies.rocket.position.y + 70,
                    vx: (Math.random()*4-2),
                    vy: Math.random()*3+1,
                    life: 1,
                    color: Math.random() > 0.4 ? '#cbd5e1' : '#f97316'
                });
            }
        }
        
        const isOnGround = activeBodies.rocket.position.y >= groundY - 73;
        const weight = activeBodies.rocket.mass * 9.8; // Menggunakan g = 9.8
        
        let netForce = thrust - weight;
        // Jika di landasan dan gaya dorong tidak cukup untuk mengangkat, netForce = 0 (diimbangi gaya normal)
        if (isOnGround && netForce <= 0) netForce = 0;
        
        let a = netForce / activeBodies.rocket.mass;
        let v = -activeBodies.rocket.velocity.y * 2;
        
        // Update dashboard nilai fisika
        netForceValue.textContent = Math.abs(netForce).toFixed(1);
        accelValue.textContent = a.toFixed(2);
        velValue.textContent = v.toFixed(2);
        if (activeBodies.launchInitiated && isOnGround) activeBodies.rocketLaunchTime += dt;
        
        let msg = "";
        if (a > 0) msg = "🚀 Roket Meluncur Naik!";
        else if (isOnGround) msg = activeBodies.launchInitiated ? "⏳ Mesin menyala, gaya dorong tidak cukup" : "⏳ Roket di Landasan";
        else msg = "💥 Roket Jatuh";
        updateStatusMessage(msg);
    }
    else if (currentScenario === 'braking' && activeBodies.car) {
        if (activeBodies.braking) {
            // Strong braking force backwards
            Body.applyForce(activeBodies.car, activeBodies.car.position, { x: -0.15, y: 0 });
            if (activeBodies.car.velocity.x < 0) {
                Body.setVelocity(activeBodies.car, {x:0, y:0});
                activeBodies.braking = false;
            }
        }
        
        const v = activeBodies.car.velocity.x * 2;
        const vBox = activeBodies.box.velocity.x * 2;
        
        netForceValue.textContent = "-";
        accelValue.textContent = "-";
        velValue.textContent = vBox.toFixed(2);
        updateStatusMessage(activeBodies.braking ? "Mobil Direm! Kotak terdorong (Inersia)." : "Mobil Melaju Konstan");
    }
    else if (currentScenario === 'race' && activeBodies.car) {
        const force = parseFloat(raceForce.value) || 0;
        Body.applyForce(activeBodies.car, activeBodies.car.position, { x: force * 0.00005, y: 0 });
        Body.applyForce(activeBodies.truck, activeBodies.truck.position, { x: force * 0.00005, y: 0 });
        
        const a_car = force / activeBodies.car.mass;
        const a_truck = force / activeBodies.truck.mass;
        const v = activeBodies.car.velocity.x * 2;
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = a_car.toFixed(2);
        velValue.textContent = v.toFixed(2);
        
        updateStatusMessage(`a(mobil)=${a_car.toFixed(2)} vs a(truk)=${a_truck.toFixed(2)}`);
    }
    // --- BOUNDARY CHECKS (Auto-Stop) ---
    const checkStop = (body, condition, msg) => {
        if (body && condition) {
            isPlaying = false;
            btnPlayPause.innerHTML = '▶ Mulai Simulasi';
            updateStatusMessage(msg);
            Body.setVelocity(body, {x: 0, y: 0});
        }
    };

    if (currentScenario === 'trolley') {
        checkStop(activeBodies.trolley, activeBodies.trolley.position.x > logicalWidth - 50, "🏁 Simulasi Selesai: Troli mencapai ujung lintasan!");
    } else if (currentScenario === 'race') {
        checkStop(activeBodies.car, activeBodies.car.position.x > logicalWidth - 50, "🏁 Balapan Selesai: Mobil Sport menang!");
        if (isPlaying) checkStop(activeBodies.truck, activeBodies.truck.position.x > logicalWidth - 50, "🏁 Balapan Selesai: Truk menang!");
    } else if (currentScenario === 'rocket') {
        checkStop(activeBodies.rocket, activeBodies.rocket.position.y < -50, "🚀 Simulasi Selesai: Roket berhasil meluncur ke angkasa!");
        
        // Logika validasi roket gagal meluncur jika di landasan > 3 detik setelah dinyalakan dan a <= 0
        const thrust = activeBodies.isThrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
        const weight = activeBodies.rocket.mass * 9.8;
        if (activeBodies.rocketLaunchTime > 3 && thrust <= weight) {
            checkStop(activeBodies.rocket, true, "💥 Simulasi Selesai: Roket gagal meluncur (Gaya Dorong < Berat)");
        }
    }
    
    timeValue.textContent = elapsedTime.toFixed(2);
}

function drawScene() {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const groundY = logicalHeight - 50;
    
    // Conditionally Draw Background (Indoor vs Outdoor)
    if (currentScenario === 'trolley') {
        // INDOOR CLASSROOM / SUPERMARKET
        // Wall
        ctx.fillStyle = '#fef3c7'; // Warm Yellowish White Wall
        ctx.fillRect(0, 0, logicalWidth, groundY);
        // Baseboard (List Dinding)
        ctx.fillStyle = '#d97706'; // Wood color
        ctx.fillRect(0, groundY - 15, logicalWidth, 15);
        // Floor (Ceramic Tiles)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, groundY, logicalWidth, 50);
        // Tile lines
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
        for(let i = 0; i < logicalWidth; i+=100) {
            ctx.beginPath(); ctx.moveTo(i, groundY); ctx.lineTo(i - 20, logicalHeight); ctx.stroke();
        }
    } else if (currentScenario === 'race') {
        ctx.fillStyle = '#10b981'; 
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        ctx.fillStyle = '#334155'; 
        ctx.fillRect(0, logicalHeight/2 - 100, logicalWidth, 200);
        ctx.lineWidth = 8;
        for(let i=0; i<logicalWidth; i+=40) {
            ctx.strokeStyle = (i/40)%2===0 ? '#ef4444' : '#ffffff';
            ctx.beginPath(); ctx.moveTo(i, logicalHeight/2 - 100); ctx.lineTo(i+40, logicalHeight/2 - 100); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i, logicalHeight/2 + 100); ctx.lineTo(i+40, logicalHeight/2 + 100); ctx.stroke();
        }
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.setLineDash([30, 30]);
        ctx.beginPath(); ctx.moveTo(0, logicalHeight/2); ctx.lineTo(logicalWidth, logicalHeight/2); ctx.stroke();
        ctx.setLineDash([]);
    } else {
        // OUTDOOR
        // Sky Background
        let skyGradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
        skyGradient.addColorStop(0, '#bae6fd');
        skyGradient.addColorStop(1, '#f0f9ff');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        
        // Ground (Grass + Asphalt Line)
        ctx.fillStyle = '#4ade80'; // Grass
        ctx.fillRect(0, groundY, logicalWidth, 50);
        
        // Asphalt for vehicles
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, groundY, logicalWidth, 12);
    }

    if (currentScenario === 'trolley' && activeBodies.trolley) {
        const t = activeBodies.trolley;
        const isFull = trolleyMassSelect.value === "100";
        drawTrolley(t.position.x, t.position.y, t.angle, isFull);
        
        const force = parseFloat(trolleyForce.value) || 0;
        if (force > 0 && isPlaying) {
            drawPersonPushing(t.position.x - 100, groundY);
            drawArrow(t.position.x - 60, groundY - 50, force * 0.5, 'positive', '#ef4444', `Dorong: ${force}N`);
        }
    } 
    else if (currentScenario === 'rocket' && activeBodies.rocket) {
        const r = activeBodies.rocket;
        drawRocketObj(r.position.x, r.position.y, r.angle, activeBodies.isThrusting && isPlaying);
        
        if (isPlaying) {
            const thrust = activeBodies.isThrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
            if (thrust > 0) {
                drawArrow(r.position.x - 40, r.position.y + 40, thrust * 0.1, 'negative', '#ef4444', `${thrust}N (Aksi)`, true);
                drawArrow(r.position.x + 40, r.position.y - 40, thrust * 0.1, 'positive', '#3b82f6', `${thrust}N (Reaksi)`, true);
            }
            drawArrow(r.position.x, r.position.y, 980 * 0.1, 'negative', '#10b981', `Berat: 980N`, true);
        }
    } 
    else if (currentScenario === 'braking' && activeBodies.car) {
        drawCarObj(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
        ctx.save();
        ctx.translate(activeBodies.box.position.x, activeBodies.box.position.y);
        ctx.rotate(activeBodies.box.angle);
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath(); ctx.roundRect(-20, -15, 40, 30, 4); ctx.fill();
        ctx.restore();
        
        if (activeBodies.hasBraked) {
            let mBox = 50; // Massa kotak
            let aCar = 5; // Perlambatan mobil asumsi m/s^2
            let fInersia = mBox * aCar; // 250 N
            let fGesek = 0.3 * mBox * 9.8; // Mu * N = 147 N
            
            // Panah hanya muncul saat kotak masih terlempar meluncur ke depan
            if (activeBodies.box.velocity.x > activeBodies.car.velocity.x && activeBodies.box.velocity.x > 0.1) {
                drawArrow(activeBodies.box.position.x + 20, activeBodies.box.position.y - 30, 80, 'positive', '#ef4444', `Gaya Inersia: ${fInersia} N`);
                drawArrow(activeBodies.box.position.x - 20, activeBodies.box.position.y + 35, 60, 'negative', '#f59e0b', `Gaya Gesek: ${fGesek.toFixed(0)} N`);
            }
            
            const boxX = Math.round(activeBodies.box.position.x);
            const boxY = Math.round(activeBodies.box.position.y);
            
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.beginPath(); ctx.roundRect(boxX - 110, boxY - 130, 290, 65, 8); ctx.fill();
            
            ctx.fillStyle = "#ffffff";
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Perlambatan Mobil (a) = -${aCar} m/s²`, boxX - 95, boxY - 105);
            ctx.fillStyle = "#fde047";
            ctx.fillText(`F_inersia > F_gesek (Kotak Terlempar!)`, boxX - 95, boxY - 80);
            ctx.textBaseline = 'alphabetic'; // Reset baseline
        }
    } 
    else if (currentScenario === 'race' && activeBodies.car) {
        // Draw Track (Top-down view)
        const trackY = logicalHeight / 2;
        
        // Grass (Bahu jalan)
        ctx.fillStyle = '#22c55e'; // Green grass
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        
        // Asphalt
        ctx.fillStyle = '#334155'; // Slate gray asphalt
        ctx.fillRect(0, trackY - 100, logicalWidth, 200);
        
        // Track borders (white/red stripes)
        ctx.lineWidth = 6;
        for (let b = 0; b < logicalWidth; b += 40) {
            ctx.strokeStyle = (b % 80 === 0) ? '#ef4444' : '#ffffff';
            ctx.beginPath(); ctx.moveTo(b, trackY - 97); ctx.lineTo(b + 40, trackY - 97); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(b, trackY + 97); ctx.lineTo(b + 40, trackY + 97); ctx.stroke();
        }
        
        // Center dashed line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(0, trackY);
        ctx.lineTo(logicalWidth, trackY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        drawSportsCar(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
        drawTruckObj(activeBodies.truck.position.x, activeBodies.truck.position.y, activeBodies.truck.angle);
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += (p.vx || 0); 
        p.y += (p.vy || 0);
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
        else {
            ctx.fillStyle = p.color ? (p.color === '#f97316' ? `rgba(249, 115, 22, ${p.life})` : `rgba(203, 213, 225, ${p.life})`) : `rgba(255, 255, 255, ${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8 + (1-p.life)*15, 0, Math.PI*2); ctx.fill();
        }
    }
}

function simulationLoop(timestamp) {
    if (lastTime === 0) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Always update physics if playing or dragging
    if (isPlaying || mouseConstraint.mouse.button !== -1) {
        updatePhysics(Math.min(dt, 0.1));
    }
    
    drawScene();
    if (isPlaying || mouseConstraint.mouse.button !== -1) {
        requestAnimationFrame(simulationLoop);
    }
}

function resetSim() {
    isPlaying = false;
    btnPlayPause.innerHTML = '▶ Mulai Simulasi';
    lastTime = 0;
    buildScenario();
    
    velValue.textContent = '0.00';
    netForceValue.textContent = '0';
    accelValue.textContent = '0.00';
    // Tampilkan overlayStats hanya untuk Troli dan Roket saat awal load/reset
    const overlayStats = document.getElementById('overlayStats');
    if (overlayStats) {
        if (currentScenario === 'trolley' || currentScenario === 'rocket') {
            overlayStats.style.display = 'grid'; 
        } else {
            overlayStats.style.display = 'none';
        }
    }
    
    updateStatusMessage("Siap");
    if (currentScenario === 'rocket') btnLaunch.textContent = "🚀 LUNCURKAN!";
    
    drawScene();
}

// Controls
btnPlayPause.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        btnPlayPause.innerHTML = '⏸ Jeda';
        lastTime = performance.now();
        requestAnimationFrame(simulationLoop);
    } else {
        btnPlayPause.innerHTML = '▶ Lanjut';
    }
});

btnReset.addEventListener('click', resetSim);

scenarioSelect.addEventListener('change', (e) => {
    const sc = e.target.value;
    currentScenario = sc;
    trolleyControls.style.display = 'none';
    raceControls.style.display = 'none';
    rocketControls.style.display = 'none';
    brakingControls.style.display = 'none';
    
    if(sc === 'trolley') trolleyControls.style.display = 'block';
    else if(sc === 'race') raceControls.style.display = 'block';
    else if(sc === 'rocket') rocketControls.style.display = 'block';
    else if(sc === 'braking') brakingControls.style.display = 'block';
    
    // Tampilkan overlayStats hanya untuk Troli dan Roket
    const overlayStats = document.getElementById('overlayStats');
    if (overlayStats) {
        if (sc === 'trolley' || sc === 'rocket') {
            overlayStats.style.display = 'grid'; // Grid is used in CSS for .overlay-stats
        } else {
            overlayStats.style.display = 'none';
        }
    }
    
    resetSim();
});

btnLaunch.addEventListener('click', () => { 
    if(activeBodies.rocket) {
        activeBodies.isThrusting = !activeBodies.isThrusting; 
        if (activeBodies.isThrusting) activeBodies.launchInitiated = true;
        btnLaunch.textContent = activeBodies.isThrusting ? "🛑 MATIKAN MESIN" : "🚀 LUNCURKAN!";
        if(!isPlaying) btnPlayPause.click(); 
    }
});

btnBrake.addEventListener('click', () => {
    if(activeBodies.car) {
        activeBodies.braking = true;
        activeBodies.hasBraked = true;
    }
    if(!isPlaying) btnPlayPause.click();
});

[trolleyMassSelect, trolleyForce, rocketThrust, carSpeed, raceForce].forEach(el => {
    el.addEventListener('input', () => { if (!isPlaying) resetSim(); });
});

// Drag listener to start rendering if dragged while paused
Events.on(mouseConstraint, 'startdrag', () => {
    if (!isPlaying) {
        lastTime = performance.now();
        requestAnimationFrame(simulationLoop);
    }
});

// Init
setTimeout(() => {
    resizeCanvas();
    scenarioSelect.dispatchEvent(new Event('change'));
}, 100);
