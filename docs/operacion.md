# Operación

No hace falta Docker ni un Redis local. La base es Upstash Redis, plan gratis, por REST. Región São Paulo si está disponible.

## Variables

`.env.local` no se commitea. `.env.example` lista las claves vacías. En Vercel van en Settings → Environment Variables, para Production. Están cifradas y no entran al repositorio. Quien tiene acceso al proyecto de Vercel puede verlas.

| Variable | Dónde vive |
| --- | --- |
| `STEAM_API_KEY` | servidor. https://steamcommunity.com/dev/apikey |
| `SESSION_SECRET` | servidor. String aleatorio de al menos 16 caracteres |
| `UPSTASH_REDIS_REST_URL` | servidor. REST URL de la consola de Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | servidor. REST token |
| `NEXT_PUBLIC_APP_URL` | pública. Origen, sin path y sin barra final |

Local:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Producción, con el dominio real:

```
NEXT_PUBLIC_APP_URL=https://quejugamos.vercel.app
```

`http://` en producción hace que, después de crear la sala, el navegador avise que el formulario va por una conexión no segura. Steam además compara el `return_to` de OpenID contra este origen. Si queda en `localhost`, el login falla en el sitio publicado.

`NEXT_PUBLIC_APP_URL` se incorpora en el build. Cambiarla en el panel de Vercel no alcanza: hay que volver a desplegar.

El deploy es el de siempre: el repo de GitHub importado en Vercel, sin comando de build especial. Las cuatro claves secretas no llevan `NEXT_PUBLIC_`.

## Comandos

```
npm run dev
npm test
npm run lint
npm run build
```

Sin `.env.local`, la home de quien no está logueado igual renderiza. Una sala muestra el aviso de servidor sin configurar en lugar de tirar un 500.

## Errores ya vistos

- Crear la sala y ver “esta página no funciona” en `/sala/...`: el `POST` se estaba redirigiendo con 307 y el navegador lo repetía sobre la página. La sala solo acepta `GET`, así que responde 405. Chrome a veces muestra 401 en esa pantalla genérica. El estado correcto está en Network. `redirectTo` tiene que seguir respondiendo 303. Abrir la URL en una pestaña nueva hace un `GET` y la sala carga.
- `GET /api/me` no puede prerenderizarse. Lee la cookie. En este Next hay que marcar la ruta como dinámica (`connection()`), si no el build la congela con una sesión vacía.
- Una cookie `Secure` seteada sobre `http://` el navegador la descarta. Por eso el login de producción tiene que volver por `https://`.
