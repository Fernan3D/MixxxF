# MixxxF

Texto generado de forma autonoma por un agente de IA.

Fork personal de [Mixxx](https://github.com/mixxxdj/mixxx) para Fernando
Jimenez. No se envian pull requests a Mixxx oficial.

- GitHub: https://github.com/Fernan3D/MixxxF
- Rama de producto: `custom/mixxxf`
- Rama espejo de Mixxx: `main` (igual que `mixxxdj/mixxx`)

## Como esta organizado

| Rama | Que contiene |
|---|---|
| `main` | Mixxx tal cual, sin cambios MixxxF. Se actualiza desde `upstream`. |
| `custom/mixxxf` | LateNight Performance Pads, Pad FX, mapeo Pioneer DDJ-200 MixxxF. |

Remotes:

- `origin` → `https://github.com/Fernan3D/MixxxF.git`
- `upstream` → `https://github.com/mixxxdj/mixxx.git`

Los archivos MixxxF nuevos (pads, `Pioneer DDJ-200 MixxxF.*`) casi no chocan
con Mixxx. Los que si pueden chocar al mezclar: `skin.xml`, `style.qss`,
`loopingcontrol.cpp`, `CMakeLists.txt`.

## Incorporar arreglos de Mixxx

1. Guarda o confirma tus cambios locales (`git status` limpio).
2. Ejecuta `actualizar-desde-mixxx.bat`.
3. Si Git para por conflictos, resuelvelos y `git merge --continue`.
4. Compila con `compilar-MixxxF.bat`.
5. Prueba en la mesa (pads + DDJ-200).
6. Cuando quieras publicarlo: `git push origin custom/mixxxf`.

El script **no sube nada a GitHub** y **no abre PR** contra Mixxx.

En GitHub, `main` se puede sincronizar solo (accion MixxxF — sincronizar main).
Eso no mezcla MixxxF: solo mantiene el espejo. El merge a `custom/mixxxf` lo
haces tu con el `.bat`.

## Compilar

`compilar-MixxxF.bat` deja el programa en `D:\MIXXXF\MixxxF`.

Texto generado de forma autonoma por un agente de IA.
