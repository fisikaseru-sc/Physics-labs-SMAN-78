const fs = require('fs');

let isPlaying = true;
let currentScenario = "rocket";
let rocketState = { y: 0, v: 0, reachedTarget: false };
let elapsedTime = 0;
let lastTime = 0;
const targetAltitude = 384400000;
let rocketThrustValue = "70";
let rocketMassValue = "5000";

function updatePhysics(dt) {
    if (!isPlaying || dt <= 0) return;
    const scaledDt = dt * 1.0;

    const mTon = parseFloat(rocketMassValue) || 5000;
    const m = mTon * 1000;
    const F_MN = parseFloat(rocketThrustValue) || 70;
    const F = F_MN * 1000000;
    const g = 9.8;
    const netF = F - m * g;
    const a = netF / m; 
    
    let timeWarp = 1500;
    if (a > 0) {
      const realEstTime = Math.sqrt((2 * targetAltitude) / a);
      timeWarp = Math.min(100000, Math.max(1500, realEstTime / 8));
    }
    const scaledDtRocket = scaledDt * timeWarp;

    if (F > m * g) {
      rocketState.v += a * scaledDtRocket;
      if (rocketState.v < 0) rocketState.v = 0;
    } else {
      rocketState.v += a * scaledDtRocket;
    }
    
    rocketState.y += rocketState.v * scaledDtRocket;
    if (rocketState.y <= 0) {
      rocketState.y = 0;
      rocketState.v = 0;
    }

    if (rocketState.y >= targetAltitude + 5000000) {
      isPlaying = false;
    }
    elapsedTime += scaledDtRocket;
}

// Run simulation
for (let frame=1; frame<=300; frame++) {
    const dt = 0.016; // 60 FPS
    
    // At frame 120 (2 seconds), user changes MN to 60
    if (frame === 120) {
        rocketThrustValue = "60";
        console.log(`\n--- USER CHANGES THRUST TO 60 MN at frame 120 ---`);
    }

    // At frame 240 (4 seconds), user changes MN to 40 (less than weight)
    if (frame === 240) {
        rocketThrustValue = "40";
        console.log(`\n--- USER CHANGES THRUST TO 40 MN at frame 240 ---`);
    }

    updatePhysics(dt);
    
    if (frame % 30 === 0) {
        const visualScale = 10000 / targetAltitude;
        console.log(`Frame ${frame} | a=${( (parseFloat(rocketThrustValue)*1000000 - 49000000) / 5000000).toFixed(2)} | v=${rocketState.v.toFixed(0)} m/s | y=${rocketState.y.toFixed(0)} m | visualY=${(rocketState.y * visualScale).toFixed(1)} px | isPlaying=${isPlaying}`);
    }
}
