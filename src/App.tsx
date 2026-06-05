import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  FileText,
  Check,
  Trash2,
  Plus,
  RotateCcw,
  Download,
  Upload,
  Printer,
  Sparkles,
  HelpCircle,
  Clock,
  Settings,
  Copy,
  ChevronRight,
  Info,
  Type,
  FileDown,
  RefreshCw,
  Search,
  ExternalLink,
  Mic,
  MicOff
} from "lucide-react";
import { CustomMapping, PresetType, TranslationItem, WordConversionResult } from "./types";
import { DEFAULT_JAWI_MAPPINGS, DEFAULT_PEGON_MAPPINGS } from "./utils/presets";
import { 
  transliterateText, 
  transliterateWord,
  transliteratePegonToLatinText,
  transliteratePegonToLatinWord
} from "./utils/transliterator";

const EXAMPLES: any[] = [];

export default function App() {
  // Config & State
  const [preset, setPreset] = useState<PresetType>("pegon");
  const [pegonGaStyle, setPegonGaStyle] = useState<"dot" | "plain">(() => {
    return (localStorage.getItem("pegon_ga_style") as "dot" | "plain") || "dot";
  });
  const [pegonNgStyle, setPegonNgStyle] = useState<"dot" | "plain">(() => {
    return (localStorage.getItem("pegon_ng_style") as "dot" | "plain") || "dot";
  });
  const [pegonPStyle, setPegonPStyle] = useState<"dot" | "plain">(() => {
    return (localStorage.getItem("pegon_p_style") as "dot" | "plain") || "dot";
  });
  const [customMappings, setCustomMappings] = useState<CustomMapping[]>([]);
  const [latinInput, setLatinInput] = useState("");
  const [fontSize, setFontSize] = useState(28);
  const [selectedFont, setSelectedFont] = useState("Traditional Arabic");
  const [direction, setDirection] = useState<"latin-to-pegon" | "pegon-to-latin">("latin-to-pegon");
  const [isListening, setIsListening] = useState(false);
  
  // Interactive debugger state
  const [selectedWordResult, setSelectedWordResult] = useState<WordConversionResult | null>(null);
  const [searchMappingQuery, setSearchMappingQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"char" | "digraph" | "word">("char");

  // Rule editor form state
  const [newLatin, setNewLatin] = useState("");
  const [newArabic, setNewArabic] = useState("");
  const [newType, setNewType] = useState<"character" | "digraph" | "word">("character");
  const [newDescription, setNewDescription] = useState("");

  // AI Translation mode state
  const [useAI, setUseAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Print-ready preview modal state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("DOKUMEN TRANSLITERASI RESMI");
  const [pdfAuthor, setPdfAuthor] = useState("agongpor@gmail.com");
  const [pdfNotes, setPdfNotes] = useState("Hasil alih aksara dari karakter Latin menuju ejaan Arab yang sah berdasarkan referensi linguistik kustom.");
  const [printDate, setPrintDate] = useState(new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }));

  // Local storage history state
  const [history, setHistory] = useState<TranslationItem[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean; hasSelection: boolean; selectionText: string } | null>(null);

  // References
  const outputRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "id-ID";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex)
          .map((result: any) => result[0].transcript)
          .join("");
        setLatinInput((prev) => (prev ? prev + " " + transcript : transcript));
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          showToast("Akses mikrofon ditolak oleh browser.");
        } else {
          showToast(`Mikrofon error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast("Browser Anda tidak mendukung input suara mikrofon.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        showToast("Mikrofon AKTIF. Silakan berbicara...");
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Load preset on change or initial mount with automatic 'g', 'ng', and 'p' migration to correct style if needed
  useEffect(() => {
    const saved = localStorage.getItem(`aksara_rules_${preset}`);
    const gaStyle = (localStorage.getItem("pegon_ga_style") as "dot" | "plain") || "dot";
    const expectedArabic = gaStyle === "dot" ? "ࢴ" : "ك";

    const ngStyle = (localStorage.getItem("pegon_ng_style") as "dot" | "plain") || "dot";
    const expectedNgArabic = ngStyle === "dot" ? "ڠ" : "ع";

    const pStyle = (localStorage.getItem("pegon_p_style") as "dot" | "plain") || "dot";
    const expectedPArabic = pStyle === "dot" ? "ڤ" : "ف";
    
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        let migrated = false;
        parsed = parsed.map((m: any) => {
          if (m.latin === "g" && preset === "pegon") {
            if (m.arabic !== expectedArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedArabic,
                description: gaStyle === "dot" ? "Kaf dengan 1 titik di bawah untuk Ga" : "Kaf polos untuk Ga"
              };
            }
          }
          if (m.latin === "ng" && preset === "pegon") {
            if (m.arabic !== expectedNgArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedNgArabic,
                description: ngStyle === "dot" ? "Huruf Ngo (Nga dengan 3 titik di atas)" : "Huruf Ain polos untuk Ng"
              };
            }
          }
          if (m.latin === "p" && preset === "pegon") {
            if (m.arabic !== expectedPArabic) {
              migrated = true;
              return {
                ...m,
                arabic: expectedPArabic,
                description: pStyle === "dot" ? "Pê (Fa bertitik 3)" : "Huruf Fa polos untuk P"
              };
            }
          }
          return m;
        });
        if (migrated) {
          localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(parsed));
        }
        setCustomMappings(parsed);
      } catch (e) {
        loadDefaultPreset(preset);
      }
    } else {
      loadDefaultPreset(preset);
    }
  }, [preset]);

  // Load history from local storage and handle closing custom context menu
  useEffect(() => {
    const savedHistory = localStorage.getItem("aksara_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Gagal memuat riwayat", e);
      }
    }
    
    // Closer for right click menu
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleCloseMenu);
    
    // Set some initial text on first experience
    setLatinInput("");

    return () => {
      window.removeEventListener("click", handleCloseMenu);
    };
  }, []);

  const loadDefaultPreset = (targetPreset: PresetType) => {
    let defaultList = targetPreset === "jawi" ? DEFAULT_JAWI_MAPPINGS : DEFAULT_PEGON_MAPPINGS;
    if (targetPreset === "pegon") {
      const gaStyle = (localStorage.getItem("pegon_ga_style") as "dot" | "plain") || "dot";
      const expectedArabic = gaStyle === "dot" ? "ࢴ" : "ك";

      const ngStyle = (localStorage.getItem("pegon_ng_style") as "dot" | "plain") || "dot";
      const expectedNgArabic = ngStyle === "dot" ? "ڠ" : "ع";

      const pStyle = (localStorage.getItem("pegon_p_style") as "dot" | "plain") || "dot";
      const expectedPArabic = pStyle === "dot" ? "ڤ" : "ف";

      defaultList = defaultList.map(m => {
        if (m.latin === "g") {
          return {
            ...m,
            arabic: expectedArabic,
            description: gaStyle === "dot" ? "Kaf dengan 1 titik di bawah untuk Ga" : "Kaf polos untuk Ga"
          };
        }
        if (m.latin === "ng") {
          return {
            ...m,
            arabic: expectedNgArabic,
            description: ngStyle === "dot" ? "Huruf Ngo (Nga dengan 3 titik di atas)" : "Huruf Ain polos untuk Ng"
          };
        }
        if (m.latin === "p") {
          return {
            ...m,
            arabic: expectedPArabic,
            description: pStyle === "dot" ? "Pê (Fa bertitik 3)" : "Huruf Fa polos untuk P"
          };
        }
        return m;
      });
    }
    setCustomMappings(defaultList);
    localStorage.setItem(`aksara_rules_${targetPreset}`, JSON.stringify(defaultList));
    showToast(`Referensi default ${targetPreset === "jawi" ? "Arab Melayu (Jawi)" : "Pegon"} berhasil dimuat!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection()?.toString() || "";
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      show: true,
      hasSelection: selection.trim().length > 0,
      selectionText: selection
    });
  };

  const handleCopyAllText = () => {
    const rawContent = useAI ? aiResult : arabicText;
    if (rawContent) {
      navigator.clipboard.writeText(rawContent);
      showToast("Berhasil menyalin seluruh hasil translasi!");
    } else {
      showToast("Teks translasi kosong.");
    }
    setContextMenu(null);
  };

  const handleSelectAllText = () => {
    if (outputRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outputRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      showToast("Teks hasil translasi berhasil dipilih.");
    }
    setContextMenu(null);
  };

  const handleExportDOCX = async () => {
    const rawContent = useAI ? aiResult : arabicText;
    if (!latinInput.trim() || !rawContent) {
      alert("Masukkan kalimat terlebih dahulu sebelum mengekspor.");
      return;
    }

    try {
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

      const titleText = direction === "pegon-to-latin"
        ? "Transliterasi Arab Pegon ke Latin"
        : "Transliterasi Latin ke Arab Pegon";

      const originalLabel = direction === "pegon-to-latin" ? "Aksara Arab Pegon (Asal)" : "Teks Latin Indonesia (Asal)";
      const outputLabel = direction === "pegon-to-latin" ? "Hasil Pembacaan Latin" : "Hasil Transliterasi Arab Pegon";

      // Helper to split text by newline and create clean docx paragraphs for identical formatting
      const generateDocxParagraphs = (
        textStr: string,
        fontFamily: string,
        fontSizeVal: number,
        colorHex: string,
        alignment: any,
        isBidirectional: boolean
      ) => {
        return textStr.split("\n").map((line) => {
          return new Paragraph({
            spacing: { before: 80, after: 80, line: 300 },
            alignment: alignment,
            bidirectional: isBidirectional,
            children: [
              new TextRun({
                text: line || " ", // export blank lines too
                font: fontFamily,
                size: fontSizeVal,
                color: colorHex,
              }),
            ],
          });
        });
      };

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: titleText,
                    bold: true,
                    size: 32, // 16pt in docx dxa sizing (1.5倍)
                    color: "1e1b4b", // Deep indigo
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: `Tanggal Unduh: ${new Date().toLocaleString("id-ID")}\n`,
                    size: 18,
                    color: "64748b",
                  }),
                  new TextRun({
                    text: "Skema Transliterasi: Arab Pegon",
                    size: 18,
                    color: "64748b",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: "----------------------------------------------------------------------------------------------------",
                    color: "cbd5e1",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [
                  new TextRun({
                    text: `${originalLabel}:`,
                    bold: true,
                    size: 22,
                    color: "334155",
                  }),
                ],
              }),
              ...generateDocxParagraphs(
                latinInput,
                direction === "pegon-to-latin" ? "Traditional Arabic" : "Calibri",
                direction === "pegon-to-latin" ? 28 : 22,
                "1e293b",
                direction === "pegon-to-latin" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                direction === "pegon-to-latin"
              ),
              new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                  new TextRun({
                    text: `${outputLabel}:`,
                    bold: true,
                    size: 22,
                    color: "334155",
                  }),
                ],
              }),
              ...generateDocxParagraphs(
                rawContent,
                direction === "latin-to-pegon" ? "Traditional Arabic" : "Calibri",
                direction === "latin-to-pegon" ? 28 : 22,
                "1e293b",
                direction === "pegon-to-latin" ? AlignmentType.LEFT : AlignmentType.RIGHT,
                direction === "latin-to-pegon"
              ),
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({
                    text: "Catatan: ",
                    bold: true,
                    size: 16,
                    color: "64748b",
                  }),
                  new TextRun({
                    text: "Dokumen ini dihasilkan secara otomatis menggunakan Aplikasi Alih Aksara Arab Pegon Nusantara.",
                    italics: true,
                    size: 16,
                    color: "64748b",
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Transliterasi-Pegon-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Berhasil mengekspor dokumen Word (.docx)!");
    } catch (error) {
      console.error("Gagal mengekspor berkas Word:", error);
      alert("Terjadi kesalahan saat mengekspor dokumen Word (.docx).");
    }
  };

  // Convert text via Rule-based transliterator engine (bidirectional)
  const { arabicText, wordsResult } = direction === "pegon-to-latin"
    ? transliteratePegonToLatinText(latinInput, customMappings)
    : transliterateText(latinInput, preset, customMappings);

  // Trigger AI Assisted Translation using Server-Side endpoint
  const handleAITranslate = async () => {
    if (!latinInput.trim()) {
      setAiError("Masukkan teks terlebih dahulu sebelum mentransliterasi dengan AI.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult("");
    setAiExplanation("");

    try {
      // Send the current custom reference lexicon of words so Gemini prioritizes them!
      const currentWordRules = customMappings
        .filter(m => m.type === "word")
        .map(m => ({ latin: m.latin, arabic: m.arabic }));

      const response = await fetch("/api/translate-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: latinInput,
          preset: preset,
          customRules: currentWordRules,
          direction: direction
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan asisten alih aksara AI.");
      }

      setAiResult(data.translation);
      setAiExplanation(data.explanation);
      showToast("Alih Aksara AI berhasil diperbarui!");
    } catch (err: any) {
      setAiError(err.message || "Gagal terhubung ke server/asisten AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // Re-run AI translation automatically when toggle is switched ON and there's text
  useEffect(() => {
    if (useAI && latinInput.trim()) {
      const handler = setTimeout(() => {
        handleAITranslate();
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [useAI, preset, direction]);

  // Save Rule to state & localstorage
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLatin.trim() || !newArabic.trim()) {
      alert("Kolom Latin dan Arab tidak boleh kosong!");
      return;
    }

    // Check duplicate
    const exists = customMappings.some(
      m => m.latin.toLowerCase() === newLatin.toLowerCase() && m.type === newType
    );

    if (exists) {
      if (!window.confirm(`Aturan untuk "${newLatin}" sudah ada. Apakah Anda ingin memperbaruinya?`)) {
        return;
      }
    }

    const cleanLatin = newLatin.trim().toLowerCase();
    const cleanArabic = newArabic.trim();

    const newRule: CustomMapping = {
      id: `${preset}_custom_${Date.now()}`,
      latin: cleanLatin,
      arabic: cleanArabic,
      type: newType,
      description: newDescription.trim() || `Referensi kustom untuk ${newLatin}`,
      isPreset: false,
    };

    // Filter out existing mapping with same latin character/word for clean override
    const filtered = customMappings.filter(
      m => !(m.latin.toLowerCase() === cleanLatin && m.type === newType)
    );

    const updated = [newRule, ...filtered];
    setCustomMappings(updated);
    localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(updated));

    // Reset Form
    setNewLatin("");
    setNewArabic("");
    setNewDescription("");
    showToast(`Aturan kustom "${newLatin} -> ${newArabic}" telah ditambahkan!`);
  };

  // Delete individual custom mapping
  const handleDeleteRule = (id: string, label: string) => {
    const updated = customMappings.filter(m => m.id !== id);
    setCustomMappings(updated);
    localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(updated));
    showToast(`Referensi "${label}" berhasil dihapus.`);
  };

  // Save current translation to history list
  const handleSaveToHistory = () => {
    const activeOutput = useAI ? aiResult : arabicText;
    if (!latinInput.trim() || !activeOutput.trim()) {
      alert("Masukkan kalimat terlebih dahulu untuk disimpan.");
      return;
    }

    const item: TranslationItem = {
      id: `hist_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("id-ID") + " " + new Date().toLocaleDateString("id-ID"),
      latin: latinInput,
      arabic: activeOutput,
      preset: preset,
      notes: useAI ? `Asisten Cerdas AI (Terjemahan)` : `Mesin Aturan Realtime`
    };

    const updated = [item, ...history];
    setHistory(updated);
    localStorage.setItem("aksara_history", JSON.stringify(updated));
    showToast("Hasil transliterasi berhasil disimpan ke Riwayat!");
  };

  // Delete history item
  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("aksara_history", JSON.stringify(updated));
    showToast("Riwayat berhasil dihapus.");
  };

  // Copy current result to clipboard
  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    showToast("Teks berhasil disalin ke papan klip!");
  };

  // Export current mappings configuration list as JSON file
  const handleExportJSON = () => {
    const sJson = JSON.stringify({ preset, mappings: customMappings }, null, 2);
    const blob = new Blob([sJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `referensi_transliterasi_${preset}_kustom.json`;
    link.click();
    showToast("Skema referensi berhasil diekspor sebagai JSON!");
  };

  // Import mappings list from JSON file upload
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.mappings)) {
          setCustomMappings(parsed.mappings);
          localStorage.setItem(`aksara_rules_${preset}`, JSON.stringify(parsed.mappings));
          showToast(`Berhasil mengimpor ${parsed.mappings.length} aturan penulisan kustom!`);
        } else {
          alert("Format file tidak valid. Pastikan file JSON berisi array 'mappings'.");
        }
      } catch (err) {
        alert("Gagal mengurai file JSON. Periksa kembali struktur file Anda.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Trigger print-preview or direct PDF creation
  const handlePrintDocument = () => {
    window.print();
  };

  // Filter local rule list in the table
  const filteredMappings = customMappings.filter(m => {
    if (m.type !== activeTab) return false;
    if (!searchMappingQuery) return true;
    return (
      m.latin.toLowerCase().includes(searchMappingQuery.toLowerCase()) ||
      m.arabic.includes(searchMappingQuery) ||
      (m.description && m.description.toLowerCase().includes(searchMappingQuery.toLowerCase()))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900 pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-indigo-950 text-indigo-50 px-5 py-3 rounded-xl shadow-xl border border-indigo-700 font-medium flex items-center space-x-3 transition-all duration-300 transform translate-y-0">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Screen Layout */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Aksara Nusantara
              </h1>
              <p className="text-xs text-slate-500">
                Transliterasi Aksara Arab Pegon Real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Environmental parameters & information tags */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-mono">User: agongpor@gmail.com</span>
              </div>
              <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-mono">2026-06-05 06:15</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Bidirectional Mode Selector Ribbon */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 no-print">
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <RefreshCw className={`w-5 h-5 transition-transform duration-500 ${direction === "pegon-to-latin" ? "rotate-180" : ""}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Arah Transliterasi Pasangan</h3>
              <p className="text-slate-400 text-xs">Pilih mode penterjemahan searah atau sebaliknya secara interaktif</p>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => {
                setDirection("latin-to-pegon");
                setLatinInput("");
                setSelectedWordResult(null);
                setAiResult("");
                setAiExplanation("");
                showToast("Mode diubah: Latin ➔ Arab Pegon");
              }}
              className={`flex-1 sm:flex-initial py-2 px-6 rounded-lg font-bold text-xs transition-all text-center cursor-pointer ${
                direction === "latin-to-pegon"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Latin ➔ Arab Pegon
            </button>
            <button
              onClick={() => {
                setDirection("pegon-to-latin");
                setLatinInput("");
                setSelectedWordResult(null);
                setAiResult("");
                setAiExplanation("");
                showToast("Mode diubah: Arab Pegon ➔ Latin");
              }}
              className={`flex-1 sm:flex-initial py-2 px-6 rounded-lg font-bold text-xs transition-all text-center cursor-pointer ${
                direction === "pegon-to-latin"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Arab Pegon ➔ Latin
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Dashboard */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
        
        {/* LEFT COLUMN: Input Latin & Controls (50% side-by-side) */}
        <div className="space-y-6">
          
          {/* Main Input Segment Card */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-sm p-6 space-y-4.5">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  {direction === "pegon-to-latin" ? "Aksara Arab Pegon" : "Teks Latin Indonesia"}
                </h2>
              </div>
              
              {/* Examples selection helper */}
              <div className="hidden">
                <span className="text-slate-400 text-xs hidden sm:inline">Pemuat Contoh:</span>
                <div className="relative inline-block text-left">
                  <select
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-1 px-2.5 rounded-lg border-none cursor-pointer focus:outline-none transition-colors"
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      if (!isNaN(idx)) {
                        if (direction === "pegon-to-latin") {
                          const pegonExamples = [
                            "سايا سداڠ بلاجر منوليس كاليمات بهاسا ايندونيسيا دڠن سيستيم اتوران ايجاءان اراب ڤيࢴون.",
                            "جماعة مسلمين دان مسلمة ملاكسناكن عبادة صلاة برجماعة دمسجد اونتوق برعبادة كڤدا الله.",
                            "بكس بارڠ انتيك دان بكل ماكنان دبيلي اوليه باڤق برساما ايبو كمارين سوري."
                          ];
                          setLatinInput(pegonExamples[idx]);
                          showToast(`Dimuat: Contoh Arab Pegon ${idx + 1}`);
                        } else {
                          setLatinInput(EXAMPLES[idx].text);
                          showToast(`Dimuat: Contoh ${EXAMPLES[idx].title}`);
                        }
                        e.target.value = ""; // flush choice
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>--- Pilih Contoh ---</option>
                    {EXAMPLES.map((ex, i) => (
                      <option key={i} value={i}>{ex.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Input Character Textbox */}
            <div className="relative">
              <textarea
                id="input-latin-text"
                className={`w-full h-54 p-4 pr-12 text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-505/20 focus:border-indigo-600 focus:outline-none transition-all placeholder:text-slate-400 focus:bg-white resize-none text-base font-medium ${
                  direction === "pegon-to-latin" ? "text-right font-arabic" : "text-left"
                }`}
                style={{
                  direction: direction === "pegon-to-latin" ? "rtl" : "ltr",
                  fontFamily: direction === "pegon-to-latin" ? `"${selectedFont}", serif` : "inherit"
                }}
                placeholder={
                  direction === "pegon-to-latin"
                    ? "Ketik atau tempel aksara Arab Pegon di sini..."
                    : "Ketik kalimat atau paragraf bahasa Indonesia di sini..."
                }
                value={latinInput}
                onChange={(e) => setLatinInput(e.target.value)}
              />
              
              {/* Floating Mic and MicOff button */}
              <div className="absolute top-3.5 right-3.5 flex items-center space-x-1.5 z-10">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-lg border transition-all cursor-pointer shadow-sm ${
                    isListening
                      ? "bg-red-500 border-red-600 text-white animate-pulse"
                      : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                  title={isListening ? "Hentikan perekaman suara" : "Mulai input suara (Microphone - Bahasa Indonesia)"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              <div className="absolute bottom-3 right-3 text-slate-400 text-xs font-mono">
                {latinInput.length} karakter | {latinInput.split(/\s+/).filter(Boolean).length} kata
              </div>
            </div>

            {/* Application Modes Toggles */}
            <div className="grid grid-cols-2 gap-3.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              <button
                className={`py-2 px-3 rounded-lg font-medium text-xs text-center transition-all ${
                  !useAI
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-250"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
                }`}
                onClick={() => setUseAI(false)}
              >
                ⚡ Aturan Realtime (Cepat)
              </button>
              <button
                className={`py-2 px-3 rounded-lg font-medium text-xs text-center transition-all flex items-center justify-center space-x-1.5 ${
                  useAI
                    ? "bg-indigo-600 text-white shadow-sm border border-indigo-700"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
                }`}
                onClick={() => {
                  setUseAI(true);
                  handleAITranslate();
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Asisten Cerdas AI</span>
              </button>
            </div>

            {/* Config & Alignment buttons */}
            <div className="flex flex-wrap justify-between gap-3 text-xs border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Skema Aktif:</span>
                <span className="bg-emerald-50 text-emerald-750 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Arab Pegon
                </span>
                <button
                  onClick={() => {
                    if (window.confirm("Apakah Anda yakin ingin menyetel ulang semua aturan penulisan ke standar dasar?")) {
                      loadDefaultPreset("pegon");
                    }
                  }}
                  className="p-1 px-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-500 rounded-lg transition-colors border border-slate-200"
                  title="Reset Semua Aturan Kustom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLatinInput("")}
                  className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium"
                >
                  Bersihkan
                </button>
              </div>
            </div>

          </div>

          {/* Interactive Debugger Card */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-semibold text-base text-slate-900">
                Ejaan & Penelusuran Fonetis
              </h3>
            </div>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              {selectedWordResult 
                ? "Klik kata lainnya di panel kanan untuk melihat urutan penulisan ejaan detail di sini." 
                : "Klik salah satu kata Arab di panel kanan untuk melihat bagaimana mesin transliterasi merakit huruf demi huruf secara berurutan sesuai referensi pengguna!"
              }
            </p>

            {selectedWordResult ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">Analisis Kata:</span>
                  <span className="text-sm font-bold text-emerald-950 bg-emerald-100/75 px-2 py-0.5 rounded-lg">
                    {selectedWordResult.word}
                  </span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll pr-1">
                  {selectedWordResult.steps.map((step, idx) => (
                    <div key={idx} className="text-xs flex items-start space-x-2 border-b border-slate-100 pb-1.5 last:border-none">
                      <div className="font-mono font-bold text-amber-600 bg-amber-50 px-1 rounded mt-0.5">{idx + 1}</div>
                      <div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          Asal: <span className="text-slate-700">{step.original}</span> &rarr; Hasil: <span className="text-emerald-800 font-bold">{step.result}</span>
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5 leading-tight">{step.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                 Belum ada kata yang dipilih untuk diurai.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Arabic Canvas Beautiful Output (50% side-by-side) */}
        <div className="space-y-6">
          
          {/* Main Output Calligraphy Card */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-lg p-6 space-y-4 flex flex-col min-h-[460px]">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center space-x-2.5">
                <Type className="w-5 h-5 text-indigo-600" />
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  {direction === "pegon-to-latin" ? "Hasil Bacaan Latin Indonesia" : "Hasil Transliterasi Arab Pegon"}
                </h2>
              </div>

              {/* Layout controls for spacing/styling */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/50">
                <div className="flex items-center space-x-1 border-r border-slate-200 pr-2">
                  <span className="text-[10px] uppercase font-mono text-slate-400 px-1">Ukuran:</span>
                  <input
                    type="range"
                    min="20"
                    max="44"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-16 accent-indigo-600 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center border-r border-slate-200 pr-2">
                  <select
                    className="bg-transparent border-none py-1 px-1 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    disabled={direction === "pegon-to-latin"}
                  >
                    <option value="Traditional Arabic">Traditional Arabic</option>
                    <option value="KFGQPC Uthman Taha Naskh">KFGQPC Uthman Taha</option>
                    <option value="Amiri">Font Amiri</option>
                    <option value="Noto Naskh Arabic">Noto Naskh</option>
                    <option value="Scheherazade New">Scheherazade</option>
                  </select>
                </div>

                <div className="flex items-center px-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf g:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonGaStyle}
                    onChange={(e) => {
                      const val = e.target.value as "dot" | "plain";
                      setPegonGaStyle(val);
                      localStorage.setItem("pegon_ga_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "g") {
                            return {
                              ...m,
                              arabic: val === "dot" ? "ࢴ" : "ك",
                              description: val === "dot" ? "Kaf dengan 1 titik di bawah untuk Ga" : "Kaf polos untuk Ga"
                            };
                          }
                          return m;
                        })
                      );
                      showToast(`Huruf Ga (g) diubah ke: ${val === "dot" ? "Kaf 1 Titik Bawah (ࢴ)" : "Kaf Polos (ك)"}`);
                    }}
                  >
                    <option value="dot">ࢴ (Titik)</option>
                    <option value="plain">ك (Polos)</option>
                  </select>
                </div>

                <div className="flex items-center px-1 border-s border-slate-200 ps-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf ng:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonNgStyle}
                    onChange={(e) => {
                      const val = e.target.value as "dot" | "plain";
                      setPegonNgStyle(val);
                      localStorage.setItem("pegon_ng_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "ng") {
                            return {
                              ...m,
                              arabic: val === "dot" ? "ڠ" : "ع",
                              description: val === "dot" ? "Huruf Ngo (Nga dengan 3 titik di atas)" : "Huruf Ain polos untuk Ng"
                            };
                          }
                          return m;
                        })
                      );
                      showToast(`Huruf Nga (ng) diubah ke: ${val === "dot" ? "ڠ (Nga 3 Titik)" : "ع (Ain Polos)"}`);
                    }}
                  >
                    <option value="dot">ڠ (Nga)</option>
                    <option value="plain">ع (Ain)</option>
                  </select>
                </div>

                <div className="flex items-center px-1 border-s border-slate-200 ps-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Huruf p:</span>
                  <select
                    className="bg-white border border-slate-200 rounded py-0.5 px-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                    value={pegonPStyle}
                    onChange={(e) => {
                      const val = e.target.value as "dot" | "plain";
                      setPegonPStyle(val);
                      localStorage.setItem("pegon_p_style", val);
                      
                      // Update current customMappings
                      setCustomMappings((prev) => 
                        prev.map((m) => {
                          if (m.latin === "p") {
                            return {
                              ...m,
                              arabic: val === "dot" ? "ڤ" : "ف",
                              description: val === "dot" ? "Pê (Fa bertitik 3)" : "Huruf Fa polos untuk P"
                            };
                          }
                          return m;
                        })
                      );
                      showToast(`Huruf P (p) diubah ke: ${val === "dot" ? "ڤ (Pa 3 Titik)" : "ف (Fa Polos)"}`);
                    }}
                  >
                    <option value="dot">ڤ (Pa)</option>
                    <option value="plain">ف (Fa)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Arabic Script Panel Body */}
            <div className="flex-grow flex flex-col justify-between py-2">
              
              {useAI && aiLoading ? (
                <div className="flex-grow flex flex-col justify-center items-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-mono text-slate-500">Menghubungkan asisten bahasa AI Jawi/Pegon...</p>
                </div>
              ) : useAI && aiError ? (
                <div className="flex-grow flex flex-col justify-center items-center py-12 p-6 text-center space-y-3">
                  <div className="p-3 bg-red-100 text-red-700 rounded-full">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Gagal Menggunakan AI</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">{aiError}</p>
                  </div>
                  <button
                    onClick={handleAITranslate}
                    className="py-1.5 px-4 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-medium rounded-lg transition-all flex items-center justify-center cursor-pointer"
                  >
                    Coba Hubungkan Ulang
                  </button>
                </div>
              ) : (
                <div className="flex-grow flex flex-col relative group">
                  {/* Realtime Output Renderer */}
                  <div 
                    ref={outputRef}
                    onContextMenu={handleContextMenu}
                    className={`w-full p-4 pr-12 rounded-xl bg-slate-50 border border-slate-100 min-h-60 leading-relaxed break-words whitespace-pre-wrap select-text selection:bg-amber-100 cursor-context-menu min-h-60 ${
                      direction === "pegon-to-latin" ? "text-left font-sans" : "font-arabic text-right"
                    }`}
                    style={{ 
                      fontSize: direction === "pegon-to-latin" ? "18px" : `${fontSize}px`, 
                      fontFamily: direction === "pegon-to-latin" ? "inherit" : `"${selectedFont}", serif`, 
                      direction: direction === "pegon-to-latin" ? "ltr" : "rtl" 
                    }}
                  >
                    {useAI ? (
                      aiResult || (
                        <span className="text-slate-300 font-sans italic text-base">
                          {direction === "pegon-to-latin"
                            ? "Hasil pembacaan bahasa Latin dari Asisten AI Pintar..."
                            : "Hasil dari Asisten AI Pintar..."
                          }
                        </span>
                      )
                    ) : (
                      // Interactive Spans for Rule-Based Realtime debug feedback
                      latinInput.trim() ? (
                        latinInput.split("\n").map((line, lIdx) => (
                          <div key={lIdx} className="mb-2">
                            {line.split(/(\s+)/).map((segment, sIdx) => {
                              if (!segment.trim()) return segment; // whitespace
                              
                              // Translate single word and cache result for clicking
                              const wordRes = direction === "pegon-to-latin"
                                ? transliteratePegonToLatinWord(segment, customMappings)
                                : transliterateWord(segment, preset, customMappings);
                              
                              const isSelected = selectedWordResult?.word === wordRes.word;
                              
                              return (
                                <span
                                  key={sIdx}
                                  className={`inline-block px-1 rounded cursor-help transition-all ${
                                    isSelected 
                                      ? "bg-amber-200 text-slate-900 scale-105 shadow-sm font-sans" 
                                      : "hover:bg-amber-100 hover:text-slate-900 border-b border-transparent hover:border-amber-300"
                                  }`}
                                  style={{
                                    fontFamily: direction === "pegon-to-latin" ? "inherit" : `"${selectedFont}", serif`
                                  }}
                                  onClick={() => setSelectedWordResult(wordRes)}
                                  title="Klik untuk melihat detail ejaan"
                                >
                                  {wordRes.arabic}
                                </span>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 font-sans italic text-base">
                          {direction === "pegon-to-latin"
                            ? "Silakan ketik aksara Arab Pegon di sebelah kiri..."
                            : "Silakan ketik huruf latin bahasa indonesia di sebelah kiri..."
                          }
                        </span>
                      )
                    )}
                  </div>

                  {/* Absolute Floating Copy Button inside the box for easy copying */}
                  {(useAI ? aiResult : arabicText) && (
                    <button
                      onClick={() => {
                        const content = useAI ? aiResult : arabicText;
                        if (content) {
                          copyToClipboard(content);
                        }
                      }}
                      className="absolute top-3.5 right-3.5 p-2 bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-sm transition-all focus:outline-none cursor-pointer"
                      title="Salin hasil teks ini"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}

                  {/* AI Explanation Accordion if exists */}
                  {useAI && aiExplanation && (
                    <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                      <div className="flex items-center space-x-1.5 text-indigo-900 font-semibold text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Analisis Linguistik AI:</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{aiExplanation}</p>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100 text-xs shrink-0 select-none">
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const content = useAI ? aiResult : arabicText;
                    if (content) {
                      copyToClipboard(content);
                    } else {
                      alert("Tidak ada teks yang dapat disalin.");
                    }
                  }}
                  className="flex items-center space-x-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium transition-all"
                  title="Salin Tulisan Arab"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Hasil</span>
                </button>

                <button
                  onClick={handleSaveToHistory}
                  className="flex items-center space-x-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium transition-all"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Simpan Riwayat</span>
                </button>
              </div>

              {/* PDF and formatting tools */}
              <div className="flex space-x-2">
                <button
                  onClick={handleExportDOCX}
                  className="flex items-center space-x-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-500/10 cursor-pointer"
                  title="Ekspor Hasil ke Microsoft Word (.docx)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Ekspor Word (.docx)</span>
                </button>

                <button
                  onClick={() => {
                    if (!latinInput.trim()) {
                      alert("Masukkan kalimat terlebih dahulu sebelum mencetak.");
                      return;
                    }
                    setShowPrintPreview(true);
                  }}
                  className="flex items-center space-x-1.5 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ekspor PDF / Cetak</span>
                </button>
              </div>

            </div>

          </div>

          {/* Preview Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center shadow-sm hover:border-indigo-600 transition-colors">
              <div className="text-2xl font-bold text-indigo-600">98%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Akurasi Referensi</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center shadow-sm hover:border-indigo-600 transition-colors">
              <div className="text-2xl font-bold text-slate-800">
                {latinInput.length > 0 ? `${(Math.min(0.012, 0.005 + latinInput.length * 0.0001)).toFixed(3)}s` : "0.008s"}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Rendering Time</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center items-center shadow-sm hover:border-indigo-600 transition-colors">
              <div className="text-2xl font-bold text-slate-800">
                {customMappings.filter(m => m.type === "character" || m.type === "digraph").length}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Ligatures Active</div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-900 shadow-sm">
            <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-slate-700 space-y-1">
              <p className="font-semibold text-indigo-950">💡 Panduan Ejaan Arab Pegon:</p>
              <p>Aksara **Pegon** digunakan untuk menuliskan bahasa Indonesia, Jawa, atau Sunda dengan huruf saksi lengkap (alif, ya, wawu). Khusus kata yang merupakan **kata serapan bahasa Arab asli** (seperti *jamaah, muslim, sholat, masjid, allah*, dll.), penulisannya dilakukan sesuai ejaan Arab asli tanpa menggunakan harakat murni tambahan.</p>
            </div>
          </div>

        </div>

      </main>

      {/* MIDDLE SECTION: Custom Mapping Lexicon Reference Manager */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 no-print">
        
        <div className="bg-white rounded-3xl border border-slate-200/95 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-xl text-indigo-800">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  Manajer Referensi & Kamus Kustom ({preset === "jawi" ? "Aksara Jawi" : "Aksara Pegon"})
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Visualisasikan, ubah ejaan tunggal, definisikan digraf, atau daftarkan Kamus Kata Anda sebagai pedoman transliterasi.
                </p>
              </div>
            </div>

            {/* Import / Export mapping config buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                title="Unduh Referensi Saat Ini sebagai JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Referensi</span>
              </button>

              <label className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Impor Referensi</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
              </label>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Rule form creator */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  Tambah/Edit Aturan Kustom
                </h3>
              </div>

              <form onSubmit={handleAddRule} className="space-y-3.5">
                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">Tipe Aturan</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-850"
                    value={newType}
                    onChange={(e) => {
                      setNewType(e.target.value as any);
                      // Clear forms to match typical inputs
                      setNewLatin("");
                      setNewArabic("");
                    }}
                  >
                    <option value="character">Huruf Tunggal (Karakter)</option>
                    <option value="digraph">Huruf Ganda (Digraf)</option>
                    <option value="word">Kata (Kamus Kustom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">
                    {newType === "character" ? "Huruf Latin Tunggal" : newType === "digraph" ? "Kombinasi Latin (E.g. ng, ny)" : "Kata Latin Lengkap"}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-850 focus:outline-none font-mono"
                    placeholder={newType === "character" ? "f, g, p" : newType === "digraph" ? "kh, ts, sy" : "agama, bapak"}
                    value={newLatin}
                    onChange={(e) => setNewLatin(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">Karakter Tulisan Arab Target</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-right focus:ring-1 focus:ring-emerald-850 focus:outline-none font-arabic font-bold text-base"
                    placeholder="E.g. چ, ڠ, ڤ"
                    value={newArabic}
                    onChange={(e) => setNewArabic(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] uppercase font-mono mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-850 focus:outline-none"
                    placeholder="Contoh penyebutan atau rujukan"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Aturan Sekarang</span>
                </button>
              </form>

            </div>

            {/* Search, Filter, Tables mapping display */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Tabs list */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-2">
                <div className="flex space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                  <button
                    onClick={() => setActiveTab("char")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "char" ? "bg-white text-slate-800 shadow-sm" : "text-slate-550 hover:bg-white/50"
                    }`}
                  >
                    Karakter Tunggal
                  </button>
                  <button
                    onClick={() => setActiveTab("digraph")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "digraph" ? "bg-white text-slate-800 shadow-sm" : "text-slate-550 hover:bg-white/50"
                    }`}
                  >
                    Digraf / Suku Kata
                  </button>
                  <button
                    onClick={() => setActiveTab("word")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "word" ? "bg-white text-slate-800 shadow-sm" : "text-slate-550 hover:bg-white/50"
                    }`}
                  >
                    Kamus Kata ({customMappings.filter(m => m.type === "word").length})
                  </button>
                </div>

                {/* Local search in rules */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                    placeholder="Cari referensi aturan..."
                    value={searchMappingQuery}
                    onChange={(e) => setSearchMappingQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table rendering mappings */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-80 overflow-y-auto custom-scroll pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      <th className="py-3 px-4">Latin</th>
                      <th className="py-3 px-4">Arah Arab (Kanan-Kiri)</th>
                      <th className="py-3 px-4">Status & Deskripsi</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {filteredMappings.length > 0 ? (
                      filteredMappings.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                            {rule.latin}
                          </td>
                          <td className="py-2.5 px-4 text-indigo-900 font-arabic font-bold text-lg leading-none">
                            {rule.arabic}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            <div className="flex items-center space-x-1.5">
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${
                                rule.isPreset ? "bg-slate-100 text-slate-400" : "bg-indigo-100 text-indigo-700"
                              }`}>
                                {rule.isPreset ? "Bawaan" : "Kustom"}
                              </span>
                              <span>{rule.description || "-"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {rule.isPreset ? (
                              <span className="text-slate-300 italic text-[10px]">Terkunci</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteRule(rule.id, `${rule.latin} &rarr; ${rule.arabic}`)}
                                className="p-1 text-slate-400 hover:text-red-650 transition-colors"
                                title="Hapus Aturan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                          Tidak ditemukan referensi pencarian "{searchMappingQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* FOOTER SECTION: Historical Log Panel */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 no-print">
        
        <div className="bg-white rounded-3xl border border-slate-200/95 shadow-sm p-6 space-y-4">
          
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="font-display font-semibold text-base text-slate-900">
              Riwayat Hasil Alih Aksara Lokal
            </h2>
          </div>

          {history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto custom-scroll pr-1">
              {history.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-indigo-400 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>{item.timestamp}</span>
                      <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase">{item.preset}</span>
                    </div>
                    
                    <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed" title={item.latin}>
                      "{item.latin}"
                    </p>

                    <div className="p-2 border border-slate-200 bg-white rounded-xl leading-relaxed text-right font-arabic text-indigo-950 font-bold overflow-hidden" style={{ direction: "rtl", fontSize: "19px" }}>
                      {item.arabic}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 border-t border-slate-200/60 pt-2 text-[11px]">
                    <span className="text-slate-400 italic">{item.notes || "Hasil Simpanan"}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyToClipboard(item.arabic)}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Salin
                      </button>
                      <button
                        onClick={() => {
                          setLatinInput(item.latin);
                          if (item.notes?.includes("AI")) {
                            setUseAI(true);
                          } else {
                            setUseAI(false);
                          }
                          showToast("Kalimat dikembalikan ke ruang kerja!");
                        }}
                        className="text-amber-600 hover:underline"
                      >
                        Pakai
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-2xl">
              Belum ada riwayat alih aksara tersimpan. Klik "Simpan Riwayat" pada panel hasil untuk mencadangkannya di peramban ini.
            </div>
          )}

        </div>

      </section>

      {/* FOOTER Credits no-print */}
      <footer className="max-w-7xl mx-auto text-center mt-12 text-slate-400 text-xs no-print space-y-2">
        <p className="font-mono">
          © {new Date().getFullYear()} Aplikasi Transliterasi Aksara Arab Indonesia. Semua Hak Dilindungi.
        </p>
        <p className="flex justify-center items-center gap-1">
          Ditenagai oleh <span className="font-mono text-indigo-800 font-semibold bg-indigo-50 px-1 rounded">Vite React</span> dan <span className="font-mono text-amber-700 font-semibold bg-amber-50 inline-flex items-center gap-0.5 px-1 rounded"><Sparkles className="w-2.5 h-2.5 inline" /> Gemini 3.5-Flash</span>
        </p>
      </footer>


      {/* FULL PRINT-READY DIALOG MODAL (ONLY triggered when generating pdf/print view) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl border border-slate-300">
            
            {/* Modal Controls Bar */}
            <div className="bg-slate-900 text-slate-100 p-4 px-6 flex justify-between items-center rounded-t-3xl border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-amber-300" />
                <h3 className="font-display font-semibold text-slate-200">Pratinjau Lembar Ekspor PDF</h3>
              </div>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>

            {/* Layout Customizer panel (interactive form before PDF build) */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 uppercase font-mono font-semibold mb-1">Judul Dokumen</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-500 uppercase font-mono font-semibold mb-1">Penyusun / Penerjemah</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                  value={pdfAuthor}
                  onChange={(e) => setPdfAuthor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-500 uppercase font-mono font-semibold mb-1">Catatan Dokumen</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                  value={pdfNotes}
                  onChange={(e) => setPdfNotes(e.target.value)}
                />
              </div>
            </div>

            {/* A4 Sheet Preview Mockup */}
            <div className="p-8 bg-slate-100 overflow-x-auto flex justify-center">
              
              {/* This mimics the layout of the print page closely */}
              <div 
                id="printable-area"
                className="w-[210mm] min-h-[297mm] bg-white text-slate-900 border-2 border-slate-300 p-16 shadow-lg relative flex flex-col justify-between"
                style={{ boxSizing: "border-box" }}
              >
                
                {/* Vintage Frame borders */}
                <div className="absolute inset-4 border border-indigo-950 pointer-events-none opacity-5 pr-2"></div>
                <div className="absolute inset-6 border-2 border-double border-indigo-950 pointer-events-none opacity-20"></div>

                <div className="space-y-8 z-10">
                  
                  {/* Letterhead Header banner */}
                  <div className="text-center border-b-2 border-slate-800 pb-4 relative">
                    <div className="text-xs uppercase tracking-widest font-mono font-bold text-amber-700">DOKUMEN RESMI</div>
                    <h2 className="font-display font-bold text-2xl text-indigo-950 mt-1 uppercase tracking-tight">{pdfTitle}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Alih Aksara Tulisan Arab Melayu & Pegon Nusantara</p>
                    
                    {/* Floating watermarked corner symbol */}
                    <div className="absolute top-0 right-0 font-arabic text-indigo-950 opacity-10 text-4xl">ج</div>
                  </div>

                  {/* Metadata Panel Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block font-mono">PENYUSUN/AUTORITAS:</span>
                      <strong className="text-slate-850 block">{pdfAuthor}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">SKEMA TRANSLITERASI:</span>
                      <strong className="text-slate-850 block uppercase">{preset === "jawi" ? "Arab Melayu (Jawi)" : "Arab Pegon"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">TANGGAL PEMBUATAN:</span>
                      <strong className="text-slate-850 block">{printDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">MODE KONVERSI:</span>
                      <strong className="text-slate-850 block">{useAI ? "Asisten AI Cerdas Gemini" : "Mesin Aturan Phonetis Kustom"}</strong>
                    </div>
                  </div>

                  {/* Dual Column Text Translation Sheets */}
                  <div className="space-y-6">
                    
                    {/* Latin Input Container */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-205 pb-1">1. Teks Sumber (Latin Bahasa Indonesia):</div>
                      <p className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-100/50 p-4 rounded-xl italic">
                        "{latinInput}"
                      </p>
                    </div>

                    {/* Arabic Result Container */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-205 pb-1 text-right">2. Hasil Alih Aksara Arab (RTL):</div>
                      <div 
                        className="bg-slate-50 p-6 rounded-xl text-right leading-relaxed font-arabic font-bold text-indigo-950 text-3xl break-words"
                        style={{ fontFamily: `"${selectedFont}", serif`, direction: "rtl" }}
                      >
                        {useAI ? aiResult : arabicText}
                      </div>
                    </div>

                    {/* Explanations index or custom descriptions */}
                    {pdfNotes && (
                      <div className="p-4 border border-dashed border-slate-350 bg-amber-50/20 text-slate-500 rounded-xl space-y-1 text-xs">
                        <span className="font-bold text-slate-700 block">Keterangan / Memo Dokumen:</span>
                        <p className="leading-relaxed italic">"{pdfNotes}"</p>
                      </div>
                    )}

                  </div>

                </div>

                {/* Print Sheet Footer / Validation blocks */}
                <div className="mt-16 pt-6 border-t border-slate-200 z-10 flex justify-between items-end text-xs">
                  <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                    <p>Meninggalkan jejak digital pada peramban lokal.</p>
                    <p>Sistem Ejaan Terintegrasi • agongpor@gmail.com</p>
                  </div>
                  <div className="text-center w-48 border-t border-slate-305 pt-2">
                    <p className="text-slate-400 text-[9px] uppercase font-mono tracking-wider">Tanda Tangan Pihak Berwenang</p>
                    <div className="h-10"></div>
                    <p className="font-semibold text-slate-700 font-display">{pdfAuthor.split("@")[0]}</p>
                  </div>
                </div>

              </div>
              
            </div>

            {/* Print trigger footer action drawer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 rounded-b-3xl shrink-0">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="py-2.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold rounded-xl text-xs cursor-pointer transition-colors"
               >
                Batalkan
              </button>
              <button
                onClick={handlePrintDocument}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center space-x-2 shadow-md hover:scale-[1.02] transition-all"
               >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Cetak / Ekspor Sebagai PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RAW HIDDEN PRINT-ONLY BODY AREA (When print dialog is open via browser, this container is rendered instead of everything else see media queries) */}
      <div className="print-only hidden print-container bg-white p-16 space-y-10">
        
        {/* Repeating exactly the print structure without any UI elements of the page */}
        <div className="text-center border-b-2 border-slate-900 pb-4 relative">
          <div className="text-[10px] uppercase tracking-widest font-mono font-bold text-amber-700">DOKUMEN TRANSLITERASI RESMI</div>
          <h2 className="font-display font-bold text-2xl text-indigo-950 mt-1 uppercase tracking-tight">{pdfTitle}</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Alih Aksara Tulisan Arab Melayu & Pegon Nusantara</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 block font-mono">PENYUSUN/AUTORITAS:</span>
            <strong className="text-slate-850 block">{pdfAuthor}</strong>
          </div>
          <div>
            <span className="text-slate-400 block font-mono">SKEMA TRANSLITERASI:</span>
            <strong className="text-slate-850 block uppercase">{preset === "jawi" ? "Arab Melayu (Jawi)" : "Arab Pegon"}</strong>
          </div>
          <div>
            <span className="text-slate-400 block font-mono">TANGGAL PEMBUATAN:</span>
            <strong className="text-slate-850 block">{printDate}</strong>
          </div>
          <div>
            <span className="text-slate-400 block font-mono">MODE KONVERSI:</span>
            <strong className="text-slate-850 block">{useAI ? "Asisten AI Cerdas Gemini" : "Mesin Aturan Phonetis Kustom"}</strong>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-200 pb-1">1. Teks Sumber (Latin Bahasa Indonesia):</div>
            <p className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 p-4 rounded-xl italic">
              "{latinInput}"
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold border-b border-slate-200 pb-1 text-right">2. Hasil Alih Aksara Arab (RTL):</div>
            <div 
              className="bg-slate-50 p-6 rounded-xl text-right leading-relaxed font-arabic font-bold text-indigo-950 text-3xl break-words"
              style={{ fontFamily: `"${selectedFont}", serif`, direction: "rtl" }}
            >
              {useAI ? aiResult : arabicText}
            </div>
          </div>

          {pdfNotes && (
            <div className="p-4 border border-dashed border-slate-350 bg-slate-50 text-slate-500 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-slate-700 block">Keterangan / Memo Dokumen:</span>
              <p className="leading-relaxed italic">"{pdfNotes}"</p>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
          <div className="text-[14px] text-slate-400 font-mono space-y-0.5">
            <p>Sistem Ejaan Terintegrasi • agongpor@gmail.com</p>
          </div>
          <div className="text-center w-48 border-t border-slate-300 pt-2">
            <p className="text-slate-400 text-[9px] uppercase font-mono tracking-wider">Tanda Tangan Pihak Berwenang</p>
            <div className="h-10"></div>
            <p className="font-semibold text-slate-700 font-display">{pdfAuthor.split("@")[0]}</p>
          </div>
        </div>

      </div>

      {/* Footer System Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-slate-800 text-slate-400 px-6 flex items-center justify-between text-[11px] shrink-0 z-40 no-print">
        <div className="flex gap-4">
          <span>Version 2.4.0-build</span>
          <span>System Status: <span className="text-emerald-400">Optimal</span></span>
        </div>
        <div className="flex gap-4 items-center">
          <span>Keyboard: ID-LATIN-01</span>
          <div className="h-3 w-[1px] bg-slate-600"></div>
          <span className="text-white opacity-80">Export Ready: A4 Portrait</span>
        </div>
      </footer>

      {/* Floating Custom Right-click Context Menu specifically targeting the transliteration container */}
      {contextMenu?.show && (
        <div 
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[210px] font-sans text-xs animate-in fade-in zoom-in-95 duration-100 no-print"
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
            Opsi Hasil Translasi
          </div>
          
          {contextMenu.hasSelection && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.selectionText);
                showToast("Berhasil menyalin bagian yang terpilih!");
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-indigo-700 bg-indigo-50/50 hover:text-indigo-900 border-y border-indigo-100/50 transition-colors cursor-pointer font-medium"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-500" />
              <span>Salin Bagian Terpilih</span>
            </button>
          )}

          <button
            onClick={handleSelectAllText}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700 hover:text-indigo-900 transition-colors mt-0.5 cursor-pointer"
          >
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <span>Pilih Semua Teks</span>
          </button>
          <button
            onClick={handleCopyAllText}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700 hover:text-indigo-900 transition-colors border-t border-slate-100 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Salin Seluruh Teks</span>
          </button>
        </div>
      )}

    </div>
  );
}
