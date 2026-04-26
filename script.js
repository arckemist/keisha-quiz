/* ── script.js ── */
let questions = [];
let current = 0;
let score = 0;
let answers = {};
let ui = {};        // ui_strings loaded with quiz data
let metadata = {};  // metadata loaded with quiz data

async function loadQuiz() {
  const landingTitle = document.getElementById('quiz-title-display');
  const landingSub   = document.getElementById('landing-sub');
  landingTitle.textContent = ui.loading || 'Loading quiz...';

  try {
    const res = await fetch('quiz_data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Load metadata + ui_strings
    metadata = data.metadata || {};
    ui       = data.ui_strings || {};

    document.getElementById('quiz-title').textContent = data.title;
    landingTitle.textContent = data.title;
    landingSub.textContent   = `${data.questions.length} Questions · 100 Points · Pass: 85%`;
    questions = data.questions;

    // Wire up localized labels
    const startBtn = document.getElementById('start-btn');
    if (startBtn && ui.start_button) startBtn.textContent = ui.start_button;

    document.getElementById('landing').style.display = 'flex';
    document.getElementById('quiz-area').style.display    = 'none';
    document.getElementById('review-area').style.display  = 'none';
    document.getElementById('quiz-error').style.display   = 'none';
  } catch (err) {
    console.error('loadQuiz failed:', err);
    const landing = document.getElementById('landing');
    landing.style.display = 'flex';
    document.getElementById('quiz-area').style.display    = 'none';
    const errEl = document.getElementById('quiz-error');
    errEl.textContent = ui.error_load_failed || 'Failed to load quiz. Please refresh the page.';
    errEl.style.display = 'block';
  }
}

function showLanding() {
  document.getElementById('landing').style.display    = 'flex';
  document.getElementById('quiz-area').style.display   = 'none';
  document.getElementById('review-area').style.display = 'none';
}

function startQuiz() {
  current = 0;
  score = 0;
  answers = {};
  document.getElementById('landing').style.display    = 'none';
  document.getElementById('quiz-area').style.display   = 'block';
  document.getElementById('review-area').style.display = 'none';
  renderQuestion();
}

function renderQuestion() {
  const q     = questions[current];
  const total = questions.length;
  const dispN = current + 1;   // sequential display number (1–55)

  // Progress
  const pct = (current / total) * 100;
  document.getElementById('progress-bar').style.width = `${pct}%`;
  const fmt = ui.progress_format || 'Question {n} of {total}';
  document.getElementById('progress-text').textContent =
    fmt.replace('{n}', dispN).replace('{total}', total);

  // Question text
  document.getElementById('question-text').textContent = q.text;

  // Image
  const imgEl = document.getElementById('question-image');
  if (q.image) {
    imgEl.src = q.image;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  // Answer area
  const answerArea = document.getElementById('answer-area');
  answerArea.innerHTML = '';

  if (q.type === 'mc') {
    ['A','B','C','D'].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = `${opt}. ${q.options[opt]}`;
      btn.onclick = () => submitMC(opt, btn);
      answerArea.appendChild(btn);
    });

  } else if (q.type === 'fill') {
    const inp = document.createElement('input');
    inp.id = 'fill-input';
    inp.type = 'text';
    inp.placeholder = ui.fill_placeholder || 'Type your answer...';
    inp.addEventListener('input', () => {
      const val = inp.value.trim();
      answerArea.querySelector('.submit-btn').disabled = val.length === 0;
    });
    const btn = document.createElement('button');
    btn.className = 'submit-btn';
    btn.textContent = ui.submit_button || 'Submit';
    btn.disabled = true;
    btn.onclick = () => submitFill(inp.value.trim());
    answerArea.appendChild(inp);
    answerArea.appendChild(btn);

  } else if (q.type === 'essay') {
    const ta = document.createElement('textarea');
    ta.id = 'essay-input';
    ta.placeholder = ui.essay_placeholder || 'Write your answer here...';
    const charCount = document.createElement('div');
    charCount.id = 'char-count';
    charCount.style.fontSize = '0.8rem';
    charCount.style.color = '#666';
    charCount.style.marginBottom = '8px';
    charCount.textContent = `Minimum 30 characters`;

    const btn = document.createElement('button');
    btn.className = 'submit-btn';
    btn.textContent = ui.submit_button || 'Submit';
    btn.disabled = true;
    ta.addEventListener('input', () => {
      const len = ta.value.trim().length;
      charCount.textContent = `${len}/30 characters`;
      btn.disabled = len < 30;
    });
    btn.onclick = () => submitEssay(ta.value.trim());
    answerArea.appendChild(charCount);
    answerArea.appendChild(ta);
    answerArea.appendChild(btn);
  }
}

function submitMC(chosen, btn) {
  const q      = questions[current];
  const correct = chosen === q.answer;
  answers[q.id] = { chosen, correct };
  if (correct) {
    score += q.points;
    btn.classList.add('correct');
    launchConfetti();
  } else {
    btn.classList.add('wrong');
    document.getElementById('quiz-area').classList.add('shake');
    setTimeout(() => document.getElementById('quiz-area').classList.remove('shake'), 500);
    document.querySelectorAll('.option-btn').forEach(b => {
      if (b.textContent.startsWith(q.answer + '.')) b.classList.add('correct');
    });
  }
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  setTimeout(advance, 1200);
}

function submitFill(val) {
  const q      = questions[current];
  const correct = val.toLowerCase() === q.answer.toLowerCase();
  answers[q.id] = { chosen: val, correct };
  if (correct) { score += q.points; launchConfetti(); }
  advance();
}

function submitEssay(val) {
  const q = questions[current];
  answers[q.id] = { chosen: val, correct: null };
  advance();
}

function advance() {
  current++;
  if (current < questions.length) {
    renderQuestion();
  } else {
    showReview();
  }
}

function showReview() {
  document.getElementById('quiz-area').style.display    = 'none';
  document.getElementById('review-area').style.display  = 'block';
  const passed = score >= 85;
  const metaLine = metadata.subject
    ? ` — ${metadata.subject} · Grade ${metadata.grade || '?'}`
    : '';
  document.getElementById('final-score').textContent =
    `Score: ${score}/100${metaLine} — ${passed ? 'PASSED' : 'Not yet'}`;

  const list = document.getElementById('review-list');
  list.innerHTML = '';
  questions.forEach((q, idx) => {
    const dispN  = idx + 1;                        // sequential 1–55
    const a      = answers[q.id] || {};
    const status = a.correct === true ? 'r-correct'
               : a.correct === false ? 'r-wrong'
               : 'r-essay';
    const div = document.createElement('div');
    div.className = 'review-item ' + status;
    div.innerHTML = `<strong>Q${dispN} [${q.type.toUpperCase()}]:</strong> ${q.text}<br>
      <em>Your answer:</em> ${a.chosen ?? '—'}<br>
      <em>Model answer:</em> ${q.answer}`;
    list.appendChild(div);
  });
}

/* ── Confetti: 30 particles, 3s, dependency-free DOM implementation ── */
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  const colors = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'width:8px','height:8px',
      `background:${colors[i % colors.length]}`,
      `border-radius:${Math.random()>0.5?'50%':'2px'}`,
      `left:${Math.random()*100}vw`,
      `top:${window.innerHeight}px`,
      `pointer-events:none`,
      `z-index:9999`,
      `transform:rotate(${Math.random()*360}deg)`
    ].join(';');

    document.body.appendChild(el);
    const angle = -30 - Math.random() * 90;   // upward arc
    const rad   = angle * Math.PI / 180;
    const vx    = Math.cos(rad) * (2 + Math.random() * 4);
    const vy    = Math.sin(rad) * (8 + Math.random() * 6);
    const grav  = 0.3;
    let x = parseFloat(el.style.left);
    let y = parseFloat(el.style.top);
    let vxf = vx, vyf = vy;
    const start = performance.now();
    function tick(now) {
      const dt = Math.min((now - start) / 1000, 3);
      vyf += grav;
      x   += vxf;
      y   += vyf;
      el.style.left  = x + 'px';
      el.style.top   = y + 'px';
      el.style.opacity = Math.max(0, 1 - dt / 3);
      if (dt < 3) requestAnimationFrame(tick);
      else el.remove();
    }
    requestAnimationFrame(tick);
  }
}

window.onload = loadQuiz;
