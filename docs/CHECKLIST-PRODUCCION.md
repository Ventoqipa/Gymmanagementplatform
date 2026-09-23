# Checklist de prueba en producción

Plataforma: https://elitegym247.tanosi.com.mx/

**Orden importante:** primero se publica Elite; en el PC del gym se **desconecta XCore** y se libera el puerto 8096 **antes** de arrancar el Access Gateway nuevo. No pueden convivir XCore y el Gateway como servidor ADMS al mismo tiempo.

---

## 1. Publicar Elite (Neubox)

- [ ] `npm run build` en este proyecto
- [ ] Subir carpeta `dist/` al hosting (Neubox)
- [ ] Abrir el sitio y confirmar que aparece el menú **Panel** (abajo de Reportes)

---

## 2. Desconectar XCore (PC del gym)

Hacerlo **antes** de instalar o arrancar el Access Gateway.

- [ ] Cerrar **XCore** / Panel ZKTeco / cualquier software de acceso anterior
- [ ] Confirmar que **ya no** está escuchando el puerto **8096**  
      (si al arrancar el Gateway dice “puerto ocupado”, volver a este paso)
- [ ] Si XCore arrancaba solo con Windows: quitarlo del inicio automático / servicio, para que no vuelva a tomar el 8096 al reiniciar
- [ ] Dejar de usar XCore como servidor ADMS de los SpeedFace (el servidor pasa a ser el PC + Gateway Elite)

> Mientras XCore siga activo en 8096, el Access Gateway **no** podrá arrancar y los lectores no hablarán con Elite.

---

## 3. Access Gateway en el PC del gym

En el PC de recepción (misma red que los lectores), **después** del paso 2:

- [ ] Node.js instalado (`node --version`)
- [ ] Copiar carpeta `tools/access-gateway/`
- [ ] Ejecutar **una vez** `install-autostart.bat` (o `start-gateway.bat` para prueba)
- [ ] Abrir http://127.0.0.1:8787/health → debe verse `"ok": true`

---

## 4. Lectores SpeedFace

En cada lector (Cloud Server / ADMS), apuntar al Gateway nuevo (no a XCore):

| Campo | Valor |
|--------|--------|
| Servidor | IP LAN del PC del gym |
| Puerto | `8096` |

- [ ] Entrada principal (SN `SYZ8244300163`)
- [ ] Entrada lateral (SN `SYZ8244300350`)
- [ ] En Elite → **Panel**: ambos en **Conectado** (o al menos con señal)

---

## 5. Conectar Elite

En el **mismo PC** del gym, con el sitio ya publicado:

- [ ] Login en Elite
- [ ] **Panel → Reconectar**
- [ ] Estado: **Conectado**
- [ ] **Control de acceso**: monitor en vivo sin mensajes de simulación

---

## 6. Pruebas en sitio

| # | Acción | OK |
|---|--------|-----|
| 1 | Socio con Face ID pasa por el lector | Evento en Control de acceso |
| 2 | Torniquete abre al reconocer | |
| 3 | Alta Face ID (Miembros o Control de acceso) | Rostro en lector + faceID en catálogo |
| 4 | Inicio muestra clientes del catálogo | |

---

## Orden resumido

```text
1. Publicar Elite (Neubox)
2. Desconectar XCore  ← libera 8096
3. Arrancar Access Gateway
4. Apuntar SpeedFace al PC:8096
5. Panel → Reconectar
6. Pruebas de acceso / Face ID / torniquete
```

---

## Si algo falla

| Qué ves | Qué hacer |
|---------|-----------|
| Panel: Sin conexión | ¿Gateway corriendo? Abrir `/health`. Pulsar Reconectar |
| Lectores desconectados | Revisar IP/puerto ADMS en SpeedFace y cable de red |
| Puerto 8096 ocupado | **XCore u otro programa sigue activo** → paso 2; luego reiniciar Gateway |
| Sitio sin menú Panel | Falta subir el `dist/` nuevo a Neubox |
