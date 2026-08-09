"use client";

import type { Locale } from "@homeinn/types";
import { Button, Input, Label, Textarea } from "@homeinn/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { ServiceView } from "@/lib/api.types";
import { submitLead } from "@/lib/leads";
import { text } from "@/lib/locale-text";

type Status = "idle" | "submitting" | "success" | "invalid" | "throttled" | "network";

interface LeadFormProps {
  locale: Locale;
  services: ServiceView[];
  sourcePath: string;
  defaultType?: "CONTACT" | "CONSULTATION" | "QUOTE";
}

// `w-full min-w-0` is not cosmetic: a <select> sizes itself to its longest
// option, and "Home Furniture & Office Furniture Supply (Customized Design)"
// is wide enough to push a phone page 200px into horizontal scroll.
const SELECT_CLASS =
  "h-11 w-full min-w-0 truncate border border-current/20 bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function LeadForm({
  locale,
  services,
  sourcePath,
  defaultType = "CONSULTATION",
}: LeadFormProps) {
  const t = useTranslations("form");
  const [status, setStatus] = useState<Status>("idle");
  // Bumping this remounts the fields, which is how a successful submit clears them.
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("submitting");

    const result = await submitLead({
      type: data.get("type"),
      name: data.get("name"),
      phone: data.get("phone"),
      email: (data.get("email") as string) || undefined,
      message: (data.get("message") as string) || undefined,
      serviceId: (data.get("serviceId") as string) || undefined,
      sourcePath,
      locale,
    });

    if (result.ok) {
      setStatus("success");
      setFormKey((n) => n + 1);
      return;
    }
    setStatus(result.reason);
  }

  const message = {
    idle: "",
    submitting: "",
    success: t("success"),
    invalid: t("errorPhone"),
    throttled: t("errorThrottled"),
    network: t("errorGeneric"),
  }[status];

  return (
    <form key={formKey} onSubmit={onSubmit} noValidate className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="lead-type">{t("type")}</Label>
        <select id="lead-type" name="type" defaultValue={defaultType} className={SELECT_CLASS}>
          <option value="CONTACT">{t("typeContact")}</option>
          <option value="CONSULTATION">{t("typeConsultation")}</option>
          <option value="QUOTE">{t("typeQuote")}</option>
        </select>
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor="lead-name">{t("name")}</Label>
        <Input id="lead-name" name="name" required autoComplete="name" />
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor="lead-phone">{t("phone")}</Label>
        <Input
          id="lead-phone"
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          aria-describedby="lead-phone-hint"
        />
        <p id="lead-phone-hint" className="text-xs text-current/60">{t("phoneHint")}</p>
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor="lead-email">{t("email")}</Label>
        <Input id="lead-email" name="email" type="email" autoComplete="email" />
      </div>

      {services.length > 0 ? (
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="lead-service">{t("service")}</Label>
          <select id="lead-service" name="serviceId" defaultValue="" className={SELECT_CLASS}>
            <option value="">{t("servicePlaceholder")}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {text(service, "title", locale)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-2">
        <Label htmlFor="lead-message">{t("message")}</Label>
        <Textarea id="lead-message" name="message" rows={4} />
      </div>

      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={status === "success" ? "text-sm text-walnut" : "text-sm text-brand"}
      >
        {message}
      </p>
    </form>
  );
}
