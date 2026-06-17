import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotification } from "./useNotification";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../lib/http";
import type { Workshop } from "../types/content";

type RegistrationResult = {
  registrationId?: string;
  requiresPayment: boolean;
};

/**
 * Shared workshop registration logic used by both WorkshopsPage and WorkshopDetailPage.
 * Handles form state, validation, API submission, and notification.
 */
export function useWorkshopRegistration(workshop?: Workshop | null) {
  const { t, i18n } = useTranslation();
  const { sendWorkshopRegistration } = useNotification();
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormContact("");
    setFormMsg("");
  }, []);

  const register = useCallback(async (workshopId: string): Promise<RegistrationResult | null> => {
    if (!formName.trim()) {
      setFormMsg(t("workshops.form.nameRequired"));
      return null;
    }
    if (!formContact.trim()) {
      setFormMsg(t("workshops.form.contactRequired"));
      return null;
    }

    setSubmitting(true);
    setFormMsg("");

    try {
      const r = await fetch(`/api/workshops/${workshopId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ name: formName.trim(), contact: formContact.trim(), participants: 1 }),
      });

      if (r.ok) {
        const data = await readJsonResponse<{ id?: string }>(r);
        if (!data?.id) throw new Error(t("workshops.form.error"));

        const requiresPayment = !!(workshop?.price_cents && workshop.price_cents > 0);

        if (!requiresPayment) {
          setFormMsg(t("workshops.form.success"));

          await sendWorkshopRegistration(formContact.trim(), {
            registrationId: data.id,
            workshopTitle: workshop ? workshop.title : "Workshop",
            eventDate: workshop?.event_date,
            location: workshop?.location,
            name: formName.trim(),
          });

          resetForm();
        }

        return { registrationId: data.id, requiresPayment };
      } else {
        const data = await readJsonResponse(r);
        setFormMsg(getApiError(data, t("workshops.form.error")));
        return null;
      }
    } catch (e) {
      console.error("[WorkshopRegister]", e);
      setFormMsg(t("workshops.form.error"));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [formName, formContact, workshop, t, sendWorkshopRegistration, resetForm]);

  return {
    formName,
    setFormName,
    formContact,
    setFormContact,
    formMsg,
    setFormMsg,
    submitting,
    register,
    resetForm,
  };
}
