# Recetario Ultraseco 2.0 — Versión Online (GitHub + Neon.com)

Esta carpeta (`online-neon`) es un proyecto web completo e independiente listo para subir a un repositorio de **GitHub** y conectarse a una base de datos PostgreSQL en **Neon.com**.

Conserva el **100 % de las funciones** de la versión de escritorio (diseño industrial, coma decimal, escalado de lote en vivo, modo producción `F5` con temporizador, hoja de impresión/PDF en blanco y negro, atajos de teclado y respaldo/migración JSON).

---

## 1. Crear la Base de Datos en Neon.com

1. Ingresa a [https://neon.com](https://neon.com) y crea un proyecto gratuito (por ejemplo, `recetario-ultraseco`).
2. En el panel principal (**Dashboard** -> **Connection Details**), copia la cadena de conexión (**Connection string**), que tiene este formato:
   ```text
   postgresql://neondb_owner:xxxx@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. **No necesitas crear las tablas manualmente**: al iniciar por primera vez, la aplicación ejecuta automáticamente el esquema [server/db/schema.postgres.sql](server/db/schema.postgres.sql) y carga la receta inicial de ejemplo (`Estuco hidrofóbico v1.0`).
   - *(Opcional)* Si deseas crear las tablas manualmente desde el **SQL Editor** de Neon, puedes pegar el contenido de `server/db/schema.postgres.sql`.

---

## 2. Subir esta carpeta a GitHub

Desde dentro de la carpeta `online-neon`:

```bash
cd "online-neon"
git init
git add .
git commit -m "Versión inicial online de Recetario Ultraseco 2.0 con Neon"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

---

## 3. Publicar Online (Vercel o Render conectados a GitHub)

El proyecto incluye configuración lista tanto para **Vercel** ([vercel.json](vercel.json) + función serverless en [api/index.ts](api/index.ts)) como para **Render / Railway** ([render.yaml](render.yaml) + servidor Node en [server/prodServer.ts](server/prodServer.ts)).

### Opción A: Despliegue en Vercel (Recomendado, con integración directa a GitHub y Neon)
1. Entra a [https://vercel.com](https://vercel.com) -> **Add New Project** e importa tu repositorio de GitHub.
2. En la sección **Environment Variables**, añade:
   - **Nombre:** `DATABASE_URL`
   - **Valor:** Pega tu cadena de conexión de **Neon.com**.
3. Haz clic en **Deploy**. En menos de 1 minuto tendrás tu URL online activa.

### Opción B: Despliegue en Render.com / Railway
1. Conecta tu repositorio de GitHub como un **Web Service**.
2. Comando de compilación (**Build Command**): `npm install && npm run build`
3. Comando de inicio (**Start Command**): `npm start`
4. Añade la variable de entorno `DATABASE_URL` con tu URL de **Neon.com**.

---

## 4. Cómo Migrar tus Recetas entre la Versión Offline y la Versión Online

Ambas versiones (la local con SQLite y esta versión online con Neon) comparten exactamente el mismo formato de **Respaldo JSON**:
1. En tu aplicación de escritorio local, abre **Respaldo BD** y haz clic en **Exportar base de datos a JSON**.
2. En tu aplicación online (Neon), abre **Respaldo BD** y selecciona **Seleccionar archivo JSON e importar...**. Todas tus familias de productos, variantes, ingredientes y pasos quedarán sincronizados en Neon al instante.

---

## 5. Prueba Local Conectada a Neon

Si deseas probar la versión online desde tu computadora antes de subirla:
1. Copia `.env.example` a `.env` y pega tu `DATABASE_URL` de Neon.
2. Ejecuta:
   ```bash
   npm install
   npm run dev
   ```

