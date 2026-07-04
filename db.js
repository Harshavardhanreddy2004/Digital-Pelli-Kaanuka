/**
 * Pelli Kaanuka Voice Management System - Database and Sync Manager
 * Supports offline storage via LocalStorage/IndexedDB and online sync via Supabase.
 */

// Local Storage keys
const STORAGE_KEY_ENTRIES = 'pelli_kaanuka_entries';
const STORAGE_KEY_SETTINGS = 'pelli_kaanuka_settings';

// Initialize IndexedDB for storing audio blobs locally
let localDb = null;
const dbName = 'PelliKaanukaAudioDB';
const storeName = 'audio_blobs';

function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      resolve(null);
    };

    request.onsuccess = (event) => {
      localDb = event.target.result;
      resolve(localDb);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
  });
}

// Store audio blob locally in IndexedDB
function storeAudioBlob(id, blob) {
  return new Promise((resolve, reject) => {
    if (!localDb) {
      resolve(null);
      return;
    }
    const transaction = localDb.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => {
      console.error('Error saving blob to IndexedDB:', e.target.error);
      resolve(false);
    };
  });
}

// Retrieve audio blob from IndexedDB
function getAudioBlob(id) {
  return new Promise((resolve, reject) => {
    if (!localDb) {
      resolve(null);
      return;
    }
    const transaction = localDb.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (e) => {
      console.error('Error retrieving blob:', e.target.error);
      resolve(null);
    };
  });
}

// Delete audio blob from IndexedDB
function deleteAudioBlob(id) {
  return new Promise((resolve, reject) => {
    if (!localDb) {
      resolve(false);
      return;
    }
    const transaction = localDb.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
}

// Supabase Client instance holder
let supabaseClient = null;

// Load connection settings
function getSettings() {
  const defaults = {
    supabaseUrl: '',
    supabaseKey: '',
    operatorName: 'Volunteer',
    openaiKey: '',
    useSupabase: false
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch (e) {
    return defaults;
  }
}

// Save connection settings
function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  initSupabase();
}

// Initialize Supabase Client
function initSupabase() {
  const settings = getSettings();
  if (settings.useSupabase && settings.supabaseUrl && settings.supabaseKey && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(settings.supabaseUrl, settings.supabaseKey);
      console.log('Supabase connection initialized!');
      return true;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      supabaseClient = null;
      return false;
    }
  } else {
    supabaseClient = null;
    return false;
  }
}

// Get all entries (combining local and remote if connected)
async function getGiftEntries() {
  const settings = getSettings();
  
  if (settings.useSupabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('gift_entries')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error fetching from Supabase, falling back to local:', e);
    }
  }

  // Fallback to Local Storage
  try {
    const localData = localStorage.getItem(STORAGE_KEY_ENTRIES);
    let entries = [];
    try {
      entries = localData ? JSON.parse(localData) : [];
    } catch (jsonErr) {
      console.warn('Corrupted local storage data reset:', jsonErr);
      entries = [];
    }
    if (!Array.isArray(entries)) {
      entries = [];
    }
    // Sort descending by created_at
    return entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (e) {
    console.error('Error reading local entries:', e);
    return [];
  }
}

// Save a single gift entry
async function saveGiftEntry(entry, audioBlob = null) {
  const settings = getSettings();
  const id = entry.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }));
  const operatorName = settings.operatorName || 'Volunteer';
  
  const newEntry = {
    id,
    guest_name: entry.guest_name,
    village: entry.village,
    amount: parseFloat(entry.amount) || 0,
    phone: entry.phone || '',
    notes: entry.notes || '',
    audio_url: entry.audio_url || '',
    operator_name: operatorName,
    created_at: entry.created_at || new Date().toISOString()
  };

  // If there's an audio blob, store it locally first in IndexedDB
  if (audioBlob) {
    await storeAudioBlob(id, audioBlob);
    // Create local object URL for playback offline
    newEntry.audio_url = `local-audio:${id}`;
  }

  if (settings.useSupabase && supabaseClient) {
    try {
      let finalAudioUrl = newEntry.audio_url;

      // Upload audio to Supabase Storage if present
      if (audioBlob) {
        const fileExt = 'webm'; // Or whatever recording format is used
        const filePath = `${id}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('wedding-audio')
          .upload(filePath, audioBlob, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabaseClient
            .storage
            .from('wedding-audio')
            .getPublicUrl(filePath);
            
          if (urlData && urlData.publicUrl) {
            finalAudioUrl = urlData.publicUrl;
            newEntry.audio_url = finalAudioUrl;
          }
        }
      }

      // Save to Supabase Table
      const { data, error } = await supabaseClient
        .from('gift_entries')
        .upsert([newEntry], { onConflict: 'id' });

      if (error) throw error;
      return { success: true, entry: newEntry, mode: 'supabase' };
    } catch (e) {
      console.error('Failed to save to Supabase, saving locally instead:', e);
    }
  }

  // Save to Local Storage
  try {
    const localData = localStorage.getItem(STORAGE_KEY_ENTRIES);
    let entries = [];
    try {
      entries = localData ? JSON.parse(localData) : [];
    } catch (parseErr) {
      entries = [];
    }
    if (!Array.isArray(entries)) {
      entries = [];
    }
    
    // Check if entry already exists, update it, otherwise add it
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = newEntry;
    } else {
      entries.push(newEntry);
    }
    
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    return { success: true, entry: newEntry, mode: 'local' };
  } catch (e) {
    console.error('Error saving local entry:', e);
    return { success: false, error: e.message };
  }
}

// Delete a gift entry
async function deleteGiftEntry(id) {
  const settings = getSettings();
  let deletedFromSupabase = false;

  if (settings.useSupabase && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('gift_entries')
        .delete()
        .eq('id', id);
        
      if (!error) {
        deletedFromSupabase = true;
        // Also try deleting audio file from Supabase storage if we know its name
        try {
          await supabaseClient.storage.from('wedding-audio').remove([`${id}.webm`]);
        } catch (storageErr) {
          console.warn('Could not delete storage file:', storageErr);
        }
      } else {
        throw error;
      }
    } catch (e) {
      console.error('Error deleting from Supabase:', e);
    }
  }

  // Delete from local structures
  try {
    const localData = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (localData) {
      const entries = JSON.parse(localData);
      const filtered = entries.filter(e => e.id !== id);
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(filtered));
    }
    await deleteAudioBlob(id);
    return { success: true, mode: deletedFromSupabase ? 'supabase' : 'local' };
  } catch (e) {
    console.error('Error deleting local entry:', e);
    return { success: false, error: e.message };
  }
}

// Get single audio URL (resolves indexedDB blob to Blob URL if local)
async function resolveAudioUrl(entry) {
  if (!entry || !entry.audio_url) return null;
  
  if (entry.audio_url.startsWith('local-audio:')) {
    const id = entry.audio_url.split(':')[1];
    const blob = await getAudioBlob(id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }
  
  return entry.audio_url; // Direct remote link
}

// Initialize database assets
async function initDb() {
  await initIndexedDB();
  initSupabase();
}

// Export for usage in ES modules
if (typeof module !== 'undefined') {
  module.exports = {
    initDb,
    getSettings,
    saveSettings,
    getGiftEntries,
    saveGiftEntry,
    deleteGiftEntry,
    resolveAudioUrl,
    getAudioBlob
  };
}
