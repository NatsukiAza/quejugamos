# Interfaz

Español e inglés, sin segmento de idioma en la URL. El texto de la interfaz no se hardcodea en los componentes: vive en `messages/es.json` y `messages/en.json`, con las mismas claves. Sumar un idioma es un JSON nuevo y una entrada en `i18n/locales.ts`.

La cookie es `qj_locale`. Si no está, se usa `Accept-Language`. Si tampoco matchea, el idioma es español. El control ES | EN del header escribe la cookie y refresca. Los nombres de juegos se piden a Steam en el idioma activo (`l=spanish` o `l=english`).

El español de la interfaz es voseo rioplatense: “Entrá”, “Reintentá”, “Probá”.

## Marca

La paleta, la tipografía, el wordmark y lo que falta cerrar están en [identidad.md](identidad.md). Los tokens se aplican desde `app/globals.css`.

No hay menú de tienda, buscador de Steam ni barra de categorías. El header es fino: “Qué Jugamos” a la izquierda, idioma y avatar a la derecha.

El movimiento ruidoso está en la ruleta, en la carta del match y en la escena de la landing. La carta sigue el dedo al votar. La escena arma dos bibliotecas, deja lo común y gira hasta una portada. En el resto, un borde cian al elegir alcanza. `prefers-reduced-motion` saltea el reel, el desliz de la carta y deja la landing en la portada elegida, quieta.

`AdSlot` no renderiza nada si `NEXT_PUBLIC_ADS_CLIENT` no está definida. Cuando exista, es un bloque con `--panel`, no un módulo disfrazado de la tienda de Steam.

Las imágenes de portadas, avatares y el botón oficial usan `<img>`. Los hosts de Steam varían y el botón tiene que seguir siendo el archivo de Valve. La navegación interna usa `next/link`.
