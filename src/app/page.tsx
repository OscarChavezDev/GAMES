import Link from "next/link";

const GAMES = [
  {
    href: "/puzzle",
    emoji: "🧩",
    title: "Rompecabezas",
    description:
      "Arma un rompecabezas en tiempo real con otra persona. Elige una imagen, comparte el link y jueguen juntos con chat incluido.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-10 px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Juegos</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Minijuegos para jugar en pareja o con amigos, directo desde el navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className="group flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-violet-400 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="text-4xl">{game.emoji}</span>
            <h2 className="text-xl font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400">
              {game.title}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{game.description}</p>
          </Link>
        ))}

        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-neutral-400 dark:border-neutral-700 dark:text-neutral-600">
          <span className="text-4xl">➕</span>
          <p className="text-sm">Más juegos próximamente</p>
        </div>
      </div>
    </main>
  );
}
