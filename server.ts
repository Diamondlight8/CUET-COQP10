import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

function extractApiKey(req: express.Request): string | null {
  const headerKey = req.headers["x-gemini-api-key"];
  if (typeof headerKey === "string" && headerKey.trim()) {
    return headerKey.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerKey = authHeader.slice(7).trim();
    if (bearerKey) return bearerKey;
  }
  if (req.body && typeof req.body.apiKey === "string" && req.body.apiKey.trim()) {
    return req.body.apiKey.trim();
  }
  return null;
}

function getGenAIClient(apiKeyParam?: string | null) {
  const apiKey = apiKeyParam?.trim();
  if (!apiKey) {
    throw new Error("No Gemini API key provided. Please enter your API key in the Gatekeeper screen.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1A. Pass 1 ("Blueprint"): Generates the Ordered Micro-Concept Blueprint, Overview, Edge Cases, Practice MCQs & Strict Necessity Graph Gateway
app.post("/api/study-blueprint", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic } = req.body;
    if (!subtopic) {
      res.status(400).json({ error: "Subtopic is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const prompt = `You are a warm, crystal-clear CUET PG Economics (COQP10) Mentor who uses the **Feynman Technique** to make graduate economics intuitive, memorable, and exam-friendly for stressed aspirants:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}

### STRICT PEDAGOGICAL GUARDRAILS (MANDATORY):
1. **THE "INTUITION FIRST" RULE (FEYNMAN TECHNIQUE):**
   - NEVER open "overview", a micro-concept, or an explanation with dense academic jargon or raw mathematical notation.
   - Always explain the core intuition in plain, simple everyday English first, using a relatable real-world analogy (e.g., *"Think of utility like measuring temperature. Whether you use Celsius or Fahrenheit (a monotonic transformation), the reality of which day is hotter (the preference ranking) doesn't change."*).
2. **TRANSLATE THE MATH:**
   - Retain exact KaTeX mathematical formulas ($...$), but NEVER use symbols like $\\lambda$, $U_{11}$, $MRS$, $\\sigma$, or $\\Delta Y$ without immediately defining what they mean in plain words right next to them (e.g., *"where $\\lambda$ (the Lagrange multiplier) simply measures how much extra satisfaction you get from one more Rupee of budget"*).
3. **ACCESSIBLE "EDGE CASES" & "PYQ TRAPS" ("examTraps"):**
   - Write all 3 items in "examTraps" as practical exam advice from a mentor.
   - Structure EVERY item in "examTraps" with this exact two-line format:
     "**The Trap:** Students often confuse [X] with [Y]..."
     "**The Reality:** Here is the simple difference: ..."
4. **BITE-SIZED & STRICTLY ENGLISH:**
   - Avoid cryptic, compressed academic prose. Break ideas into short, punchy, easy-to-memorize sentences.
   - Strictly English only (no Hindi, no exam marking scheme details).
   - Always wrap mathematical symbols and Greek letters ($\\Delta$, $\\alpha$, $\\beta$, $\\lambda$, $\\pi$, $\\sigma$, $\\mu$, $\\theta$, $\\eta$, $\\varepsilon$) in inline LaTeX ($...$).
5. **"microConcepts":** Deconstruct "${subtopic}" into an ordered array of 4 bite-sized, intuitive modules (from everyday intuition & core definitions to step-by-step math translations and comparative statics).
6. **"practiceQuestions" (EXHAUSTIVE MULTI-YEAR CUET PG PYQ ARCHIVE + CONCEPT MASTERY VERIFICATION):**
   - Generate **11 multiple-choice questions** divided into two parts so the student gets a complete, zero-blind-spot picture of everything asked from "${subtopic}" in CUET PG:
     - **Part 1 (First 8 items — Complete Multi-Year Sub-Topic PYQ Bank, 2021–2025):** Set \`category: "pyq"\`, \`examTag\` spanning **every exam cycle** (\`"CUET PG 2025 (COQP10) · PYQ"\`, \`"CUET PG 2024 (COQP10) · PYQ"\`, \`"CUET PG 2023 (COQP10) · PYQ"\`, \`"CUET PG 2022 (COQP10) · PYQ"\`, and \`"CUET PG 2021 (CUCET) · PYQ"\`), and \`conceptTested\`. Leave NOTHING out—cover every distinct formula, numerical type, graphical property, and theoretical statement ever tested from "${subtopic}" in CUET PG Economics.
     - **Part 2 (Next 3 items — Concept Mastery Verification):** Set \`category: "verification"\`, \`examTag\` (\`"Concept Check #1 · Topic Verification"\`, \`"Concept Check #2 · Topic Verification"\`, \`"Concept Check #3 · Topic Verification"\`), and \`conceptTested\`. These must rigorously verify that the candidate has finished studying and mastered all core concepts in "${subtopic}".
   - Each question must have 4 options, \`correctIndex\` (0-3), and an intuitive step-by-step \`solution\` that translates the math clearly.
8. **"isGraphCanonical":** Set true ONLY if standard textbook economic or statistical graphs genuinely exist for this exact sub-topic; set false otherwise.
9. **"relatedGraphs" (CONTEXTUAL CUET PG GRAPH MENU):**
   - If "isGraphCanonical" is true, return 3 to 4 distinct, canonical textbook economic/statistical graphs that apply to "${subtopic}" and are frequently tested in **CUET PG Economics (COQP10) PYQs** (citing authoritative textbooks like Hal Varian, Richard Froyen, Olivier Blanchard, A. Koutsoyiannis, Romer/Solow, Musgrave, or Gujarati).
   - Each item must have: "id" (unique slug), "title" (model/graph name), "textbookReference" (author & textbook), "shortDescription" (what curves, shifts, and equilibrium points the graph plots), and "pyqFocus" (how CUET PG PYQs test this specific graph).
   - If "isGraphCanonical" is false, return an empty array [].`;

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
    if (!text) {
      throw new Error("Empty blueprint response from Gemini model");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error generating study blueprint:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate study blueprint.",
    });
  }
});

// 1B. Pass 2 ("Concurrent Micro-Concept Expansion"): Expands a single Micro-Concept Chunk in parallel
app.post("/api/expand-micro-concept", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic, index, id, title, focusPrompt } = req.body;
    if (!subtopic || !title) {
      res.status(400).json({ error: "Subtopic and micro-concept title are required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const prompt = `You are a friendly, exam-focused CUET PG Economics (COQP10) Mentor expanding Module #${Number(index) + 1} using the **Feynman Technique**:
- Unit: ${unit}
- Chapter: ${chapter}
- Overarching Sub-topic: ${subtopic}
- Module to Expand: "${title}"
- Focus Directive: ${focusPrompt || "Explain the intuition first in plain English, then translate the exact mathematical formula."}

### STRICT PEDAGOGICAL GUARDRAILS (MANDATORY):
1. **THE "INTUITION FIRST" RULE (FEYNMAN TECHNIQUE):**
   - In "deepExplanation", NEVER start with dense academic jargon or raw formulas.
   - Paragraph 1 MUST start with a simple, everyday English explanation and a relatable real-world analogy so a stressed student immediately grasps *why* this concept works.
   - Paragraph 2 connects that everyday intuition to how it is tested on the CUET PG exam.
2. **TRANSLATE THE MATH ("derivation"):**
   - Retain the exact KaTeX mathematical formula in "derivation.latex" (without surrounding $$ delimiters).
   - In "derivation.explanation", start with "**Plain-English Translation:**" and define every single symbol in simple words (e.g., "$\\lambda$ (how much extra satisfaction you get from one more Rupee of budget)", "$MRS$ (how much of Good Y you happily give up for 1 more unit of Good X)").
3. **BITE-SIZED KEY POINTS ("keyPoints"):**
   - Write 2 short, punchy, easy-to-memorize bullet points for "${title}". Start each bullet with a bold memory hook (e.g., "**The Midpoint Rule:** ..."), explain in plain English first, and include the exact inline LaTeX ($...$).
4. **STRICTLY ENGLISH & FLAWLESS LATEX:**
   - Never use Hindi or mention exam marking schemes. Always wrap Greek letters ($\\Delta$, $\\alpha$, $\\beta$, $\\lambda$, $\\pi$, $\\sigma$, $\\mu$, $\\theta$, $\\eta$, $\\varepsilon$) and math variables in inline LaTeX ($...$).`;

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
    if (!text) {
      throw new Error("Empty micro-concept expansion response");
    }

    const parsed = JSON.parse(text.trim());
    res.json({
      index: Number(index) || 0,
      id: id || `mc_${index}`,
      title,
      ...parsed,
    });
  } catch (error: any) {
    console.error("Error expanding micro-concept:", error);
    res.status(500).json({
      error: error?.message || "Failed to expand micro-concept.",
    });
  }
});

// 1C. Single-Call Study Notes Fallback Endpoint
app.post("/api/study-notes", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic } = req.body;
    if (!subtopic) {
      res.status(400).json({ error: "Subtopic is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const prompt = `You are a warm, crystal-clear CUET PG Economics (COQP10) Mentor who uses the **Feynman Technique** to make graduate economics intuitive, memorable, and exam-friendly:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}

### STRICT PEDAGOGICAL GUARDRAILS:
1. **THE "INTUITION FIRST" RULE (FEYNMAN TECHNIQUE):**
   - Never introduce a core proposition, edge case, or "overview" with dense academic jargon or raw mathematical notation.
   - Always explain the core intuition in plain, simple English first using a relatable real-world analogy.
2. **TRANSLATE THE MATH ("derivations"):**
   - Retain exact KaTeX derivations (2 to 4 equations), but in each "explanation", pair the equation with a plain-English translation that defines every symbol (like $\\lambda$, $U_{11}$, $MRS$) in everyday terms.
3. **ACCESSIBLE "EDGE CASES" & "PYQ TRAPS" ("examTraps"):**
   - Structure all 3 items in "examTraps" as practical mentor advice using:
     "**The Trap:** Students often confuse X with Y..."
     "**The Reality:** Here is the simple difference..."
4. **BITE-SIZED KEY POINTS ("keyPoints"):**
   - 6 short, bite-sized, easy-to-memorize bullet points starting with a bold memory hook, plain English intuition, and inline LaTeX ($...$).
5. **STRICTLY ENGLISH ONLY & FLAWLESS LATEX:** No Hindi, no marking scheme details, all Greek letters and math inside $...$.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: "Rigorous conceptual synthesis strictly in English with inline $...$ LaTeX.",
            },
            derivations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  latex: {
                    type: Type.STRING,
                    description: "Raw LaTeX math expression for KaTeX display mode (no $$ wrappers).",
                  },
                  explanation: { type: Type.STRING },
                },
                required: ["title", "latex", "explanation"],
              },
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "High-yield analytical bullet points strictly in English with inline $...$ LaTeX.",
            },
            examTraps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Common analytical pitfalls and theoretical edge cases with inline $...$ LaTeX.",
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
            isGraphCanonical: {
              type: Type.BOOLEAN,
              description: "True if a canonical textbook economic graph exists for this sub-topic; false otherwise.",
            },
          },
          required: [
            "overview",
            "derivations",
            "keyPoints",
            "examTraps",
            "practiceQuestions",
            "isGraphCanonical",
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini model");
    }

    const parsed = JSON.parse(text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating study notes:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate study notes.",
    });
  }
});

// 1D. On-Demand Sub-Topic PYQ Search & Concept Mastery Verification Generator
app.post("/api/subtopic-pyqs", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic, searchQuery } = req.body;
    if (!subtopic) {
      res.status(400).json({ error: "Subtopic is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);
    const filterInstruction = searchQuery
      ? `Focus specifically on questions matching the user's search filter: "${searchQuery}" within "${subtopic}".`
      : `Exhaustively cover ALL CUET PG (COQP10) and CUCET exam question patterns (2021, 2022, 2023, 2024, 2025) across every sub-concept in "${subtopic}" so that nothing is left out.`;

    const prompt = `You are a CUET PG Economics (COQP10) Past-Paper Archivist and Concept Verification Examiner.
Generate an **exhaustive, complete set of Sub-Topic PYQs (2021–2025)** and **Concept Mastery Verification Questions** strictly for:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}
- Search / Focus Filter: ${filterInstruction}

### MANDATORY STRUCTURE (11 QUESTIONS TOTAL — LEAVE NO SUB-CONCEPT BEHIND):
1. **Part 1 — Complete Multi-Year Sub-Topic PYQ Archive (8 Questions with \`category: "pyq"\`):**
   - Must cover every distinct question pattern asked in CUET PG Economics (COQP10) and CUCET from 2021 to 2025 for "${subtopic}" (numerical problems, formula identifications, curve slopes/shapes, theoretical propositions, and assertion-reason / statement questions).
   - Include a clear \`examTag\` spanning all exam years: \`"CUET PG 2025 (COQP10) · PYQ"\`, \`"CUET PG 2024 (COQP10) · PYQ"\`, \`"CUET PG 2023 (COQP10) · PYQ"\`, \`"CUET PG 2022 (COQP10) · PYQ"\`, and \`"CUET PG 2021 (CUCET) · PYQ"\`.
   - Include \`conceptTested\` naming the exact formula, theorem, or property tested so the student sees the complete blueprint of what comes from this topic.
2. **Part 2 — Concept Mastery Verification Questions (3 Questions with \`category: "verification"\`):**
   - Designed to verify that the candidate has finished studying "${subtopic}" and truly understands both the plain-English intuition and mathematical application.
   - Include \`examTag\` (\`"Concept Check #1 · Topic Verification"\`, \`"Concept Check #2 · Topic Verification"\`, \`"Concept Check #3 · Topic Verification"\`) and \`conceptTested\`.
3. **FEYNMAN SOLUTION WALKTHROUGHS:**
   - Every \`solution\` must explain the intuition in plain English first and translate any math step-by-step using inline LaTeX ($...$). Strictly English only.`;

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

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Sub-Topic PYQ generator");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error generating subtopic PYQs:", error);
    res.status(500).json({
      error: error?.message || "Failed to load sub-topic PYQs and verification checks.",
    });
  }
});

// 2A. Contextual Graph Menu Discovery Endpoint (CUET PG COQP10 Benchmark)
app.post("/api/related-graphs", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic } = req.body;
    if (!subtopic) {
      res.status(400).json({ error: "Subtopic is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const prompt = `You are a Graduate Economics Professor and CUET PG Economics (COQP10) Past-Paper Specialist.
Evaluate the following lesson and identify all canonical textbook economic/statistical models or graphs that apply:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}

### STRICT CUET PG (COQP10) BENCHMARK RULES:
1. Determine whether canonical textbook economic or statistical graphs genuinely exist for "${subtopic}".
   - If NO standard graph applies (e.g., purely historical chronology, committee recommendations, banking acts), set "isGraphCanonical": false, "message": "No standard economic graph is required for this concept.", and "relatedGraphs": [].
2. If canonical graphs DO apply ("isGraphCanonical": true):
   - Return 3 to 5 distinct, clickable graph options in "relatedGraphs" that cover the exact geometric models, equilibrium shifts, and special cases tested in **CUET PG Economics (COQP10) PYQs (2021–2025)**.
   - Benchmark strictly against graduate textbooks: **Hal R. Varian** (Microeconomics), **A. Koutsoyiannis** (Market Structure), **Richard Froyen / Olivier Blanchard / Dornbusch & Fischer** (Macroeconomics IS-LM, AD-AS, Mundell-Fleming), **Solow / Romer** (Growth), **Musgrave** (Public Finance), **Salvatore / Krugman** (Trade), **Damodar Gujarati / Hogg & Craig** (Econometrics & Statistics).
   - Each option MUST include:
     - "id": unique snake_case identifier (e.g., "graph_slutsky_decomposition")
     - "title": Clear, specific model title (e.g., "Slutsky vs. Hicksian Price Effect Decomposition")
     - "textbookReference": Author & textbook chapter/model citation
     - "shortDescription": 1–2 sentences describing the exact curves, axes, and equilibrium shifts plotted in this graph (with inline $...$ LaTeX where helpful)
     - "pyqFocus": Specific CUET PG (COQP10) PYQ concept or question pattern tested from this graph.`;

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
    if (!text) {
      throw new Error("Empty response from Related Graphs menu generator");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error generating related graphs menu:", error);
    res.status(500).json({
      error: error?.message || "Failed to load contextual graph menu.",
    });
  }
});

// 2B. On-Demand Selected Economic Graph Generator with Embedded Explanations & Detailed Economic Traces
app.post("/api/generate-plotly-model", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic, graphOption } = req.body;
    if (!subtopic) {
      res.status(400).json({ error: "Subtopic is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const NEON_PALETTE = ["#00ff9d", "#00e5ff", "#ffbe0b", "#ff2a85", "#a855f7", "#38bdf8"];

    const selectedModelDirective = graphOption
      ? `SELECTED GRAPH OPTION FROM MENU (PLOT ONLY THIS SPECIFIC MODEL):
- Graph ID: "${graphOption.id}"
- Selected Graph Title: "${graphOption.title}"
- Authoritative Textbook Benchmark: "${graphOption.textbookReference}"
- Target Description: "${graphOption.shortDescription}"
- CUET PG (COQP10) PYQ Focus: "${graphOption.pyqFocus}"`
      : `Plot the primary canonical textbook economic graph tested in CUET PG (COQP10) for "${subtopic}".`;

    const prompt = `You are a rigorous Graduate Economics Professor and Quantitative Textbook Author for CUET PG Economics (COQP10).

Construct a mathematically exact, textbook-grade Plotly.js specification and detailed embedded explanation for:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}
${selectedModelDirective}

### STEP 1: THE "STRICT NECESSITY" GATEWAY
- If "${subtopic}" has NO canonical economic/statistical graph AND no specific graphOption was requested, set "isGraphCanonical": false and "message": "No standard economic graph is required for this concept."
- Whenever a valid economic/statistical model applies (or when graphOption is provided), set "isGraphCanonical": true.

### STEP 2: CUET PG (COQP10) STRICT ALIGNMENT & DETAILED ECONOMIC TRACES
- **Textbook Fidelity**: Reflect the exact complexity, variables, and functional forms from standard CUET PG references (Hal Varian, Richard Froyen, Olivier Blanchard, A. Koutsoyiannis, Romer/Solow, Musgrave, Gujarati).
- **Curve Shifts & Intersections**:
  - Include 2 to 4 curves in "curves" so the student clearly sees the equilibrium intersection (and, where relevant, both the initial baseline curve in "solid" style and a shifted comparative-statics curve in "dash" style, e.g., $IS_0$ and $IS_1$, or Budget Line $BL_0$, Pivoted $BL_1$, and Slutsky/Hicksian compensated line).
  - Populate "equilibriumPoints" with 1 to 3 exact coordinate markers (e.g., \`{ label: "E₀", x: 5, y: 10, color: "#00ff9d" }\`, \`{ label: "E₁", x: 7, y: 12, color: "#ffbe0b" }\`) that lie precisely on the plotted curves! The frontend automatically draws dashed drop-lines from each point to the X and Y axes.

### STEP 3: CURVE EVALUATION MODES
Each item in "curves" can be defined using EITHER:
1. **Explicit Textbook Coordinates ("expressionType": "explicit_points"):**
   - Provide exact arrays "xPoints" (numbers) and "yPoints" (numbers) of equal length (between 5 and 25 points) that trace the exact textbook curve, kinked line, U-shaped cost curve, or equilibrium schedule.
2. **Parametric Textbook Equations (evaluated across $x \\in [xMin, xMax]$):**
   - "linear": $y(x) = (\\text{baseIntercept} + \\text{p1Weight}\\cdot p_1 + \\text{p2Weight}\\cdot p_2 + \\text{p3Weight}\\cdot p_3) + \\text{slope}\\cdot x$
   - "quadratic": $y(x) = (\\text{baseIntercept} + \\text{p1Weight}\\cdot p_1 + \\text{p2Weight}\\cdot p_2) + \\text{slope}\\cdot x + \\text{curvature}\\cdot x^2$
   - "hyperbola": $y(x) = \\frac{\\text{baseIntercept} + \\text{p1Weight}\\cdot p_1 + \\text{p2Weight}\\cdot p_2}{x + 0.35} + \\text{slope}\\cdot x$
   - "concave_power": $y(x) = (\\text{baseIntercept} + \\text{p1Weight}\\cdot p_1)\\cdot x^{0.5} + \\text{slope}\\cdot x$
   - "bell_curve": $y(x) = \\text{baseIntercept} \\cdot \\exp\\left(-\\frac{(x - (\\text{slope} + \\text{p1Weight}\\cdot p_1))^2}{2\\cdot \\max(0.35, \\text{curvature} + \\text{p2Weight}\\cdot p_2)^2}\\right)$

### STEP 4: MANDATORY EMBEDDED EXPLANATION ("embeddedExplanation")
Provide a comprehensive, 4-part structured explanation right alongside the graph using inline LaTeX ($...$):
1. **"axesAndVariables"**: Explain what is measured on the horizontal ($X$) and vertical ($Y$) axes, the economic meaning of the intercepts, and all variables in the equations.
2. **"curveMovements"**: Break down the slope ($\\frac{dY}{dX}$), elasticity, concavity/convexity, or kink of each plotted curve and why it moves the way it does.
3. **"equilibriumAndShifts"**: Explain the exact equilibrium condition at $E_0$, how the curve shift moves equilibrium to $E_1$ (comparative statics), and what the dashed axis projections show.
4. **"economicSignificance"**: Explain the deeper economic intuition and exactly how **CUET PG Economics (COQP10) PYQs** test this model (common exam traps, slope comparisons, and numerical properties).

### STYLING & LANGUAGE RULES:
- Assign high-contrast neon hex colors to curves from: ${NEON_PALETTE.join(", ")}.
- For Plotly canvas axis titles ("xAxisLabel" and "yAxisLabel") and curve "name", use clean standard text and Unicode symbols (e.g., "Quantity of Good X (X₁)", "Real Output (Y)", "Interest Rate (r)") without raw LaTeX backslashes.
- Reserve LaTeX backslashes for "formulaLatex" and wrap all math inside "embeddedExplanation", "subtitle", and "comparativeStaticsNote" in inline $...$ delimiters. Strictly English only.`;

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
                  xPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                  },
                  yPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                  },
                  baseIntercept: { type: Type.NUMBER },
                  slope: { type: Type.NUMBER },
                  curvature: { type: Type.NUMBER },
                  p1Weight: { type: Type.NUMBER },
                  p2Weight: { type: Type.NUMBER },
                  p3Weight: { type: Type.NUMBER },
                },
                required: [
                  "id",
                  "name",
                  "formulaLatex",
                  "color",
                  "lineStyle",
                  "expressionType",
                ],
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

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response from Gemini model");
    }

    const parsed = JSON.parse(rawText.trim());

    if (
      parsed.isGraphCanonical === false ||
      !Array.isArray(parsed.curves) ||
      parsed.curves.length === 0
    ) {
      res.json({
        isGraphCanonical: false,
        message: "No standard economic graph is required for this concept.",
      });
      return;
    }

    const sanitizedCurves = parsed.curves.map((c: any, idx: number) => ({
      ...c,
      color:
        typeof c.color === "string" && c.color.startsWith("#")
          ? c.color
          : NEON_PALETTE[idx % NEON_PALETTE.length],
    }));

    const sliders =
      parsed.hasComparativeStaticsSliders && Array.isArray(parsed.parameterSliders)
        ? parsed.parameterSliders
        : [];

    res.json({
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
    });
  } catch (error: any) {
    console.error("Error generating Plotly model:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate interactive model.",
    });
  }
});

// 3. Smart YouTube Concept Caching Endpoint
app.post("/api/concept-videos", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic } = req.body;
    if (!subtopic) {
      res.status(400).json({ error: "Subtopic is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const prompt = `You are a graduate Economics faculty curator for CUET PG Economics (COQP10).
Generate exactly 3 highly targeted YouTube search queries specifically targeting the most difficult mathematical derivations, graphical comparative statics, or theoretical nuances of this sub-topic:
- Unit: ${unit}
- Chapter: ${chapter}
- Sub-topic: ${subtopic}

Strictly English only. Make each searchQuery specific enough to surface top university lectures, mathematical proofs, and advanced micro/macro/econometrics walkthroughs.`;

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

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response from Gemini model");
    }

    const parsed = JSON.parse(rawText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating concept videos:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate concept video queries.",
    });
  }
});

// 4. Contextual Inline Text & Formula Tutor (Strict Context Boundary)
app.post("/api/inline-tutor", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic, selectedText, question } = req.body;
    if (!selectedText || !question) {
      res.status(400).json({ error: "Selected text and question are required." });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const systemInstruction = `You are an expert CUET PG Economics tutor. You must ONLY answer questions directly related to the active topic: ${subtopic}. If the user asks an unrelated question, gently decline and redirect them to the active concept.

Pedagogical & Formatting Rules (Feynman Technique):
- Context: Unit "${unit || "Economics"}", Chapter "${chapter || ""}", Active Sub-topic "${subtopic}".
- INTUITION FIRST: Always explain in plain, simple everyday English first using a relatable analogy before introducing any technical terms.
- TRANSLATE THE MATH: Every mathematical symbol (like $\\lambda$, $U_{11}$, $MRS$) or equation must be immediately translated into simple, everyday English.
- Strictly English only (no Hindi or exam marking scheme details).
- Render all mathematical symbols, variables, Greek letters ($\\Delta$, $\\alpha$, $\\beta$, $\\lambda$, $\\pi$, $\\sigma$, $\\varepsilon$), and equations using inline LaTeX ($...$) or block LaTeX ($$...$$). Never spell out Greek letters as plain words.`;

    const prompt = `Highlighted Text / Formula from Study Notes:
"""
${selectedText}
"""

Student's Question about this selection:
"${question}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({
      answer: response.text || "Unable to generate an explanation for this selection.",
    });
  } catch (error: any) {
    console.error("Error in inline tutor:", error);
    res.status(500).json({
      error: error?.message || "Failed to process inline tutor question.",
    });
  }
});

// 5. Persistent Screen Cropper Vision Tutor (Multimodal Base64 Image + Question with Strict Context Boundary)
app.post("/api/vision-tutor", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic, imageBase64, question } = req.body;
    if (!imageBase64 || !question) {
      res.status(400).json({ error: "Cropped image and question are required." });
      return;
    }

    const ai = getGenAIClient(apiKey);

    // Strip data:image/png;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

    const systemInstruction = `You are an expert CUET PG Economics tutor. You must ONLY answer questions directly related to the active topic: ${subtopic}. If the user asks an unrelated question, gently decline and redirect them to the active concept.

Pedagogical & Formatting Rules (Feynman Technique):
- Context: Unit "${unit || "Economics"}", Chapter "${chapter || ""}", Active Sub-topic "${subtopic}".
- INTUITION FIRST: Inspect the cropped screenshot and explain what is happening in plain, simple English first using an intuitive analogy.
- TRANSLATE THE MATH: Define every mathematical symbol, slope, or curve intersection in simple everyday terms right next to the KaTeX formula.
- Strictly English only (no Hindi or exam marking scheme details).
- Render all mathematical symbols, variables, Greek letters ($\\Delta$, $\\alpha$, $\\beta$, $\\lambda$, $\\pi$, $\\sigma$, $\\varepsilon$), slopes, and equations using inline LaTeX ($...$) or block LaTeX ($$...$$). Never spell out Greek letters as plain words.`;

    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Active Topic: ${subtopic}\nStudent's Question about this cropped region: "${question}"`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction,
      },
    });

    res.json({
      answer: response.text || "Unable to analyze the cropped region.",
    });
  } catch (error: any) {
    console.error("Error in vision tutor:", error);
    res.status(500).json({
      error: error?.message || "Failed to analyze cropped screenshot.",
    });
  }
});

// 6. Topic-Restricted Graph & Concept Q&A Chat
app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({ error: "Gemini API key is required. Please set your key in the app." });
      return;
    }

    const { unit, chapter, subtopic, question, history, currentGraphState } = req.body;
    if (!question) {
      res.status(400).json({ error: "Question is required" });
      return;
    }

    const ai = getGenAIClient(apiKey);

    const historyContext =
      Array.isArray(history) && history.length > 0
        ? history
            .slice(-6)
            .map(
              (m: { role: string; text: string }) =>
                `${m.role === "user" ? "Student" : "Mentor"}: ${m.text}`
            )
            .join("\n\n")
        : "";

    const systemInstruction = `You are an expert CUET PG Economics tutor. You must ONLY answer questions directly related to the active topic: ${subtopic}. If the user asks an unrelated question, gently decline and redirect them to the active concept.

Active Syllabus Context:
- Unit: ${unit}
- Chapter: ${chapter}
- Active Sub-topic: ${subtopic}
${currentGraphState ? `- Active Interactive Plotly Model State: ${JSON.stringify(currentGraphState)}` : ""}

STRICT PEDAGOGICAL & FORMATTING RULES (FEYNMAN TECHNIQUE):
1. INTUITION FIRST: Always answer in plain, accessible English first with a relatable analogy before showing any math. Keep sentences short and exam-friendly.
2. TRANSLATE THE MATH: Every symbol ($\\lambda$, $U_{11}$, $MRS$, etc.) must be immediately explained in simple words. Always render Greek letters ($\\Delta$, $\\alpha$, $\\beta$, $\\lambda$, $\\pi$, $\\sigma$, $\\eta$) and formulas using inline LaTeX ($...$) or block LaTeX ($$...$$).
3. STRICTLY ENGLISH ONLY: Never use Hindi or mention exam marking schemes.
4. INTERACTIVE SLIDER UPDATES: If the user asks what happens when a parameter or curve shifts on the interactive Plotly model (e.g., "Increase the first slider", "Shift p1 to 8", "What if autonomous spending rises?"), populate "sliderAdjustments" with the new numeric values for p1, p2, or p3 so the Plotly graph updates live.`;

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
            answer: {
              type: Type.STRING,
              description: "The mathematically rigorous explanation in English with $...$ and $$...$$ LaTeX.",
            },
            isRedirectedOutOfScope: {
              type: Type.BOOLEAN,
              description: "True if the user's question was outside the active sub-topic and gently redirected.",
            },
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

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response from Gemini model");
    }

    const parsed = JSON.parse(rawText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Error in Q&A chat:", error);
    res.status(500).json({
      error: error?.message || "Failed to process chat question.",
    });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    // HMR is disabled in AI Studio environment per environment constraints
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`CUET PG Economics (COQP10) Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
