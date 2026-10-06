"use client";

import { useEffect, useRef, useState } from "react";
import { confirmAgentPushAction } from "@/lib/agent/confirm-actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

type PendingPush = {
  type: "push_candidat";
  consultant_id: string;
  consultant_reference: string;
  consultant_poste: string | null;
  entreprise_id: string;
  entreprise_nom: string;
  contact_id: string;
  contact_nom: string;
  message: string | null;
};

const QUICK_PROMPTS = [
  "Récap des RDV à venir",
  "Relances à faire suite à des push",
  "Relances à faire suite à des appels sans réponse",
];

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingPush | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, pendingAction]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setPendingAction(null);
    setConfirmResult(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur inattendue.");
        return;
      }
      setMessages((cur) => [...cur, { role: "assistant", content: data.reply }]);
      if (data.pendingAction?.type === "push_candidat") {
        setPendingAction(data.pendingAction as PendingPush);
      }
    } catch {
      setError("Impossible de joindre l'assistant — vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPush() {
    if (!pendingAction) return;
    setConfirming(true);
    try {
      const result = await confirmAgentPushAction({
        consultantId: pendingAction.consultant_id,
        entrepriseId: pendingAction.entreprise_id,
        contactId: pendingAction.contact_id,
        message: pendingAction.message,
      });
      setConfirmResult(
        result.ok
          ? `✅ Proposition envoyée à ${pendingAction.contact_nom} (${pendingAction.entreprise_nom}).`
          : `❌ ${result.erreur ?? "Échec de l'envoi."}`
      );
      if (result.ok) setPendingAction(null);
    } catch {
      setConfirmResult("❌ Erreur inattendue lors de l'envoi.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[560px] w-[min(92vw,400px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-brand-blue-bg-soft px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-brand-ink">Assistant KERVYO</h2>
              <p className="text-[11px] text-brand-gray">Candidats, RDV, relances, push</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="text-brand-gray hover:text-brand-ink"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-brand-gray">
                  Pose une question, colle une fiche de poste, ou essaie :
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-brand-body hover:border-brand-blue-light hover:bg-brand-blue-bg-soft"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand-blue text-white"
                      : "bg-slate-100 text-brand-body"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-brand-gray">
                  L&apos;assistant réfléchit…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            {pendingAction && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <p className="mb-2 font-medium">
                  Proposition prête : {pendingAction.consultant_reference}
                  {pendingAction.consultant_poste ? ` — ${pendingAction.consultant_poste}` : ""} →{" "}
                  {pendingAction.contact_nom} ({pendingAction.entreprise_nom})
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmPush}
                    disabled={confirming}
                    className="btn btn-primary px-3 py-1 text-[11px]"
                  >
                    {confirming ? "Envoi…" : "Confirmer l'envoi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    disabled={confirming}
                    className="btn btn-secondary px-3 py-1 text-[11px]"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {confirmResult && (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-brand-body">
                {confirmResult}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-slate-100 p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Pose une question ou colle une fiche de poste…"
              className="input flex-1 resize-none text-xs"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary px-3 py-2 text-xs">
              Envoyer
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Assistant KERVYO"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-xl transition-transform hover:scale-105 hover:bg-brand-blue-dark"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
