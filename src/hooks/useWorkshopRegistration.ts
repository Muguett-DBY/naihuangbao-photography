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

type AvailabilityResult = {
  available: boolean;
  spotsLeft: number;
  error?: string;
};

/**
 * Shared workshop registration logic used by both WorkshopsPage and WorkshopDetailPage.
 * Handles form state, validation, real-time availability check, API submission, and notification.
 */
export function useWorkshopRegistration(workshop?: Workshop | null) {
  const { t, i18n } = useTranslation();
  const { sendWorkshopRegistration } = useNotification();
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormContact("");
    setFormMsg("");
    setAvailability(null);
  }, []);

  /**
   * Check real-time availability before registration
   */
  const checkAvailability = useCallback(async (workshopId: string): Promise<AvailabilityResult> => {
    setCheckingAvailability(true);
    try {
      const r = await fetch(`/api/workshops/${workshopId}`, {
        headers: { ...publicMutationHeaders },
      });

      if (!r.ok) {
        const data = await readJsonResponse<{ error?: string }>(r);
        const result: AvailabilityResult = {
          available: false,
          spotsLeft: 0,
          error: data?.error || t("workshops.form.error"),
        };
        setAvailability(result);
        setCheckingAvailability(false);
        return result;
      }

      const data = await readJsonResponse<{ max_participants?: number; current_participants?: number }>(r);
      const maxParticipants = data?.max_participants || 0;
      const currentParticipants = data?.current_participants || 0;
      const spotsLeft = maxParticipants > 0 ? maxParticipants - currentParticipants : 999;

      const result: AvailabilityResult = {
        available: spotsLeft > 0,
        spotsLeft,
      };

      setAvailability(result);
      setCheckingAvailability(false);
      return result;
    } catch {
      const result: AvailabilityResult = {
        available: true,
        spotsLeft: 0,
        error: t("workshops.form.error"),
      };
      setAvailability(result);
      setCheckingAvailability(false);
      return result;
    }
  }, [t]);

  const register = useCallback(async (workshopId: string): Promise<RegistrationResult | null> => {
    if (!formName.trim()) {
      setFormMsg(t("workshops.form.nameRequired"));
      return null;
    }
    if (!formContact.trim()) {
      setFormMsg(t("workshops.form.contactRequired"));
      return null;
    }

    // Check availability before submitting
    const avail = await checkAvailability(workshopId);
    if (!avail.available) {
      setFormMsg(t("workshops.form.fullMessage", "This workshop is full."));
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
  }, [formName, formContact, workshop, t, sendWorkshopRegistration, resetForm, checkAvailability]);

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
    availability,
    checkingAvailability,
    checkAvailability,
  };
}
