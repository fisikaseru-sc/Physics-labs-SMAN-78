const fs = require('fs');
let code = fs.readFileSync('Topics/Dinamika-Gerak/virtual-lab/scenes/hukum-newton-2/app.js', 'utf8');

const speedBtnLogic = `
const speedBtns = document.querySelectorAll(".speed-btn");
speedBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    speedBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (btn.id === "btnSpeed1" || btn.textContent.includes("1x") || btn.textContent.includes("1×")) simSpeed = 1.0;
    else if (btn.id === "btnSpeed05" || btn.textContent.includes("0.5")) simSpeed = 0.5;
    else if (btn.id === "btnSpeed025" || btn.textContent.includes("0.25")) simSpeed = 0.25;
  });
});
`;

if (!code.includes('speedBtns.forEach')) {
    code = code.replace('// ===== EVENT LISTENERS =====', '// ===== EVENT LISTENERS =====\n' + speedBtnLogic);
    fs.writeFileSync('Topics/Dinamika-Gerak/virtual-lab/scenes/hukum-newton-2/app.js', code);
    console.log("Added speed buttons logic.");
} else {
    console.log("Speed buttons logic already exists.");
}
