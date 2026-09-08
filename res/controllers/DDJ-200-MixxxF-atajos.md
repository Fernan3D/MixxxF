# Pioneer DDJ-200 MixxxF — Atajos Mixxx

Referencia del mapeo **Pioneer DDJ-200 MixxxF** (copia del perfil personal,
adaptada a los Performance Pads de LateNight).
Los originales `Pioneer DDJ-200.midi.xml` y `Pioneer-DDJ-200-scripts.js` no se
modifican.

En Preferencias → Controladores elige **Pioneer DDJ-200 MixxxF**.

Lo que no indica deck vale igual en el lado izquierdo (1) y en el derecho (2).

---

## Transporte

| Control | Función |
|---|---|
| **PLAY** | Play / pausa |
| **CUE** | Ir al CUE principal y reproducir |
| **SHIFT + CUE** | Ir al CUE principal y quedarse en pausa |
| **Plato (scratch) + CUE** | **Insertar** el CUE principal donde está la cabeza |
| **SYNC** | Activar / desactivar sync |
| **Tempo** | Velocidad de la pista |

---

## Jog

| Control | Función |
|---|---|
| **Aro** (sin SHIFT) | Pitch bend (adelantar / atrasar el tempo un momento) |
| **Plato interno** (sin SHIFT) | Scratch |
| **SHIFT + aro** | Subir / bajar en la librería |
| **Soltar SHIFT** (si giraste el aro) | Cargar el tema seleccionado en **ese** deck |
| **SHIFT + plato interno** | Seek: adelantar / atrasar la pista |

Si el deck está sonando, Mixxx puede no sustituir el tema al cargar (opción de preferencias).

---

## Pads (sin SHIFT = modo de pantalla)

Los 8 pads siguen el modo del banco en LateNight (`HOT CUE` / `PAD FX` / `BEAT JUMP` / `SAMPLER`). Cada deck tiene su propio modo.

| Modo en pantalla | Pad 1–8 | LED encendido (sin SHIFT) |
|---|---|---|
| **HOT CUE** | Poner / saltar al hotcue | Ese hotcue existe |
| **PAD FX** | Efecto momentáneo (mantener = on) | El efecto está activo |
| **BEAT JUMP** | −8/−4/−2/−1 y +1/+2/+4/+8 beats | Hay un tema en el deck |
| **SAMPLER** | Dispara Sampler 1–8 (banco global) | Sample cargado o sonando |

En la controladora deja los pads en modo **HOT CUE** del firmware Pioneer (el modo real lo elige Mixxx).

---

## Pads + SHIFT

Igual que el perfil personal. SHIFT usa otra capa MIDI; no depende del modo de pantalla.

| SHIFT + pad | Función | LED (con SHIFT) |
|---|---|---|
| **1** | Entrar / salir del loop | Hay un loop activo |
| **2** | Más beats (el loop se agranda) | — |
| **3** | Salto atrás (usa **Tamaño del salto** de Mixxx) | Encendido mientras pulsas |
| **4** | Salto adelante (usa **Tamaño del salto** de Mixxx) | Encendido mientras pulsas |
| **5** | Reloop: salir del loop o volver a entrar | Loop activo |
| **6** | Menos beats (el loop se acorta) | — |
| **7** | Slip on / off | Slip activo |
| **8** | Reverse on / off | — |

Si hay loop, los pads 3 y 4 **mueven el loop**, no solo la cabeza.

**Tamaño del salto:** en la skin de Mixxx (1, 2, 4, 8, 16…).

**Slip:** la pista sigue “por debajo”. Al soltar scratch o loop, salta a donde debería estar. En la waveform se ven dos cabezas; no parte el audio.

**Reverse:** una pulsación marcha atrás; otra, adelante. No lo dejes puesto al mezclar.

---

## Mixer y auriculares

| Control | Función | LED encendido |
|---|---|---|
| **HI / MID / LOW** | Ecualizador | — |
| **CFX** | Super knob del efecto rápido. Al arrancar Mixxx lee la rueda; si no, 50 % | — |
| **Fader de canal** | Volumen | — |
| **Crossfader** | Mezcla entre decks | — |
| **CUE 1 / CUE 2** (cascos del canal) | PFL: ese canal a auriculares | Ese canal está en cascos |
| **SHIFT + CUE 1 / CUE 2** | Encender / apagar el efecto rápido (CFX). Arranca apagado | Efecto activo |
| **MASTER** (cascos) | Master a auriculares on / off | Estás oyendo el Master |

---

## Librería (resumen)

1. Mantén **SHIFT**.
2. Gira el **aro** del jog del deck donde quieres cargar.
3. **Suelta SHIFT** → se carga el tema en ese deck.

SHIFT + CUE de auriculares ya no carga el tema (ahora es el efecto).

---

## Otros

| Control | Función |
|---|---|
| **Transition FX** | Auto DJ on / off. LED encendido = Auto DJ activo |
| Otro botón de transición | Fade now (pasar ya al siguiente) |
| **SHIFT + MASTER** (cascos) | Modo 4 decks on / off |
| **SHIFT + SYNC** | BPM tap (si el firmware lo envía) |

---

## LEDs — qué significa cada luz

| LED | Sin SHIFT | Con SHIFT pulsado |
|---|---|---|
| CUE 1 / 2 | Canal en auriculares | Efecto de ese canal |
| Pads 1–8 | Según el **modo de pantalla** (tabla de arriba) | 1 y 5: loop. 3/4: salto pulsado. 7: Slip |
| PLAY | Parpadea: tema cargado en pausa. Fijo: sonando. Apagado: sin tema | — |
| CUE (transporte) | Fijo: en pausa sobre el CUE. Parpadea: en pausa fuera del CUE. Apagado: sonando o sin CUE | — |
| SYNC | Sync activo | — |
| MASTER | Master en auriculares | — |
| Transition FX | Auto DJ activo | — |

---

## Recordatorios

- Firmware de la DDJ-200: pads en **HOT CUE**. El modo Mixxx se elige en la pestaña PADS.
- No uses “Aprender MIDI” de Mixxx sobre este perfil: Pioneer cambia de nota con SHIFT y se rompe el mapeo.
- Perfil MixxxF: **Pioneer DDJ-200 MixxxF** (`Pioneer DDJ-200 MixxxF.midi.xml` + `Pioneer-DDJ-200-MixxxF-scripts.js`).
- Perfil original (sin tocar): **Pioneer DDJ-200**.
- Tras editar el mapeo: recargar el preset o reiniciar Mixxx.
