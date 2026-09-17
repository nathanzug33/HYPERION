"use client";

import { deleteUserAction } from "./actions";

export default function DeleteUserButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteUserAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Supprimer définitivement le compte de ${name} ? Cette action est irréversible.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="link-underline text-xs text-red-600 hover:text-red-700">
        Supprimer
      </button>
    </form>
  );
}
