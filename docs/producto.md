# Producto

Qué Jugamos ayuda a un grupo de amigos a elegir un juego de Steam que puedan jugar juntos. El grupo es de 2 a 8 personas. No hay ranking, historial de salas ni perfil de usuario.

## Flujo

1. Una persona entra con Steam y crea una sala.
2. Comparte `/sala/[code]`.
3. Las demás entran con Steam, hasta 8. El host también puede pegar un perfil público para sumar esa biblioteca sin voto.
4. La sala muestra los juegos en común según un mínimo de dueños, más filtros.
5. El grupo decide con la ruleta o con el match.

## Decisiones cerradas

No las reabras salvo que quien pide el cambio lo diga explícitamente.

- Entrar a votar es “Iniciar sesión con Steam”. No hay alta por URL para votar. El parser de perfiles existe solo para que el host pegue una biblioteca.
- OpenID devuelve un SteamID64 verificado. No abre una biblioteca privada ni una de “solo amigos”. El OAuth de partner de Valve no es una opción para este sitio.
- Si `GetOwnedGames` no trae `game_count`, la biblioteca es privada: la persona sigue en la sala, no entra en el conteo de dueños, y la interfaz explica cómo poner Detalles del juego en Público. Una biblioteca pública vacía trae `game_count: 0` y sí cuenta en el denominador.
- La ruleta y el match siguen disponibles aunque falten bibliotecas. Arriba se muestra “Bibliotecas 2/4”. “Todas las visibles” no se presenta como “lo tienen todos”.
- Quien puede votar vota aunque su biblioteca esté privada o en error. Un asiento pegado (`canVote: false`) no entra en unánime ni en mayoría.
- Si esa persona después entra con Steam y el SteamID coincide, el mismo asiento pasa a `canVote: true`. No se duplica.
- “Casi todos” es un mínimo de dueños configurable, con atajos: todas las visibles, todas menos una, al menos la mitad. El mínimo se calcula solo con bibliotecas públicas cargadas.
- El filtro de género usa solo los géneros oficiales de la ficha. No se distinguen Shooter ni MOBA.
- “Solo multijugador” arranca prendido. Un juego sin ficha todavía sigue visible hasta que se sepa que no es multijugador.
- Co-op y PvP, juntos, se combinan con OR. Free-to-play es un AND.
- Hay un mínimo opcional de horas sumadas del grupo, además del orden por esas horas.
- Un título escrito a mano vive en Agregados, separado de la intersección. No suma dueños ni horas. Si hay filtro de género y no tiene géneros, sigue en la lista marcado “sin género”.
- La ruleta es un reel de portadas, misma probabilidad para cada juego. Excluir un título vale solo en el navegador que está girando.
- El match es sí/no. Unánime: cada persona que puede votar dijo sí. Mayoría: más de la mitad dijo sí. El progreso es sobre quienes pueden votar.
- La sala dura 24 horas desde la última escritura. Mirarla, incluido el polling, no alarga ese plazo.
- No hay Postgres. Si más adelante hay anuncios, se sube de plan o se cambia de host. El modelo de salas no se rediseña para eso.
- El hueco de anuncios existe y no renderiza nada hasta que haya `NEXT_PUBLIC_ADS_CLIENT`. No se cargan scripts de anuncios.
- La paleta es la de Steam. La marca, la tipografía y el layout no lo son. El detalle está en [identidad.md](identidad.md). El único logo de Steam es el botón oficial de login.
- El backend sigue en los Route Handlers de Next.js. Un servidor aparte en Rust no está en el plan: el tiempo se va en Steam y en la red hasta Redis, no en el runtime.

## Límites que el producto acepta

- `include_played_free_games` omite free-to-play que nadie abrió.
- Family Sharing no aparece en `GetOwnedGames`.
- La primera sala con muchos juegos en común tarda, porque las fichas se piden de a una y en lotes chicos.
- Quien tenga el link puede ver la sala y unirse, hasta 8 personas. No hay directorio de salas.
- Vercel Hobby no es para uso comercial. Anuncios implican otro plan u otro host.
