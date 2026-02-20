const state = {
  coins: 0,
  bestDistance: 0,
  currentDistance: 0,
  level: 1,
  exp: 0,
  powerLv: 1,
  bounceLv: 1,
  offlineLv: 1,
};

const ui = {
  coinText: document.getElementById('coinText'),
  currentDistance: document.getElementById('currentDistance'),
  bestDistance: document.getElementById('bestDistance'),
  levelText: document.getElementById('levelText'),
  progressBar: document.getElementById('progressBar'),
  ball: document.getElementById('ball'),
  toast: document.getElementById('toast'),
  kickBtn: document.getElementById('kickBtn'),
  powerBtn: document.getElementById('powerBtn'),
  bounceBtn: document.getElementById('bounceBtn'),
  offlineBtn: document.getElementById('offlineBtn'),
  powerLv: document.getElementById('powerLv'),
  bounceLv: document.getElementById('bounceLv'),
  offlineLv: document.getElementById('offlineLv'),
  powerCost: document.getElementById('powerCost'),
  bounceCost: document.getElementById('bounceCost'),
  offlineCost: document.getElementById('offlineCost'),
};

function cost(base, lv) {
  return Math.floor(base * (1 + lv * 0.7));
}

function syncUI() {
  ui.coinText.textContent = `$${state.coins}`;
  ui.currentDistance.textContent = state.currentDistance;
  ui.bestDistance.textContent = state.bestDistance;
  ui.levelText.textContent = `Level ${state.level}`;
  ui.progressBar.style.width = `${Math.min(100, state.exp)}%`;
  ui.powerLv.textContent = state.powerLv;
  ui.bounceLv.textContent = state.bounceLv;
  ui.offlineLv.textContent = state.offlineLv;
  ui.powerCost.textContent = cost(120, state.powerLv);
  ui.bounceCost.textContent = cost(180, state.bounceLv);
  ui.offlineCost.textContent = cost(240, state.offlineLv);
}

function gainCoins(amount) {
  state.coins += amount;
  ui.toast.textContent = `获得${amount}金币!`;
  ui.toast.classList.remove('hidden');
  setTimeout(() => ui.toast.classList.add('hidden'), 900);
}

function doKick() {
  const rng = 0.82 + Math.random() * 0.5;
  const base = 10 + state.powerLv * 14 + state.bounceLv * 11;
  const distance = Math.floor(base * rng);
  state.currentDistance = distance;
  state.bestDistance = Math.max(state.bestDistance, distance);

  const reward = Math.floor(distance * (1.2 + state.offlineLv * 0.15));
  gainCoins(reward);

  state.exp += 15;
  if (state.exp >= 100) {
    state.exp -= 100;
    state.level += 1;
    gainCoins(state.level * 60);
  }

  const x = 130 + Math.random() * 150;
  const y = -180 - Math.random() * 90;
  ui.ball.style.transform = `translate(${x}px, ${y}px) scale(0.55)`;
  setTimeout(() => {
    ui.ball.style.transform = 'translate(0, 0) scale(1)';
  }, 850);

  syncUI();
}

function tryUpgrade(type) {
  if (type === 'power') {
    const p = cost(120, state.powerLv);
    if (state.coins < p) return;
    state.coins -= p;
    state.powerLv += 1;
  }
  if (type === 'bounce') {
    const p = cost(180, state.bounceLv);
    if (state.coins < p) return;
    state.coins -= p;
    state.bounceLv += 1;
  }
  if (type === 'offline') {
    const p = cost(240, state.offlineLv);
    if (state.coins < p) return;
    state.coins -= p;
    state.offlineLv += 1;
  }
  syncUI();
}

ui.kickBtn.addEventListener('click', doKick);
ui.powerBtn.addEventListener('click', () => tryUpgrade('power'));
ui.bounceBtn.addEventListener('click', () => tryUpgrade('bounce'));
ui.offlineBtn.addEventListener('click', () => tryUpgrade('offline'));

syncUI();
