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
const trolleyMassInput = document.getElementById('trolleyMassInput');
const trolleyForce = document.getElementById('trolleyForce');

const rocketControls = document.getElementById('rocketControls');
const rocketThrust = document.getElementById('rocketThrust');
const btnLaunch = document.getElementById('btnLaunch');

const brakingControls = document.getElementById('brakingControls');
const carSpeed = document.getElementById('carSpeed');
const btnBrake = document.getElementById('btnBrake');
const brakingVehicleSelect = document.getElementById('brakingVehicleSelect');

const raceControls = document.getElementById('raceControls');
const raceForce = document.getElementById('raceForce');

const velValue = document.getElementById('velValue');
const netForceValue = document.getElementById('netForceValue');
const accelValue = document.getElementById('accelValue');
const timeValue = document.getElementById('timeValue');
const statusMessage = document.getElementById('statusMessage');

const statForce = document.getElementById('statForce');
const statAccel = document.getElementById('statAccel');
const statVel = document.getElementById('statVel');
const statTime = document.getElementById('statTime');

let isPlaying = false;
let lastTime = 0;
let elapsedTime = 0;
let currentScenario = 'trolley';
let particles = [];
let activeBodies = {}; // Store references to Matter bodies
let logicalWidth = 800;
let logicalHeight = 600;
let cameraX = 0;
let cameraY = 0;
let targetCameraX = 0;
let targetCameraY = 0;
let simSpeed = 1.0;

const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.8 + 0.2
    });
}

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

function drawTrolley(x, y, angle, mass) {
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
    
    // Draw load dynamically based on mass input (base trolley is 10kg)
    if (mass > 10) {
        // Red box / carton
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-20, -20, 15, 35);
        ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-12, -28); ctx.lineTo(-5, -20); ctx.fill();
    }
    if (mass > 40) {
        // Blue box
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, -10, 20, 25);
    }
    if (mass > 100) {
        // Emerald bag / veggies
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
    
    // Add ground with 0 friction for braking scenario (so car rolls constantly)
    const groundFriction = currentScenario === 'braking' ? 0 : 0.1;
    const ground = Bodies.rectangle(logicalWidth/2, groundY + 25, logicalWidth*3, 50, { isStatic: true, friction: groundFriction });
    World.add(world, ground);

    if (currentScenario === 'trolley') {
        engine.gravity.scale = 0.001; // default
        const mass = Math.max(5, Math.min(500, parseFloat(trolleyMassInput.value) || 50));
        activeBodies.trolley = Bodies.rectangle(logicalWidth/2 - 100, groundY - 50, 100, 80, { mass: mass, friction: 0.05, restitution: 0.2, inertia: Infinity });
        World.add(world, activeBodies.trolley);
        activeBodies.simVelocity = 0;
    } 
    else if (currentScenario === 'rocket') {
        engine.gravity.y = 1; // Earth gravity
        engine.gravity.scale = 0.01; // 10x visual scale for rocket to accelerate nicely
        // Match visual dimensions of the SpaceX rocket perfectly (width 30, height 145)
        activeBodies.rocket = Bodies.rectangle(logicalWidth/2, groundY - 72.5, 30, 145, { mass: 100, frictionAir: 0.002, friction: 0.5, restitution: 0 });
        activeBodies.moon = Bodies.circle(logicalWidth/2, -2500, 40, { isStatic: true, friction: 0.8 });
        World.add(world, [activeBodies.rocket, activeBodies.moon]);
        activeBodies.isThrusting = false;
        activeBodies.launchInitiated = false;
        activeBodies.rocketLaunchTime = 0;
        activeBodies.simVelocity = 0;
    }
    else if (currentScenario === 'braking') {
        engine.gravity.scale = 0.001; // default
        
        const vehicleType = brakingVehicleSelect ? brakingVehicleSelect.value : 'family';
        let carMass = 1200;
        let carH = 60;
        let boxYOffset = -75;
        if (vehicleType === 'sports') {
            carMass = 1500;
            carH = 50;
            boxYOffset = -65;
        } else if (vehicleType === 'truck') {
            carMass = 8000;
            carH = 80;
            boxYOffset = -95;
        }
        
        // Restore car friction to 0.1 so box has friction with the car top, ground has 0 friction, and inertia to Infinity to prevent tipping over
        activeBodies.car = Bodies.rectangle(logicalWidth/2 - 150, groundY - carH/2, 140, carH, { mass: carMass, friction: 0.1, frictionAir: 0, inertia: Infinity });
        activeBodies.box = Bodies.rectangle(logicalWidth/2 - 150, groundY + boxYOffset, 40, 30, { mass: 50, friction: 0.3, frictionAir: 0 });
        activeBodies.vehicleType = vehicleType;
        
        let startSpeed = parseFloat(carSpeed.value);
        if (isNaN(startSpeed)) startSpeed = 15;
        if (startSpeed > 40) { startSpeed = 40; carSpeed.value = 40; }
        else if (startSpeed < 0) { startSpeed = 0; carSpeed.value = 0; }
        
        // Need to scale speed to Matter.js units (~0.5 of actual meter/s)
        Body.setVelocity(activeBodies.car, { x: startSpeed * 0.5, y: 0 });
        Body.setVelocity(activeBodies.box, { x: startSpeed * 0.5, y: 0 });
        
        World.add(world, [activeBodies.car, activeBodies.box]);
        activeBodies.braking = false;
        activeBodies.hasBraked = false;
        activeBodies.elapsedTimeBraking = 0;
    }
    else if (currentScenario === 'race') {
        engine.gravity.y = 0; // Top-Down view (no vertical gravity)
        engine.gravity.scale = 0.001; // default
        
        const tMass = Math.max(1000, Math.min(20000, parseFloat(document.getElementById('truckMass')?.value) || 5000));
        activeBodies.car = Bodies.rectangle(logicalWidth/4 - 100, logicalHeight/2 + 50, 80, 30, { mass: 1000, frictionAir: 0.05, restitution: 0, inertia: Infinity });
        activeBodies.truck = Bodies.rectangle(logicalWidth/4 - 100, logicalHeight/2 - 50, 120, 40, { mass: tMass, frictionAir: 0.05, restitution: 0, inertia: Infinity });
        World.add(world, [activeBodies.car, activeBodies.truck]);
        activeBodies.car.simVelocity = 0;
        activeBodies.truck.simVelocity = 0;
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
    
    const groundY = logicalHeight - 50;

    if (currentScenario === 'trolley' && activeBodies.trolley) {
        const force = Math.max(0, Math.min(1000, parseFloat(trolleyForce.value) || 0));
        Body.applyForce(activeBodies.trolley, activeBodies.trolley.position, { x: force * 0.0001, y: 0 });
        
        const a = force / activeBodies.trolley.mass;
        activeBodies.simVelocity = (activeBodies.simVelocity || 0) + a * dt;
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = a.toFixed(2);
        velValue.textContent = activeBodies.simVelocity.toFixed(2);
        updateStatusMessage(force > 0 ? `Troli dipercepat (a = ${a.toFixed(2)} m/s²)` : "Troli Diam");
    }
    else if (currentScenario === 'rocket' && activeBodies.rocket) {
        const thrust = activeBodies.isThrusting ? Math.max(0, Math.min(20000, parseFloat(rocketThrust.value) || 0)) : 0;
        if (thrust > 0) {
            const forceScale = 1.0 / 980;
            Body.applyForce(activeBodies.rocket, activeBodies.rocket.position, { x: 0, y: -thrust * forceScale });
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
        const weight = activeBodies.rocket.mass * 9.8; 
        
        let netForce = thrust - weight;
        if (isOnGround && netForce <= 0) netForce = 0;
        
        let a = netForce / activeBodies.rocket.mass;
        
        if (isOnGround && netForce <= 0) {
            activeBodies.simVelocity = 0;
        } else {
            activeBodies.simVelocity = (activeBodies.simVelocity || 0) + a * dt;
        }
        
        netForceValue.textContent = Math.abs(netForce).toFixed(1);
        accelValue.textContent = a.toFixed(2);
        velValue.textContent = activeBodies.simVelocity.toFixed(2);
        if (activeBodies.launchInitiated && isOnGround) activeBodies.rocketLaunchTime += dt;
        
        let msg = "";
        if (a > 0) msg = "🚀 Roket Meluncur Naik!";
        else if (isOnGround) msg = activeBodies.launchInitiated ? "⏳ Mesin menyala, gaya dorong tidak cukup" : "⏳ Roket di Landasan";
        else msg = "💥 Roket Jatuh";
        updateStatusMessage(msg);
    }
    else if (currentScenario === 'braking' && activeBodies.car) {
        let startSpeed = parseFloat(carSpeed.value);
        if (isNaN(startSpeed)) startSpeed = 15;
        if (startSpeed > 40) startSpeed = 40;
        else if (startSpeed < 0) startSpeed = 0;
        
        if (activeBodies.braking) {
            Body.applyForce(activeBodies.car, activeBodies.car.position, { x: -0.00015 * activeBodies.car.mass, y: 0 });
            if (activeBodies.car.velocity.x <= 0.05) {
                Body.setVelocity(activeBodies.car, {x:0, y:0});
                activeBodies.braking = false;
            }
            activeBodies.elapsedTimeBraking = (activeBodies.elapsedTimeBraking || 0) + dt;
            let vBox = Math.max(0, startSpeed - 2.94 * activeBodies.elapsedTimeBraking); 
            velValue.textContent = vBox.toFixed(2);
        } else {
            velValue.textContent = startSpeed.toFixed(2);
        }
        
        netForceValue.textContent = "-";
        accelValue.textContent = "-";
        updateStatusMessage(activeBodies.braking ? "Mobil Direm! Kotak terdorong (Inersia)." : "Mobil Melaju Konstan");
    }
    else if (currentScenario === 'race' && activeBodies.car) {
        const force = Math.max(0, Math.min(5000, parseFloat(raceForce.value) || 0));
        Body.applyForce(activeBodies.car, activeBodies.car.position, { x: force * 0.00005, y: 0 });
        Body.applyForce(activeBodies.truck, activeBodies.truck.position, { x: force * 0.00005, y: 0 });
        
        const a_car = force / activeBodies.car.mass;
        const a_truck = force / activeBodies.truck.mass;
        activeBodies.car.simVelocity = (activeBodies.car.simVelocity || 0) + a_car * dt;
        activeBodies.truck.simVelocity = (activeBodies.truck.simVelocity || 0) + a_truck * dt;
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = a_car.toFixed(2);
        velValue.textContent = activeBodies.car.simVelocity.toFixed(2);
        
        updateStatusMessage(`a(mobil)=${a_car.toFixed(2)} vs a(truk)=${a_truck.toFixed(2)}`);
    }
    // --- BOUNDARY CHECKS (Auto-Stop) ---
    const checkStop = (body, condition, msg) => {
        if (body && condition) {
            isPlaying = false;
            btnPlayPause.innerHTML = '▶ Mulai Simulasi';
            updateStatusMessage(msg);
            Body.setVelocity(body, {x: 0, y: 0});
            toggleInputs(false);
        }
    };

    if (currentScenario === 'trolley') {
        // Troli bisa jalan selamanya tanpa garis finish!
    } else if (currentScenario === 'race') {
        checkStop(activeBodies.car, activeBodies.car.position.x > 2000, "🏁 Balapan Selesai: Mobil Sport menang!");
        if (isPlaying) checkStop(activeBodies.truck, activeBodies.truck.position.x > 2000, "🏁 Balapan Selesai: Truk menang!");
    } else if (currentScenario === 'rocket') {
        const moonBody = activeBodies.moon;
        const r = activeBodies.rocket;
        if (moonBody && r) {
            let dist = Math.hypot(r.position.x - moonBody.position.x, r.position.y - moonBody.position.y);
            if (dist < 118) {
                if (activeBodies.simVelocity <= 8.0) {
                    checkStop(r, true, "🌕 Pendaratan Sukses! Selamat, roket telah mendarat dengan aman di Bulan!");
                } else {
                    for (let i = 0; i < 40; i++) {
                        particles.push({
                            x: r.position.x + (Math.random() * 20 - 10),
                            y: r.position.y - 50 + (Math.random() * 60 - 30),
                            vx: (Math.random() * 12 - 6),
                            vy: (Math.random() * 12 - 6),
                            life: 1.0,
                            color: Math.random() > 0.3 ? '#f97316' : '#ef4444'
                        });
                    }
                    checkStop(r, true, "💥 Pendaratan Gagal: Roket menabrak Bulan terlalu kencang! Ulangi simulasi.");
                }
            }
        }
        
        // Logika validasi roket gagal meluncur jika di landasan > 3 detik setelah dinyalakan dan a <= 0
        const thrust = activeBodies.isThrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
        const weight = activeBodies.rocket.mass * 9.8;
        if (activeBodies.rocketLaunchTime > 3 && thrust <= weight) {
            checkStop(activeBodies.rocket, true, "💥 Simulasi Selesai: Roket gagal meluncur (Gaya Dorong < Berat)");
        }
    } else if (currentScenario === 'braking') {
        checkStop(activeBodies.car, activeBodies.car.position.x > 3000, "🏁 Mobil melaju terlalu jauh! Ulangi simulasi dan tekan tombol REM MENDADAK!");
    }
    
    // --- CAMERA TARGET UPDATE ---
    if (currentScenario === 'trolley' && activeBodies.trolley) {
        targetCameraX = activeBodies.trolley.position.x - 200;
        targetCameraY = 0;
    } else if (currentScenario === 'rocket' && activeBodies.rocket) {
        targetCameraX = 0;
        const threshold = logicalHeight - 250;
        if (activeBodies.rocket.position.y < threshold) {
            targetCameraY = activeBodies.rocket.position.y - threshold;
        } else {
            targetCameraY = 0;
        }
    } else if (currentScenario === 'race' && activeBodies.car && activeBodies.truck) {
        const leaderX = Math.max(activeBodies.car.position.x, activeBodies.truck.position.x);
        targetCameraX = leaderX - 200;
        targetCameraY = 0;
    } else if (currentScenario === 'braking' && activeBodies.car) {
        if (!activeBodies.braking) {
            targetCameraX = activeBodies.car.position.x - 200;
        }
        targetCameraY = 0;
    }
    
    timeValue.textContent = elapsedTime.toFixed(2);
}

function drawScene() {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const groundY = logicalHeight - 50;
    
    // 1. SCREEN-SPACE BACKGROUND (Solid Colors & Gradients)
    if (currentScenario === 'trolley') {
        // Wall solid background
        ctx.fillStyle = '#fef3c7'; // Warm Yellowish White Wall
        ctx.fillRect(0, 0, logicalWidth, groundY);
        // Floor solid background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, groundY, logicalWidth, 50);
    } else if (currentScenario === 'race') {
        // Green Grass
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    } else {
        // Sky Gradient transition to Space based on cameraY
        // spaceFactor is 1.0 when roket ascends ~1800px
        const spaceFactor = Math.min(1, Math.max(0, -cameraY / 1800));
        
        let skyGradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
        
        // Day gradient colors (bae6fd -> f0f9ff)
        // Space gradient color (020617 -> 0f172a)
        let r1 = Math.round(186 + (2 - 186) * spaceFactor);
        let g1 = Math.round(230 + (6 - 230) * spaceFactor);
        let b1 = Math.round(253 + (23 - 253) * spaceFactor);
        
        let r2 = Math.round(240 + (15 - 240) * spaceFactor);
        let g2 = Math.round(249 + (23 - 249) * spaceFactor);
        let b2 = Math.round(255 + (42 - 255) * spaceFactor);
        
        skyGradient.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
        skyGradient.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        
        // Draw Stars if high enough
        if (spaceFactor > 0.1) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (spaceFactor - 0.1) * 1.25);
            ctx.fillStyle = '#ffffff';
            stars.forEach(s => {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.restore();
        }
    }
    
    // 2. WORLD-SPACE DRAWINGS (Translated by Camera)
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    
    // Draw Moon in world-space for Rocket Mode
    if (currentScenario === 'rocket') {
        const moonX = logicalWidth / 2;
        const moonY = -2500;
        
        // Moon Glow
        let glow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 80);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
        glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(moonX, moonY, 80, 0, Math.PI*2); ctx.fill();
        
        // Moon Body
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(moonX, moonY, 40, 0, Math.PI*2); ctx.fill();
        
        // Craters
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(moonX - 15, moonY - 10, 7, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX + 10, moonY + 15, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX - 5, moonY + 20, 4, 0, Math.PI*2); ctx.fill();
    }
    
    if (currentScenario === 'trolley') {
        // Draw repeating baseboard
        ctx.fillStyle = '#d97706'; // Wood color
        const startX = Math.floor(cameraX / 100) * 100 - 100;
        ctx.fillRect(startX, groundY - 15, logicalWidth + 200, 15);
        
        // Draw repeating Floor Tile lines
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
        for (let i = startX; i < startX + logicalWidth + 200; i += 100) {
            ctx.beginPath(); ctx.moveTo(i, groundY); ctx.lineTo(i - 20, logicalHeight); ctx.stroke();
        }
        
        // Draw Trolley
        if (activeBodies.trolley) {
            const t = activeBodies.trolley;
            const mass = parseFloat(trolleyMassInput.value) || 50;
            drawTrolley(t.position.x, t.position.y, t.angle, mass);
            
            const force = parseFloat(trolleyForce.value) || 0;
            if (force > 0 && isPlaying) {
                drawPersonPushing(t.position.x - 100, groundY);
                // Panah diposisikan di atas kepala orang pendorong (yaitu y = groundY - 110)
                drawArrow(t.position.x - 100, groundY - 110, force * 0.5, 'positive', '#ef4444', `Dorong: ${force}N`);
            }
        }
    }
    else if (currentScenario === 'race') {
        const trackY = logicalHeight / 2;
        const startX = Math.floor(cameraX / 40) * 40 - 40;
        const widthToDraw = logicalWidth + 80;
        
        // Asphalt
        ctx.fillStyle = '#334155';
        ctx.fillRect(startX, trackY - 100, widthToDraw, 200);
        
        // Track borders (white/red stripes)
        ctx.lineWidth = 6;
        for (let b = startX; b < startX + widthToDraw; b += 40) {
            ctx.strokeStyle = (b % 80 === 0) ? '#ef4444' : '#ffffff';
            ctx.beginPath(); ctx.moveTo(b, trackY - 97); ctx.lineTo(b + 40, trackY - 97); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(b, trackY + 97); ctx.lineTo(b + 40, trackY + 97); ctx.stroke();
        }
        
        // Center dashed line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 20]);
        ctx.beginPath(); ctx.moveTo(startX, trackY); ctx.lineTo(startX + widthToDraw, trackY); ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw Checkered Finish Line at world coordinates x = 2000
        const finishX = 2000;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(finishX, trackY - 100, 30, 200);
        ctx.fillStyle = '#000000';
        for(let row=0; row<10; row++) {
            for(let col=0; col<2; col++) {
                if((row+col)%2 === 0) {
                    ctx.fillRect(finishX + col*15, trackY - 100 + row*20, 15, 20);
                }
            }
        }
        
        // Text "FINISH"
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("FINISH", finishX + 15, trackY - 110);
        
        if (activeBodies.car && activeBodies.truck) {
            drawSportsCar(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
            drawTruckObj(activeBodies.truck.position.x, activeBodies.truck.position.y, activeBodies.truck.angle);
        }
    }
    else if (currentScenario === 'rocket' && activeBodies.rocket) {
        // Draw Ground (Grass + Asphalt Line) in world-space
        ctx.fillStyle = '#4ade80'; // Grass
        ctx.fillRect(-1000, groundY, 3000, 100);
        ctx.fillStyle = '#94a3b8'; // Pad base
        ctx.fillRect(-1000, groundY, 3000, 12);
        
        // Draw Launch Pad Tower (visual decoration)
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 4;
        ctx.beginPath();
        // Left frame
        ctx.moveTo(logicalWidth/2 - 60, groundY); ctx.lineTo(logicalWidth/2 - 60, groundY - 300);
        // Right frame
        ctx.moveTo(logicalWidth/2 - 80, groundY); ctx.lineTo(logicalWidth/2 - 80, groundY - 300);
        // Crossbeams
        for (let h = groundY; h > groundY - 300; h -= 30) {
            ctx.moveTo(logicalWidth/2 - 80, h); ctx.lineTo(logicalWidth/2 - 60, h);
            ctx.moveTo(logicalWidth/2 - 80, h); ctx.lineTo(logicalWidth/2 - 60, h - 30);
        }
        ctx.stroke();
        
        // Draw Rocket
        if (activeBodies.rocket) {
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
    }
    else if (currentScenario === 'braking' && activeBodies.car) {
        const startX = Math.floor(cameraX / 100) * 100 - 100;
        
        // Draw Ground (Grass + Asphalt Line) in world-space
        ctx.fillStyle = '#4ade80'; // Grass
        ctx.fillRect(startX, groundY, logicalWidth + 200, 100);
        ctx.fillStyle = '#94a3b8'; // Asphalt
        ctx.fillRect(startX, groundY, logicalWidth + 200, 12);
        
        // Draw road marks
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        for (let i = startX; i < startX + logicalWidth + 200; i += 150) {
            ctx.beginPath(); ctx.moveTo(i, groundY + 6); ctx.lineTo(i + 40, groundY + 6); ctx.stroke();
        }
        
        if (activeBodies.car && activeBodies.box) {
            const type = activeBodies.vehicleType || 'family';
            if (type === 'sports') {
                drawSportsCar(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
            } else if (type === 'truck') {
                drawTruckObj(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
            } else {
                drawCarObj(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
            }
            ctx.save();
            ctx.translate(activeBodies.box.position.x, activeBodies.box.position.y);
            ctx.rotate(activeBodies.box.angle);
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath(); ctx.roundRect(-20, -15, 40, 30, 4); ctx.fill();
            ctx.restore();
            
            if (activeBodies.hasBraked) {
                let mBox = 50; 
                let aCar = 5; 
                let fInersia = mBox * aCar; 
                let fGesek = 0.3 * mBox * 9.8; 
                
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
                ctx.textBaseline = 'alphabetic'; 
            }
        }
    }
    
    // Draw particles translated by camera
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
    
    ctx.restore();
}

function simulationLoop(timestamp) {
    if (lastTime === 0) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Always update physics if playing or dragging
    if (isPlaying || mouseConstraint.mouse.button !== -1) {
        updatePhysics(Math.min(dt * simSpeed, 0.1));
    }
    
    // Smooth camera transition (lerp)
    const lerpFactor = currentScenario === 'rocket' ? 1.0 : 0.08;
    cameraX += (targetCameraX - cameraX) * lerpFactor;
    cameraY += (targetCameraY - cameraY) * lerpFactor;
    
    if (mouseConstraint && mouseConstraint.mouse) {
        Matter.Mouse.setOffset(mouseConstraint.mouse, { x: cameraX, y: cameraY });
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
    cameraX = 0;
    cameraY = 0;
    targetCameraX = 0;
    targetCameraY = 0;
    if (mouseConstraint && mouseConstraint.mouse) {
        Matter.Mouse.setOffset(mouseConstraint.mouse, { x: 0, y: 0 });
    }
    buildScenario();
    
    velValue.textContent = '0.00';
    netForceValue.textContent = '0';
    accelValue.textContent = '0.00';
    
    updateDashboardVisibility(currentScenario);
    
    updateStatusMessage("Siap");
    if (currentScenario === 'rocket') btnLaunch.textContent = "🚀 LUNCURKAN!";
    
    toggleInputs(false);
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
    toggleInputs(isPlaying);
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
    
    updateDashboardVisibility(sc);
    
    resetSim();
});

function updateDashboardVisibility(scenario) {
    const overlayStats = document.getElementById('overlayStats');
    if (!overlayStats) return;
    
    overlayStats.style.display = 'flex';
    
    if (statForce) statForce.style.display = '';
    if (statAccel) statAccel.style.display = '';
    if (statVel) statVel.style.display = '';
    if (statTime) statTime.style.display = '';
    
    if (scenario === 'race') {
        if (statAccel) statAccel.style.display = 'none';
        if (statVel) statVel.style.display = 'none';
    } else if (scenario === 'braking') {
        if (statForce) statForce.style.display = 'none';
        if (statAccel) statAccel.style.display = 'none';
    }
}

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

function toggleInputs(disabled) {
    const inputs = [
        scenarioSelect, trolleyMassInput, trolleyForce,
        rocketThrust, carSpeed, raceForce, brakingVehicleSelect,
        document.getElementById('truckMass')
    ];
    inputs.forEach(input => {
        if (input) input.disabled = disabled;
    });
}

const truckMass = document.getElementById('truckMass');
[trolleyMassInput, trolleyForce, rocketThrust, carSpeed, raceForce, truckMass, brakingVehicleSelect].forEach(el => {
    if (el) {
        el.addEventListener('input', () => { if (!isPlaying) resetSim(); });
    }
});

// Clean and validate inputs on change (blur)
[trolleyMassInput, trolleyForce, rocketThrust, carSpeed, raceForce, truckMass].forEach(el => {
    if (el) {
        el.addEventListener('change', () => {
            let val = parseFloat(el.value);
            if (isNaN(val)) {
                if (el === trolleyMassInput) el.value = 50;
                else if (el === trolleyForce) el.value = 100;
                else if (el === rocketThrust) el.value = 1000;
                else if (el === carSpeed) el.value = 15;
                else if (el === raceForce) el.value = 1000;
                else if (el === truckMass) el.value = 5000;
                val = parseFloat(el.value);
            }
            
            if (el === trolleyMassInput) {
                el.value = Math.max(5, Math.min(500, val));
            } else if (el === trolleyForce) {
                el.value = Math.max(0, Math.min(1000, val));
            } else if (el === rocketThrust) {
                el.value = Math.max(0, Math.min(20000, val));
            } else if (el === carSpeed) {
                el.value = Math.max(0, Math.min(40, val));
            } else if (el === raceForce) {
                el.value = Math.max(0, Math.min(5000, val));
            } else if (el === truckMass) {
                el.value = Math.max(1000, Math.min(20000, val));
            }
            if (!isPlaying) resetSim();
        });
    }
});

// Speed Controls
const btnSpeed1 = document.getElementById('btnSpeed1');
const btnSpeed05 = document.getElementById('btnSpeed05');
const btnSpeed025 = document.getElementById('btnSpeed025');

function setSpeed(speed, activeBtn) {
    simSpeed = speed;
    [btnSpeed1, btnSpeed05, btnSpeed025].forEach(btn => {
        if(btn) {
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }
    });
    if(activeBtn) {
        activeBtn.style.backgroundColor = '#3b82f6';
        activeBtn.style.color = '#ffffff';
    }
}

if(btnSpeed1) btnSpeed1.addEventListener('click', () => setSpeed(1.0, btnSpeed1));
if(btnSpeed05) btnSpeed05.addEventListener('click', () => setSpeed(0.5, btnSpeed05));
if(btnSpeed025) btnSpeed025.addEventListener('click', () => setSpeed(0.25, btnSpeed025));

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
    if(btnSpeed1) setSpeed(1.0, btnSpeed1); // set initial speed style
    scenarioSelect.dispatchEvent(new Event('change'));
}, 100);
