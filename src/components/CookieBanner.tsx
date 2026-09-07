"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent-v1";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return true;
  }
}

function getServerSnapshot() {
  return true;
}

export default function CookieBanner() {
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  if (accepted || dismissed) return null;

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {}
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Ce site utilise uniquement des cookies techniques nécessaires à
          l&apos;authentification (aucun traceur publicitaire). Voir notre{" "}
          <Link href="/legal/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          J&apos;ai compris
        </button>
      </div>
    </div>
  );
}
