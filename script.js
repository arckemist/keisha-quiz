// quiz_data is loaded via fetch at bottom of this file
let questions = [];
let currentIndex = 0;
let score = 0;
let totalPoints = 0;
let passThreshold = 0.85;
let shuffledQuestions = [];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startQuiz() {
  shuffledQuestions = shuffle(questions);
  currentIndex = 0;
  score = 0;
  totalPoints = questions.reduce((s, q) => s + q.points, 0);
  passThreshold = Math.round(totalPoints * 0.85);
  document.getElementById('total').textContent = totalPoints;
  document.getElementById('final-total').textContent = totalPoints;
  showScreen('question-screen');
  showQuestion();
}

function showQuestion() {
  const q = shuffledQuestions[currentIndex];
  document.getElementById('chapter-badge').textContent = q.chapter;
  document.getElementById('q-number').textContent = `Pertanyaan ${currentIndex + 1}`;
  document.getElementById('q-points').textContent = `${q.points} poin`;
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('progress-text').textContent = `${currentIndex + 1}/${shuffledQuestions.length}`;
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('feedback').classList.add('hidden');

  const container = document.getElementById('options-container');
  container.innerHTML = '';

  if (q.type === 'mc') {
    const options = shuffle(q.options);
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.onclick = () => selectOption(btn, opt, q);
      container.appendChild(btn);
    });
  } else if (q.type === 'fill') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fill-input';
    input.placeholder = 'Ketik jawabanmu di sini...';
    input.onkeydown = (e) => {
      if (e.key === 'Enter') checkFill(input, q);
    };
    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn-check';
    checkBtn.textContent = 'Cek Jawaban';
    checkBtn.onclick = () => checkFill(input, q);
    container.appendChild(input);
    container.appendChild(checkBtn);
  } else if (q.type === 'essay') {
    const textarea = document.createElement('textarea');
    textarea.className = 'essay-input';
    textarea.placeholder = 'Ketik jawaban essaymu di sini...';
    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn-check';
    checkBtn.textContent = 'Kirim Jawaban';
    checkBtn.onclick = () => checkEssay(textarea, q);
    container.appendChild(textarea);
    container.appendChild(checkBtn);
  }
}

function selectOption(btn, selected, q) {
  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach(b => b.classList.add('disabled'));
  btn.classList.add(selected === q.answer ? 'correct' : 'wrong');
  if (selected === q.answer) {
    score += q.points;
    document.getElementById('score').textContent = score;
    showFeedback('Benar! 🎉', true);
  } else {
    showFeedback(`Kurang tepat. Jawaban benar: ${q.answer}`, false);
    triggerShake(btn);
  }
  document.getElementById('btn-next').classList.remove('hidden');
}

function checkFill(input, q) {
  const userAns = input.value.trim().toLowerCase();
  const correct = q.answer.toLowerCase();
  const isCorrect = userAns === correct || userAns.includes(correct);
  input.classList.add(isCorrect ? 'correct' : 'wrong');
  input.disabled = true;
  if (isCorrect) {
    score += q.points;
    document.getElementById('score').textContent = score;
    showFeedback('Benar! 🎉', true);
  } else {
    showFeedback(`Kurang tepat. Jawaban benar: ${q.answer}`, false);
    triggerShake(input);
  }
  document.getElementById('btn-next').classList.remove('hidden');
}

function checkEssay(textarea, q) {
  textarea.disabled = true;
  score += q.points; // Essay: full points for attempting
  document.getElementById('score').textContent = score;
  showFeedback(`Terima kasih! Jawaban benar: ${q.answer}`, true);
  document.getElementById('btn-next').classList.remove('hidden');
}

function showFeedback(msg, isPositive) {
  const fb = document.getElementById('feedback');
  fb.textContent = msg;
  fb.className = `feedback ${isPositive ? 'positive' : 'negative'} visible`;
}

function triggerShake(el) {
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 600);
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= shuffledQuestions.length) {
    showResult();
  } else {
    showQuestion();
  }
}

function showResult() {
  showScreen('result-screen');
  document.getElementById('final-score').textContent = score;
  document.getElementById('score').textContent = score;

  const passed = score >= passThreshold;
  document.getElementById('result-icon').textContent = passed ? '🏆' : '💪';
  document.getElementById('result-title').textContent = passed ? 'Lulus! Hebat!' : 'Coba Lagi Ya!';
  document.getElementById('result-message').textContent = passed
    ? `Kamu lulus dengan nilai ${score} dari ${totalPoints} poin!`
    : `Perolehan kamu ${score} dari ${totalPoints} poin. Coba lagi untuk lulus!`;

  if (passed) {
    confetti();
  }
}

function confetti() {
  const colors = ['#f44336','#4caf50','#2196f3','#ff9800','#9c27b0'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 2 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

function restartQuiz() {
  showScreen('start-screen');
  document.getElementById('score').textContent = '0';
}

// Load quiz data via fetch (so JS is in its own .js file, never touches HTML)
fetch('quiz_data.json')
  .then(r => r.json())
  .then(data => {
    questions = data;
    document.getElementById('info-questions').textContent = questions.length;
    const pts = questions.reduce((s, q) => s + q.points, 0);
    document.getElementById('info-points').textContent = pts;
    document.getElementById('info-pass').textContent = `${Math.round(pts * 0.85)} poin (85%)`;
  })
  .catch(() => {
    document.querySelector('.start-card').innerHTML +=
      '<p style="color:red">Gagal memuat quiz. Refresh halaman.</p>';
  });
