"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import Link from "next/link";

import { createRoom, type CreateRoomState } from "./actions";
import { DEFAULT_IMAGES, defaultImageThumbUrl } from "@/lib/puzzle/defaultImages";
import { DIFFICULTIES, pieceCount } from "@/lib/puzzle/difficulties";

const initialState: CreateRoomState = { error: null };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function PuzzleSetupPage() {
  const [state, formAction, isPending] = useActionState(createRoom, initialState);
  const [imageSource, setImageSource] = useState<"default" | "custom">("default");
  const [selectedDefaultId, setSelectedDefaultId] = useState(DEFAULT_IMAGES[0].id);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0].id);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError(null);
    setPreview(null);
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setFileError("Formato no soportado. Usa JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError("La imagen pesa más de 10MB. Elige una más liviana.");
      event.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:py-16">
      <div>
        <Link href="/" className="text-sm text-violet-600 hover:underline dark:text-violet-400">
          ← Volver al inicio
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Nueva partida de Rompecabezas
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Elige una imagen y la dificultad. Al crear la partida te daremos un link para
          invitar a la otra persona.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-8">
        <input type="hidden" name="imageSource" value={imageSource} />
        {imageSource === "default" && (
          <input type="hidden" name="defaultImageId" value={selectedDefaultId} />
        )}

        <section className="flex flex-col gap-2">
          <label htmlFor="hostName" className="font-medium">
            Tu nombre
          </label>
          <input
            id="hostName"
            name="hostName"
            required
            maxLength={40}
            placeholder="¿Cómo te llamas?"
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </section>

        <section className="flex flex-col gap-3">
          <span className="font-medium">Imagen del rompecabezas</span>
          <div className="inline-flex w-fit rounded-xl border border-neutral-300 p-1 dark:border-neutral-700">
            <TabButton active={imageSource === "default"} onClick={() => setImageSource("default")}>
              Predeterminadas
            </TabButton>
            <TabButton active={imageSource === "custom"} onClick={() => setImageSource("custom")}>
              Subir mi imagen
            </TabButton>
          </div>

          {imageSource === "default" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DEFAULT_IMAGES.map((img) => (
                <button
                  type="button"
                  key={img.id}
                  onClick={() => setSelectedDefaultId(img.id)}
                  className={`group overflow-hidden rounded-xl border-2 text-left transition ${
                    selectedDefaultId === img.id
                      ? "border-violet-500"
                      : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={defaultImageThumbUrl(img)}
                    alt={img.label}
                    className="aspect-[4/3] h-24 w-full object-cover sm:h-28"
                    loading="lazy"
                  />
                  <div className="bg-neutral-100 px-2 py-1.5 text-xs dark:bg-neutral-900">
                    <p className="font-medium">{img.label}</p>
                    <p className="truncate text-neutral-500 dark:text-neutral-500">
                      Foto: {img.author}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-white file:hover:bg-violet-700"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                JPG, PNG o WEBP · máximo 10MB · mínimo 400×400px.
              </p>
              {fileError && <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>}
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Vista previa" className="max-h-56 rounded-lg object-contain" />
              )}
            </div>
          )}
        </section>

        <fieldset className="flex flex-col gap-3">
          <legend className="font-medium">Dificultad</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DIFFICULTIES.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                  difficulty === d.id
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                <span>
                  <span className="block font-medium">{d.label}</span>
                  <span className="block text-sm text-neutral-500">
                    {pieceCount(d)} piezas ({d.rows}×{d.cols})
                  </span>
                </span>
                <input
                  type="radio"
                  name="difficulty"
                  value={d.id}
                  checked={difficulty === d.id}
                  onChange={() => setDifficulty(d.id)}
                  className="accent-violet-600"
                />
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creando partida…" : "Crear partida"}
        </button>
      </form>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-violet-600 text-white"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
