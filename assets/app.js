const DATA = window.EXAM_DATA;

const $ = (id) => document.getElementById(id);
const els = {
  totalQuestionCount: $('totalQuestionCount'), bankCards: $('bankCards'), chapterSelect: $('chapterSelect'),
  modeSelect: $('modeSelect'), limitSelect: $('limitSelect'), shuffleToggle: $('shuffleToggle'), startBtn: $('startBtn'),
  previewBtn: $('previewBtn'), previewBox: $('previewBox'), setupView: $('setupView'), quizView: $('quizView'),
  resultView: $('resultView'), themeToggle: $('themeToggle'), timerText: $('timerText'), answeredCount: $('answeredCount'),
  correctCount: $('correctCount'), wrongCount: $('wrongCount'), progressText: $('progressText'), progressBar: $('progressBar'),
  questionNav: $('questionNav'), backToSetupBtn: $('backToSetupBtn'), modeBadge: $('modeBadge'), bankLabel: $('bankLabel'),
  questionCounter: $('questionCounter'), questionText: $('questionText'), optionsList: $('optionsList'), feedbackBox: $('feedbackBox'),
  prevBtn: $('prevBtn'), nextBtn: $('nextBtn'), finishBtn: $('finishBtn'), checkBtn: $('checkBtn'), multiHint: $('multiHint'),
  resultTitle: $('resultTitle'), resultSubtitle: $('resultSubtitle'), scorePercent: $('scorePercent'), resultTotal: $('resultTotal'),
  resultCorrect: $('resultCorrect'), resultWrong: $('resultWrong'), resultUnanswered: $('resultUnanswered'), reviewList: $('reviewList'),
  restartBtn: $('restartBtn'), retryWrongBtn: $('retryWrongBtn'), downloadResultBtn: $('downloadResultBtn')
};

let selectedBankId = DATA.banks[0].id;
let state = null;
let timer = null;

function init() {
  const total = DATA.banks.reduce((sum, b) => sum + b.count, 0);
  els.totalQuestionCount.textContent = total.toLocaleString('vi-VN');
  renderBankCards();
  renderChapterOptions();
  bindEvents();
  restoreTheme();
}

function bindEvents() {
  els.startBtn.addEventListener('click', () => startQuiz());
  els.previewBtn.addEventListener('click', togglePreview);
  els.chapterSelect.addEventListener('change', togglePreviewSilent);
  els.modeSelect.addEventListener('change', togglePreviewSilent);
  els.limitSelect.addEventListener('change', togglePreviewSilent);
  els.shuffleToggle.addEventListener('change', togglePreviewSilent);
  els.prevBtn.addEventListener('click', () => goToQuestion(state.currentIndex - 1));
  els.nextBtn.addEventListener('click', () => goToQuestion(state.currentIndex + 1));
  els.finishBtn.addEventListener('click', finishQuiz);
  els.checkBtn.addEventListener('click', checkCurrentQuestion);
  els.backToSetupBtn.addEventListener('click', backToSetup);
  els.restartBtn.addEventListener('click', backToSetup);
  els.retryWrongBtn.addEventListener('click', retryWrongQuestions);
  els.downloadResultBtn.addEventListener('click', downloadResult);
  els.themeToggle.addEventListener('click', toggleTheme);
}

function getBank() { return DATA.banks.find(b => b.id === selectedBankId) || DATA.banks[0]; }
function getCurrentQuestion() { return state.questions[state.currentIndex]; }
function normalizeAnswer(arr) { return [...(arr || [])].sort().join(','); }
function isCorrect(q, selected) { return normalizeAnswer(q.answer) === normalizeAnswer(selected); }
function isMulti(q) { return (q.answer || []).length > 1; }
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderBankCards() {
  els.bankCards.innerHTML = DATA.banks.map(bank => `
    <button class="bank-card ${bank.id === selectedBankId ? 'active' : ''}" data-bank="${bank.id}" type="button">
      <h3>${bank.title}</h3>
      <p>${bank.subtitle}</p>
      <p>${bank.description}</p>
      <span class="bank-count">${bank.count.toLocaleString('vi-VN')} câu</span>
    </button>
  `).join('');
  document.querySelectorAll('.bank-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedBankId = card.dataset.bank;
      renderBankCards();
      renderChapterOptions();
      togglePreviewSilent();
    });
  });
}

function renderChapterOptions() {
  const bank = getBank();
  els.chapterSelect.innerHTML = `<option value="all">Tất cả (${bank.count} câu)</option>` + bank.chapters.map(ch =>
    `<option value="${ch.id}">${ch.title.replace(/^CHƯƠNG\s*/i, 'Chương ')} (${ch.count} câu)</option>`
  ).join('');
  // Reset về Tất cả mỗi khi đổi bộ đề để tránh trình duyệt giữ lại giá trị chương cũ.
  els.chapterSelect.value = 'all';
}

function getConfiguredQuestions() {
  const bank = getBank();
  const validChapterIds = new Set(['all', ...(bank.chapters || []).map(ch => ch.id)]);
  let chapter = els.chapterSelect.value || 'all';
  if (!validChapterIds.has(chapter)) {
    chapter = 'all';
    els.chapterSelect.value = 'all';
  }
  let qs = (bank.questions || []).filter(q => chapter === 'all' || q.chapterId === chapter);
  // Fallback an toàn: nếu vì bất cứ lý do gì filter rỗng nhưng ngân hàng có câu hỏi, dùng toàn bộ bộ đề.
  if (!qs.length && bank.questions && bank.questions.length) {
    qs = [...bank.questions];
    els.chapterSelect.value = 'all';
  }
  if (els.shuffleToggle.checked) qs = shuffleArray(qs);
  const limit = els.limitSelect.value;
  if (limit !== 'all') qs = qs.slice(0, Number(limit));
  return qs;
}

function togglePreviewSilent() {
  if (!els.previewBox.classList.contains('hidden')) renderPreview();
}
function togglePreview() {
  els.previewBox.classList.toggle('hidden');
  if (!els.previewBox.classList.contains('hidden')) renderPreview();
}
function renderPreview() {
  const bank = getBank();
  const qs = getConfiguredQuestions();
  const chapter = els.chapterSelect.options[els.chapterSelect.selectedIndex]?.text || 'Tất cả';
  const multi = qs.filter(q => isMulti(q)).length;
  els.previewBox.innerHTML = `
    <strong>${bank.title}</strong><br>
    Phạm vi: ${chapter}<br>
    Số câu sẽ làm: <strong>${qs.length}</strong><br>
    Chế độ: <strong>${els.modeSelect.value === 'practice' ? 'Luyện tập - hiện đáp án ngay' : 'Kiểm tra - chấm sau khi nộp'}</strong><br>
    ${multi ? `Có ${multi} câu nhiều đáp án đúng.` : 'Tất cả câu trong phạm vi hiện tại là chọn 1 đáp án.'}
  `;
}

function startQuiz(customQuestions = null) {
  // Khi dùng addEventListener, browser có thể truyền MouseEvent vào hàm.
  // Chỉ nhận customQuestions nếu đó thật sự là mảng câu hỏi.
  const qs = Array.isArray(customQuestions) ? customQuestions : getConfiguredQuestions();
  if (!qs.length) return alert('Không có câu hỏi trong phạm vi này.');
  state = {
    bank: getBank(), mode: els.modeSelect.value, questions: qs, currentIndex: 0,
    selected: {}, checked: {}, startTime: Date.now(), finished: false, resultSnapshot: null
  };
  els.setupView.classList.add('hidden');
  els.resultView.classList.add('hidden');
  els.quizView.classList.remove('hidden');
  els.modeBadge.textContent = state.mode === 'practice' ? 'Luyện tập' : 'Kiểm tra';
  startTimer();
  renderQuestionNav();
  renderQuestion();
  updateStats();
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!state) return;
    els.timerText.textContent = formatTime(Date.now() - state.startTime);
  }, 500);
}

function renderQuestion() {
  const q = getCurrentQuestion();
  const selected = state.selected[q.id] || [];
  const checked = !!state.checked[q.id] || state.finished;
  els.bankLabel.textContent = `${state.bank.title} • ${q.chapterTitle.replace(/^CHƯƠNG\s*/i, 'Chương ')}`;
  els.questionCounter.textContent = `Câu ${state.currentIndex + 1}/${state.questions.length} • #${q.displayNumber}`;
  els.questionText.textContent = q.text;
  els.multiHint.classList.toggle('hidden', !isMulti(q));

  els.optionsList.innerHTML = q.options.map(opt => {
    const isSelected = selected.includes(opt.key);
    const isRight = q.answer.includes(opt.key);
    let cls = 'option-btn';
    if (isSelected) cls += ' selected';
    if (checked && isRight) cls += ' correct';
    if (checked && isSelected && !isRight) cls += ' wrong';
    return `<button class="${cls}" data-key="${opt.key}" type="button">
      <span class="option-key">${opt.key}</span>
      <span>${escapeHtml(opt.text)}</span>
    </button>`;
  }).join('');

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => selectOption(btn.dataset.key));
  });

  renderFeedback(q, checked);
  els.prevBtn.disabled = state.currentIndex === 0;
  els.nextBtn.disabled = state.currentIndex === state.questions.length - 1;
  els.checkBtn.classList.toggle('hidden', !(state.mode === 'practice' && isMulti(q) && !state.checked[q.id]));
  renderQuestionNav();
  updateStats();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function selectOption(key) {
  const q = getCurrentQuestion();
  if (state.finished || (state.mode === 'practice' && state.checked[q.id])) return;
  const selected = new Set(state.selected[q.id] || []);
  if (isMulti(q)) {
    selected.has(key) ? selected.delete(key) : selected.add(key);
    state.selected[q.id] = [...selected];
  } else {
    state.selected[q.id] = [key];
    if (state.mode === 'practice') state.checked[q.id] = true;
  }
  renderQuestion();
}

function checkCurrentQuestion() {
  const q = getCurrentQuestion();
  if (!state.selected[q.id] || !state.selected[q.id].length) return alert('Bạn chưa chọn đáp án.');
  state.checked[q.id] = true;
  renderQuestion();
}

function renderFeedback(q, checked) {
  if (!checked) {
    els.feedbackBox.classList.add('hidden');
    els.feedbackBox.textContent = '';
    return;
  }
  const selected = state.selected[q.id] || [];
  const ok = isCorrect(q, selected);
  els.feedbackBox.className = `feedback-box ${ok ? 'correct' : 'wrong'}`;
  els.feedbackBox.innerHTML = ok
    ? `✅ Chính xác. Đáp án đúng: <strong>${q.answerText}</strong>.`
    : `❌ Chưa đúng. Bạn chọn: <strong>${selected.join(', ') || 'chưa chọn'}</strong>. Đáp án đúng: <strong>${q.answerText}</strong>.`;
}

function goToQuestion(index) {
  if (!state || index < 0 || index >= state.questions.length) return;
  state.currentIndex = index;
  renderQuestion();
}

function renderQuestionNav() {
  if (!state) return;
  els.questionNav.innerHTML = state.questions.map((q, idx) => {
    const selected = state.selected[q.id] || [];
    const checked = !!state.checked[q.id] || state.finished;
    let cls = 'nav-pill';
    if (idx === state.currentIndex) cls += ' current';
    if (selected.length) cls += ' answered';
    if (checked && selected.length && isCorrect(q, selected)) cls += ' correct';
    if (checked && (!selected.length || !isCorrect(q, selected))) cls += ' wrong';
    return `<button class="${cls}" type="button" data-idx="${idx}">${idx + 1}</button>`;
  }).join('');
  document.querySelectorAll('.nav-pill').forEach(btn => btn.addEventListener('click', () => goToQuestion(Number(btn.dataset.idx))));
}

function computeStats() {
  let answered = 0, correct = 0, wrong = 0, unanswered = 0;
  const details = state.questions.map((q, idx) => {
    const selected = state.selected[q.id] || [];
    const has = selected.length > 0;
    const checked = state.finished || state.checked[q.id];
    const ok = has && isCorrect(q, selected);
    if (has) answered++; else unanswered++;
    if (checked) {
      if (ok) correct++; else wrong++;
    }
    return { q, idx, selected, answered: has, correct: ok };
  });
  return { answered, correct, wrong, unanswered, details };
}

function updateStats() {
  if (!state) return;
  const stats = computeStats();
  els.answeredCount.textContent = `${stats.answered}/${state.questions.length}`;
  els.correctCount.textContent = stats.correct;
  els.wrongCount.textContent = stats.wrong;
  const pct = Math.round((stats.answered / state.questions.length) * 100);
  els.progressText.textContent = `${pct}%`;
  els.progressBar.style.width = `${pct}%`;
}

function finishQuiz() {
  if (!state) return;
  const stats = computeStats();
  if (!state.finished && stats.unanswered > 0) {
    const ok = confirm(`Bạn còn ${stats.unanswered} câu chưa làm. Vẫn nộp bài?`);
    if (!ok) return;
  }
  state.finished = true;
  state.resultSnapshot = computeStats();
  clearInterval(timer);
  renderResult();
}

function renderResult() {
  const stats = state.resultSnapshot || computeStats();
  const total = state.questions.length;
  const percent = total ? Math.round((stats.correct / total) * 100) : 0;
  els.quizView.classList.add('hidden');
  els.resultView.classList.remove('hidden');
  els.resultTitle.textContent = percent >= 80 ? 'Làm tốt lắm!' : percent >= 50 ? 'Bạn đã hoàn thành bài làm' : 'Cần ôn lại thêm một chút';
  els.resultSubtitle.textContent = `${state.bank.title} • Thời gian: ${formatTime(Date.now() - state.startTime)}`;
  els.scorePercent.textContent = `${percent}%`;
  document.querySelector('.score-ring').style.setProperty('--score', `${percent}%`);
  els.resultTotal.textContent = total;
  els.resultCorrect.textContent = stats.correct;
  els.resultWrong.textContent = stats.wrong;
  els.resultUnanswered.textContent = stats.unanswered;
  const review = stats.details.filter(x => !x.correct);
  els.reviewList.innerHTML = review.length ? review.map(item => `
    <article class="review-item">
      <h4>Câu ${item.idx + 1} • #${item.q.displayNumber}</h4>
      <p>${escapeHtml(item.q.text)}</p>
      <p>Bạn chọn: <span class="review-wrong">${item.selected.join(', ') || 'Chưa chọn'}</span></p>
      <p>Đáp án đúng: <span class="review-answer">${item.q.answerText}</span></p>
    </article>
  `).join('') : '<p>Không có câu sai. Xuất sắc!</p>';
}

function retryWrongQuestions() {
  if (!state || !state.resultSnapshot) return;
  const wrongQs = state.resultSnapshot.details.filter(x => !x.correct).map(x => x.q);
  if (!wrongQs.length) return alert('Bạn không có câu sai để luyện lại.');
  startQuiz(wrongQs);
}

function downloadResult() {
  if (!state) return;
  const stats = state.resultSnapshot || computeStats();
  const payload = {
    bank: state.bank.title,
    mode: state.mode,
    total: state.questions.length,
    correct: stats.correct,
    wrong: stats.wrong,
    unanswered: stats.unanswered,
    exportedAt: new Date().toISOString(),
    details: stats.details.map(x => ({ id: x.q.id, number: x.q.displayNumber, selected: x.selected, answer: x.q.answer, correct: x.correct }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ket-qua-on-thi.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function backToSetup() {
  clearInterval(timer);
  state = null;
  els.quizView.classList.add('hidden');
  els.resultView.classList.add('hidden');
  els.setupView.classList.remove('hidden');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('quiz-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}
function restoreTheme() {
  if (localStorage.getItem('quiz-theme') === 'dark') document.body.classList.add('dark');
}

init();
