/**
 * Pelli Kaanuka Voice Management System - Main Application Logic
 * Integrates Web Speech API, MediaRecorder, custom parsing, and Supabase database.
 */

// Global Error Catcher for easier debugging on frontend
window.addEventListener('error', function(event) {
  console.error("Uncaught error captured:", event.error);
  if (typeof showToast === 'function') {
    showToast(`Error: ${event.message}`, 'error');
  } else {
    alert(`Captured Error: ${event.message}`);
  }
});

window.addEventListener('unhandledrejection', function(event) {
  console.error("Unhandled promise rejection captured:", event.reason);
  const errMsg = event.reason?.message || event.reason;
  if (typeof showToast === 'function') {
    showToast(`Promise Error: ${errMsg}`, 'error');
  } else {
    alert(`Captured Promise Error: ${errMsg}`);
  }
});

// Application State
let appState = {
  entries: [],
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  audioBlob: null,
  recognition: null,
  speechTimeout: null,
  language: localStorage.getItem('pelli_language') || 'te',
  activeEditId: null
};

// DOM Elements
const DOM = {
  tabDashboard: document.getElementById('tab-dashboard'),
  tabRecord: document.getElementById('tab-record'),
  viewDashboard: document.getElementById('view-dashboard'),
  viewRecord: document.getElementById('view-record'),
  
  // Stats
  statTotalAmount: document.getElementById('stat-total-amount'),
  statTotalGuests: document.getElementById('stat-total-guests'),
  statTodayAmount: document.getElementById('stat-today-amount'),
  statTodayGuests: document.getElementById('stat-today-guests'),
  
  // Filters & Search
  searchName: document.getElementById('search-name'),
  searchVillage: document.getElementById('search-village'),
  filterDate: document.getElementById('filter-date'),
  btnResetFilters: document.getElementById('btn-reset-filters'),
  entriesTbody: document.getElementById('entries-tbody'),
  tableSummaryFooter: document.getElementById('table-summary-footer'),
  filteredTotalVal: document.getElementById('filtered-total-val'),
  
  // Recording
  btnRecordMic: document.getElementById('btn-record-mic'),
  micIcon: document.getElementById('mic-icon'),
  micRipple: document.getElementById('mic-ripple'),
  recordStatusTitle: document.getElementById('record-status-title'),
  recordStatusSubtitle: document.getElementById('record-status-subtitle'),
  visualizerContainer: document.getElementById('visualizer-container'),
  transcriptContainer: document.getElementById('transcript-container'),
  recordTranscript: document.getElementById('record-transcript'),
  btnShowManual: document.getElementById('btn-show-manual'),
  manualInputCard: document.getElementById('manual-input-card'),
  manualText: document.getElementById('manual-text'),
  btnProcessManual: document.getElementById('btn-process-manual'),
  btnCloseManual: document.getElementById('btn-close-manual'),
  
  // Confirmation Modal
  extractionModal: document.getElementById('extraction-modal'),
  confName: document.getElementById('conf-name'),
  confVillage: document.getElementById('conf-village'),
  confAmount: document.getElementById('conf-amount'),
  confPhone: document.getElementById('conf-phone'),
  confAudioContainer: document.getElementById('conf-audio-container'),
  confAudioPlayer: document.getElementById('conf-audio-player'),
  readbackEnabled: document.getElementById('readback-enabled'),
  btnDiscardConfirm: document.getElementById('btn-discard-confirm'),
  btnCancelConfirm: document.getElementById('btn-cancel-confirm'),
  confirmationForm: document.getElementById('confirmation-form'),
  
  // Settings
  settingsOverlay: document.getElementById('settings-overlay'),
  btnSettings: document.getElementById('btn-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  settingsOperator: document.getElementById('settings-operator'),
  settingsUseSupabase: document.getElementById('settings-use-supabase'),
  settingsUrl: document.getElementById('settings-url'),
  settingsKey: document.getElementById('settings-key'),
  settingsOpenaiKey: document.getElementById('settings-openai-key'),
  supabaseConfigFields: document.getElementById('supabase-config-fields'),
  btnCopySql: document.getElementById('btn-copy-sql'),
  btnClearLocal: document.getElementById('btn-clear-local'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  connStatus: document.getElementById('conn-status'),
  
  // Exports
  btnExportExcel: document.getElementById('btn-export-excel'),
  btnExportPdf: document.getElementById('btn-export-pdf'),
  themeToggle: document.getElementById('theme-toggle'),
  langToggle: document.getElementById('lang-toggle'),
  langToggleText: document.getElementById('lang-toggle-text'),
  toastContainer: document.getElementById('toast-container'),
  
  // Print
  printReceipt: document.getElementById('print-receipt'),
  printReceiptDate: document.getElementById('print-receipt-date'),
  printReceiptName: document.getElementById('print-receipt-name'),
  printReceiptVillage: document.getElementById('print-receipt-village'),
  printReceiptAmount: document.getElementById('print-receipt-amount'),
  printReceiptPhone: document.getElementById('print-receipt-phone'),
  printReceiptOperator: document.getElementById('print-receipt-operator')
};

// Audio Visualizer Context variables
let audioCtx = null;
let analyser = null;
let source = null;
let animationFrameId = null;

// ==========================================
// TRANSLATION DICTIONARY
// ==========================================
const TRANSLATIONS = {
  te: {
    'brand-title': 'పెళ్ళి కానుక',
    'brand-badge': 'వాయిస్',
    'brand-sub': 'పెళ్ళి కానుక వాయిస్ మేనేజ్మెంట్ సిస్టమ్',
    'tab-dashboard-text': 'డ్యాష్‌బోర్డ్',
    'tab-record-text': 'కానుక నమోదు',
    'stat-total-amount-lbl': 'మొత్తం కానుకల కలెక్షన్ (Total Cash)',
    'stat-total-amount-sub': 'మొత్తం సేకరించబడిన విలువ',
    'stat-total-guests-lbl': 'మొత్తం అతిథులు (Total Guests)',
    'stat-total-guests-sub': 'నమోదైన దాతల సంఖ్య',
    'stat-today-amount-lbl': 'ఈ రోజు కలెక్షన్ (Today\'s Collection)',
    'search-name': 'అతిథి పేరుతో వెతకండి...',
    'search-village': 'గ్రామం పేరుతో వెతకండి...',
    'filter-date-lbl': 'తేదీ:',
    'table-title': 'కానుకల జాబితా',
    'table-subtitle': 'నమోదైన అన్ని వివరాల పట్టిక',
    'btn-export-excel-text': 'ఎక్సెల్ (Excel)',
    'btn-export-pdf-text': 'పీడీఎఫ్ (PDF)',
    'th-sno': 'క్ర. సంఖ్య',
    'th-name': 'అతిథి పేరు',
    'th-village': 'గ్రామం',
    'th-amount': 'మొత్తం',
    'th-phone': 'మొబైల్',
    'th-voice': 'వాయిస్ రికార్డింగ్',
    'th-actions': 'చర్యలు',
    'filtered-total-lbl': 'ఫిల్టర్ చేసిన మొత్తం:',
    'info-title': 'ఎలా రికార్డ్ చేయాలి (How to record)',
    'info-desc': 'మైక్రోఫోన్ బటన్‌ను క్లిక్ చేసి, అతిథి వివరాలను తెలుగులో చెప్పండి.<br>ఉదాహరణకు: <strong class="text-maroon dark:text-gold-light">"పోచంపల్లి రమేష్ వెయ్యి నూట పదహారు రూపాయలు ఇచ్చారు"</strong> లేదా <strong class="text-maroon dark:text-gold-light">"గ్రామం కరీంనగర్ రాజయ్య ఐదు వందల పదహారు రూపాయలు, మొబైల్ నంబర్ 9876543210"</strong>.',
    'transcript-header-lbl': 'తెలుగు వచనం (Telugu Transcript):',
    'btn-show-manual-text': 'కీబోర్డ్ ద్వారా వివరాలు నమోదు చేయండి (Manual Input)',
    'manual-header': 'మ్యాన్యువల్ ఎంట్రీ (Manual Text)',
    'manual-label': 'వాక్యం టైప్ చేయండి (Type spoken sentence):',
    'manual-text': 'ఉదా: పోచంపల్లి రమేష్ వెయ్యి రూపాయలు ఇచ్చారు',
    'btn-process-manual': 'వివరాలు సేకరించు',
    'conf-modal-title': 'వివరాల నిర్ధారణ (Confirmation)',
    'conf-lbl-name': 'అతిథి పేరు (Guest Name) *',
    'conf-lbl-village': 'గ్రామం (Village) *',
    'conf-lbl-amount': 'కానుక మొత్తం (Amount ₹) *',
    'conf-lbl-phone': 'మొబైల్ సంఖ్య (Phone Number)',
    'conf-lbl-audio': 'రికార్డెడ్ వాయిస్:',
    'conf-lbl-readback': 'సేవ్ చేసినప్పుడు వివరాలను వాయిస్ చదివి వినిపించు (Audio Readback)',
    'btn-discard-confirm': 'రద్దు చేయి',
    'btn-save-confirm': 'సేవ్ చేయి',
    'settings-title-text': 'అప్లికేషన్ సెట్టింగులు',
    'settings-subtitle-text': 'Configure connection settings',
    'settings-operator-hdr': 'ఆపరేటర్ వివరాలు (Operator Info)',
    'settings-operator-lbl': 'ఆపరేటర్ పేరు (Volunteer/Operator Name):',
    'settings-supabase-hdr': 'Supabase కనెక్షన్',
    'settings-url-lbl': 'Supabase URL:',
    'settings-key-lbl': 'Supabase Anon Key:',
    'settings-sql-title': 'Supabase SQL స్కీమా (Copy Schema)',
    'settings-sql-note': 'గమనిక: "wedding-audio" అనే స్టోరేజ్ బకెట్‌ను కూడా పబ్లిక్‌గా క్రియేట్ చేయాలి.',
    'settings-openai-hdr': 'AI API సెట్టింగులు (ঐಚ್ఛికం)',
    'settings-openai-lbl': 'OpenAI API Key (Whisper/GPT-4o):',
    'settings-openai-desc': 'కీ జోడిస్తే మెరుగైన ఆక్యురేసీతో తెలుగును ట్రాన్స్‌క్రైబ్ చేస్తుంది. లేదంటే బ్రౌజర్ స్పీచ్ API వాడుతుంది (ఉచితం).',
    'settings-clear-hdr': 'డేటా క్లియర్',
    'settings-clear-lbl': 'ఆఫ్‌లైన్ లోకల్ డేటాను పూర్తిగా తుడిచివేయండి:',
    'btn-clear-local': 'డెలిట్ చెయ్',
    'btn-save-settings': 'సెట్టింగ్స్ సేవ్ చేయి',
    'footer-copy': '© 2026 పెళ్ళి కానుక వాయిస్ మేనేజ్మెంట్ సిస్టమ్. All Rights Reserved.',
    'footer-dev': 'తయారు చేసినది: ఆటోమేటిక్ వాయిస్ రికార్డర్ & AI వివరాల గుర్తింపు'
  },
  en: {
    'brand-title': 'Pelli Kaanuka',
    'brand-badge': 'Voice',
    'brand-sub': 'Pelli Kaanuka Voice Management System',
    'tab-dashboard-text': 'Dashboard',
    'tab-record-text': 'Record Gift',
    'stat-total-amount-lbl': 'Total Cash Collection',
    'stat-total-amount-sub': 'Total amount collected value',
    'stat-total-guests-lbl': 'Total Guests',
    'stat-total-guests-sub': 'Number of registered donors',
    'stat-today-amount-lbl': 'Today\'s Collection',
    'search-name': 'Search by guest name...',
    'search-village': 'Search by village name...',
    'filter-date-lbl': 'Date:',
    'table-title': 'Gifts Register',
    'table-subtitle': 'Table of all registered gift details',
    'btn-export-excel-text': 'Excel (CSV)',
    'btn-export-pdf-text': 'PDF Report',
    'th-sno': 'S.No',
    'th-name': 'Guest Name',
    'th-village': 'Village',
    'th-amount': 'Amount',
    'th-phone': 'Mobile',
    'th-voice': 'Voice Recording',
    'th-actions': 'Actions',
    'filtered-total-lbl': 'Filtered Total:',
    'info-title': 'How to Record via Voice',
    'info-desc': 'Click the microphone button and say the guest details in English or Telugu.<br>Example: <strong class="text-maroon dark:text-gold-light">"Ramesh from Pochampally one thousand one hundred sixteen rupees"</strong> or <strong class="text-maroon dark:text-gold-light">"Pochampally Ramesh given 1116 rupees, mobile number 9876543210"</strong>.',
    'transcript-header-lbl': 'Speech Transcript:',
    'btn-show-manual-text': 'Enter details manually via keyboard',
    'manual-header': 'Manual Text Entry',
    'manual-label': 'Type the spoken sentence:',
    'manual-text': 'E.g., Ramesh from Pochampally gave 1000 rupees',
    'btn-process-manual': 'Extract Details',
    'conf-modal-title': 'Confirm Gift Details',
    'conf-lbl-name': 'Guest Name *',
    'conf-lbl-village': 'Village *',
    'conf-lbl-amount': 'Gift Cash Amount (₹) *',
    'conf-lbl-phone': 'Mobile Number',
    'conf-lbl-audio': 'Recorded Voice:',
    'conf-lbl-readback': 'Speak confirmation readback on save',
    'btn-discard-confirm': 'Discard',
    'btn-save-confirm': 'Save Entry',
    'settings-title-text': 'Application Settings',
    'settings-subtitle-text': 'Configure connection settings',
    'settings-operator-hdr': 'Operator Info',
    'settings-operator-lbl': 'Operator Name (Volunteer):',
    'settings-supabase-hdr': 'Supabase Sync Connection',
    'settings-url-lbl': 'Supabase Database URL:',
    'settings-key-lbl': 'Supabase Anon Key:',
    'settings-sql-title': 'Supabase SQL Table Schema',
    'settings-sql-note': 'Note: You must also create a public storage bucket named "wedding-audio".',
    'settings-openai-hdr': 'AI API Settings (Optional)',
    'settings-openai-lbl': 'OpenAI API Key (Whisper/GPT-4):',
    'settings-openai-desc': 'Providing a key enables OpenAI Whisper and GPT-4o-mini for superior transcription and parsing. Otherwise browser speech synthesis is used (Free).',
    'settings-clear-hdr': 'Reset Data',
    'settings-clear-lbl': 'Permanently delete all locally saved entries:',
    'btn-clear-local': 'Clear Storage',
    'btn-save-settings': 'Save Configuration',
    'footer-copy': '© 2026 Pelli Kaanuka Voice Management System. All Rights Reserved.',
    'footer-dev': 'Powered by Automatic Voice Recorder & AI Information Extraction'
  }
};

function updateUIStrings() {
  const lang = appState.language;
  const dict = TRANSLATIONS[lang];

  for (const id in dict) {
    const el = document.getElementById(id);
    if (!el) continue;

    const value = dict[id];
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = value;
    } else {
      if (id === 'btn-process-manual' || id === 'btn-discard-confirm' || id === 'btn-save-confirm' || id === 'btn-clear-local' || id === 'btn-save-settings') {
        el.innerText = value;
      } else {
        el.innerHTML = value;
      }
    }
  }
}

function toggleLanguage() {
  const newLang = appState.language === 'te' ? 'en' : 'te';
  setLanguage(newLang);
  showToast(newLang === 'te' ? 'భాష తెలుగులోకి మార్చబడింది.' : 'Language changed to English.');
}

function setLanguage(lang) {
  appState.language = lang;
  localStorage.setItem('pelli_language', lang);
  document.documentElement.lang = lang;
  if (DOM.langToggleText) {
    DOM.langToggleText.innerText = lang === 'te' ? 'English' : 'తెలుగు';
  }
  if (appState.recognition) {
    appState.recognition.lang = lang === 'te' ? 'te-IN' : 'en-US';
  }
  updateUIStrings();
  renderStats();
  renderEntriesTable();
  updateConnectionStatusBadge();
}

// ==========================================
// LIVE DATABASE VALUE TRANSLATOR
// ==========================================
const LOCAL_TRANSLATION_MAP = {
  // Telugu -> English
  'రమేష్': 'Ramesh',
  'సురేష్': 'Suresh',
  'శేఖర్': 'Shekhar',
  'రాజయ్య': 'Rajayya',
  'రాము': 'Ramu',
  'సరిత': 'Saritha',
  'కవిత': 'Kavitha',
  'లక్ష్మి': 'Lakshmi',
  'వెంకటేష్': 'Venkatesh',
  'అతిథి': 'Guest',
  'హైదరాబాద్': 'Hyderabad',
  'కరీంనగర్': 'Karimnagar',
  'పోచంపల్లి': 'Pochampally',
  'వరంగల్': 'Warangal',
  'విజయవాడ': 'Vijayawada',
  'గుంటూరు': 'Guntur',
  'సిరిసిల్ల': 'Sircilla',
  'నిజామాబాద్': 'Nizamabad',
  'ఖమ్మం': 'Khammam',
  'తెలియదు': 'Unknown',
  'హర్షవర్ధన్ రెడ్డి': 'Harshavardhan Reddy',
  'రాజిరెడ్డి s/o సమ్మి రెడ్డి': 'RajiReddy s/o Sammi Reddy',
  'రాజిరెడ్డి తండ్రి సమ్మి రెడ్డి': 'RajiReddy s/o Sammi Reddy',
  'కట్ల': 'Katla',
  'హర్షవర్ధన్': 'Harshavardhan',
  'రెడ్డి': 'Reddy',
  'సమ్మి': 'Sammi',
  'రాజిరెడ్డి': 'RajiReddy',
  'రాజి': 'Raji',
  'ఉదయ్': 'Uday',
  'కుమార్': 'Kumar',
  'కిరణ్': 'Kiran',
  'శ్రీనివాస్': 'Srinivas',
  'ప్రసాద్': 'Prasad',
  'రావు': 'Rao',
  'వెంకట్': 'Venkat',
  'మోహన్': 'Mohan',
  'కృష్ణ': 'Krishna',
  'నరేష్': 'Naresh',
  'మాధవి': 'Madhavi',
  'లత': 'Latha',
  'ఆంజనేయులు': 'Anjaneyulu',
  'మల్లేష్': 'Mallesh',
  'స్వామి': 'Swamy',
  
  // English -> Telugu
  'ramesh': 'రమేష్',
  'suresh': 'సురేష్',
  'shekhar': 'శేఖర్',
  'rajayya': 'రాజయ్య',
  'ramu': 'రాము',
  'saritha': 'సరిత',
  'kavitha': 'కవిత',
  'lakshmi': 'లక్ష్మి',
  'venkatesh': 'వెంకటేష్',
  'guest': 'అతిథి',
  'hyderabad': 'హైదరాబాద్',
  'karimnagar': 'కరీంనగర్',
  'pochampally': 'పోచంపల్లి',
  'pochampalli': 'పోచంపల్లి',
  'warangal': 'వరంగల్',
  'vijayawada': 'విజయవాడ',
  'guntur': 'గుంటూరు',
  'sircilla': 'సిరిసిల్ల',
  'nizamabad': 'నిజామాబాద్',
  'khammam': 'ఖమ్మం',
  'unknown': 'తెలియదు',
  'harshavardhan reddy': 'హర్షవర్ధన్ రెడ్డి',
  'rajireddy s/o sammi reddy': 'రాజిరెడ్డి s/o సమ్మి రెడ్డి',
  'rajireddy father sammi reddy': 'రాజిరెడ్డి తండ్రి సమ్మి రెడ్డి',
  'katla': 'కట్ల',
  'harshavardhan': 'హర్షవర్ధన్',
  'reddy': 'రెడ్డి',
  'sammi': 'సమ్మి',
  'rajireddy': 'రాజిరెడ్డి',
  'raji': 'రాజి',
  'uday': 'ఉదయ్',
  'kumar': 'కుమార్',
  'kiran': 'కిరణ్',
  'srinivas': 'శ్రీనివాస్',
  'prasad': 'ప్రసాద్',
  'rao': 'రావు',
  'venkat': 'వెంకట్',
  'mohan': 'మోహన్',
  'krishna': 'కృష్ణ',
  'naresh': 'నరేష్',
  'madhavi': 'మాధవి',
  'latha': 'లత',
  'anjaneyulu': 'ఆంజనేయులు',
  'mallesh': 'మల్లేష్',
  'swamy': 'స్వామి'
};

function translateWordLocal(word, targetLang) {
  if (!word) return '';
  const trimmedWord = word.trim();
  const cleanWord = trimmedWord.toLowerCase();
  
  // Try full string direct lookup in local dictionary first (most accurate)
  if (targetLang === 'en') {
    for (const teKey in LOCAL_TRANSLATION_MAP) {
      if (teKey === trimmedWord) {
        return LOCAL_TRANSLATION_MAP[teKey];
      }
    }
  } else {
    const match = LOCAL_TRANSLATION_MAP[cleanWord];
    if (match) return match;
  }
  
  // If not found, try translating word-by-word (token translation)
  const tokens = trimmedWord.split(/\s+/);
  if (tokens.length > 1) {
    const translatedTokens = tokens.map(token => {
      // Strip punctuation for matching
      const cleanToken = token.replace(/[,.!?;:]/g, '');
      if (targetLang === 'en') {
        for (const teKey in LOCAL_TRANSLATION_MAP) {
          if (teKey === cleanToken) {
            return LOCAL_TRANSLATION_MAP[teKey];
          }
        }
      } else {
        const match = LOCAL_TRANSLATION_MAP[cleanToken.toLowerCase()];
        if (match) return match;
      }
      return token; // fallback to original token
    });
    
    return translatedTokens.join(' ');
  }
  
  return word; // Fallback to original
}

async function translateTextWithGPT(name, village, targetLang, apiKey) {
  const prompt = targetLang === 'en' 
    ? `Translate these Telugu names to English spelling/phonetics. Return a JSON object with keys "guest_name" and "village".
Input Name: "${name}"
Input Village: "${village}"`
    : `Translate these English names/locations to Telugu script. Return a JSON object with keys "guest_name" and "village".
Input Name: "${name}"
Input Village: "${village}"`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an accurate English-Telugu text translator. Return strictly a valid JSON object: {"guest_name": "...", "village": "..."}'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });
  
  if (!res.ok) throw new Error('OpenAI Translation failed');
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function triggerBackgroundTranslation(entry, targetLang) {
  const cacheKey = `trans_${entry.id}_${targetLang}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    // Render from cache
    const parsed = JSON.parse(cached);
    const nameEl = document.getElementById(`cell-name-${entry.id}`);
    const villageEl = document.getElementById(`cell-village-${entry.id}`);
    if (nameEl) nameEl.innerText = parsed.guest_name;
    if (villageEl) villageEl.innerText = parsed.village;
    return;
  }

  const settings = getSettings();
  if (!settings.openaiKey) return; // No key for cloud translation

  // Check if both words already translated locally
  const nameTranslation = translateWordLocal(entry.guest_name, targetLang);
  const villageTranslation = translateWordLocal(entry.village, targetLang);
  const nameChanged = nameTranslation !== entry.guest_name;
  const villageChanged = villageTranslation !== entry.village;
  
  if (nameChanged && villageChanged) {
    return; // Already handled by local mapper
  }

  try {
    const result = await translateTextWithGPT(entry.guest_name, entry.village, targetLang, settings.openaiKey);
    localStorage.setItem(cacheKey, JSON.stringify(result));
    
    // Update active DOM elements directly
    const nameEl = document.getElementById(`cell-name-${entry.id}`);
    const villageEl = document.getElementById(`cell-village-${entry.id}`);
    if (nameEl) nameEl.innerText = result.guest_name;
    if (villageEl) villageEl.innerText = result.village;
  } catch (err) {
    console.error('OpenAI translation failed:', err);
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-amber-600';
  toast.className = `flex items-center gap-2 text-white px-4 py-3 rounded-xl shadow-lg border border-white/10 ${bg} animate-in slide-in-from-bottom duration-300 text-xs font-semibold`;
  
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check"></i>' 
    : type === 'error' 
      ? '<i class="fa-solid fa-circle-xmark"></i>' 
      : '<i class="fa-solid fa-circle-exclamation"></i>';
      
  toast.innerHTML = `${icon} <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// THEME & INITIAL DATA LOADING
// ==========================================
function initTheme() {
  const isDark = localStorage.getItem('pelli_dark_theme') === 'true';
  if (isDark) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('pelli_dark_theme', isDark);
}

async function loadData() {
  try {
    appState.entries = await getGiftEntries();
    renderStats();
    renderEntriesTable();
  } catch (e) {
    console.error('Error loading entries:', e);
    showToast('డేటా లోడ్ చేయడంలో విఫలమైంది.', 'error');
  }
}

// ==========================================
// TABS & NAVIGATION
// ==========================================
function switchTab(activeTab) {
  if (activeTab === 'dashboard') {
    DOM.tabDashboard.className = 'flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 bg-maroon text-white dark:bg-gold dark:text-maroon shadow-md';
    DOM.tabRecord.className = 'flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-maroon-light dark:text-gray-300 hover:bg-gold/10';
    DOM.viewDashboard.classList.remove('hidden');
    DOM.viewRecord.classList.add('hidden');
    loadData(); // Reload data when returning to dashboard
  } else {
    DOM.tabRecord.className = 'flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 bg-maroon text-white dark:bg-gold dark:text-maroon shadow-md';
    DOM.tabDashboard.className = 'flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-maroon-light dark:text-gray-300 hover:bg-gold/10';
    DOM.viewRecord.classList.remove('hidden');
    DOM.viewDashboard.classList.add('hidden');
    resetRecordingUI();
  }
}

// ==========================================
// STATS RENDERER
// ==========================================
function renderStats() {
  const entries = appState.entries;
  
  // Total Amount
  const totalAmount = entries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  DOM.statTotalAmount.innerText = `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  // Total Guests
  DOM.statTotalGuests.innerText = entries.length;
  
  // Today's Collection
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => e.created_at.startsWith(todayStr));
  const todayAmount = todayEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  
  DOM.statTodayAmount.innerText = `₹${todayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (appState.language === 'te') {
    DOM.statTodayGuests.innerText = `${todayEntries.length} అతిథులు ఈ రోజు ఇచ్చారు`;
  } else {
    DOM.statTodayGuests.innerText = `${todayEntries.length} guests gave today`;
  }
}

// ==========================================
// ENTRIES TABLE RENDERER
// ==========================================
async function renderEntriesTable() {
  const sName = DOM.searchName.value.toLowerCase().trim();
  const sVillage = DOM.searchVillage.value.toLowerCase().trim();
  const fDate = DOM.filterDate.value;

  // Filter entries
  const filtered = appState.entries.filter(entry => {
    const nameMatch = !sName || entry.guest_name.toLowerCase().includes(sName);
    const villageMatch = !sVillage || entry.village.toLowerCase().includes(sVillage);
    
    let dateMatch = true;
    if (fDate) {
      const entryDate = entry.created_at.split('T')[0];
      dateMatch = (entryDate === fDate);
    }
    
    return nameMatch && villageMatch && dateMatch;
  });

  // Calculate filtered sum
  const filteredSum = filtered.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  
  if (sName || sVillage || fDate) {
    DOM.tableSummaryFooter.classList.remove('hidden');
    DOM.filteredTotalVal.innerText = `₹${filteredSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  } else {
    DOM.tableSummaryFooter.classList.add('hidden');
  }

  // Clear existing rows
  DOM.entriesTbody.innerHTML = '';

  if (filtered.length === 0) {
    const emptyMsg = appState.language === 'te' 
      ? 'అడిగిన వివరాలతో ఏ రికార్డులు దొరకలేదు.' 
      : 'No records found with matching criteria.';
    DOM.entriesTbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">
          <div class="flex flex-col items-center gap-2">
            <i class="fa-solid fa-folder-open text-3xl text-gold/50"></i>
            <span id="empty-table-text">${emptyMsg}</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Render Rows
  for (let idx = 0; idx < filtered.length; idx++) {
    const entry = filtered[idx];
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gold/5 dark:hover:bg-gold/2 transition-colors border-b border-gray-100 dark:border-gray-800 text-maroon-light dark:text-gray-300';
    
    const displayDate = new Date(entry.created_at).toLocaleDateString(appState.language === 'te' ? 'te-IN' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const translatedName = translateWordLocal(entry.guest_name, appState.language);
    const translatedVillage = translateWordLocal(entry.village, appState.language);

    // Handle local audio URLs for resolution
    let audioButtonHtml = appState.language === 'te' 
      ? '<span class="text-xs text-gray-400 italic">వాయిస్ లేదు</span>' 
      : '<span class="text-xs text-gray-400 italic">No Audio</span>';
    if (entry.audio_url) {
      audioButtonHtml = `
        <button onclick="playEntryAudio('${entry.id}')" id="play-btn-${entry.id}" class="text-maroon dark:text-gold bg-gold/15 p-2 rounded-lg hover:scale-105 active:scale-95 transition" title="${appState.language === 'te' ? 'వాయిస్ వినండి' : 'Play Voice'}">
          <i class="fa-solid fa-play"></i>
        </button>
      `;
    }

    // Phone HTML
    const phoneHtml = entry.phone 
      ? `<span class="font-mono text-xs">${entry.phone}</span>` 
      : (appState.language === 'te' ? '<span class="text-xs text-gray-400 italic">లేదు</span>' : '<span class="text-xs text-gray-400 italic">None</span>');

    tr.innerHTML = `
      <td class="py-4 px-4 text-center font-bold text-gray-400">${idx + 1}</td>
      <td class="py-4 px-4 font-bold text-maroon dark:text-gold" id="cell-name-${entry.id}">${translatedName}</td>
      <td class="py-4 px-4 font-medium" id="cell-village-${entry.id}">${translatedVillage}</td>
      <td class="py-4 px-4 text-right font-extrabold text-base text-maroon dark:text-gold-light">₹${parseFloat(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="py-4 px-4">${phoneHtml}</td>
      <td class="py-4 px-4 text-center">${audioButtonHtml}</td>
      <td class="py-4 px-4 text-center no-print">
        <div class="flex items-center justify-center gap-1.5">
          ${entry.phone ? `
            <a href="${generateWhatsAppLink(entry)}" target="_blank" class="text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 p-2 rounded-lg hover:scale-105 transition" title="${appState.language === 'te' ? 'WhatsApp ధృవీకరణ పంపండి' : 'Send WhatsApp Confirmation'}">
              <i class="fa-brands fa-whatsapp text-md"></i>
            </a>
          ` : ''}
          <button onclick="printSingleReceipt('${entry.id}')" class="text-sky-600 bg-sky-100 dark:bg-sky-950/30 p-2 rounded-lg hover:scale-105 transition" title="${appState.language === 'te' ? 'రసీదు ముద్రించు' : 'Print Receipt'}">
            <i class="fa-solid fa-print"></i>
          </button>
          <button onclick="editEntryAction('${entry.id}')" class="text-amber-600 bg-amber-100 dark:bg-amber-950/30 p-2 rounded-lg hover:scale-105 transition" title="${appState.language === 'te' ? 'సవరించు' : 'Edit'}">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteEntryAction('${entry.id}')" class="text-rose-600 bg-rose-100 dark:bg-rose-950/30 p-2 rounded-lg hover:scale-105 transition" title="${appState.language === 'te' ? 'తొలగించు' : 'Delete'}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    DOM.entriesTbody.appendChild(tr);

    // Trigger background OpenAI translation or load from cache
    triggerBackgroundTranslation(entry, appState.language);
  }
}

// Generate WhatsApp direct API link
function generateWhatsAppLink(entry) {
  const message = appState.language === 'te'
    ? `నమస్కారం ${entry.guest_name} గారు. మీ పెల్లి కానుక ₹${parseFloat(entry.amount)} (${entry.village}) విజయవంతంగా నమోదు చేయబడింది. ధన్యవాదాలు.`
    : `Hello ${entry.guest_name}. Your wedding gift of ₹${parseFloat(entry.amount)} (${entry.village}) has been successfully registered. Thank you.`;
  return `https://api.whatsapp.com/send?phone=91${entry.phone}&text=${encodeURIComponent(message)}`;
}

// Global scope bindings for dynamic row action buttons
window.playEntryAudio = async function (id) {
  const entry = appState.entries.find(e => e.id === id);
  if (!entry) return;
  
  const playBtn = document.getElementById(`play-btn-${id}`);
  const icon = playBtn.querySelector('i');
  
  // If already playing another audio, stop it
  if (window.currentPlayingAudio) {
    window.currentPlayingAudio.pause();
    if (window.currentPlayingBtnId) {
      const prevBtn = document.getElementById(window.currentPlayingBtnId);
      if (prevBtn) prevBtn.querySelector('i').className = 'fa-solid fa-play';
    }
  }
  
  try {
    const url = await resolveAudioUrl(entry);
    if (!url) {
      showToast('వాయిస్ రికార్డింగ్ ఫైల్ దొరకలేదు.', 'error');
      return;
    }
    
    icon.className = 'fa-solid fa-spinner animate-spin';
    const audio = new Audio(url);
    window.currentPlayingAudio = audio;
    window.currentPlayingBtnId = `play-btn-${id}`;
    
    audio.oncanplaythrough = () => {
      icon.className = 'fa-solid fa-pause';
      audio.play();
    };
    
    audio.onended = () => {
      icon.className = 'fa-solid fa-play';
      window.currentPlayingAudio = null;
      window.currentPlayingBtnId = null;
    };
    
    audio.onerror = () => {
      icon.className = 'fa-solid fa-play';
      showToast('వాయిస్ ప్లే చేయడంలో లోపం సంభవించింది.', 'error');
    };
  } catch (err) {
    icon.className = 'fa-solid fa-play';
    console.error('Audio playback error:', err);
  }
};

window.printSingleReceipt = function (id) {
  const entry = appState.entries.find(e => e.id === id);
  if (!entry) return;
  
  const dateObj = new Date(entry.created_at);
  if (appState.language === 'te') {
    DOM.printReceiptDate.innerText = `తేదీ: ${dateObj.toLocaleDateString('te-IN')} సమయం: ${dateObj.toLocaleTimeString('te-IN')}`;
  } else {
    DOM.printReceiptDate.innerText = `Date: ${dateObj.toLocaleDateString('en-US')} Time: ${dateObj.toLocaleTimeString('en-US')}`;
  }
  
  // Translate printable template texts on-the-fly
  const receiptH2 = DOM.printReceipt.querySelector('h2');
  const receiptH3 = DOM.printReceipt.querySelector('h3');
  const labels = DOM.printReceipt.querySelectorAll('.py-4 span:first-child');
  const footerTxt = DOM.printReceipt.querySelector('.pt-4 p');
  
  if (appState.language === 'te') {
    receiptH2.innerText = 'శ్రీరస్తు శుభమస్తు';
    receiptH3.innerText = 'పెళ్ళి కానుక రసీదు';
    labels[0].innerText = 'అతిథి పేరు:';
    labels[1].innerText = 'గ్రామం:';
    labels[2].innerText = 'కానుక మొత్తం:';
    labels[3].innerText = 'మొబైల్:';
    labels[4].innerText = 'ఆపరేటర్:';
    footerTxt.innerText = 'ధన్యవాదాలు - వధూవరులు';
  } else {
    receiptH2.innerText = 'Best Wedding Wishes';
    receiptH3.innerText = 'Wedding Gift Receipt';
    labels[0].innerText = 'Guest Name:';
    labels[1].innerText = 'Village:';
    labels[2].innerText = 'Gift Amount:';
    labels[3].innerText = 'Mobile:';
    labels[4].innerText = 'Operator:';
    footerTxt.innerText = 'Thank You - Bride & Groom';
  }
  
  DOM.printReceiptName.innerText = entry.guest_name;
  DOM.printReceiptVillage.innerText = entry.village;
  DOM.printReceiptAmount.innerText = `₹${parseFloat(entry.amount).toLocaleString('en-IN')}`;
  DOM.printReceiptPhone.innerText = entry.phone || '---';
  DOM.printReceiptOperator.innerText = entry.operator_name || 'Volunteer';
  
  // Trigger system print
  window.print();
};

window.deleteEntryAction = async function (id) {
  if (confirm('ఈ కానుక రికార్డును ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?')) {
    const res = await deleteGiftEntry(id);
    if (res.success) {
      showToast('రికార్డ్ విజయవంతంగా తొలగించబడింది.');
      loadData();
    } else {
      showToast('రికార్డ్ తొలగించడంలో విఫలమైంది: ' + res.error, 'error');
    }
  }
};

// ==========================================
// AUDIO RECORDING & AUDIO VISUALIZER
// ==========================================
async function startAudioRecording() {
  appState.audioChunks = [];
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('ఈ బ్రౌజర్ మోడ్‌లో మైక్రోఫోన్ అందుబాటులో లేదు (Localhost లేదా HTTPS అవసరం). కీబోర్డ్ ద్వారా వివరాలు నమోదు చేయండి.', 'error');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose optimal audio MIME type
    let options = { mimeType: 'audio/webm' };
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      options = { mimeType: 'audio/ogg' };
    }
    
    appState.mediaRecorder = new MediaRecorder(stream, options);
    appState.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        appState.audioChunks.push(event.data);
      }
    };
    
    appState.mediaRecorder.onstop = () => {
      appState.audioBlob = new Blob(appState.audioChunks, { type: appState.mediaRecorder.mimeType });
      // Stop all tracks to release mic
      stream.getTracks().forEach(track => track.stop());
    };
    
    appState.mediaRecorder.start(250); // Get chunks every 250ms
    startVisualizer(stream);
    return true;
  } catch (e) {
    console.error('Microphone access denied or failed:', e);
    showToast('మైక్రోఫోన్ అనుమతి ఇవ్వబడలేదు లేదా పరికరం కనెక్ట్ కాలేదు.', 'error');
    return false;
  }
}

function stopAudioRecording() {
  if (appState.mediaRecorder && appState.mediaRecorder.state !== 'inactive') {
    appState.mediaRecorder.stop();
  }
  stopVisualizer();
}

function startVisualizer(stream) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 32;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const bars = document.querySelectorAll('.visualizer-bar');
    
    function draw() {
      if (!analyser) return;
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      bars.forEach((bar, idx) => {
        const val = dataArray[idx % bufferLength] || 0;
        const height = 8 + (val / 255) * 44; // Scale heights
        bar.style.height = `${height}px`;
      });
    }
    draw();
  } catch (e) {
    console.error('Visualizer context setup failed:', e);
  }
}

function stopVisualizer() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (audioCtx) audioCtx.close();
  audioCtx = null;
  analyser = null;
  source = null;
}

// ==========================================
// SPEECH TO TEXT RECOGNITION (WEB SPEECH)
// ==========================================
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition not supported in this browser.');
    return false;
  }

  appState.recognition = new SpeechRecognition();
  appState.recognition.continuous = true;
  appState.recognition.interimResults = true;
  appState.recognition.lang = appState.language === 'te' ? 'te-IN' : 'en-US';

  appState.recognition.onstart = () => {
    DOM.recordStatusTitle.innerText = appState.language === 'te' ? 'నేను వింటున్నాను... మాట్లాడండి' : 'I am listening... Please speak';
    DOM.recordStatusSubtitle.innerText = appState.language === 'te' ? 'Listening in Telugu...' : 'Listening in English...';
    DOM.recordTranscript.innerText = '';
    DOM.transcriptContainer.classList.remove('hidden');
    DOM.micRipple.classList.remove('hidden');
    DOM.btnRecordMic.classList.add('recording-pulse-active');
  };

  appState.recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const currentText = finalTranscript || interimTranscript;
    if (currentText.trim()) {
      DOM.recordTranscript.innerText = currentText;
    }
    
    // Auto-silence timer resets when they speak
    resetSpeechTimeout();
  };

  appState.recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'no-speech') {
      const errStr = appState.language === 'te' ? 'స్పీచ్ ఏదీ గుర్తించబడలేదు. మళ్ళీ ప్రయత్నించండి.' : 'No speech detected. Please try again.';
      showToast(errStr, 'warning');
    }
  };

  appState.recognition.onend = () => {
    if (appState.isRecording) {
      stopRecordingSession();
    }
  };

  return true;
}

function resetSpeechTimeout() {
  if (appState.speechTimeout) clearTimeout(appState.speechTimeout);
  // Auto stop if user stops speaking for 5 seconds
  appState.speechTimeout = setTimeout(() => {
    if (appState.isRecording) {
      const silenceStr = appState.language === 'te' ? 'నిశ్శబ్దం కారణంగా రికార్డింగ్ ఆపివేయబడింది.' : 'Recording stopped due to silence.';
      showToast(silenceStr, 'info');
      stopRecordingSession();
    }
  }, 5000);
}

// ==========================================
// RECORDING SESSION CONTROLLER
// ==========================================
async function startRecordingSession() {
  const hasMic = await startAudioRecording();
  if (!hasMic) return;

  appState.isRecording = true;
  DOM.visualizerContainer.classList.remove('hidden');
  DOM.manualInputCard.classList.add('hidden'); // Close manual input

  const settings = getSettings();
  if (settings.openaiKey) {
    // If OpenAI key is active, we only record audio locally first, transcribing on stop
    DOM.recordStatusTitle.innerText = 'ఆడియో రికార్డ్ అవుతోంది...';
    DOM.recordStatusSubtitle.innerText = 'Recording audio for OpenAI Whisper...';
    DOM.micRipple.classList.remove('hidden');
    DOM.btnRecordMic.classList.add('recording-pulse-active');
  } else {
    // Web Speech API real-time mode
    if (appState.recognition) {
      try {
        appState.recognition.start();
        resetSpeechTimeout();
      } catch (err) {
        console.error('Error starting Speech recognition:', err);
        // Fallback to audio only
        DOM.recordStatusTitle.innerText = 'ఆడియో రికార్డ్ అవుతోంది...';
      }
    } else {
      DOM.recordStatusTitle.innerText = 'ఆడియో రికార్డ్ అవుతోంది...';
    }
  }
}

async function stopRecordingSession() {
  appState.isRecording = false;
  if (appState.speechTimeout) clearTimeout(appState.speechTimeout);
  
  stopAudioRecording();
  
  if (appState.recognition) {
    try {
      appState.recognition.stop();
    } catch (e) {}
  }

  // Restore UI buttons
  DOM.micRipple.classList.add('hidden');
  DOM.btnRecordMic.classList.remove('recording-pulse-active');
  DOM.visualizerContainer.classList.add('hidden');

  DOM.recordStatusTitle.innerText = 'రికార్డింగ్ పూర్తయింది. ప్రాసెస్ అవుతోంది...';
  
  // Wait a small bit to ensure MediaRecorder has output the final blob
  setTimeout(async () => {
    const transcriptText = DOM.recordTranscript.innerText.trim();
    const settings = getSettings();

    if (settings.openaiKey && appState.audioBlob) {
      // Use OpenAI API if active
      await processWithOpenAI(appState.audioBlob, settings.openaiKey);
    } else if (transcriptText && transcriptText !== '...మాట్లాడటం ప్రారంభించండి...') {
      // Extract with local parser
      processTranscriptLocal(transcriptText);
    } else {
      showToast('వాయిస్ నమోదు కాలేదు. దయచేసి స్పష్టంగా మాట్లాడండి.', 'error');
      resetRecordingUI();
    }
  }, 600);
}

function resetRecordingUI() {
  appState.isRecording = false;
  DOM.recordStatusTitle.innerText = appState.language === 'te' ? 'రికార్డ్ చేయడానికి బటన్ నొక్కండి' : 'Click the button to record';
  DOM.recordStatusSubtitle.innerText = appState.language === 'te' ? 'Tap to speak Telugu wedding gifts' : 'Tap to speak English/Telugu wedding gifts';
  DOM.transcriptContainer.classList.add('hidden');
  DOM.recordTranscript.innerText = appState.language === 'te' ? '...మాట్లాడటం ప్రారంభించండి...' : '...Start speaking...';
  DOM.visualizerContainer.classList.add('hidden');
  DOM.micRipple.classList.add('hidden');
  DOM.btnRecordMic.classList.remove('recording-pulse-active');
}

// ==========================================
// TRANSCRIPT PARSING (LOCAL VS OPENAI)
// ==========================================
function processTranscriptLocal(transcript) {
  const result = parseSpeech(transcript, appState.language);
  openConfirmationModal(result);
}

async function processWithOpenAI(audioBlob, apiKey) {
  try {
    showToast('Whisper ద్వారా ఆడియో అనువదించబడుతోంది...');
    
    // 1. Send Audio to Whisper API
    const whisperText = await transcribeWhisper(audioBlob, apiKey);
    DOM.recordTranscript.innerText = whisperText;
    DOM.transcriptContainer.classList.remove('hidden');
    
    // 2. Extract info with GPT-4o-mini
    showToast('AI ద్వారా వివరాలు సేకరించబడుతున్నాయి...');
    const parsedJson = await extractInfoGPT(whisperText, apiKey);
    
    openConfirmationModal(parsedJson);
  } catch (err) {
    console.error('OpenAI processing failed:', err);
    showToast('OpenAI AI ద్వారా అనువాదం వైఫల్యం: ' + err.message, 'error');
    
    // Fallback to local parsing on Whisper transcription text if available
    const fallbackText = DOM.recordTranscript.innerText.trim();
    if (fallbackText && fallbackText !== '...మాట్లాడటం ప్రారంభించండి...') {
      processTranscriptLocal(fallbackText);
    } else {
      resetRecordingUI();
    }
  }
}

async function transcribeWhisper(audioBlob, apiKey) {
  const formData = new FormData();
  // Force file extension to webm so API parses it correctly
  const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('language', 'te');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'Whisper connection failed');
  }

  const data = await res.json();
  return data.text;
}

async function extractInfoGPT(transcript, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert NLP assistant specializing in Telugu wedding gift announcements (Pelli Kaanukalu). 
Parse the input transcript and extract: guest_name, village, amount, phone, and notes.
- guest_name: Guest name in Telugu (remove honorifics like గారు/గారి).
- village: Village name in Telugu (set to 'తెలియదు' if unspecified).
- amount: Numerical value of cash gift as integer (e.g. 1116).
- phone: 10-digit mobile number if spoken, else empty string.
- notes: Copy the raw transcript.
Return strictly a JSON object: {"guest_name": "...", "village": "...", "amount": 0, "phone": "...", "notes": "..."}`
        },
        {
          role: 'user',
          content: transcript
        }
      ]
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'GPT connection failed');
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ==========================================
// CONFIRMATION MODAL & SAVE FLOW
// ==========================================
async function openConfirmationModal(parsed) {
  DOM.confName.value = parsed.guest_name || '';
  DOM.confVillage.value = parsed.village || '';
  DOM.confAmount.value = parsed.amount || '';
  DOM.confPhone.value = parsed.phone || '';
  
  // Set up audio preview if we recorded something
  if (appState.audioBlob) {
    const objectUrl = URL.createObjectURL(appState.audioBlob);
    DOM.confAudioPlayer.src = objectUrl;
    DOM.confAudioContainer.classList.remove('hidden');
  } else {
    DOM.confAudioPlayer.src = '';
    DOM.confAudioContainer.classList.add('hidden');
  }
  
  DOM.extractionModal.classList.remove('hidden');
}

function closeConfirmationModal() {
  DOM.extractionModal.classList.add('hidden');
  DOM.confAudioPlayer.src = '';
  appState.audioBlob = null;
  appState.activeEditId = null; // Clear edit ID on close
  
  // Restore modal title to default
  const titleEl = document.getElementById('conf-modal-title');
  if (titleEl) {
    titleEl.innerText = appState.language === 'te' ? 'వివరాల నిర్ధారణ (Confirmation)' : 'Confirm Gift Details';
  }
  
  resetRecordingUI();
}

async function handleConfirmationSubmit(e) {
  e.preventDefault();
  
  const existingEntry = appState.activeEditId ? appState.entries.find(e => e.id === appState.activeEditId) : null;
  
  const entry = {
    id: appState.activeEditId || undefined, // Preserve ID if editing!
    guest_name: DOM.confName.value.trim(),
    village: DOM.confVillage.value.trim(),
    amount: parseFloat(DOM.confAmount.value) || 0,
    phone: DOM.confPhone.value.trim(),
    notes: existingEntry ? existingEntry.notes : (DOM.recordTranscript.innerText.trim() !== '...మాట్లాడటం ప్రారంభించండి...' && DOM.recordTranscript.innerText.trim() !== '...Start speaking...' ? DOM.recordTranscript.innerText.trim() : 'Manual Input')
  };

  if (!entry.guest_name || !entry.village || !entry.amount) {
    const errorFieldsMsg = appState.language === 'te' ? 'దయచేసి తప్పనిసరి వివరాలన్నీ నింపండి.' : 'Please fill in all required fields.';
    showToast(errorFieldsMsg, 'warning');
    return;
  }

  // Detect duplicate guest names
  const isDuplicate = appState.entries.some(e => 
    e.id !== appState.activeEditId && // Exclude the current editing record
    e.guest_name.toLowerCase() === entry.guest_name.toLowerCase() && 
    e.village.toLowerCase() === entry.village.toLowerCase()
  );
  if (isDuplicate) {
    const dupMsg = appState.language === 'te'
      ? `గమనిక: "${entry.guest_name} (${entry.village})" పేరుతో ఇప్పటికే ఒక కానుక రికార్డ్ అయి ఉంది. అయినా సేవ్ చేయమంటారా?`
      : `Note: A gift is already recorded for "${entry.guest_name} (${entry.village})". Do you still want to save?`;
    if (!confirm(dupMsg)) {
      return;
    }
  }

  showToast(appState.language === 'te' ? 'సేవ్ చేయబడుతోంది...' : 'Saving...');
  const res = await saveGiftEntry(entry, appState.audioBlob);
  
  if (res.success) {
    const saveMsg = appState.language === 'te'
      ? `కానుక విజయవంతంగా సేవ్ చేయబడింది! (${res.mode === 'supabase' ? 'Supabase' : 'Local DB'})`
      : `Gift successfully saved! (${res.mode === 'supabase' ? 'Supabase' : 'Local DB'})`;
    showToast(saveMsg);
    
    // Play sound readback
    if (DOM.readbackEnabled.checked) {
      speakConfirmation(entry.guest_name, entry.amount);
    }
    
    closeConfirmationModal();
    // Switch to dashboard tab to view new entry
    switchTab('dashboard');
  } else {
    showToast((appState.language === 'te' ? 'సేవ్ చేయడంలో లోపం: ' : 'Error saving: ') + res.error, 'error');
  }
}

window.editEntryAction = function (id) {
  const entry = appState.entries.find(e => e.id === id);
  if (!entry) return;

  appState.activeEditId = entry.id; // Store active edit ID

  // Pre-fill confirmation modal fields with stored details
  DOM.confName.value = entry.guest_name;
  DOM.confVillage.value = entry.village;
  DOM.confAmount.value = entry.amount;
  DOM.confPhone.value = entry.phone || '';

  // Show audio preview if audio is cached locally or remotely
  if (entry.audio_url) {
    if (entry.audio_url.startsWith('local-audio:')) {
      // Resolve from IndexedDB
      const localId = entry.audio_url.split(':')[1];
      getAudioBlob(localId).then(blob => {
        if (blob) {
          appState.audioBlob = blob;
          const objectUrl = URL.createObjectURL(blob);
          DOM.confAudioPlayer.src = objectUrl;
          DOM.confAudioContainer.classList.remove('hidden');
        }
      });
    } else {
      // Direct remote URL
      DOM.confAudioPlayer.src = entry.audio_url;
      DOM.confAudioContainer.classList.remove('hidden');
    }
  } else {
    DOM.confAudioPlayer.src = '';
    DOM.confAudioContainer.classList.add('hidden');
  }

  // Set edit modal title
  const titleEl = document.getElementById('conf-modal-title');
  if (titleEl) {
    titleEl.innerText = appState.language === 'te' ? 'వివరాల సవరణ (Edit Details)' : 'Edit Gift Details';
  }

  DOM.extractionModal.classList.remove('hidden');
};

function speakConfirmation(name, amount) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance();
    if (appState.language === 'te') {
      utterance.text = `${name} గారి కానుక, ${amount} రూపాయలు విజయవంతంగా నమోదు చేయబడింది. ధన్యవాదాలు.`;
      utterance.lang = 'te-IN';
    } else {
      utterance.text = `Thank you ${name}. Your gift of ${amount} rupees has been successfully registered.`;
      utterance.lang = 'en-US';
    }
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes(appState.language));
    if (voice) utterance.voice = voice;
    
    window.speechSynthesis.speak(utterance);
  }
}

// ==========================================
// SETTINGS MANAGEMENT UI
// ==========================================
function loadSettingsUI() {
  const settings = getSettings();
  DOM.settingsOperator.value = settings.operatorName || '';
  DOM.settingsUseSupabase.checked = settings.useSupabase || false;
  DOM.settingsUrl.value = settings.supabaseUrl || '';
  DOM.settingsKey.value = settings.supabaseKey || '';
  DOM.settingsOpenaiKey.value = settings.openaiKey || '';
  
  toggleSupabaseFieldsState();
}

function toggleSupabaseFieldsState() {
  if (DOM.settingsUseSupabase.checked) {
    DOM.supabaseConfigFields.style.opacity = '1';
    DOM.supabaseConfigFields.style.pointerEvents = 'auto';
  } else {
    DOM.supabaseConfigFields.style.opacity = '0.6';
    DOM.supabaseConfigFields.style.pointerEvents = 'none';
  }
}

function updateConnectionStatusBadge() {
  const settings = getSettings();
  if (settings.useSupabase && settings.supabaseUrl) {
    if (window.supabase && supabaseClient) {
      DOM.connStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300/40';
      DOM.connStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Supabase ఆన్‌లైన్</span>';
    } else {
      DOM.connStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-300/40';
      DOM.connStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span><span>Supabase కనెక్ట్ లోపం</span>';
    }
  } else {
    DOM.connStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300/40';
    DOM.connStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>ఆఫ్‌లైన్ లోకల్ మోడ్</span>';
  }
}

function saveSettingsAction() {
  const settings = {
    operatorName: DOM.settingsOperator.value.trim(),
    useSupabase: DOM.settingsUseSupabase.checked,
    supabaseUrl: DOM.settingsUrl.value.trim(),
    supabaseKey: DOM.settingsKey.value.trim(),
    openaiKey: DOM.settingsOpenaiKey.value.trim()
  };
  
  if (settings.useSupabase && (!settings.supabaseUrl || !settings.supabaseKey)) {
    showToast('Supabase ఎంచుకున్నప్పుడు URL మరియు కీ తప్పనిసరి.', 'warning');
    return;
  }
  
  saveSettings(settings);
  showToast('సెట్టింగులు విజయవంతంగా అప్‌డేట్ అయ్యాయి.');
  DOM.settingsOverlay.classList.add('translate-x-full');
  updateConnectionStatusBadge();
  loadData();
}

// Copy SQL schema statement helper
function copySqlSchema() {
  const sqlText = `CREATE TABLE gift_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name TEXT NOT NULL,
    village TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    phone TEXT,
    notes TEXT,
    audio_url TEXT,
    operator_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);`;
  navigator.clipboard.writeText(sqlText)
    .then(() => showToast('SQL స్కీమా క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!'))
    .catch(() => showToast('కాపీ చేయడం కుదరలేదు.', 'error'));
}

// Clear all offline storage cached records
function clearLocalDatabase() {
  if (confirm('మీరు లోకల్‌గా స్టోర్ చేసిన ఆఫ్‌లైన్ రికార్డులను మరియు ఆడియోలను పూర్తిగా తుడిచివేయాలనుకుంటున్నారా? ఈ చర్యను వెనక్కి తీసుకోలేము.')) {
    localStorage.removeItem(STORAGE_KEY_ENTRIES);
    // Trigger IndexedDB database deletion
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => {
      showToast('లోకల్ డేటా విజయవంతంగా క్లియర్ అయింది.');
      initIndexedDB().then(() => {
        loadData();
        DOM.settingsOverlay.classList.add('translate-x-full');
      });
    };
    req.onerror = () => {
      showToast('డేటా క్లియర్ చేయడంలో సమస్య ఏర్పడింది.', 'error');
    };
  }
}

// ==========================================
// EXPORTS REPORT GENERATORS (EXCEL & PDF)
// ==========================================
function exportToExcelCSV() {
  if (appState.entries.length === 0) {
    const noRecordsMsg = appState.language === 'te' ? 'డౌన్‌లోడ్ చేయడానికి ఏ రికార్డులూ లేవు.' : 'No records found to download.';
    showToast(noRecordsMsg, 'warning');
    return;
  }

  // Build CSV content
  const headers = ['S.No (క్రమ సంఖ్య)', 'Guest Name (అతిథి పేరు)', 'Village (గ్రామం)', 'Amount (కానుక ₹)', 'Phone (మొబైల్)', 'Operator (ఆపరేటర్)', 'Date (తేదీ)'];
  const rows = appState.entries.map((e, idx) => {
    const transName = translateWordLocal(e.guest_name, appState.language);
    const transVillage = translateWordLocal(e.village, appState.language);
    
    // Check if background translation is already cached
    const cachedTrans = localStorage.getItem(`trans_${e.id}_${appState.language}`);
    const nameToUse = cachedTrans ? JSON.parse(cachedTrans).guest_name : transName;
    const villageToUse = cachedTrans ? JSON.parse(cachedTrans).village : transVillage;

    return [
      idx + 1,
      `"${nameToUse.replace(/"/g, '""')}"`,
      `"${villageToUse.replace(/"/g, '""')}"`,
      e.amount,
      e.phone ? `'${e.phone}` : '', // Add single quote to prevent Excel scientific notation
      `"${(e.operator_name || 'Volunteer').replace(/"/g, '""')}"`,
      new Date(e.created_at).toLocaleDateString(appState.language === 'te' ? 'te-IN' : 'en-US')
    ];
  });

  // UTF-8 BOM to display Unicode characters correctly in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Pelli_Kaanuka_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  const successMsg = appState.language === 'te' ? 'రిపోర్ట్ CSV ఫార్మాట్‌లో డౌన్‌లోడ్ అయింది.' : 'Report successfully downloaded in CSV format.';
  showToast(successMsg);
}

function exportToPDF() {
  // Since we have a beautifully styled print-layout in standard HTML with no-print classes,
  // calling window.print() is the most reliable, clean, high-fidelity way to generate PDFs
  // directly via the browser's built-in "Save as PDF" print dialog!
  window.print();
}

// ==========================================
// APPLICATION INITIALIZATION & BINDINGS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Themes & Database Setup
  initTheme();
  await initDb();
  
  // 2. Load settings and verify Supabase status
  loadSettingsUI();
  setLanguage(appState.language);
  updateConnectionStatusBadge();
  
  // 3. Load initial tables & stats
  await loadData();

  // 4. Initialize speech recognizer
  initSpeechRecognition();

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  
  // Tab switches
  DOM.tabDashboard.addEventListener('click', () => switchTab('dashboard'));
  DOM.tabRecord.addEventListener('click', () => switchTab('record'));
  
  // Settings Overlay toggle
  DOM.btnSettings.addEventListener('click', () => {
    loadSettingsUI();
    DOM.settingsOverlay.classList.remove('translate-x-full');
  });
  DOM.btnCloseSettings.addEventListener('click', () => {
    DOM.settingsOverlay.classList.add('translate-x-full');
  });
  DOM.settingsUseSupabase.addEventListener('change', toggleSupabaseFieldsState);
  DOM.btnSaveSettings.addEventListener('click', saveSettingsAction);
  DOM.btnCopySql.addEventListener('click', copySqlSchema);
  DOM.btnClearLocal.addEventListener('click', clearLocalDatabase);
  
  // Dark/Light Theme toggle
  DOM.themeToggle.addEventListener('click', toggleTheme);
  
  // Language toggle
  DOM.langToggle.addEventListener('click', toggleLanguage);

  // Search & Filter listeners
  DOM.searchName.addEventListener('input', renderEntriesTable);
  DOM.searchVillage.addEventListener('input', renderEntriesTable);
  DOM.filterDate.addEventListener('change', renderEntriesTable);
  DOM.btnResetFilters.addEventListener('click', () => {
    DOM.searchName.value = '';
    DOM.searchVillage.value = '';
    DOM.filterDate.value = '';
    renderEntriesTable();
    showToast(appState.language === 'te' ? 'ఫిల్టర్లు రీసెట్ చేయబడ్డాయి.' : 'Filters have been reset.', 'info');
  });

  // Recording Actions
  DOM.btnRecordMic.addEventListener('click', () => {
    if (appState.isRecording) {
      stopRecordingSession();
    } else {
      startRecordingSession();
    }
  });

  // Manual input cards toggles
  DOM.btnShowManual.addEventListener('click', () => {
    DOM.manualInputCard.classList.toggle('hidden');
    DOM.manualText.value = '';
    DOM.manualText.focus();
  });
  DOM.btnCloseManual.addEventListener('click', () => {
    DOM.manualInputCard.classList.add('hidden');
  });
  DOM.btnProcessManual.addEventListener('click', () => {
    const text = DOM.manualText.value.trim();
    if (!text) {
      showToast(appState.language === 'te' ? 'దయచేసి వాక్యాన్ని టైప్ చేయండి.' : 'Please type a sentence.', 'warning');
      return;
    }
    DOM.recordTranscript.innerText = text;
    processTranscriptLocal(text);
    DOM.manualInputCard.classList.add('hidden');
  });

  // Confirmation Modal actions
  DOM.confirmationForm.addEventListener('submit', handleConfirmationSubmit);
  DOM.btnDiscardConfirm.addEventListener('click', closeConfirmationModal);
  DOM.btnCancelConfirm.addEventListener('click', closeConfirmationModal);

  // Reports Exports
  DOM.btnExportExcel.addEventListener('click', exportToExcelCSV);
  DOM.btnExportPdf.addEventListener('click', exportToPDF);
});
