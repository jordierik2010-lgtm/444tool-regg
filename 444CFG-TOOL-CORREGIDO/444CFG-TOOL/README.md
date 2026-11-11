# 444CFG TOOL

Aplicación de escritorio para Windows 10/11 (Tauri 2 + Rust + React/TypeScript). Interfaz con la paleta del logo 444 (índigo/lavanda metálico sobre negro).

> **Estado honesto:** el código está completo, pero **no se ha podido compilar** en el entorno donde se generó (sin Rust ni acceso a red). Lo único ejecutado y verificado ahí es el generador de licencias (ver "Pruebas"). La primera compilación en GitHub Actions puede mostrar errores menores de Rust/TS que habrá que corregir.

## 1. Subir a GitHub
Crea un repositorio privado y sube **todo el contenido de esta carpeta** (`.gitignore` ya excluye `private.key`).

## 2. Generar claves (una sola vez)
Abre `key-manager/index.html` en Chrome/Edge → **CREAR CLAVES**. Guarda `private.key` fuera de GitHub (copia de seguridad cifrada).

## 3. Configurar la clave pública
Pega el contenido de `public.key` (64 hex) en `src-tauri/public.key` y súbelo. El workflow falla si sigue el marcador `REPLACE_WITH_PUBLIC_KEY_HEX`.

## 4. Compilar
GitHub → **Actions → Build Windows → Run workflow**. Al terminar, descarga en *Artifacts*: `444CFG-TOOL-installer` (NSIS) y `444CFG-TOOL-portable-exe`.
Opcional: copia tu vídeo a `public/movement.mp4` antes de compilar para incluirlo en Movement.

## 5. Licencia para un cliente
El cliente abre la app → copia su **HWID** → tú, en el Key Manager, cargas `private.key`, pegas el HWID y pulsas **GENERAR KEY** → se la envías → él pulsa **ACTIVAR LICENCIA**.
Formato: Ed25519 sobre `444CFG|v1|<HWID>`, Base32 sin relleno en bloques de 8. Offline: **no hay caducidad ni revocación remota**.

## 6. Uso
- **Movement:** *Aplicar* → revisa la tabla → confirmar. Hace copia de los valores actuales (o de su ausencia), pide administrador si hace falta (HKLM), verifica cada valor leyéndolo de vuelta y ofrece reinicio (con doble confirmación). *Restaurar original* recupera la copia real.
- **FiveM Optimizer:** *Limpiar caché* → vista previa → confirmar. Requiere FiveM cerrado. `nui-storage` es opcional y está desactivado.
- **Restaurar:** Movement → *Restaurar original*.

## Análisis de los .reg
Todos contienen publicidad ajena (`discord.gg/arizonashaders`), eliminada. Resultado:

| Archivo | Decisión |
|---|---|
| 1 (ratón) | **Aplicado solo** `MouseSpeed`, `MouseThreshold1/2` = 0 (sin aceleración). Descartado: curvas `SmoothMouse*` (solo válidas con escala 100 % e ignoradas sin aceleración), `MouseHoverTime`, `DoubleClickSpeed`, etc. (no relacionados con movimiento) |
| 2 (AFD red) | Descartado: sin justificación ni medición |
| 3 (teclado) | Aplicado `KeyboardDelay=0`; `KeyboardSpeed=50` es **inválido** (rango 0-31) → corregido a 31; `My Regedit` es basura → descartado |
| 4 | **Corrupto** (mezcla UTF-16/ASCII) y duplicado de 1 → descartado |
| 5 vs 7 | **Conflicto** en `Keyboard Response`. 5 activa FilterKeys (`Flags=59`); 7 pone repeat 0 y `Flags=1`. Ambos descartados: afectan a accesibilidad y pueden romper la repetición de teclas |
| 6 (kbdclass) | Descartado: valores por defecto/no medidos |
| 8 (multimedia) | Aplicado `SystemResponsiveness=10`, `Games\Priority=6`, `Games\SFIO Priority=High`. Descartado: `NetworkThrottlingIndex=0x0fffffff` (valor no estándar), reescritura de tareas Audio/Capture/etc. |

Sin mejoras de FPS/ping prometidas: no están medidas. Los cambios de ratón/teclado (HKCU) pueden requerir cerrar sesión.

## Pruebas
- Ejecutadas: `node key-manager/test/compat.mjs` (firma del navegador verificada con OpenSSL; HWID/prefijo distinto falla). El vector resultante está en los tests de `license.rs`.
- Escritas pero **no ejecutadas** (sin cargo): `cargo test --manifest-path src-tauri/Cargo.toml` (licencia, allow-list de registro, copia de seguridad, limpiador con tempdir y symlinks).
- No ejecutadas: `npm run typecheck`, compilación Tauri.

## Pendiente / limitaciones
- Sin `package-lock.json` (sin red); el workflow usa `npm install`.
- NVIDIA/GPU: solo detección, estado de HAGS (lectura) y accesos a Ajustes de Windows. No modifica nada.
- Vídeo: no adjuntado; el reproductor permite elegir archivo o usar `public/movement.mp4`.
- Probar los cambios de Registro solo en una VM o equipo de pruebas.
- Discord: https://discord.gg/444cfg


## Compilar en GitHub Actions — configuración de clave pública

1. Abre `key-manager/index.html` en Chrome o Edge y crea **una sola vez** tu par de claves. Guarda `private.key` únicamente en tu ordenador (nunca en GitHub ni dentro del ZIP que distribuyas).
2. Abre `public.key`: debe contener exactamente 64 caracteres hexadecimales.
3. En el repositorio de GitHub, ve a **Settings > Secrets and variables > Actions > New repository secret**. Nombre: `CFG444_PUBLIC_KEY_HEX`; valor: los 64 caracteres de `public.key`.
4. Sube el proyecto completo a GitHub, incluida `.github/workflows/build-windows.yml`.
5. Ve a **Actions > Build Windows > Run workflow**. Al finalizar correctamente, descarga los artefactos `444CFG-TOOL-installer` y `444CFG-TOOL-portable-exe`.
6. Si recompilas con una clave pública diferente, las licencias emitidas con la clave privada anterior dejarán de verificarse. No regeneres el par por cada cliente.

El archivo `src-tauri/public.key` del ZIP conserva un marcador de posición deliberadamente. GitHub Actions lo sustituye durante la compilación con el secreto de clave **pública**. Si compilas localmente, pega la clave pública en ese archivo. Nunca pegues la privada.

### Estado de las comprobaciones
Se han corregido la configuración de caché de npm en Actions y la validación de carpetas/enlaces del limpiador. Esta entrega contiene **código fuente**, no un EXE probado. Se requiere ejecutar GitHub Actions en Windows para verificar compilación e instalador reales.
