import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  RefreshCw,
  Send,
  ExternalLink,
  Search,
  KeyRound,
  BookOpen,
  Calculator,
  AlertTriangle,
  HelpCircle,
  Youtube,
  Sparkles,
  CheckCircle2,
  XCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Star,
  Highlighter,
  Trash2,
  X,
  Play,
  Scissors,
  LogOut,
} from "lucide-react";
import {
  SYLLABUS_TREE,
  DEFAULT_SEED_NOTES,
  StudyNoteData,
  YoutubeQueryItem,
  BlueprintMicroConcept,
  ExpandedMicroConceptChunk,
  RelatedGraphOption,
} from "./data/syllabus";
import {
  MathFormula,
  RichMathText,
  HighlightColor,
  HighlightItem,
  PinnedInlineTutorItem,
  HIGHLIGHT_COLOR_STYLES,
} from "./components/MathText";
import {
  InteractiveEconLab,
  PlotlyEconomicModel,
  SliderValuesMap,
} from "./components/InteractiveEconLab";
import { GatekeeperScreen } from "./components/GatekeeperScreen";
import {
  fetchStudyBlueprint,
  fetchMicroConceptExpansion,
  fetchRelatedGraphs,
  fetchPlotlyModel,
  fetchConceptVideos,
  fetchSubtopicPyqs,
  fetchInlineTutor,
  fetchVisionTutor,
  fetchChat,
} from "./services/geminiService";

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: Record<string, any>
    ) => Promise<HTMLCanvasElement>;
  }
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  isRedirectedOutOfScope?: boolean;
  graphShiftSummary?: string;
}

interface StoredProfileData {
  profileId: string;
  completedSubtopics: Record<string, boolean>;
  bookmarkedChapters: Record<string, boolean>;
  bookmarkedSubtopics: Record<string, boolean>;
  highlights: HighlightItem[];
  pinnedInlineTutor: PinnedInlineTutorItem[];
  cachedNotes: Record<string, StudyNoteData>;
  cachedModels: Record<string, PlotlyEconomicModel>;
  relatedGraphsByTopic?: Record<string, RelatedGraphOption[]>;
  cachedModelsByGraphId?: Record<string, Record<string, PlotlyEconomicModel>>;
  selectedGraphIdByTopic?: Record<string, string>;
  cachedYoutube: Record<string, YoutubeQueryItem[]>;
  chatHistory: Record<string, ChatMessage[]>;
  updatedAt: string;
}

interface FloatingSelectionToolbar {
  text: string;
  sectionLabel: string;
  x: number;
  topY: number;
  bottomY: number;
}

interface InlineTutorPopoverState {
  selectedText: string;
  question: string;
  answer: string | null;
  isLoading: boolean;
  error: string | null;
  x: number;
  y: number;
  isSaved: boolean;
}

interface CropRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface VisionModalState {
  croppedImageBase64: string;
  question: string;
  answer: string | null;
  isLoading: boolean;
  error: string | null;
  isSaved: boolean;
}

const ACTIVE_PROFILE_SEED_KEY = "cuet_coqp10_active_seed";
const THEME_STORAGE_KEY = "cuet_coqp10_theme_mode";
const GEMINI_API_KEY_STORAGE_KEY = "cuet_coqp10_gemini_api_key";
const DEFAULT_SEED_TOKEN = "cuet-pg-coqp10-default-scholar";

async function computeSha256ProfileId(input: string): Promise<string> {
  const normalized = input.trim() || DEFAULT_SEED_TOKEN;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return fullHex.slice(0, 12);
}

/**
 * Extracts readable text and any underlying LaTeX (`data-latex`) from the user's current DOM selection.
 */
function extractSelectionWithLatex(sel: Selection): string {
  const rawString = sel.toString().trim();
  if (!sel.rangeCount) return rawString;

  const range = sel.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement && node.dataset.latex) {
      return node.dataset.latex;
    }
    node = node.parentNode;
  }

  const fragment = range.cloneContents();
  const latexSpans = fragment.querySelectorAll?.("[data-latex]");
  if (latexSpans && latexSpans.length > 0) {
    latexSpans.forEach((el) => {
      const tex = el.getAttribute("data-latex");
      if (tex) {
        el.textContent = ` ${tex} `;
      }
    });
    const combined = (fragment.textContent || "").replace(/\s+/g, " ").trim();
    if (combined) return combined;
  }

  return rawString;
}

export default function App() {
  // Check localStorage for saved Gemini API key
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    const saved =
      localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) ||
      localStorage.getItem("gemini_api_key") ||
      "";
    return saved.trim();
  });

  // Light / Dark Theme Mode (persisted in localStorage)
  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  });
  const isLightMode = themeMode === "light";

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  // Navigation & Syllabus Tree State
  const [selectedUnit, setSelectedUnit] = useState<string>(SYLLABUS_TREE[0].unit);
  const [selectedChapter, setSelectedChapter] = useState<string>(
    SYLLABUS_TREE[0].chapters[0].title
  );
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>(
    SYLLABUS_TREE[0].chapters[0].subtopics[0]
  );

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    [SYLLABUS_TREE[0].unit]: true,
    [SYLLABUS_TREE[1].unit]: true,
  });
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    [SYLLABUS_TREE[0].chapters[0].title]: true,
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarViewMode, setSidebarViewMode] = useState<"syllabus" | "bookmarks">(
    "syllabus"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">(
    "all"
  );

  // SHA-256 Profile Persistence State
  const [profileId, setProfileId] = useState<string>("");
  const [completedSubtopics, setCompletedSubtopics] = useState<Record<string, boolean>>(
    {}
  );
  const [bookmarkedChapters, setBookmarkedChapters] = useState<Record<string, boolean>>(
    {}
  );
  const [bookmarkedSubtopics, setBookmarkedSubtopics] = useState<
    Record<string, boolean>
  >({});
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [pinnedInlineTutor, setPinnedInlineTutor] = useState<
    PinnedInlineTutorItem[]
  >([]);
  const [cachedNotes, setCachedNotes] = useState<Record<string, StudyNoteData>>(
    DEFAULT_SEED_NOTES
  );
  const [cachedModels, setCachedModels] = useState<
    Record<string, PlotlyEconomicModel>
  >({});
  const [relatedGraphsByTopic, setRelatedGraphsByTopic] = useState<
    Record<string, RelatedGraphOption[]>
  >({
    [SYLLABUS_TREE[0].chapters[0].subtopics[0]]:
      DEFAULT_SEED_NOTES[SYLLABUS_TREE[0].chapters[0].subtopics[0]]
        .relatedGraphs || [],
  });
  const [cachedModelsByGraphId, setCachedModelsByGraphId] = useState<
    Record<string, Record<string, PlotlyEconomicModel>>
  >({});
  const [selectedGraphIdByTopic, setSelectedGraphIdByTopic] = useState<
    Record<string, string>
  >({});
  const [generatingGraphIdByTopic, setGeneratingGraphIdByTopic] = useState<
    Record<string, string | null>
  >({});
  const [discoveringMenuByTopic, setDiscoveringMenuByTopic] = useState<
    Record<string, boolean>
  >({});
  const [cachedYoutube, setCachedYoutube] = useState<
    Record<string, YoutubeQueryItem[]>
  >({
    [SYLLABUS_TREE[0].chapters[0].subtopics[0]]:
      DEFAULT_SEED_NOTES[SYLLABUS_TREE[0].chapters[0].subtopics[0]].youtubeQueries,
  });
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});

  // Interactive Plotly Model State (Scoped by Sub-Topic ID)
  const [sliderValuesByTopic, setSliderValuesByTopic] = useState<
    Record<string, SliderValuesMap>
  >({});
  const [generatingModelByTopic, setGeneratingModelByTopic] = useState<
    Record<string, boolean>
  >({});
  const [modelErrorByTopic, setModelErrorByTopic] = useState<
    Record<string, string | null>
  >({});
  const [lastShiftNote, setLastShiftNote] = useState<string | undefined>(
    undefined
  );

  // Smart YouTube Concept Videos Toggle State (Scoped by Sub-Topic ID)
  const [showConceptVideos, setShowConceptVideos] = useState<boolean>(false);
  const [generatingVideosByTopic, setGeneratingVideosByTopic] = useState<
    Record<string, boolean>
  >({});
  const [videosErrorByTopic, setVideosErrorByTopic] = useState<
    Record<string, string | null>
  >({});

  // 1. Contextual Floating Toolbar & Inline Tutor State
  const [selectionToolbar, setSelectionToolbar] =
    useState<FloatingSelectionToolbar | null>(null);
  const [isAskGeminiExpanded, setIsAskGeminiExpanded] = useState<boolean>(false);
  const [inlineQuestionInput, setInlineQuestionInput] = useState<string>("");
  const [inlineTutorPopover, setInlineTutorPopover] =
    useState<InlineTutorPopoverState | null>(null);

  // 2. Persistent Screen Cropper (Vision) State
  const [isCropModeActive, setIsCropModeActive] = useState<boolean>(false);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState<boolean>(false);
  const [visionModal, setVisionModal] = useState<VisionModalState | null>(null);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const floatingToolbarRef = useRef<HTMLDivElement | null>(null);
  const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Switcher Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // AI Loading & Error State (Strictly Scoped per subtopicId)
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [generatingNotesByTopic, setGeneratingNotesByTopic] = useState<
    Record<string, boolean>
  >({});
  const [notesErrorByTopic, setNotesErrorByTopic] = useState<
    Record<string, string | null>
  >({});
  const [liveChecklistByTopic, setLiveChecklistByTopic] = useState<
    Record<
      string,
      {
        blueprintStatus: "running" | "completed";
        items: {
          id: string;
          index: number;
          title: string;
          status: "running" | "completed" | "failed";
          resolvedAt?: string;
        }[];
      }
    >
  >({});

  // Practice Quiz & Sub-Topic PYQ / Concept Verification State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [pyqSearchQuery, setPyqSearchQuery] = useState<string>("");
  const [pyqCategoryFilter, setPyqCategoryFilter] = useState<
    "all" | "pyq" | "verification"
  >("all");
  const [pyqYearFilter, setPyqYearFilter] = useState<
    "all" | "2025" | "2024" | "2023" | "2022" | "2021"
  >("all");
  const [generatingPyqsByTopic, setGeneratingPyqsByTopic] = useState<
    Record<string, boolean>
  >({});

  // Topic-Restricted Q&A Chat State (Scoped by Sub-Topic ID)
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoadingByTopic, setChatLoadingByTopic] = useState<
    Record<string, boolean>
  >({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Derived loading & error states strictly scoped to the currently selected sub-topic
  const isGeneratingNotes =
    generatingTopicId === selectedSubtopic ||
    !!generatingNotesByTopic[selectedSubtopic];
  const activeChecklist = liveChecklistByTopic[selectedSubtopic] || null;
  const notesError = notesErrorByTopic[selectedSubtopic] || null;
  const isGeneratingModel = !!generatingModelByTopic[selectedSubtopic];
  const modelError = modelErrorByTopic[selectedSubtopic] || null;
  const isGeneratingVideos = !!generatingVideosByTopic[selectedSubtopic];
  const videosError = videosErrorByTopic[selectedSubtopic] || null;
  const isChatLoading = !!chatLoadingByTopic[selectedSubtopic];

  const showNotification = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const handleClearApiKey = useCallback(() => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    localStorage.removeItem("gemini_api_key");
    setGeminiApiKey("");
    showNotification("Logged out & API key cleared from browser");
  }, [showNotification]);

  const handleSaveApiKey = useCallback(
    (key: string) => {
      const clean = key.trim();
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, clean);
      setGeminiApiKey(clean);
      showNotification("Gemini API key saved to local storage");
    },
    [showNotification]
  );

  // Flatten all subtopics for progress metrics
  const allSubtopicsList = useMemo(() => {
    const list: { unit: string; chapter: string; subtopic: string }[] = [];
    for (const u of SYLLABUS_TREE) {
      for (const c of u.chapters) {
        for (const s of c.subtopics) {
          list.push({ unit: u.unit, chapter: c.title, subtopic: s });
        }
      }
    }
    return list;
  }, []);

  const totalSubtopicsCount = allSubtopicsList.length;
  const completedCount = useMemo(
    () => allSubtopicsList.filter((item) => !!completedSubtopics[item.subtopic]).length,
    [allSubtopicsList, completedSubtopics]
  );
  const cachedCount = useMemo(
    () => allSubtopicsList.filter((item) => !!cachedNotes[item.subtopic]).length,
    [allSubtopicsList, cachedNotes]
  );
  const completionPercentage =
    totalSubtopicsCount > 0
      ? Math.round((completedCount / totalSubtopicsCount) * 100)
      : 0;

  const totalBookmarksCount = useMemo(() => {
    const chCount = Object.values(bookmarkedChapters).filter(Boolean).length;
    const subCount = Object.values(bookmarkedSubtopics).filter(Boolean).length;
    return chCount + subCount;
  }, [bookmarkedChapters, bookmarkedSubtopics]);

  // Initialize SHA-256 Profile on mount
  useEffect(() => {
    const savedSeed =
      localStorage.getItem(ACTIVE_PROFILE_SEED_KEY) || DEFAULT_SEED_TOKEN;
    computeSha256ProfileId(savedSeed).then((hashId) => {
      setProfileId(hashId);
      const storageKey = `cuet_coqp10_${hashId}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed: StoredProfileData = JSON.parse(raw);
          setCompletedSubtopics(parsed.completedSubtopics || {});
          setBookmarkedChapters(parsed.bookmarkedChapters || {});
          setBookmarkedSubtopics(parsed.bookmarkedSubtopics || {});
          setHighlights(parsed.highlights || []);
          setPinnedInlineTutor(parsed.pinnedInlineTutor || []);
          const cleanedCache: Record<string, StudyNoteData> = {};
          if (parsed.cachedNotes) {
            for (const [key, val] of Object.entries(parsed.cachedNotes)) {
              const hasDevanagari = /[\u0900-\u097F]/.test(
                JSON.stringify(val || {})
              );
              if (!hasDevanagari) {
                cleanedCache[key] = val;
              }
            }
            // Upgrade the built-in seed note to the Feynman Intuition-First + Complete 2021-2025 Sub-Topic PYQ edition if it was from an older cache
            for (const [seedKey, seedVal] of Object.entries(DEFAULT_SEED_NOTES)) {
              const existing = cleanedCache[seedKey];
              const hasFeynmanTraps = existing?.examTraps?.some((t) =>
                t.includes("The Trap:")
              );
              const hasFullPyqBank =
                (existing?.practiceQuestions?.length || 0) >=
                seedVal.practiceQuestions.length;
              const hasRelatedGraphs =
                Array.isArray(existing?.relatedGraphs) &&
                existing.relatedGraphs.length > 0;
              if (
                !existing ||
                !hasFeynmanTraps ||
                !hasFullPyqBank ||
                !hasRelatedGraphs
              ) {
                cleanedCache[seedKey] = seedVal;
              }
            }
          } else {
            Object.assign(cleanedCache, DEFAULT_SEED_NOTES);
          }
          setCachedNotes(cleanedCache);
          setCachedModels(parsed.cachedModels || {});
          if (parsed.relatedGraphsByTopic) {
            setRelatedGraphsByTopic((prev) => ({
              ...prev,
              ...parsed.relatedGraphsByTopic,
            }));
          }
          if (parsed.cachedModelsByGraphId) {
            setCachedModelsByGraphId(parsed.cachedModelsByGraphId);
          }
          if (parsed.selectedGraphIdByTopic) {
            setSelectedGraphIdByTopic(parsed.selectedGraphIdByTopic);
          }
          setCachedYoutube(parsed.cachedYoutube || {});
          setChatHistory(parsed.chatHistory || {});
        } catch {
          // Fallback to defaults if corrupted
        }
      }
    });
  }, []);

  // Persist to localStorage under cuet_coqp10_${profileId}
  useEffect(() => {
    if (!profileId) return;
    const storageKey = `cuet_coqp10_${profileId}`;
    const payload: StoredProfileData = {
      profileId,
      completedSubtopics,
      bookmarkedChapters,
      bookmarkedSubtopics,
      highlights,
      pinnedInlineTutor,
      cachedNotes,
      cachedModels,
      relatedGraphsByTopic,
      cachedModelsByGraphId,
      selectedGraphIdByTopic,
      cachedYoutube,
      chatHistory,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save progress in localStorage:", e);
    }
  }, [
    profileId,
    completedSubtopics,
    bookmarkedChapters,
    bookmarkedSubtopics,
    highlights,
    pinnedInlineTutor,
    cachedNotes,
    cachedModels,
    relatedGraphsByTopic,
    cachedModelsByGraphId,
    selectedGraphIdByTopic,
    cachedYoutube,
    chatHistory,
  ]);

  // Listen for text or formula selection (both mouseup & touchend for mobile touch screens)
  useEffect(() => {
    const handleSelectionEnd = (e: Event) => {
      if (isCropModeActive) return;
      if (
        (floatingToolbarRef.current &&
          floatingToolbarRef.current.contains(e.target as Node)) ||
        (inlinePopoverRef.current &&
          inlinePopoverRef.current.contains(e.target as Node))
      ) {
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          return;
        }

        if (
          workspaceRef.current &&
          sel.anchorNode &&
          workspaceRef.current.contains(sel.anchorNode)
        ) {
          const extractedText = extractSelectionWithLatex(sel);
          if (extractedText.length < 1 || extractedText.length > 600) {
            return;
          }
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setSelectionToolbar({
              text: extractedText,
              sectionLabel: "Study Notes Selection",
              x: Math.max(
                190,
                Math.min(window.innerWidth - 190, rect.left + rect.width / 2)
              ),
              topY: Math.max(72, rect.top - 10),
              bottomY: Math.min(window.innerHeight - 160, rect.bottom + 12),
            });
            setIsAskGeminiExpanded(false);
            setInlineQuestionInput("");
          }
        }
      }, 20);
    };

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("touchend", handleSelectionEnd);
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
    };
  }, [isCropModeActive]);

  useEffect(() => {
    if (isAskGeminiExpanded) {
      setTimeout(() => {
        inlineInputRef.current?.focus();
      }, 30);
    }
  }, [isAskGeminiExpanded]);

  // Submit Inline Tutor Question to Gemini API
  const handleAskInlineTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectionToolbar) return;
    const questionText = inlineQuestionInput.trim();
    if (!questionText) return;

    const targetText = selectionToolbar.text;
    const popX = selectionToolbar.x;
    const popY = selectionToolbar.bottomY;

    setSelectionToolbar(null);
    setIsAskGeminiExpanded(false);
    setInlineQuestionInput("");

    setInlineTutorPopover({
      selectedText: targetText,
      question: questionText,
      answer: null,
      isLoading: true,
      error: null,
      x: popX,
      y: popY,
      isSaved: false,
    });

    try {
      const answer = await fetchInlineTutor({
        unit: selectedUnit,
        chapter: selectedChapter,
        subtopic: selectedSubtopic,
        selectedText: targetText,
        question: questionText,
        apiKey: geminiApiKey,
      });

      setInlineTutorPopover((prev) =>
        prev
          ? {
              ...prev,
              answer,
              isLoading: false,
            }
          : null
      );
    } catch (err: any) {
      setInlineTutorPopover((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || "Could not reach Inline Tutor.",
              isLoading: false,
            }
          : null
      );
    }
  };

  // 📌 Save Inline Tutor Q&A to Notes Cache
  const handleSaveInlineTutorToNotes = () => {
    if (!inlineTutorPopover || !inlineTutorPopover.answer) return;

    const newItem: PinnedInlineTutorItem = {
      id: `inline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      subtopic: selectedSubtopic,
      selectedText: inlineTutorPopover.selectedText,
      question: inlineTutorPopover.question,
      answer: inlineTutorPopover.answer,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sourceType: "inline",
    };

    setPinnedInlineTutor((prev) => [newItem, ...prev]);
    setInlineTutorPopover((prev) => (prev ? { ...prev, isSaved: true } : null));
    showNotification("📌 Saved Q&A to permanently cached notes");
  };

  // Screen Cropper (html2canvas) Drag Handlers
  const handleStartCrop = (clientX: number, clientY: number) => {
    setIsDraggingCrop(true);
    setCropRect({
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    });
  };

  const handleMoveCrop = (clientX: number, clientY: number) => {
    if (!isDraggingCrop || !cropRect) return;
    setCropRect((prev) =>
      prev
        ? {
            ...prev,
            currentX: clientX,
            currentY: clientY,
          }
        : null
    );
  };

  const handleFinishCrop = async () => {
    if (!isDraggingCrop || !cropRect) return;
    setIsDraggingCrop(false);

    const left = Math.min(cropRect.startX, cropRect.currentX);
    const top = Math.min(cropRect.startY, cropRect.currentY);
    const width = Math.abs(cropRect.currentX - cropRect.startX);
    const height = Math.abs(cropRect.currentY - cropRect.startY);

    setCropRect(null);
    setIsCropModeActive(false);

    if (width < 24 || height < 24) {
      showNotification("Drag a larger selection box to crop");
      return;
    }

    setIsCapturingScreen(true);
    try {
      // Wait 1 animation frame so the dim crop overlay disappears before html2canvas captures
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      if (!window.html2canvas) {
        throw new Error("Screen capture library is still loading. Try again.");
      }

      const canvas = await window.html2canvas(document.body, {
        x: left + window.scrollX,
        y: top + window.scrollY,
        width,
        height,
        useCORS: true,
        allowTaint: true,
        backgroundColor: isLightMode ? "#ffffff" : "#050505",
        scale: Math.min(2, window.devicePixelRatio || 1),
        logging: false,
      });

      const base64Image = canvas.toDataURL("image/png");
      setVisionModal({
        croppedImageBase64: base64Image,
        question: "",
        answer: null,
        isLoading: false,
        error: null,
        isSaved: false,
      });
    } catch (err: any) {
      showNotification(err?.message || "Failed to capture screen region");
    } finally {
      setIsCapturingScreen(false);
    }
  };

  // Submit Vision Cropper Question to /api/vision-tutor
  const handleAskVisionTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visionModal || !visionModal.question.trim() || visionModal.isLoading) {
      return;
    }

    setVisionModal((prev) =>
      prev ? { ...prev, isLoading: true, error: null } : null
    );

    try {
      const answer = await fetchVisionTutor({
        unit: selectedUnit,
        chapter: selectedChapter,
        subtopic: selectedSubtopic,
        imageBase64: visionModal.croppedImageBase64,
        question: visionModal.question.trim(),
        apiKey: geminiApiKey,
      });

      setVisionModal((prev) =>
        prev
          ? {
              ...prev,
              answer,
              isLoading: false,
              isSaved: false,
            }
          : null
      );
    } catch (err: any) {
      setVisionModal((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || "Failed to analyze cropped image.",
              isLoading: false,
            }
          : null
      );
    }
  };

  // 📌 Save Vision Cropper Q&A to Notes Cache
  const handleSaveVisionTutorToNotes = () => {
    if (!visionModal || !visionModal.answer) return;

    const newItem: PinnedInlineTutorItem = {
      id: `vision_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      subtopic: selectedSubtopic,
      selectedText: "Cropped Visual Region (Graph / Formula)",
      question: visionModal.question,
      answer: visionModal.answer,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sourceType: "vision",
      croppedImageBase64: visionModal.croppedImageBase64,
    };

    setPinnedInlineTutor((prev) => [newItem, ...prev]);
    setVisionModal((prev) => (prev ? { ...prev, isSaved: true } : null));
    showNotification("📌 Saved Vision Q&A to permanently cached notes");
  };

  const handleRemovePinnedTutorItem = (id: string) => {
    setPinnedInlineTutor((prev) => prev.filter((item) => item.id !== id));
    showNotification("Removed saved Q&A from notes cache");
  };

  const handleCreateHighlight = (
    text: string,
    color: HighlightColor,
    sectionLabel = "Study Concept"
  ) => {
    const clean = text.trim();
    if (!clean) return;
    const newHighlight: HighlightItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      subtopic: selectedSubtopic,
      text: clean,
      color,
      sectionLabel,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setHighlights((prev) => [
      newHighlight,
      ...prev.filter(
        (h) =>
          !(
            h.subtopic === selectedSubtopic &&
            h.text.toLowerCase() === clean.toLowerCase()
          )
      ),
    ]);
    setSelectionToolbar(null);
    setIsAskGeminiExpanded(false);
    window.getSelection()?.removeAllRanges();
    showNotification(`Highlighted in ${HIGHLIGHT_COLOR_STYLES[color].label}`);
  };

  const handleRemoveHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleUpdateHighlightColor = (id: string, color: HighlightColor) => {
    setHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, color } : h))
    );
  };

  // 1. 2-Pass "Blueprint & Expand" Concurrent Generation Engine (Promise.allSettled)
  const generateNotesForSubtopic = useCallback(
    async (unit: string, chapter: string, subtopic: string) => {
      setGeneratingTopicId(subtopic);
      setGeneratingNotesByTopic((prev) => ({ ...prev, [subtopic]: true }));
      setNotesErrorByTopic((prev) => ({ ...prev, [subtopic]: null }));
      setLiveChecklistByTopic((prev) => ({
        ...prev,
        [subtopic]: {
          blueprintStatus: "running",
          items: [],
        },
      }));

      try {
        // PASS 1: Generate the ordered Micro-Concept Blueprint JSON
        const blueprintData = await fetchStudyBlueprint(
          unit,
          chapter,
          subtopic,
          geminiApiKey
        );

        const microConcepts: BlueprintMicroConcept[] = Array.isArray(
          blueprintData.microConcepts
        )
          ? blueprintData.microConcepts
          : [];

        // Initialize Pass-2 Live Checklist items in exact Blueprint order
        setLiveChecklistByTopic((prev) => ({
          ...prev,
          [subtopic]: {
            blueprintStatus: "completed",
            items: microConcepts.map((mc, index) => ({
              id: mc.id || `mc_${index}`,
              index,
              title: mc.title,
              status: "running",
            })),
          },
        }));

        // If Pass 1 determined no canonical economic graph exists for this sub-topic,
        // pre-populate the Strict Necessity Gateway response immediately
        if (blueprintData.isGraphCanonical === false) {
          setCachedModels((prev) => ({
            ...prev,
            [subtopic]: {
              isGraphCanonical: false,
              message: "No standard economic graph is required for this concept.",
            },
          }));
        } else if (
          Array.isArray(blueprintData.relatedGraphs) &&
          blueprintData.relatedGraphs.length > 0
        ) {
          setRelatedGraphsByTopic((prev) => ({
            ...prev,
            [subtopic]: blueprintData.relatedGraphs,
          }));
        }

        // PASS 2: Map the Blueprint micro-concepts to concurrent API promises and execute simultaneously via Promise.allSettled
        const expansionPromises = microConcepts.map((mc, index) =>
          fetchMicroConceptExpansion({
            unit,
            chapter,
            subtopic,
            index,
            id: mc.id || `mc_${index}`,
            title: mc.title,
            focusPrompt: mc.focusPrompt,
            apiKey: geminiApiKey,
          })
            .then((chunk) => {
              const resolvedTime = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              // Immediately check off the emerald green tick as this specific promise resolves
              setLiveChecklistByTopic((prev) => {
                const current = prev[subtopic];
                if (!current) return prev;
                return {
                  ...prev,
                  [subtopic]: {
                    ...current,
                    items: current.items.map((item) =>
                      item.index === index
                        ? {
                            ...item,
                            status: "completed",
                            resolvedAt: resolvedTime,
                          }
                        : item
                    ),
                  },
                };
              });

              return chunk;
            })
            .catch((err) => {
              setLiveChecklistByTopic((prev) => {
                const current = prev[subtopic];
                if (!current) return prev;
                return {
                  ...prev,
                  [subtopic]: {
                    ...current,
                    items: current.items.map((item) =>
                      item.index === index
                        ? { ...item, status: "failed" }
                        : item
                    ),
                  },
                };
              });
              throw err;
            })
        );

        const settledResults = await Promise.allSettled(expansionPromises);

        // Stitch resolved chunks strictly in the exact original order of the Pass 1 Blueprint array
        const orderedChunks: ExpandedMicroConceptChunk[] = [];
        settledResults.forEach((result, originalIndex) => {
          const blueprintItem = microConcepts[originalIndex];
          if (result.status === "fulfilled") {
            orderedChunks.push(result.value);
          } else if (blueprintItem) {
            orderedChunks.push({
              index: originalIndex,
              id: blueprintItem.id || `mc_${originalIndex}`,
              title: blueprintItem.title,
              deepExplanation: blueprintItem.focusPrompt || "",
              derivation: {
                title: blueprintItem.title,
                latex: "\\text{See derivation in overview}",
                explanation: blueprintItem.focusPrompt || "",
              },
              keyPoints: [blueprintItem.focusPrompt],
            });
          }
        });

        orderedChunks.sort((a, b) => a.index - b.index);

        const stitchedDerivations = orderedChunks
          .filter((c) => c.derivation && c.derivation.latex)
          .map((c) => c.derivation);
        const stitchedKeyPoints = orderedChunks.flatMap((c) => c.keyPoints);

        const noteWithTimestamp: StudyNoteData = {
          overview: blueprintData.overview || "",
          derivations: stitchedDerivations,
          keyPoints: stitchedKeyPoints,
          examTraps: Array.isArray(blueprintData.examTraps)
            ? blueprintData.examTraps
            : [],
          practiceQuestions: Array.isArray(blueprintData.practiceQuestions)
            ? blueprintData.practiceQuestions
            : [],
          expandedChunks: orderedChunks,
          isGraphCanonical: blueprintData.isGraphCanonical,
          relatedGraphs: Array.isArray(blueprintData.relatedGraphs)
            ? blueprintData.relatedGraphs
            : [],
          youtubeQueries: cachedYoutube[subtopic] || [],
          generatedAt: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setCachedNotes((prev) => ({
          ...prev,
          [subtopic]: noteWithTimestamp,
        }));

        showNotification(
          `Parallel expansion complete (${orderedChunks.length} micro-concepts stitched in Blueprint order)`
        );
      } catch (err: any) {
        setNotesErrorByTopic((prev) => ({
          ...prev,
          [subtopic]: err?.message || "Error generating study notes.",
        }));
      } finally {
        setGeneratingNotesByTopic((prev) => {
          const next = { ...prev };
          delete next[subtopic];
          return next;
        });
        setGeneratingTopicId((prev) => (prev === subtopic ? null : prev));
      }
    },
    [geminiApiKey, cachedYoutube, showNotification]
  );

  // 2A. Contextual Graph Menu Discovery Handler (Scoped by subtopicId)
  const handleDiscoverRelatedGraphs = useCallback(async () => {
    const targetUnit = selectedUnit;
    const targetChapter = selectedChapter;
    const targetSubtopic = selectedSubtopic;

    setDiscoveringMenuByTopic((prev) => ({ ...prev, [targetSubtopic]: true }));
    setModelErrorByTopic((prev) => ({ ...prev, [targetSubtopic]: null }));

    try {
      const result = await fetchRelatedGraphs(
        targetUnit,
        targetChapter,
        targetSubtopic,
        geminiApiKey
      );

      if (result.isGraphCanonical === false || !Array.isArray(result.relatedGraphs) || result.relatedGraphs.length === 0) {
        setCachedModels((prev) => ({
          ...prev,
          [targetSubtopic]: {
            isGraphCanonical: false,
            message:
              result.message ||
              "No standard economic graph is required for this concept.",
          },
        }));
        setRelatedGraphsByTopic((prev) => ({ ...prev, [targetSubtopic]: [] }));
        showNotification("No canonical textbook graph required for this concept");
        return;
      }

      setRelatedGraphsByTopic((prev) => ({
        ...prev,
        [targetSubtopic]: result.relatedGraphs,
      }));
      setCachedNotes((prev) => {
        const existing = prev[targetSubtopic];
        if (!existing) return prev;
        return {
          ...prev,
          [targetSubtopic]: {
            ...existing,
            isGraphCanonical: true,
            relatedGraphs: result.relatedGraphs,
          },
        };
      });
      showNotification(
        `Identified ${result.relatedGraphs.length} CUET PG textbook models in Related Graphs menu`
      );
    } catch (err: any) {
      setModelErrorByTopic((prev) => ({
        ...prev,
        [targetSubtopic]:
          err?.message || "Failed to discover related graphs for this lesson.",
      }));
    } finally {
      setDiscoveringMenuByTopic((prev) => {
        const next = { ...prev };
        delete next[targetSubtopic];
        return next;
      });
    }
  }, [geminiApiKey, selectedUnit, selectedChapter, selectedSubtopic, showNotification]);

  // 2B. On-Demand Selected Graph Option Renderer (Persistent Options + Instant Switch if Cached)
  const handleSelectGraphOption = useCallback(
    async (option: RelatedGraphOption, forceRegenerate = false) => {
      const targetUnit = selectedUnit;
      const targetChapter = selectedChapter;
      const targetSubtopic = selectedSubtopic;

      setSelectedGraphIdByTopic((prev) => ({
        ...prev,
        [targetSubtopic]: option.id,
      }));
      setModelErrorByTopic((prev) => ({ ...prev, [targetSubtopic]: null }));
      setLastShiftNote(undefined);

      const existingCached = cachedModelsByGraphId[targetSubtopic]?.[option.id];
      if (existingCached && existingCached.isGraphCanonical && !forceRegenerate) {
        const defaults: SliderValuesMap = {};
        if (Array.isArray(existingCached.parameterSliders)) {
          for (const s of existingCached.parameterSliders) {
            defaults[s.id] = s.defaultValue;
          }
        }
        setCachedModels((prev) => ({
          ...prev,
          [targetSubtopic]: existingCached,
        }));
        setSliderValuesByTopic((prev) => ({
          ...prev,
          [targetSubtopic]: defaults,
        }));
        showNotification(`Switched to plotted graph: ${option.title}`);
        return;
      }

      setGeneratingModelByTopic((prev) => ({ ...prev, [targetSubtopic]: true }));
      setGeneratingGraphIdByTopic((prev) => ({
        ...prev,
        [targetSubtopic]: option.id,
      }));

      try {
        const data: PlotlyEconomicModel = await fetchPlotlyModel(
          targetUnit,
          targetChapter,
          targetSubtopic,
          geminiApiKey,
          option
        );

        if (data.isGraphCanonical === false) {
          const nonCanonicalPayload: PlotlyEconomicModel = {
            isGraphCanonical: false,
            message:
              data.message ||
              "No standard economic graph is required for this concept.",
          };
          setCachedModels((prev) => ({
            ...prev,
            [targetSubtopic]: nonCanonicalPayload,
          }));
          showNotification("No canonical graph required for this concept");
          return;
        }

        const modelWithTime: PlotlyEconomicModel = {
          ...data,
          graphId: option.id,
          isGraphCanonical: true,
          generatedAt: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        const defaults: SliderValuesMap = {};
        if (Array.isArray(modelWithTime.parameterSliders)) {
          for (const s of modelWithTime.parameterSliders) {
            defaults[s.id] = s.defaultValue;
          }
        }

        setCachedModels((prev) => ({
          ...prev,
          [targetSubtopic]: modelWithTime,
        }));
        setCachedModelsByGraphId((prev) => ({
          ...prev,
          [targetSubtopic]: {
            ...(prev[targetSubtopic] || {}),
            [option.id]: modelWithTime,
          },
        }));
        setSliderValuesByTopic((prev) => ({
          ...prev,
          [targetSubtopic]: defaults,
        }));
        showNotification(`Plotted: ${option.title}`);
      } catch (err: any) {
        setModelErrorByTopic((prev) => ({
          ...prev,
          [targetSubtopic]:
            err?.message || "Failed to generate selected graph model.",
        }));
      } finally {
        setGeneratingModelByTopic((prev) => {
          const next = { ...prev };
          delete next[targetSubtopic];
          return next;
        });
        setGeneratingGraphIdByTopic((prev) => ({
          ...prev,
          [targetSubtopic]: null,
        }));
      }
    },
    [
      geminiApiKey,
      selectedUnit,
      selectedChapter,
      selectedSubtopic,
      cachedModelsByGraphId,
      showNotification,
    ]
  );

  // 2C. Quick-Plot Fallback Generator (Scoped by subtopicId)
  const handleGeneratePlotlyModel = useCallback(async () => {
    const targetUnit = selectedUnit;
    const targetChapter = selectedChapter;
    const targetSubtopic = selectedSubtopic;

    const existingMenu =
      relatedGraphsByTopic[targetSubtopic] ||
      cachedNotes[targetSubtopic]?.relatedGraphs ||
      [];
    if (existingMenu.length > 0) {
      const targetOption =
        existingMenu.find((g) => g.id === selectedGraphIdByTopic[targetSubtopic]) ||
        existingMenu[0];
      await handleSelectGraphOption(targetOption, true);
      return;
    }

    setGeneratingModelByTopic((prev) => ({ ...prev, [targetSubtopic]: true }));
    setModelErrorByTopic((prev) => ({ ...prev, [targetSubtopic]: null }));
    setLastShiftNote(undefined);

    try {
      const data: PlotlyEconomicModel = await fetchPlotlyModel(
        targetUnit,
        targetChapter,
        targetSubtopic,
        geminiApiKey
      );

      if (data.isGraphCanonical === false) {
        const nonCanonicalPayload: PlotlyEconomicModel = {
          isGraphCanonical: false,
          message:
            data.message ||
            "No standard economic graph is required for this concept.",
        };
        setCachedModels((prev) => ({
          ...prev,
          [targetSubtopic]: nonCanonicalPayload,
        }));
        showNotification("No canonical graph required for this concept");
        return;
      }

      const modelWithTime: PlotlyEconomicModel = {
        ...data,
        isGraphCanonical: true,
        generatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const defaults: SliderValuesMap = {};
      if (Array.isArray(modelWithTime.parameterSliders)) {
        for (const s of modelWithTime.parameterSliders) {
          defaults[s.id] = s.defaultValue;
        }
      }

      setCachedModels((prev) => ({
        ...prev,
        [targetSubtopic]: modelWithTime,
      }));
      setSliderValuesByTopic((prev) => ({
        ...prev,
        [targetSubtopic]: defaults,
      }));
      showNotification(
        modelWithTime.modelReference
          ? `Rendered: ${modelWithTime.modelReference}`
          : "Canonical economic graph generated & cached"
      );
    } catch (err: any) {
      setModelErrorByTopic((prev) => ({
        ...prev,
        [targetSubtopic]: err?.message || "Failed to generate interactive model.",
      }));
    } finally {
      setGeneratingModelByTopic((prev) => {
        const next = { ...prev };
        delete next[targetSubtopic];
        return next;
      });
    }
  }, [
    geminiApiKey,
    selectedUnit,
    selectedChapter,
    selectedSubtopic,
    relatedGraphsByTopic,
    cachedNotes,
    selectedGraphIdByTopic,
    handleSelectGraphOption,
    showNotification,
  ]);

  const handleDeleteModelCache = useCallback(() => {
    setCachedModels((prev) => {
      const next = { ...prev };
      delete next[selectedSubtopic];
      return next;
    });
    setCachedModelsByGraphId((prev) => {
      const next = { ...prev };
      delete next[selectedSubtopic];
      return next;
    });
    setSelectedGraphIdByTopic((prev) => {
      const next = { ...prev };
      delete next[selectedSubtopic];
      return next;
    });
    setLastShiftNote(undefined);
    showNotification("Cleared cached graphs for this topic");
  }, [selectedSubtopic, showNotification]);

  // 3. Smart YouTube Concept Videos Toggle & On-Demand Caching (Scoped by subtopicId)
  const handleToggleConceptVideos = useCallback(async () => {
    const nextOpen = !showConceptVideos;
    setShowConceptVideos(nextOpen);

    const targetUnit = selectedUnit;
    const targetChapter = selectedChapter;
    const targetSubtopic = selectedSubtopic;

    if (
      nextOpen &&
      (!cachedYoutube[targetSubtopic] ||
        cachedYoutube[targetSubtopic].length === 0)
    ) {
      setGeneratingVideosByTopic((prev) => ({ ...prev, [targetSubtopic]: true }));
      setVideosErrorByTopic((prev) => ({ ...prev, [targetSubtopic]: null }));
      try {
        const queries = await fetchConceptVideos(
          targetUnit,
          targetChapter,
          targetSubtopic,
          geminiApiKey
        );
        if (Array.isArray(queries) && queries.length > 0) {
          setCachedYoutube((prev) => ({
            ...prev,
            [targetSubtopic]: queries,
          }));
          showNotification("Concept video links generated & cached");
        }
      } catch (err: any) {
        setVideosErrorByTopic((prev) => ({
          ...prev,
          [targetSubtopic]: err?.message || "Could not load concept videos.",
        }));
      } finally {
        setGeneratingVideosByTopic((prev) => {
          const next = { ...prev };
          delete next[targetSubtopic];
          return next;
        });
      }
    }
  }, [
    geminiApiKey,
    showConceptVideos,
    cachedYoutube,
    selectedUnit,
    selectedChapter,
    selectedSubtopic,
    showNotification,
  ]);

  const handleDeleteCachedNotes = useCallback(
    (subtopic: string) => {
      setCachedNotes((prev) => {
        const next = { ...prev };
        delete next[subtopic];
        return next;
      });
      setNotesErrorByTopic((prev) => ({ ...prev, [subtopic]: null }));
      showNotification("Deleted cached notes for this topic");
    },
    [showNotification]
  );

  // Search & Load Additional Sub-Topic PYQs + Concept Mastery Verification Questions
  const handleSearchAndLoadSubtopicPyqs = useCallback(
    async (customSearch?: string) => {
      const targetUnit = selectedUnit;
      const targetChapter = selectedChapter;
      const targetSubtopic = selectedSubtopic;
      const queryToUse =
        typeof customSearch === "string"
          ? customSearch.trim()
          : pyqSearchQuery.trim();

      setGeneratingPyqsByTopic((prev) => ({ ...prev, [targetSubtopic]: true }));
      try {
        const incomingQuestions = await fetchSubtopicPyqs(
          targetUnit,
          targetChapter,
          targetSubtopic,
          queryToUse,
          geminiApiKey
        );

        if (Array.isArray(incomingQuestions) && incomingQuestions.length > 0) {
          setCachedNotes((prev) => {
            const currentNote = prev[targetSubtopic];
            if (!currentNote) return prev;
            const existingQuestions = currentNote.practiceQuestions || [];
            // Deduplicate by question text and append new ones
            const existingSet = new Set(
              existingQuestions.map((q) => q.question.trim().toLowerCase())
            );
            const uniqueIncoming = incomingQuestions.filter(
              (q: any) =>
                q?.question &&
                !existingSet.has(String(q.question).trim().toLowerCase())
            );
            return {
              ...prev,
              [targetSubtopic]: {
                ...currentNote,
                practiceQuestions: [...existingQuestions, ...uniqueIncoming],
              },
            };
          });
          showNotification(
            queryToUse
              ? `Added sub-topic PYQs & verification checks matching "${queryToUse}"`
              : `Loaded ${incomingQuestions.length} fresh PYQs & Concept Verification checks`
          );
        }
      } catch (err: any) {
        showNotification(
          err?.message || "Could not load additional sub-topic PYQs"
        );
      } finally {
        setGeneratingPyqsByTopic((prev) => {
          const next = { ...prev };
          delete next[targetSubtopic];
          return next;
        });
      }
    },
    [geminiApiKey, selectedUnit, selectedChapter, selectedSubtopic, pyqSearchQuery, showNotification]
  );

  const toggleSubtopicCompletion = (subtopic: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedSubtopics((prev) => ({
      ...prev,
      [subtopic]: !prev[subtopic],
    }));
  };

  const toggleChapterBookmark = (chapterTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedChapters((prev) => {
      const next = !prev[chapterTitle];
      showNotification(
        next ? `Bookmarked chapter: ${chapterTitle}` : "Removed chapter bookmark"
      );
      return { ...prev, [chapterTitle]: next };
    });
  };

  const toggleSubtopicBookmark = (subtopic: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedSubtopics((prev) => {
      const next = !prev[subtopic];
      showNotification(
        next
          ? "Added sub-topic to Bookmarked Topics"
          : "Removed sub-topic bookmark"
      );
      return { ...prev, [subtopic]: next };
    });
  };

  const handleSelectSubtopic = (
    unit: string,
    chapter: string,
    subtopic: string
  ) => {
    setSelectedUnit(unit);
    setSelectedChapter(chapter);
    setSelectedSubtopic(subtopic);
    setSelectionToolbar(null);
    setIsAskGeminiExpanded(false);
    setInlineTutorPopover(null);
    setLastShiftNote(undefined);
  };

  const handleSwitchProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim() || DEFAULT_SEED_TOKEN;
    localStorage.setItem(ACTIVE_PROFILE_SEED_KEY, cleanToken);
    const newHashId = await computeSha256ProfileId(cleanToken);
    setProfileId(newHashId);

    const storageKey = `cuet_coqp10_${newHashId}`;
    const existingRaw = localStorage.getItem(storageKey);
    if (existingRaw) {
      try {
        const parsed: StoredProfileData = JSON.parse(existingRaw);
        setCompletedSubtopics(parsed.completedSubtopics || {});
        setBookmarkedChapters(parsed.bookmarkedChapters || {});
        setBookmarkedSubtopics(parsed.bookmarkedSubtopics || {});
        setHighlights(parsed.highlights || []);
        setPinnedInlineTutor(parsed.pinnedInlineTutor || []);
        setCachedNotes(parsed.cachedNotes || {});
        setCachedModels(parsed.cachedModels || {});
        setCachedYoutube(parsed.cachedYoutube || {});
        setChatHistory(parsed.chatHistory || {});
        showNotification(`Loaded profile #${newHashId}`);
      } catch {
        setCompletedSubtopics({});
      }
    } else {
      setCompletedSubtopics({});
      setBookmarkedChapters({});
      setBookmarkedSubtopics({});
      setHighlights([]);
      setPinnedInlineTutor([]);
      setCachedNotes(DEFAULT_SEED_NOTES);
      setCachedModels({});
      setCachedYoutube({
        [SYLLABUS_TREE[0].chapters[0].subtopics[0]]:
          DEFAULT_SEED_NOTES[SYLLABUS_TREE[0].chapters[0].subtopics[0]]
            .youtubeQueries,
      });
      setChatHistory({});
      showNotification(`Created new profile #${newHashId}`);
    }

    setTokenInput("");
    setIsProfileModalOpen(false);
  };

  const handleExportProgress = () => {
    const payload: StoredProfileData = {
      profileId,
      completedSubtopics,
      bookmarkedChapters,
      bookmarkedSubtopics,
      highlights,
      pinnedInlineTutor,
      cachedNotes,
      cachedModels,
      cachedYoutube,
      chatHistory,
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuet_coqp10_${profileId || "progress"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Exported cuet_coqp10_${profileId}.json`);
  };

  const handleImportProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || "{}"));
        if (parsed.completedSubtopics) {
          setCompletedSubtopics(parsed.completedSubtopics);
        }
        if (parsed.bookmarkedChapters) {
          setBookmarkedChapters(parsed.bookmarkedChapters);
        }
        if (parsed.bookmarkedSubtopics) {
          setBookmarkedSubtopics(parsed.bookmarkedSubtopics);
        }
        if (Array.isArray(parsed.highlights)) {
          setHighlights(parsed.highlights);
        }
        if (Array.isArray(parsed.pinnedInlineTutor)) {
          setPinnedInlineTutor(parsed.pinnedInlineTutor);
        }
        if (parsed.cachedNotes) {
          setCachedNotes((prev) => ({ ...prev, ...parsed.cachedNotes }));
        }
        if (parsed.cachedModels) {
          setCachedModels((prev) => ({ ...prev, ...parsed.cachedModels }));
        }
        if (parsed.cachedYoutube) {
          setCachedYoutube((prev) => ({ ...prev, ...parsed.cachedYoutube }));
        }
        if (parsed.chatHistory) {
          setChatHistory((prev) => ({ ...prev, ...parsed.chatHistory }));
        }
        showNotification("Progress, models, videos & saved Q&As imported");
      } catch {
        showNotification("Invalid JSON backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const activeNote: StudyNoteData | undefined = cachedNotes[selectedSubtopic];
  const activeRelatedGraphs: RelatedGraphOption[] = useMemo(
    () =>
      relatedGraphsByTopic[selectedSubtopic] ||
      activeNote?.relatedGraphs ||
      [],
    [relatedGraphsByTopic, selectedSubtopic, activeNote]
  );
  const activeSelectedGraphId: string | null =
    selectedGraphIdByTopic[selectedSubtopic] || null;
  const activeGeneratingGraphId: string | null =
    generatingGraphIdByTopic[selectedSubtopic] || null;
  const isDiscoveringMenu: boolean =
    Boolean(discoveringMenuByTopic[selectedSubtopic]);
  const activeCachedTopicModels: Record<string, PlotlyEconomicModel> =
    cachedModelsByGraphId[selectedSubtopic] || {};
  const activeModel: PlotlyEconomicModel | undefined =
    cachedModels[selectedSubtopic];
  const activeSliderValues: SliderValuesMap = useMemo(() => {
    if (sliderValuesByTopic[selectedSubtopic]) {
      return sliderValuesByTopic[selectedSubtopic];
    }
    const defaults: SliderValuesMap = {};
    if (activeModel && Array.isArray(activeModel.parameterSliders)) {
      for (const s of activeModel.parameterSliders) {
        defaults[s.id] = s.defaultValue;
      }
    }
    return defaults;
  }, [sliderValuesByTopic, selectedSubtopic, activeModel]);

  const activeYoutubeLinks: YoutubeQueryItem[] =
    cachedYoutube[selectedSubtopic] || [];
  const activeChatThread: ChatMessage[] = chatHistory[selectedSubtopic] || [];
  const activeTopicHighlights = useMemo(
    () => highlights.filter((h) => h.subtopic === selectedSubtopic),
    [highlights, selectedSubtopic]
  );
  const activePinnedTutorItems = useMemo(
    () => pinnedInlineTutor.filter((item) => item.subtopic === selectedSubtopic),
    [pinnedInlineTutor, selectedSubtopic]
  );
  const isCurrentCompleted = !!completedSubtopics[selectedSubtopic];
  const isCurrentSubtopicBookmarked = !!bookmarkedSubtopics[selectedSubtopic];
  const isCurrentChapterBookmarked = !!bookmarkedChapters[selectedChapter];

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    const targetUnit = selectedUnit;
    const targetChapter = selectedChapter;
    const targetSubtopic = selectedSubtopic;
    if (!trimmed || chatLoadingByTopic[targetSubtopic]) return;

    const currentThread = chatHistory[targetSubtopic] || [];
    const userMessage: ChatMessage = {
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedThread = [...currentThread, userMessage];
    setChatHistory((prev) => ({
      ...prev,
      [targetSubtopic]: updatedThread,
    }));
    setChatInput("");
    setChatLoadingByTopic((prev) => ({ ...prev, [targetSubtopic]: true }));

    try {
      const data = await fetchChat({
        unit: targetUnit,
        chapter: targetChapter,
        subtopic: targetSubtopic,
        question: trimmed,
        history: currentThread,
        currentGraphState: activeModel
          ? {
              modelTitle: activeModel.title,
              sliders: activeModel.parameterSliders,
              currentSliderValues: activeSliderValues,
            }
          : null,
        apiKey: geminiApiKey,
      });

      let shiftSummary: string | undefined;
      if (data.sliderAdjustments && data.sliderAdjustments.applied) {
        const adj = data.sliderAdjustments;
        shiftSummary =
          adj.summaryLabel || "Updated interactive Plotly model parameters";
        setSliderValuesByTopic((prev) => {
          const current = prev[targetSubtopic] || { ...activeSliderValues };
          return {
            ...prev,
            [targetSubtopic]: {
              ...current,
              ...(typeof adj.p1 === "number" ? { p1: adj.p1 } : {}),
              ...(typeof adj.p2 === "number" ? { p2: adj.p2 } : {}),
              ...(typeof adj.p3 === "number" ? { p3: adj.p3 } : {}),
            },
          };
        });
        setLastShiftNote(shiftSummary);
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isRedirectedOutOfScope: !!data.isRedirectedOutOfScope,
        graphShiftSummary: shiftSummary,
      };

      setChatHistory((prev) => ({
        ...prev,
        [targetSubtopic]: [...updatedThread, assistantMessage],
      }));
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        text: `Error: ${err?.message || "Unable to reach AI mentor."}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatHistory((prev) => ({
        ...prev,
        [targetSubtopic]: [...updatedThread, errorMsg],
      }));
    } finally {
      setChatLoadingByTopic((prev) => {
        const next = { ...prev };
        delete next[targetSubtopic];
        return next;
      });
    }
  };

  const currentIndex = useMemo(
    () =>
      allSubtopicsList.findIndex((item) => item.subtopic === selectedSubtopic),
    [allSubtopicsList, selectedSubtopic]
  );

  // Adaptive Theme Palette Classes
  const bgCanvas = isLightMode
    ? "bg-[#ffffff] text-[#111827]"
    : "bg-[#050505] text-[#f5f5f5]";
  const bgSurface = isLightMode
    ? "bg-[#f3f4f6] border-[#e5e7eb] text-[#111827]"
    : "bg-[#0f0f0f] border-[#222222] text-[#f5f5f5]";
  const bgNested = isLightMode
    ? "bg-[#ffffff] border-[#e5e7eb] text-[#111827]"
    : "bg-[#050505] border-[#222222] text-[#f5f5f5]";
  const borderCol = isLightMode ? "border-[#e5e7eb]" : "border-[#222222]";
  const mutedText = isLightMode ? "text-gray-600" : "text-neutral-400";
  const bodyProseText = isLightMode ? "text-gray-800" : "text-neutral-200";

  // Gatekeeper Screen: If no valid key is found in localStorage, block access to the main app
  if (!geminiApiKey) {
    return <GatekeeperScreen onSaveKey={handleSaveApiKey} />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-150 ${bgCanvas}`}
    >
      {/* Persistent Floating Action Button: ✂️ Crop & Ask (Pinned to Middle-Left Edge) */}
      {!isCropModeActive && (
        <button
          type="button"
          onClick={() => {
            setSelectionToolbar(null);
            setInlineTutorPopover(null);
            setIsCropModeActive(true);
          }}
          disabled={isCapturingScreen}
          className={`fixed left-3 top-1/2 -translate-y-1/2 z-40 px-3.5 py-2.5 rounded-lg shadow-xl border font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer min-h-11 ${
            isLightMode
              ? "bg-white border-gray-300 text-gray-900 hover:border-[#10b981]"
              : "bg-[#0f0f0f] border-[#222222] text-[#f5f5f5] hover:border-[#10b981]"
          }`}
          title="Drag a box over any graph intersection, formula, or paragraph to ask Gemini Vision"
        >
          <Scissors className="w-4 h-4 text-[#10b981] shrink-0" />
          <span>{isCapturingScreen ? "Cropping..." : "✂️ Crop & Ask"}</span>
        </button>
      )}

      {/* Full-Screen Dimmed Interactive Drag-Cropper Overlay */}
      {isCropModeActive && (
        <div
          onMouseDown={(e) => handleStartCrop(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMoveCrop(e.clientX, e.clientY)}
          onMouseUp={handleFinishCrop}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) handleStartCrop(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) handleMoveCrop(t.clientX, t.clientY);
          }}
          onTouchEnd={handleFinishCrop}
          className="fixed inset-0 z-50 bg-black/55 cursor-crosshair select-none touch-none"
        >
          {/* Top Instruction Banner */}
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#10b981] text-[#f5f5f5] shadow-2xl flex items-center gap-4 text-xs">
            <span className="font-medium">
              Drag a selection box over any graph curve, intersection, or formula to ask Vision Tutor
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setIsCropModeActive(false);
                setIsDraggingCrop(false);
                setCropRect(null);
              }}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold cursor-pointer"
            >
              Cancel (Esc)
            </button>
          </div>

          {/* Active Drag Selection Box */}
          {cropRect && (
            <div
              style={{
                left: `${Math.min(cropRect.startX, cropRect.currentX)}px`,
                top: `${Math.min(cropRect.startY, cropRect.currentY)}px`,
                width: `${Math.abs(cropRect.currentX - cropRect.startX)}px`,
                height: `${Math.abs(cropRect.currentY - cropRect.startY)}px`,
              }}
              className="fixed border-2 border-[#10b981] bg-[#10b981]/15 pointer-events-none rounded-xs shadow-lg"
            />
          )}
        </div>
      )}

      {/* Vision Cropper Modal (Base64 Cropped Image + Chat Input + KaTeX Response + 📌 Save Q&A to Notes) */}
      {visionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className={`border rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${bgSurface}`}
          >
            <div
              className={`px-5 py-3.5 border-b ${borderCol} flex items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm sm:text-base font-semibold">
                  Vision Doubt Solver — {selectedSubtopic}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {visionModal.answer && (
                  <button
                    type="button"
                    disabled={visionModal.isSaved}
                    onClick={handleSaveVisionTutorToNotes}
                    className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      visionModal.isSaved
                        ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981]"
                        : `${bgNested} hover:border-[#10b981]`
                    }`}
                  >
                    <span>
                      {visionModal.isSaved
                        ? "📌 Saved to Notes"
                        : "📌 Save Q&A to Notes"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setVisionModal(null)}
                  className={`p-1.5 rounded ${mutedText} hover:opacity-80 cursor-pointer`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Base64 Cropped Screenshot Preview */}
              <div
                className={`border rounded p-3 flex flex-col items-center justify-center ${bgNested}`}
              >
                <span className={`text-[11px] ${mutedText} mb-2 self-start font-mono`}>
                  Cropped Visual Selection:
                </span>
                <img
                  src={visionModal.croppedImageBase64}
                  alt="Cropped study region"
                  referrerPolicy="no-referrer"
                  className="max-h-56 object-contain rounded border border-[#222222]"
                />
              </div>

              {/* Prompt Input Form */}
              <form onSubmit={handleAskVisionTutor} className="flex gap-2">
                <input
                  type="text"
                  value={visionModal.question}
                  onChange={(e) =>
                    setVisionModal((prev) =>
                      prev ? { ...prev, question: e.target.value } : null
                    )
                  }
                  placeholder={`Ask about this cropped graph or formula in ${selectedSubtopic}...`}
                  autoFocus
                  className={`flex-1 border focus:border-[#10b981] rounded px-3.5 py-2.5 text-xs sm:text-sm outline-none ${bgNested}`}
                />
                <button
                  type="submit"
                  disabled={
                    visionModal.isLoading || !visionModal.question.trim()
                  }
                  className="px-4 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[#050505] font-semibold text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {visionModal.isLoading ? "Analyzing..." : "Ask Vision"}
                  </span>
                </button>
              </form>

              {visionModal.isLoading && (
                <div
                  className={`border rounded p-6 text-center space-y-2 ${bgNested}`}
                >
                  <RefreshCw className="w-5 h-5 text-[#10b981] animate-spin mx-auto" />
                  <p className={`text-xs ${mutedText}`}>
                    Inspecting cropped region within the context of{" "}
                    {selectedSubtopic}...
                  </p>
                </div>
              )}

              {visionModal.error && (
                <p className="text-xs text-red-400">{visionModal.error}</p>
              )}

              {visionModal.answer && (
                <div
                  className={`border rounded p-4 space-y-2.5 text-xs sm:text-sm leading-relaxed ${bgNested}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#10b981]">
                      Vision Tutor Analysis
                    </span>
                    <button
                      type="button"
                      disabled={visionModal.isSaved}
                      onClick={handleSaveVisionTutorToNotes}
                      className="text-xs font-medium text-[#10b981] hover:underline cursor-pointer disabled:opacity-60"
                    >
                      {visionModal.isSaved
                        ? "📌 Saved to Notes"
                        : "📌 Save Q&A to Notes"}
                    </button>
                  </div>
                  {visionModal.answer.split("\n\n").map((para, idx) => (
                    <p key={idx} className={bodyProseText}>
                      <RichMathText text={para} />
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. Contextual Floating Toolbar on Text / Formula Selection (Touch-Friendly Hit Targets) */}
      {selectionToolbar && (
        <div
          ref={floatingToolbarRef}
          style={{
            left: `${selectionToolbar.x}px`,
            top: `${selectionToolbar.topY}px`,
            transform: "translate(-50%, -100%)",
          }}
          className={`fixed z-50 rounded-lg shadow-2xl border transition-all ${
            isLightMode
              ? "bg-white border-gray-300 text-gray-900"
              : "bg-[#121212] border-[#333333] text-[#f5f5f5]"
          } ${isAskGeminiExpanded ? "p-3.5 w-80 sm:w-96" : "px-3 py-2"}`}
        >
          {!isAskGeminiExpanded ? (
            <div className="flex items-center gap-2">
              <Highlighter className="w-4 h-4 text-[#10b981] shrink-0" />
              {/* Large Touch-Friendly Highlight Swatch Buttons */}
              <div className="flex items-center gap-1 pr-2 border-r border-neutral-700/50">
                {(
                  ["yellow", "emerald", "blue", "rose"] as HighlightColor[]
                ).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      handleCreateHighlight(
                        selectionToolbar.text,
                        color,
                        selectionToolbar.sectionLabel
                      )
                    }
                    title={`Highlight in ${HIGHLIGHT_COLOR_STYLES[color].label}`}
                    className="w-9 h-9 flex items-center justify-center rounded hover:bg-neutral-500/10 cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 rounded-full ${HIGHLIGHT_COLOR_STYLES[color].swatchClass} border border-black/20`}
                    />
                  </button>
                ))}
              </div>

              {/* Prominent Touch-Ready "✨ Ask Gemini" Button */}
              <button
                type="button"
                onClick={() => setIsAskGeminiExpanded(true)}
                className="min-h-9 px-3 py-1.5 text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-[#050505] rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ Ask Gemini</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectionToolbar(null);
                  setIsAskGeminiExpanded(false);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded ${mutedText} hover:opacity-80 cursor-pointer`}
                title="Dismiss toolbar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleAskInlineTutor} className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#10b981] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inline Tutor — Selected Excerpt</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectionToolbar(null);
                    setIsAskGeminiExpanded(false);
                  }}
                  className={`p-1 ${mutedText} hover:opacity-80 cursor-pointer`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className={`px-2.5 py-1.5 rounded border text-[11px] max-h-14 overflow-y-auto ${bgNested}`}
              >
                <RichMathText text={selectionToolbar.text} />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  ref={inlineInputRef}
                  type="text"
                  value={inlineQuestionInput}
                  onChange={(e) => setInlineQuestionInput(e.target.value)}
                  placeholder="What do you want to ask about this?"
                  className={`flex-1 border focus:border-[#10b981] rounded px-3 py-2 text-xs outline-none ${bgNested}`}
                />
                <button
                  type="submit"
                  disabled={!inlineQuestionInput.trim()}
                  className="min-h-9 px-3.5 py-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[#050505] font-semibold text-xs rounded transition-colors cursor-pointer shrink-0"
                >
                  Ask
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. Dismissible Inline Answer Popover Card with "📌 Save Q&A to Notes" */}
      {inlineTutorPopover && (
        <div
          ref={inlinePopoverRef}
          style={{
            left: `${Math.max(
              220,
              Math.min(window.innerWidth - 220, inlineTutorPopover.x)
            )}px`,
            top: `${Math.max(
              80,
              Math.min(window.innerHeight - 280, inlineTutorPopover.y)
            )}px`,
            transform: "translateX(-50%)",
          }}
          className={`fixed z-50 w-[92vw] max-w-md rounded-lg shadow-2xl border p-4 space-y-3 ${
            isLightMode
              ? "bg-white border-gray-300 text-gray-900"
              : "bg-[#111111] border-[#10b981]/50 text-[#f5f5f5]"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 pb-2 border-b ${borderCol}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inline Tutor Explanation</span>
            </div>

            <div className="flex items-center gap-2">
              {inlineTutorPopover.answer && (
                <button
                  type="button"
                  disabled={inlineTutorPopover.isSaved}
                  onClick={handleSaveInlineTutorToNotes}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                    inlineTutorPopover.isSaved
                      ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981]"
                      : `${bgNested} hover:border-[#10b981]`
                  }`}
                  title="Append this Q&A to your permanently cached localStorage notes"
                >
                  <span>
                    {inlineTutorPopover.isSaved
                      ? "📌 Saved to Notes"
                      : "📌 Save Q&A to Notes"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setInlineTutorPopover(null)}
                className={`p-1 rounded ${mutedText} hover:opacity-80 cursor-pointer`}
                title="Dismiss inline popover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`px-3 py-2 rounded border text-xs space-y-1 ${bgNested}`}>
            <div className={`text-[11px] ${mutedText} line-clamp-2`}>
              <span className="font-semibold mr-1">Selected:</span>
              <RichMathText text={inlineTutorPopover.selectedText} />
            </div>
            <div className="text-xs font-medium text-[#10b981]">
              Q: <RichMathText text={inlineTutorPopover.question} />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto pr-1 text-xs sm:text-sm leading-relaxed space-y-2">
            {inlineTutorPopover.isLoading && (
              <div className="py-6 text-center space-y-2">
                <RefreshCw className="w-4 h-4 text-[#10b981] animate-spin mx-auto" />
                <p className={`text-xs ${mutedText}`}>
                  Analyzing selection in the context of {selectedSubtopic}...
                </p>
              </div>
            )}

            {inlineTutorPopover.error && (
              <p className="text-xs text-red-400">{inlineTutorPopover.error}</p>
            )}

            {inlineTutorPopover.answer &&
              inlineTutorPopover.answer.split("\n\n").map((para, i) => (
                <p key={i} className={bodyProseText}>
                  <RichMathText text={para} />
                </p>
              ))}
          </div>
        </div>
      )}

      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header
        className={`h-14 border-b px-5 flex items-center justify-between gap-8 sticky top-0 z-30 transition-colors ${bgSurface}`}
      >
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`p-1.5 rounded transition-colors ${
              isLightMode
                ? "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                : "text-neutral-400 hover:text-[#f5f5f5] hover:bg-[#181818]"
            }`}
            title={
              sidebarOpen
                ? "Collapse Syllabus Sidebar"
                : "Expand Syllabus Sidebar"
            }
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>
          <span className="text-base font-bold tracking-tight whitespace-nowrap shrink-0">
            CUET PG Economics — COQP10
          </span>
        </div>

        {/* Zone 2: Overall Syllabus Progress & Export/Import Navigation */}
        <div className={`hidden md:flex items-center gap-6 text-xs ${mutedText}`}>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap shrink-0 font-medium">
              Syllabus Mastery
            </span>
            <div
              className={`w-36 h-2 border rounded-sm overflow-hidden ${bgNested}`}
            >
              <div
                className="h-full bg-[#10b981] transition-all duration-200"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="font-mono tabular-nums font-semibold whitespace-nowrap shrink-0">
              {completedCount}/{totalSubtopicsCount} ({completionPercentage}%)
            </span>
          </div>

          <span aria-hidden="true">·</span>

          <button
            onClick={handleExportProgress}
            className="hover:text-[#10b981] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#10b981]" />
            Export Progress
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-[#10b981] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Progress
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportProgress}
            className="hidden"
          />
        </div>

        {/* Zone 3: Theme Toggle, Profile & Logout / Clear Key Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {statusToast && (
            <span className="hidden lg:inline-block text-xs font-mono text-[#10b981] whitespace-nowrap">
              {statusToast}
            </span>
          )}

          <button
            type="button"
            onClick={handleClearApiKey}
            className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${bgNested} hover:border-red-500/80 hover:text-red-400`}
            title="Clear saved Gemini API key and return to login screen"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Logout / Clear Key</span>
            <span className="sm:hidden">Logout</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
            }
            className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${bgNested} hover:border-[#10b981]`}
            title={
              isLightMode
                ? "Switch to AMOLED Dark Mode"
                : "Switch to Crisp Light Mode"
            }
          >
            {isLightMode ? (
              <>
                <Moon className="w-3.5 h-3.5 text-gray-700" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${bgNested} hover:border-[#10b981]`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Profile #{profileId || "init"}</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: 320px Collapsible Tree Menu + Bookmarked Topics Tab */}
        {sidebarOpen && (
          <aside
            className={`w-80 shrink-0 border-r flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 transition-colors ${bgSurface}`}
          >
            <div className={`p-3.5 border-b ${borderCol} space-y-2.5`}>
              <div
                className={`grid grid-cols-2 gap-1 p-0.5 border rounded ${bgNested}`}
              >
                <button
                  type="button"
                  onClick={() => setSidebarViewMode("syllabus")}
                  className={`py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                    sidebarViewMode === "syllabus"
                      ? "bg-[#10b981] text-[#050505] font-semibold"
                      : `${mutedText}`
                  }`}
                >
                  Syllabus Tree
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarViewMode("bookmarks")}
                  className={`py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer ${
                    sidebarViewMode === "bookmarks"
                      ? "bg-[#10b981] text-[#050505] font-semibold"
                      : `${mutedText}`
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>Bookmarked ({totalBookmarksCount})</span>
                </button>
              </div>

              <div className="relative">
                <Search
                  className={`w-3.5 h-3.5 ${mutedText} absolute left-3 top-1/2 -translate-y-1/2`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chapters or sub-topics..."
                  className={`w-full border focus:border-[#10b981] rounded pl-8 pr-3 py-1.5 text-xs outline-none transition-colors ${bgNested}`}
                />
              </div>

              {sidebarViewMode === "syllabus" && (
                <>
                  <div
                    className={`grid grid-cols-3 gap-1 p-0.5 border rounded ${bgNested}`}
                  >
                    {(["all", "pending", "completed"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab)}
                        className={`py-1 text-[11px] font-medium rounded-sm capitalize transition-colors whitespace-nowrap cursor-pointer ${
                          statusFilter === tab
                            ? isLightMode
                              ? "bg-gray-200 text-gray-900 font-semibold"
                              : "bg-[#1a1a1a] text-[#f5f5f5] font-semibold"
                            : `${mutedText}`
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div
                    className={`flex items-center justify-between text-[11px] pt-0.5 px-0.5 ${mutedText}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" />
                      <span>Cached ({cachedCount})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full border inline-block ${
                          isLightMode
                            ? "border-gray-400"
                            : "border-neutral-500"
                        }`}
                      />
                      <span>Uncached ({totalSubtopicsCount - cachedCount})</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {sidebarViewMode === "bookmarks" ? (
                <div className="space-y-3">
                  {SYLLABUS_TREE.flatMap((u) =>
                    u.chapters
                      .filter((c) => !!bookmarkedChapters[c.title])
                      .map((c) => ({ unit: u.unit, chapter: c }))
                  ).length === 0 &&
                  allSubtopicsList.filter(
                    (item) => !!bookmarkedSubtopics[item.subtopic]
                  ).length === 0 ? (
                    <div
                      className={`border rounded p-5 text-center space-y-2 ${bgNested}`}
                    >
                      <Star className="w-5 h-5 text-amber-400 mx-auto" />
                      <p className="text-xs font-medium">
                        No Bookmarked Topics Yet
                      </p>
                      <p className={`text-[11px] ${mutedText}`}>
                        Click the star icon next to any chapter or sub-topic in the syllabus tree to save it here for rapid revision.
                      </p>
                    </div>
                  ) : (
                    <>
                      {SYLLABUS_TREE.map((unitObj) =>
                        unitObj.chapters
                          .filter((ch) => !!bookmarkedChapters[ch.title])
                          .map((ch) => (
                            <div
                              key={ch.title}
                              className={`border rounded p-2.5 space-y-1.5 ${bgNested}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold">
                                  {ch.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    toggleChapterBookmark(ch.title, e)
                                  }
                                  className="text-amber-400 hover:opacity-80"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                                </button>
                              </div>
                              <div className="space-y-1 pt-1">
                                {ch.subtopics.map((sub) => {
                                  const isSubCached = !!cachedNotes[sub];
                                  return (
                                    <button
                                      key={sub}
                                      type="button"
                                      onClick={() =>
                                        handleSelectSubtopic(
                                          unitObj.unit,
                                          ch.title,
                                          sub
                                        )
                                      }
                                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-2 ${
                                        selectedSubtopic === sub
                                          ? "bg-[#10b981]/15 text-[#10b981] font-medium"
                                          : "hover:opacity-80"
                                      }`}
                                    >
                                      <span className="truncate">{sub}</span>
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          isSubCached
                                            ? "bg-[#10b981]"
                                            : isLightMode
                                            ? "border border-gray-400"
                                            : "border border-neutral-500"
                                        }`}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                      )}

                      {allSubtopicsList
                        .filter((item) => !!bookmarkedSubtopics[item.subtopic])
                        .map((item) => {
                          const isSubCached = !!cachedNotes[item.subtopic];
                          return (
                            <div
                              key={item.subtopic}
                              onClick={() =>
                                handleSelectSubtopic(
                                  item.unit,
                                  item.chapter,
                                  item.subtopic
                                )
                              }
                              className={`border rounded p-2.5 cursor-pointer transition-colors flex items-start justify-between gap-2 ${bgNested} ${
                                selectedSubtopic === item.subtopic
                                  ? "border-[#10b981]"
                                  : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`text-[10px] block ${mutedText}`}
                                >
                                  {item.chapter}
                                </span>
                                <p className="text-xs font-medium mt-0.5 leading-snug">
                                  {item.subtopic}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isSubCached
                                      ? "bg-[#10b981]"
                                      : isLightMode
                                      ? "border border-gray-400"
                                      : "border border-neutral-500"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    toggleSubtopicBookmark(item.subtopic, e)
                                  }
                                  className="text-amber-400"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              ) : (
                SYLLABUS_TREE.map((unitObj) => {
                  const unitSubtopics = unitObj.chapters.flatMap(
                    (c) => c.subtopics
                  );
                  const unitDoneCount = unitSubtopics.filter(
                    (s) => !!completedSubtopics[s]
                  ).length;
                  const isUnitExpanded =
                    !!expandedUnits[unitObj.unit] ||
                    searchQuery.trim().length > 0;

                  const filteredChapters = unitObj.chapters
                    .map((ch) => {
                      const matchingSubtopics = ch.subtopics.filter((s) => {
                        const matchesQuery =
                          !searchQuery.trim() ||
                          s
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          ch.title
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase());
                        const isDone = !!completedSubtopics[s];
                        const matchesFilter =
                          statusFilter === "all" ||
                          (statusFilter === "completed" && isDone) ||
                          (statusFilter === "pending" && !isDone);
                        return matchesQuery && matchesFilter;
                      });
                      return { ...ch, matchingSubtopics };
                    })
                    .filter((ch) => ch.matchingSubtopics.length > 0);

                  if (filteredChapters.length === 0) return null;

                  return (
                    <div
                      key={unitObj.unit}
                      className={`border rounded overflow-hidden ${bgNested}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedUnits((prev) => ({
                            ...prev,
                            [unitObj.unit]: !prev[unitObj.unit],
                          }))
                        }
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isUnitExpanded ? (
                            <ChevronDown
                              className={`w-3.5 h-3.5 ${mutedText} shrink-0`}
                            />
                          ) : (
                            <ChevronRight
                              className={`w-3.5 h-3.5 ${mutedText} shrink-0`}
                            />
                          )}
                          <span className="text-xs font-semibold truncate">
                            {unitObj.unit}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-mono tabular-nums shrink-0 ml-2 ${
                            unitDoneCount === unitSubtopics.length
                              ? "text-[#10b981] font-semibold"
                              : mutedText
                          }`}
                        >
                          {unitDoneCount}/{unitSubtopics.length}
                        </span>
                      </button>

                      {isUnitExpanded && (
                        <div className={`border-t ${borderCol}`}>
                          {filteredChapters.map((chapterObj) => {
                            const isChapterExpanded =
                              expandedChapters[chapterObj.title] !== false ||
                              searchQuery.trim().length > 0;
                            const isChBookmarked =
                              !!bookmarkedChapters[chapterObj.title];

                            return (
                              <div
                                key={chapterObj.title}
                                className={`border-b last:border-b-0 ${borderCol}`}
                              >
                                <div
                                  onClick={() =>
                                    setExpandedChapters((prev) => ({
                                      ...prev,
                                      [chapterObj.title]:
                                        prev[chapterObj.title] === false
                                          ? true
                                          : false,
                                    }))
                                  }
                                  className={`w-full pl-4 pr-2.5 py-2 flex items-center justify-between text-left cursor-pointer ${
                                    isLightMode
                                      ? "bg-gray-50 hover:bg-gray-100"
                                      : "bg-[#0a0a0a] hover:bg-[#141414]"
                                  }`}
                                >
                                  <span className="text-[11px] font-medium leading-snug pr-2">
                                    {chapterObj.title}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        toggleChapterBookmark(
                                          chapterObj.title,
                                          e
                                        )
                                      }
                                      className={`p-0.5 rounded transition-colors ${
                                        isChBookmarked
                                          ? "text-amber-400"
                                          : `${mutedText} hover:text-amber-400`
                                      }`}
                                    >
                                      <Star
                                        className={`w-3 h-3 ${
                                          isChBookmarked ? "fill-amber-400" : ""
                                        }`}
                                      />
                                    </button>
                                    {isChapterExpanded ? (
                                      <ChevronDown
                                        className={`w-3 h-3 ${mutedText}`}
                                      />
                                    ) : (
                                      <ChevronRight
                                        className={`w-3 h-3 ${mutedText}`}
                                      />
                                    )}
                                  </div>
                                </div>

                                {isChapterExpanded && (
                                  <div className="py-1 space-y-0.5">
                                    {chapterObj.matchingSubtopics.map(
                                      (subtopic) => {
                                        const isSelected =
                                          selectedSubtopic === subtopic;
                                        const isCompleted =
                                          !!completedSubtopics[subtopic];
                                        const isSubBookmarked =
                                          !!bookmarkedSubtopics[subtopic];
                                        const isCached =
                                          !!cachedNotes[subtopic];

                                        return (
                                          <div
                                            key={subtopic}
                                            onClick={() =>
                                              handleSelectSubtopic(
                                                unitObj.unit,
                                                chapterObj.title,
                                                subtopic
                                              )
                                            }
                                            className={`group pl-5 pr-2.5 py-2 flex items-start gap-2 cursor-pointer transition-colors ${
                                              isSelected
                                                ? isLightMode
                                                  ? "bg-emerald-50/80 text-gray-900"
                                                  : "bg-[#161616] text-[#f5f5f5]"
                                                : isLightMode
                                                ? "text-gray-700 hover:bg-gray-100"
                                                : "text-neutral-400 hover:bg-[#111111] hover:text-neutral-200"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={(e) =>
                                                toggleSubtopicCompletion(
                                                  subtopic,
                                                  e
                                                )
                                              }
                                              className="mt-0.5 shrink-0 hover:text-[#10b981] transition-colors"
                                            >
                                              {isCompleted ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-[#10b981]" />
                                              ) : (
                                                <Square
                                                  className={`w-3.5 h-3.5 ${mutedText}`}
                                                />
                                              )}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                              <p
                                                className={`text-xs leading-relaxed ${
                                                  isCompleted
                                                    ? "text-[#10b981] font-medium"
                                                    : isSelected
                                                    ? "font-semibold"
                                                    : ""
                                                }`}
                                              >
                                                {subtopic}
                                              </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 mt-1">
                                              <span
                                                className={`w-2 h-2 rounded-full transition-colors ${
                                                  isCached
                                                    ? "bg-[#10b981]"
                                                    : isLightMode
                                                    ? "border border-gray-400"
                                                    : "border border-neutral-500"
                                                }`}
                                                title={
                                                  isCached
                                                    ? "Cached — Free to view offline"
                                                    : "Uncached — Click 'Generate Study Notes' to fetch"
                                                }
                                              />

                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  toggleSubtopicBookmark(
                                                    subtopic,
                                                    e
                                                  )
                                                }
                                                className={`transition-opacity ${
                                                  isSubBookmarked
                                                    ? "text-amber-400 opacity-100"
                                                    : `${mutedText} opacity-0 group-hover:opacity-100 hover:text-amber-400`
                                                }`}
                                              >
                                                <Star
                                                  className={`w-3.5 h-3.5 ${
                                                    isSubBookmarked
                                                      ? "fill-amber-400"
                                                      : ""
                                                  }`}
                                                />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Main Study Workspace */}
        <main
          ref={workspaceRef}
          className="flex-1 overflow-y-auto h-[calc(100vh-3.5rem)]"
        >
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {/* Sub-topic Header Card */}
            <section className={`border rounded-lg p-6 ${bgSurface}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
                  <span>{selectedUnit}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => toggleChapterBookmark(selectedChapter)}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Bookmark this chapter"
                  >
                    <span>{selectedChapter}</span>
                    <Star
                      className={`w-3 h-3 ${
                        isCurrentChapterBookmarked
                          ? "text-amber-400 fill-amber-400"
                          : ""
                      }`}
                    />
                  </button>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Topic {currentIndex + 1} of {totalSubtopicsCount}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* ▶️ Concept Videos Toggle Button (Smart YouTube Concept Caching) */}
                  <button
                    type="button"
                    onClick={handleToggleConceptVideos}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      showConceptVideos
                        ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981]"
                        : `${bgNested} hover:border-[#10b981]`
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current text-[#10b981]" />
                    <span>▶️ Concept Videos</span>
                    {activeYoutubeLinks.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    )}
                  </button>

                  {/* Bookmark Sub-Topic Button */}
                  <button
                    type="button"
                    onClick={() => toggleSubtopicBookmark(selectedSubtopic)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrentSubtopicBookmarked
                        ? "bg-amber-500/15 border-amber-400 text-amber-400"
                        : `${bgNested} hover:border-amber-400`
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isCurrentSubtopicBookmarked ? "fill-amber-400" : ""
                      }`}
                    />
                    <span>
                      {isCurrentSubtopicBookmarked ? "Bookmarked" : "Bookmark"}
                    </span>
                  </button>

                  {activeNote && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          generateNotesForSubtopic(
                            selectedUnit,
                            selectedChapter,
                            selectedSubtopic
                          )
                        }
                        disabled={isGeneratingNotes}
                        className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer ${bgNested} hover:border-[#10b981]`}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isGeneratingNotes
                              ? "animate-spin text-[#10b981]"
                              : ""
                          }`}
                        />
                        <span>
                          {isGeneratingNotes
                            ? "Regenerating..."
                            : "Regenerate"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCachedNotes(selectedSubtopic)
                        }
                        disabled={isGeneratingNotes}
                        className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1 text-red-400 hover:border-red-500/60 hover:bg-red-500/10 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer ${bgNested}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Cache</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleSubtopicCompletion(selectedSubtopic)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrentCompleted
                        ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981]"
                        : `${bgNested} hover:border-[#10b981]`
                    }`}
                  >
                    {isCurrentCompleted ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Mark Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                {selectedSubtopic}
              </h1>

              {/* Smart YouTube Concept Videos Collapsible Drawer */}
              {showConceptVideos && (
                <div
                  className={`mt-5 pt-4 border-t ${borderCol} space-y-3 transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Youtube className="w-4 h-4 text-[#10b981]" />
                      <span>
                        Targeted Concept & Mathematical Derivation Videos
                      </span>
                    </div>
                    <span className={`text-[11px] font-mono ${mutedText}`}>
                      {activeYoutubeLinks.length > 0
                        ? "Cached in localStorage (0 tokens)"
                        : "Fetching queries..."}
                    </span>
                  </div>

                  {isGeneratingVideos && (
                    <div
                      className={`border rounded p-5 text-center space-y-2 ${bgNested}`}
                    >
                      <RefreshCw className="w-4 h-4 text-[#10b981] animate-spin mx-auto" />
                      <p className={`text-xs ${mutedText}`}>
                        Generating 3 targeted YouTube search queries for{" "}
                        {selectedSubtopic}...
                      </p>
                    </div>
                  )}

                  {videosError && (
                    <p className="text-xs text-red-400">{videosError}</p>
                  )}

                  {activeYoutubeLinks.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeYoutubeLinks.map((yt, idx) => {
                        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                          yt.searchQuery
                        )}`;
                        return (
                          <a
                            key={idx}
                            href={ytUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`border hover:border-[#10b981] rounded p-3.5 flex flex-col justify-between gap-2 transition-colors group ${bgNested}`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-xs font-semibold group-hover:text-[#10b981] transition-colors leading-snug">
                                  {yt.title}
                                </h3>
                                <ExternalLink
                                  className={`w-3.5 h-3.5 ${mutedText} group-hover:text-[#10b981] shrink-0 mt-0.5`}
                                />
                              </div>
                              <p className={`text-[11px] ${mutedText} mt-1`}>
                                {yt.channelHint}
                              </p>
                            </div>
                            <div
                              className={`text-[10px] font-mono ${mutedText} pt-2 border-t ${borderCol}`}
                            >
                              {yt.durationFocus}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`mt-4 pt-4 border-t ${borderCol} flex flex-wrap items-center justify-between gap-4 text-xs ${mutedText}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>
                    Select any text/formula for{" "}
                    <strong className="text-[#10b981]">✨ Ask Gemini</strong> or click{" "}
                    <strong className="text-[#10b981]">✂️ Crop & Ask</strong>{" "}
                    on the left edge to analyze any visual region
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={() => {
                      const prev = allSubtopicsList[currentIndex - 1];
                      if (prev)
                        handleSelectSubtopic(
                          prev.unit,
                          prev.chapter,
                          prev.subtopic
                        );
                    }}
                    className="hover:text-[#10b981] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    ← Previous Topic
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    disabled={currentIndex >= totalSubtopicsCount - 1}
                    onClick={() => {
                      const next = allSubtopicsList[currentIndex + 1];
                      if (next)
                        handleSelectSubtopic(
                          next.unit,
                          next.chapter,
                          next.subtopic
                        );
                    }}
                    className="hover:text-[#10b981] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    Next Topic →
                  </button>
                </div>
              </div>
            </section>

            {/* Saved Inline & Vision Tutor Q&A Cards for Active Sub-Topic */}
            {activePinnedTutorItems.length > 0 && (
              <section
                className={`border rounded-lg p-5 space-y-3 ${bgSurface}`}
              >
                <div
                  className={`flex items-center justify-between border-b ${borderCol} pb-2.5`}
                >
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#10b981]" />
                    <span>
                      📌 Saved Tutor Q&As ({activePinnedTutorItems.length})
                    </span>
                  </h2>
                  <span className={`text-xs ${mutedText}`}>
                    Permanently Cached in Notes
                  </span>
                </div>

                <div className="space-y-3">
                  {activePinnedTutorItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded p-3.5 space-y-2.5 ${bgNested}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className={`text-[11px] ${mutedText}`}>
                            <span className="font-semibold text-[#10b981] mr-1.5">
                              {item.sourceType === "vision"
                                ? "✂️ Vision Crop:"
                                : "✨ Inline Selection:"}
                            </span>
                            <RichMathText text={item.selectedText} />
                          </div>
                          <p className="text-xs font-semibold">
                            Q: <RichMathText text={item.question} />
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-mono ${mutedText}`}>
                            {item.createdAt}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePinnedTutorItem(item.id)}
                            className={`p-1 ${mutedText} hover:text-red-400 transition-colors cursor-pointer`}
                            title="Remove saved Q&A"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {item.croppedImageBase64 && (
                        <img
                          src={item.croppedImageBase64}
                          alt="Saved cropped region"
                          referrerPolicy="no-referrer"
                          className="max-h-36 object-contain rounded border border-[#222222]"
                        />
                      )}

                      <div
                        className={`pt-2 border-t ${borderCol} text-xs sm:text-sm leading-relaxed space-y-1.5 ${bodyProseText}`}
                      >
                        {item.answer.split("\n\n").map((p, idx) => (
                          <p key={idx}>
                            <RichMathText text={p} />
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Saved Multi-Color Highlights Panel */}
            {activeTopicHighlights.length > 0 && (
              <section
                className={`border rounded-lg p-5 space-y-3 ${bgSurface}`}
              >
                <div
                  className={`flex items-center justify-between border-b ${borderCol} pb-2.5`}
                >
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Highlighter className="w-4 h-4 text-[#10b981]" />
                    <span>
                      Saved Topic Highlights ({activeTopicHighlights.length})
                    </span>
                  </h2>
                  <span className={`text-xs ${mutedText}`}>
                    Persisted in Profile #{profileId}
                  </span>
                </div>

                <div className="space-y-2">
                  {activeTopicHighlights.map((hl) => {
                    const style =
                      HIGHLIGHT_COLOR_STYLES[hl.color] ||
                      HIGHLIGHT_COLOR_STYLES.yellow;
                    return (
                      <div
                        key={hl.id}
                        className={`border rounded p-3 flex items-start justify-between gap-3 ${bgNested}`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded border font-medium ${style.badgeClass}`}
                            >
                              {style.label}
                            </span>
                            <span className={mutedText}>{hl.sectionLabel}</span>
                            <span aria-hidden="true" className={mutedText}>
                              ·
                            </span>
                            <span className={`font-mono ${mutedText}`}>
                              {hl.createdAt}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed">
                            <RichMathText text={hl.text} />
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(
                            [
                              "yellow",
                              "emerald",
                              "blue",
                              "rose",
                            ] as HighlightColor[]
                          ).map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() =>
                                handleUpdateHighlightColor(hl.id, col)
                              }
                              className={`w-3.5 h-3.5 rounded-full ${
                                HIGHLIGHT_COLOR_STYLES[col].swatchClass
                              } ${
                                hl.color === col
                                  ? "ring-2 ring-offset-1 ring-[#10b981]"
                                  : "opacity-60 hover:opacity-100"
                              }`}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(hl.id)}
                            className={`p-1 ${mutedText} hover:text-red-400 transition-colors ml-1`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty State UI — Manual Generation Gate when Sub-Topic has NO cached notes */}
            {!activeNote && !isGeneratingNotes && (
              <section
                className={`border rounded-lg py-14 px-6 text-center space-y-5 ${bgSurface}`}
              >
                <div className="w-12 h-12 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5 text-[#10b981]" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-lg font-bold tracking-tight">
                    No Cached Study Notes for This Topic Yet
                  </h2>
                  <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                    To conserve API tokens, study notes are only generated on demand. Click below to synthesize rigorous English conceptual notes, KaTeX mathematical derivations, analytical edge cases, and practice problems for{" "}
                    <span className="font-semibold text-[#10b981]">
                      {selectedSubtopic}
                    </span>
                    .
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      generateNotesForSubtopic(
                        selectedUnit,
                        selectedChapter,
                        selectedSubtopic
                      )
                    }
                    className="px-6 py-3 text-xs sm:text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-[#050505] rounded-md transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Study Notes</span>
                  </button>
                </div>
              </section>
            )}

            {/* Live Blueprint & Concurrent Expansion Checklist UI (Scoped to generatingTopicId) */}
            {isGeneratingNotes && (
              <section
                className={`border rounded-lg p-6 sm:p-8 space-y-5 ${bgSurface}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222222] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-[#10b981] animate-spin shrink-0" />
                    <h2 className="text-sm sm:text-base font-semibold">
                      Blueprint & Parallel Expansion Engine (Promise.allSettled)
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[#10b981] px-2.5 py-0.5 rounded bg-[#10b981]/10 border border-[#10b981]/30 truncate max-w-xs">
                    generatingTopicId: {selectedSubtopic}
                  </span>
                </div>

                <div
                  className={`rounded-md border p-4 font-mono text-xs space-y-3 ${bgNested}`}
                >
                  {/* Pass 1 Status Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {activeChecklist?.blueprintStatus === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-[#10b981] animate-spin shrink-0" />
                      )}
                      <span
                        className={
                          activeChecklist?.blueprintStatus === "completed"
                            ? "text-[#10b981] font-semibold"
                            : ""
                        }
                      >
                        [Pass 1: Blueprint] Deconstructing "{selectedSubtopic}" into ordered micro-concepts
                      </span>
                    </div>
                    <span className="text-[10px] text-[#10b981] shrink-0">
                      {activeChecklist?.blueprintStatus === "completed"
                        ? "✓ Blueprint Ready"
                        : "Generating JSON..."}
                    </span>
                  </div>

                  {/* Pass 2 Concurrent Micro-Concept Promises */}
                  {activeChecklist && activeChecklist.items.length > 0 && (
                    <div className="pl-3 border-l-2 border-[#10b981]/30 space-y-2.5 pt-1">
                      <div className={`text-[11px] ${mutedText}`}>
                        [Pass 2: Concurrent Expansion] Executing{" "}
                        {activeChecklist.items.length} parallel Gemini API requests via{" "}
                        <code className="text-[#10b981]">Promise.allSettled()</code>:
                      </div>
                      {activeChecklist.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                            ) : item.status === "failed" ? (
                              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-[#10b981] animate-spin shrink-0" />
                            )}
                            <span
                              className={`truncate ${
                                item.status === "completed"
                                  ? "text-[#10b981] font-semibold"
                                  : item.status === "failed"
                                  ? "text-red-400"
                                  : ""
                              }`}
                            >
                              [Chunk 0{item.index + 1}] {item.title}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] shrink-0 ${
                              item.status === "completed"
                                ? "text-[#10b981]"
                                : mutedText
                            }`}
                          >
                            {item.status === "completed"
                              ? `✓ Resolved ${item.resolvedAt || ""}`
                              : item.status === "failed"
                              ? "Fallback applied"
                              : "Expanding in parallel..."}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {notesError && (
              <section
                className={`border border-red-800/60 rounded-lg p-5 flex items-center justify-between gap-4 ${bgSurface}`}
              >
                <div className="text-xs text-red-400">
                  <strong className="font-semibold block text-sm mb-0.5">
                    Could not generate notes
                  </strong>
                  {notesError}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    generateNotesForSubtopic(
                      selectedUnit,
                      selectedChapter,
                      selectedSubtopic
                    )
                  }
                  className={`px-3.5 py-2 text-xs font-medium border hover:border-[#10b981] rounded shrink-0 cursor-pointer ${bgNested}`}
                >
                  Retry Generation
                </button>
              </section>
            )}

            {/* Cached Study Notes Content */}
            {activeNote && (
              <>
                <section
                  className={`border rounded-lg p-6 space-y-3 ${bgSurface}`}
                >
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCol} pb-3`}
                  >
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#10b981]" />
                      <span>
                        1. Intuition First & Core Framework (Feynman Technique)
                      </span>
                    </h2>
                    <div className="flex items-center gap-3">
                      {activeNote.generatedAt && (
                        <span className={`text-xs font-mono ${mutedText}`}>
                          Cached · {activeNote.generatedAt}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCachedNotes(selectedSubtopic)
                        }
                        className={`text-xs ${mutedText} hover:text-red-400 transition-colors inline-flex items-center gap-1 cursor-pointer`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear Cache</span>
                      </button>
                    </div>
                  </div>
                  <div
                    className={`text-[15px] leading-relaxed font-serif-editorial space-y-3 ${bodyProseText}`}
                  >
                    {activeNote.overview.split("\n\n").map((para, i) => (
                      <p key={i}>
                        <RichMathText
                          text={para}
                          highlights={activeTopicHighlights}
                        />
                      </p>
                    ))}
                  </div>
                </section>

                {/* Ordered Pass-2 Micro-Concept Deep-Dive Chunks (Stitched in Exact Pass-1 Blueprint Order) */}
                {activeNote.expandedChunks &&
                  activeNote.expandedChunks.length > 0 && (
                    <section
                      className={`border rounded-lg p-6 space-y-5 ${bgSurface}`}
                    >
                      <div
                        className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCol} pb-3`}
                      >
                        <h2 className="text-base font-semibold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#10b981]" />
                          <span>
                            Ordered Blueprint Micro-Concepts (
                            {activeNote.expandedChunks.length} Modules)
                          </span>
                        </h2>
                        <span className="text-[11px] font-mono text-[#10b981]">
                          Stitched in Pass-1 Blueprint Order
                        </span>
                      </div>

                      <div className="space-y-4">
                        {[...activeNote.expandedChunks]
                          .sort((a, b) => a.index - b.index)
                          .map((chunk) => (
                            <div
                              key={chunk.id || chunk.index}
                              className={`border rounded-md p-4 space-y-3 ${bgNested}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                                    0{chunk.index + 1}
                                  </span>
                                  <RichMathText
                                    text={chunk.title}
                                    highlights={activeTopicHighlights}
                                  />
                                </h3>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                              </div>

                              <div
                                className={`text-xs sm:text-sm leading-relaxed space-y-2 ${bodyProseText}`}
                              >
                                {chunk.deepExplanation
                                  .split("\n\n")
                                  .map((para, pIdx) => (
                                    <p key={pIdx}>
                                      <RichMathText
                                        text={para}
                                        highlights={activeTopicHighlights}
                                      />
                                    </p>
                                  ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}

                <section
                  className={`border rounded-lg p-6 space-y-5 ${bgSurface}`}
                >
                  <div className={`border-b ${borderCol} pb-3`}>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#10b981]" />
                      <span>
                        2. Mathematical Derivations & Plain-English Translations
                      </span>
                    </h2>
                  </div>

                  <div className="space-y-5">
                    {activeNote.derivations.map((deriv, idx) => (
                      <div
                        key={idx}
                        className={`border rounded p-4 space-y-3 ${bgNested}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">
                            <RichMathText
                              text={`${idx + 1}. ${deriv.title}`}
                              highlights={activeTopicHighlights}
                            />
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(
                              [
                                "yellow",
                                "emerald",
                                "blue",
                                "rose",
                              ] as HighlightColor[]
                            ).map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() =>
                                  handleCreateHighlight(
                                    `${deriv.title}: $$${deriv.latex}$$`,
                                    col,
                                    "Mathematical Derivation"
                                  )
                                }
                                className={`w-3.5 h-3.5 rounded-full ${HIGHLIGHT_COLOR_STYLES[col].swatchClass} opacity-60 hover:opacity-100 transition-opacity`}
                              />
                            ))}
                          </div>
                        </div>

                        <div
                          className={`py-3 px-4 border rounded overflow-x-auto text-center ${
                            isLightMode
                              ? "bg-gray-50 border-gray-200"
                              : "bg-[#0a0a0a] border-[#1a1a1a]"
                          }`}
                        >
                          <MathFormula latex={deriv.latex} displayMode={true} />
                        </div>

                        <p
                          className={`text-xs sm:text-sm leading-relaxed ${bodyProseText}`}
                        >
                          <RichMathText
                            text={deriv.explanation}
                            highlights={activeTopicHighlights}
                          />
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className={`border rounded-lg p-6 space-y-4 ${bgSurface}`}
                >
                  <div className={`border-b ${borderCol} pb-3`}>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#10b981]" />
                      <span>
                        3. Core Economic Propositions (Bite-Sized & Exam-Friendly)
                      </span>
                    </h2>
                  </div>

                  <ul className="space-y-3">
                    {activeNote.keyPoints.map((pt, idx) => (
                      <li
                        key={idx}
                        className={`group flex items-start justify-between gap-3 text-sm leading-relaxed ${bodyProseText}`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <span className="font-mono tabular-nums text-xs text-[#10b981] mt-1 shrink-0">
                            0{idx + 1}.
                          </span>
                          <div className="flex-1">
                            <RichMathText
                              text={pt}
                              highlights={activeTopicHighlights}
                            />
                          </div>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 mt-1">
                          {(
                            [
                              "yellow",
                              "emerald",
                              "blue",
                              "rose",
                            ] as HighlightColor[]
                          ).map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() =>
                                handleCreateHighlight(
                                  pt,
                                  col,
                                  `Key Point #${idx + 1}`
                                )
                              }
                              className={`w-3 h-3 rounded-full ${HIGHLIGHT_COLOR_STYLES[col].swatchClass}`}
                            />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {activeNote.examTraps && activeNote.examTraps.length > 0 && (
                  <section
                    className={`border rounded-lg p-6 space-y-4 ${bgSurface}`}
                  >
                    <div className={`border-b ${borderCol} pb-3`}>
                      <h2 className="text-base font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>
                          4. PYQ Exam Traps & Mentor Advice (The Trap vs. The Reality)
                        </span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      {activeNote.examTraps.map((trap, idx) => {
                        const lines = trap
                          .split("\n")
                          .map((l) => l.trim())
                          .filter(Boolean);
                        return (
                          <div
                            key={idx}
                            className={`border rounded-md p-4 text-xs sm:text-sm leading-relaxed space-y-2 ${bgNested}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                                PYQ Mentor Note #{idx + 1}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {lines.map((line, lineIdx) => (
                                <p key={lineIdx} className="leading-relaxed">
                                  <RichMathText
                                    text={line}
                                    highlights={activeTopicHighlights}
                                  />
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {activeNote.practiceQuestions &&
                  activeNote.practiceQuestions.length > 0 && (() => {
                    const allQuestions = activeNote.practiceQuestions.map(
                      (q, originalIdx) => {
                        const inferredCategory: "pyq" | "verification" =
                          q.category === "verification"
                            ? "verification"
                            : q.category === "pyq"
                            ? "pyq"
                            : originalIdx <
                              Math.ceil(activeNote.practiceQuestions.length / 2)
                            ? "pyq"
                            : "verification";
                        const examTag =
                          q.examTag ||
                          (inferredCategory === "pyq"
                            ? `CUET PG (COQP10) · Sub-Topic PYQ #${originalIdx + 1}`
                            : `Concept Check #${originalIdx + 1} · Topic Verification`);
                        const conceptTested =
                          q.conceptTested || selectedSubtopic.split(":")[0];
                        return {
                          ...q,
                          originalIdx,
                          inferredCategory,
                          examTag,
                          conceptTested,
                        };
                      }
                    );

                    const pyqTotalCount = allQuestions.filter(
                      (q) => q.inferredCategory === "pyq"
                    ).length;
                    const verificationTotalCount = allQuestions.filter(
                      (q) => q.inferredCategory === "verification"
                    ).length;

                    // Compute Topic Verification & PYQ Mastery Metrics
                    const pyqCorrectCount = allQuestions.filter(
                      (q) =>
                        q.inferredCategory === "pyq" &&
                        selectedAnswers[`${selectedSubtopic}_q${q.originalIdx}`] ===
                          q.correctIndex
                    ).length;
                    const verificationAnsweredCount = allQuestions.filter(
                      (q) =>
                        q.inferredCategory === "verification" &&
                        selectedAnswers[`${selectedSubtopic}_q${q.originalIdx}`] !==
                          undefined
                    ).length;
                    const verificationCorrectCount = allQuestions.filter(
                      (q) =>
                        q.inferredCategory === "verification" &&
                        selectedAnswers[`${selectedSubtopic}_q${q.originalIdx}`] ===
                          q.correctIndex
                    ).length;
                    const isTopicVerified =
                      verificationTotalCount > 0 &&
                      verificationCorrectCount === verificationTotalCount;

                    // Filter by search query, category tab, and exam year pill
                    const trimmedSearch = pyqSearchQuery.trim().toLowerCase();
                    const filteredQuestions = allQuestions.filter((q) => {
                      const matchesCategory =
                        pyqCategoryFilter === "all" ||
                        q.inferredCategory === pyqCategoryFilter;
                      const matchesYear =
                        pyqYearFilter === "all" ||
                        q.examTag.includes(pyqYearFilter);
                      const matchesSearch =
                        !trimmedSearch ||
                        q.question.toLowerCase().includes(trimmedSearch) ||
                        q.examTag.toLowerCase().includes(trimmedSearch) ||
                        q.conceptTested.toLowerCase().includes(trimmedSearch) ||
                        q.solution.toLowerCase().includes(trimmedSearch);
                      return matchesCategory && matchesYear && matchesSearch;
                    });

                    // Build Complete Sub-Topic PYQ Concept Coverage Blueprint (so the student sees 100% of what comes from this topic)
                    const pyqBlueprintItems = allQuestions
                      .filter((q) => q.inferredCategory === "pyq")
                      .map((q) => ({
                        idx: q.originalIdx,
                        examTag: q.examTag.replace(" · PYQ", ""),
                        conceptTested: q.conceptTested,
                        isSolved:
                          selectedAnswers[`${selectedSubtopic}_q${q.originalIdx}`] ===
                          q.correctIndex,
                      }));

                    const isGeneratingMorePyqs =
                      !!generatingPyqsByTopic[selectedSubtopic];

                    return (
                      <section
                        className={`border rounded-lg p-6 space-y-5 ${bgSurface}`}
                      >
                        <div
                          className={`border-b ${borderCol} pb-3.5 flex flex-wrap items-center justify-between gap-3`}
                        >
                          <h2 className="text-base font-semibold flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-[#10b981]" />
                            <span>
                              5. Sub-Topic PYQ Archive & Concept Mastery Verification
                            </span>
                          </h2>

                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="px-2.5 py-1 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]">
                              PYQs Correct: {pyqCorrectCount}/{pyqTotalCount}
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded border ${
                                isTopicVerified
                                  ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981] font-semibold"
                                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              }`}
                            >
                              Concept Verification: {verificationCorrectCount}/
                              {verificationTotalCount}
                            </span>
                          </div>
                        </div>

                        {/* Complete Sub-Topic PYQ Blueprint Map ("What Comes from This Topic in CUET PG 2021-2025") */}
                        <div
                          className={`border rounded-md p-4 space-y-2.5 ${bgNested}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
                              <span>
                                Complete CUET PG Pattern Blueprint — Every Concept Tested in{" "}
                                {selectedSubtopic.split(":")[0]} (2021–2025)
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-[#10b981]">
                              {pyqTotalCount} PYQ Patterns Covered · Zero Blind Spots
                            </span>
                          </div>
                          <p className={`text-[11px] ${mutedText}`}>
                            Below is the complete checklist of every question pattern asked in CUET PG (COQP10) / CUCET from this sub-topic. Each tag turns emerald green once you solve its corresponding PYQ below:
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {pyqBlueprintItems.map((item) => (
                              <span
                                key={item.idx}
                                className={`text-[11px] px-2.5 py-1 rounded border inline-flex items-center gap-1.5 ${
                                  item.isSolved
                                    ? "bg-[#10b981]/15 border-[#10b981]/50 text-[#10b981] font-medium"
                                    : `${bgSurface} ${mutedText}`
                                }`}
                              >
                                {item.isSolved ? (
                                  <CheckCircle2 className="w-3 h-3 text-[#10b981] shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full border border-current opacity-60 shrink-0" />
                                )}
                                <span className="font-mono text-[10px] opacity-80">
                                  [{item.examTag.split(" ")[2] || "PYQ"}]
                                </span>
                                <RichMathText text={item.conceptTested} />
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Part 1: Sub-Topic PYQ Search, Category Tabs & Year Filter Bar */}
                        <div
                          className={`border rounded-md p-3.5 space-y-3 ${bgNested}`}
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <div className="relative flex-1">
                              <Search
                                className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`}
                              />
                              <input
                                type="text"
                                value={pyqSearchQuery}
                                onChange={(e) =>
                                  setPyqSearchQuery(e.target.value)
                                }
                                placeholder={`Search all CUET PG PYQs & concept checks in ${
                                  selectedSubtopic.split(":")[0]
                                } (e.g., 2025, 2024, log-linear, Giffen, kink, Engel)...`}
                                className={`w-full pl-8 pr-8 py-2 text-xs border rounded focus:outline-none focus:border-[#10b981] ${bgSurface}`}
                              />
                              {pyqSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setPyqSearchQuery("")}
                                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${mutedText} hover:opacity-80 cursor-pointer`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={isGeneratingMorePyqs}
                              onClick={() =>
                                handleSearchAndLoadSubtopicPyqs(pyqSearchQuery)
                              }
                              className="px-3.5 py-2 text-xs font-semibold rounded bg-[#10b981] hover:bg-[#059669] text-[#050505] transition-colors inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              {isGeneratingMorePyqs ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Loading All Sub-Topic PYQs...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>
                                    {pyqSearchQuery.trim()
                                      ? "Find Matching Sub-Topic PYQs"
                                      : "+ Load Complete PYQ Bank (2021–2025)"}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(
                                [
                                  {
                                    id: "all",
                                    label: `All Questions (${allQuestions.length})`,
                                  },
                                  {
                                    id: "pyq",
                                    label: `1. All Sub-Topic PYQs (${pyqTotalCount})`,
                                  },
                                  {
                                    id: "verification",
                                    label: `2. Concept Mastery Verification (${verificationTotalCount})`,
                                  },
                                ] as const
                              ).map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setPyqCategoryFilter(tab.id)}
                                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                    pyqCategoryFilter === tab.id
                                      ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981] font-semibold"
                                      : `${bgSurface} hover:border-[#10b981]/50 ${mutedText}`
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            {/* Year Filter Buttons (2021-2025) */}
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`text-[11px] font-mono mr-1 ${mutedText}`}
                              >
                                Year:
                              </span>
                              {(
                                [
                                  "all",
                                  "2025",
                                  "2024",
                                  "2023",
                                  "2022",
                                  "2021",
                                ] as const
                              ).map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => setPyqYearFilter(yr)}
                                  className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                                    pyqYearFilter === yr
                                      ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981] font-semibold"
                                      : `${bgSurface} hover:border-[#10b981]/50 ${mutedText}`
                                  }`}
                                >
                                  {yr === "all" ? "All Years" : yr}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Part 2: Topic Completion & Concept Mastery Readiness Bar */}
                        <div
                          className={`border rounded-md p-3.5 flex flex-wrap items-center justify-between gap-3 ${
                            isTopicVerified
                              ? "bg-[#10b981]/10 border-[#10b981]/40"
                              : bgNested
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold flex items-center gap-2">
                              {isTopicVerified ? (
                                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                              <span>
                                {isTopicVerified
                                  ? "Concept Mastery Verified! You have answered all verification checks for this sub-topic."
                                  : `Topic Completion Verification: Solve all ${verificationTotalCount} Concept Verification questions to verify mastery (${verificationAnsweredCount}/${verificationTotalCount} attempted).`}
                              </span>
                            </div>
                            <p className={`text-[11px] ${mutedText}`}>
                              Part 1 tests authentic past CUET PG questions from{" "}
                              {selectedSubtopic.split(":")[0]}; Part 2 verifies
                              that you have mastered every core intuition and
                              formula before moving to the next sub-topic.
                            </p>
                          </div>

                          {!isCurrentCompleted ? (
                            <button
                              type="button"
                              onClick={() =>
                                toggleSubtopicCompletion(selectedSubtopic)
                              }
                              className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isTopicVerified
                                  ? "bg-[#10b981] text-[#050505] hover:bg-[#059669]"
                                  : `border ${bgSurface} hover:border-[#10b981]`
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {isTopicVerified
                                  ? "Mark Sub-Topic Verified & Complete"
                                  : "Mark Sub-Topic Complete"}
                              </span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded text-xs font-semibold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 inline-flex items-center gap-1.5 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sub-Topic Marked Completed</span>
                            </span>
                          )}
                        </div>

                        {/* Filtered PYQ & Concept Verification Questions List */}
                        {filteredQuestions.length === 0 ? (
                          <div
                            className={`border rounded-md p-6 text-center space-y-3 ${bgNested}`}
                          >
                            <p className={`text-xs ${mutedText}`}>
                              No cached questions matched "{pyqSearchQuery}".
                              Click below to search and generate targeted PYQs &
                              verification questions for "{pyqSearchQuery}" in{" "}
                              <strong className="font-semibold">
                                {selectedSubtopic}
                              </strong>
                              .
                            </p>
                            <button
                              type="button"
                              disabled={isGeneratingMorePyqs}
                              onClick={() =>
                                handleSearchAndLoadSubtopicPyqs(pyqSearchQuery)
                              }
                              className="px-4 py-2 text-xs font-semibold rounded bg-[#10b981] hover:bg-[#059669] text-[#050505] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>
                                Generate "{pyqSearchQuery}" PYQs for This Topic
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredQuestions.map((q) => {
                              const answerKey = `${selectedSubtopic}_q${q.originalIdx}`;
                              const userChoice = selectedAnswers[answerKey];
                              const isAnswered = userChoice !== undefined;
                              const isCorrect = userChoice === q.correctIndex;
                              const isPyq = q.inferredCategory === "pyq";

                              return (
                                <div
                                  key={q.originalIdx}
                                  className={`border rounded-md p-4 space-y-3.5 ${bgNested}`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`font-mono text-[11px] px-2.5 py-0.5 rounded border font-semibold ${
                                          isPyq
                                            ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30"
                                            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                        }`}
                                      >
                                        {q.examTag}
                                      </span>
                                      <span
                                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${bgSurface} ${mutedText}`}
                                      >
                                        Tests: {q.conceptTested}
                                      </span>
                                    </div>

                                    <span
                                      className={`text-[11px] font-mono ${mutedText}`}
                                    >
                                      {isPyq
                                        ? "Part 1 · Sub-Topic PYQ"
                                        : "Part 2 · Concept Mastery Check"}
                                    </span>
                                  </div>

                                  <p className="text-sm font-medium leading-relaxed">
                                    <span className="font-mono text-[#10b981] mr-2">
                                      Q{q.originalIdx + 1}.
                                    </span>
                                    <RichMathText text={q.question} />
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, optIdx) => {
                                      const isThisSelected =
                                        userChoice === optIdx;
                                      const isThisCorrect =
                                        q.correctIndex === optIdx;

                                      let btnStyle = `${bgSurface} hover:border-[#10b981]`;
                                      if (isAnswered) {
                                        if (isThisCorrect) {
                                          btnStyle =
                                            "bg-[#10b981]/15 border-[#10b981] text-[#10b981] font-medium";
                                        } else if (
                                          isThisSelected &&
                                          !isThisCorrect
                                        ) {
                                          btnStyle =
                                            "bg-red-500/15 border-red-500 text-red-400";
                                        }
                                      }

                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() =>
                                            setSelectedAnswers((prev) => ({
                                              ...prev,
                                              [answerKey]: optIdx,
                                            }))
                                          }
                                          className={`px-3.5 py-2.5 text-left text-xs rounded border transition-colors flex items-center justify-between gap-2 cursor-pointer ${btnStyle}`}
                                        >
                                          <span>
                                            <span className="font-mono mr-2 opacity-60">
                                              ({String.fromCharCode(65 + optIdx)}
                                              )
                                            </span>
                                            <RichMathText text={opt} />
                                          </span>
                                          {isAnswered && isThisCorrect && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                                          )}
                                          {isAnswered &&
                                            isThisSelected &&
                                            !isThisCorrect && (
                                              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                            )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {isAnswered && (
                                    <div
                                      className={`pt-3 border-t ${borderCol} text-xs leading-relaxed ${bodyProseText}`}
                                    >
                                      <span
                                        className={`font-semibold mr-2 ${
                                          isCorrect
                                            ? "text-[#10b981]"
                                            : "text-red-400"
                                        }`}
                                      >
                                        {isCorrect
                                          ? "✓ Verified Walkthrough:"
                                          : "✗ Step-by-Step Solution:"}
                                      </span>
                                      <RichMathText text={q.solution} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })()}
              </>
            )}

            {/* On-Demand Plotly.js Interactive Graph Menu & Real-Time Slider Engine */}
            <InteractiveEconLab
              unit={selectedUnit}
              chapter={selectedChapter}
              subtopic={selectedSubtopic}
              relatedGraphs={activeRelatedGraphs}
              selectedGraphId={activeSelectedGraphId}
              generatingGraphId={activeGeneratingGraphId}
              isDiscoveringMenu={isDiscoveringMenu}
              cachedTopicModels={activeCachedTopicModels}
              model={activeModel}
              sliderValues={activeSliderValues}
              onChangeSliderValues={(next) =>
                setSliderValuesByTopic((prev) => ({
                  ...prev,
                  [selectedSubtopic]: next,
                }))
              }
              isGeneratingModel={isGeneratingModel}
              modelError={modelError}
              onSelectGraphOption={handleSelectGraphOption}
              onDiscoverRelatedGraphs={handleDiscoverRelatedGraphs}
              onGenerateModel={handleGeneratePlotlyModel}
              onDeleteModelCache={handleDeleteModelCache}
              isLightMode={isLightMode}
              lastShiftNote={lastShiftNote}
            />

            {/* Topic-Restricted Graph & Concept Q&A Chat */}
            <section className={`border rounded-lg p-6 space-y-4 ${bgSurface}`}>
              <div
                className={`border-b ${borderCol} pb-3 flex flex-wrap items-center justify-between gap-2`}
              >
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#10b981]" />
                    <span>Topic-Restricted Graph & Concept Q&A</span>
                  </h2>
                  <p className={`text-xs ${mutedText} mt-0.5`}>
                    Strictly scoped to{" "}
                    <span className="font-semibold">{selectedSubtopic}</span>{" "}
                    and its interactive Plotly graph above. Ask about specific curve shifts, slopes, or proofs.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  `Explain the slope and curvature conditions for ${
                    selectedSubtopic.split(":")[0]
                  }`,
                  "What happens on the Plotly graph if the first parameter slider increases?",
                  "Derive the comparative statics sign when autonomous parameters shift",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setChatInput(suggestion)}
                    className={`text-xs border hover:border-[#10b981] px-3 py-1.5 rounded transition-colors cursor-pointer ${bgNested}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {activeChatThread.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {activeChatThread.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded border text-xs sm:text-sm leading-relaxed ${
                        msg.role === "user"
                          ? `${bgNested} ml-8`
                          : isLightMode
                          ? "bg-white border-gray-200 mr-4"
                          : "bg-[#0a0a0a] border-[#222222] mr-4"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between text-[11px] ${mutedText} mb-1.5 font-mono`}
                      >
                        <span
                          className={
                            msg.role === "assistant"
                              ? "text-[#10b981] font-semibold"
                              : ""
                          }
                        >
                          {msg.role === "user"
                            ? "You"
                            : "CUET PG Economics Tutor (Topic-Scoped)"}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {msg.graphShiftSummary && (
                        <div className="mb-2 px-2.5 py-1 rounded bg-[#10b981]/15 border border-[#10b981]/40 text-xs text-[#10b981] font-mono">
                          <RichMathText
                            text={`Plotly Graph Updated: ${msg.graphShiftSummary}`}
                          />
                        </div>
                      )}

                      {msg.isRedirectedOutOfScope && (
                        <div className="mb-2 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-xs text-amber-400">
                          Topic Boundary Notice: Redirected to active sub-topic
                        </div>
                      )}

                      <div className="space-y-2">
                        {msg.text.split("\n\n").map((p, idx) => (
                          <p key={idx}>
                            <RichMathText text={p} />
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              <form
                onSubmit={handleSendChat}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about this specific topic or graph..."
                  className={`flex-1 border focus:border-[#10b981] rounded px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-colors ${bgNested}`}
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[#050505] font-semibold text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isChatLoading ? "Analyzing..." : "Ask Tutor"}</span>
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>

      {/* SHA-256 Profile Persistence Switcher Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className={`border rounded-lg max-w-md w-full p-6 space-y-4 ${bgSurface}`}
          >
            <div
              className={`flex items-center justify-between border-b ${borderCol} pb-3`}
            >
              <h3 className="text-base font-semibold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#10b981]" />
                <span>SHA-256 Study Profile Namespace</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className={`text-xs ${mutedText} hover:opacity-80`}
              >
                Close
              </button>
            </div>

            <p className={`text-xs ${bodyProseText} leading-relaxed`}>
              Enter your study passphrase to switch or restore your isolated{" "}
              <code className="text-[#10b981]">localStorage</code> workspace. Your input is hashed via{" "}
              <code className="font-mono">
                crypto.subtle.digest('SHA-256', ...)
              </code>{" "}
              into a 12-character hex ID (
              <code className="text-[#10b981]">cuet_coqp10_{profileId}</code>).
            </p>

            <form onSubmit={handleSwitchProfile} className="space-y-4">
              <div>
                <label className={`block text-xs ${mutedText} mb-1.5`}>
                  Profile Identifier / Passphrase
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter passphrase to hash via SHA-256..."
                  autoFocus
                  className={`w-full border focus:border-[#10b981] rounded px-3.5 py-2 text-xs outline-none ${bgNested}`}
                />
              </div>

              <div
                className={`border rounded p-3 text-xs space-y-1.5 ${bgNested}`}
              >
                <div className="flex justify-between">
                  <span className={mutedText}>Active Namespace:</span>
                  <span className="font-mono text-[#10b981]">
                    cuet_coqp10_{profileId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>Cached Study Notes:</span>
                  <span className="font-mono">
                    {cachedCount} / {totalSubtopicsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>Cached Plotly Models:</span>
                  <span className="font-mono">
                    {Object.keys(cachedModels).length} / {totalSubtopicsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>Saved Tutor Q&As:</span>
                  <span className="font-mono">{pinnedInlineTutor.length}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                  <span className={mutedText}>Gemini API Key:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#10b981]">
                      {geminiApiKey ? `${geminiApiKey.slice(0, 6)}...${geminiApiKey.slice(-4)}` : "None"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        handleClearApiKey();
                      }}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Clear Key
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className={`px-3.5 py-2 text-xs border rounded ${bgNested}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-[#050505] rounded transition-colors cursor-pointer"
                >
                  Apply SHA-256 Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
