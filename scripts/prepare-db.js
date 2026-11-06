const { execSync } = require('child_process');

console.log("Verificando base de datos...");
if (process.env.DATABASE_URL) {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    console.log("Base de datos sincronizada con seed inicial.");
  } catch (e) {
    console.error("Aviso en verificación de BD:", e.message);
  }
} else {
  console.log("Nota: No se detectó DATABASE_URL en el entorno local.");
  console.log("Crea tu archivo .env con las credenciales DATABASE_URL de tu base de datos MySQL en Hostinger.");
}
