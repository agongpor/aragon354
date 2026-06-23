import { CustomMapping, PresetType, WordConversionResult, ConversionStep } from "../types";

// Helper to check if a character is a vowel
function isVowel(char: string): boolean {
  return "aeiouAEIOUéèêÉÈÊ".includes(char);
}

// Helper to check if the index of a character falls within a found substring pattern
function indexInPattern(word: string, index: number, pattern: string): boolean {
  let pos = word.indexOf(pattern);
  while (pos !== -1) {
    if (index >= pos && index < pos + pattern.length) {
      return true;
    }
    pos = word.indexOf(pattern, pos + 1);
  }
  return false;
}

// Intelligent helper to identify "e pepet" (schwa / ə / sound) in Indonesian/Java words.
// E-pepet (e.g. bekas, bekal, besar, teman) is unwritten and should not map to Ya (ي).
// Taling (e.g. bebek, lele, meja) is written and maps to Ya (ي).
function isEPepet(word: string, index: number): boolean {
  const char = word[index];
  if (char === "é" || char === "è") return false; // forced taling (é/è -> not pepet)
  if (char === "ê") return true; // forced pepet (ê -> pepet)
  if (char !== "e" && char !== "é" && char !== "è" && char !== "ê") return false;

  const lower = word.toLowerCase();

  // 1. Check strict mixed-vowel words first (where different 'e' in the same word have different sound types)
  const mixedVowelPatterns = [
    { word: "mereka", indices: { 1: true, 3: false } },
    { word: "pencet", indices: { 1: true, 4: false } },
    { word: "keren", indices: { 1: true, 3: false } },
    { word: "gembel", indices: { 1: true, 4: false } },
    { word: "lengser", indices: { 1: true, 4: false } },
    { word: "merenda", indices: { 1: true, 3: false } },
    { word: "kelereng", indices: { 1: true, 3: false, 5: false } }, // ke (pepet) - le (taling) - reng (taling)
    { word: "peleset", indices: { 1: true, 3: true, 5: false } }, // pe (pepet) - le (pepet) - set (taling)
    { word: "meleset", indices: { 1: true, 3: true, 5: false } } // me (pepet) - le (pepet) - set (taling)
  ];

  for (const rule of mixedVowelPatterns) {
    let pos = lower.indexOf(rule.word);
    while (pos !== -1) {
      const relIndex = index - pos;
      if (rule.indices[relIndex] !== undefined) {
        return rule.indices[relIndex];
      }
      pos = lower.indexOf(rule.word, pos + 1);
    }
  }

  // 2. Exact/Root words lists for pepet (all 'e' are pepet, returns true)
  const pepetPatterns = [
    "belajar", "bekal", "segar", "rempah", "tengah", "lemah", "emas", "empat", "enam", "entah",
    "teman", "besar", "keras", "bekas", "bencana", "benci", "benda", "bentuk", "sempat", 
    "sebelum", "dekat", "dengar", "cepat", "sedikit", "pemerintah", "kerja", "negeri", "sendiri", 
    "tegas", "tenang", "terang", "tetap", "sedang", "sejak", "jelas", "kelas", "pernah", 
    "semua", "pekerja", "pencuri", "selamat", "selatan", "semenjana", "sementara", "belakang", 
    "keluar", "pemuda", "sekolah", "selalu", "selama", "selesa", "cerdas", "hempas", "gempar"
  ];

  // Exactly/Root words lists for taling (all 'e' are taling, returns false)
  const talingPatterns = [
    "bebek", "tembak", "repot", "palet", "jelek", "lempar", "enak", "ember", "esok", "meja", 
    "merah", "leher", "lele", "tempe", "sate", "jahe", "kere", "sore", "kece", "kafe", 
    "herman", "helm", "rem", "resep", "reken", "rekening", "sewa", "setan", "segel", "sendok", 
    "senter", "teh", "tema", "tante", "teko", "teras", "peta", "pena", "pesta", "pendek", 
    "pelet", "tempel", "gepeng", "geser", "lempeng", "dewan", "desa", "depok", "deret", "bebas", 
    "beda", "besok", "bela", "belek", "begal", "beres", "betet", "lewat", "leles", "melo", 
    "nenek", "nene", "rewel", "remedi", "seng", "tente", "copet", "dompet", "karet", "monyet", 
    "rembet", "seret", "kemah", "keling", "jember", "becek"
  ];

  // We group them and sort by length descending to match more specific/longer patterns first (e.g. "lempeng" vs "lemp")
  const customPatterns = [
    ...pepetPatterns.map(p => ({ pattern: p, isPepet: true })),
    ...talingPatterns.map(p => ({ pattern: p, isPepet: false }))
  ].sort((a, b) => b.pattern.length - a.pattern.length);

  for (const item of customPatterns) {
    if (indexInPattern(lower, index, item.pattern)) {
      return item.isPepet;
    }
  }

  // 3. Prefix heuristic logic: Common Indonesian prefixes: be-, me-, se-, ke-, pe-, te-, de-, ge-, ce-, le-
  if (index === 1) {
    const first = lower[0];
    if (["b", "m", "s", "k", "p", "t", "d", "g", "c", "l"].includes(first)) {
      // Exclude known prefix-like taling cases
      const prefixTalingWords = ["bebas", "beda", "besok", "bebek", "becek", "bela", "desa", "lele", "leher", "lewat", "meja", "merah", "setan", "sewa", "teh", "tema", "pena", "pesta", "lempeng", "lempar", "tembak", "repot"];
      if (prefixTalingWords.some(tw => lower.startsWith(tw))) {
        return false;
      }
      return true;
    }
  }

  // If 'e' is at index 0 (e.g., "emas", "empat", "enam", "entah")
  if (index === 0 && lower.length > 2) {
    const nonPepetStart = ["ekor", "enak", "ecer", "elok", "esok", "era", "ember"];
    if (nonPepetStart.some(w => lower.startsWith(w))) {
      return false;
    }
    return true;
  }

  // Blend/consonant cluster context for e-pepet: e.g., "bencana", "benci", "benda", "bentuk"
  if (index > 0 && index < lower.length - 1) {
    const after = lower.substring(index + 1);
    const next2 = after.substring(0, 2);
    if (["ng", "ny", "mp", "nt", "nd", "nc", "nj", "rk", "rt", "rg", "rp", "lm", "lk", "rd", "rn"].includes(next2)) {
      // Exclude known taling words with these blends
      if (lower.includes("lempar") || lower.includes("tempel") || lower.includes("tembak")) {
        return false;
      }
      return true;
    }
  }

  // Default heuristic fallback: if surrounded by consonants
  if (index > 0 && index < lower.length - 1) {
    const prev = lower[index - 1];
    const next = lower[index + 1];
    if (!isVowel(prev) && !isVowel(next)) {
      // Exclude known shorter words or default to pepet for longer words
      const shortTalingWords = ["rem", "seng", "helm", "teh"];
      if (shortTalingWords.some(w => lower.includes(w))) {
        return false;
      }
      if (lower.length > 3) {
        return true;
      }
    }
  }

  return false;
}

// Extract punctuation from beginning and end of a word (Latin & Arabic supported)
function stripPunctuation(word: string): { clean: string; prefix: string; suffix: string } {
  const match = word.match(/^([^\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]*)([\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]*)([^\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]*)$/);
  if (match) {
    return {
      prefix: match[1],
      clean: match[2],
      suffix: match[3],
    };
  }
  return { clean: word, prefix: "", suffix: "" };
}

// Kamus kata serapan bahasa Arab yang ditulis sesuai penulisan bahasa Arab asli tanpa harakat
const ARABIC_LOANWORDS: Record<string, string> = {
  // Middle Eastern Cities (Nama Kota Timur Tengah)
  "mekkah": "مكة",
  "mekah": "مكة",
  "makkah": "مكة",
  "madinah": "المدينة",
  "riyadh": "الرياض",
  "riad": "الرياض",
  "jeddah": "جدة",
  "jiddah": "جدة",
  "kairo": "القاهرة",
  "cairo": "القاهرة",
  "baghdad": "بغداد",
  "bagdad": "بغداد",
  "damaskus": "دمشق",
  "damascus": "دمشق",
  "beirut": "بيروت",
  "amman": "عمان",
  "sanaa": "صنعاء",
  "sana'a": "صنعاء",
  "tehran": "طهران",
  "teheran": "طهران",
  "ankara": "أنقرة",
  "dubai": "دبي",
  "abu dhabi": "أبو ظبي",
  "abudhabi": "أبو ظبي",
  "doha": "الدوحة",
  "manama": "المنامة",
  "muscat": "مسقط",
  "kuwait": "الكويت",
  "al-quds": "القدس",
  "alquds": "القدس",
  "quds": "القدس",
  "gaza": "غزة",
  "yerusalem": "القدس",
  "halab": "حلب",
  "aleppo": "حلب",
  "mosul": "الموصل",
  "basrah": "البصرة",
  "basra": "البصرة",
  "kufah": "الكوفة",
  "kufa": "الكوفة",
  "karbala": "كربلاء",
  "khartoum": "الخرطوم",
  "tripoli": "طرابلس",
  "rabat": "الرباط",
  "tunis": "تونس",

  // Middle Eastern Countries & Regions (Negara & Wilayah Timur Tengah)
  "mesir": "مصر",
  "yaman": "اليمن",
  "hijaz": "الحجاز",
  "palestina": "فلسطين",
  "palestine": "فلسطين",
  "suriah": "سوريا",
  "syria": "سوريا",
  "irak": "العراق",
  "iraq": "العراق",
  "yordania": "الأردن",
  "lebanon": "لبنان",
  "lubnan": "لبنان",
  "oman": "عمان",
  "qatar": "قطر",
  "bahrain": "البحرين",
  "turki": "تركيا",
  "iran": "إيران",
  "arab": "عرب",
  "saudi": "سعودي",
  "maroko": "المغرب",
  "aljazair": "الجزائر",
  "tunisia": "تونس",
  "libya": "ليبيا",
  "sudan": "السودان",
  "syam": "الشام",
  "sham": "الشام",

  // Islamic & Arabic Sacred Sites / Sacred Words
  "kabah": "الكعبة",
  "ka'bah": "الكعبة",
  "quran": "القرآن",
  "al-quran": "القرآن",
  "alquran": "القرآن",
  "al-aqsa": "الأقصى",
  "alaqsa": "الأقصى",
  "aqsa": "الأقصى",
  "khalifah": "خليفة",
  "tauhid": "توحيد",

  // Prayer and Islamic Times
  "subuh": "صبح",
  "fajar": "فجر",
  "dzuhur": "ظهر",
  "zuhur": "ظهر",
  "ashar": "عصر",
  "maghrib": "مغرب",
  "isya": "عشاء",
  "isya'": "عشاء",
  "tahajjud": "تهجد",
  "tahajud": "تهجد",
  "tarawih": "تراويح",
  "witir": "وتر",
  "dhuha": "ضحى",

  // Hijri Months
  "muharram": "محرم",
  "safar": "صفر",
  "shafar": "صفر",
  "rabiul": "ربيع الأول",
  "rajab": "رجب",
  "syaban": "شعبان",
  "sya'ban": "شعبان",
  "ramadhan": "رمضان",
  "ramadan": "رمضان",
  "syawal": "شوال",
  "dzulqadah": "ذو القعدة",
  "zulqadah": "ذو القعدة",
  "dzulhijjah": "ذو الحجة",
  "zulhijjah": "ذو الحجة",

  "jamaah": "جماعة",
  "jemaah": "جماعة",
  "muslim": "مسلم",
  "muslimin": "مسلمين",
  "muslimah": "مسلمة",
  "islam": "اسلام",
  "salam": "سلام",
  "assalam": "السلام",
  "assalamu": "السلام",
  "alaikum": "عليكم",
  "alaykum": "عليكم",
  "assalamualaikum": "السلام عليكم",
  "assalamu'alaikum": "السلام عليكم",
  "assalamualaykum": "السلام عليكم",
  "assalamu'alaykum": "السلام عليكم",
  "waalaikumsalam": "وعليكم السلام",
  "wa'alaikumsalam": "وعليكم السلام",
  "waalaykumsalam": "وعليكم السلام",
  "wa'alaykumsalam": "وعليكم السلام",
  "wa'alaikumussalam": "وعليكم السلام",
  "waalaikumussalam": "وعليكم السلام",
  "wasalamualaikum": "وعليكم السلام",
  "wasalamu'alaikum": "وعليكم السلام",
  "warahmatullahi": "ورحمة الله",
  "wabarakatuh": "وبركاته",
  "shallallahu": "صلى الله",
  "alaihi": "عليه",
  "wasallam": "وسلم",
  "shallallahu 'alaihi wasallam": "صلى الله عليه وسلم",
  "shallallahu alaihi wasallam": "صلى الله عليه وسلم",
  "shollallahu 'alaihi wasallam": "صلى الله عليه وسلم",
  "shollallahu alaihi wasallam": "صلى الله عليه وسلم",
  "saw": "صلى الله عليه وسلم",
  "sholih": "صالح",
  "shalih": "صالح",
  "sholeh": "صالح",
  "sholihah": "صالحة",
  "shalihah": "صالحة",
  "sholehah": "صالحة",
  "sholat": "صلاة",
  "salat": "صلاة",
  "solat": "صلاة",
  "masjid": "مسجد",
  "musholla": "مصلى",
  "mushola": "مصلى",
  "musala": "مصلى",
  "iman": "ايمان",
  "takwa": "تقوى",
  "taqwa": "تقوى",
  "sunnah": "سنة",
  "hukum": "حكم",
  "kitab": "كتاب",
  "nabi": "نبي",
  "rasul": "رسول",
  "allah": "الله",
  "bismillah": "بسم الله",
  "alhamdulillah": "الحمد لله",
  "subhanallah": "سبحان الله",
  "insyaallah": "إن شاء الله",
  "astagfirullah": "أستغفر الله",
  "astaghfirullah": "أستغفر الله",
  "allahumma": "اللهم",
  "amal": "عمل",
  "ilmu": "علم",
  "ulama": "علماء",
  "ustadz": "أستاذ",
  "ustad": "أستاذ",
  "ustazah": "أستاذة",
  "ustadzah": "أستاذة",
  "sahabat": "صحابة",
  "zakat": "زكاة",
  "haji": "حج",
  "umroh": "عمرة",
  "umrah": "عمرة",
  "halal": "حلال",
  "haram": "حرام",
  "makruh": "مكروه",
  "mubah": "مباح",
  "wajib": "واجب",
  "syirik": "شرك",
  "kufur": "كفر",
  "kafir": "كافر",
  "munafik": "منافق",
  "fasik": "فاسق",
  "fasiq": "فاسق",
  "ikhlas": "إخلاص",
  "sabar": "صبر",
  "syukur": "شكر",
  "taubat": "توبة",
  "tobat": "توبة",
  "maaf": "معاف",
  "doa": "دعاء",
  "dzikir": "ذكر",
  "zikir": "ذكر",
  "pikir": "فكر",
  "fikir": "فكر",
  "syetan": "شيطان",
  "setan": "شيطان",
  "iblis": "ابليس",
  "malaikat": "ملائكة",
  "akhirat": "آخرة",
  "kiamat": "قيامة",
  "dunia": "دنيا",
  "kabar": "خبر",
  "khabar": "خبر",
  "sedekah": "صدقة",
  "shodaqoh": "صدقة",
  "shadaqah": "صدقة",
  "berkah": "بركة",
  "barakah": "بركة",
  "barokah": "بركة",
  "majelis": "مجلس",
  "majlis": "مجلس",
  "khotbah": "خطبة",
  "khutbah": "خطبة",
  "nikah": "نكاح",
  "akhlak": "أخلاق",
  "adab": "أدب",
  "tafsir": "تفسير",
  "hadits": "حديث",
  "hadis": "حديث",
  "fiqih": "فقه",
  "fikih": "فقه",
  "akidah": "عقيدة",
  "aqidah": "عقيدة",
  "tasawuf": "تصوف",
  "kalimat": "كلمة",
  "ayat": "آية",
  "surah": "سورة",
  "ijtihad": "اجتهاد",
  "fatwa": "فتوى",
  "syariat": "شريعة",
  "syariah": "شريعة",
  "tarbiyah": "تربية",
  "dakwah": "دعوة",
  "ijtima": "اجتماع",
  "silaturahmi": "صلة الرحم",
  "silaturahim": "صلة الرحم",
  "fitnah": "فتنة",
  "ghibah": "غيبة",
  "hasad": "حسد",
  "riya": "رياء",
  "riya'": "رياء",
  "takabur": "تكبر",
  "ujub": "عجب",
  "syahadat": "شهادة",
  "syahid": "شهيد",
  "jihad": "جهاد",
  "hijrah": "هجرة",
  "imam": "إمام",
  "makmum": "مأموم",
  "khatib": "خطيب",
  "muadzin": "مؤذن",
  "muazin": "مؤذن",
  "mimbar": "منبر",
  "shaf": "صف",
  "saf": "صف",
  "wudhu": "وضوء",
  "wudu": "وضوء",
  "tayamum": "تيمم",
  
  // Eid & Holidays / Holy Phrases
  "idul fitri": "عيد الفطر",
  "idulfitri": "عيد الفطر",
  "idul adha": "عيد الأضحى",
  "iduladha": "عيد الأضحى",
  "idul qurban": "عيد القربan",
  "idulqurban": "عيد القربان",
  "minal aidin wal faizin": "من العائدين والفائزين",
  "minal 'aidin wal-faizin": "من العائدين والفائزين",
  "minal 'aidin wal faizin": "من العائدين والفائزين",
  "minal aidzin wal faizin": "من العائدين والفائزين",
  "minal aidzin wal fayizin": "من العائدين والفائزين",
  
  // Phrases with spaces & other rich terms
  "insya allah": "إن شاء الله",
  "masya allah": "ما شاء الله",
  "masyaallah": "ما شاء الله",
  "la ilaha illallah": "لا إله إلا الله",
  "laa ilaha illallah": "لا إله إلا الله",
  "lailahaillallah": "لا إله إلا الله",
  "allahu akbar": "الله أكبر",
  "allohu akbar": "الله أكبر",
  "bismillahirrahmanirrahim": "بسم الله الرحمن الرحيم",
  "bismillah-ir-rahman-ir-rahim": "بسم الله الرحمن الرحيم",
  "assalamualaikum warahmatullahi wabarakatuh": "السلام عليكم ورحمة الله وبركاته",
  "assalamu'alaikum warahmatullahi wabarakatuh": "السلام عليكم ورحمة الله وبركاته",
  "waalaikumsalam warahmatullahi wabarakatuh": "وعليكم السلام ورحمة الله وبركاته",
  "wa'alaikumsalam warahmatullahi wabarakatuh": "وعليكم السلام ورحمة الله وبركاته",

  // Individual components for fallbacks
  "idul": "عيد",
  "fitri": "الفطر",
  "adha": "الأضحى",
  "qurban": "القربان"
};

/**
 * Tokenizes a line of text while keeping multi-word Arabic/Latin holy phrases
 * intact as single tokens to allow correct, unified, non-phonetic transliterations.
 */
export function splitLineIntoTokens(line: string): string[] {
  // Sort phrases by length descending so longer phrases match first (greedy matching)
  const phraseSorted = [
    // Ind-Latin Phrases
    "assalamualaikum warahmatullahi wabarakatuh",
    "assalamu'alaikum warahmatullahi wabarakatuh",
    "waalaikumsalam warahmatullahi wabarakatuh",
    "wa'alaikumsalam warahmatullahi wabarakatuh",
    "shallallahu 'alaihi wasallam",
    "shallallahu alaihi wasallam",
    "shollallahu 'alaihi wasallam",
    "shollallahu alaihi wasallam",
    "bismillahirrahmanirrahim",
    "bismillah-ir-rahman-ir-rahim",
    "minal 'aidin wal-faizin",
    "minal 'aidin wal faizin",
    "minal aidin wal faizin",
    "minal aidzin wal faizin",
    "minal aidzin wal fayizin",
    "assalamualaikum",
    "assalamu'alaikum",
    "waalaikumsalam",
    "wa'alaikumsalam",
    "insya allah",
    "masya allah",
    "la ilaha illallah",
    "laa ilaha illallah",
    "idul fitri",
    "idul adha",
    "idul qurban",

    // Arabic Script Phrases
    "السلام عليكم ورحمة الله وبركاته",
    "وعليكم السلام ورحمة الله وبركاته",
    "صلى الله عليه وسلم",
    "بسم الله الرحمن الرحيم",
    "من العائدين والفائزين",
    "السلام عليكم",
    "وعليكم السلام",
    "إن شاء الله",
    "ما شاء الله",
    "لا إله إلا الله",
    "الله أكبر",
    "عيد الفطر",
    "عيد الأضحى",
    "عيد القربان",
    "بسم الله"
  ].sort((a, b) => b.length - a.length);

  let currentText = line;
  const placeholders: { id: string; original: string }[] = [];
  
  phraseSorted.forEach((phrase, index) => {
    // Escaping regex characters, replacing spaces in phrases with optional double/multiple spaces
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    
    // Boundary check with lookbehind/lookahead to match phrases bounded by space or standard punctuation
    const pattern = new RegExp(`(?<=^|\\s|[,.!?;:()""'\\[\\]{}<>“”—])(${escaped})(?=$|\\s|[,.!?;:()""'\\[\\]{}<>“”—])`, 'gi');
    
    currentText = currentText.replace(pattern, (match) => {
      const placeholderId = `__ARABIC_PHRASE_${index}_${placeholders.length}__`;
      placeholders.push({ id: placeholderId, original: match });
      return placeholderId;
    });
  });

  // Split line by spaces preserving them as tokens
  const segments = currentText.split(/(\s+)/);

  // Restore placeholders to original text
  return segments.map(segment => {
    const found = placeholders.find(p => p.id === segment);
    return found ? found.original : segment;
  });
}

export function transliterateWord(
  rawWord: string,
  preset: PresetType,
  mappings: CustomMapping[]
): WordConversionResult {
  const { clean, prefix, suffix } = stripPunctuation(rawWord);
  if (!clean) {
    return {
      word: rawWord,
      arabic: rawWord,
      steps: [{ original: rawWord, result: rawWord, explanation: "Hanya tanda baca atau spasi." }],
    };
  }

  const steps: ConversionStep[] = [];
  const lowerClean = clean.toLowerCase();

  // 1. Check WORD dictionary first (exact match, case insensitive)
  const wordMaps = mappings.filter((m) => m.type === "word");
  const matchingWordMap = wordMaps.find((m) => m.latin.toLowerCase() === lowerClean);

  if (matchingWordMap) {
    steps.push({
      original: clean,
      result: matchingWordMap.arabic,
      explanation: `Ditemukan kecocokan di Kamus Kata kustom: "${clean}" langsung diterjemahkan menjadi "${matchingWordMap.arabic}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + matchingWordMap.arabic + suffix,
      steps,
    };
  }

  // Special Rule: Standalone 'ke' or 'k' should be written with standard Arabic Kaf 'ك'
  if (lowerClean === "ke" || lowerClean === "k") {
    steps.push({
      original: clean,
      result: "ك",
      explanation: `Aturan Aksara: Huruf kaf yang berdiri sendiri seperti "${clean}" ditulis dengan kaf polos/standar "ك".`,
    });
    return {
      word: rawWord,
      arabic: prefix + "ك" + suffix,
      steps,
    };
  }

  // 1.5 Check if word is an Arabic Loanword
  if (ARABIC_LOANWORDS[lowerClean]) {
    const arabicSpelling = ARABIC_LOANWORDS[lowerClean];
    steps.push({
      original: clean,
      result: arabicSpelling,
      explanation: `Kata "${clean}" terdeteksi sebagai kata serapan Arab asli. Berdasarkan kaidah penulisan, kata ini ditulis sesuai ejaran Arab asli tanpa harakat: "${arabicSpelling}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + arabicSpelling + suffix,
      steps,
    };
  }

  // 2. Rule-Based Transliteration
  let workingWord = lowerClean;
  steps.push({
    original: clean,
    result: workingWord,
    explanation: `Memulai transliterasi fonetik untuk kata: "${clean}".`,
  });

  // Handle Initial Vowel Rule
  // Di Pegon, huruf vokal di awal kata harus diawali Alif (ا).
  // Misal: anak -> ا + nak, ibu -> ا + ibu, dsb.
  const firstChar = workingWord[0];
  let startsWithVowel = false;
  if (isVowel(firstChar)) {
    startsWithVowel = true;
    let initialVowelRes = "";
    let explanationVowel = "";

    if (firstChar === "a") {
      initialVowelRes = "ا";
      explanationVowel = `Vokal di awal kata "a" diawali dengan Alif (ا).`;
    } else if (firstChar === "i" || firstChar === "e") {
      initialVowelRes = "اي";
      explanationVowel = `Vokal di awal kata "${firstChar}" diawali Alif + Ya (اي).`;
    } else if (firstChar === "u" || firstChar === "o") {
      initialVowelRes = "او";
      explanationVowel = `Vokal di awal kata "${firstChar}" diawali Alif + Wawu (او).`;
    }

    if (initialVowelRes) {
      workingWord = workingWord.substring(1);
      // We will prepended the Arabic Alif later to our mapped consonants
      steps.push({
        original: firstChar + workingWord,
        result: `[alif-vocal] + ${workingWord}`,
        explanation: explanationVowel,
      });
    }
  }

  // Split mappings into digraphs and characters for scanning
  const digraphMaps = mappings.filter((m) => m.type === "digraph");
  const characterMaps = mappings.filter((m) => m.type === "character");

  // Create lookup maps
  const digraphLookup: Record<string, string> = {};
  digraphMaps.forEach((m) => {
    digraphLookup[m.latin.toLowerCase()] = m.arabic;
  });

  const charLookup: Record<string, string> = {};
  characterMaps.forEach((m) => {
    charLookup[m.latin.toLowerCase()] = m.arabic;
  });

  // Add accents normalization to charLookup
  if (charLookup["e"] !== undefined) {
    charLookup["é"] = charLookup["e"];
    charLookup["è"] = charLookup["e"];
    charLookup["ê"] = ""; // ê is always pepet (unwritten)
  }

  // End-of-word Kaf rule in Pegon
  // Di Pegon, 'k' di akhir kata menggunakan huruf Kaf biasa (ك).
  let endsWithKRuleApplied = false;
  let wordWithKPlaceholder = workingWord;
  if (workingWord.endsWith("k") && workingWord.length > 1) {
    endsWithKRuleApplied = true;
    wordWithKPlaceholder = workingWord.slice(0, -1) + "[kaf-akhir]";
    steps.push({
      original: workingWord,
      result: wordWithKPlaceholder,
      explanation: `Aturan Pegon: Huruf 'k' di akhir kata menggunakan huruf Kaf (ك).`,
    });
  }

  // Process the characters in segments
  // We scan the words. We do it character by character, matching digraphs first.
  let arabicOutput = "";
  let i = 0;
  const wordToScan = wordWithKPlaceholder;

  while (i < wordToScan.length) {
    // Check if we hit the [qaf-akhir] placeholder
    if (wordToScan.substring(i).startsWith("[qaf-akhir]")) {
      arabicOutput += "ق";
      i += "[qaf-akhir]".length;
      continue;
    }

    // Check if we hit the [kaf-akhir] placeholder
    if (wordToScan.substring(i).startsWith("[kaf-akhir]")) {
      arabicOutput += "ك";
      i += "[kaf-akhir]".length;
      continue;
    }

    // Check if we hit the [alif-vocal] placeholder if any (though we stripped it, just in case)
    if (wordToScan.substring(i).startsWith("[alif-vocal]")) {
      i += "[alif-vocal]".length;
      continue;
    }

    // 1. Try digraph of 2 characters
    if (i < wordToScan.length - 1) {
      const potentialDigraph = wordToScan.substring(i, i + 2);
      if (digraphLookup[potentialDigraph]) {
        const arabicChar = digraphLookup[potentialDigraph];
        arabicOutput += arabicChar;
        steps.push({
          original: potentialDigraph,
          result: arabicChar,
          explanation: `Digraf "${potentialDigraph}" dipetakan ke "${arabicChar}".`,
        });
        i += 2;
        continue;
      }
    }

    // 2. Try single character
    const currentChar = wordToScan[i];
    
    // Convert Latin digit to Arabic numeral
    if ("0123456789".includes(currentChar)) {
      const arabicDigit = "٠١٢٣٤٥٦٧٨٩"["0123456789".indexOf(currentChar)];
      arabicOutput += arabicDigit;
      steps.push({
        original: currentChar,
        result: arabicDigit,
        explanation: `Aturan Angka: Angka Latin "${currentChar}" diubah menjadi Angka Arab "${arabicDigit}".`,
      });
      i++;
      continue;
    }

    if (charLookup[currentChar] !== undefined) {
      const arabicChar = charLookup[currentChar];
      
      // Smart Pepet vowel handling: in Pegon, 'e' as pepet (e.g. bekas, bekal, emas, kera, teman) is unwritten.
      if ((currentChar === "e" || currentChar === "ê") && isEPepet(wordToScan, i)) {
        steps.push({
          original: currentChar,
          result: "",
          explanation: `Aturan Pepet: Huruf "${currentChar}" dideteksi sebagai pepet (seperti dalam bekas/bekal), sehingga diabaikan dan tidak menggunakan huruf Ya (ي).`,
        });
        i++;
        continue;
      }

      arabicOutput += arabicChar;
      if (arabicChar) {
        steps.push({
          original: currentChar,
          result: arabicChar,
          explanation: `Huruf "${currentChar}" dipetakan ke "${arabicChar}".`,
        });
      } else {
        steps.push({
          original: currentChar,
          result: "",
          explanation: `Huruf "${currentChar}" diabaikan (pepet tidak ditulis).`,
        });
      }
    } else {
      // Non-mapped letter (e.g. numbers, special chars, or unmapped characters)
      arabicOutput += currentChar;
      steps.push({
        original: currentChar,
        result: currentChar,
        explanation: `Karakter "${currentChar}" tidak terpetakan, ditulis apa adanya.`,
      });
    }
    i++;
  }

  // Prepend the initial vowel Alif if required
  if (startsWithVowel) {
    const firstV = lowerClean[0];
    let alifHeader = "ا";
    if (firstV === "i" || firstV === "e") {
      alifHeader = "اي";
    } else if (firstV === "u" || firstV === "o") {
      alifHeader = "او";
    }

    // Let's check if the first character of the output is already Alif (to avoid duplicates or clean it up nicely)
    // Since we stripped the vowel in workingWord, arabicOutput has consonants/other vowels.
    arabicOutput = alifHeader + arabicOutput;
  }

  // Return the full formatted result
  return {
    word: rawWord,
    arabic: prefix + arabicOutput + suffix,
    steps,
  };
}

export function transliterateText(
  text: string,
  preset: PresetType,
  mappings: CustomMapping[]
): { arabicText: string; wordsResult: WordConversionResult[] } {
  if (!text.trim()) {
    return { arabicText: "", wordsResult: [] };
  }

  const lines = text.split("\n");
  const wordsResultList: WordConversionResult[] = [];
  const translatedLines = lines.map((line) => {
    // Handle empty line
    if (!line.trim()) return "";

    // Split words but keep spacing intact
    const wordsWithSpaces = splitLineIntoTokens(line);
    const convertedSegments = wordsWithSpaces.map((segment) => {
      if (!segment.trim()) {
        return segment; // Keep trailing spaces
      }
      
      const res = transliterateWord(segment, preset, mappings);
      wordsResultList.push(res);
      return res.arabic;
    });

    return convertedSegments.join("");
  });

  return {
    arabicText: translatedLines.join("\n"),
    wordsResult: wordsResultList,
  };
}

export function transliteratePegonToLatinWord(
  rawWord: string,
  mappings: CustomMapping[]
): WordConversionResult {
  const { clean, prefix, suffix } = stripPunctuation(rawWord);
  if (!clean) {
    return {
      word: rawWord,
      arabic: rawWord,
      steps: [{ original: rawWord, result: rawWord, explanation: "Hanya tanda baca atau spasi." }],
    };
  }

  const steps: ConversionStep[] = [];
  const lowerClean = clean.trim();

  // 1. Check custom WORD dictionary mappings
  const wordMaps = mappings.filter((m) => m.type === "word");
  const matchingWordMap = wordMaps.find((m) => m.arabic === lowerClean);

  if (matchingWordMap) {
    steps.push({
      original: clean,
      result: matchingWordMap.latin,
      explanation: `Ditemukan kecocokan di Kamus Kata kustom: Arab Pegon "${clean}" dipetakan ke Latin "${matchingWordMap.latin}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + matchingWordMap.latin + suffix,
      steps,
    };
  }

  // 1.5 Check if it matches an Arabic Loanword
  const foundLoanwordKey = Object.keys(ARABIC_LOANWORDS).find(
    (key) => ARABIC_LOANWORDS[key] === lowerClean
  );
  if (foundLoanwordKey) {
    steps.push({
      original: clean,
      result: foundLoanwordKey,
      explanation: `Kata "${clean}" terdeteksi sebagai kata serapan Arab asli. Transliterasi balik yang sesuai adalah "${foundLoanwordKey}".`,
    });
    return {
      word: rawWord,
      arabic: prefix + foundLoanwordKey + suffix,
      steps,
    };
  }

  // 2. Rule-Based Transliteration pegon -> latin
  steps.push({
    original: clean,
    result: clean,
    explanation: `Memulai transliterasi fonetis Arab Pegon ke Latin untuk aksara: "${clean}".`,
  });

  const reverseDigraphLookup: Record<string, string> = {
    "خ": "kh",
    "ش": "sy",
    "ڠ": "ng",
    "ڽ": "ny",
    "ۑ": "ny",
    "ط": "th",
    "ڊ": "dh",
    "ص": "sh",
    "ث": "ts",
    "ذ": "dz",
    "غ": "gh"
  };

  const reverseCharLookup: Record<string, string> = {
    "ب": "b",
    "چ": "c",
    "د": "d",
    "ف": "f",
    "ڮ": "g",
    "ݢ": "g",
    "گ": "g",
    "ࢴ": "g",
    "ه": "h",
    "ج": "j",
    "ک": "k",
    "ك": "k",
    "ل": "l",
    "م": "m",
    "ن": "n",
    "ڤ": "p",
    "ق": "k",
    "ر": "r",
    "س": "s",
    "ت": "t",
    "ۏ": "v",
    "و": "w",
    "ي": "y",
    "ز": "z",
    "ع": "'",
    "ح": "h",
    "ض": "dh",
    "ظ": "zh",
    "أ": "a",
    "إ": "i",
    "ؤ": "u",
    "ئ": "i",
    "ء": "'",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9"
  };

  let latinOutput = "";
  let i = 0;
  const wordLen = lowerClean.length;

  while (i < wordLen) {
    const char = lowerClean[i];
    const nextChar = i + 1 < wordLen ? lowerClean[i + 1] : "";
    const nextNextChar = i + 2 < wordLen ? lowerClean[i + 2] : "";

    // Handle initial vowel (starts with Alif 'ا')
    if (i === 0 && char === "ا") {
      if (nextChar === "ي") {
        if (nextNextChar === "ا" || nextNextChar === "ي" || nextNextChar === "و") {
          latinOutput += "a";
          steps.push({ original: "ا", result: "a", explanation: "Alif di awal kata diikuti huruf saksi diurai sebagai vokal 'a'." });
          i += 1;
        } else {
          latinOutput += "i";
          steps.push({ original: "اي", result: "i", explanation: "Alif + Ya di awal kata diurai sebagai vokal 'i'." });
          i += 2;
        }
      } else if (nextChar === "و") {
        if (nextNextChar === "ا" || nextNextChar === "ي" || nextNextChar === "و") {
          latinOutput += "a";
          steps.push({ original: "ا", result: "a", explanation: "Alif di awal kata diikuti huruf saksi diurai sebagai vokal 'a'." });
          i += 1;
        } else {
          latinOutput += "u";
          steps.push({ original: "او", result: "u", explanation: "Alif + Wawu di awal kata diurai sebagai vokal 'u'." });
          i += 2;
        }
      } else {
        latinOutput += "a";
        steps.push({ original: "ا", result: "a", explanation: "Alif di awal kata diurai sebagai vokal 'a'." });
        i += 1;
      }
      continue;
    }

    // Check digraph
    if (reverseDigraphLookup[char]) {
      const latDigraph = reverseDigraphLookup[char];
      latinOutput += latDigraph;
      steps.push({ original: char, result: latDigraph, explanation: `Huruf Pegon "${char}" dibaca sebagai konsonan "${latDigraph}".` });
      i += 1;
      continue;
    }

    // Check single character
    if (reverseCharLookup[char]) {
      const cons = reverseCharLookup[char];

      if (char === "ي") {
        if (nextChar === "ا" || nextChar === "و" || nextChar === "ي") {
          latinOutput += "y";
          steps.push({ original: "ي", result: "y", explanation: "Ya bertindak sebagai konsonan 'y' karena diikuti vokal murni." });
        } else {
          latinOutput += "i";
          steps.push({ original: "ي", result: "i", explanation: "Ya bertindak sebagai vokal murni 'i'." });
        }
        i += 1;
        continue;
      }

      if (char === "و") {
        if (nextChar === "ا" || nextChar === "و" || nextChar === "ي") {
          latinOutput += "w";
          steps.push({ original: "و", result: "w", explanation: "Wawu bertindak sebagai konsonan 'w' karena diikuti vokal murni." });
        } else {
          latinOutput += "u";
          steps.push({ original: "و", result: "u", explanation: "Wawu bertindak sebagai vokal murni 'u'." });
        }
        i += 1;
        continue;
      }

      if (char === "ا") {
        latinOutput += "a";
        steps.push({ original: "ا", result: "a", explanation: "Alif diurai sebagai vokal 'a'." });
        i += 1;
        continue;
      }

      // It is a static consonant sound
      latinOutput += cons;

      // Lookahead helper for following vowel saksi
      if (nextChar === "ا") {
        latinOutput += "a";
        steps.push({ original: char + "ا", result: cons + "a", explanation: `Konsonan "${char}" diiringi huruf saksi Alif dibaca "${cons}a".` });
        i += 2;
      } else if (nextChar === "ي") {
        if (nextNextChar === "ا" || nextNextChar === "و" || nextNextChar === "ي") {
          // Ya acting as y
          steps.push({ original: char, result: cons, explanation: `Konsonan "${char}" dibaca "${cons}".` });
          i += 1;
        } else {
          latinOutput += "i";
          steps.push({ original: char + "ي", result: cons + "i", explanation: `Konsonan "${char}" diiringi huruf saksi Ya dibaca "${cons}i".` });
          i += 2;
        }
      } else if (nextChar === "و") {
        if (nextNextChar === "ا" || nextNextChar === "و" || nextNextChar === "ي") {
          steps.push({ original: char, result: cons, explanation: `Konsonan "${char}" dibaca "${cons}".` });
          i += 1;
        } else {
          latinOutput += "u";
          steps.push({ original: char + "و", result: cons + "u", explanation: `Konsonan "${char}" diiringi huruf saksi Wawu dibaca "${cons}u".` });
          i += 2;
        }
      } else {
        // No vowel follower - insert implicit pepet "e" if followed by another consonant
        if (nextChar && (reverseCharLookup[nextChar] || reverseDigraphLookup[nextChar])) {
          latinOutput += "e";
          steps.push({ original: char, result: cons + "e", explanation: `Konsonan "${char}" tidak diiringi huruf saksi, dideteksi bunyi pepet "e" sehingga diurai "${cons}e".` });
        } else {
          steps.push({ original: char, result: cons, explanation: `Konsonan "${char}" di akhir suku kata dibaca "${cons}".` });
        }
        i += 1;
      }
      continue;
    }

    // Default other character
    latinOutput += char;
    steps.push({ original: char, result: char, explanation: "Ditulis apa adanya." });
    i += 1;
  }

  return {
    word: rawWord,
    arabic: prefix + latinOutput + suffix,
    steps,
  };
}

export function transliteratePegonToLatinText(
  text: string,
  mappings: CustomMapping[]
): { arabicText: string; wordsResult: WordConversionResult[] } {
  if (!text.trim()) {
    return { arabicText: "", wordsResult: [] };
  }

  const lines = text.split("\n");
  const wordsResultList: WordConversionResult[] = [];
  const translatedLines = lines.map((line) => {
    if (!line.trim()) return "";

    const wordsWithSpaces = splitLineIntoTokens(line);
    const convertedSegments = wordsWithSpaces.map((segment) => {
      if (!segment.trim()) {
        return segment;
      }
      const res = transliteratePegonToLatinWord(segment, mappings);
      wordsResultList.push(res);
      return res.arabic;
    });

    return convertedSegments.join("");
  });

  return {
    arabicText: translatedLines.join("\n"),
    wordsResult: wordsResultList,
  };
}
