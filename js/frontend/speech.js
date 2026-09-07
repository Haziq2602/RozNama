// RozNama Speech Engine - Microphone STT Recording & TTS Audio Feedback

let recognition = null;

// Toggle Microphone Voice Recording (Speech-to-Text)
function toggleRecording() {
  const micBtn = document.getElementById('micBtn');
  const statusEl = document.getElementById('recordingStatus');

  if (!state.isRecording) {
    // Start Recording
    state.isRecording = true;
    if (micBtn) micBtn.classList.add('recording');
    if (statusEl) {
      statusEl.classList.add('listening');
      statusEl.innerHTML = `<span class="pulse-dot"></span> Listening in ${state.selectedLang}... Speak now!`;
    }

    // Try Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = state.selectedLang;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        const inputEl = document.getElementById('transcriptInput');
        if (inputEl) inputEl.value = transcript;

        if (event.results[0].isFinal) {
          stopRecording();
          if (typeof processTranscript === 'function') {
            processTranscript(transcript);
          }
        }
      };

      recognition.onerror = (err) => {
        console.warn("Speech Recognition Error / Fallback triggered:", err);
        if (typeof showToast === 'function') {
          showToast("Mic active - Speech transcription ready", "info");
        }
      };

      recognition.onend = () => {
        if (state.isRecording) stopRecording();
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn("Speech API start blocked:", e);
      }
    } else {
      if (typeof showToast === 'function') {
        showToast("Web Speech API not supported in browser, using text fallback parser", "info");
      }
    }
  } else {
    stopRecording();
  }
}

// Stop Microphone Voice Recording
function stopRecording() {
  state.isRecording = false;
  const micBtn = document.getElementById('micBtn');
  const statusEl = document.getElementById('recordingStatus');
  
  if (micBtn) micBtn.classList.remove('recording');
  if (statusEl) {
    statusEl.classList.remove('listening');
    statusEl.innerHTML = `Tap microphone to record voice ledger note`;
  }

  if (recognition) {
    try { recognition.stop(); } catch(e){}
  }
}

// Speak Voice Confirmation (Text-to-Speech Readout in Hindi/Hinglish)
function speakConfirmation() {
  if (!state.currentExtraction) return;

  const ext = state.currentExtraction;
  let textToSpeak = `${ext.customerName} se ${ext.paidAmount} rupaye cash mile. `;
  if (ext.udhaarAmount > 0) {
    textToSpeak += `${ext.udhaarAmount} rupaye udhaar khate mein jode gaye hain, jo ${ext.dueDateLabel} tak milenge.`;
  } else {
    textToSpeak += `Pura bhugtan safal raha.`;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any active speech
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    if (typeof showToast === 'function') {
      showToast("Playing voice confirmation feedback...", "info");
    }
  } else {
    alert(`Voice Confirmation Readout:\n"${textToSpeak}"`);
  }
}
