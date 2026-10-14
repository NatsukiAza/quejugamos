# Qué Jugamos

Sitio para que un grupo de 2 a 8 personas decida a qué juego de Steam jugar juntos. Entran con Steam, ven la intersección de las bibliotecas públicas y eligen con una ruleta o un match de sí/no.

Estos documentos son la fuente de verdad del producto. Si el código y un documento discrepan, el código manda para el comportamiento actual y el documento manda para lo que no hay que reabrir.

## Cómo usar esta carpeta

Leé el documento del área que vas a tocar antes de cambiar comportamiento.

| Tema | Documento |
| --- | --- |
| Qué es el producto y qué ya está cerrado | [producto.md](producto.md) |
| Stack, carpetas, Redis, endpoints, Next.js 16 | [arquitectura.md](arquitectura.md) |
| Login, bibliotecas, fichas, portadas, límites de Steam | [steam.md](steam.md) |
| Salas, filtros, títulos externos, ruleta y match | [salas.md](salas.md) |
| Identidad visual: color, tipo y wordmark | [identidad.md](identidad.md) |
| Idioma y layout | [interfaz.md](interfaz.md) |
| Variables, Upstash, Vercel y errores ya vistos | [operacion.md](operacion.md) |

## Reglas cortas

- La API key de Steam, el secreto de sesión y el token de Upstash viven solo en el servidor. No llevan prefijo `NEXT_PUBLIC_`.
- No hay Postgres, cuentas ni historial. Redis guarda la sala en curso y cachés con vencimiento.
- No scrapear Steam. No llamar a `IStoreBrowseService/GetItems`. Shooter, MOBA y otros tags de la comunidad quedan fuera.
- Una biblioteca privada no bloquea la sala, la ruleta ni el match.
- Un perfil pegado por el host suma biblioteca y no vota, hasta que esa persona entra con el mismo SteamID.
- Los títulos escritos a mano van siempre al grupo Agregados. No cuentan como juegos de Steam.
- Un `GET` no renueva la vida de la sala. Solo una escritura lo hace.
- Después de un `POST` de formulario, la redirección es 303 para que el navegador haga `GET`. Un 307 reenvía el `POST` y la página de la sala responde 405.
- En producción, `NEXT_PUBLIC_APP_URL` es `https://...` sin barra final.
