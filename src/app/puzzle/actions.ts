"use server";

import { redirect } from "next/navigation";

import { sniffImage } from "@/lib/image/sniff";
import { createRoomId } from "@/lib/id";
import { getDefaultImage } from "@/lib/puzzle/defaultImages";
import { getDifficulty } from "@/lib/puzzle/difficulties";
import { computeBoardSize } from "@/lib/puzzle/board";
import { generateInitialPieceState } from "@/lib/puzzle/shuffle";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 400;
const MAX_DIMENSION = 8000;

export type CreateRoomState = { error: string | null };

export async function createRoom(
  _prevState: CreateRoomState,
  formData: FormData
): Promise<CreateRoomState> {
  const hostName = String(formData.get("hostName") ?? "").trim();
  const imageSource = String(formData.get("imageSource") ?? "");
  const difficulty = getDifficulty(String(formData.get("difficulty") ?? ""));

  if (hostName.length < 1 || hostName.length > 40) {
    return { error: "Escribe un nombre de 1 a 40 caracteres." };
  }

  let imageUrl: string;
  let imageWidth: number;
  let imageHeight: number;
  let resolvedSource: "default" | "custom";

  if (imageSource === "custom") {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Sube una imagen o elige una de las predeterminadas." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { error: "La imagen pesa más de 10MB. Elige una más liviana." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImage(buffer);
    if (!sniffed) {
      return { error: "Formato no soportado. Usa una imagen JPG, PNG o WEBP." };
    }
    if (sniffed.width < MIN_DIMENSION || sniffed.height < MIN_DIMENSION) {
      return {
        error: `La imagen es muy pequeña. El mínimo es ${MIN_DIMENSION}x${MIN_DIMENSION} píxeles.`,
      };
    }
    if (sniffed.width > MAX_DIMENSION || sniffed.height > MAX_DIMENSION) {
      return { error: "La imagen es demasiado grande en resolución." };
    }

    const admin = getSupabaseAdminClient();
    const extension = sniffed.format === "jpeg" ? "jpg" : sniffed.format;
    const path = `${createRoomId()}-${Date.now()}.${extension}`;

    const { error: uploadError } = await admin.storage
      .from("puzzle-images")
      .upload(path, buffer, {
        contentType: `image/${sniffed.format}`,
        upsert: false,
      });
    if (uploadError) {
      return { error: "No se pudo subir la imagen. Intenta de nuevo." };
    }

    const { data: publicUrlData } = admin.storage.from("puzzle-images").getPublicUrl(path);
    imageUrl = publicUrlData.publicUrl;
    imageWidth = sniffed.width;
    imageHeight = sniffed.height;
    resolvedSource = "custom";
  } else {
    const defaultImage = getDefaultImage(String(formData.get("defaultImageId") ?? ""));
    if (!defaultImage) {
      return { error: "Elige una imagen predeterminada válida." };
    }
    imageUrl = defaultImage.url;
    imageWidth = defaultImage.width;
    imageHeight = defaultImage.height;
    resolvedSource = "default";
  }

  const { boardWidth, boardHeight } = computeBoardSize(imageWidth, imageHeight);
  const pieceState = generateInitialPieceState(
    difficulty.rows,
    difficulty.cols,
    boardWidth,
    boardHeight
  );

  const roomId = createRoomId();
  const admin = getSupabaseAdminClient();
  const { error: insertError } = await admin.from("rooms").insert({
    id: roomId,
    host_name: hostName,
    image_url: imageUrl,
    image_source: resolvedSource,
    image_width: boardWidth,
    image_height: boardHeight,
    grid_rows: difficulty.rows,
    grid_cols: difficulty.cols,
    piece_state: pieceState,
  });

  if (insertError) {
    return { error: "No se pudo crear la partida. Intenta de nuevo." };
  }

  redirect(`/puzzle/${roomId}?host=${encodeURIComponent(hostName)}`);
}
