# Guía de Despliegue a Servidor • FACTURA SKMX

Esta guía describe cómo desplegar el sistema en un servidor para que esté accesible vía web antes de conectar la API de producción de Factura.com.

---

## Opción 1: Despliegue con Docker (Recomendada para VPS / Cloud)

Es la forma más rápida y confiable porque empaqueta Node.js, dependencias, compilación de Next.js y SQLite en un contenedor aislado.

### Requisitos en el servidor:
- Servidor Linux (Ubuntu 22.04 / 24.04 LTS o Debian)
- Docker y Docker Compose instalados

### Pasos:
1. **Copiar el proyecto al servidor:**
   ```bash
   git clone <tu-repositorio> /opt/factura-skmx
   # o copiar la carpeta vía SCP / SFTP / rsync
   cd /opt/factura-skmx
   ```

2. **Iniciar el contenedor:**
   ```bash
   docker compose up -d --build
   ```

3. **Verificar el servicio:**
   ```bash
   docker compose logs -f
   ```
   La aplicación estará disponible en `http://tu-ip-o-dominio:3000`.

4. **Configurar dominio y SSL con Nginx (Opcional):**
   ```nginx
   server {
       server_name factura.tudominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Luego ejecuta `certbot --nginx -d factura.tudominio.com` para activar HTTPS gratuito.

---

## Opción 2: Despliegue directo en VPS con Node.js y PM2

Si prefieres no usar Docker:

1. **Instalar Node.js 20 LTS en el servidor:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Instalar y compilar el proyecto:**
   ```bash
   cd /opt/factura-skmx
   npm ci
   npm run build
   ```

3. **Ejecutar con PM2:**
   ```bash
   pm2 start npm --name "factura-skmx" -- start
   pm2 save
   pm2 startup
   ```

---

## Opción 3: Plataformas Cloud (PaaS como Railway o Render)

Si deseas un despliegue sin administrar un VPS:

- **Railway:**
  1. Conecta el repositorio de GitHub en [railway.app](https://railway.app).
  2. Detectará automáticamente el `Dockerfile` o el proyecto Next.js.
  3. Agrega un volumen persistente para SQLite en la ruta `/app`.
  4. Genera una URL pública `.up.railway.app` o asocia tu propio dominio con HTTPS automático.

- **Render:**
  1. Crea un *Web Service* apuntando a tu repositorio.
  2. Runtime: *Node* o *Docker*.
  3. Build Command: `npm install && npm run build`
  4. Start Command: `node scripts/prepare-db.js && npm start`
  5. Agrega un *Disk* persistente para la base de datos `dev.db`.

---

## Variables de Entorno en el Servidor (`.env`)

```env
NODE_ENV=production
PORT=3000
PAC_PROVIDER=mock

# Para activar Factura.com más adelante:
# PAC_PROVIDER=facturacom
# FACTURACOM_ENV=sandbox
# FACTURACOM_API_KEY=tu_api_key
# FACTURACOM_SECRET_KEY=tu_secret_key
# FACTURACOM_SERIE=F
```

