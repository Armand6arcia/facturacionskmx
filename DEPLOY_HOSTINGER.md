# Guía Paso a Paso • Despliegue en Hostinger Business Hosting

Esta guía te lleva de la mano para subir el sistema **Factura SKMX** a tu plan **Business Web Hosting de Hostinger**, utilizando la base de datos **MySQL nativa** de tu cuenta.

---

## Paso 1: Crear la Base de Datos MySQL en Hostinger (2 minutos)

1. Inicia sesión en tu panel de control de Hostinger (**hPanel**): [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. En el menú superior o lateral, ve a **Bases de datos** $\rightarrow$ **Administración de bases de datos MySQL**.
3. En la sección **"Crear una nueva base de datos MySQL y usuario"**, llena los campos:
   * **Nombre de la base de datos:** ej. `facturadb`
   * **Nombre de usuario de MySQL:** ej. `adminfactura`
   * **Contraseña:** Elige una contraseña segura (guárdala bien).
4. Haz clic en **Crear**.
5. Observa cómo Hostinger añade automáticamente un prefijo numérico (ej. `u123456789_`).  
   Anota los datos resultantes:
   * **Host:** `127.0.0.1` *(usa 127.0.0.1 en vez de localhost para evitar problemas en Node.js)*
   * **Puerto:** `3306`
   * **Base de datos:** `u123456789_facturadb`
   * **Usuario:** `u123456789_adminfactura`
   * **Contraseña:** Tu contraseña

Tu cadena de conexión `DATABASE_URL` será:
```text
mysql://u123456789_adminfactura:TU_PASSWORD@127.0.0.1:3306/u123456789_facturadb
```

---

## Paso 2: Subir tu Código a GitHub

La forma más recomendada y profesional para conectar con Hostinger es a través de GitHub (cada cambio que hagas se desplegará solo).

Si aún no has subido el proyecto a GitHub:
1. Abre [github.com/new](https://github.com/new) y crea un repositorio (ej. `factura-skmx`, puede ser privado o público).
2. En la terminal de tu computadora, dentro de la carpeta del proyecto, ejecuta:
   ```bash
   git init
   git add .
   git commit -m "feat: configuracion para hostinger mysql"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```

*(Nota: el archivo `.gitignore` ya está configurado para que tus contraseñas y carpetas pesadas no se suban a GitHub).*

---

## Paso 3: Configurar la Aplicación Node.js en Hostinger

1. En tu **hPanel** de Hostinger, ve a la sección de tu sitio web $\rightarrow$ **Web Apps** (o busca en el buscador de hPanel: **Node.js** / **Web Apps**).
2. Haz clic en **"Crear Aplicación"** o **"Add Application"**:
   * **Tipo / Framework:** Selecciona **Node.js** (versión 20 LTS o la más reciente disponible).
   * **Directorio de la app:** Raíz del dominio o un subdominio (ej. `factura.tudominio.com`).
3. **Conexión con el código:**
   * Selecciona **GitHub** $\rightarrow$ autoriza tu cuenta y elige tu repositorio `factura-skmx` (rama `main`).
   *(Si prefieres no usar GitHub, puedes seleccionar "Subir archivos" y subir el ZIP del proyecto sin la carpeta `node_modules`).*
4. **Comandos de compilación e inicio:**
   * **Build command:** `npm run build`
   * **Start command:** `node scripts/prepare-db.js && npm start`
5. **Variables de Entorno (Environment Variables):**  
   En la sección de variables de entorno de la aplicación, agrega:
   * `DATABASE_URL`: `mysql://u123456789_adminfactura:TU_PASSWORD@127.0.0.1:3306/u123456789_facturadb`
   * `PAC_PROVIDER`: `mock`
   * `NODE_ENV`: `production`
6. Haz clic en **Desplegar** (Deploy).

---

## Paso 4: Carga Inicial de Tablas y Catálogos SAT

Al arrancar la aplicación por primera vez, el script `node scripts/prepare-db.js` detectará la base de datos MySQL y automáticamente:
1. Creará todas las tablas (`Cliente`, `ProductoSat`, `Documento`, `DocumentoItem`, `TimbreFiscal`, `BitacoraEvento`).
2. Cargará el catálogo demo:
   * **5 Clientes** (incluyendo Kocare Beauty con RFC `EKU9003173C9`).
   * **25 Productos SAT** con el formato `Marca - Nombre del producto`.
   * **2 Plantillas de Carta Porte**.

> [!TIP]
> **Verificación en phpMyAdmin:**  
> En cualquier momento puedes entrar en hPanel a **Bases de datos** $\rightarrow$ clic en **phpMyAdmin** junto a tu base de datos y verás todas las tablas creadas con sus registros visualmente.

---

## Paso 5: Certificado SSL y Acceso

1. En hPanel, ve a **Seguridad** $\rightarrow$ **SSL**.
2. Verifica que el estado de tu dominio o subdominio diga **"Activo"** (Hostinger instala el certificado HTTPS gratuito de forma automática).
3. Abre tu navegador en `https://tudominio.com` (o tu subdominio).

¡Tu sistema de lectura de comprobantes y timbrado CFDI 4.0 ya estará en vivo y operando en tu hosting de Hostinger!

