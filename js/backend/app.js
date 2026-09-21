// RozNama Main Application Entry Point & Event Bootstrap

document.addEventListener('DOMContentLoaded', async () => {
  await initStorage();
  bindEvents();
  renderAll();
});

// Bind UI Event Listeners
function bindEvents() {
  const micBtn = document.getElementById('micBtn');
  const langSelect = document.getElementById('langSelect');
  const parseBtn = document.getElementById('parseBtn');
  const transcriptInput = document.getElementById('transcriptInput');

  if (micBtn && typeof toggleRecording === 'function') {
    micBtn.addEventListener('click', toggleRecording);
  }
  
  if (langSelect) {
    langSelect.addEventListener('change', (e) => state.selectedLang = e.target.value);
  }
  
  if (parseBtn) {
    parseBtn.addEventListener('click', () => {
      const text = transcriptInput ? transcriptInput.value.trim() : '';
      if (text && typeof processTranscript === 'function') {
        processTranscript(text);
      }
    });
  }

  if (transcriptInput) {
    transcriptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const text = transcriptInput.value.trim();
        if (text && typeof processTranscript === 'function') {
          processTranscript(text);
        }
      }
    });
  }
}
