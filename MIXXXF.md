# MixxxF

Texto generado de forma autonoma por un agente de IA.

Fork personal de [Mixxx](https://github.com/mixxxdj/mixxx), enfocado a
**Pioneer DDJ-200** con la skin LateNight (Performance Pads).
No se envian pull requests a Mixxx oficial.

![MixxxF LateNight: HOT CUE, BEAT LOOP, PAD FX, BEAT JUMP y SAMPLER](docs/mixxxf/late-night-ddj200.jpg)

- GitHub: https://github.com/Fernan3D/MixxxF
- Rama de trabajo: `custom/mixxxf`

## Pioneer DDJ-200

El mapeo que hay que usar es **Pioneer DDJ-200 MixxxF**, no el perfil
original de Mixxx ni el XML/JS antiguo de AppData.

Los pads sin SHIFT siguen el modo de pantalla (HOT CUE, BEAT LOOP, PAD FX,
BEAT JUMP, SAMPLER). SHIFT+pads conserva el perfil personal (loop, slip,
reverse).

### Descargar el perfil

Estos dos archivos van juntos (el XML carga el JS):

| Archivo | Que es |
|---|---|
| [Pioneer DDJ-200 MixxxF.midi.xml](../res/controllers/Pioneer%20DDJ-200%20MixxxF.midi.xml) | Preset MIDI |
| [Pioneer-DDJ-200-MixxxF-scripts.js](../res/controllers/Pioneer-DDJ-200-MixxxF-scripts.js) | Logica de pads y LEDs |
| [DDJ-200-MixxxF-atajos.md](../res/controllers/DDJ-200-MixxxF-atajos.md) | Atajos |

Descarga directa (rama `custom/mixxxf`):

- https://github.com/Fernan3D/MixxxF/raw/custom/mixxxf/res/controllers/Pioneer%20DDJ-200%20MixxxF.midi.xml
- https://github.com/Fernan3D/MixxxF/raw/custom/mixxxf/res/controllers/Pioneer-DDJ-200-MixxxF-scripts.js

### Instalar solo el mapeo (Mixxx ya instalado)

1. Copia **los dos** archivos a `%LOCALAPPDATA%\Mixxx\controllers\`
   (en Windows suele ser `C:\Users\<tu-usuario>\AppData\Local\Mixxx\controllers\`).
2. No sustituyas `Pioneer DDJ-200.midi.xml` ni `Pioneer-DDJ-200-scripts.js`
   si quieres conservar el perfil original.
3. Abre Mixxx → Preferencias → Controladores → DDJ-200 → elige
   **Pioneer DDJ-200 MixxxF**.
4. En el firmware de la mesa deja los pads en **HOT CUE**; el modo lo elige
   Mixxx en la pestaña PADS.

Si compilas este fork, el perfil ya se instala en la carpeta `controllers`
del programa.

## Como esta organizado

El trabajo personal vive en `custom/mixxxf`. No se copia Mixxx oficial
encima de `main` ni se mezcla con esta rama.

Remote:

- `origin` → `https://github.com/Fernan3D/MixxxF.git`

## Compilar

`compilar-MixxxF.bat` deja el programa en `D:\MIXXXF\MixxxF`.

Texto generado de forma autonoma por un agente de IA.
