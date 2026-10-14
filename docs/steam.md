# Steam

Solo la Web API oficial y OpenID. La key no llega al frontend. No se scrapea la tienda ni el cliente. User-Agent: `QueJugamos/0.1`. No loguear URLs que incluyan la API key.

## Login

OpenID 2.0 en `https://steamcommunity.com/openid/login`.

1. “Iniciar sesión con Steam” arma la petición y redirige a Steam. No hay formulario de usuario y contraseña.
2. El callback hace `POST` con `openid.mode=check_authentication` y exige `is_valid:true`.
3. El SteamID64 sale de `claimed_id`, que tiene que matchear `https://steamcommunity.com/openid/id/` más 17 dígitos. `openid.return_to` tiene que empezar con `{NEXT_PUBLIC_APP_URL}/api/auth/steam/callback`.
4. `returnTo` es una ruta relativa de una sola barra. Se rechazan `//`, `\` y `://`.

El botón es el asset oficial de Valve:

`https://community.steamstatic.com/public/images/signinthroughsteam/sits_01.png`

No lo reemplaces por un botón dibujado. El alt sale de las traducciones.

Con el SteamID, el servidor llama a `GetPlayerSummaries` y `GetOwnedGames`. Eso alcanza si Detalles del juego está en Público. OpenID no entrega un token para leer una biblioteca privada.

## Llamadas

Base `https://api.steampowered.com`, con `STEAM_API_KEY`.

- `ISteamUser/ResolveVanityURL/v1` solo si el host pega `steamcommunity.com/id/nombre` o un vanity pelado. `success: 42` es “no existe”. Un SteamID64 o `/profiles/7656…` no pasa por ahí.
- `ISteamUser/GetPlayerSummaries/v2` para nombre y avatar.
- `IPlayerService/GetOwnedGames/v1` con `include_appinfo=1`, `include_played_free_games=1` y `l=spanish` o `l=english` según el idioma de la UI. El tiempo viene en minutos.
- `store.steampowered.com/api/appdetails?appids={id}` de a un appid. Varios appids juntos no devuelven categorías. El idioma de esta ficha es inglés: categorías y géneros se leen por id.

Reintentos: red, 429 o 5xx, tres veces, esperando 1 s, 2 s y 4 s. Si `appdetails` sigue en 429, se corta el lote. El cliente pide el resto después. Los lotes de metadatos son de hasta 8 appids, con 200 ms entre uno y otro, y solo para appids que están en las bibliotecas de la sala.

El parser de un perfil pegado acepta la URL de `/id/`, la de `/profiles/`, un SteamID64 de 17 dígitos o un vanity. El vanity tiene que incluir una letra, así `"123"` no se toma como nombre.

## Privacidad y errores

`{ "response": {} }` sin `game_count` es biblioteca privada. `game_count: 0` es una biblioteca pública vacía y cuenta en el denominador.

Quien está en `private` o `error` sigue en la sala y queda fuera del conteo de dueños. La UI muestra “Bibliotecas loaded/total”, el nombre de quien falta y cómo poner Detalles del juego en Público. Hay reintento.

Errores de red, rate limit y servidor sin configurar tienen mensaje propio. No se inventa una biblioteca vacía para tapar un error.

## Qué se guarda de la ficha

Se descarta la ficha si `success` es false, o si `type` viene y no es `game` (DLC, soundtrack, demo). Si `type` no vino, el juego sigue.

Categorías, en `lib/steam/categories.ts`:

- Multijugador: 1, 9, 20, 27, 36, 37, 38, 39, 48, 49
- Co-op: 9, 38, 39, 48
- PvP: 36, 37, 49
- Free-to-play: `is_free`

Géneros oficiales, y los únicos que la UI ofrece: 1 Action, 2 Strategy, 3 RPG, 4 Casual, 9 Racing, 18 Sports, 23 Indie, 25 Adventure, 28 Simulation, 29 Massively Multiplayer. Los nombres están en `messages/es.json` y `messages/en.json`. Los chips de la sala salen de los géneros presentes en la lista, no de un catálogo fijo de tags.

## Portadas

`https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg`

Si falla, placeholder. Los títulos de Agregados usan placeholder siempre: no tienen appid.

La lista es una fila ancha: portada a la izquierda, nombre y horas a la derecha. No es la grilla vertical de cápsulas de la biblioteca de Steam.
