import { signOut } from "@/auth";

export default function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/connexion" });
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-brand-body hover:bg-brand-blue-bg"
      >
        Déconnexion
      </button>
    </form>
  );
}
