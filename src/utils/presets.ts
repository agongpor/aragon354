import { CustomMapping } from "../types";

export const DEFAULT_JAWI_MAPPINGS: CustomMapping[] = [
  // Digraphs & Clusters
  { id: "j_kh", latin: "kh", arabic: "خ", type: "digraph", description: "Bentuk kh seperti khusus", isPreset: true },
  { id: "j_sy", latin: "sy", arabic: "ش", type: "digraph", description: "Bentuk sy seperti syarat", isPreset: true },
  { id: "j_ng", latin: "ng", arabic: "ڠ", type: "digraph", description: "Huruf Ngo (Nga dengan 3 titik di atas)", isPreset: true },
  { id: "j_ny", latin: "ny", arabic: "ڽ", type: "digraph", description: "Huruf Nyo (Nya dengan 3 titik di atas)", isPreset: true },
  { id: "j_gh", latin: "gh", arabic: "غ", type: "digraph", description: "Gho seperti ghaib", isPreset: true },
  { id: "j_ts", latin: "ts", arabic: "ث", type: "digraph", description: "Tsa (Arab)", isPreset: true },
  { id: "j_dz", latin: "dz", arabic: "ذ", type: "digraph", description: "Dzal (Arab)", isPreset: true },
  { id: "j_sh", latin: "sh", arabic: "ص", type: "digraph", description: "Shad (Arab)", isPreset: true },

  // Consonants
  { id: "j_b", latin: "b", arabic: "ب", type: "character", isPreset: true },
  { id: "j_c", latin: "c", arabic: "چ", type: "character", description: "Ca dengan 3 titik di dalam", isPreset: true },
  { id: "j_d", latin: "d", arabic: "د", type: "character", isPreset: true },
  { id: "j_f", latin: "f", arabic: "ف", type: "character", isPreset: true },
  { id: "j_g", latin: "g", arabic: "ݢ", type: "character", description: "Ga dengan 1 titik di atas", isPreset: true },
  { id: "j_h", latin: "h", arabic: "ه", type: "character", isPreset: true },
  { id: "j_j", latin: "j", arabic: "ج", type: "character", isPreset: true },
  { id: "j_k", latin: "k", arabic: "ك", type: "character", description: "Kaf (di awal/tengah)", isPreset: true },
  { id: "j_l", latin: "l", arabic: "ل", type: "character", isPreset: true },
  { id: "j_m", latin: "m", arabic: "م", type: "character", isPreset: true },
  { id: "j_n", latin: "n", arabic: "ن", type: "character", isPreset: true },
  { id: "j_p", latin: "p", arabic: "ڤ", type: "character", description: "Pa dengan 3 titik di atas", isPreset: true },
  { id: "j_q", latin: "q", arabic: "ق", type: "character", isPreset: true },
  { id: "j_r", latin: "r", arabic: "ر", type: "character", isPreset: true },
  { id: "j_s", latin: "s", arabic: "س", type: "character", isPreset: true },
  { id: "j_t", latin: "t", arabic: "ت", type: "character", isPreset: true },
  { id: "j_v", latin: "v", arabic: "ۏ", type: "character", description: "Wa dengan titik untuk V", isPreset: true },
  { id: "j_w", latin: "w", arabic: "و", type: "character", isPreset: true },
  { id: "j_y", latin: "y", arabic: "ي", type: "character", isPreset: true },
  { id: "j_z", latin: "z", arabic: "ز", type: "character", isPreset: true },

  // Vowels
  { id: "j_a", latin: "a", arabic: "ا", type: "character", isPreset: true },
  { id: "j_i", latin: "i", arabic: "ي", type: "character", isPreset: true },
  { id: "j_u", latin: "u", arabic: "و", type: "character", isPreset: true },
  { id: "j_e", latin: "e", arabic: "ي", type: "character", description: "Vokal o/e taling memakai Ya, pepet biasanya kosong", isPreset: true },
  { id: "j_o", latin: "o", arabic: "و", type: "character", isPreset: true },

  // Common Jawi Word References
  { id: "jw_saya", latin: "saya", arabic: "ساي", type: "word", description: "Kata ganti saya (tanpa alif akhir)", isPreset: true },
  { id: "jw_buku", latin: "buku", arabic: "بوکو", type: "word", description: "Buku", isPreset: true },
  { id: "jw_kita", latin: "kita", arabic: "کيت", type: "word", description: "Kita (tanpa alif akhir)", isPreset: true },
  { id: "jw_pada", latin: "pada", arabic: "ڤد", type: "word", description: "Artikel pada (tanpa alif)", isPreset: true },
  { id: "jw_dan", latin: "dan", arabic: "دان", type: "word", description: "Kata hubung dan", isPreset: true },
  { id: "jw_yang", latin: "yang", arabic: "يڠ", type: "word", description: "Kata hubung yang", isPreset: true },
  { id: "jw_untuk", latin: "untuk", arabic: "اونتوق", type: "word", description: "Untuk", isPreset: true },
  { id: "jw_ke", latin: "ke", arabic: "ك", type: "word", description: "Ke", isPreset: true },
  { id: "jw_di", latin: "di", arabic: "د", type: "word", description: "Di", isPreset: true },
  { id: "jw_ini", latin: "ini", arabic: "ايني", type: "word", description: "Ini", isPreset: true },
  { id: "jw_itu", latin: "itu", arabic: "ايتو", type: "word", description: "Itu", isPreset: true },
  { id: "jw_dengan", latin: "dengan", arabic: "دڠن", type: "word", description: "Dengan", isPreset: true },
  { id: "jw_ada", latin: "ada", arabic: "اد", type: "word", description: "Ada (tanpa alif)", isPreset: true },
  { id: "jw_adalah", latin: "adalah", arabic: "اداله", type: "word", description: "Adalah", isPreset: true },
  { id: "jw_bahasa", latin: "bahasa", arabic: "بهاس", type: "word", description: "Bahasa", isPreset: true },
  { id: "jw_indonesia", latin: "indonesia", arabic: "ايندونيسيا", type: "word", description: "Indonesia", isPreset: true }
];

export const DEFAULT_PEGON_MAPPINGS: CustomMapping[] = [
  // Digraphs & Javanese sounds
  { id: "p_kh", latin: "kh", arabic: "خ", type: "digraph", isPreset: true },
  { id: "p_sy", latin: "sy", arabic: "ش", type: "digraph", isPreset: true },
  { id: "p_ng", latin: "ng", arabic: "ڠ", type: "digraph", description: "Huruf Nga", isPreset: true },
  { id: "p_ny", latin: "ny", arabic: "ڽ", type: "digraph", description: "Huruf Nya", isPreset: true },
  { id: "p_th", latin: "th", arabic: "ط", type: "digraph", description: "Tho atau T-tebal", isPreset: true },
  { id: "p_dh", latin: "dh", arabic: "ڊ", type: "digraph", description: "Dal bertitik bawah atau D-tebal", isPreset: true },

  // Consonants
  { id: "p_b", latin: "b", arabic: "ب", type: "character", isPreset: true },
  { id: "p_c", latin: "c", arabic: "چ", type: "character", description: "Ca (Jim bertitik 3)", isPreset: true },
  { id: "p_d", latin: "d", arabic: "د", type: "character", isPreset: true },
  { id: "p_f", latin: "f", arabic: "ف", type: "character", isPreset: true },
  { id: "p_g", latin: "g", arabic: "ࢴ", type: "character", description: "Kaf dengan 1 titik di bawah untuk Ga", isPreset: true },
  { id: "p_h", latin: "h", arabic: "ه", type: "character", isPreset: true },
  { id: "p_j", latin: "j", arabic: "ج", type: "character", isPreset: true },
  { id: "p_k", latin: "k", arabic: "ک", type: "character", isPreset: true },
  { id: "p_l", latin: "l", arabic: "ل", type: "character", isPreset: true },
  { id: "p_m", latin: "m", arabic: "م", type: "character", isPreset: true },
  { id: "p_n", latin: "n", arabic: "ن", type: "character", isPreset: true },
  { id: "p_p", latin: "p", arabic: "ڤ", type: "character", description: "Pê (Fa bertitik 3)", isPreset: true },
  { id: "p_q", latin: "q", arabic: "ق", type: "character", isPreset: true },
  { id: "p_r", latin: "r", arabic: "ر", type: "character", isPreset: true },
  { id: "p_s", latin: "s", arabic: "س", type: "character", isPreset: true },
  { id: "p_t", latin: "t", arabic: "ت", type: "character", isPreset: true },
  { id: "p_v", latin: "v", arabic: "ف", type: "character", isPreset: true },
  { id: "p_w", latin: "w", arabic: "و", type: "character", isPreset: true },
  { id: "p_y", latin: "y", arabic: "ي", type: "character", isPreset: true },
  { id: "p_z", latin: "z", arabic: "ز", type: "character", isPreset: true },

  // Vowels
  { id: "p_a", latin: "a", arabic: "ا", type: "character", isPreset: true },
  { id: "p_i", latin: "i", arabic: "ي", type: "character", isPreset: true },
  { id: "p_u", latin: "u", arabic: "و", type: "character", isPreset: true },
  { id: "p_e", latin: "e", arabic: "ي", type: "character", description: "Pegon e taling", isPreset: true },
  { id: "p_o", latin: "o", arabic: "و", type: "character", isPreset: true },

  // Pegon Word References
  { id: "pw_saya", latin: "saya", arabic: "سايا", type: "word", description: "Saya (Pegon menulis alif akhir)", isPreset: true },
  { id: "pw_buku", latin: "buku", arabic: "بوكو", type: "word", description: "Buku", isPreset: true },
  { id: "pw_kita", latin: "kita", arabic: "كيتا", type: "word", description: "Kita (Pegon menulis alif akhir)", isPreset: true },
  { id: "pw_dan", latin: "dan", arabic: "دان", type: "word", isPreset: true },
  { id: "pw_yang", latin: "yang", arabic: "ياڠ", type: "word", isPreset: true },
  { id: "pw_ke", latin: "ke", arabic: "ك", type: "word", description: "Ke", isPreset: true },
  { id: "pw_ini", latin: "ini", arabic: "ايني", type: "word", isPreset: true },
  { id: "pw_itu", latin: "itu", arabic: "ايتو", type: "word", isPreset: true },
  { id: "pw_ada", latin: "ada", arabic: "ادا", type: "word", description: "Ada (Pegon menulis alif)", isPreset: true }
];
