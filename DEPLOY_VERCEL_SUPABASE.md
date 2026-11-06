# Guía de Despliegue en Vercel + Supabase • FACTURA SKMX

Esta guía te lleva paso a paso para tener el sistema funcionando en la nube con **Vercel** (Frontend y APIs) y **Supabase** (Base de datos PostgreSQL en la nube).

---

## Paso 1: Crear la Base de Datos en Supabase (2 minutos)

1. Entra a [supabase.com](https://supabase.com) e inicia sesión (o regístrate gratis).
2. Haz clic en **"New Project"**.
3. Elige un nombre (ej. `factura-skmx`), una contraseña segura para la base de datos (guárdala bien) y la región más cercana (ej. `East US` o `West US`).
4. Una vez creado el proyecto, ve al menú lateral izquierdo:
   * **Project Settings** (ícono de engranaje abajo a la izquierda) -> **Database**.
5. Baja a la sección **"Connection string"**:
   * Selecciona la pestaña **"URI"**.
   * Activa la casilla **"Use connection pooling"** (Modo: `Transaction`, puerto `6543`). Esta será tu **`DATABASE_URL`**.
   * Copia también la URI directa (sin connection pooling, puerto `5432`). Esta será tu **`DIRECT_URL`**.
   *(Recuerda reemplazar `[YOUR-PASSWORD]` por la contraseña que definiste al crear el proyecto)*.

---

## Paso 2: Conectar y Cargar los Datos Iniciales en Supabase

1. En la raíz de tu proyecto en tu computadora, crea un archivo llamado `.env` copiando el ejemplo de `.env.example`:
   ```env
   DATABASE_URL="postgres://postgres.[TU-REF]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgres://postgres.[TU-REF]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   PAC_PROVIDER="mock"
   ```

2. Abre una terminal en la carpeta del proyecto y ejecuta estos dos comandos para crear las tablas y sembrar los catálogos en Supabase:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
   *Verás cómo se crean las tablas y se cargan los 5 clientes (incluyendo Kocare Beauty), las 2 plantillas de Carta Porte y los 25 productos del catálogo SAT directamente en tu panel de Supabase.*

---

## Paso 3: Subir tu Código a GitHub

Si aún no tienes el proyecto en un repositorio de GitHub:

1. Crea un repositorio nuevo (público o privado) en [github.com/new](https://github.com/new).
2. En tu terminal local corre:
   ```bash
   git init
   git add .
   git commit -m "feat: configuracion para vercel y supabase"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```

---

## Paso 4: Desplegar en Vercel (1 minuto)

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** -> **"Project"**.
3. Selecciona tu repositorio recién subido (`factura-skmx`).
4. En la sección **"Environment Variables"**, agrega las siguientes variables (las mismas de tu `.env`):
   * `DATABASE_URL`: Tu URI de Supabase con pooler (puerto 6543).
   * `DIRECT_URL`: Tu URI directa de Supabase (puerto 5432).
   * `PAC_PROVIDER`: `mock`
5. Haz clic en **"Deploy"**.

¡Listo! En menos de 2 minutos Vercel te entregará una URL pública con HTTPS (ej. `https://factura-skmx.vercel.app`) donde podrás cargar comprobantes, revisar, editar y timbrar en la nube conectado a Supabase.

