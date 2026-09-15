// Synchronisation Google Calendar en miroir des RDV/rappels internes (§
// intégration Google) — best-effort : un échec ne doit jamais empêcher la
// création/suppression du suivi côté HYPERION, seulement le refléter côté
// agenda Google si possible.

const CALENDAR_TIMEZONE = "Europe/Paris";
const DEFAULT_DURATION_MINUTES = 30;

type EventInput = {
  summary: string;
  description?: string;
  start: Date;
  // Demande à Google de générer un lien Google Meet pour cet événement
  // (entretien/RDV en visio) — voir google-gmail.ts pour l'envoi de
  // l'invitation par email avec ce lien.
  withMeet?: boolean;
  // Adresse du RDV physique — affichée dans le champ "lieu" de l'événement,
  // pour la retrouver directement dans l'agenda sans revenir sur HYPERION.
  location?: string;
};

type EventResult = { eventId: string; meetLink: string | null };

function toEventBody(input: EventInput) {
  const end = new Date(input.start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  return {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.start.toISOString(), timeZone: CALENDAR_TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: CALENDAR_TIMEZONE },
    ...(input.withMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

export async function createCalendarEvent(
  accessToken: string,
  input: EventInput
): Promise<EventResult | null> {
  try {
    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    if (input.withMeet) url.searchParams.set("conferenceDataVersion", "1");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toEventBody(input)),
    });
    if (!res.ok) {
      console.error(`[google-calendar] Création échouée (${res.status}) :`, await res.text());
      return null;
    }
    const data = await res.json();
    if (!data.id) return null;
    return { eventId: data.id, meetLink: data.hangoutLink ?? null };
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
