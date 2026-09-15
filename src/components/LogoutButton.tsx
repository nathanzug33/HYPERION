export default function LogoutButton({
  dark = false,
  sidebar = false,
}: {
  dark?: boolean;
  sidebar?: boolean;
}) {
  return (
    <form method="post" action="/api/logout">
      <button
        type="submit"
        className={
          sidebar
            ? "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white/55 transition-colors duration-150 hover:bg-white/8 hover:text-white"
            : dark
              ? "rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-white/20"
              : "btn btn-secondary"
        }
      >
        {sidebar ? <>🚪 Déconnexion</> : "Déconnexion"}
      </button>
    </form>
  );
}
