import { GoogleGenAI, Type } from "@google/genai";
import {
  BlueprintMicroConcept,
  ExpandedMicroConceptChunk,
  RelatedGraphOption,
  YoutubeQueryItem,
} from "../data/syllabus";
import { PlotlyEconomicModel } from "../components/InteractiveEconLab";

function getClientGenAI(apiKey: string) {
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  const cleanKey = apiKey.trim();
  if (!cleanKey || cleanKey.length < 15) {
    throw new Error("Please enter a valid Gemini API key (starts with AIza...)");
  }

  // Quick validation call using gemini-3.8-flash
  try {
    const ai = getClientGenAI(cleanKey);
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Reply with 'OK' if active.",
    });
    return !!response.text;
  } catch (err: any) {
    console.error("API key validation failed:", err);
    throw new Error(err?.message || "Invalid API key or network error. Please verify your Gemini API key.");
  }
}

// 1A. Study Blueprint
export async function fetchStudyBlueprint(
  unit: string,
  chapter: string,
  subtopic: string,
  apiKey: string
) {
  // Try server proxy first if available
  try {
    const res = await fetch("/api/study-blueprint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic }),
    });

    // If endpoint exists and answered
    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate study blueprint.");
      return data;
    }
  } catch (err: any) {
    // If not a 404, but a 401 or real error from server, rethrow
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  // Client-side fallback for static deployment (GitHub Pages)
  const ai = getClientGenAI(apiKey);
  const prompt = `You are a warm, crystal-clear CUET PG Economics (COQP10) Mentor who uses the **Feynman Technique** to make graduate economics intuitive, memorable, and exam-friendly for stressed aspirants:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}

### STRICT PEDAGOGICAL GUARDRAILS (MANDATORY):
1. **THE "INTUITION FIRST" RULE (FEYNMAN TECHNIQUE):**
   - NEVER open "overview", a micro-concept, or an explanation with dense academic jargon or raw mathematical notation.
   - Always explain the core intuition in plain, simple everyday English first, using a relatable real-world analogy.
2. **TRANSLATE THE MATH:**
   - Retain exact KaTeX mathematical formulas ($...$), but NEVER use symbols without immediately defining what they mean in plain words right next to them.
3. **ACCESSIBLE "EDGE CASES" & "PYQ TRAPS" ("examTraps"):**
   - Structure EVERY item in "examTraps" with:
     "**The Trap:** Students often confuse [X] with [Y]..."
     "**The Reality:** Here is the simple difference: ..."
4. **BITE-SIZED & STRICTLY ENGLISH:**
   - Avoid cryptic, compressed academic prose. Strictly English only. Wrap Greek letters and math in inline LaTeX ($...$).
5. **"microConcepts":** Deconstruct "${subtopic}" into an ordered array of 4 bite-sized modules.
6. **"practiceQuestions" (EXHAUSTIVE MULTI-YEAR CUET PG PYQ ARCHIVE + CONCEPT MASTERY VERIFICATION):**
   - Generate **11 multiple-choice questions**:
     - Part 1 (First 8 items): category: "pyq", examTag across 2021-2025 ("CUET PG 2025 (COQP10) · PYQ", etc.), and conceptTested.
     - Part 2 (Next 3 items): category: "verification", examTag ("Concept Check #1 · Topic Verification", etc.), and conceptTested.
   - Each with 4 options, correctIndex (0-3), and intuitive solution.
7. **"isGraphCanonical":** True ONLY if standard textbook economic/statistical graphs genuinely exist for this exact subtopic.
8. **"relatedGraphs" (CONTEXTUAL CUET PG GRAPH MENU):**
   - If "isGraphCanonical" is true, return 3 to 4 distinct textbook economic models/graphs tested in CUET PG (COQP10) PYQs for "${subtopic}" (citing Varian, Froyen, Blanchard, Koutsoyiannis, Romer/Solow, Musgrave, or Gujarati).
   - If false, return [].`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          microConcepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                focusPrompt: { type: Type.STRING },
              },
              required: ["id", "title", "focusPrompt"],
            },
          },
          overview: { type: Type.STRING },
          examTraps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          practiceQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                examTag: { type: Type.STRING },
                conceptTested: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                solution: { type: Type.STRING },
              },
              required: [
                "category",
                "examTag",
                "conceptTested",
                "question",
                "options",
                "correctIndex",
                "solution",
              ],
            },
          },
          isGraphCanonical: { type: Type.BOOLEAN },
          relatedGraphs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                textbookReference: { type: Type.STRING },
                shortDescription: { type: Type.STRING },
                pyqFocus: { type: Type.STRING },
              },
              required: [
                "id",
                "title",
                "textbookReference",
                "shortDescription",
                "pyqFocus",
              ],
            },
          },
        },
        required: [
          "microConcepts",
          "overview",
          "examTraps",
          "practiceQuestions",
          "isGraphCanonical",
          "relatedGraphs",
        ],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty blueprint response from Gemini API");
  return JSON.parse(text.trim());
}

// 1B. Expand Micro-Concept Chunk
export async function fetchMicroConceptExpansion(params: {
  unit: string;
  chapter: string;
  subtopic: string;
  index: number;
  id: string;
  title: string;
  focusPrompt: string;
  apiKey: string;
}): Promise<ExpandedMicroConceptChunk> {
  const { unit, chapter, subtopic, index, id, title, focusPrompt, apiKey } = params;

  try {
    const res = await fetch("/api/expand-micro-concept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic, index, id, title, focusPrompt }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to expand micro-concept #${index + 1}`);
      return data;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  // Client-side fallback
  const ai = getClientGenAI(apiKey);
  const prompt = `You are a friendly, exam-focused CUET PG Economics (COQP10) Mentor expanding Module #${Number(index) + 1} using the **Feynman Technique**:
- Unit: ${unit}
- Chapter: ${chapter}
- Overarching Sub-topic: ${subtopic}
- Module to Expand: "${title}"
- Focus Directive: ${focusPrompt || "Explain the intuition first in plain English, then translate the exact mathematical formula."}

### STRICT PEDAGOGICAL GUARDRAILS:
1. INTUITION FIRST: Start with simple everyday English and a relatable analogy.
2. TRANSLATE THE MATH: In "derivation.explanation", start with "**Plain-English Translation:**" and define every symbol in plain words.
3. BITE-SIZED KEY POINTS: 2 short bullet points with memory hooks and inline LaTeX ($...$).
4. STRICTLY ENGLISH ONLY.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          deepExplanation: { type: Type.STRING },
          derivation: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              latex: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["title", "latex", "explanation"],
          },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["deepExplanation", "derivation", "keyPoints"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty expansion response");
  const parsed = JSON.parse(text.trim());
  return {
    index: Number(index) || 0,
    id: id || `mc_${index}`,
    title,
    ...parsed,
  };
}

// 2A. Contextual Graph Menu Discovery (CUET PG COQP10 Benchmark)
export async function fetchRelatedGraphs(
  unit: string,
  chapter: string,
  subtopic: string,
  apiKey: string
): Promise<{
  isGraphCanonical: boolean;
  message?: string;
  relatedGraphs: RelatedGraphOption[];
}> {
  try {
    const res = await fetch("/api/related-graphs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load contextual graph menu.");
      return data;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  // Client-side fallback for static deployment (GitHub Pages)
  const ai = getClientGenAI(apiKey);
  const prompt = `You are a Graduate Economics Professor and CUET PG Economics (COQP10) Past-Paper Specialist.
Evaluate the following lesson and identify all canonical textbook economic/statistical models or graphs that apply:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}

### STRICT CUET PG (COQP10) BENCHMARK RULES:
1. Determine whether canonical textbook economic or statistical graphs genuinely exist for "${subtopic}".
   - If NO standard graph applies, set "isGraphCanonical": false, "message": "No standard economic graph is required for this concept.", and "relatedGraphs": [].
2. If canonical graphs DO apply ("isGraphCanonical": true):
   - Return 3 to 5 distinct, clickable graph options in "relatedGraphs" that cover the exact geometric models, equilibrium shifts, and special cases tested in **CUET PG Economics (COQP10) PYQs (2021–2025)**.
   - Benchmark strictly against graduate textbooks: **Hal R. Varian**, **A. Koutsoyiannis**, **Richard Froyen / Olivier Blanchard / Dornbusch & Fischer**, **Solow / Romer**, **Musgrave**, **Salvatore / Krugman**, **Damodar Gujarati / Hogg & Craig**.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isGraphCanonical: { type: Type.BOOLEAN },
          message: { type: Type.STRING },
          relatedGraphs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                textbookReference: { type: Type.STRING },
                shortDescription: { type: Type.STRING },
                pyqFocus: { type: Type.STRING },
              },
              required: [
                "id",
                "title",
                "textbookReference",
                "shortDescription",
                "pyqFocus",
              ],
            },
          },
        },
        required: ["isGraphCanonical", "relatedGraphs"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Related Graphs menu generator");
  return JSON.parse(text.trim());
}

// 2B. On-Demand Selected Economic Graph Generator
export async function fetchPlotlyModel(
  unit: string,
  chapter: string,
  subtopic: string,
  apiKey: string,
  graphOption?: RelatedGraphOption
): Promise<PlotlyEconomicModel> {
  try {
    const res = await fetch("/api/generate-plotly-model", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic, graphOption }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate Plotly model.");
      return data;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  // Client-side fallback
  const NEON_PALETTE = ["#00ff9d", "#00e5ff", "#ffbe0b", "#ff2a85", "#a855f7", "#38bdf8"];
  const ai = getClientGenAI(apiKey);
  const selectedModelDirective = graphOption
    ? `SELECTED GRAPH OPTION FROM MENU (PLOT ONLY THIS SPECIFIC MODEL):
- Graph ID: "${graphOption.id}"
- Selected Graph Title: "${graphOption.title}"
- Authoritative Textbook Benchmark: "${graphOption.textbookReference}"
- Target Description: "${graphOption.shortDescription}"
- CUET PG (COQP10) PYQ Focus: "${graphOption.pyqFocus}"`
    : `Plot the primary canonical textbook economic graph tested in CUET PG (COQP10) for "${subtopic}".`;

  const prompt = `You are a rigorous Graduate Economics Professor for CUET PG Economics (COQP10).
Evaluate: Unit "${unit}", Chapter "${chapter}", Sub-topic "${subtopic}".
${selectedModelDirective}

1. STRICT NECESSITY GATEWAY:
- If NO standard graph applies and no graphOption was requested, set isGraphCanonical: false, message: "No standard economic graph is required for this concept."
2. CUET PG (COQP10) TEXTBOOK ALIGNMENT & EQUILIBRIUM TRACES:
- Reflect the exact variables, functional forms, and equilibrium intersections from Varian, Froyen, Blanchard, Koutsoyiannis, Romer/Solow, Musgrave, or Gujarati.
- Populate "equilibriumPoints" with 1 to 3 exact coordinates (e.g., E₀, E₁) on the curves.
3. MANDATORY EMBEDDED EXPLANATION ("embeddedExplanation"):
- Provide 4 detailed sections with inline LaTeX ($...$): "axesAndVariables", "curveMovements", "equilibriumAndShifts", and "economicSignificance".
4. COLORS: Use high contrast neon hex colors: ${NEON_PALETTE.join(", ")}. Strictly English only.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isGraphCanonical: { type: Type.BOOLEAN },
          message: { type: Type.STRING },
          graphId: { type: Type.STRING },
          modelReference: { type: Type.STRING },
          pyqBenchmark: { type: Type.STRING },
          chartType: { type: Type.STRING },
          hasComparativeStaticsSliders: { type: Type.BOOLEAN },
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          xAxisLabel: { type: Type.STRING },
          yAxisLabel: { type: Type.STRING },
          xMin: { type: Type.NUMBER },
          xMax: { type: Type.NUMBER },
          equilibriumLabel: { type: Type.STRING },
          equilibriumPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                color: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["label", "x", "y"],
            },
          },
          parameterSliders: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
                step: { type: Type.NUMBER },
                defaultValue: { type: Type.NUMBER },
                unit: { type: Type.STRING },
              },
              required: ["id", "label", "min", "max", "step", "defaultValue"],
            },
          },
          curves: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                formulaLatex: { type: Type.STRING },
                color: { type: Type.STRING },
                lineStyle: { type: Type.STRING },
                traceType: { type: Type.STRING },
                expressionType: { type: Type.STRING },
                xPoints: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                yPoints: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                baseIntercept: { type: Type.NUMBER },
                slope: { type: Type.NUMBER },
                curvature: { type: Type.NUMBER },
                p1Weight: { type: Type.NUMBER },
                p2Weight: { type: Type.NUMBER },
                p3Weight: { type: Type.NUMBER },
              },
              required: ["id", "name", "formulaLatex", "color", "lineStyle", "expressionType"],
            },
          },
          comparativeStaticsNote: { type: Type.STRING },
          embeddedExplanation: {
            type: Type.OBJECT,
            properties: {
              axesAndVariables: { type: Type.STRING },
              curveMovements: { type: Type.STRING },
              equilibriumAndShifts: { type: Type.STRING },
              economicSignificance: { type: Type.STRING },
            },
            required: [
              "axesAndVariables",
              "curveMovements",
              "equilibriumAndShifts",
              "economicSignificance",
            ],
          },
        },
        required: ["isGraphCanonical"],
      },
    },
  });

  const parsed = JSON.parse(response.text?.trim() || "{}");
  if (!parsed.isGraphCanonical || !Array.isArray(parsed.curves) || parsed.curves.length === 0) {
    return {
      isGraphCanonical: false,
      message: "No standard economic graph is required for this concept.",
    };
  }

  const sanitizedCurves = parsed.curves.map((c: any, idx: number) => ({
    ...c,
    color: typeof c.color === "string" && c.color.startsWith("#") ? c.color : NEON_PALETTE[idx % NEON_PALETTE.length],
  }));

  const sliders = parsed.hasComparativeStaticsSliders && Array.isArray(parsed.parameterSliders) ? parsed.parameterSliders : [];

  return {
    ...parsed,
    isGraphCanonical: true,
    graphId: graphOption?.id || parsed.graphId || "primary_model",
    modelReference:
      parsed.modelReference ||
      graphOption?.textbookReference ||
      `Standard Graduate Economics Model (${subtopic})`,
    pyqBenchmark:
      parsed.pyqBenchmark ||
      graphOption?.pyqFocus ||
      "CUET PG Economics (COQP10) Benchmark",
    chartType: parsed.chartType || "line",
    hasComparativeStaticsSliders: sliders.length > 0,
    parameterSliders: sliders,
    curves: sanitizedCurves,
  };
}

// 3. Concept Videos
export async function fetchConceptVideos(
  unit: string,
  chapter: string,
  subtopic: string,
  apiKey: string
): Promise<YoutubeQueryItem[]> {
  try {
    const res = await fetch("/api/concept-videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate concept videos.");
      return data.youtubeQueries || [];
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  const ai = getClientGenAI(apiKey);
  const prompt = `Curate exactly 3 highly targeted YouTube search queries for CUET PG Economics (COQP10):
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}
Strictly English only. Surface top university lectures and mathematical proofs.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          youtubeQueries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                channelHint: { type: Type.STRING },
                searchQuery: { type: Type.STRING },
                durationFocus: { type: Type.STRING },
              },
              required: ["title", "channelHint", "searchQuery", "durationFocus"],
            },
          },
        },
        required: ["youtubeQueries"],
      },
    },
  });

  const parsed = JSON.parse(response.text?.trim() || "{}");
  return parsed.youtubeQueries || [];
}

// 4. Sub-topic PYQs & Concept Verification
export async function fetchSubtopicPyqs(
  unit: string,
  chapter: string,
  subtopic: string,
  searchQuery: string,
  apiKey: string
) {
  try {
    const res = await fetch("/api/subtopic-pyqs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic, searchQuery }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sub-topic PYQs.");
      return data.questions || [];
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  const ai = getClientGenAI(apiKey);
  const filterInstruction = searchQuery
    ? `Focus on questions matching: "${searchQuery}" within "${subtopic}".`
    : `Cover ALL CUET PG & CUCET exam questions from 2021 to 2025 across "${subtopic}".`;

  const prompt = `CUET PG Economics (COQP10) Sub-Topic PYQs & Verification Questions:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}
- Focus: ${filterInstruction}

Generate 11 questions:
1. Part 1 (8 questions, category: "pyq"): Spanning 2021-2025 exam years with examTag and conceptTested.
2. Part 2 (3 questions, category: "verification"): Concept Check #1, #2, #3 verification tests.
Each with 4 options, correctIndex, and Feynman step-by-step solution.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                examTag: { type: Type.STRING },
                conceptTested: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                solution: { type: Type.STRING },
              },
              required: [
                "category",
                "examTag",
                "conceptTested",
                "question",
                "options",
                "correctIndex",
                "solution",
              ],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  const parsed = JSON.parse(response.text?.trim() || "{}");
  return parsed.questions || [];
}

// 5. Inline Selection Tutor
export async function fetchInlineTutor(params: {
  unit: string;
  chapter: string;
  subtopic: string;
  selectedText: string;
  question: string;
  apiKey: string;
}): Promise<string> {
  const { unit, chapter, subtopic, selectedText, question, apiKey } = params;

  try {
    const res = await fetch("/api/inline-tutor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic, selectedText, question }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process inline tutor question.");
      return data.answer;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  const ai = getClientGenAI(apiKey);
  const systemInstruction = `You are an expert CUET PG Economics tutor. You must ONLY answer questions directly related to the active topic: ${subtopic}.
- INTUITION FIRST: Explain in plain English first using a relatable analogy.
- TRANSLATE THE MATH: Define symbols in plain words. Render Greek letters and formulas in $...$. Strictly English only.`;

  const prompt = `Highlighted Text / Formula:
"""
${selectedText}
"""

Student's Question:
"${question}"`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: { systemInstruction },
  });

  return response.text || "Unable to generate an explanation for this selection.";
}

// 6. Persistent Vision Screen Cropper Tutor
export async function fetchVisionTutor(params: {
  unit: string;
  chapter: string;
  subtopic: string;
  imageBase64: string;
  question: string;
  apiKey: string;
}): Promise<string> {
  const { unit, chapter, subtopic, imageBase64, question, apiKey } = params;

  try {
    const res = await fetch("/api/vision-tutor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({ unit, chapter, subtopic, imageBase64, question }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze cropped screenshot.");
      return data.answer;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  const ai = getClientGenAI(apiKey);
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

  const systemInstruction = `You are an expert CUET PG Economics tutor. Inspect the cropped region and answer strictly for ${subtopic}. Intuition first, translate any math, strictly English with LaTeX.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: cleanBase64 } },
        { text: `Active Topic: ${subtopic}\nQuestion: "${question}"` },
      ],
    },
    config: { systemInstruction },
  });

  return response.text || "Unable to analyze the cropped region.";
}

// 7. Graph & Concept Q&A Chat
export async function fetchChat(params: {
  unit: string;
  chapter: string;
  subtopic: string;
  question: string;
  history: any[];
  currentGraphState: any;
  apiKey: string;
}) {
  const { unit, chapter, subtopic, question, history, currentGraphState, apiKey } = params;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-api-key": apiKey,
      },
      body: JSON.stringify({
        unit,
        chapter,
        subtopic,
        question,
        history,
        currentGraphState,
      }),
    });

    if (res.status !== 404) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process chat question.");
      return data;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("401") || err.message.includes("API key"))) {
      throw err;
    }
  }

  const ai = getClientGenAI(apiKey);
  const historyContext =
    Array.isArray(history) && history.length > 0
      ? history
          .slice(-6)
          .map((m: { role: string; text: string }) => `${m.role === "user" ? "Student" : "Mentor"}: ${m.text}`)
          .join("\n\n")
      : "";

  const systemInstruction = `You are an expert CUET PG Economics tutor. Only answer questions related to: ${subtopic}.
- INTUITION FIRST: Plain English first with relatable analogies.
- TRANSLATE THE MATH: Render symbols with inline $...$ or $$...$$.
- SLIDER ADJUSTMENTS: If user asks to shift a slider or parameter, populate sliderAdjustments.`;

  const prompt = `${historyContext ? `Previous Conversation:\n${historyContext}\n\n` : ""}Student's Question: ${question}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          isRedirectedOutOfScope: { type: Type.BOOLEAN },
          sliderAdjustments: {
            type: Type.OBJECT,
            properties: {
              applied: { type: Type.BOOLEAN },
              summaryLabel: { type: Type.STRING },
              p1: { type: Type.NUMBER },
              p2: { type: Type.NUMBER },
              p3: { type: Type.NUMBER },
            },
            required: ["applied"],
          },
        },
        required: ["answer", "isRedirectedOutOfScope"],
      },
    },
  });

  return JSON.parse(response.text?.trim() || "{}");
}
