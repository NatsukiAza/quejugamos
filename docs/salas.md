# Salas, lista, ruleta y match

## Jugadores

Cada jugador tiene `libraryStatus` `ok`, `private` o `error`, y `canVote`.

- Quien crea la sala o se une con Steam puede votar.
- Quien fue pegado por el host no puede votar. En la lista se ve como “solo biblioteca”.
- El host puede sacar a cualquiera. Quien puede votar puede salir. Un asiento solo-biblioteca no se saca a sí mismo, porque no tiene sesión.
- Pegar un perfil es solo del host.

El denominador de “Bibliotecas loaded/total” son las bibliotecas `ok`. Las privadas y las que fallaron se listan aparte y no mueven el mínimo de dueños.

## Intersección

Función pura. Entra un juego si la cantidad de dueños, entre bibliotecas `ok`, es mayor o igual al mínimo. El orden es minutos sumados, de mayor a menor, y después el nombre. El nombre que se muestra es el de quien más lo jugó.

Al lado de cada juego se ve quién de las bibliotecas visibles no lo tiene.

Los atajos del mínimo:

- Todas las visibles: el mínimo es la cantidad de bibliotecas `ok`.
- Todas menos 1: esa cantidad menos uno, nunca menor que 1.
- Al menos la mitad: `ceil(visibles / 2)`, nunca menor que 1.

Cambiar el mínimo vuelve a pedir `GET /api/rooms/[code]/games`. Eso lee Redis, no Steam. Co-op, PvP, free-to-play, géneros y horas mínimas filtran en el cliente.

## Filtros

Estado inicial: multijugador prendido. El resto apagado. Horas mínimas en 0.

Para un juego de Steam:

- Con multijugador prendido, si todavía no hay ficha, el juego sigue. Si la ficha dice que no es multijugador, se oculta.
- Co-op y PvP ocultan lo que no tiene ficha. Si los dos están prendidos, alcanza con uno.
- Free-to-play y un género elegido también ocultan lo que no tiene ficha.
- El mínimo de horas usa la suma del grupo. 0 muestra juegos que nadie abrió.

Para un título externo: el filtro de género lo deja pasar si no tiene géneros, o si comparte alguno con el filtro. Los otros filtros de ficha no lo sacan de Agregados. En la selección de ruleta y match va después de los juegos de Steam, con id `custom:{id}` y sin portada.

## Ruleta

Reel de portadas sobre la lista ya filtrada. Cada juego tiene la misma chance. Las exclusiones están en `sessionStorage` bajo `qj-exclude:{code}`, en el navegador que gira. No van a Redis. Si el filtro no deja nada, o si se excluyó todo, hay un estado vacío. Si el sistema pide menos movimiento, se muestra el resultado sin animar el reel.

## Match

La misma lista y el mismo orden para todos. Cada persona que puede votar desliza o usa los botones, por su cuenta. La carta sigue el dedo: a la derecha es sí, a la izquierda es no, y pasado el umbral sale de la pantalla. Los botones hacen el mismo voto. Si el sistema pide menos movimiento, no hay arrastre. El resto hace `GET /api/rooms/[code]/votes` cada 2 segundos. No hay websockets.

- Unánime: cada `canVote` dijo `yes`.
- Mayoría: los sí son más que la mitad de quienes pueden votar. Un unánime también es mayoría; en la UI el unánime se lista aparte para no repetirlo.
- El progreso es `votaron / quienes pueden votar`, no sobre los perfiles pegados.
- Un voto que el servidor rechaza no avanza la carta. El voto optimista se revierte.
- Recargar no pierde los votos mientras la sala siga viva. Como viven en `room:{code}`, vencen con la sala.

Quien no tiene sesión ve el botón de Steam. Quien tiene sesión y no está en la sala puede unirse. Quien está solo como biblioteca ve que tiene que entrar con Steam para votar.
