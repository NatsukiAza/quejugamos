# Identidad visual

Qué Jugamos se tiene que sentir una noche de juegos: fondo oscuro, portadas grandes, acento cian y verde. La paleta es la de Steam, en rellenos planos. El wordmark, la tipografía y el layout son propios. El único logo de Steam es el botón oficial de login.

Lo de abajo está cerrado. Lo que falta está al final y no es una decisión.

Los tokens viven en `app/globals.css`.

## Color

El tema es oscuro. Noche y Panel ocupan casi toda la superficie. Cian y verde marcan una acción; no pintan un bloque de página. El cuerpo va en Texto. El cian no colorea párrafos. El lima entra solo en el hover del botón de acción.

| Nombre | Token | Hex | Uso |
| --- | --- | --- | --- |
| Noche | `--night` | `#171a21` | Fondo |
| Panel | `--panel` | `#1b2838` | Tarjetas, header, banners |
| Línea | `--line` | `#2a475e` | Bordes de 1 px y chips en reposo. No es color de texto. |
| Texto | `--text` | `#c6d4df` | Cuerpo y wordmark. 11.5:1 sobre Noche, 9.9:1 sobre Panel. |
| Apagado | `--muted` | `#8f98a0` | Horas, ayuda, metadatos. 5.9:1 sobre Noche. |
| Cian | `--accent` | `#66c0f4` | Links, foco, chip activo, borde del juego elegido. 8.6:1 sobre Noche. |
| Acción | `--action` | `#5c7e10` | Confirmar, crear sala, unirse, el sí del match. |
| Lima | `--action-hover` | `#a4d007` | Hover de ese botón. |
| No | `--no` | `#c1574a` | El no del match. |

### Rótulos sobre color

El verde oscuro y el lima llevan distinto color de texto.

- Sobre Acción, el rótulo es `#ffffff` (4.7:1).
- Sobre Lima, el rótulo es Noche, `#171a21` (9.6:1).
- Sobre No, el rótulo es `#ffffff` y el control es grande: Chakra Petch 600, como el botón del match. `--no` no se usa para texto chico: blanco sobre `#c1574a` queda en 4.4:1.

El sí y el no se leen por el texto, además del color.

Un error de sistema (login, red, sala vencida) es un panel con borde izquierdo `--no` y texto en Texto. `--no` no pinta párrafos.

## Tipografía

Google Fonts, distintas de Motiva Sans.

- Chakra Petch, peso 600: wordmark, títulos de sección y números grandes.
- Source Sans 3, peso 400: cuerpo. Peso 600: énfasis.

En la herramienta el cuerpo es `1.05rem`, interlineado 1.45. El wordmark es `1.35rem`, tracking `0.04em`. El título de la landing es Chakra Petch 600, color Texto, `clamp(2.1rem, 4.6vw, 3.5rem)`, interlineado 1.05.

## Wordmark

El wordmark es el texto “Qué Jugamos”, en Chakra Petch 600, color Texto, compuesto en la página. El botón oficial de Steam queda como acción de login, separado del nombre.

## Superficie

La página es Noche. La tarjeta es Panel. Los huecos (inputs y el fondo de la portada) vuelven a Noche.

La tarjeta lleva borde Línea, un filete claro arriba (`inset 0 1px 0` con cian al 16 %) y una sombra negra corta (`0 8px 20px` al 35 %). El lima no entra en esa sombra.

Esquinas: 6 px en tarjetas, 4 px en botones, chips e inputs.

El espaciado es 4, 8, 12, 16, 24 y 32 px. El corte de la sala en dos columnas es 960 px. El del header en el teléfono sigue en 640 px.

El botón de acción mide al menos 44 px de alto. El rótulo pasa de blanco a Noche en unos 160 ms. El botón secundario es Panel con borde; el hover le pone borde cian. Dentro de una tarjeta, ese secundario usa Noche para que se lea como control. El chip en reposo tiene fondo; el activo suma borde cian y un velo del mismo cian.

`prefers-reduced-motion` apaga esas transiciones además del reel.

## Imagen y movimiento

La imagen del producto son las cápsulas de Steam (460×215) y los avatares. Detrás de la portada va Noche. La ficha va en Panel, con borde Línea, radio de 6 px y la sombra de tarjeta.

El foco visible es un anillo cian de 2 px. El movimiento fuerte está en la ruleta, en la carta del match y en la escena de la landing. La carta sigue el dedo y sale hacia el sí o el no. La escena de la landing muestra dos bibliotecas que entran, deja las portadas en común con borde cian, y las gira hasta elegir una. Si el sistema pide menos movimiento, la carta no se desplaza, el voto queda en los botones, y la landing muestra solo la portada elegida, quieta. En el resto, elegir es un borde cian. Pasar el cursor por una ficha de la sala solo aclara el borde, sin moverla.

## Landing

La landing usa la misma columna de 1080 px. El aire extra es vertical: el hero abre con 48 px arriba, 56 px desde 960 px. En ese corte el hero se parte en dos, igual que la sala. A la izquierda van el título, el párrafo y el ingreso. A la derecha, un escenario con portadas reales de Steam (cápsulas 460×215). No hay una ilustración propia.

El ingreso sin sesión es el botón oficial de Valve, el mismo archivo, mostrado a 360×70 en el hero y a 180×35 en la sala y el match. Con sesión, ese lugar lo ocupa “Crear sala”.

## Pendiente

1. **Favicon y pieza para compartir.** No hay símbolo. En la pestaña y en un link pegado el nombre en texto no entra.
2. **Iconos.** Salir y sacar, en la ficha de jugador, son iconos de trazo a 20 px, color del texto, con el nombre de la acción en `aria-label`. El resto del set sigue sin definir.
