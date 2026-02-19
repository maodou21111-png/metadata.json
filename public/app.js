const registerBtn = document.getElementById('registerBtn');
const loadBtn = document.getElementById('loadBtn');
const addAttemptsBtn = document.getElementById('addAttemptsBtn');
const nameInput = document.getElementById('nameInput');
const codeInput = document.getElementById('codeInput');
const attemptsInput = document.getElementById('attemptsInput');
const userInfo = document.getElementById('userInfo');
const statusEl = document.getElementById('status');
const recordsEl = document.getElementById('records');
const playerBtn = document.getElementById('player');
const ballEl = document.getElementById('ball');
const goalGrid = document.getElementById('goalGrid');

let currentUser = null;
let powerAction = 'tap';

const rewardTemplate = [
  ...Array(8).fill(5000),
  ...Array(3).fill(10000),
  ...Array(2).fill(50000),
  100000,
];

function shuffle(arr) {
  const cloned = [...arr];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function renderGoal(hitReward = null) {
  const list = shuffle(rewardTemplate);
  goalGrid.innerHTML = '';
  list.forEach((v) => {
    const div = document.createElement('div');
    div.className = `reward-ball ${hitReward === v ? 'reward-hit' : ''}`;
    div.textContent = v;
    goalGrid.appendChild(div);
  });
}

function showStatus(text) {
  statusEl.textContent = text;
}

function renderUser(data) {
  currentUser = data.user;
  codeInput.value = currentUser.verificationCode;
  userInfo.textContent = `用户: ${currentUser.name} | 验证码: ${currentUser.verificationCode} | 次数: ${currentUser.attemptsLeft} | 累计奖励: ${currentUser.totalReward}`;

  const shots = data.recentShots || [];
  recordsEl.innerHTML = '';
  shots.forEach((s) => {
    const li = document.createElement('li');
    li.textContent = `${new Date(s.createdAt).toLocaleString()} - 力度:${s.power} - 奖励:${s.reward}`;
    recordsEl.appendChild(li);
  });
}

async function callApi(url, method = 'GET', body = null) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '请求失败');
  return json;
}

registerBtn.addEventListener('click', async () => {
  try {
    const data = await callApi('/api/register', 'POST', { name: nameInput.value });
    showStatus(`注册成功，验证码: ${data.verificationCode}`);
    const userData = await callApi(`/api/user?verificationCode=${data.verificationCode}`);
    renderUser(userData);
    renderGoal();
  } catch (e) {
    showStatus(e.message);
  }
});

loadBtn.addEventListener('click', async () => {
  try {
    const data = await callApi(`/api/user?verificationCode=${codeInput.value}`);
    renderUser(data);
    showStatus('用户已加载');
    renderGoal();
  } catch (e) {
    showStatus(e.message);
  }
});

addAttemptsBtn.addEventListener('click', async () => {
  try {
    await callApi('/api/admin/add-attempts', 'POST', {
      verificationCode: codeInput.value,
      attempts: Number(attemptsInput.value),
    });
    const data = await callApi(`/api/user?verificationCode=${codeInput.value}`);
    renderUser(data);
    showStatus('次数添加成功');
  } catch (e) {
    showStatus(e.message);
  }
});

playerBtn.addEventListener('click', async () => {
  if (!currentUser) return showStatus('请先注册或加载用户');
  try {
    const result = await callApi('/api/shoot', 'POST', {
      verificationCode: currentUser.verificationCode,
      powerAction,
    });

    const x = Math.floor(Math.random() * 240) - 120;
    const y = -260 - Math.floor(Math.random() * 100);
    ballEl.classList.remove('hidden');
    ballEl.style.transform = `translate(${x}px, ${y}px)`;

    setTimeout(() => {
      ballEl.classList.add('hidden');
      ballEl.style.transform = 'translate(0, 0)';
      renderGoal(result.shot.reward);
    }, 850);

    const data = await callApi(`/api/user?verificationCode=${currentUser.verificationCode}`);
    renderUser(data);
    showStatus(`命中奖励球，获得 ${result.shot.reward}`);
  } catch (e) {
    showStatus(e.message);
  }
});

let timer = null;
playerBtn.addEventListener('mousedown', () => {
  timer = setTimeout(() => {
    powerAction = 'longpress';
    showStatus('已切换为长按增力度');
  }, 350);
});

playerBtn.addEventListener('mouseup', () => {
  clearTimeout(timer);
  if (powerAction !== 'longpress') {
    powerAction = 'tap';
    showStatus('轻触：本次力度降低');
  }
  setTimeout(() => {
    powerAction = 'tap';
  }, 50);
});

renderGoal();
