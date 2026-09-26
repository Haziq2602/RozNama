// RozNama Speech Engine - Hybrid Microphone STT (Groq Whisper Online + Browser Speech Offline)

let recognition = null;
let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;

// Toggle Microphone Voice Recording
async function toggleRecording() {
  const micBtn = document.getElementById('micBtn');
  const statusEl = document.getElementById('recordingStatus');

  if (!state.isRecording) {
    // 1. OFFLINE CHECK: On desktop browsers, Speech-to-Text requires internet connectivity.
    // Notify the user immediately, redirect to manual input, and use the Offline ML Extractor.
    if (!navigator.onLine) {
      state.isRecording = false;
      if (micBtn) micBtn.classList.remove('recording');

      if (statusEl) {
        statusEl.classList.remove('listening');
        statusEl.innerHTML = `<span style="color:#FBBF24; font-weight:600;">⚠️ Offline: Voice STT unavailable. Type entry below!</span>`;
      }
      const inputEl = document.getElementById('transcriptInput');
      if (inputEl) {
        inputEl.focus();
        inputEl.placeholder = "Offline mode: Type entry here (e.g. Ramesh ne 300 cash diya 150 baki)...";
      }
      if (typeof showToast === 'function') {
        showToast('⚠️ Disconnected from internet: Voice STT requires internet. Type your entry below — Offline ML will extract categories & amounts!', 'info');
      }
      return;
    }

    state.isRecording = true;
    if (micBtn) micBtn.classList.add('recording');

    // 2. ONLINE MODE: Decide between Online Groq Whisper vs Browser Speech
    const token = localStorage.getItem('roznama_jwt_token');
    const isOnlineWithWhisper = token && navigator.mediaDevices && window.MediaRecorder;

    if (isOnlineWithWhisper) {
      startWhisperAudioRecording(statusEl);
    } else {
      startBrowserSpeechRecording(statusEl);
    }

  } else {
    stopRecording();
  }
}

// 1. Online Groq Whisper Audio Recording Engine
async function startWhisperAudioRecording(statusEl) {
  try {
    if (statusEl) {
      statusEl.classList.add('listening');
      statusEl.innerHTML = `<span class="pulse-dot"></span> Listening... Speak now!`;
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    // Use webm / mp4 depending on browser
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');

    mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (audioChunks.length === 0) return;
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      audioChunks = [];

      // Stop microphone stream
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }

      await sendAudioToWhisper(audioBlob);
    };

    mediaRecorder.start();

  } catch (err) {
    console.warn('Microphone permission blocked or MediaRecorder failed, falling back to browser speech:', err);
    startBrowserSpeechRecording(statusEl);
  }
}

// Send Raw Audio Blob to Express Server -> Groq Whisper
async function sendAudioToWhisper(audioBlob) {
  const statusEl = document.getElementById('recordingStatus');
  const inputEl = document.getElementById('transcriptInput');
  const token = localStorage.getItem('roznama_jwt_token');

  if (statusEl) {
    statusEl.innerHTML = `Processing voice entry...`;
  }

  try {
    const transcribeUrl = window.location.protocol === 'file:' ? 'http://localhost:5000/api/ai/transcribe' : '/api/ai/transcribe';
    const res = await fetch(transcribeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': audioBlob.type || 'audio/webm',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: audioBlob
    });

    const data = await res.json();

    if (res.ok && data.success && data.text) {
      if (inputEl) inputEl.value = data.text;
      if (typeof showToast === 'function') {
        showToast(`Recorded: "${data.text}"`, 'info');
      }
      if (typeof processTranscript === 'function') {
        processTranscript(data.text);
      }
    } else {
      console.warn('Voice transcription unavailable, fallback to manual input or check error:', data);
      if (data.error && typeof showToast === 'function') {
        showToast('Voice recognition unavailable, please type or try again', 'info');
      }
    }

  } catch (err) {
    console.error('Audio upload to Whisper failed:', err);
    if (typeof showToast === 'function') {
      showToast('Connection interrupted. Please tap mic again to use Offline Speech or type manually.', 'info');
    }
  } finally {
    if (statusEl) {
      statusEl.classList.remove('listening');
      statusEl.innerHTML = `Tap microphone and speak entry`;
    }
  }
}

// 2. Offline Mode: Browser Built-in Web Speech API
function startBrowserSpeechRecording(statusEl) {
  if (statusEl) {
    statusEl.classList.add('listening');
    statusEl.innerHTML = `<span class="pulse-dot"></span> Listening... Speak now!`;
  }

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
      console.warn("Browser Speech Recognition Error:", err);
      stopRecording();
      const inputEl = document.getElementById('transcriptInput');
      if (inputEl) {
        inputEl.focus();
        inputEl.placeholder = "Offline mode: Type entry here (e.g. Ramesh ne 300 cash diya 150 baki)...";
      }
      if (statusEl) {
        statusEl.classList.remove('listening');
        statusEl.innerHTML = `<span style="color:#FBBF24; font-weight:600;">⚠️ Voice unavailable without internet. Type entry below!</span>`;
      }
      if (typeof showToast === 'function') {
        showToast('⚠️ Voice recognition requires internet. Type your entry below — Offline ML will extract categories & amounts!', 'info');
      }
    };

    recognition.onend = () => {
      if (state.isRecording) stopRecording();
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Browser speech start blocked:", e);
    }
  } else {
    if (typeof showToast === 'function') {
      showToast("Web Speech not supported in browser, please type transcript manually", "info");
    }
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
    statusEl.innerHTML = `Tap microphone and speak entry`;
  }

  // Stop MediaRecorder if active
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch(e){}
  }

  // Stop Web Speech Recognition if active
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
    textToSpeak += `${ext.udhaarAmount} rupaye udhaar khate mein jode gaye hain, jo ${ext.dueDateLabel || 'bhavishya mein'} milenge.`;
  } else {
    textToSpeak += `Pura bhugtan safal raha.`;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}
