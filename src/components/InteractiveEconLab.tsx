import React, { useEffect, useRef, useMemo } from "react";
import {
  RefreshCw,
  Trash2,
  RotateCcw,
  BarChart3,
  BookMarked,
  CheckCircle2,
  Sliders,
  Lock,
} from "lucide-react";
import {
  RichMathText,
  MathFormula,
  formatPlotlyAxisText,
  triggerKaTeXRenderInElement,
} from "./MathText";

declare global {
  interface Window {
    Plotly?: {
      react: (
        root: HTMLElement,
        data: any[],
        layout: any,
        config?: any
      ) => Promise<any>;
      purge: (root: HTMLElement) => void;
    };
  }
}

export interface PlotlySliderSpec {
  id: string; // 'p1' | 'p2' | 'p3'
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface PlotlyCurveSpec {
  id: string;
  name: string;
  formulaLatex: string;
  color: string;
  lineStyle: "solid" | "dash" | "dot" | string;
  traceType?: "lines" | "bar" | "markers" | "lines+markers" | string;
  expressionType:
    | "linear"
    | "quadratic"
    | "hyperbola"
    | "concave_power"
    | "bell_curve"
    | "explicit_points"
    | string;
  xPoints?: number[];
  yPoints?: number[];
  baseIntercept?: number;
  slope?: number;
  curvature?: number;
  p1Weight?: number;
  p2Weight?: number;
  p3Weight?: number;
}

export interface PlotlyEconomicModel {
  isGraphCanonical?: boolean;
  message?: string;
  modelReference?: string;
  chartType?: "line" | "bar" | "scatter" | string;
  hasComparativeStaticsSliders?: boolean;
  title?: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xMin?: number;
  xMax?: number;
  equilibriumLabel?: string;
  parameterSliders?: PlotlySliderSpec[];
  curves?: PlotlyCurveSpec[];
  comparativeStaticsNote?: string;
  generatedAt?: string;
}

export type SliderValuesMap = Record<string, number>;

interface InteractiveEconLabProps {
  unit: string;
  chapter: string;
  subtopic: string;
  model: PlotlyEconomicModel | undefined;
  sliderValues: SliderValuesMap;
  onChangeSliderValues: (next: SliderValuesMap) => void;
  isGeneratingModel: boolean;
  modelError: string | null;
  onGenerateModel: () => void;
  onDeleteModelCache: () => void;
  isLightMode: boolean;
  lastShiftNote?: string;
}

const HIGH_CONTRAST_NEONS = [
  "#00ff9d", // Neon Emerald
  "#00e5ff", // Electric Cyan
  "#ffbe0b", // Neon Amber
  "#ff2a85", // Neon Rose
  "#a855f7", // Neon Violet
  "#38bdf8", // Neon Sky
];

function evaluateCurveAtX(
  curve: PlotlyCurveSpec,
  x: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const shift =
    (curve.baseIntercept || 0) +
    (curve.p1Weight || 0) * p1 +
    (curve.p2Weight || 0) * p2 +
    (curve.p3Weight || 0) * p3;
  const slope = curve.slope || 0;
  const curv = curve.curvature || 0;

  switch (curve.expressionType) {
    case "quadratic":
      return shift + slope * x + curv * x * x;
    case "hyperbola":
      return shift / Math.max(0.25, x + 0.5) + slope * x;
    case "concave_power":
      return shift * Math.sqrt(Math.max(0, x)) + (curve.p2Weight || 0) * p2 * x;
    case "bell_curve": {
      const mean = slope + (curve.p1Weight || 0) * p1;
      const sigma = Math.max(0.25, Math.abs(curv || 1) + (curve.p2Weight || 0) * p2);
      const amp = Math.max(0.1, curve.baseIntercept || 1);
      return amp * Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2));
    }
    case "linear":
    default:
      return shift + slope * x;
  }
}

export const InteractiveEconLab: React.FC<InteractiveEconLabProps> = ({
  subtopic,
  model,
  sliderValues,
  onChangeSliderValues,
  isGeneratingModel,
  modelError,
  onGenerateModel,
  onDeleteModelCache,
  isLightMode,
  lastShiftNote,
}) => {
  const labSectionRef = useRef<HTMLElement | null>(null);
  const plotContainerRef = useRef<HTMLDivElement | null>(null);

  const panelClass = isLightMode
    ? "bg-[#f3f4f6] border-[#e5e7eb] text-[#111827]"
    : "bg-[#050505] border-[#222222] text-[#f5f5f5]";
  const subPanelClass = isLightMode
    ? "bg-[#ffffff] border-[#e5e7eb] text-[#111827]"
    : "bg-[#0a0a0a] border-[#222222] text-[#f5f5f5]";
  const mutedTextClass = isLightMode ? "text-gray-600" : "text-neutral-400";
  const borderClass = isLightMode ? "border-[#e5e7eb]" : "border-[#222222]";

  const slidersList = useMemo(
    () => (Array.isArray(model?.parameterSliders) ? model!.parameterSliders : []),
    [model]
  );
  const hasSliders = slidersList.length > 0 && model?.hasComparativeStaticsSliders !== false;

  // Compute curve coordinates and equilibrium intersection in real-time when sliders move
  const computedPlotData = useMemo(() => {
    if (
      !model ||
      model.isGraphCanonical === false ||
      !Array.isArray(model.curves) ||
      model.curves.length === 0
    ) {
      return null;
    }

    const p1 =
      sliderValues.p1 ??
      slidersList.find((s) => s.id === "p1")?.defaultValue ??
      0;
    const p2 =
      sliderValues.p2 ??
      slidersList.find((s) => s.id === "p2")?.defaultValue ??
      0;
    const p3 =
      sliderValues.p3 ??
      slidersList.find((s) => s.id === "p3")?.defaultValue ??
      0;

    const xMin = typeof model.xMin === "number" ? model.xMin : 0.5;
    const xMax =
      typeof model.xMax === "number" && model.xMax > xMin ? model.xMax : 10;
    const steps = 120;
    const dx = (xMax - xMin) / steps;

    const defaultXValues: number[] = [];
    for (let i = 0; i <= steps; i++) {
      defaultXValues.push(Number((xMin + i * dx).toFixed(4)));
    }

    const curveSeries = model.curves.map((curve, idx) => {
      const neonColor =
        curve.color && curve.color.startsWith("#")
          ? curve.color
          : HIGH_CONTRAST_NEONS[idx % HIGH_CONTRAST_NEONS.length];

      // Check if explicit textbook coordinates were supplied
      if (
        curve.expressionType === "explicit_points" &&
        Array.isArray(curve.xPoints) &&
        Array.isArray(curve.yPoints) &&
        curve.xPoints.length > 0 &&
        curve.xPoints.length === curve.yPoints.length
      ) {
        const paramShift =
          (curve.p1Weight || 0) * p1 +
          (curve.p2Weight || 0) * p2 +
          (curve.p3Weight || 0) * p3;
        return {
          curve: { ...curve, color: neonColor },
          xValues: curve.xPoints,
          yValues: curve.yPoints.map((y) => Number((y + paramShift).toFixed(4))),
        };
      }

      const yValues = defaultXValues.map((x) =>
        Number(evaluateCurveAtX(curve, x, p1, p2, p3).toFixed(4))
      );
      return {
        curve: { ...curve, color: neonColor },
        xValues: defaultXValues,
        yValues,
      };
    });

    // Find equilibrium intersection between first two continuous line curves if they cross on a shared grid
    let intersection: { x: number; y: number } | null = null;
    const chartType = model.chartType || "line";
    if (
      chartType === "line" &&
      curveSeries.length >= 2 &&
      curveSeries[0].xValues.length === curveSeries[1].xValues.length &&
      curveSeries[0].curve.traceType !== "bar"
    ) {
      const xGrid = curveSeries[0].xValues;
      const c1 = curveSeries[0].yValues;
      const c2 = curveSeries[1].yValues;

      for (let i = 1; i < xGrid.length; i++) {
        if ((c1[i - 1] - c2[i - 1]) * (c1[i] - c2[i]) <= 0) {
          const prevDiff = c1[i - 1] - c2[i - 1];
          const currDiff = c1[i] - c2[i];
          const denom = prevDiff - currDiff;
          const frac = Math.abs(denom) > 1e-6 ? prevDiff / denom : 0.5;
          const stepX = xGrid[i] - xGrid[i - 1];
          const xCross = xGrid[i - 1] + frac * stepX;
          const yCross = c1[i - 1] + frac * (c1[i] - c1[i - 1]);
          intersection = {
            x: Number(xCross.toFixed(2)),
            y: Number(yCross.toFixed(2)),
          };
          break;
        }
      }
    }

    return {
      curveSeries,
      intersection,
      p1,
      p2,
      p3,
    };
  }, [model, sliderValues, slidersList]);

  // Render / Update Plotly.js Chart on Pitch-Black (#000000) Canvas with High-Contrast Neon Lines
  useEffect(() => {
    const container = plotContainerRef.current;
    if (
      !container ||
      !model ||
      model.isGraphCanonical === false ||
      !computedPlotData ||
      !window.Plotly
    ) {
      return;
    }

    const globalChartType = model.chartType || "line";
    const cleanXAxisLabel = formatPlotlyAxisText(model.xAxisLabel || "x");
    const cleanYAxisLabel = formatPlotlyAxisText(model.yAxisLabel || "y");
    const cleanEquilibriumLabel = formatPlotlyAxisText(
      model.equilibriumLabel || "Equilibrium E*"
    );

    const traces: any[] = computedPlotData.curveSeries.map(
      ({ curve, xValues, yValues }) => {
        const cleanTraceName = formatPlotlyAxisText(curve.name);
        const isBar =
          curve.traceType === "bar" ||
          (globalChartType === "bar" && !curve.traceType);
        const isScatterMarkers =
          curve.traceType === "markers" ||
          (globalChartType === "scatter" && curve.traceType === "markers");
        const isLinesAndMarkers =
          curve.traceType === "lines+markers" ||
          (curve.expressionType === "explicit_points" && xValues.length <= 12 && !isBar);

        if (isBar) {
          return {
            x: xValues,
            y: yValues,
            type: "bar",
            name: cleanTraceName,
            marker: {
              color: curve.color || "#00ff9d",
              line: {
                color: "#00ff9d",
                width: 1,
              },
            },
            hovertemplate: `<b>${cleanTraceName}</b><br>${cleanXAxisLabel}: %{x}<br>${cleanYAxisLabel}: %{y:.2f}<extra></extra>`,
          };
        }

        return {
          x: xValues,
          y: yValues,
          type: "scatter",
          mode: isScatterMarkers
            ? "markers"
            : isLinesAndMarkers
            ? "lines+markers"
            : "lines",
          name: cleanTraceName,
          line: {
            color: curve.color || "#00ff9d",
            width: 3,
            dash:
              curve.lineStyle === "dash"
                ? "dash"
                : curve.lineStyle === "dot"
                ? "dot"
                : "solid",
          },
          marker: {
            color: curve.color || "#00ff9d",
            size: isScatterMarkers ? 8 : 6,
          },
          hovertemplate: `<b>${cleanTraceName}</b><br>${cleanXAxisLabel}: %{x:.2f}<br>${cleanYAxisLabel}: %{y:.2f}<extra></extra>`,
        };
      }
    );

    if (computedPlotData.intersection) {
      traces.push({
        x: [computedPlotData.intersection.x],
        y: [computedPlotData.intersection.y],
        type: "scatter",
        mode: "markers+text",
        name: cleanEquilibriumLabel,
        text: [
          `E*(${computedPlotData.intersection.x}, ${computedPlotData.intersection.y})`,
        ],
        textposition: "top right",
        textfont: {
          family: "JetBrains Mono, monospace",
          size: 11,
          color: "#00ff9d",
        },
        marker: {
          color: "#00ff9d",
          size: 10,
          line: {
            color: "#000000",
            width: 2,
          },
        },
        hovertemplate: `<b>${cleanEquilibriumLabel}</b><br>x* = %{x:.2f}<br>y* = %{y:.2f}<extra></extra>`,
      });
    }

    // Always keep the Plotly rendering pitch-black (#000000) with high-contrast neon lines
    const paperBg = "#000000";
    const plotBg = "#000000";
    const textColor = "#f5f5f5";
    const gridColor = "#161616";
    const axisLineColor = "#333333";

    const layout = {
      autosize: true,
      height: 360,
      margin: { l: 58, r: 24, t: 30, b: 54 },
      paper_bgcolor: paperBg,
      plot_bgcolor: plotBg,
      font: {
        family: "Plus Jakarta Sans, sans-serif",
        color: textColor,
        size: 12,
      },
      xaxis: {
        title: {
          text: cleanXAxisLabel,
          font: { size: 12, color: textColor },
        },
        gridcolor: gridColor,
        zerolinecolor: axisLineColor,
        linecolor: axisLineColor,
        tickfont: { family: "JetBrains Mono, monospace", size: 11, color: "#d4d4d4" },
      },
      yaxis: {
        title: {
          text: cleanYAxisLabel,
          font: { size: 12, color: textColor },
        },
        gridcolor: gridColor,
        zerolinecolor: axisLineColor,
        linecolor: axisLineColor,
        tickfont: { family: "JetBrains Mono, monospace", size: 11, color: "#d4d4d4" },
      },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "left",
        x: 0,
        font: { size: 11, color: textColor },
        bgcolor: "transparent",
      },
      hovermode: "closest",
    };

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: [
        "select2d",
        "lasso2d",
        "autoScale2d",
        "toggleSpikelines",
      ],
    };

    window.Plotly.react(container, traces, layout, config).then(() => {
      triggerKaTeXRenderInElement(labSectionRef.current);
    });
    triggerKaTeXRenderInElement(labSectionRef.current);
  }, [model, computedPlotData]);

  // Explicitly trigger KaTeX rendering on the graph & custom legend/slider container whenever model or sliders update
  useEffect(() => {
    triggerKaTeXRenderInElement(labSectionRef.current);
  }, [model, sliderValues, lastShiftNote]);

  const handleResetSliders = () => {
    if (!model || !Array.isArray(model.parameterSliders)) return;
    const defaults: SliderValuesMap = {};
    for (const s of model.parameterSliders) {
      defaults[s.id] = s.defaultValue;
    }
    onChangeSliderValues(defaults);
  };

  // Empty State: On-Demand "📊 Generate Interactive Model" Button
  if (!model && !isGeneratingModel) {
    return (
      <section className={`${panelClass} border rounded-lg p-8 text-center space-y-4`}>
        <div className="w-11 h-11 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center mx-auto">
          <BarChart3 className="w-5 h-5 text-[#10b981]" />
        </div>

        <div className="space-y-1.5 max-w-lg mx-auto">
          <h3 className="text-base font-bold tracking-tight">
            Textbook Economic Graph Engine (Plotly.js)
          </h3>
          <p className={`text-xs sm:text-sm leading-relaxed ${mutedTextClass}`}>
            Evaluates whether a canonical textbook diagram applies to{" "}
            <span className="font-semibold text-[#10b981]">{subtopic}</span> and renders a
            mathematically anchored Plotly.js graph (static by default; interactive sliders only for comparative statics).
          </p>
        </div>

        {modelError && (
          <p className="text-xs text-red-400 max-w-md mx-auto">{modelError}</p>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={onGenerateModel}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-[#050505] rounded-md transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>📊 Generate Interactive Model</span>
          </button>
        </div>
      </section>
    );
  }

  // Loading State
  if (isGeneratingModel && !model) {
    return (
      <section className={`${panelClass} border rounded-lg p-10 text-center space-y-3`}>
        <RefreshCw className="w-6 h-6 text-[#10b981] animate-spin mx-auto" />
        <h3 className="text-base font-semibold">
          Running Strict Necessity Gateway & Textbook Calibration...
        </h3>
        <p className={`text-xs ${mutedTextClass} max-w-md mx-auto`}>
          Verifying canonical textbook model availability and mathematical coordinates for{" "}
          <span className="font-semibold">{subtopic}</span>.
        </p>
      </section>
    );
  }

  if (!model) return null;

  // STRICT NECESSITY GATEWAY: Non-Canonical Graph State
  if (model.isGraphCanonical === false) {
    return (
      <section className="bg-[#000000] border border-[#222222] text-[#f5f5f5] rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  Strict Necessity Gateway
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  isGraphCanonical: false
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-[#f5f5f5] mt-1">
                {model.message ||
                  "No standard economic graph is required for this concept."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerateModel}
              disabled={isGeneratingModel}
              className="px-2.5 py-1.5 text-xs font-medium border border-[#222222] bg-[#0a0a0a] text-neutral-300 hover:border-[#10b981] rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Re-evaluate topic"
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  isGeneratingModel ? "animate-spin text-[#10b981]" : ""
                }`}
              />
              <span>Re-evaluate</span>
            </button>
            <button
              type="button"
              onClick={onDeleteModelCache}
              className="p-1.5 text-xs border border-[#222222] bg-[#0a0a0a] text-neutral-400 hover:text-red-400 hover:border-red-500/60 rounded transition-colors cursor-pointer"
              title="Clear cached graph evaluation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={labSectionRef}
      className={`${panelClass} border rounded-lg p-6 space-y-5`}
    >
      {/* Header Bar with Textbook Model Reference & Adaptive Complexity Badges */}
      <div
        className={`flex flex-wrap items-start justify-between gap-4 pb-4 border-b ${borderClass}`}
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {model.modelReference && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40">
                <BookMarked className="w-3 h-3 shrink-0" />
                <span>Textbook Reference: {model.modelReference}</span>
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                hasSliders
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                  : "bg-neutral-800 text-neutral-300 border-neutral-700"
              }`}
            >
              {hasSliders ? (
                <>
                  <Sliders className="w-2.5 h-2.5" />
                  <span>Comparative Statics (Interactive)</span>
                </>
              ) : (
                <>
                  <Lock className="w-2.5 h-2.5" />
                  <span>Canonical Static {model.chartType ? `(${model.chartType})` : "Plot"}</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <BarChart3 className="w-4 h-4 text-[#10b981] shrink-0" />
            <h3 className="text-base font-semibold">
              <RichMathText text={model.title || model.modelReference || subtopic} />
            </h3>
          </div>
          {model.subtitle && (
            <p className={`text-xs ${mutedTextClass}`}>
              <RichMathText text={model.subtitle} />
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasSliders && (
            <button
              type="button"
              onClick={handleResetSliders}
              className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1 cursor-pointer ${subPanelClass} hover:border-[#10b981]`}
              title="Reset sliders to baseline equilibrium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sliders</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGenerateModel}
            disabled={isGeneratingModel}
            className={`px-2.5 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer ${subPanelClass} hover:border-[#10b981]`}
            title="Regenerate textbook model"
          >
            <RefreshCw
              className={`w-3 h-3 ${
                isGeneratingModel ? "animate-spin text-[#10b981]" : ""
              }`}
            />
            <span>{isGeneratingModel ? "Updating..." : "Regenerate"}</span>
          </button>

          <button
            type="button"
            onClick={onDeleteModelCache}
            className={`p-1.5 text-xs border rounded transition-colors text-red-400 hover:border-red-500/60 cursor-pointer ${subPanelClass}`}
            title="Delete cached model for this topic"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {lastShiftNote && (
        <div className="px-3 py-2 rounded border border-[#10b981]/40 bg-[#10b981]/10 text-xs text-[#10b981]">
          <RichMathText text={`AI Graph Update: ${lastShiftNote}`} />
        </div>
      )}

      {/* Pitch-Black (#000000) Plotly.js Canvas with High-Contrast Neon Lines */}
      <div className="bg-[#000000] border border-[#222222] rounded-md p-2 overflow-hidden">
        <div ref={plotContainerRef} className="w-full min-h-[360px]" />
      </div>

      {/* Curve Equations & Live Equilibrium Readout (Custom HTML Legend with KaTeX Rendering) */}
      {Array.isArray(model.curves) && model.curves.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {model.curves.map((c, idx) => {
              const dotColor =
                c.color && c.color.startsWith("#")
                  ? c.color
                  : HIGH_CONTRAST_NEONS[idx % HIGH_CONTRAST_NEONS.length];
              return (
                <div
                  key={c.id || idx}
                  className="px-2.5 py-1.5 rounded border border-[#222222] bg-[#000000] text-[#f5f5f5] flex items-center gap-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="font-medium">
                    <RichMathText text={c.name} />:
                  </span>
                  <MathFormula latex={c.formulaLatex} displayMode={false} />
                </div>
              );
            })}
          </div>

          {computedPlotData?.intersection && (
            <div className="px-3 py-1 rounded border border-[#00ff9d]/40 bg-[#000000] text-[#00ff9d] font-mono tabular-nums">
              <RichMathText text={model.equilibriumLabel || "Equilibrium"} />: (
              {computedPlotData.intersection.x}, {computedPlotData.intersection.y})
            </div>
          )}
        </div>
      )}

      {/* Conditional Interactive HTML Range Sliders (Rendered ONLY for Dynamic Comparative Statics) */}
      {hasSliders && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {slidersList.map((slider) => {
            const val = sliderValues[slider.id] ?? slider.defaultValue;
            return (
              <div
                key={slider.id}
                className={`p-3.5 rounded border space-y-2 ${subPanelClass}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    <RichMathText text={slider.label} />
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-[#10b981]">
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
                  className="w-full accent-[#10b981] h-1.5 rounded cursor-pointer"
                />
                <div
                  className={`flex justify-between text-[10px] font-mono ${mutedTextClass}`}
                >
                  <span>Min: {slider.min}</span>
                  <span>Default: {slider.defaultValue}</span>
                  <span>Max: {slider.max}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparative Statics / Textbook Interpretation */}
      {model.comparativeStaticsNote && (
        <div
          className={`pt-3 border-t ${borderClass} text-xs leading-relaxed ${mutedTextClass}`}
        >
          <strong className="font-semibold text-[#10b981] mr-1.5">
            {hasSliders ? "Comparative Statics Guide:" : "Textbook Model Note:"}
          </strong>
          <RichMathText text={model.comparativeStaticsNote} />
        </div>
      )}
    </section>
  );
};
