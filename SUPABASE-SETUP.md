# 🗄️ Guía de Configuración: Supabase PostgreSQL (Única Fuente de Verdad)

Esta guía explica paso a paso cómo configurar **Supabase** como base de datos oficial y permanente de tu torneo de ping-pong, ejecutar la creación de tablas, migrar los datos existentes y conectar el Backend (Render) y el Frontend (Vercel).

---

## 1. Crear Proyecto en Supabase

1. Entra en tu cuenta de [Supabase Dashboard](https://supabase.com/dashboard).
2. Haz clic en **"New Project"**.
3. Configura:
   * **Name**: `torneo-pingpong`
   * **Database Password**: *(crea una contraseña segura y anótala)*
   * **Region**: `West Europe (Frankfurt)` o `London` (la más cercana a tus usuarios).
   * **Pricing Plan**: `Free Plan` (suficiente para miles de torneos).
4. Haz clic en **"Create new project"** y espera ~1 minuto mientras se provisiona la base de datos PostgreSQL.

---

## 2. Obtener Credenciales de Supabase

Una vez creado el proyecto:
1. Ve a **Project Settings** (icono de engranaje en la barra lateral izquierda) $\to$ **API**.
2. En la sección **Project URL**, copia tu URL:
   * `Project URL`: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
3. En la sección **Project API keys**, busca la clave **`service_role` (secret)**:
   * Haz clic en **Reveal** y cópiala (`eyJhbGci...`).
   > ⚠️ **IMPORTANTE DE SEGURIDAD**: La clave `service_role` es un secreto administrativo. NUNCA la compartas públicamente, NUNCA la pongas en el frontend ni la subas a repositorios públicos. Solo debe introducirse como variable de entorno secreta en el Backend de Render.

---

## 3. Crear las Tablas en Supabase (`schema.sql`)

1. En el menú lateral izquierdo de Supabase, entra en **SQL Editor**.
2. Haz clic en **"New query"**.
3. Abre el archivo [`supabase/schema.sql`](file:///C:/Users/joang/.gemini/antigravity/scratch/torneo-pingpong/supabase/schema.sql) de este proyecto, copia todo su contenido y pégalo en el editor SQL.
4. Haz clic en el botón verde **"Run"** (o presiona `Ctrl + Enter`).
5. Verás el mensaje *"Success. No rows returned"*. Las 4 tablas (`tournaments`, `players`, `matches`, `match_points`) y sus políticas de seguridad (RLS) e índices ya están creadas.

---

## 4. Migrar los Datos del JSON a Supabase (`npm run migrate`)

Para transferir los 10 jugadores, 19 partidos y horarios existentes a Supabase:

1. En la raíz de tu proyecto local, crea un archivo temporal `.env` (o edita el existente) con tus credenciales:
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```
2. Ejecuta en tu terminal:
   ```bash
   npm run migrate
   ```
3. El script leerá automáticamente `data/tournament_state.json` y creará el torneo, los 10 participantes y los 19 partidos en tu base de datos de Supabase.

---

## 5. Configurar el Backend en Render (Free Tier)

1. En tu panel de [Render](https://dashboard.render.com), entra en tu Web Service del backend.
2. Ve a la pestaña **Environment**.
3. Añade las siguientes variables de entorno:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo producción |
| `SUPABASE_URL` | `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` | Tu URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Tu clave secreta `service_role` |
| `ADMIN_PIN` | `1234` | PIN de administrador para autorizar cambios |
| `FRONTEND_URL` | `https://tu-proyecto.vercel.app` | URL de tu frontend en Vercel |

*(Render no necesita disco persistente porque Supabase almacena los datos de forma permanente en la nube).*

---

## 6. Configurar el Frontend en Vercel

1. En tu panel de [Vercel](https://vercel.com), entra en el proyecto de tu frontend.
2. Ve a **Settings** $\to$ **Environment Variables**.
3. Configura:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://torneo-pingpong-backend.onrender.com` *(la URL de tu Web Service en Render)*.
4. Haz un **Redeploy** en Vercel.

---

## 7. Probar y Verificar

1. **Prueba de API**:
   Abre en tu navegador:
   `https://torneo-pingpong-backend.onrender.com/api/health`
   Debe responder:
   ```json
   {
     "status": "ok",
     "database": "Supabase PostgreSQL",
     "time": "...",
     "version": 1,
     "clients": 0
   }
   ```

2. **Prueba de Tiempo Real Multi-Dispositivo**:
   - Abre la web en tu móvil y en tu ordenador.
   - En ambos dispositivos verás el indicador `🟢 EN DIRECTO`.
   - Entra en Administración (PIN: `1234`) desde el ordenador y suma un punto (`+1`).
   - El punto se guarda de inmediato en Supabase y el móvil se actualiza al instante sin recargar la página.
