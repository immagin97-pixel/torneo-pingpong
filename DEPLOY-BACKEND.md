# 🚀 Guía de Despliegue del Backend en Render con Supabase PostgreSQL

Esta guía explica paso a paso cómo desplegar el servidor backend (Node.js + Express + WebSockets + Supabase PostgreSQL) en el **Plan Gratuito de Render** y conectarlo con tu frontend en **Vercel**.

---

## 1. Arquitectura de Despliegue
* **Base de Datos**: **Supabase PostgreSQL** (Única Fuente de Verdad permanente).
* **Servidor Backend**: **Render (Web Service Free)** ejecutando `server/index.js` y WebSockets.
* **Frontend**: **Vercel** (React + Vite).

> 💡 **Ventaja de Supabase**: No necesitas pagar discos persistentes en Render (`Persistent Disks`). El plan Free de Render se puede reiniciar en cualquier momento sin perder ningún partido ni marcador porque todo está permanentemente almacenado en Supabase.

---

## 2. Paso a Paso: Desplegar en Render

1. Entra en tu panel de [Render Dashboard](https://dashboard.render.com/).
2. Haz clic en **"New +"** $\to$ **"Web Service"**.
3. Conecta tu repositorio de GitHub:
   `https://github.com/immagin97-pixel/torneo-pingpong.git`
4. Rellena los campos:
   * **Name**: `torneo-pingpong-backend`
   * **Region**: `Frankfurt (EU Central)`
   * **Branch**: `main`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server/index.js`
   * **Plan**: `Free`

---

## 3. Variables de Entorno en Render

En la pestaña **"Environment"** de Render, añade:

| Variable | Valor |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Tu clave secreta service_role de Supabase)* |
| `ADMIN_PIN` | `1234` |
| `FRONTEND_URL` | `https://tu-torneo.vercel.app` |

---

## 4. Conectar con Vercel

1. En [Vercel Dashboard](https://vercel.com), entra en tu proyecto frontend.
2. Ve a **Settings** $\to$ **Environment Variables**.
3. Añade:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://torneo-pingpong-backend.onrender.com` *(la URL pública de Render)*.
4. Haz un **Redeploy**.

---

## 5. Verificación de Funcionamiento

Abre `https://torneo-pingpong-backend.onrender.com/api/health`. Debe responder:
```json
{
  "status": "ok",
  "database": "Supabase PostgreSQL",
  "clients": 0
}
```
Todos los dispositivos conectados verán el indicador `🟢 EN DIRECTO` y sincronizarán marcadores, clasificaciones y cuadros en tiempo real.
