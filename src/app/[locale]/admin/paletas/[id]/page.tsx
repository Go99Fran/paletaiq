import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Save } from "lucide-react";
import { paddleRepository } from "@/application/factory";
import {
  PADDLE_BALANCES,
  PADDLE_HARDNESSES,
  PADDLE_LEVELS,
  PADDLE_SHAPES,
  PLAY_STYLES,
} from "@/domain/paddle/paddle.entity";
import { Link, redirect } from "@/i18n/navigation";
import { Button, Card, CardBody, Heading, Input, Select } from "@/presentation/components/ui";
import { updatePaddle } from "../../actions";

export default async function AdminPaddleEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const paddleId = Number(id);
  if (!Number.isInteger(paddleId)) notFound();

  const [t, tEnums, paddle] = await Promise.all([
    getTranslations("admin"),
    getTranslations("enums"),
    paddleRepository.getById(paddleId),
  ]);
  if (!paddle) notFound();

  async function save(formData: FormData) {
    "use server";
    await updatePaddle(paddleId, formData);
    redirect({ href: "/admin", locale });
  }

  const field = (label: string, input: React.ReactNode) => (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {input}
    </label>
  );

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden />
        {t("navPaddles")}
      </Link>
      <Heading level={2} className="mt-2">
        {t("editTitle")}: {paddle.brandName} {paddle.name}
      </Heading>

      <Card className="mt-4">
        <CardBody>
          <form action={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field(t("fieldName"), <Input name="name" defaultValue={paddle.name} required />)}
            {field(t("fieldYear"), <Input name="year" type="number" defaultValue={paddle.year ?? ""} />)}
            {field(
              t("fieldShape"),
              <Select
                name="shape"
                defaultValue={paddle.shape ?? ""}
                placeholder={t("noValue")}
                options={PADDLE_SHAPES.map((s) => ({ value: s, label: tEnums(`shape.${s}`) }))}
              />,
            )}
            {field(
              t("fieldBalance"),
              <Select
                name="balance"
                defaultValue={paddle.balance ?? ""}
                placeholder={t("noValue")}
                options={PADDLE_BALANCES.map((b) => ({ value: b, label: tEnums(`balance.${b}`) }))}
              />,
            )}
            {field(t("fieldWeightMin"), <Input name="weightMin" type="number" defaultValue={paddle.weightMin ?? ""} />)}
            {field(t("fieldWeightMax"), <Input name="weightMax" type="number" defaultValue={paddle.weightMax ?? ""} />)}
            {field(t("fieldCore"), <Input name="coreMaterial" defaultValue={paddle.coreMaterial ?? ""} />)}
            {field(t("fieldFace"), <Input name="faceMaterial" defaultValue={paddle.faceMaterial ?? ""} />)}
            {field(
              t("fieldSurface"),
              <Select
                name="surface"
                defaultValue={paddle.surface ?? ""}
                placeholder={t("noValue")}
                options={(["rough", "smooth"] as const).map((s) => ({
                  value: s,
                  label: tEnums(`surface.${s}`),
                }))}
              />,
            )}
            {field(
              t("fieldHardness"),
              <Select
                name="hardness"
                defaultValue={paddle.hardness ?? ""}
                placeholder={t("noValue")}
                options={PADDLE_HARDNESSES.map((h) => ({ value: h, label: tEnums(`hardness.${h}`) }))}
              />,
            )}
            {field(
              t("fieldLevel"),
              <Select
                name="level"
                defaultValue={paddle.level ?? ""}
                placeholder={t("noValue")}
                options={PADDLE_LEVELS.map((l) => ({ value: l, label: tEnums(`level.${l}`) }))}
              />,
            )}
            {field(
              t("fieldStyle"),
              <Select
                name="playStyle"
                defaultValue={paddle.playStyle ?? ""}
                placeholder={t("noValue")}
                options={PLAY_STYLES.map((s) => ({ value: s, label: tEnums(`playStyle.${s}`) }))}
              />,
            )}
            {field(
              t("fieldThickness"),
              <Input name="thickness" type="number" step="0.5" defaultValue={paddle.thickness ?? ""} />,
            )}
            {field(
              t("fieldPopularity"),
              <Select
                name="popularity"
                defaultValue={String(paddle.popularity)}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}` }))}
              />,
            )}

            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-muted">{t("fieldDescription")}</span>
              <textarea
                name="description"
                rows={5}
                defaultValue={paddle.description ?? ""}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-2 focus:outline-primary/30"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" name="isActive" defaultChecked={paddle.isActive} className="accent-primary" />
              {t("fieldActive")}
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" name="validated" defaultChecked={paddle.validated} className="accent-primary" />
              {t("fieldValidated")}
            </label>

            <div className="sm:col-span-2">
              <Button type="submit">
                <Save size={16} aria-hidden />
                {t("save")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
