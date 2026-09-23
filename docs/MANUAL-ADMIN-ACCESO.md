# Manual del administrador — Control de acceso Elite Gym

**Plataforma:** [https://elitegym247.tanosi.com.mx/](https://elitegym247.tanosi.com.mx/)  
**Login:** [https://elitegym247.tanosi.com.mx/login](https://elitegym247.tanosi.com.mx/login)

Este manual es para recepción / gerencia / admin del gym.  
Sistema de acceso: **lectores SpeedFace + Access Gateway + plataforma Elite**.

---

## 1. Cómo funciona (en simple)

```text
Socio mira al lector (SpeedFace)
        │
        ├── Abre el torniquete (cable del propio lector)
        │
        └── Avisa al Access Gateway → se ve en Elite (Control de acceso)
```

| Pieza | Qué es |
|--------|--------|
| **SpeedFace** | Lector de rostro en la entrada |
| **Access Gateway** | Programa en el PC del gym que habla con los lectores |
| **Elite** | Sitio web para dar de alta socios, Face ID y ver accesos |
| **Torniquete** | Lo abre el lector al reconocer al socio |

---

## 2. Arranque (PC del gym)

Hacerlo **en el PC de la recepción / servidor de acceso** (misma red que los lectores).

### Paso A — Access Gateway (recomendado: una sola vez)

**Opción recomendada — sin abrir .bat cada día:**

1. Abrir la carpeta `access-gateway`.
2. Ejecutar **una sola vez** `install-autostart.bat` (si Windows lo pide, como Administrador).
3. El Gateway arranca solo al iniciar sesión. Ya no hace falta `start-gateway.bat` a diario.
4. Comprobar: [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health) → `"ok": true`.

Para quitar el arranque automático: `uninstall-autostart.bat`.

**Opción manual (pruebas):** doble clic en `start-gateway.bat` y dejar la ventana abierta.

Si el puerto **8096 está ocupado**: cierra cualquier otro programa de acceso antiguo que use ese puerto.

### Paso B — Lectores SpeedFace

Cada lector debe tener configurado (solo la primera vez o si se resetea):

| Campo | Valor |
|--------|--------|
| Servidor / Cloud / ADMS | IP del PC del gym (ej. `192.168.1.22`) |
| Puerto | `8096` |

### Paso C — Plataforma Elite

1. Abrir [https://elitegym247.tanosi.com.mx/login](https://elitegym247.tanosi.com.mx/login) **en ese mismo PC**.
2. Iniciar sesión.
3. Ir a **Panel** → URL `http://127.0.0.1:8787` → **Reconectar Elite / ADMS**.  
   (Ya no hace falta pegar comandos en la consola F12; el diagnóstico de puertos está en **Panel**.)
4. Ir a **Control de acceso**: debe decir **Gateway: online** y los lectores en **online**.

---

## 3. Alta de un socio nuevo (con Face ID)

1. En Elite: **Miembros → Nuevo miembro**.
2. Completar datos personales (paso 1).
3. Completar cobro / membresía (paso 2).
4. Paso **Face ID**:
   - Elegir terminal (entrada principal o lateral).
   - Clic en **Registrar con Face ID**.
   - Pedir al socio que **mire de frente al lector** hasta que Elite confirme.
5. Si aparece “falta guardar faceID”: usar **Reintentar guardar faceID** (no vuelve a capturar).
6. Revisar el resumen: Face ID registrado.

**Omitir Face ID** deja al socio dado de alta, pero **no podrá entrar** por rostro hasta completar el enrolamiento después (Control de acceso → Alta biométrica).

---

## 4. Enrolar Face ID de un socio que ya existe

1. **Control de acceso → Alta biométrica**.
2. ID de miembro: formato `CLI-123` (el que aparece en Miembros).
3. Nombre (opcional).
4. Elegir terminal.
5. **Iniciar registro facial** → socio mira al lector.

---

## 5. Ver accesos en vivo

1. Menú **Control de acceso**.
2. **Monitor en vivo**: último intento + mosaico de rostros.
3. **Registro de accesos**: listado del día.
4. **Visitas hoy**: totales otorgados / denegados.

Cuando un socio pasa por el lector, debe aparecer aquí (no hace falta pulsar nada).

**Esperar acceso en terminal:** útil para una prueba guiada (Elite espera a que alguien pase por ese lector).

---

## 6. Lectores y torniquetes

| ID en Elite | Uso típico | Serial del lector |
|-------------|------------|-------------------|
| `TRN-MAIN-01` | Entrada principal | SYZ8244300163 |
| `TRN-MAIN-02` | Entrada lateral | SYZ8244300350 |

- Si el lector está **offline** en Elite: revisar Gateway abierto, cable de red del SpeedFace y que el servidor del lector sea la IP del PC + puerto `8096`.
- El torniquete abre cuando el **lector reconoce** al socio. Elite muestra el evento; no sustituye el cable del torniquete.

---

## 7. Cierre del día

1. Opcional: revisar **Visitas hoy** / registro de accesos.
2. Con **install-autostart** el Gateway sigue activo; no hay que cerrar nada.
3. Si se apaga el PC: al encender e iniciar sesión el Gateway vuelve solo (si instaló el arranque automático).

---

## 8. Problemas frecuentes

| Qué ves | Qué hacer |
|---------|-----------|
| Gateway offline en Elite | ¿Arrancó el Gateway (autostart o manual)? Panel → Reconectar. Abrir `/health` |
| Puerto 8096 ocupado | Cerrar el otro programa que use el puerto; reiniciar el Gateway |
| Lector offline | Red del SpeedFace; IP servidor = PC del gym; puerto 8096 |
| Socio no entra | ¿Tiene Face ID? ¿Membresía vigente? Re-enrolar si hace falta |
| Enrolamiento timeout | Socio más cerca y de frente al lector; reintentar |
| No aparecen fotos | El acceso igual puede registrarse; avisar a soporte TI si falta la foto |
| Elite en otro PC (no el del gym) | El Gateway debe ser alcanzable por red; en pruebas usar el **mismo PC** del gym |

---

## 9. Checklist rápido

**Mañana**
- [ ] Gateway activo (`/health` ok; con autostart no hace falta abrir .bat)  
- [ ] Elite → Panel → Reconectar si hace falta  
- [ ] Lectores online  

**Alta de socio**
- [ ] Datos + cobro  
- [ ] Face ID con el socio frente al lector  
- [ ] Confirmación en resumen  

**Prueba de acceso**
- [ ] Socio pasa → aparece en monitor  
- [ ] Torniquete abre  

---

## 10. Contacto soporte

Al reportar un problema, enviar:

1. Hora aproximada  
2. ID del miembro (`CLI-…`)  
3. Captura de **Control de acceso**  
4. Captura de **Panel** o texto de `gateway-autostart.log` / `/health`  

---

*Manual operativo Elite + ADMS. Instalación técnica del Gateway: carpeta `tools/access-gateway` y `docs/CUTOVER-ADMS-DIRECTO.md`.*
