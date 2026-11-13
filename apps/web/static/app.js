const $ = (selector) => document.querySelector(selector);
const form = $('#chat-form');
const input = $('#message-input');
const messages = $('#messages');
const attachments = [];
const history = [];
let recognition = null;
let cameraStream = null;
let busy = false;

function campaignData() {
  return {
    cause: $('#cause').value.trim(),
    description: $('#description').value.trim(),
    goal: $('#goal').value.trim(),
    deadline: $('#deadline').value.trim(),
    donation_url: $('#donation-url').value.trim(),
  };
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 3200);
}
function renderAttachments() {
  $('#attachment-tray').innerHTML = attachments.map((file, index) => `
    <div class="attachment-chip"><span>▧</span><span class="attachment-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</span><button type="button" data-remove="${index}" aria-label="Retirer ${escapeHTML(file.name)}">×</button></div>`).join('');
}
function addMessage(role, text, fileNames = []) {
  $('#welcome').classList.add('hidden');
  const node = document.createElement('article');
  node.className = `message ${role}`;
  const author = role === 'assistant' ? '<span class="message-avatar">✳</span><b>Collecte</b>' : '<span class="you-avatar">R</span><b>Vous</b>';
  const files = fileNames.length ? `<div class="message-files">${fileNames.map((name) => `<span>▧ ${escapeHTML(name)}</span>`).join('')}</div>` : '';
  node.innerHTML = `<div class="message-author">${author}</div>${files}<div class="message-body">${escapeHTML(text).replace(/\n/g, '<br>')}</div>${role === 'assistant' ? '<button class="speak-message" type="button" title="Lire la réponse à voix haute">▶ Écouter</button>' : ''}`;
  messages.appendChild(node);
  node.querySelector('.speak-message')?.addEventListener('click', () => speak(text));
  $('#chat-content').scrollTo({ top: $('#chat-content').scrollHeight, behavior: 'smooth' });
}
function setBusy(value) {
  busy = value;
  $('#typing').classList.toggle('hidden', !value);
  $('#send-button').disabled = value;
}
async function submitMessage(text = input.value) {
  text = text.trim();
  if (!text || busy) return;
  const sentFiles = attachments.splice(0, attachments.length);
  renderAttachments();
  addMessage('user', text, sentFiles.map((file) => file.name));
  history.push({ role: 'user', content: text });
  input.value = '';
  input.style.height = 'auto';
  setBusy(true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, campaign: campaignData(), history: history.slice(-12), attachments: sentFiles }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'La réponse n’a pas pu être générée.');
    addMessage('assistant', data.reply);
    history.push({ role: 'assistant', content: data.reply });
    $('#service-status').textContent = data.mode === 'mistral' ? 'IA connectée' : 'Mode démo';
  } catch (error) {
    addMessage('assistant', `Je n’ai pas pu joindre le service : ${error.message}`);
  } finally { setBusy(false); input.focus(); }
}
form.addEventListener('submit', (event) => { event.preventDefault(); submitMessage(); });
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; });
document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
$('#attach-button').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async (event) => {
  for (const file of event.target.files) {
    if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} dépasse la limite de 5 Mo.`); continue; }
    const data = new FormData(); data.append('file', file);
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Échec du téléversement.');
      attachments.push(result);
      if (!result.readable) showToast(result.message);
    } catch (error) { showToast(error.message); }
  }
  renderAttachments(); event.target.value = '';
});
$('#attachment-tray').addEventListener('click', (event) => {
  const index = event.target.dataset.remove;
  if (index !== undefined) { attachments.splice(Number(index), 1); renderAttachments(); }
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition(); recognition.lang = 'fr-FR'; recognition.interimResults = true;
  recognition.addEventListener('result', (event) => {
    input.value = Array.from(event.results).map((result) => result[0].transcript).join('');
    input.dispatchEvent(new Event('input'));
  });
  recognition.addEventListener('end', () => $('#voice-button').classList.remove('recording'));
  recognition.addEventListener('error', () => { $('#voice-button').classList.remove('recording'); showToast('La dictée vocale n’est pas disponible. Vérifiez les autorisations du navigateur.'); });
  $('#voice-button').addEventListener('click', () => {
    try { if ($('#voice-button').classList.contains('recording')) recognition.stop(); else { recognition.start(); $('#voice-button').classList.add('recording'); } }
    catch { showToast('Impossible de démarrer la dictée vocale.'); }
  });
} else {
  $('#voice-button').addEventListener('click', () => showToast('La dictée vocale n’est pas prise en charge par ce navigateur.'));
}
function speak(text) {
  if (!('speechSynthesis' in window)) { showToast('La lecture vocale n’est pas prise en charge sur cet appareil.'); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'fr-FR'; window.speechSynthesis.speak(utterance);
}
$('#camera-button').addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia) { showToast('Caméra indisponible. Ouvrez cette page en HTTPS ou sur localhost.'); return; }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    $('#camera-video').srcObject = cameraStream;
    $('#camera-panel').classList.remove('hidden');
    $('#camera-button').classList.add('recording');
  } catch { showToast('Accès à la caméra refusé ou indisponible.'); }
});
function stopCamera() {
  cameraStream?.getTracks().forEach((track) => track.stop()); cameraStream = null;
  $('#camera-video').srcObject = null; $('#camera-panel').classList.add('hidden'); $('#camera-button').classList.remove('recording');
}
$('#camera-close').addEventListener('click', stopCamera);
window.addEventListener('pagehide', stopCamera);
$('#draft-button').addEventListener('click', async () => {
  const campaign = campaignData();
  if (!campaign.cause) { showToast('Ajoutez d’abord le nom de votre cause.'); $('#cause').focus(); return; }
  const button = $('#draft-button'); button.disabled = true; button.innerHTML = '<span>✦</span> Préparation…';
  try {
    const response = await fetch('/api/campaign/draft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...campaign, recipient: 'un partenaire', tone: 'chaleureux' }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'La rédaction a échoué.');
    addMessage('assistant', result.draft);
    history.push({ role: 'assistant', content: result.draft });
    $('#service-status').textContent = result.mode === 'mistral' ? 'IA connectée' : 'Mode démo';
    if (window.innerWidth < 900) $('#campaign-panel').classList.remove('panel-open');
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; button.innerHTML = '<span>✦</span> Préparer un message'; }
});
$('#new-chat').addEventListener('click', () => {
  messages.innerHTML = ''; history.length = 0; attachments.length = 0; renderAttachments();
  $('#welcome').classList.remove('hidden'); input.value = ''; input.focus();
});
$('#campaign-nav').addEventListener('click', () => $('#campaign-panel').classList.toggle('panel-open'));
$('#panel-close').addEventListener('click', () => $('#campaign-panel').classList.remove('panel-open'));
$('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('sidebar-open'));
$('#theme-button').addEventListener('click', () => document.body.classList.toggle('dark-mode'));

fetch('/api/health').then((response) => response.json()).then((data) => {
  $('#service-status').textContent = data.ai_enabled ? 'IA connectée' : 'Mode démo';
}).catch(() => { $('#service-status').textContent = 'Hors ligne'; });
