/**
 * Pelli Kaanuka Voice Management System - Speech Parser
 * Extracts Name, Village, Amount, and Phone Number from Telugu text.
 */

const TELUGU_NUMBER_MAP = {
  'ఒకటి': 1, 'ఒక': 1, 'ఒకటి': 1,
  'రెండు': 2, 'రెండో': 2, 'రెండు': 2,
  'మూడు': 3, 'మూడో': 3,
  'నాలుగు': 4,
  'ఐదు': 5,
  'ఆరు': 6,
  'ఏడు': 7,
  'ఎనిమిది': 8,
  'తొమ్మిది': 9,
  'పది': 10,
  'పదకొండు': 11,
  'పన్నెండు': 12,
  'పదమూడు': 13,
  'పద్నాలుగు': 14,
  'పదిహేను': 15,
  'పదహారు': 16,
  'పదిహేడు': 17,
  'పద్దెనిమిది': 18,
  'పంతొమ్మిది': 19,
  'ఇరవై': 20, 'ఇరవయి': 20,
  'ముప్పై': 30, 'ముప్పయి': 30,
  'నలభై': 40, 'నలభయి': 40,
  'యాభై': 50, 'యాభయి': 50,
  'అరవై': 60, 'అరవయి': 60,
  'డెబ్బై': 70, 'డెబ్బయి': 70,
  'ఎనభై': 80, 'ఎనభయి': 80,
  'తొంభై': 90, 'తొంభయి': 90,
  'నూట': 100, 'వంద': 100, 'నూరు': 100, 'వందల': 100,
  'వెయ్యి': 1000, 'వేల': 1000, 'వేలు': 1000,
  'లక్ష': 100000, 'లక్షల': 100000
};

const MULTIPLIERS = {
  'నూట': 100, 'వంద': 100, 'నూరు': 100, 'వందల': 100,
  'వెయ్యి': 1000, 'వేల': 1000, 'వేలు': 1000,
  'లక్ష': 100000, 'లక్షల': 100000
};

/**
 * Parses a string of Telugu words representing a number into an integer.
 * E.g., "వెయ్యి నూట పదహారు" -> 1116
 * E.g., "ఐదు వందల పదహారు" -> 516
 */
function parseTeluguNumberWords(text) {
  if (!text) return 0;
  
  // Clean text and split by spaces
  const words = text.toLowerCase()
    .replace(/[,.]/g, '')
    .split(/\s+/)
    .filter(w => w.trim() !== '');

  let total = 0;
  let currentGroup = 0;
  let hasNumber = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if word is directly a digit
    if (/^\d+$/.test(word)) {
      total += parseInt(word, 10);
      hasNumber = true;
      continue;
    }

    // Check if word matches a Telugu number/multiplier key
    let val = null;
    for (const key in TELUGU_NUMBER_MAP) {
      if (word.includes(key) || key.includes(word)) {
        val = TELUGU_NUMBER_MAP[key];
        break;
      }
    }

    if (val !== null) {
      hasNumber = true;
      const isMultiplier = MULTIPLIERS[word] !== undefined || 
                           Object.keys(MULTIPLIERS).some(m => word.includes(m));
      
      if (isMultiplier) {
        let mult = MULTIPLIERS[word] || 100;
        for (const m in MULTIPLIERS) {
          if (word.includes(m)) {
            mult = MULTIPLIERS[m];
            break;
          }
        }
        
        if (currentGroup === 0) {
          total += mult;
        } else {
          total += currentGroup * mult;
          currentGroup = 0;
        }
      } else {
        currentGroup += val;
      }
    }
  }

  total += currentGroup;
  return hasNumber ? total : null;
}

// ==========================================
// KNOWN VILLAGES PATTERNS
// ==========================================
const KNOWN_VILLAGES = [
  'పోచంపల్లి', 'pochampalli', 'pochampally',
  'హైదరాబాద్', 'hyderabad',
  'కరీంనగర్', 'karimnagar',
  'వరంగల్', 'warangal',
  'విజయవాడ', 'vijayawada',
  'గుంటూరు', 'guntur',
  'సిరిసిల్ల', 'sircilla',
  'నిజామాబాద్', 'nizamabad',
  'ఖమ్మం', 'khammam'
];

function findKnownVillage(words) {
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[,.!?;:]/g, '').trim();
    if (KNOWN_VILLAGES.includes(word)) {
      return { village: words[i], index: i };
    }
  }
  return null;
}

function extractVillageAndNameWithRelation(remainingWords, targetLang) {
  const relationKeywords = [
    's/o', 's/o of', 'son of', 'd/o', 'w/o', 'c/o', 't/o',
    'father', 'husband', 'wife', 'son', 'daughter',
    'తండ్రి', 'కుమారుడు', 'భార్య', 'కుమార్తె'
  ];

  let keywordIndex = -1;

  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i].toLowerCase().replace(/[,.!?;:]/g, '').trim();
    if (relationKeywords.includes(word)) {
      keywordIndex = i;
      break;
    }
  }

  if (keywordIndex !== -1) {
    if (keywordIndex === 1 || (keywordIndex === 2 && remainingWords[1].toLowerCase() === 'of')) {
      // Format: [Name] [s/o] [Relative] ... [Village]
      // Village is the last word, Name is the rest
      const village = remainingWords[remainingWords.length - 1];
      const guest_name = remainingWords.slice(0, remainingWords.length - 1).join(' ');
      return { guest_name, village };
    } else if (keywordIndex > 1) {
      // Format: [Village] [Name] [s/o] [Relative] ...
      // Village is the first word, Name is the rest
      const village = remainingWords[0];
      const guest_name = remainingWords.slice(1).join(' ');
      return { guest_name, village };
    }
  }

  return null;
}

/**
 * Main parser function. Extracts structured info from Telugu speech transcript.
 */
function parseTeluguSpeech(transcript) {
  if (!transcript) {
    return { guest_name: '', village: '', amount: 0, phone: '', notes: '' };
  }

  let text = transcript.trim();

  // 1. Extract Phone Number
  // Look for any 10-digit number or sequence of digits
  let phone = '';
  const phoneMatch = text.match(/[6-9]\d{9}/) || text.match(/\b\d{10}\b/);
  if (phoneMatch) {
    phone = phoneMatch[0];
    // Remove the phone number and keyword context from the parsing string
    text = text.replace(phone, '')
               .replace(/ఫోన్ నెంబర్|మొబైల్ నెంబర్|నెంబర్|ఫోన్|మొబైల్/g, '');
  }

  // 2. Extract Amount
  // Look for digits followed by "రూపాయలు" or variations, or just standalone digits
  let amount = 0;
  let amountText = '';
  
  // Try to find numeric amount first: e.g., "1116 రూపాయలు" or "1116"
  const rupeeKeywords = /(రూపాయలు|రూపాస్|రూపాయిలు|రూ\/\/|రూ\.)/;
  const amountDigitMatch = text.match(/(\d+)\s*(రూపాయలు|రూపాస్|రూపాయిలు|రూ\/\/|రూ\.)?/);
  
  if (amountDigitMatch && amountDigitMatch[1]) {
    amount = parseInt(amountDigitMatch[1], 10);
    // Remove the amount from the text
    text = text.replace(amountDigitMatch[0], '');
  } else {
    // Try to find spoken Telugu numbers
    // Find the word "రూపాయలు" or equivalent, and parse what's before it
    const rupeeIndex = text.search(rupeeKeywords);
    if (rupeeIndex !== -1) {
      const beforeRupees = text.substring(0, rupeeIndex).trim();
      // Extract words likely to be part of the number at the end of the prefix
      const wordsBefore = beforeRupees.split(/\s+/);
      
      // Collect words from the end that look like numbers
      let numberWords = [];
      for (let i = wordsBefore.length - 1; i >= 0; i--) {
        const word = wordsBefore[i];
        let isNumWord = false;
        for (const k in TELUGU_NUMBER_MAP) {
          if (word.includes(k) || k.includes(word)) {
            isNumWord = true;
            break;
          }
        }
        if (isNumWord || /^\d+$/.test(word)) {
          numberWords.unshift(word);
        } else {
          break; // Stop when non-number word is encountered
        }
      }

      if (numberWords.length > 0) {
        amountText = numberWords.join(' ');
        const parsed = parseTeluguNumberWords(amountText);
        if (parsed !== null && parsed > 0) {
          amount = parsed;
          // Remove the parsed number words and "రూపాయలు..."
          text = text.replace(amountText, '').replace(rupeeKeywords, '');
        }
      }
    }
  }

  // If no amount was found yet, let's look for any standalone digits or number words at the end
  if (amount === 0) {
    const words = text.split(/\s+/);
    let numberWords = [];
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      let isNumWord = false;
      for (const k in TELUGU_NUMBER_MAP) {
        if (word.includes(k) || k.includes(word)) {
          isNumWord = true;
          break;
        }
      }
      if (isNumWord || /^\d+$/.test(word)) {
        numberWords.unshift(word);
      } else {
        break;
      }
    }
    if (numberWords.length > 0) {
      amountText = numberWords.join(' ');
      const parsed = parseTeluguNumberWords(amountText);
      if (parsed !== null && parsed > 0) {
        amount = parsed;
        text = text.replace(amountText, '');
      }
    }
  }

  // Clean up remaining text: remove verbs like "ఇచ్చారు" (gave), "ఇచ్చిన" (given), "గారు" (honorific)
  text = text.replace(/(ఇచ్చారు|ఇచ్చినది|ఇచ్చాడు|ఇచ్చారులే|ఇచ్చింది|గారు|గారి|గారు ఇచ్చారు)/g, '').trim();

  // 3. Extract Village and Name
  let village = '';
  let guest_name = '';

  // Clean punctuation and double spaces first to check for known villages
  const tempTextForVillage = text.replace(/[,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const wordsForVillage = tempTextForVillage.split(/\s+/).filter(w => w.trim() !== '');
  const knownVillageObj = findKnownVillage(wordsForVillage);
  
  if (knownVillageObj) {
    village = knownVillageObj.village;
    // Remove village word from the main text string
    const escapedVillage = village.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    text = text.replace(new RegExp(escapedVillage, 'i'), '');
  }

  // Look for village cues like "గ్రామం" (village) or "నుండి" (from) or "నివాసి" if not found
  if (!village) {
    const villageMatch = text.match(/గ్రామం\s+([^\s]+)/) || text.match(/([^\s]+)\s+గ్రామం/);
    const nundiMatch = text.match(/([^\s]+)\s+నుండి/);

    if (villageMatch) {
      village = villageMatch[1] || villageMatch[2];
      text = text.replace(/గ్రామం\s+[^\s]+|[^\s]+\s+గ్రామం/, '');
    } else if (nundiMatch) {
      village = nundiMatch[1];
      text = text.replace(/[^\s]+\s+నుండి/, '');
    }
  }

  // Clean punctuation and double spaces
  text = text.replace(/[,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // Split remaining words for guest_name and fallback village extraction
  const remainingWords = text.split(/\s+/).filter(w => w.trim() !== '');

  if (remainingWords.length > 0) {
    if (!village) {
      const relationResult = extractVillageAndNameWithRelation(remainingWords, 'te');
      if (relationResult) {
        village = relationResult.village;
        guest_name = relationResult.guest_name;
      } else if (remainingWords.length >= 2) {
        // If we have 2 or more words and no village, assume first word is Village/Intiperu (family name)
        // and rest is Name. This is a very common pattern in Telugu (e.g. "పోచంపల్లి రమేష్")
        village = remainingWords[0];
        guest_name = remainingWords.slice(1).join(' ');
      } else {
        guest_name = remainingWords[0];
        village = 'తెలియదు'; // "Unknown" in Telugu
      }
    } else {
      guest_name = remainingWords.join(' ');
    }
  } else {
    guest_name = 'అతిథి'; // "Guest" in Telugu
  }

  // Clean guest name from honorifics
  guest_name = guest_name.replace(/\s*(గారు|గారి)\s*/g, '').trim();

  return {
    guest_name,
    village,
    amount,
    phone,
    notes: transcript // Save raw transcript in notes
  };
}

// ==========================================
// ENGLISH SPEECH & NUMBER PARSING
// ==========================================

const ENGLISH_NUMBER_MAP = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
  'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000, 'lakh': 100000
};

const ENG_MULTIPLIERS = {
  'hundred': 100, 'thousand': 1000, 'lakh': 100000
};

function parseEnglishNumberWords(text) {
  if (!text) return 0;
  const words = text.toLowerCase().replace(/[,.]/g, '').split(/\s+/).filter(w => w.trim() !== '');
  let total = 0;
  let currentGroup = 0;
  let hasNumber = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^\d+$/.test(word)) {
      total += parseInt(word, 10);
      hasNumber = true;
      continue;
    }
    const val = ENGLISH_NUMBER_MAP[word];
    if (val !== undefined) {
      hasNumber = true;
      if (ENG_MULTIPLIERS[word] !== undefined) {
        if (currentGroup === 0) {
          total += val;
        } else {
          total += currentGroup * val;
          currentGroup = 0;
        }
      } else {
        currentGroup += val;
      }
    }
  }
  total += currentGroup;
  return hasNumber ? total : null;
}

function parseEnglishSpeech(transcript) {
  if (!transcript) return { guest_name: '', village: '', amount: 0, phone: '', notes: '' };
  let text = transcript.trim();
  
  // Extract Phone
  let phone = '';
  const phoneMatch = text.match(/[6-9]\d{9}/) || text.match(/\b\d{10}\b/);
  if (phoneMatch) {
    phone = phoneMatch[0];
    text = text.replace(phone, '').replace(/(phone|mobile|number)/gi, '');
  }

  // Extract Amount
  let amount = 0;
  const rupeeKeywords = /(rupees|rupee|rs|inr)/i;
  const amountDigitMatch = text.match(/(\d+)\s*(rupees|rupee|rs|inr)?/i);
  if (amountDigitMatch && amountDigitMatch[1]) {
    amount = parseInt(amountDigitMatch[1], 10);
    text = text.replace(amountDigitMatch[0], '');
  } else {
    const rupeeIndex = text.search(rupeeKeywords);
    if (rupeeIndex !== -1) {
      const beforeRupees = text.substring(0, rupeeIndex).trim();
      const wordsBefore = beforeRupees.split(/\s+/);
      let numberWords = [];
      for (let i = wordsBefore.length - 1; i >= 0; i--) {
        const word = wordsBefore[i];
        if (ENGLISH_NUMBER_MAP[word] !== undefined || /^\d+$/.test(word)) {
          numberWords.unshift(word);
        } else {
          break;
        }
      }
      if (numberWords.length > 0) {
        const parsed = parseEnglishNumberWords(numberWords.join(' '));
        if (parsed !== null && parsed > 0) {
          amount = parsed;
          text = text.replace(numberWords.join(' '), '').replace(rupeeKeywords, '');
        }
      }
    }
  }

  // Extract Village
  let village = '';
  const fromMatch = text.match(/(?:from|of|village|town)\s+([a-zA-Z]+)/i);
  if (fromMatch) {
    village = fromMatch[1];
    text = text.replace(/(from|of|village|town)\s+[a-zA-Z]+/gi, '');
  }

  // Check for known villages if not found
  const cleanTemp = text.replace(/[,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const wordsForVillage = cleanTemp.split(/\s+/).filter(w => w.trim() !== '');
  const knownVillageObj = findKnownVillage(wordsForVillage);
  if (!village && knownVillageObj) {
    village = knownVillageObj.village;
    const escapedVillage = village.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    text = text.replace(new RegExp(escapedVillage, 'gi'), '');
  }

  // Clean remaining text
  text = text.replace(/(gave|given|donated|gifted|gift)/gi, '').replace(/[,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
  
  let guest_name = 'Guest';
  const remainingWords = text.split(/\s+/).filter(w => w.trim() !== '');
  if (remainingWords.length > 0) {
    if (!village) {
      const relationResult = extractVillageAndNameWithRelation(remainingWords, 'en');
      if (relationResult) {
        village = relationResult.village;
        guest_name = relationResult.guest_name;
      } else {
        guest_name = remainingWords.join(' ');
      }
    } else {
      guest_name = remainingWords.join(' ');
    }
  }
  
  if (!village) village = 'Unknown';
  
  return {
    guest_name,
    village,
    amount,
    phone,
    notes: transcript
  };
}

function parseSpeech(transcript, lang) {
  if (lang === 'te') {
    return parseTeluguSpeech(transcript);
  } else {
    return parseEnglishSpeech(transcript);
  }
}

// Export for usage in ES modules
if (typeof module !== 'undefined') {
  module.exports = { parseTeluguSpeech, parseTeluguNumberWords, parseEnglishSpeech, parseEnglishNumberWords, parseSpeech };
}
