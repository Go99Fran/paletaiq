"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Check, ImageOff, RotateCcw, Send, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getRecommendations,
  refineRecommendations,
  type FinderInput,
  type FinderResult,
  type RefinementFeedbackInput,
} from "@/app/[locale]/buscador/actions";
import { Button, Card, CardBody, Input, Tag, ToggleChip } from "@/presentation/components/ui";
import { formatPrice } from "@/presentation/lib/format";
import { useCompare } from "@/presentation/components/compare/use-compare";
import { useTypewriter } from "./use-typewriter";
import { visibleQuestions, type Question } from "./question-tree";
import { DualRangeSlider } from "./dual-range-slider";

const BUDGET_MIN = 0;
const BUDGET_MAX = 1_000_000;
const BUDGET_STEP = 50_000;

const emptyInput: FinderInput = {
  level: "",
  playStyle: "",
  bodyProfile: null,
  journey: null,
  frequency: null,
  matchPace: null,
  hasInjuries: false,
  injuryAreas: [],
  injuryNotes: null,
  strengthPref: null,
  improveGoals: [],
  sweetSpotTolerance: null,
  durability: null,
  balancePref: null,
  hardnessPref: null,
  facePref: null,
  spinImportant: false,
  previousPaddle: null,
  previousPains: [],
  brandSlugs: [],
  freeText: null,
  budgetMin: null,
  budgetMax: null,
};

interface ChatEntry {
  question: string;
  answer: string;
}

const MAX_REFINEMENTS = 4;
const RESULT_INTRO_VARIANTS = [
  "resultsIntro1",
  "resultsIntro2",
  "resultsIntro3",
] as const;

export function FinderChat({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const t = useTranslations("finder");
  const tEnums = useTranslations("enums");
  const locale = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState<FinderInput>(emptyInput);
  const [result, setResult] = useState<FinderResult | null>(null);
  const [refinementCount, setRefinementCount] = useState(0);
  const [feedback, setFeedback] = useState<RefinementFeedbackInput>({ shownPaddleIds: [] });
  const [resultIntroVariant, setResultIntroVariant] = useState<(typeof RESULT_INTRO_VARIANTS)[number]>(
    RESULT_INTRO_VARIANTS[0],
  );
  const [isRefining, setIsRefining] = useState(false);
  const [showResultsWhileRefining, setShowResultsWhileRefining] = useState(true);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pasos visibles según las respuestas actuales (ramas del árbol).
  const steps = visibleQuestions(input);
  const step: Question | undefined = steps[stepIndex];

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  useLayoutEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

    const raf1 = requestAnimationFrame(() => scrollToBottom(behavior));
    // Segundo frame para casos donde el layout termina de crecer por animación/typing.
    const raf2 = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [history, result, pending, isRefining, stepIndex, showResultsWhileRefining]);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      scrollToBottom("auto");
    });
    observer.observe(contentEl);

    return () => observer.disconnect();
  }, []);

  /** Registra la respuesta en el historial y avanza al siguiente paso visible. */
  function commit(answerLabel: string, patch: Partial<FinderInput>) {
    if (!step) return;
    const nextInput = { ...input, ...patch };
    const nextSteps = visibleQuestions(nextInput);
    const wasLast = stepIndex >= steps.length - 1;

    setHistory((h) => [...h, { question: t(step.questionKey), answer: answerLabel }]);
    setInput(nextInput);

    if (wasLast) {
      runRecommendation(nextInput);
      return;
    }
    // El índice puede correrse si una rama agregó/quitó pasos: reubicamos en el
    // siguiente paso cuyo id no esté ya respondido (avanzamos al actual + 1 de la
    // nueva lista visible).
    const currentId = step.id;
    const idxInNext = nextSteps.findIndex((s) => s.id === currentId);
    setStepIndex(idxInNext >= 0 ? idxInNext + 1 : stepIndex + 1);
  }

  function runRecommendation(finalInput: FinderInput) {
    setError(false);
    setIsRefining(false);
    setShowResultsWhileRefining(true);
    startTransition(async () => {
      try {
        const next = await getRecommendations(finalInput);
        setResult(next);
        setRefinementCount(0);
        setFeedback({ shownPaddleIds: next.recommendations.map((r) => r.paddleId) });
        setResultIntroVariant(RESULT_INTRO_VARIANTS[Math.floor(Math.random() * RESULT_INTRO_VARIANTS.length)]);
      } catch {
        setError(true);
      }
    });
  }

  function runRefinement(nextFeedback: RefinementFeedbackInput) {
    if (result === null) return;
    setError(false);
    setIsRefining(true);
    setShowResultsWhileRefining(false);
    startTransition(async () => {
      try {
        const refined = await refineRecommendations(input, nextFeedback);
        setResult(refined);
        setRefinementCount((c) => c + 1);
        setFeedback(nextFeedback);
        setResultIntroVariant(RESULT_INTRO_VARIANTS[Math.floor(Math.random() * RESULT_INTRO_VARIANTS.length)]);
        setShowResultsWhileRefining(true);
      } catch {
        setError(true);
      } finally {
        setIsRefining(false);
      }
    });
  }

  function restart() {
    setStepIndex(0);
    setHistory([]);
    setInput(emptyInput);
    setResult(null);
    setRefinementCount(0);
    setFeedback({ shownPaddleIds: [] });
    setIsRefining(false);
    setShowResultsWhileRefining(true);
    setError(false);
  }

  const totalSteps = steps.length;
  const progress = Math.min(stepIndex + 1, totalSteps);

  return (
    <div className="mx-auto max-w-2xl">
      {result === null && !error && (
        <ProgressBar current={progress} total={totalSteps} label={t("progressLabel")} />
      )}

      <div
        ref={viewportRef}
        className="h-[68vh] min-h-[420px] max-h-[760px] overflow-y-auto rounded-2xl border border-border/70 bg-surface/45 px-2 py-3 sm:h-[70vh] sm:px-4"
        aria-live="polite"
        aria-atomic="false"
      >
        <div ref={contentRef} className="space-y-4">
        {history.map((entry, i) => (
          <div key={i} className="space-y-2">
            <ChatBubble role="bot">{entry.question}</ChatBubble>
            <ChatBubble role="user">{entry.answer}</ChatBubble>
          </div>
        ))}

        {result === null && !pending && !error && step && (
          <ActiveQuestion key={step.id} question={t(step.questionKey)} hint={step.hintKey ? t(step.hintKey) : null}>
            <StepControls step={step} brands={brands} onAnswer={commit} t={t} locale={locale} />
          </ActiveQuestion>
        )}

        {pending && <ThinkingBubble message={isRefining ? t("refineThinking") : undefined} />}

        {error && (
          <div className="space-y-3 pl-10">
            <p className="text-sm text-danger">{t("error")}</p>
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw size={14} aria-hidden />
              {t("restart")}
            </Button>
          </div>
        )}

        {result !== null && showResultsWhileRefining && (
          <Results
            result={result}
            t={t}
            tEnums={tEnums}
            locale={locale}
            onRestart={restart}
            onRefine={runRefinement}
            refinementCount={refinementCount}
            resultIntroVariant={resultIntroVariant}
            feedback={feedback}
            brands={brands}
          />
        )}

        <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Controles por tipo ----------------------------- */

type TFn = (key: string, values?: Record<string, string | number>) => string;

function StepControls({
  step,
  brands,
  onAnswer,
  t,
  locale,
}: {
  step: Question;
  brands: Array<{ slug: string; name: string }>;
  onAnswer: (label: string, patch: Partial<FinderInput>) => void;
  t: TFn;
  locale: string;
}) {
  // single / scale / yesno: una opción dispara la respuesta.
  if (step.kind === "single" || step.kind === "scale" || step.kind === "yesno") {
    return (
      <div className="flex flex-wrap gap-2 pl-10">
        {step.options?.map((opt, i) => (
          <OptionButton
            key={opt.value || opt.labelKey}
            label={t(opt.labelKey)}
            desc={opt.descKey ? t(opt.descKey) : undefined}
            delay={i * 60}
            onClick={() => onAnswer(t(opt.labelKey), patchForSingle(step, opt.value))}
          />
        ))}
      </div>
    );
  }

  if (step.kind === "multi") {
    return (
      <MultiSelect
        step={step}
        t={t}
        onConfirm={(values, labels) => onAnswer(labels.join(", ") || t("skip"), patchForMulti(step, values))}
      />
    );
  }

  if (step.kind === "brands") {
    return (
      <BrandSelect
        brands={brands}
        t={t}
        onConfirm={(slugs, names) =>
          onAnswer(names.join(", ") || t("noBrandPref"), { brandSlugs: slugs })
        }
      />
    );
  }

  if (step.kind === "previous") {
    return <PreviousInput t={t} onAnswer={(text) => onAnswer(text || t("skip"), { previousPaddle: text || null })} />;
  }

  if (step.kind === "text") {
    return <FreeTextInput t={t} onAnswer={(text) => onAnswer(text || t("skip"), { freeText: text || null })} />;
  }

  if (step.kind === "budget") {
    return <BudgetInput t={t} locale={locale} onAnswer={onAnswer} />;
  }

  return null;
}

function patchForSingle(step: Question, value: string): Partial<FinderInput> {
  switch (step.id) {
    case "level":
      return { level: value };
    case "journey":
      return { journey: value || null };
    case "bodyProfile":
      return { bodyProfile: value || null };
    case "frequency":
      return { frequency: value ? Number(value) : null };
    case "playStyle":
      return { playStyle: value };
    case "matchPace":
      return { matchPace: value || null };
    case "injuries":
      return { hasInjuries: value === "yes" };
    case "strength":
      return { strengthPref: value || null };
    case "balancePref":
      return { balancePref: value || null };
    case "hardnessPref":
      return { hardnessPref: value || null };
    case "sweetSpot":
      return { sweetSpotTolerance: value || null };
    case "comfortVsPunch":
      // Traduce sin jerga: comodidad -> objetivo comfort; pegada -> potencia.
      return value === "comfort" ? { improveGoals: ["comfort"] } : { improveGoals: ["power"] };
    case "durability":
      return { durability: value || null };
    default:
      return {};
  }
}

function patchForMulti(step: Question, values: string[]): Partial<FinderInput> {
  switch (step.id) {
    case "injuryAreas":
      return { injuryAreas: values };
    case "improveGoals":
      return { improveGoals: values };
    case "previousPains":
      return { previousPains: values };
    default:
      return {};
  }
}

function OptionButton({
  label,
  desc,
  delay,
  onClick,
}: {
  label: string;
  desc?: string;
  delay: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="glass animate-rise-slide flex flex-col items-start rounded-xl px-4 py-2.5 text-left text-sm font-medium text-text transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-90 active:transition-none"
    >
      {label}
      {desc && <span className="mt-0.5 text-xs font-normal text-muted">{desc}</span>}
    </button>
  );
}

function MultiSelect({
  step,
  t,
  onConfirm,
}: {
  step: Question;
  t: TFn;
  onConfirm: (values: string[], labels: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const max = step.maxSelect ?? Infinity;

  function toggle(value: string) {
    setSelected((s) => {
      if (s.includes(value)) return s.filter((v) => v !== value);
      if (s.length >= max) return s; // respeta maxSelect
      return [...s, value];
    });
  }

  const labelOf = (value: string) =>
    t(step.options?.find((o) => o.value === value)?.labelKey ?? value);

  return (
    <div className="space-y-3 pl-10">
      <div className="flex flex-wrap gap-2">
        {step.options?.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <ToggleChip key={opt.value} active={on} onClick={() => toggle(opt.value)} className="px-4 py-2">
              {on && <Check size={14} aria-hidden />}
              {t(opt.labelKey)}
            </ToggleChip>
          );
        })}
      </div>
      <Button size="sm" onClick={() => onConfirm(selected, selected.map(labelOf))}>
        {selected.length > 0 ? t("continue") : step.optional ? t("skip") : t("continue")}
      </Button>
    </div>
  );
}

function BrandSelect({
  brands,
  t,
  onConfirm,
}: {
  brands: Array<{ slug: string; name: string }>;
  t: TFn;
  onConfirm: (slugs: string[], names: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((v) => v !== slug) : s.length >= 6 ? s : [...s, slug]));
  }

  return (
    <div className="space-y-3 pl-10">
      <div className="flex flex-wrap gap-2">
        {brands.map((b) => {
          const on = selected.includes(b.slug);
          return (
            <ToggleChip key={b.slug} active={on} onClick={() => toggle(b.slug)}>
              {on && <Check size={13} aria-hidden />}
              {b.name}
            </ToggleChip>
          );
        })}
      </div>
      <Button
        size="sm"
        variant={selected.length > 0 ? "primary" : "glass"}
        onClick={() => onConfirm(selected, selected.map((s) => brands.find((b) => b.slug === s)?.name ?? s))}
      >
        {selected.length > 0 ? t("continue") : t("noBrandPref")}
      </Button>
    </div>
  );
}

function PreviousInput({ t, onAnswer }: { t: TFn; onAnswer: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex gap-2 pl-10"
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(text.trim());
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("previousPlaceholder")} />
      <Button type="submit" size="md">
        <Send size={14} aria-hidden />
        {text.trim() ? t("send") : t("skip")}
      </Button>
    </form>
  );
}

function FreeTextInput({ t, onAnswer }: { t: TFn; onAnswer: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="space-y-2 pl-10"
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(text.trim());
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={t("freeTextPlaceholder")}
        className="w-full resize-none rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text backdrop-blur-sm transition-colors focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary/25"
      />
      <Button type="submit" size="sm">
        {text.trim() ? t("send") : t("skip")}
      </Button>
    </form>
  );
}

function BudgetInput({
  t,
  locale,
  onAnswer,
}: {
  t: TFn;
  locale: string;
  onAnswer: (label: string, patch: Partial<FinderInput>) => void;
}) {
  const [range, setRange] = useState({ min: 150_000, max: 600_000 });
  const [noLimit, setNoLimit] = useState(false);

  function submit() {
    const min = range.min > BUDGET_MIN ? range.min : null;
    const max = noLimit ? null : range.max;
    const label = noLimit
      ? `${min ? formatPrice(min, "ARS", locale) : formatPrice(0, "ARS", locale)} — ${t("budgetNoLimit")}`
      : `${formatPrice(range.min, "ARS", locale)} — ${formatPrice(range.max, "ARS", locale)}`;
    onAnswer(label, { budgetMin: min, budgetMax: max });
  }

  return (
    <div className="space-y-4 pl-10">
      <div className="flex items-center justify-between text-sm font-semibold text-text">
        <span>{formatPrice(range.min, "ARS", locale)}</span>
        <span>{noLimit ? t("budgetNoLimit") : formatPrice(range.max, "ARS", locale)}</span>
      </div>
      <DualRangeSlider
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={BUDGET_STEP}
        valueMin={range.min}
        valueMax={range.max}
        onChange={setRange}
        labelMin={t("budgetMin")}
        labelMax={t("budgetMax")}
      />
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={noLimit}
          onChange={(e) => setNoLimit(e.target.checked)}
          className="accent-primary"
        />
        {t("budgetNoLimitToggle")}
      </label>
      <Button onClick={submit}>
        <Sparkles size={16} aria-hidden />
        {t("getResults")}
      </Button>
    </div>
  );
}

/* ----------------------------- Resultados ----------------------------- */

function Results({
  result,
  t,
  tEnums,
  locale,
  onRestart,
  onRefine,
  refinementCount,
  resultIntroVariant,
  feedback,
  brands,
}: {
  result: FinderResult;
  t: TFn;
  tEnums: TFn;
  locale: string;
  onRestart: () => void;
  onRefine: (feedback: RefinementFeedbackInput) => void;
  refinementCount: number;
  resultIntroVariant: "resultsIntro1" | "resultsIntro2" | "resultsIntro3";
  feedback: RefinementFeedbackInput;
  brands: Array<{ slug: string; name: string }>;
}) {
  const [freeFeedback, setFreeFeedback] = useState("");
  const [wantCheaper, setWantCheaper] = useState(false);
  const [wantMorePower, setWantMorePower] = useState(false);
  const [wantMoreControl, setWantMoreControl] = useState(false);
  const [wantLighter, setWantLighter] = useState(false);
  // "Ninguna me convence": pide otra tanda distinta a las ya mostradas, sin forzar
  // dirección (las shownPaddleIds ya se excluyen en runRefine). Toggle independiente.
  const [wantDifferent, setWantDifferent] = useState(false);
  const [excludeBrandSlugs, setExcludeBrandSlugs] = useState<string[]>([]);

  // brandSlug viene directo del backend (antes se matcheaba por nombre exacto y podía fallar).
  const seenBrandSlugs = [...new Set(result.recommendations.map((r) => r.brandSlug))];

  const feedbackHint = buildRefinementIntro(
    t,
    { wantCheaper, wantMorePower, wantMoreControl, wantLighter, excludeBrandSlugs, freeFeedback },
    brands,
  );

  const canRefine = refinementCount < MAX_REFINEMENTS;
  const { clear, toggle } = useCompare();

  const runRefine = () => {
    const shownPaddleIds = [
      ...(feedback.shownPaddleIds ?? []),
      ...result.recommendations.map((r) => r.paddleId),
    ];

    onRefine({
      shownPaddleIds,
      wantCheaper,
      wantMorePower,
      wantMoreControl,
      wantLighter,
      excludeBrandSlugs,
      freeFeedback: freeFeedback.trim() || null,
    });
  };

  const compareLink =
    result.recommendations.length > 0
      ? `/comparar?p=${result.recommendations.map((r) => encodeURIComponent(r.slug)).join(",")}`
      : "/comparar";

  return (
    <div className="space-y-4">
      <ChatBubble role="bot">
        {result.recommendations.length > 0 ? t(resultIntroVariant) : t("noResults")}
      </ChatBubble>

      {result.recommendations.length > 0 && result.budgetExpandedToMax !== null && (
        <div className="glass mx-0 rounded-xl border border-tertiary/40 px-3 py-2 text-xs text-text sm:mx-10">
          <p>
            {result.budgetExpandedToMax === -1
              ? t("budgetRemoved")
              : t("budgetExpanded", { max: formatPrice(result.budgetExpandedToMax, "ARS", locale) })}
          </p>
        </div>
      )}
      {result.heuristic && result.recommendations.length > 0 && (
        <div className="glass mx-0 rounded-xl border border-primary/30 px-3 py-2 text-xs text-text sm:mx-10">
          <p>{t("heuristicNote")}</p>
        </div>
      )}

      <div className="space-y-3 sm:pl-10">
        {result.recommendations.map((rec, i) => (
          <Card
            key={rec.slug}
            interactive
            className="animate-rise"
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <CardBody className="flex gap-4">
              <div className="relative hidden h-28 w-24 shrink-0 sm:block">
                {rec.imageUrl ? (
                  <Image src={rec.imageUrl} alt={rec.name} fill sizes="96px" className="object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center text-muted">
                    <ImageOff size={24} aria-hidden />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                      rec.rank === 1
                        ? "glow-pulse bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm shadow-primary/30"
                        : rec.rank === 2
                          ? "bg-secondary text-secondary-foreground"
                          : "glass text-text",
                    ].join(" ")}
                  >
                    #{rec.rank}
                  </span>
                  {rec.rank === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                      <Sparkles size={11} aria-hidden />
                      {t("bestMatch")}
                    </span>
                  )}
                  <p className="text-xs uppercase tracking-wide text-muted">{rec.brandName}</p>
                </div>
                <p className="mt-0.5 font-semibold text-text">{rec.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rec.shape && <Tag>{tEnums(`shape.${rec.shape}`)}</Tag>}
                  {rec.playStyle && <Tag>{tEnums(`playStyle.${rec.playStyle}`)}</Tag>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text">{rec.reason}</p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {rec.bestPrice !== null ? (
                    <span className="font-bold text-text">
                      {formatPrice(rec.bestPrice, rec.bestPriceCurrency ?? "ARS", locale)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Link href={`/paletas/${rec.slug}`}>
                    <Button variant="secondary" size="sm">
                      {t("viewDetail")}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sm:pl-10">
        <div className="flex flex-wrap gap-2">
          <Link href={compareLink}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                clear();
                for (const r of result.recommendations.slice(0, 4)) {
                  toggle(r.slug);
                }
              }}
            >
              {t("compareThese")}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onRestart}>
            <RotateCcw size={14} aria-hidden />
            {t("restart")}
          </Button>
        </div>
      </div>

      <div className="space-y-3 sm:pl-10">
        <ChatBubble role="bot">{feedbackHint}</ChatBubble>

        <div className="flex flex-wrap gap-2">
          <QuickChip active={wantCheaper} onClick={() => setWantCheaper((v) => !v)} label={t("refineChipCheaper")} />
          <QuickChip active={wantMorePower} onClick={() => setWantMorePower((v) => !v)} label={t("refineChipMorePower")} />
          <QuickChip active={wantMoreControl} onClick={() => setWantMoreControl((v) => !v)} label={t("refineChipMoreControl")} />
          <QuickChip active={wantLighter} onClick={() => setWantLighter((v) => !v)} label={t("refineChipLighter")} />
          <QuickChip active={wantDifferent} onClick={() => setWantDifferent((v) => !v)} label={t("refineChipNoneConvinces")} />
          {seenBrandSlugs.map((slug) => (
            <QuickChip
              key={slug}
              active={excludeBrandSlugs.includes(slug)}
              onClick={() =>
                setExcludeBrandSlugs((s) =>
                  s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug],
                )
              }
              label={t("refineChipExcludeBrand", { brand: brands.find((b) => b.slug === slug)?.name ?? slug })}
            />
          ))}
        </div>

        <textarea
          value={freeFeedback}
          onChange={(e) => setFreeFeedback(e.target.value)}
          rows={3}
          maxLength={900}
          placeholder={t("refineFreePlaceholder")}
          className="w-full resize-none rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text backdrop-blur-sm transition-colors focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary/25"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={runRefine} disabled={!canRefine}>
            <Sparkles size={15} aria-hidden />
            {t("refineSearchAgain")}
          </Button>
          {!canRefine && <p className="text-xs text-muted">{t("refineLoopLimit")}</p>}
        </div>
      </div>
    </div>
  );
}

function QuickChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <ToggleChip active={active} onClick={onClick}>
      {label}
    </ToggleChip>
  );
}

function buildRefinementIntro(
  t: TFn,
  state: {
    wantCheaper: boolean;
    wantMorePower: boolean;
    wantMoreControl: boolean;
    wantLighter: boolean;
    excludeBrandSlugs: string[];
    freeFeedback: string;
  },
  brands: Array<{ slug: string; name: string }>,
): string {
  const tags: string[] = [];
  if (state.wantCheaper) tags.push(t("refineTagCheaper"));
  if (state.wantMorePower) tags.push(t("refineTagPower"));
  if (state.wantMoreControl) tags.push(t("refineTagControl"));
  if (state.wantLighter) tags.push(t("refineTagLighter"));
  if (state.excludeBrandSlugs.length > 0) {
    const names = state.excludeBrandSlugs.map((s) => brands.find((b) => b.slug === s)?.name ?? s).join(", ");
    tags.push(t("refineTagWithoutBrands", { brands: names }));
  }
  if (state.freeFeedback.trim().length > 0) tags.push(t("refineTagWithComment"));
  if (tags.length === 0) return t("refineIntroBase");
  return t("refineIntroWithContext", { context: tags.join(" · ") });
}

/* ----------------------------- Piezas de chat ----------------------------- */

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="glass animate-rise-soft mb-4 rounded-xl px-3 py-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="text-xs text-muted">
          {current}/{total}
        </p>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={[
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i === current - 1 ? "bg-tertiary" : i < current - 1 ? "bg-primary" : "bg-border",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function ActiveQuestion({
  question,
  hint,
  children,
}: {
  question: string;
  hint: string | null;
  children: React.ReactNode;
}) {
  const { shown, done, started } = useTypewriter(question);

  return (
    <div className="space-y-3">
      <div className="animate-slide-in-left flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-tertiary text-primary-foreground shadow-sm">
          <Bot size={16} aria-hidden />
        </span>
        <div className="glass min-h-[2.6rem] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text">
          {!started ? (
            <TypingDots />
          ) : (
            <>
              {shown}
              {!done && <span className="ml-0.5 inline-block w-1.5 animate-pulse">▌</span>}
            </>
          )}
        </div>
      </div>
      {done && hint && <p className="pl-10 text-xs text-muted">{hint}</p>}
      {done && <div className="animate-rise">{children}</div>}
    </div>
  );
}

function ThinkingBubble({ message }: { message?: string }) {
  const t = useTranslations("finder");
  const messages = [t("thinking1"), t("thinking2"), t("thinking3"), t("thinking4")];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 1800);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="animate-slide-in-left flex items-start gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-tertiary text-primary-foreground shadow-sm">
        <Sparkles size={15} aria-hidden className="animate-pulse" />
      </span>
      <div className="glass flex items-center gap-2.5 rounded-2xl rounded-tl-sm px-4 py-3">
        <TypingDots />
        <span key={idx} className="animate-rise-soft text-sm text-muted">
          {message ?? messages[idx]}
        </span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-dot-bounce h-1.5 w-1.5 rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

function ChatBubble({ role, children }: { role: "bot" | "user"; children: React.ReactNode }) {
  if (role === "bot") {
    return (
      <div className="animate-slide-in-left flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-tertiary text-primary-foreground shadow-sm">
          <Bot size={16} aria-hidden />
        </span>
        <p className="glass rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text">{children}</p>
      </div>
    );
  }
  return (
    <div className="animate-slide-in-right flex justify-end">
      <p className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-primary-hover px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
        {children}
      </p>
    </div>
  );
}
