import { signOut } from "@/auth";

export default function LogoutButton({ dark = false }: { dark?: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/connexion" });
      }}
    >
      <button
        type="submit"
        className={
          dark
            ? "rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-white/20"
            : "btn btn-secondary"
        }
      >
        Déconnexion
      </button>
    </form>
  );
}
