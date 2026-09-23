# Checklist de prueba en producción

Plataforma: https://elitegym247.tanosi.com.mx/

## 1. Publicar Elite (Neubox)

- [ ] `npm run build` en este proyecto
- [ ] Subir carpeta `dist/` al hosting (Neubox)
- [ ] Abrir el sitio y confirmar que aparece el menú **Panel** (abajo de Reportes)

## 2. Access Gateway en el PC del gym

En el PC de recepción (misma red que los lectores):

- [ ] Node.js instalado (`node --version`)
- [ ] Copiar carpeta `tools/access-gateway/`
- [ ] Cerrar software viejo que use el puerto **8096**
- [ ] Ejecutar **una vez** `install-autostart.bat` (o `start-gateway.bat` para prueba)
- [ ] Abrir http://127.0.0.1:8787/health → debe verse `"ok": true`

## 3. Lectores SpeedFace

En cada lector (Cloud Server / ADMS):

| Campo | Valor |
|--------|--------|
| Servidor | IP LAN del PC del gym |
| Puerto | `8096` |

- [ ] Entrada principal (SN `SYZ8244300163`)
- [ ] Entrada lateral (SN `SYZ8244300350`)
- [ ] En Elite → **Panel**: ambos en **Conectado** (o al menos con señal)

## 4. Conectar Elite

En el **mismo PC** del gym, con el sitio ya publicado:

- [ ] Login en Elite
- [ ] **Panel → Reconectar**
- [ ] Estado: **Conectado**
- [ ] **Control de acceso**: monitor en vivo sin mensajes de simulación

## 5. Pruebas en sitio

| # | Acción | OK |
|---|--------|-----|
| 1 | Socio con Face ID pasa por el lector | Evento en Control de acceso |
| 2 | Torniquete abre al reconocer | |
| 3 | Alta Face ID (Miembros o Control de acceso) | Rostro en lector + faceID en catálogo |
| 4 | Inicio muestra clientes del catálogo | |

## Si algo falla

| Qué ves | Qué hacer |
|---------|-----------|
| Panel: Sin conexión | ¿Gateway corriendo? Abrir `/health`. Pulsar Reconectar |
| Lectores desconectados | Revisar IP/puerto ADMS en SpeedFace y cable de red |
| Puerto 8096 ocupado | Cerrar el otro programa de acceso; reiniciar Gateway |
| Sitio sin menú Panel | Falta subir el `dist/` nuevo a Neubox |
