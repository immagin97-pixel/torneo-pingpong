# 🚀 Guía de Despliegue del Backend: Torneo de Ping-Pong (Opción C)

Esta guía explica paso a paso cómo desplegar el servidor backend (Node.js + Express + WebSockets + Almacenamiento Persistente en JSON) y conectarlo con tu frontend alojado en **Vercel**.

---

## 1. Servicio Recomendado
Recomendamos **Render** ([render.com](https://render.com)) o **Railway** ([railway.app](https://railway.app)).
* **Render (Web Service)**: Soporta WebSockets nativos en tiempo real, variables de entorno y la opción de **Render Persistent Disk** para que `tournament_state.json` nunca se pierda en reinicios.
* **Railway**: Alternativa directa con volúmenes persistentes (`/data`).

---

## 2. Cómo Crear el Servicio en Render

1. Entra en tu panel de [Render Dashboard](https://dashboard.render.com/).
2. Haz clic en **"New +"** y selecciona **"Web Service"**.
3. Conecta tu cuenta de GitHub y selecciona tu repositorio:
   `https://github.com/immagin97-pixel/torneo-pingpong.git`

---

## 3. Configuración del Servicio (Paso a Paso)

* **Name**: `torneo-pingpong-backend`
* **Region**: `Frankfurt (EU Central)` (o la más cercana a tu ubicación).
* **Branch**: `main`
* **Root Directory**: *(dejar en blanco o `.`)*
* **Runtime**: `Node`
* **Build Command**: 
  ```bash
  npm install
  ```
* **Start Command**: 
  ```bash
  node server/index.js
  ```

---

## 4. Variables de Entorno en Render

En la sección **"Environment Variables"** de Render, añade:

| Variable | Valor de Ejemplo | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo producción |
| `ADMIN_PIN` | `1234` | PIN de administrador para autorizar cambios |
| `FRONTEND_URL` | `https://tu-proyecto.vercel.app` | URL de tu frontend en Vercel (permiso CORS) |
| `DATA_DIR` | `/var/data` *(si usas disco)* o `./data` | Carpeta de persistencia del JSON |

*(Nota: Render asigna automáticamente la variable `PORT`, el servidor ya la detecta mediante `process.env.PORT || 3001`).*

---

## 5. Configurar Almacenamiento Persistente (Render Disk)

Para garantizar que el archivo `tournament_state.json` no se borre si el servidor se reinicia o se actualiza:

1. En la configuración de tu Web Service en Render, ve a la pestaña **"Disks"**.
2. Haz clic en **"Add Disk"**.
3. Configura:
   * **Name**: `tournament-data`
   * **Mount Path**: `/var/data`
   * **Size**: `1 GB` (el plan mínimo sobra para miles de torneos).
4. En las variables de entorno, asegúrate de tener:
   * `DATA_DIR=/var/data`

---

## 6. Obtener la URL del Backend

Una vez desplegado el servicio en Render, obtendrás una URL pública HTTPS, por ejemplo:
`https://torneo-pingpong-backend.onrender.com`

Puedes comprobar su funcionamiento abriendo:
`https://torneo-pingpong-backend.onrender.com/api/health`
Debe responder: `{"status":"ok", ...}`.

---

## 7. Conectar el Frontend en Vercel

1. Ve a tu panel de control en [Vercel](https://vercel.com).
2. Entra en tu proyecto de frontend.
3. Ve a **Settings** $\to$ **Environment Variables**.
4. Añade la variable:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://torneo-pingpong-backend.onrender.com` *(la URL de tu backend en Render sin barra al final)*.
5. Haz un **Redeploy** de tu frontend en Vercel para que tome la nueva variable.

---

## 8. Verificación de Funcionamiento en Vivo

1. Abre tu web en Vercel desde el móvil y desde el ordenador.
2. Comprueba que el indicador superior muestra: `🟢 EN DIRECTO`.
3. Entra en el panel de Administrador (`1234`) desde un dispositivo y anota un punto (+1).
4. Observa cómo **todos los móviles y ordenadores conectados actualizan el marcador al instante sin recargar la página**.
