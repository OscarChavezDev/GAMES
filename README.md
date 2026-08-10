# Juegos

Un pequeño hub de minijuegos multijugador. El primero: **Rompecabezas** — dos
personas arman el mismo rompecabezas en tiempo real, con chat propio en la
sala. Construido con Next.js (App Router) + Supabase, pensado para
desplegarse en Vercel.

## Cómo funciona (resumen técnico)

- **Next.js 16 (App Router, TypeScript, Tailwind v4).** Vercel no sostiene
  bien websockets persistentes desde funciones serverless, así que todo el
  tiempo real corre por **Supabase Realtime** en vez de un socket propio.
- **Supabase Realtime**:
  - *Broadcast* (efímero, no toca la base de datos) para arrastrar piezas:
    "agarré esta pieza", "la muevo aquí" (esto se manda ~20 veces por
    segundo mientras arrastras, así que nunca se persiste), "la solté aquí".
    Solo la posición final de cada pieza se guarda en la base de datos.
  - *Presence* para saber quién está conectado: los primeros 2 en entrar a
    la sala son "jugadores" (pueden mover piezas), el resto entra como
    "espectador" (puede ver y chatear, no mover piezas).
  - *Postgres Changes* para el chat: al insertar un mensaje, Supabase lo
    reparte en vivo a todos los conectados a la sala.
- **Supabase Postgres**: tabla `rooms` (imagen, dificultad, y el estado de
  cada pieza como JSON) y `messages` (historial del chat). El cliente nunca
  escribe `rooms` directamente — usa funciones RPC (`update_piece`,
  `complete_room`, `set_room_playing`) para que solo se pueda tocar lo que
  debe tocarse.
- **Supabase Storage**: bucket `puzzle-images` para las imágenes que suben
  los jugadores. La subida siempre pasa por el servidor
  ([`src/app/puzzle/actions.ts`](src/app/puzzle/actions.ts)), que valida el
  archivo mirando sus bytes reales (no la extensión) antes de guardarlo —
  ver [`src/lib/image/sniff.ts`](src/lib/image/sniff.ts).
- **Piezas**: por ahora son piezas tipo grid (rectangulares, sin "tabs"
  curvos) — se eligió así para tener el multijugador funcionando rápido.
  Es la mejora visual más obvia para una v2 (ver más abajo).

## 1. Crear el proyecto de Supabase

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta todo el contenido de
   [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas
   `rooms`/`messages`, las políticas de seguridad (RLS), las funciones RPC y
   el bucket de Storage `puzzle-images`.
3. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (¡secreta! nunca la
     pongas en una variable `NEXT_PUBLIC_*`)

## 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Y completa las tres variables con los valores del paso anterior.

## 3. Correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Para probar el
multijugador, abre la sala en dos pestañas (o compártela con alguien más).

## 4. Desplegar en Vercel

1. Sube este repo a GitHub.
2. Importa el repo en [vercel.com/new](https://vercel.com/new).
3. En **Environment Variables**, agrega las mismas tres variables del
   `.env.local` (para Production y Preview).
4. Deploy. Vercel detecta Next.js automáticamente, no necesitas
   configuración adicional.

## Estructura del proyecto

```
src/
  app/
    page.tsx                 → hub de juegos (home)
    puzzle/page.tsx           → elegir imagen/dificultad y crear sala
    puzzle/actions.ts         → Server Action: valida imagen, crea la sala
    puzzle/[roomId]/page.tsx  → carga la sala (server) y monta RoomClient
  components/puzzle/          → Board, PuzzlePiece, Chat, PlayersBar, RoomClient
  lib/
    puzzle/                   → tipos, dificultades, imágenes por defecto,
                                 shuffle inicial, tamaño de tablero
    image/sniff.ts            → detector de JPEG/PNG/WEBP sin dependencias
    supabase/                 → clientes de Supabase (browser y admin)
supabase/schema.sql            → todo el esquema de base de datos
```

## Límites conocidos (a propósito, para mantener la v1 simple)

- **Asignación de "jugador" vs "espectador"** es la mejor opción posible sin
  bloqueo a nivel de base de datos: en el rarísimo caso de que dos personas
  entren en el mismo instante, ambas podrían quedar como jugador. No rompe
  el juego, solo es cosmético.
- **Piezas no se "enganchan" entre sí** — cada pieza encaja de forma
  independiente en su lugar correcto; no hay agrupación de piezas vecinas
  todavía (buena mejora futura).
- **Sin moderación de contenido** en las imágenes subidas — solo se valida
  formato, tamaño y resolución (como se pidió para la v1). Si más adelante
  quieres cerrar el link a "cualquiera con la URL", vale la pena agregar
  moderación o cuentas.
- **Sin borrado automático de imágenes/salas viejas** — las imágenes
  subidas se acumulan en el bucket de Storage. Para producción real,
  conviene una tarea programada que borre salas/imágenes con más de X días.

## Ideas para siguientes pasos

- Piezas con bordes curvos (look de rompecabezas real) usando un recorte
  por `<canvas>`/SVG en vez de piezas rectangulares.
- Agrupar piezas vecinas cuando encajan entre sí (no solo con el tablero).
- Cursores en vivo del otro jugador sobre el tablero.
- Llamada + cámara dentro de la sala (mencionado como posible mejora
  futura).
- Nuevos minijuegos como tarjetas en el hub (`src/app/page.tsx`).
