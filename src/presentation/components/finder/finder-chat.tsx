"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Check, ImageOff, RotateCcw, Send, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getRecommendations,
  type FinderInput,
  type FinderResult,
} from "@/app/[locale]/buscador/actions";
import { Button, Card, CardBody, Input, Tag } from "@/presentation/components/ui";
import { formatPrice } from "@/presentation/lib/format";
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

export function FinderChat({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const t = useTranslations("finder");
  const tEnums = useTranslations("enums");
  const locale = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState<FinderInput>(emptyInput);
  const [result, setResult] = useState<FinderResult | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pasos visibles según las respuestas actuales (ramas del árbol).
  const steps = visibleQuestions(input);
  const step: Question | undefined = steps[stepIndex];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history, result, pending]);

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
    startTransition(async () => {
      try {
        setResult(await getRecommendations(finalInput));
      } catch {
        setError(true);
      }
    });
  }

  function restart() {
    setStepIndex(0);
    setHistory([]);
    setInput(emptyInput);
    setResult(null);
    setError(false);
  }

  const totalSteps = steps.length;
  const progress = Math.min(stepIndex + 1, totalSteps);

  return (
    <div className="mx-auto max-w-2xl">
      {result === null && !error && (
        <ProgressBar current={progress} total={totalSteps} label={t("progressLabel")} />
      )}

      <div className="space-y-4" aria-live="polite" aria-atomic="false">
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

        {pending && <ThinkingBubble />}

        {error && (
          <div className="space-y-3 pl-10">
            <p className="text-sm text-danger">{t("error")}</p>
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw size={14} aria-hidden />
              {t("restart")}
            </Button>
          </div>
        )}

        {result !== null && (
          <Results result={result} t={t} tEnums={tEnums} locale={locale} onRestart={restart} />
        )}

        <div ref={bottomRef} />
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
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95",
                on
                  ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm"
                  : "glass text-text hover:border-primary/50 hover:text-primary",
              ].join(" ")}
            >
              {on && <Check size={14} aria-hidden />}
              {t(opt.labelKey)}
            </button>
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
            <button
              key={b.slug}
              type="button"
              onClick={() => toggle(b.slug)}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95",
                on
                  ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm"
                  : "glass text-text hover:border-primary/50 hover:text-primary",
              ].join(" ")}
            >
              {on && <Check size={13} aria-hidden />}
              {b.name}
            </button>
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
}: {
  result: FinderResult;
  t: TFn;
  tEnums: TFn;
  locale: string;
  onRestart: () => void;
}) {
  return (
    <div className="space-y-4">
      <ChatBubble role="bot">
        {result.recommendations.length > 0 ? t("resultsTitle") : t("noResults")}
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
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
        <Button variant="ghost" size="sm" onClick={onRestart}>
          <RotateCcw size={14} aria-hidden />
          {t("restart")}
        </Button>
      </div>
    </div>
  );
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

function ThinkingBubble() {
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
          {messages[idx]}
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
