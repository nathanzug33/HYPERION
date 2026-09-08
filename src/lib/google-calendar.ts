// Synchronisation Google Calendar en miroir des RDV/rappels internes (§
// intégration Google) — best-effort : un échec ne doit jamais empêcher la
// création/suppression du suivi côté HYPERION, seulement le refléter côté
// agenda Google si possible.

const CALENDAR_TIMEZONE = "Europe/Paris";
const DEFAULT_DURATION_MINUTES = 30;

type EventInput = { summary: string; description?: string; start: Date };

function toEventBody(input: EventInput) {
  const end = new Date(input.start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  return {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.start.toISOString(), timeZone: CALENDAR_TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: CALENDAR_TIMEZONE },
  };
}

export async function createCalendarEvent(
  accessToken: string,
  input: EventInput
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toEventBody(input)),
      }
    );
    if (!res.ok) {
      console.error(`[google-calendar] Création échouée (${res.status}) :`, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id ?? null;
  } catch (err) {
    console.error("[google-calendar] Erreur réseau (création) :", err);
    return null;
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // 404/410 (déjà supprimé côté Google) traité comme un succès silencieux.
  } catch (err) {
    console.error("[google-calendar] Erreur réseau (suppression) :", err);
  }
}
