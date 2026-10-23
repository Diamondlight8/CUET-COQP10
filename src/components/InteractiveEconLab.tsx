import React, { useEffect, useRef, useMemo } from "react";
import {
  Sliders,
  RefreshCw,
  Trash2,
  Sparkles,
  RotateCcw,
  Activity,
  BookOpen,
  Info,
  Layers,
  CheckCircle2,
  Compass,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { MathFormula, RichMathText } from "./MathText";
import { RelatedGraphOption } from "../data/syllabus";

declare global {
  interface Window {
    Plotly?: {
      react: (
        root: HTMLElement,
        data: any[],
        layout: Record<string, any>,
        config: Record<string, any>
      ) => Promise<void>;
      purge: (root: HTMLElement) => void;
      Plots?: {
        resize: (root: HTMLElement) => void;
      };
    };
  }
}

export interface PlotlySliderSpec {
  id: "p1" | "p2" | "p3" | string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export type CurveExpressionType =
  | "linear"
  | "quadratic"
  | "hyperbola"
  | "concave_power"
  | "bell_curve"
  | "explicit_points";

export interface PlotlyCurveSpec {
  id: string;
  name: string;
  formulaLatex: string;
  color: string;
  lineStyle: "solid" | "dash" | "dot";
  traceType?: "lines" | "bar" | "markers" | "lines+markers";
  expressionType: CurveExpressionType;
  xPoints?: number[];
  yPoints?: number[];
  baseIntercept?: number;
  slope?: number;
  curvature?: number;
  p1Weight?: number;
  p2Weight?: number;
  p3Weight?: number;
}

export interface PlotlyEquilibriumPoint {
  label: string;
  x: number;
  y: number;
  color?: string;
  description?: string;
}

export interface PlotlyEmbeddedExplanation {
  axesAndVariables: string;
  curveMovements: string;
  equilibriumAndShifts: string;
  economicSignificance: string;
}

export interface PlotlyEconomicModel {
  isGraphCanonical: boolean;
  message?: string;
  graphId?: string;
  modelReference?: string;
  pyqBenchmark?: string;
  chartType?: "line" | "bar" | "scatter";
  hasComparativeStaticsSliders?: boolean;
  title?: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xMin?: number;
  xMax?: number;
  equilibriumLabel?: string;
  equilibriumPoints?: PlotlyEquilibriumPoint[];
  parameterSliders?: PlotlySliderSpec[];
  curves?: PlotlyCurveSpec[];
  comparativeStaticsNote?: string;
  embeddedExplanation?: PlotlyEmbeddedExplanation;
  generatedAt?: string;
}

export type SliderValuesMap = Record<string, number>;

interface InteractiveEconLabProps {
  unit: string;
  chapter: string;
  subtopic: string;
  relatedGraphs?: RelatedGraphOption[];
  selectedGraphId?: string | null;
  generatingGraphId?: string | null;
  isDiscoveringMenu?: boolean;
  cachedTopicModels?: Record<string, PlotlyEconomicModel>;
  model?: PlotlyEconomicModel;
  sliderValues: SliderValuesMap;
  onChangeSliderValues: (next: SliderValuesMap) => void;
  isGeneratingModel: boolean;
  modelError: string | null;
  onSelectGraphOption?: (
    option: RelatedGraphOption,
    forceRegenerate?: boolean
  ) => void;
  onDiscoverRelatedGraphs?: () => void;
  onGenerateModel: () => void;
  onDeleteModelCache: () => void;
  isLightMode: boolean;
  lastShiftNote?: string;
}

const HIGH_CONTRAST_NEON_PALETTE = [
  "#00ff9d", // Neon Emerald
  "#00e5ff", // Electric Cyan
  "#ffbe0b", // Vivid Amber
  "#ff2a85", // Neon Magenta
  "#a855f7", // Electric Violet
  "#38bdf8", // Sky Neon
];

const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  a: "ₐ",
  e: "ₑ",
  i: "ᵢ",
  o: "ₒ",
  r: "ᵣ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
  m: "ₘ",
  n: "ₙ",
  p: "ₚ",
  s: "ₛ",
  t: "ₜ",
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "*": "*",
  n: "ⁿ",
  e: "ᵉ",
};

const GREEK_UNICODE_MAP: Record<string, string> = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\Delta": "Δ",
  "\\epsilon": "ε",
  "\\varepsilon": "ε",
  "\\zeta": "ζ",
  "\\eta": "η",
  "\\theta": "θ",
  "\\Theta": "Θ",
  "\\lambda": "λ",
  "\\Lambda": "Λ",
  "\\mu": "μ",
  "\\nu": "ν",
  "\\pi": "π",
  "\\Pi": "Π",
  "\\rho": "ρ",
  "\\sigma": "σ",
  "\\Sigma": "Σ",
  "\\tau": "τ",
  "\\phi": "φ",
  "\\Phi": "Φ",
  "\\omega": "ω",
  "\\Omega": "Ω",
  "\\partial": "∂",
  "\\infty": "∞",
  "\\cdot": "·",
  "\\times": "×",
  "\\le": "≤",
  "\\ge": "≥",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\rightarrow": "→",
  "\\to": "→",
};

/**
 * Cleans any raw LaTeX delimiters ($...$, \text{}, subscripts, Greek commands)
 * into clean human-readable Unicode for Plotly SVG canvas axis titles and trace legends.
 */
function formatPlotlyAxisText(raw?: string): string {
  if (!raw) return "";
  let text = raw.replace(/\$\$/g, "").replace(/\$/g, "");
  text = text.replace(/\\text\{([^}]*)\}/g, "$1");
  text = text.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  text = text.replace(/\\mathbf\{([^}]*)\}/g, "$1");

  for (const [cmd, uni] of Object.entries(GREEK_UNICODE_MAP)) {
    text = text.split(cmd).join(uni);
  }

  text = text.replace(/_\{([0-9a-zA-Z]+)\}/g, (_, sub: string) =>
    sub
      .split("")
      .map((ch) => SUBSCRIPT_MAP[ch.toLowerCase()] || ch)
      .join("")
  );
  text = text.replace(/_([0-9a-zA-Z])/g, (_, ch: string) => {
    return SUBSCRIPT_MAP[ch.toLowerCase()] || `_${ch}`;
  });

  text = text.replace(/\^\{([0-9+\-*ne]+)\}/g, (_, sup: string) =>
    sup
      .split("")
      .map((ch) => SUPERSCRIPT_MAP[ch] || ch)
      .join("")
  );
  text = text.replace(/\^([0-9+\-*ne])/g, (_, ch: string) => {
    return SUPERSCRIPT_MAP[ch] || `^${ch}`;
  });

  text = text.replace(/[{}]/g, "").replace(/\\/g, "");
  return text.trim();
}

export function evaluateCurveAtX(
  curve: PlotlyCurveSpec,
  x: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const baseIntercept = Number(curve.baseIntercept) || 0;
  const slope = Number(curve.slope) || 0;
  const curvature = Number(curve.curvature) || 0;
  const shift =
    (Number(curve.p1Weight) || 0) * p1 +
    (Number(curve.p2Weight) || 0) * p2 +
    (Number(curve.p3Weight) || 0) * p3;

  const A = baseIntercept + shift;

  switch (curve.expressionType) {
    case "linear":
      return A + slope * x;
    case "quadratic":
      return A + slope * x + curvature * x * x;
    case "hyperbola": {
      const safeX = Math.max(0.35, x + 0.35);
      return A / safeX + Math.max(0, curvature) * 0.1 + slope * x;
    }
    case "concave_power": {
      const safeX = Math.max(0, x);
      const alpha = Math.max(
        0.15,
        Math.min(0.85, curvature > 0 ? curvature : 0.5)
      );
      return Math.max(0, A) * Math.pow(safeX, alpha) + slope * safeX;
    }
    case "bell_curve": {
      const mean = slope + (Number(curve.p1Weight) || 0) * p1;
      const stdDev = Math.max(
        0.35,
        Math.abs(curvature || 1.5) + (Number(curve.p2Weight) || 0) * p2
      );
      const amplitude = Math.max(0.2, baseIntercept || 1);
      const z = (x - mean) / stdDev;
      return amplitude * Math.exp(-0.5 * z * z);
    }
    default:
      return A + slope * x;
  }
}

export const InteractiveEconLab: React.FC<InteractiveEconLabProps> = ({
  subtopic,
  relatedGraphs = [],
  selectedGraphId = null,
  generatingGraphId = null,
  isDiscoveringMenu = false,
  cachedTopicModels = {},
  model,
  sliderValues,
  onChangeSliderValues,
  isGeneratingModel,
  modelError,
  onSelectGraphOption,
  onDiscoverRelatedGraphs,
  onGenerateModel,
  onDeleteModelCache,
  isLightMode,
  lastShiftNote,
}) => {
  const plotContainerRef = useRef<HTMLDivElement | null>(null);

  const bgSurface = isLightMode
    ? "bg-white border-gray-200"
    : "bg-[#0e0e0e] border-[#222222]";
  const bgNested = isLightMode
    ? "bg-gray-50 border-gray-200"
    : "bg-[#121212] border-[#222222]";
  const borderCol = isLightMode ? "border-gray-200" : "border-[#222222]";
  const mutedText = isLightMode ? "text-gray-600" : "text-neutral-400";
  const bodyProseText = isLightMode ? "text-gray-800" : "text-neutral-200";

  const hasSliders =
    Boolean(model?.hasComparativeStaticsSliders) &&
    Array.isArray(model?.parameterSliders) &&
    model!.parameterSliders!.length > 0;

  // Extract slider values p1, p2, p3 (defaulting to 0 when static)
  const { p1Val, p2Val, p3Val } = useMemo(() => {
    if (!model || !Array.isArray(model.parameterSliders)) {
      return { p1Val: 0, p2Val: 0, p3Val: 0 };
    }
    const s1 = model.parameterSliders[0];
    const s2 = model.parameterSliders[1];
    const s3 = model.parameterSliders[2];

    return {
      p1Val: s1 ? sliderValues[s1.id] ?? s1.defaultValue : 0,
      p2Val: s2 ? sliderValues[s2.id] ?? s2.defaultValue : 0,
      p3Val: s3 ? sliderValues[s3.id] ?? s3.defaultValue : 0,
    };
  }, [model, sliderValues]);

  // Compute traces, auto-intersections, explicit equilibrium points, and axis drop-line shapes
  const { plotlyTraces, equilibriumMarkers, axisDropShapes } = useMemo(() => {
    if (
      !model ||
      !model.isGraphCanonical ||
      !Array.isArray(model.curves) ||
      model.curves.length === 0
    ) {
      return {
        plotlyTraces: [],
        equilibriumMarkers: [] as PlotlyEquilibriumPoint[],
        axisDropShapes: [] as Record<string, any>[],
      };
    }

    const xMin = typeof model.xMin === "number" ? model.xMin : 0;
    const xMax =
      typeof model.xMax === "number" && model.xMax > xMin ? model.xMax : 10;
    const steps = 100;
    const dx = (xMax - xMin) / steps;
    const sampledXs: number[] = [];
    for (let i = 0; i <= steps; i++) {
      sampledXs.push(Number((xMin + i * dx).toFixed(3)));
    }

    const evaluatedYArrays: { xArr: number[]; yArr: number[]; name: string }[] =
      [];

    const traces: any[] = model.curves.map((curve, idx) => {
      const neonColor =
        curve.color && curve.color.startsWith("#")
          ? curve.color
          : HIGH_CONTRAST_NEON_PALETTE[idx % HIGH_CONTRAST_NEON_PALETTE.length];

      const cleanCurveName = formatPlotlyAxisText(curve.name);
      const cleanXLabel = formatPlotlyAxisText(model.xAxisLabel || "X");
      const cleanYLabel = formatPlotlyAxisText(model.yAxisLabel || "Y");

      // Mode 1: Explicit Textbook Coordinates (bar, scatter, kinked, or static line)
      if (
        curve.expressionType === "explicit_points" &&
        Array.isArray(curve.xPoints) &&
        Array.isArray(curve.yPoints) &&
        curve.xPoints.length > 0 &&
        curve.xPoints.length === curve.yPoints.length
      ) {
        const shiftedY = curve.yPoints.map((rawY) => {
          const shift =
            (Number(curve.p1Weight) || 0) * p1Val +
            (Number(curve.p2Weight) || 0) * p2Val +
            (Number(curve.p3Weight) || 0) * p3Val;
          return Number((Number(rawY) + shift).toFixed(4));
        });

        evaluatedYArrays.push({
          xArr: curve.xPoints,
          yArr: shiftedY,
          name: cleanCurveName,
        });

        if (model.chartType === "bar" || curve.traceType === "bar") {
          return {
            x: curve.xPoints,
            y: shiftedY,
            type: "bar",
            name: cleanCurveName,
            marker: {
              color: neonColor,
              opacity: 0.85,
              line: { color: "#ffffff", width: 1 },
            },
            hovertemplate: `<b>${cleanCurveName}</b><br>${cleanXLabel}: %{x:.2f}<br>${cleanYLabel}: %{y:.2f}<extra></extra>`,
          };
        }

        const scatterMode =
          curve.traceType ||
          (model.chartType === "scatter" ? "lines+markers" : "lines");

        return {
          x: curve.xPoints,
          y: shiftedY,
          type: "scatter",
          mode: scatterMode,
          name: cleanCurveName,
          line: {
            color: neonColor,
            width: 3.5,
            dash: curve.lineStyle || "solid",
          },
          marker: {
            color: neonColor,
            size: 7,
          },
          hovertemplate: `<b>${cleanCurveName}</b><br>${cleanXLabel}: %{x:.2f}<br>${cleanYLabel}: %{y:.2f}<extra></extra>`,
        };
      }

      // Mode 2: Parametric Textbook Functional Forms
      const ys = sampledXs.map((x) => {
        const rawY = evaluateCurveAtX(curve, x, p1Val, p2Val, p3Val);
        return Number(rawY.toFixed(4));
      });

      evaluatedYArrays.push({
        xArr: sampledXs,
        yArr: ys,
        name: cleanCurveName,
      });

      if (model.chartType === "bar" || curve.traceType === "bar") {
        const barIndices = [10, 25, 40, 55, 70, 85];
        return {
          x: barIndices.map((i) => sampledXs[i]),
          y: barIndices.map((i) => ys[i]),
          type: "bar",
          name: cleanCurveName,
          marker: {
            color: neonColor,
            opacity: 0.85,
          },
        };
      }

      return {
        x: sampledXs,
        y: ys,
        type: "scatter",
        mode: curve.traceType || "lines",
        name: cleanCurveName,
        line: {
          color: neonColor,
          width: 3.5,
          dash: curve.lineStyle || "solid",
          shape: "spline",
          smoothing: 0.6,
        },
        hovertemplate: `<b>${cleanCurveName}</b><br>${cleanXLabel}: %{x:.2f}<br>${cleanYLabel}: %{y:.2f}<extra></extra>`,
      };
    });

    // Collect explicit equilibrium points from AI + auto-detected curve intersections
    const eqPoints: PlotlyEquilibriumPoint[] = [];

    if (
      Array.isArray(model.equilibriumPoints) &&
      model.equilibriumPoints.length > 0 &&
      !hasSliders
    ) {
      for (const pt of model.equilibriumPoints) {
        if (
          typeof pt.x === "number" &&
          typeof pt.y === "number" &&
          !Number.isNaN(pt.x) &&
          !Number.isNaN(pt.y)
        ) {
          eqPoints.push({
            label: formatPlotlyAxisText(pt.label || "E*"),
            x: Number(pt.x.toFixed(2)),
            y: Number(pt.y.toFixed(2)),
            color: pt.color || "#00ff9d",
            description: pt.description,
          });
        }
      }
    }

    // Also compute real-time intersections between pairs of curves (especially when sliders move or if no explicit points were given)
    if (
      model.chartType !== "bar" &&
      evaluatedYArrays.length >= 2 &&
      (eqPoints.length === 0 || hasSliders)
    ) {
      // Check intersection between Curve 0 and subsequent curves
      const c0 = evaluatedYArrays[0];
      for (let pairIdx = 1; pairIdx < evaluatedYArrays.length; pairIdx++) {
        const cOther = evaluatedYArrays[pairIdx];
        if (c0.xArr.length !== cOther.xArr.length) continue;

        let bestIdx = -1;
        let minDiff = Infinity;

        for (let i = 1; i < c0.xArr.length - 1; i++) {
          const diffPrev = c0.yArr[i - 1] - cOther.yArr[i - 1];
          const diffCurr = c0.yArr[i] - cOther.yArr[i];
          if (diffPrev * diffCurr <= 0) {
            bestIdx = i;
            minDiff = Math.abs(diffCurr);
            break;
          }
          const absD = Math.abs(diffCurr);
          if (absD < minDiff) {
            minDiff = absD;
            bestIdx = i;
          }
        }

        const ySpan =
          Math.max(...c0.yArr, ...cOther.yArr) -
          Math.min(...c0.yArr, ...cOther.yArr);
        if (bestIdx !== -1 && minDiff <= Math.max(2.0, ySpan * 0.12)) {
          const eqX = Number(c0.xArr[bestIdx].toFixed(2));
          const eqY = Number(
            ((c0.yArr[bestIdx] + cOther.yArr[bestIdx]) / 2).toFixed(2)
          );
          const defaultLabel =
            pairIdx === 1
              ? formatPlotlyAxisText(model.equilibriumLabel || "E₀")
              : `E${SUBSCRIPT_MAP[String(pairIdx - 1)] || pairIdx}`;

          // Avoid duplicate coordinate markers
          const isDuplicate = eqPoints.some(
            (existing) =>
              Math.abs(existing.x - eqX) < 0.25 &&
              Math.abs(existing.y - eqY) < 0.25
          );
          if (!isDuplicate) {
            eqPoints.push({
              label: defaultLabel,
              x: eqX,
              y: eqY,
              color: pairIdx === 1 ? "#00ff9d" : "#ffbe0b",
            });
          }
        }
      }
    }

    // Build dashed projection drop-lines (shapes) to X and Y axes + Equilibrium Marker Trace
    const shapes: Record<string, any>[] = [];
    if (eqPoints.length > 0 && model.chartType !== "bar") {
      eqPoints.forEach((pt, idx) => {
        const lineCol =
          pt.color || (idx === 0 ? "#00ff9d" : "#ffbe0b");
        // Vertical dashed drop-line to X-axis (y = 0)
        shapes.push({
          type: "line",
          x0: pt.x,
          y0: 0,
          x1: pt.x,
          y1: pt.y,
          line: {
            color: lineCol,
            width: 1.5,
            dash: "dot",
          },
          opacity: 0.65,
        });
        // Horizontal dashed drop-line to Y-axis (x = xMin or 0)
        shapes.push({
          type: "line",
          x0: Math.max(0, xMin),
          y0: pt.y,
          x1: pt.x,
          y1: pt.y,
          line: {
            color: lineCol,
            width: 1.5,
            dash: "dot",
          },
          opacity: 0.65,
        });
      });

      traces.push({
        x: eqPoints.map((p) => p.x),
        y: eqPoints.map((p) => p.y),
        type: "scatter",
        mode: "markers+text",
        name: "Equilibrium / Key Points",
        text: eqPoints.map((p) => `${p.label} (${p.x}, ${p.y})`),
        textposition: "top right",
        textfont: {
          color: "#ffffff",
          size: 12,
          family: "JetBrains Mono, monospace",
        },
        marker: {
          color: eqPoints.map((p) => p.color || "#00ff9d"),
          size: 12,
          symbol: "diamond",
          line: {
            color: "#ffffff",
            width: 2,
          },
        },
        hovertemplate: `<b>%{text}</b><extra></extra>`,
      });
    }

    return {
      plotlyTraces: traces,
      equilibriumMarkers: eqPoints,
      axisDropShapes: shapes,
    };
  }, [model, p1Val, p2Val, p3Val, hasSliders]);

  // Synthesize a structured 4-part Embedded Explanation even if a cached model only has legacy fields
  const structuredExplanation: PlotlyEmbeddedExplanation | null = useMemo(() => {
    if (!model || !model.isGraphCanonical) return null;
    if (
      model.embeddedExplanation &&
      (model.embeddedExplanation.axesAndVariables ||
        model.embeddedExplanation.curveMovements ||
        model.embeddedExplanation.equilibriumAndShifts ||
        model.embeddedExplanation.economicSignificance)
    ) {
      return model.embeddedExplanation;
    }

    // Fallback synthesis for older cached models
    const curveSummary = Array.isArray(model.curves)
      ? model.curves
          .map((c) => `**${c.name}** ($${c.formulaLatex}$)`)
          .join("; ")
      : "Standard textbook functional curves";
    return {
      axesAndVariables: `The horizontal axis ($X$-axis) measures **${
        model.xAxisLabel || "Quantity / Output"
      }**, while the vertical axis ($Y$-axis) measures **${
        model.yAxisLabel || "Price / Interest Rate / Value"
      }**. All coordinates are scaled to standard graduate textbook conventions.`,
      curveMovements: `Plotted traces: ${curveSummary}. Observe the slope and curvature of each schedule across the domain $[${
        model.xMin ?? 0
      }, ${model.xMax ?? 10}]$.`,
      equilibriumAndShifts:
        model.comparativeStaticsNote ||
        "Equilibrium occurs at the intersection/tangency of the primary schedules, where dashed projection lines drop to the horizontal and vertical axes.",
      economicSignificance: `Benchmarked to **${
        model.modelReference || "CUET PG Economics (COQP10)"
      }**. ${
        model.subtitle ||
        "Frequently tested in CUET PG for identifying slope conditions, equilibrium shifts, and comparative statics."
      }`,
    };
  }, [model]);

  // Render Plotly.js chart onto the pitch-black (#000000) canvas
  useEffect(() => {
    const container = plotContainerRef.current;
    if (
      !container ||
      !model ||
      !model.isGraphCanonical ||
      !window.Plotly ||
      plotlyTraces.length === 0
    ) {
      return;
    }

    const layout: Record<string, any> = {
      paper_bgcolor: "#000000",
      plot_bgcolor: "#000000",
      margin: { t: 36, r: 32, b: 64, l: 68 },
      font: {
        family: "Inter, -apple-system, sans-serif",
        color: "#f5f5f5",
        size: 12,
      },
      xaxis: {
        title: {
          text: formatPlotlyAxisText(model.xAxisLabel || "X"),
          font: { color: "#ffffff", size: 13 },
          standoff: 14,
        },
        color: "#e5e5e5",
        linecolor: "#444444",
        linewidth: 1.5,
        tickcolor: "#555555",
        gridcolor: "#1a1a1a",
        zerolinecolor: "#383838",
        zerolinewidth: 1.5,
        tickfont: {
          color: "#d4d4d4",
          family: "JetBrains Mono, monospace",
          size: 11,
        },
      },
      yaxis: {
        title: {
          text: formatPlotlyAxisText(model.yAxisLabel || "Y"),
          font: { color: "#ffffff", size: 13 },
          standoff: 12,
        },
        color: "#e5e5e5",
        linecolor: "#444444",
        linewidth: 1.5,
        tickcolor: "#555555",
        gridcolor: "#1a1a1a",
        zerolinecolor: "#383838",
        zerolinewidth: 1.5,
        tickfont: {
          color: "#d4d4d4",
          family: "JetBrains Mono, monospace",
          size: 11,
        },
      },
      shapes: axisDropShapes,
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.03,
        xanchor: "left",
        x: 0,
        font: { color: "#ffffff", size: 11 },
        bgcolor: "rgba(0,0,0,0.7)",
      },
      hovermode: "closest",
      autosize: true,
    };

    const config: Record<string, any> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    };

    window.Plotly.react(container, plotlyTraces, layout, config);

    const handleResize = () => {
      if (plotContainerRef.current && window.Plotly?.Plots) {
        window.Plotly.Plots.resize(plotContainerRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [model, plotlyTraces, axisDropShapes]);

  const handleResetSliders = () => {
    if (!model || !Array.isArray(model.parameterSliders)) return;
    const defaults: SliderValuesMap = {};
    for (const s of model.parameterSliders) {
      defaults[s.id] = s.defaultValue;
    }
    onChangeSliderValues(defaults);
  };

  const activeSelectedOption = useMemo(
    () => relatedGraphs.find((g) => g.id === selectedGraphId) || null,
    [relatedGraphs, selectedGraphId]
  );

  const plottedCount = useMemo(
    () =>
      relatedGraphs.filter((g) => cachedTopicModels[g.id]?.isGraphCanonical)
        .length,
    [relatedGraphs, cachedTopicModels]
  );

  return (
    <section className={`border rounded-lg p-6 space-y-5 ${bgSurface}`}>
      {/* Header Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b ${borderCol} pb-3.5`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#10b981]" />
              <span>
                Interactive Economic Graph Menu &amp; Plotly Lab
              </span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
              <Award className="w-3 h-3" />
              <span>CUET PG (COQP10) Benchmark</span>
            </span>
          </div>
          <p className={`text-xs ${mutedText} mt-0.5`}>
            Select any textbook economic model under{" "}
            <strong className="font-semibold text-[#10b981]">
              Related Graphs
            </strong>{" "}
            below to plot it on demand with equilibrium projections and an
            embedded breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onDiscoverRelatedGraphs && (
            <button
              type="button"
              onClick={onDiscoverRelatedGraphs}
              disabled={isDiscoveringMenu || isGeneratingModel}
              className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${bgNested} hover:border-[#10b981]`}
              title="Discover or refresh the Contextual Graph Menu for this lesson"
            >
              <Compass
                className={`w-3.5 h-3.5 ${
                  isDiscoveringMenu
                    ? "animate-spin text-[#10b981]"
                    : "text-[#10b981]"
                }`}
              />
              <span>
                {isDiscoveringMenu
                  ? "Scanning Syllabus..."
                  : relatedGraphs.length > 0
                  ? "Refresh Graph Menu"
                  : "Discover Related Graphs"}
              </span>
            </button>
          )}

          {model && (
            <>
              {model.isGraphCanonical && hasSliders && (
                <button
                  type="button"
                  onClick={handleResetSliders}
                  className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1 cursor-pointer ${bgNested} hover:border-[#10b981]`}
                  title="Reset parameters to baseline equilibrium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sliders</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (activeSelectedOption && onSelectGraphOption) {
                    onSelectGraphOption(activeSelectedOption, true);
                  } else {
                    onGenerateModel();
                  }
                }}
                disabled={isGeneratingModel}
                className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${bgNested} hover:border-[#10b981]`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isGeneratingModel ? "animate-spin text-[#10b981]" : ""
                  }`}
                />
                <span>
                  {isGeneratingModel ? "Plotting..." : "Re-Plot Active Graph"}
                </span>
              </button>

              <button
                type="button"
                onClick={onDeleteModelCache}
                disabled={isGeneratingModel}
                className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1 text-red-400 hover:border-red-500/60 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer ${bgNested}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Graph Cache</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* =====================================================================
          1. PERSISTENT CONTEXTUAL "RELATED GRAPHS" MENU
          Always remains visible & clickable so the student can switch between
          or generate any related economic model on demand.
         ===================================================================== */}
      {relatedGraphs.length > 0 ? (
        <div className={`border rounded-lg p-4 space-y-3.5 ${bgNested}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-xs sm:text-sm font-semibold">
                Related Graphs ({relatedGraphs.length} Textbook Models Available)
              </h3>
            </div>
            <span className={`text-[11px] font-mono ${mutedText}`}>
              {plottedCount}/{relatedGraphs.length} Plotted in Cache · Click any
              option to plot on demand
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {relatedGraphs.map((option, idx) => {
              const isSelected = selectedGraphId === option.id;
              const isThisGenerating =
                isGeneratingModel && generatingGraphId === option.id;
              const isCached = Boolean(
                cachedTopicModels[option.id]?.isGraphCanonical
              );

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isGeneratingModel}
                  onClick={() => {
                    if (onSelectGraphOption) {
                      onSelectGraphOption(option, false);
                    }
                  }}
                  className={`text-left border rounded-md p-3.5 transition-all flex flex-col justify-between gap-2.5 cursor-pointer disabled:opacity-75 ${
                    isSelected
                      ? "bg-[#10b981]/12 border-[#10b981] ring-1 ring-[#10b981]/40"
                      : isLightMode
                      ? "bg-white border-gray-200 hover:border-[#10b981]"
                      : "bg-[#090909] border-[#242424] hover:border-[#10b981]/70"
                  }`}
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                            isSelected
                              ? "bg-[#10b981] text-[#050505] border-[#10b981] font-bold"
                              : "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30"
                          }`}
                        >
                          0{idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold leading-snug">
                          <RichMathText text={option.title} />
                        </span>
                      </div>

                      {/* Persistent Status Pill */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 inline-flex items-center gap-1 ${
                          isThisGenerating
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                            : isSelected && isCached
                            ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 font-semibold"
                            : isCached
                            ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30"
                            : `${bgNested} ${mutedText}`
                        }`}
                      >
                        {isThisGenerating ? (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            <span>Plotting...</span>
                          </>
                        ) : isSelected && isCached ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Active</span>
                          </>
                        ) : isCached ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Plotted</span>
                          </>
                        ) : (
                          <span>Plot Graph →</span>
                        )}
                      </span>
                    </div>

                    <p
                      className={`text-[11px] leading-relaxed ${mutedText} line-clamp-2`}
                    >
                      <RichMathText text={option.shortDescription} />
                    </p>
                  </div>

                  <div
                    className={`pt-2 border-t ${borderCol} flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono w-full`}
                  >
                    <span className="text-[#10b981] inline-flex items-center gap-1 truncate max-w-[60%]">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{option.textbookReference}</span>
                    </span>
                    <span className={`${mutedText} truncate max-w-[38%]`}>
                      {option.pyqFocus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Discovery Gate when Related Graphs have not been loaded for an uncached topic yet */
        !model &&
        !isGeneratingModel && (
          <div
            className={`border rounded-md py-10 px-6 text-center space-y-4 ${bgNested}`}
          >
            <div className="w-11 h-11 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center mx-auto">
              <Layers className="w-5 h-5 text-[#10b981]" />
            </div>
            <div className="space-y-1.5 max-w-xl mx-auto">
              <h3 className="text-sm sm:text-base font-bold">
                Contextual Graph Menu for{" "}
                <span className="text-[#10b981]">{subtopic}</span>
              </h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                Graphs are rendered strictly on demand. Click below to identify
                all canonical textbook economic models (Varian, Froyen,
                Blanchard, Koutsoyiannis) tested in{" "}
                <strong className="font-semibold">
                  CUET PG Economics (COQP10)
                </strong>{" "}
                for this lesson, then choose which specific graph to plot.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {onDiscoverRelatedGraphs && (
                <button
                  type="button"
                  onClick={onDiscoverRelatedGraphs}
                  disabled={isDiscoveringMenu}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-[#050505] rounded-md transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isDiscoveringMenu ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Identifying Related Graphs...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      <span>Load Related Graphs Menu</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onGenerateModel}
                disabled={isGeneratingModel || isDiscoveringMenu}
                className={`px-4 py-2.5 text-xs sm:text-sm font-medium border hover:border-[#10b981] rounded-md transition-colors inline-flex items-center gap-2 cursor-pointer ${bgSurface}`}
              >
                <Sparkles className="w-4 h-4 text-[#10b981]" />
                <span>Quick-Plot Primary Model</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* =====================================================================
          2. ON-DEMAND PROMPT WHEN MENU IS LOADED BUT NO GRAPH IS SELECTED YET
         ===================================================================== */}
      {relatedGraphs.length > 0 && !model && !isGeneratingModel && !modelError && (
        <div
          className={`border border-dashed rounded-md py-8 px-6 text-center space-y-2 ${bgNested}`}
        >
          <Target className="w-6 h-6 text-[#10b981] mx-auto opacity-80" />
          <h4 className="text-xs sm:text-sm font-semibold">
            Ready to Plot On-Demand
          </h4>
          <p className={`text-xs max-w-lg mx-auto ${mutedText}`}>
            Click any model card in the{" "}
            <strong className="text-[#10b981]">Related Graphs</strong> menu
            above to plot its high-contrast Plotly.js diagram, equilibrium
            intersections, and detailed economic breakdown.
          </p>
        </div>
      )}

      {/* =====================================================================
          3. ON-DEMAND LOADING STATE FOR THE SELECTED GRAPH
         ===================================================================== */}
      {isGeneratingModel && (
        <div
          className={`border border-[#10b981]/40 rounded-md py-11 px-6 text-center space-y-3 ${bgNested}`}
        >
          <RefreshCw className="w-6 h-6 text-[#10b981] animate-spin mx-auto" />
          <div className="space-y-1 max-w-lg mx-auto">
            <p className="text-xs sm:text-sm font-semibold text-[#10b981]">
              {activeSelectedOption
                ? `Plotting Selected Graph: "${activeSelectedOption.title}"`
                : `Synthesizing Canonical CUET PG Graph for "${subtopic}"`}
            </p>
            {activeSelectedOption && (
              <p className="text-[11px] font-mono text-[#10b981]/80">
                Benchmark: {activeSelectedOption.textbookReference} ·{" "}
                {activeSelectedOption.pyqFocus}
              </p>
            )}
            <p className={`text-xs ${mutedText} pt-1`}>
              Computing exact textbook coordinates, equilibrium intersections{" "}
              <MathFormula latex="(X^*, Y^*)" />, dashed axis projections, and
              the 4-part embedded economic explanation...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {modelError && (
        <div
          className={`border border-red-800/60 rounded-md p-4 flex items-center justify-between gap-4 ${bgNested}`}
        >
          <div className="text-xs text-red-400">
            <strong className="font-semibold block mb-0.5">
              Graph Generation Error
            </strong>
            {modelError}
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeSelectedOption && onSelectGraphOption) {
                onSelectGraphOption(activeSelectedOption, true);
              } else {
                onGenerateModel();
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium border hover:border-[#10b981] rounded shrink-0 cursor-pointer ${bgSurface}`}
          >
            Retry
          </button>
        </div>
      )}

      {/* Clean Minimal Notice when isGraphCanonical === false */}
      {model && !model.isGraphCanonical && !isGeneratingModel && (
        <div
          className={`border rounded-md p-5 flex items-center gap-3.5 ${bgNested}`}
        >
          <div className="w-9 h-9 rounded-full bg-neutral-500/10 border border-neutral-500/30 flex items-center justify-center shrink-0">
            <Info className={`w-4 h-4 ${mutedText}`} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-medium">
              {model.message ||
                "No standard economic graph is required for this concept."}
            </p>
            <p className={`text-[11px] ${mutedText}`}>
              This syllabus topic is primarily analytical, institutional, or
              definitional in CUET PG (COQP10) and does not require a geometric
              diagram.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. RENDERED PLOTLY GRAPH + EMBEDDED EXPLANATION
         ===================================================================== */}
      {model && model.isGraphCanonical && !isGeneratingModel && (
        <div className="space-y-5">
          {/* Model Title, Textbook Citation, PYQ Benchmark & Equilibrium Badges */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {model.modelReference && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                    <BookOpen className="w-3 h-3" />
                    <span>{model.modelReference}</span>
                  </span>
                )}
                {model.pyqBenchmark && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Award className="w-3 h-3" />
                    <span>{model.pyqBenchmark}</span>
                  </span>
                )}
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${bgNested} ${mutedText}`}
                >
                  {hasSliders
                    ? "Interactive Comparative Statics"
                    : `Textbook ${(model.chartType || "line").toUpperCase()} Plot`}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold">
                <RichMathText text={model.title || subtopic} />
              </h3>

              {model.subtitle && (
                <p className={`text-xs ${mutedText}`}>
                  <RichMathText text={model.subtitle} />
                </p>
              )}
            </div>

            {equilibriumMarkers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {equilibriumMarkers.map((eq, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 rounded border border-[#10b981]/40 bg-[#10b981]/10 text-xs font-mono text-[#10b981]"
                  >
                    {eq.label}: ({eq.x}, {eq.y})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pitch-Black (#000000) Plotly.js Canvas */}
          <div className="rounded-lg border border-[#262626] bg-[#000000] p-2 overflow-hidden shadow-inner">
            <div
              ref={plotContainerRef}
              className="w-full h-[390px] sm:h-[440px]"
            />
          </div>

          {/* Curve Equations Legend Bar */}
          {Array.isArray(model.curves) && model.curves.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {model.curves.map((curve, idx) => {
                const neonColor =
                  curve.color && curve.color.startsWith("#")
                    ? curve.color
                    : HIGH_CONTRAST_NEON_PALETTE[
                        idx % HIGH_CONTRAST_NEON_PALETTE.length
                      ];
                return (
                  <div
                    key={curve.id}
                    className={`border rounded p-3 flex flex-col justify-between gap-2 ${bgNested}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: neonColor }}
                        />
                        <span className="text-xs font-semibold truncate">
                          <RichMathText text={curve.name} />
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${mutedText}`}>
                        {curve.lineStyle}
                      </span>
                    </div>
                    <div className="text-xs overflow-x-auto py-1">
                      <MathFormula
                        latex={curve.formulaLatex}
                        displayMode={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Conditional Exogenous Parameter Sliders */}
          {hasSliders && Array.isArray(model.parameterSliders) && (
            <div className={`border rounded-md p-4 space-y-3.5 ${bgNested}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Sliders className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>
                    Comparative Statics Parameter Sliders (Real-Time Curve
                    Shifts)
                  </span>
                </div>
                <span className={`text-[11px] font-mono ${mutedText}`}>
                  Drag to shift curves &amp; observe equilibrium movement
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {model.parameterSliders.map((slider) => {
                  const val = sliderValues[slider.id] ?? slider.defaultValue;
                  return (
                    <div
                      key={slider.id}
                      className={`border rounded p-3 space-y-2 ${bgSurface}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium">
                          <RichMathText text={slider.label} />
                        </span>
                        <span className="font-mono font-semibold text-[#10b981]">
                          {val}
                          {slider.unit ? ` ${slider.unit}` : ""}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={val}
                        onChange={(e) =>
                          onChangeSliderValues({
                            ...sliderValues,
                            [slider.id]: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#10b981] cursor-pointer"
                      />
                      <div
                        className={`flex justify-between text-[10px] font-mono ${mutedText}`}
                      >
                        <span>Min: {slider.min}</span>
                        <span>Base: {slider.defaultValue}</span>
                        <span>Max: {slider.max}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chat-Triggered Shift Banner */}
          {lastShiftNote && (
            <div className="rounded border border-[#10b981]/50 bg-[#10b981]/10 px-3.5 py-2.5 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#10b981] font-medium">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <RichMathText
                    text={`AI Tutor Shifted Graph Parameters: ${lastShiftNote}`}
                  />
                </span>
              </div>
            </div>
          )}

          {/* =================================================================
              5. EMBEDDED EXPLANATION PANEL (AUTOMATICALLY DISPLAYED WITH GRAPH)
              Breaks down Axes & Variables, Curve Movements, Equilibrium Shifts,
              and Economic Significance / CUET PG PYQ Relevance.
             ================================================================= */}
          {structuredExplanation && (
            <div className={`border rounded-lg p-5 space-y-4 ${bgNested}`}>
              <div
                className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCol} pb-3`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#10b981]" />
                  <h4 className="text-xs sm:text-sm font-bold">
                    Embedded Model Breakdown &amp; CUET PG Graphical Analysis
                  </h4>
                </div>
                <span className={`text-[11px] font-mono ${mutedText}`}>
                  Select any formula or sentence to Highlight or Ask Gemini
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Axes & Variables */}
                <div
                  className={`border rounded-md p-3.5 space-y-1.5 ${bgSurface}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981]">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>1. Axes, Variables &amp; Domain</span>
                  </div>
                  <div
                    className={`text-xs leading-relaxed space-y-1.5 ${bodyProseText}`}
                  >
                    <RichMathText
                      text={structuredExplanation.axesAndVariables}
                    />
                  </div>
                </div>

                {/* 2. Curve Movements & Slopes */}
                <div
                  className={`border rounded-md p-3.5 space-y-1.5 ${bgSurface}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00e5ff]">
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    <span>2. Curve Movements, Slopes &amp; Shapes</span>
                  </div>
                  <div
                    className={`text-xs leading-relaxed space-y-1.5 ${bodyProseText}`}
                  >
                    <RichMathText text={structuredExplanation.curveMovements} />
                  </div>
                </div>

                {/* 3. Equilibrium & Comparative Statics Shifts */}
                <div
                  className={`border rounded-md p-3.5 space-y-1.5 ${bgSurface}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ffbe0b]">
                    <Target className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      3. Equilibrium Intersections &amp; Curve Shifts
                    </span>
                  </div>
                  <div
                    className={`text-xs leading-relaxed space-y-1.5 ${bodyProseText}`}
                  >
                    <RichMathText
                      text={structuredExplanation.equilibriumAndShifts}
                    />
                  </div>
                </div>

                {/* 4. Economic Significance & CUET PG Benchmark */}
                <div
                  className={`border rounded-md p-3.5 space-y-1.5 ${bgSurface}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#a855f7]">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      4. Economic Significance &amp; CUET PG (COQP10) PYQ Focus
                    </span>
                  </div>
                  <div
                    className={`text-xs leading-relaxed space-y-1.5 ${bodyProseText}`}
                  >
                    <RichMathText
                      text={structuredExplanation.economicSignificance}
                    />
                  </div>
                </div>
              </div>

              {model.comparativeStaticsNote && (
                <div
                  className={`text-xs leading-relaxed border-t ${borderCol} pt-3 ${mutedText}`}
                >
                  <strong className="font-semibold text-[#10b981] mr-1.5">
                    Comparative Statics Summary:
                  </strong>
                  <RichMathText text={model.comparativeStaticsNote} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
