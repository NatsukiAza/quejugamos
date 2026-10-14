# Arquitectura

Next.js 16 (App Router) y TypeScript en Vercel. El estado compartido está en Upstash Redis, por REST. No hay base de usuarios.

Esta versión de Next no es la de la documentación vieja. Antes de usar una API de Next, leé la guía en `node_modules/next/dist/docs/`. `cookies()` y `headers()` son asíncronos. `params` y `searchParams` son promesas. `cacheComponents` está prendido: la UI que lee la cookie de sesión va detrás de `<Suspense>`.

## Carpetas

```
app/                  páginas y Route Handlers
  sala/[code]/        sala, ruleta y match
  api/                Steam, sesión y salas
components/           header, sala, ruleta, match, portadas
i18n/                 registro de idiomas y request de next-intl
messages/             es.json y en.json
lib/steam/            OpenID, cliente HTTP, categorías, parser de perfiles
lib/rooms/            intersección, filtros, votos, servicio de sala
lib/session.ts        cookie firmada
lib/store/redis.ts    cliente Upstash y TTLs
lib/http.ts           errores JSON y redirección 303
```

La lógica pura (parser, intersección, filtros, votos) tiene tests de Vitest en `lib/**/*.test.ts`. No hay tests de UI.

## Sesión

Cookie `qj_session`, httpOnly, SameSite lax, `Secure` en producción, 30 días. JWT HS256 firmado con `jose` y `SESSION_SECRET` (mínimo 16 caracteres). El payload lleva `steamId`, `personaName` y `avatarUrl`. Si el secreto falta o es corto, no hay sesión. El callback de Steam, en ese caso, vuelve con `?auth=failed` en lugar de tirar un 500.

## Redis

El browser no habla con Redis. Las claves vencen solas.

| Clave | TTL | Qué guarda |
| --- | --- | --- |
| `room:{code}` | 24 h desde la última escritura | sala, jugadores, títulos externos y votos |
| `library:{steamId}` | 1 h | juegos, si es privada, idioma con el que se pidió |
| `app:{appid}` | 30 días si hubo ficha; 7 días si `success: false` | tipo, `is_free`, categorías y géneros |
| `lock:room:{code}` | 5 s, `SET NX` | candado de las mutaciones de la sala |

Una escritura es crear, unirse, salir, refrescar una biblioteca, votar, o agregar o borrar un título. `GET`, el polling del match y armar la lista no renuevan `room:{code}`.

Los votos viven dentro de `room:{code}` (`steamId` → `appId` o `custom:{id}` → `yes|no`) para compartir el mismo vencimiento. Las escrituras pasan por el candado para no pisarse.

Código de sala: 8 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. El sesgo del módulo se acepta. Máximo 8 jugadores. Si el host se va y queda gente, el host pasa al siguiente que puede votar, o al primero que queda. Si se va la última persona, se borra la clave de la sala. Los títulos externos no se borran cuando se va quien los agregó.

La biblioteca cacheada se vuelve a pedir si el idioma de la UI no coincide con el idioma guardado.

## Endpoints

Zod valida los bodies. El SteamID de quien vota sale de la cookie, no del body.

| Método y ruta | Quién | Efecto |
| --- | --- | --- |
| `GET /api/auth/steam?returnTo=` | cualquiera | redirige a OpenID. `returnTo` solo puede ser una ruta interna |
| `GET /api/auth/steam/callback` | Steam | verifica la firma, setea la cookie, vuelve a `returnTo` |
| `POST /api/auth/logout` | sesión | borra la cookie y redirige a `/` |
| `GET /api/me` | sesión | nombre, avatar y estado de biblioteca. Tiene que ser dinámico: lee la cookie |
| `POST /api/rooms` | sesión | crea la sala y redirige a `/sala/{code}` |
| `GET /api/rooms/[code]` | quien tenga el link | sala y jugadores, sin las bibliotecas completas |
| `POST /api/rooms/[code]/join` | sesión | suma al logueado, o convierte el asiento pegado en votante |
| `POST /api/rooms/[code]/players` | host | body `{ input }`. Perfil público, `canVote: false` |
| `DELETE /api/rooms/[code]/players/[steamId]` | la persona, si puede votar, o el host | la saca |
| `POST /api/rooms/[code]/players/[steamId]/refresh` | la persona, o el host si el asiento no vota | vuelve a pedir la biblioteca |
| `POST /api/rooms/[code]/custom-games` | quien puede votar | body `{ name, genreIds? }` |
| `DELETE /api/rooms/[code]/custom-games/[id]` | quien puede votar | lo borra |
| `GET /api/rooms/[code]/games?minOwners=` | quien tenga el link | intersección. El resto de los filtros corre en el cliente |
| `POST /api/rooms/[code]/metadata` | quien tenga el link | body `{ appIds }`, máximo 8, solo appids de las bibliotecas de la sala |
| `GET /api/rooms/[code]/votes` | quien tenga el link | votos de quienes pueden votar |
| `PUT /api/rooms/[code]/votes` | quien puede votar | body `{ appId, value }` |

Las redirecciones de formulario usan `redirectTo` en `lib/http.ts`, que responde **303**. `NextResponse.redirect` por defecto responde 307 y el navegador reenvía el `POST` a `/sala/[code]`. Esa página no acepta `POST` y Vercel muestra 405. Chrome a veces rotula esa pantalla como 401. El estado real está en Network.

## Páginas

- `/` entra y crea la sala, y muestra la biblioteca de quien está logueado.
- `/sala/[code]` jugadores, filtros y listas.
- `/sala/[code]/ruleta`
- `/sala/[code]/match`

Los filtros viajan en la query (`minOwners`, `multi`, `coop`, `pvp`, `f2p`, `genres`, `minHours`) para que la sala, la ruleta y el match vean la misma lista. Si `multi` no está, el multijugador queda prendido. `multi=0` lo apaga.
