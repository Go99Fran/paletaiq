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
import { Badge, Button, Card, CardBody, Input, Spinner, Tag } from "@/presentation/components/ui";
import { formatPrice } from "@/presentation/lib/format";

type StepId =
  | "level"
  | "style"
  | "frequency"
  | "injuries"
  | "strength"
  | "goal"
  | "previous"
  | "budget";

const STEP_ORDER: StepId[] = [
  "level",
  "style",
  "frequency",
  "injuries",
  "strength",
  "goal",
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
  hasInjuries: false,
  injuryNotes: null,
  strengthPref: null,
  improveGoal: null,
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
    injuries: t("qInjuries"),
    strength: t("qStrength"),
    goal: t("qGoal"),
    previous: t("qPrevious"),
    budget: t("qBudget"),
  };

  function answer(label: string, patch: Partial<FinderInput>) {
    setHistory((h) => [...h, { question: questionText[step], answer: label }]);
    setInput((i) => ({ ...i, ...patch }));
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
    injuries: [
      { label: t("injuryNo"), patch: { hasInjuries: false } },
      { label: t("injuryYes"), patch: { hasInjuries: true, injuryNotes: null } },
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
    previous: [],
    budget: [],
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-4">
        {history.map((entry, i) => (
          <div key={i} className="space-y-2">
            <ChatBubble role="bot">{entry.question}</ChatBubble>
            <ChatBubble role="user">{entry.answer}</ChatBubble>
          </div>
        ))}

        {result === null && !pending && !error && (
          <div className="space-y-3">
            <ChatBubble role="bot">{questionText[step]}</ChatBubble>

            {options[step].length > 0 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {options[step].map((opt) => (
                  <Button
                    key={opt.label}
                    variant="ghost"
                    size="sm"
                    className="border border-border"
                    onClick={() => answer(opt.label, opt.patch)}
                  >
                    {opt.label}
                  </Button>
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
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder={t("budgetMin")}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder={t("budgetMax")}
                  />
                </div>
                <p className="text-xs text-muted">{t("budgetOptional")}</p>
                <Button type="submit">
                  <Sparkles size={16} aria-hidden />
                  {t("getResults")}
                </Button>
              </form>
            )}
          </div>
        )}

        {pending && (
          <div className="flex items-center gap-3 pl-10 text-sm text-muted">
            <Spinner size={18} />
            {t("thinking")}
          </div>
        )}

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
              <p className="pl-10 text-xs text-muted">{t("heuristicNote")}</p>
            )}

            <div className="space-y-3 sm:pl-10">
              {result.recommendations.map((rec) => (
                <Card key={rec.slug}>
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
                        <Badge variant="primary">#{rec.rank}</Badge>
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

function ChatBubble({ role, children }: { role: "bot" | "user"; children: React.ReactNode }) {
  if (role === "bot") {
    return (
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot size={16} aria-hidden />
        </span>
        <p className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-2.5 text-sm text-text">
          {children}
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <p className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {children}
      </p>
    </div>
  );
}
