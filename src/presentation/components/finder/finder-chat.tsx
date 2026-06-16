"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Bot, ImageOff, RotateCcw, Send, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getRecommendations,
  type FinderInput,
  type FinderResult,
} from "@/app/[locale]/buscador/actions";
import { Button, Card, CardBody, Input, Tag } from "@/presentation/components/ui";
import { formatPrice } from "@/presentation/lib/format";
import { useTypewriter } from "./use-typewriter";

type StepId =
  | "level"
  | "style"
  | "frequency"
  | "matchPace"
  | "injuries"
  | "injuryZone"
  | "strength"
  | "goal"
  | "sweetSpot"
  | "previous"
  | "budget";

const STEP_ORDER: StepId[] = [
  "level",
  "style",
  "frequency",
  "matchPace",
  "injuries",
  "injuryZone",
  "strength",
  "goal",
  "sweetSpot",
  "previous",
  "budget",
];

interface ChatEntry {
  question: string;
  answer: string;
}

const emptyInput: FinderInput = {
  level: "",
  playStyle: "",
  frequency: null,
  matchPace: null,
  hasInjuries: false,
  injuryArea: null,
  injuryNotes: null,
  strengthPref: null,
  improveGoal: null,
  sweetSpotTolerance: null,
  previousPaddle: null,
  budgetMin: null,
  budgetMax: null,
};

export function FinderChat() {
  const t = useTranslations("finder");
  const tEnums = useTranslations("enums");
  const locale = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState<FinderInput>(emptyInput);
  const [previousText, setPreviousText] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [result, setResult] = useState<FinderResult | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const step = STEP_ORDER[stepIndex];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history, result, pending]);

  const questionText: Record<StepId, string> = {
    level: t("qLevel"),
    style: t("qStyle"),
    frequency: t("qFrequency"),
    matchPace: t("qMatchPace"),
    injuries: t("qInjuries"),
    injuryZone: t("qInjuryZone"),
    strength: t("qStrength"),
    goal: t("qGoal"),
    sweetSpot: t("qSweetSpot"),
    previous: t("qPrevious"),
    budget: t("qBudget"),
  };

  function answer(label: string, patch: Partial<FinderInput>) {
    const currentStep = step;
    setHistory((h) => [...h, { question: questionText[step], answer: label }]);
    setInput((i) => ({ ...i, ...patch }));
    if (currentStep === "injuries" && patch.hasInjuries === false) {
      setStepIndex((s) => s + 2);
      return;
    }
    setStepIndex((s) => s + 1);
  }

  function submit(finalPatch: Partial<FinderInput>, answerLabel: string) {
    const finalInput = { ...input, ...finalPatch };
    setHistory((h) => [...h, { question: questionText.budget, answer: answerLabel }]);
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
    setPreviousText("");
    setBudgetMin("");
    setBudgetMax("");
    setBudgetError(null);
    setResult(null);
    setError(false);
  }

  const options: Record<StepId, Array<{ label: string; patch: Partial<FinderInput> }>> = {
    level: (["beginner", "intermediate", "advanced", "pro"] as const).map((l) => ({
      label: tEnums(`level.${l}`),
      patch: { level: l },
    })),
    style: [
      { label: t("styleControl"), patch: { playStyle: "control" } },
      { label: t("styleBalance"), patch: { playStyle: "balance" } },
      { label: t("stylePower"), patch: { playStyle: "power" } },
    ],
    frequency: [
      { label: t("freq1"), patch: { frequency: 1 } },
      { label: t("freq2"), patch: { frequency: 3 } },
      { label: t("freq4"), patch: { frequency: 5 } },
    ],
    matchPace: [
      { label: t("paceCalm"), patch: { matchPace: "calm" } },
      { label: t("paceMedium"), patch: { matchPace: "medium" } },
      { label: t("paceFast"), patch: { matchPace: "fast" } },
    ],
    injuries: [
      { label: t("injuryNo"), patch: { hasInjuries: false } },
      { label: t("injuryYes"), patch: { hasInjuries: true } },
    ],
    injuryZone: [
      { label: t("injuryElbow"), patch: { injuryArea: "elbow" } },
      { label: t("injuryShoulder"), patch: { injuryArea: "shoulder" } },
      { label: t("injuryWrist"), patch: { injuryArea: "wrist" } },
      { label: t("injuryNoneNow"), patch: { injuryArea: null } },
    ],
    strength: [
      { label: t("strengthNeeds"), patch: { strengthPref: "needs_power" } },
      { label: t("strengthHas"), patch: { strengthPref: "has_power" } },
    ],
    goal: [
      { label: t("goalPower"), patch: { improveGoal: "power" } },
      { label: t("goalControl"), patch: { improveGoal: "control" } },
      { label: t("goalBallExit"), patch: { improveGoal: "ball_exit" } },
      { label: t("goalComfort"), patch: { improveGoal: "comfort" } },
    ],
    sweetSpot: [
      {
        label: t("sweetSpotWide"),
        patch: { sweetSpotTolerance: "wide" },
      },
      {
        label: t("sweetSpotBalanced"),
        patch: { sweetSpotTolerance: "balanced" },
      },
      {
        label: t("sweetSpotSmall"),
        patch: { sweetSpotTolerance: "small" },
      },
    ],
    previous: [],
    budget: [],
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-4">
        {result === null && (
          <div className="glass animate-rise-soft rounded-xl px-3 py-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("progressLabel")}</p>
              <p className="text-xs text-muted">
                {Math.min(stepIndex + 1, STEP_ORDER.length)}/{STEP_ORDER.length}
              </p>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {STEP_ORDER.map((_, i) => {
                const done = i < stepIndex;
                const current = i === stepIndex;
                return (
                  <span
                    key={i}
                    className={[
                      "h-1.5 flex-1 rounded-full transition-all duration-300",
                      current ? "bg-tertiary" : done ? "bg-primary" : "bg-border",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          </div>
        )}

        {history.map((entry, i) => (
          <div key={i} className="space-y-2">
            <ChatBubble role="bot">{entry.question}</ChatBubble>
            <ChatBubble role="user">{entry.answer}</ChatBubble>
          </div>
        ))}

        {result === null && !pending && !error && (
          <ActiveQuestion
            key={step}
            question={questionText[step]}
            hasControls={options[step].length > 0 || step === "previous" || step === "budget"}
          >
            {options[step].length > 0 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {options[step].map((opt, i) => (
                  <button
                    key={opt.label}
                    type="button"
                    className="glass animate-rise-slide inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => answer(opt.label, opt.patch)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {step === "previous" && (
              <form
                className="flex gap-2 pl-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = previousText.trim();
                  answer(value || t("skip"), { previousPaddle: value || null });
                }}
              >
                <Input
                  value={previousText}
                  onChange={(e) => setPreviousText(e.target.value)}
                  placeholder={t("previousPlaceholder")}
                />
                <Button type="submit" size="md">
                  <Send size={14} aria-hidden />
                  {previousText.trim() ? t("send") : t("skip")}
                </Button>
              </form>
            )}

            {step === "budget" && (
              <form
                className="space-y-2 pl-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  const min = budgetMin ? Number(budgetMin) : null;
                  const max = budgetMax ? Number(budgetMax) : null;
                  if (min !== null && max !== null && max < min) {
                    setBudgetError(t("budgetRangeError"));
                    return;
                  }
                  setBudgetError(null);
                  const label = [
                    min !== null ? formatPrice(min, "ARS", locale) : "—",
                    max !== null ? formatPrice(max, "ARS", locale) : "—",
                  ].join(" / ");
                  submit({ budgetMin: min, budgetMax: max }, label);
                }}
              >
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={budgetMin}
                    onChange={(e) => {
                      if (budgetError) setBudgetError(null);
                      setBudgetMin(e.target.value);
                    }}
                    placeholder={t("budgetMin")}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={budgetMax}
                    onChange={(e) => {
                      if (budgetError) setBudgetError(null);
                      setBudgetMax(e.target.value);
                    }}
                    placeholder={t("budgetMax")}
                  />
                </div>
                {budgetError && <p className="text-xs text-danger">{budgetError}</p>}
                <p className="text-xs text-muted">{t("budgetOptional")}</p>
                <Button type="submit">
                  <Sparkles size={16} aria-hidden />
                  {t("getResults")}
                </Button>
              </form>
            )}
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
          <div className="space-y-4">
            <ChatBubble role="bot">
              {result.recommendations.length > 0 ? t("resultsTitle") : t("noResults")}
            </ChatBubble>
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
                        <Image
                          src={rec.imageUrl}
                          alt={rec.name}
                          fill
                          sizes="96px"
                          className="object-contain"
                        />
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
                              ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm shadow-primary/30"
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
              <Button variant="ghost" size="sm" onClick={restart}>
                <RotateCcw size={14} aria-hidden />
                {t("restart")}
              </Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/**
 * Pregunta activa del bot con efecto máquina de escribir. Mientras "escribe"
 * muestra los puntitos; cuando termina, revela los controles (opciones/inputs)
 * con una animación de entrada — así se siente como un chat real con IA.
 */
function ActiveQuestion({
  question,
  hasControls,
  children,
}: {
  question: string;
  hasControls: boolean;
  children: React.ReactNode;
}) {
  const { shown, done, started } = useTypewriter(question);

  return (
    <div className="space-y-3">
      <div className="animate-slide-in-left flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-tertiary text-primary-foreground shadow-sm">
          <Bot size={16} aria-hidden />
        </span>
        <p className="glass min-h-[2.6rem] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text">
          {!started ? (
            <TypingDots />
          ) : (
            <>
              {shown}
              {!done && <span className="ml-0.5 inline-block w-1.5 animate-pulse">▌</span>}
            </>
          )}
        </p>
      </div>
      {done && hasControls && <div className="animate-rise">{children}</div>}
    </div>
  );
}

/**
 * Burbuja "pensando" con microcopy que rota cada ~1.8s, para que la espera de la
 * IA se sienta intencional (analizando → filtrando → cruzando → armando).
 */
function ThinkingBubble() {
  const t = useTranslations("finder");
  const messages = [t("thinking1"), t("thinking2"), t("thinking3"), t("thinking4")];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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

/** Tres puntitos que rebotan variando de tamaño (estilo "escribiendo…"). */
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
        <p className="glass rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text">
          {children}
        </p>
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
