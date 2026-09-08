var DDJ200 = {
    fourDeckMode: false,
    vDeckNo: [0, 1, 2],
    vDeck: {},
    shiftPressed: {left: false, right: false},
    jogCounter: 0,
    browseDeckNo: 0,
    suppressBrowseUntil: 0,
    pendingBrowseDeck: 0,
    pendingBrowseAcc: 0,
    pendingBrowseTimer: 0,
    playBlinkOn: false,
    playBlinkTimer: 0,
    padModeTimer: 0,
    lastPadMode: [-1, -1, -1],
    // Indices de [PadBankN],mode en LateNight. La DDJ-200 no envia MIDI de modo:
    // los pads sin SHIFT siguen el modo de la pantalla.
    PAD_MODE_HOTCUE: 0,
    PAD_MODE_BEATLOOP: 1,
    PAD_MODE_LOOPROLL: 2,
    PAD_MODE_PADFX: 3,
    PAD_MODE_BEATJUMP: 4,
    PAD_MODE_SAMPLER: 5,
    // Strings para que el nombre coincida con beatloop_<size>_toggle.
    beatLoopMap: [
        "0.125",
        "0.25",
        "0.5",
        "1",
        "2",
        "4",
        "8",
        "16"
    ],
    beatJumpMap: [
        {size: 8, dir: "backward"},
        {size: 4, dir: "backward"},
        {size: 2, dir: "backward"},
        {size: 1, dir: "backward"},
        {size: 1, dir: "forward"},
        {size: 2, dir: "forward"},
        {size: 4, dir: "forward"},
        {size: 8, dir: "forward"}
    ]
};

/**
 * Conexion inmediata para LEDs. makeConnection agrupa cambios y a veces se
 * come el aviso de un hotcue creado desde la skin.
 */
DDJ200.connectLed = function(group, key, callback) {
    if (typeof engine.makeUnbufferedConnection === "function") {
        return engine.makeUnbufferedConnection(group, key, callback);
    }
    return engine.makeConnection(group, key, callback);
};

/** Deck 1 y 3: Sampler 1-8. Deck 2 y 4: Sampler 9-16. */
DDJ200.samplerNumber = function(vDeckNo, padNo) {
    return ((vDeckNo - 1) % 2) * 8 + padNo;
};

DDJ200.samplerGroup = function(vDeckNo, padNo) {
    return "[Sampler" + DDJ200.samplerNumber(vDeckNo, padNo) + "]";
};

/**
 * [PadBankN],mode lo crea la skin. Si el mapeo se conecta antes, Mixxx ignora
 * el callback y los LEDs no siguen a las pestañas. Este reloj compara el modo
 * y reescribe los 8 pads en cuanto cambia el panel.
 */
DDJ200.watchPadModes = function() {
    for (var deck = 1; deck <= 2; deck++) {
        var mode = engine.getValue("[PadBank" + deck + "]", "mode");
        if (mode !== DDJ200.lastPadMode[deck]) {
            DDJ200.lastPadMode[deck] = mode;
            DDJ200.refreshUnshiftedPadLeds(deck);
        }
    }
};

DDJ200.startPadModeWatch = function() {
    if (DDJ200.padModeTimer) {
        return;
    }
    DDJ200.padModeTimer = engine.beginTimer(40, function() {
        DDJ200.watchPadModes();
    });
};

DDJ200.stopPadModeWatch = function() {
    if (DDJ200.padModeTimer) {
        engine.stopTimer(DDJ200.padModeTimer);
        DDJ200.padModeTimer = 0;
    }
};

/** Se llama cuando la skin ya existe, para no conectar a un CO ausente. */
DDJ200.bindPadBankMode = function() {
    for (var deck = 1; deck <= 2; deck++) {
        (function(physicalDeck) {
            var conn = engine.makeConnection(
                "[PadBank" + physicalDeck + "]",
                "mode",
                function() {
                    DDJ200.lastPadMode[physicalDeck] =
                            engine.getValue("[PadBank" + physicalDeck + "]", "mode");
                    DDJ200.refreshUnshiftedPadLeds(physicalDeck);
                }
            );
            if (conn && typeof conn.trigger === "function") {
                conn.trigger();
            }
        })(deck);
    }
};

DDJ200.init = function() {
    for (var i = 1; i <= 4; i++) {

        // create associative arrays for 4 virtual decks
        this.vDeck[i] = {
            syncEnabled: false,
            volMSB: 0,
            rateMSB: 0,
            jogEnabled: true,
            platterTouched: false
        };

        var vgroup = "[Channel" + i + "]";

        // MixxxF retrasa Preferencias: si rate_dir queda 0, el fader de pitch
        // no cambia el BPM. Pioneer usa invertido (-1). Si rateRange sigue en
        // el valor medio del potmetro (~2), el recorrido es inutilizable.
        engine.setValue(vgroup, "rate_dir", -1);
        if (engine.getValue(vgroup, "rateRange") > 0.5) {
            engine.setValue(vgroup, "rateRange", 0.08);
        }

        // run onTrackLoad after every track load to set LEDs accordingly
        engine.makeConnection(vgroup, "track_loaded", function(ch, vgroup) {
            DDJ200.onTrackLoad(ch, vgroup);
            DDJ200.updatePlayBlinkTimer();
        });

        engine.makeConnection(vgroup, "play", function(value, group) {
            DDJ200.updatePlayBlinkTimer();
        });

        engine.makeConnection(vgroup, "pfl", function(value, group) {
            DDJ200.onChannelLed(group, function(physicalDeck) {
                DDJ200.refreshCueLed(physicalDeck);
            });
        });

        // Por qué unbuffered: el SYNC de la skin debe encender el LED al
        // instante; makeConnection a veces agrupa el cambio y el boton queda
        // apagado aunque Mixxx ya tenga sync_enabled.
        DDJ200.connectLed(vgroup, "sync_enabled", function(_value, group) {
            DDJ200.onChannelLed(group, function(physicalDeck) {
                DDJ200.refreshSyncLed(physicalDeck);
            });
        });

        engine.makeConnection(vgroup, "loop_enabled", function(value, group) {
            DDJ200.onChannelLed(group, function(physicalDeck) {
                DDJ200.refreshPad1Led(physicalDeck);
                DDJ200.refreshPad5Led(physicalDeck);
                DDJ200.refreshUnshiftedPadLeds(physicalDeck);
            });
        });

        engine.makeConnection(vgroup, "slip_enabled", function(value, group) {
            DDJ200.onChannelLed(group, function(physicalDeck) {
                DDJ200.refreshSlipLed(physicalDeck);
            });
        });

        engine.makeConnection(vgroup, "cue_point", function(value, group) {
            DDJ200.onChannelLed(group, function(physicalDeck) {
                DDJ200.refreshMainCueLed(physicalDeck);
            });
        });

        // Por qué solo en pausa: en play el LED CUE va apagado y playposition
        // dispara cada buffer; no hay que saturar MIDI.
        engine.makeConnection(vgroup, "playposition", function(value, group) {
            if (engine.getValue(group, "play")) {
                return;
            }
            DDJ200.onChannelLed(group, function(physicalDeck) {
                DDJ200.refreshMainCueLed(physicalDeck);
            });
        });

        // Por qué los 8: si solo se escucha 1 y 5, el resto no sigue a la skin.
        // Unbuffered: al crear un hotcue en la waveform a veces el callback
        // agrupado no llega y el LED de la DDJ se queda apagado.
        for (var pad = 1; pad <= 8; pad++) {
            (function(padNo) {
                DDJ200.connectLed(vgroup, "hotcue_" + padNo + "_enabled", function(_value, group) {
                    DDJ200.onChannelLed(group, function(physicalDeck) {
                        DDJ200.refreshUnshiftedPadLeds(physicalDeck);
                    });
                });
                DDJ200.connectLed(vgroup, "hotcue_" + padNo + "_color", function(_value, group) {
                    DDJ200.onChannelLed(group, function(physicalDeck) {
                        DDJ200.refreshUnshiftedPadLeds(physicalDeck);
                    });
                });
            })(pad);
        }

        // LED de BEAT LOOP y LOOP ROLL: cada tamano tiene su propio control.
        for (var loopPad = 0; loopPad < DDJ200.beatLoopMap.length; loopPad++) {
            engine.makeConnection(
                vgroup,
                "beatloop_" + DDJ200.beatLoopMap[loopPad] + "_enabled",
                function(value, group) {
                    DDJ200.onChannelLed(group, function(physicalDeck) {
                        DDJ200.refreshUnshiftedPadLeds(physicalDeck);
                    });
                }
            );
            engine.makeConnection(
                vgroup,
                "beatlooproll_" + DDJ200.beatLoopMap[loopPad] + "_activate",
                function(value, group) {
                    DDJ200.onChannelLed(group, function(physicalDeck) {
                        DDJ200.refreshUnshiftedPadLeds(physicalDeck);
                    });
                }
            );
        }

        engine.makeConnection("[QuickEffectRack1_[Channel" + i + "]]", "enabled", function(value, group) {
            var match = group.match(/Channel(\d+)/);
            if (!match) {
                return;
            }
            DDJ200.onChannelLed("[Channel" + match[1] + "]", function(physicalDeck) {
                DDJ200.refreshCueLed(physicalDeck);
            });
        });

        // set Pioneer CDJ cue mode for all decks
        engine.setValue(vgroup, "cue_cdj", true);
        DDJ200.initQuickEffect(i);
    }

    engine.makeConnection("[Master]", "headMix", function() {
        DDJ200.updateHeadmixLed();
    });

    engine.makeConnection("[AutoDJ]", "enabled", function() {
        DDJ200.refreshAutoDjLed();
    });

    // Samples por deck: 1-8 a la izquierda, 9-16 a la derecha.
    for (var s = 1; s <= 16; s++) {
        (function(samplerNo) {
            var physicalDeck = samplerNo <= 8 ? 1 : 2;
            DDJ200.connectLed("[Sampler" + samplerNo + "]", "track_loaded", function() {
                DDJ200.refreshUnshiftedPadLeds(physicalDeck);
            });
            DDJ200.connectLed("[Sampler" + samplerNo + "]", "play_latched", function() {
                DDJ200.refreshUnshiftedPadLeds(physicalDeck);
            });
        })(s);
    }

    for (var fxBank = 1; fxBank <= 2; fxBank++) {
        for (var fxPad = 1; fxPad <= 8; fxPad++) {
            engine.makeConnection(DDJ200.padFxGroup(fxBank, fxPad), "enabled", function(_value, fxGroup) {
                var deckNo = Number(fxGroup.split("Channel")[1].split("]")[0]);
                var padNo = Number(fxGroup.split("_Effect")[1].split("]")[0]);
                DDJ200.onChannelLed("[Channel" + deckNo + "]", function(physicalDeck) {
                    DDJ200.refreshUnshiftedPadLed(physicalDeck, padNo);
                });
            });
        }
    }

    DDJ200.startPadModeWatch();

    DDJ200.LEDsOff();

    // start with focus on library for selecting tracks (delay seems required)
    engine.beginTimer(500, function() {
        engine.setValue("[Library]", "MoveFocus", 1);
        DDJ200.initQuickEffects();
        DDJ200.updateHeadmixLed();
        DDJ200.refreshAutoDjLed();
        DDJ200.refreshShiftLayerLeds();
        DDJ200.switchLEDs(DDJ200.vDeckNo[1]);
        DDJ200.switchLEDs(DDJ200.vDeckNo[2]);
        DDJ200.bindPadBankMode();
        DDJ200.refreshUnshiftedPadLeds(1);
        DDJ200.refreshUnshiftedPadLeds(2);
        DDJ200.updatePlayBlinkTimer();
        // Despues de los defaults: el dump pisa CFX 50 % con la rueda real.
        DDJ200.requestControllerPositions();
        // Pioneer a veces reescribe pads al arrancar; un segundo pase los deja
        // alineados con el panel de la skin.
        engine.beginTimer(300, function() {
            DDJ200.refreshUnshiftedPadLeds(1);
            DDJ200.refreshUnshiftedPadLeds(2);
            DDJ200.refreshSyncLed(1);
            DDJ200.refreshSyncLed(2);
        }, true);
    }, true);
};

/**
 * Pioneer no documenta este SysEx; rekordbox lo usa y Mixxx oficial tambien.
 * La DDJ-200 responde con la posicion actual de ruedas y faders.
 */
DDJ200.requestControllerPositions = function() {
    // El dump de Pioneer manda tempo y faders: sin esto el primer movimiento
    // no cambia el BPM (soft-takeover espera a que coincida el valor).
    engine.softTakeoverIgnoreNextValue("[Master]", "crossfader");
    engine.softTakeoverIgnoreNextValue("[Channel1]", "rate");
    engine.softTakeoverIgnoreNextValue("[Channel2]", "rate");
    engine.softTakeoverIgnoreNextValue("[Channel3]", "rate");
    engine.softTakeoverIgnoreNextValue("[Channel4]", "rate");
    midi.sendSysexMsg(
        [0xF0, 0x00, 0x40, 0x05, 0x00, 0x00, 0x02, 0x0A, 0x00, 0x03, 0x01, 0xF7],
        12
    );
};

DDJ200.shutdown = function() {
    DDJ200.stopPadModeWatch();
    DDJ200.stopPlayBlinkTimer();
    DDJ200.LEDsOff();
};

DDJ200.LEDsOff = function() {                         // turn off LED buttons:

    midi.sendShortMsg(0x96, 0x59, 0x00);              // Transition FX / Auto DJ
    for (var i = 0; i <= 1; i++) {
        midi.sendShortMsg(0x96 + i, 0x63, 0x00);      // set headphone master
        midi.sendShortMsg(0x90 + i, 0x54, 0x00);      // pfl headphone
        midi.sendShortMsg(0x90 + i, 0x68, 0x00);      // SHIFT + pfl (efecto)
        midi.sendShortMsg(0x90 + i, 0x58, 0x00);      // beat sync
        midi.sendShortMsg(0x90 + i, 0x0B, 0x00);      // play
        midi.sendShortMsg(0x90 + i, 0x0C, 0x00);      // cue
        for (var j = 0; j <= 8; j++) {
            midi.sendShortMsg(0x97 + 2 * i, j, 0x00); // hotcue
            midi.sendShortMsg(0x98 + 2 * i, j, 0x00); // SHIFT pads
        }
    }
};

DDJ200.onTrackLoad = function(channel, vgroup) {
    // set LEDs (hotcues, etc.) for the loaded deck
    // if controller is switched to this deck
    var vDeckNo = script.deckFromGroup(vgroup);
    var deckNo = (vDeckNo % 2) ? 1 : 2;
    if (vDeckNo === DDJ200.vDeckNo[deckNo]) {
        DDJ200.switchLEDs(vDeckNo);
    }
};

DDJ200.LoadSelectedTrack = function(channel, control, value, status, group) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        var deckNo = script.deckFromGroup(group);
        var vDeckNo = DDJ200.vDeckNo[deckNo];
        var vgroup = "[Channel" + vDeckNo + "]";
        script.triggerControl(vgroup, "LoadSelectedTrack", true);
    }
};

DDJ200.browseTracks = function(value) {
    DDJ200.jogCounter += value - 64;
    if (DDJ200.jogCounter > 9) {
        engine.setValue("[Library]", "MoveDown", true);
        DDJ200.jogCounter = 0;
    } else if (DDJ200.jogCounter < -9) {
        engine.setValue("[Library]", "MoveUp", true);
        DDJ200.jogCounter = 0;
    }
};

DDJ200.isShiftHeld = function() {
    return DDJ200.shiftPressed.left || DDJ200.shiftPressed.right;
};

/**
 * Al soltar SHIFT, si el aro se uso para la libreria, carga el tema
 * en el deck de ese jog. No carga si solo se uso SHIFT para pads o seek.
 */
DDJ200.loadBrowsedTrack = function() {
    if (!DDJ200.browseDeckNo) {
        return;
    }
    script.triggerControl("[Channel" + DDJ200.browseDeckNo + "]", "LoadSelectedTrack", true);
    DDJ200.browseDeckNo = 0;
};

DDJ200.shiftLeft = function(channel, control, value) {
    DDJ200.shiftPressed.left = !!value;
    if (!value && !DDJ200.shiftPressed.right) {
        DDJ200.loadBrowsedTrack();
    }
    DDJ200.refreshShiftLayerLeds();
};

DDJ200.shiftRight = function(channel, control, value) {
    DDJ200.shiftPressed.right = !!value;
    if (!value && !DDJ200.shiftPressed.left) {
        DDJ200.loadBrowsedTrack();
    }
    DDJ200.refreshShiftLayerLeds();
};

/**
 * El firmware a veces manda un tick del aro (0x21) al apoyar el plato,
 * antes incluso del touch (0x36). Eso no debe mover la libreria.
 */
DDJ200.isPlatterSeeking = function(vDeckNo) {
    return !!(DDJ200.vDeck[vDeckNo] && DDJ200.vDeck[vDeckNo].platterTouched) ||
        (Date.now() < DDJ200.suppressBrowseUntil);
};

DDJ200.markSeekGesture = function() {
    DDJ200.suppressBrowseUntil = Date.now() + 400;
    DDJ200.pendingBrowseAcc = 0;
    DDJ200.pendingBrowseDeck = 0;
};

DDJ200.flushPendingBrowse = function() {
    DDJ200.pendingBrowseTimer = 0;
    var vDeckNo = DDJ200.pendingBrowseDeck;
    var acc = DDJ200.pendingBrowseAcc;
    DDJ200.pendingBrowseAcc = 0;
    if (!vDeckNo || DDJ200.isPlatterSeeking(vDeckNo)) {
        return;
    }
    DDJ200.browseDeckNo = vDeckNo;
    DDJ200.browseTracks(64 + acc);
};

DDJ200.jog = function(channel, control, value, status, group) {
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    if (DDJ200.isShiftHeld()) {
        if (DDJ200.isPlatterSeeking(vDeckNo)) {
            DDJ200.seek(channel, control, value, status, group);
            return;
        }
        // Retrasa el browse 50 ms: si llega touch/seek, se descarta el tick fantasma.
        DDJ200.pendingBrowseDeck = vDeckNo;
        DDJ200.pendingBrowseAcc += (value - 64);
        if (!DDJ200.pendingBrowseTimer) {
            DDJ200.pendingBrowseTimer = engine.beginTimer(50, function() {
                DDJ200.flushPendingBrowse();
            }, true);
        }
        return;
    }
    if (DDJ200.vDeck[vDeckNo]["jogEnabled"]) {
        engine.setValue("[Channel" + vDeckNo + "]", "jog", value - 64);
    }
};

DDJ200.scratch = function(channel, control, value, status, group) {
    if (DDJ200.isShiftHeld()) {
        DDJ200.markSeekGesture();
        DDJ200.seek(channel, control, value, status, group);
        return;
    }
    engine.scratchTick(DDJ200.vDeckNo[script.deckFromGroup(group)],
        value - 64);
};

DDJ200.touch = function(channel, control, value, status, group) {
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    if (value) {
        DDJ200.vDeck[vDeckNo].platterTouched = true;
        DDJ200.vDeck[vDeckNo].jogEnabled = false;
        if (DDJ200.isShiftHeld()) {
            DDJ200.markSeekGesture();
            return;
        }
        var alpha = 1.0 / 8;
        engine.scratchEnable(vDeckNo, 128, 33 + 1 / 3, alpha, alpha / 32);
        return;
    }
    DDJ200.vDeck[vDeckNo].platterTouched = false;
    engine.beginTimer(900, function() {
        DDJ200.vDeck[vDeckNo].jogEnabled = true;
    }, true);
    engine.scratchDisable(vDeckNo);
};

DDJ200.seek = function(channel, control, value, status, group) {
    DDJ200.markSeekGesture();
    var oldPos = engine.getValue(group, "playposition");
    var duration = engine.getValue(group, "duration");
    var newPos = Math.max(0, oldPos + ((value - 64) * 0.2 / duration));

    var deckNo = script.deckFromGroup(group);
    var vgroup = "[Channel" + DDJ200.vDeckNo[deckNo] + "]";
    engine.setValue(vgroup, "playposition", newPos);
};

DDJ200.refreshAutoDjLed = function() {
    var on = engine.getValue("[AutoDJ]", "enabled");
    midi.sendShortMsg(0x96, 0x59, on ? 0x7F : 0x00);
};

DDJ200.updateHeadmixLed = function() {
    // LED encendido = Master en auriculares (headMix > 0)
    var hearMaster = engine.getValue("[Master]", "headMix") > 0;
    midi.sendShortMsg(0x96, 0x63, hearMaster ? 0x7F : 0x00);
};

DDJ200.headmix = function(channel, control, value) {
    if (!value) {
        return;
    }
    var hearMaster = engine.getValue("[Master]", "headMix") > 0;
    engine.setValue("[Master]", "headMix", hearMaster ? -1 : 1);
};

DDJ200.toggleFourDeckMode = function(channel, control, value) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        DDJ200.fourDeckMode = !DDJ200.fourDeckMode;
        if (DDJ200.fourDeckMode) {
            midi.sendShortMsg(0x90, 0x54, 0x00);
            midi.sendShortMsg(0x91, 0x54, 0x00);
        } else {
            DDJ200.vDeckNo[1] = 1;
            DDJ200.vDeckNo[2] = 2;
            DDJ200.switchLEDs(1); // set LEDs of controller deck
            DDJ200.switchLEDs(2); // set LEDs of controller deck
        }
    }
};

DDJ200.play = function(channel, control, value, status, group) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
        var vgroup = "[Channel" + vDeckNo + "]";
        var playing = engine.getValue(vgroup, "play");
        engine.setValue(vgroup, "play", ! playing);
        if (engine.getValue(vgroup, "play") === playing) {
            engine.setValue(vgroup, "play", !playing);
        }
    }
};

DDJ200.syncEnabled = function(channel, control, value, status, group) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
        var vgroup = "[Channel" + vDeckNo + "]";
        var syncEnabled = ! engine.getValue(vgroup, "sync_enabled");
        DDJ200.vDeck[vDeckNo]["syncEnabled"] = syncEnabled;
        engine.setValue(vgroup, "sync_enabled", syncEnabled);
        // El LED lo pinta refreshSyncLed via sync_enabled (skin y hardware).
    }
};

DDJ200.rateMSB = function(channel, control, value, status, group) {
    // store most significant byte value of rate
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    DDJ200.vDeck[vDeckNo]["rateMSB"] = value;
};

DDJ200.rateLSB = function(channel, control, value, status, group) {
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    // calculte rate value from its most and least significant bytes
    var rateMSB = DDJ200.vDeck[vDeckNo]["rateMSB"];
    var rate = 1 - (((rateMSB << 7) + value) / 0x1FFF);
    engine.setValue(vgroup, "rate", rate);
};

DDJ200.volumeMSB = function(channel, control, value, status, group) {
    // store most significant byte value of volume
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    DDJ200.vDeck[vDeckNo]["volMSB"] = value;
};

DDJ200.volumeLSB = function(channel, control, value, status, group) {
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    // calculte volume value from its most and least significant bytes
    var volMSB = DDJ200.vDeck[vDeckNo]["volMSB"];
    var vol = ((volMSB << 7) + value) / 0x3FFF;
    //var vol = ((volMSB << 7) + value); // use for linear correction
    //vol = script.absoluteNonLin(vol, 0, 0.25, 1, 0, 0x3FFF);
    engine.setValue(vgroup, "volume", vol);
};

DDJ200.eq = function(channel, control, value, status, group) {
    var val = script.absoluteNonLin(value, 0, 1, 4);
    var eq = (control === 0x0B) ? 2 : 1;
    if (control === 0x07) {
        eq = 3;
    }
    var deckNo = group.substring(24, 25);
    // var deckNo = group.match("hannel.")[0].substring(6); // more general
    // var deckNo = script.deckFromGroup(group); // working after fix
    // https://github.com/mixxxdj/mixxx/pull/3178 only
    var vDeckNo = DDJ200.vDeckNo[deckNo];
    var vgroup = group.replace("Channel" + deckNo, "Channel" + vDeckNo);
    engine.setValue(vgroup, "parameter" + eq, val);
};

DDJ200.super1 = function(channel, control, value, status, group) {
    var val = script.absoluteNonLin(value, 0, 0.5, 1);
    var deckNo = group.substring(26, 27);
    //var deckNo = group.match("hannel.")[0].substring(6); // more general
    //var deckNo = script.deckFromGroup(group); // working after fix
    // https://github.com/mixxxdj/mixxx/pull/3178 only
    var vDeckNo = DDJ200.vDeckNo[deckNo];
    var vgroup = group.replace("Channel" + deckNo, "Channel" + vDeckNo);
    engine.setValue(vgroup, "super1", val);
};

DDJ200.cueDefault = function(channel, control, value, status, group) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
        var vgroup = "[Channel" + vDeckNo + "]";
        if (!DDJ200.vDeck[vDeckNo]["jogEnabled"]) {  // if jog top is touched
            engine.setValue(vgroup, "cue_set", true);
        } else {
            engine.setValue(vgroup, "cue_gotoandplay", true);
        }
    }
};

DDJ200.cueGotoandstop = function(channel, control, value, status, group) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
        var vgroup = "[Channel" + vDeckNo + "]";
        engine.setValue(vgroup, "cue_gotoandstop", true);
    }
};

DDJ200.padMode = function(vDeckNo) {
    if (vDeckNo !== 1 && vDeckNo !== 2) {
        return DDJ200.PAD_MODE_HOTCUE;
    }
    return engine.getValue("[PadBank" + vDeckNo + "]", "mode");
};

DDJ200.padFxGroup = function(vDeckNo, pad) {
    return "[PadFxRack1_[Channel" + vDeckNo + "]_Effect" + pad + "]";
};

DDJ200.sendUnshiftedPadLed = function(physicalDeck, padNo, on) {
    midi.sendShortMsg(0x97 + 2 * (physicalDeck - 1), padNo - 1, on ? 0x7F : 0x00);
};

/**
 * LED de la capa sin SHIFT (0x97 / 0x99): sigue el modo de la pantalla.
 * La capa SHIFT (0x98 / 0x9A) no se toca aqui.
 */
DDJ200.unshiftedPadLit = function(vDeckNo, padNo) {
    var mode = DDJ200.padMode(vDeckNo);
    var vgroup = "[Channel" + vDeckNo + "]";
    if (mode === DDJ200.PAD_MODE_SAMPLER) {
        return engine.getValue(DDJ200.samplerGroup(vDeckNo, padNo), "play_latched") ||
                engine.getValue(DDJ200.samplerGroup(vDeckNo, padNo), "track_loaded");
    }
    if (mode === DDJ200.PAD_MODE_PADFX) {
        return engine.getValue(DDJ200.padFxGroup(vDeckNo, padNo), "enabled");
    }
    if (mode === DDJ200.PAD_MODE_BEATLOOP) {
        return engine.getValue(vgroup, "beatloop_" + DDJ200.beatLoopMap[padNo - 1] + "_enabled");
    }
    if (mode === DDJ200.PAD_MODE_LOOPROLL) {
        return engine.getValue(vgroup, "beatlooproll_" + DDJ200.beatLoopMap[padNo - 1] + "_activate");
    }
    if (mode === DDJ200.PAD_MODE_BEATJUMP) {
        // Sin ocupacion: apagados, como un banco de samples vacio.
        return false;
    }
    return engine.getValue(vgroup, "hotcue_" + padNo + "_enabled");
};

DDJ200.refreshUnshiftedPadLed = function(physicalDeck, padNo) {
    var vDeckNo = DDJ200.vDeckNo[physicalDeck];
    DDJ200.sendUnshiftedPadLed(
        physicalDeck,
        padNo,
        DDJ200.unshiftedPadLit(vDeckNo, padNo)
    );
};

DDJ200.refreshUnshiftedPadLeds = function(physicalDeck) {
    for (var pad = 1; pad <= 8; pad++) {
        DDJ200.refreshUnshiftedPadLed(physicalDeck, pad);
    }
};

DDJ200.hotcueNActivate = function(channel, control, value, status, group) {
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    var pad = control + 1;
    var mode = DDJ200.padMode(vDeckNo);

    // PAD FX es hold: hay que enviar 1 al pulsar y 0 al soltar.
    if (mode === DDJ200.PAD_MODE_PADFX) {
        engine.setValue(DDJ200.padFxGroup(vDeckNo, pad), "enabled", value ? 1 : 0);
        return;
    }

    if (mode === DDJ200.PAD_MODE_SAMPLER) {
        if (value) {
            engine.setValue(DDJ200.samplerGroup(vDeckNo, pad), "cue_gotoandplay", 1);
        }
        return;
    }

    if (mode === DDJ200.PAD_MODE_BEATLOOP) {
        if (value) {
            engine.setValue(vgroup, "beatloop_" + DDJ200.beatLoopMap[control] + "_toggle", 1);
        }
        return;
    }

    // LOOP ROLL es hold: 1 al pulsar, 0 al soltar (slip / el tema sigue).
    if (mode === DDJ200.PAD_MODE_LOOPROLL) {
        engine.setValue(
            vgroup,
            "beatlooproll_" + DDJ200.beatLoopMap[control] + "_activate",
            value ? 1 : 0
        );
        return;
    }

    if (mode === DDJ200.PAD_MODE_BEATJUMP) {
        var physicalDeck = script.deckFromGroup(group);
        DDJ200.sendUnshiftedPadLed(physicalDeck, pad, !!value);
        if (!value) {
            return;
        }
        var jump = DDJ200.beatJumpMap[control];
        engine.setValue(vgroup, "beatjump_" + jump.size + "_" + jump.dir, 1);
        return;
    }

    // HOT CUE: momentaneo para no re-activar al soltar (sobre todo el pad 1).
    engine.setValue(vgroup, "hotcue_" + pad + "_activate", value ? 1 : 0);
};

DDJ200.hotcueNClear = function(channel, control, value, status, group) {
    var physicalDeck = script.deckFromGroup(group);
    var vDeckNo = DDJ200.vDeckNo[physicalDeck];
    var vgroup = "[Channel" + vDeckNo + "]";
    engine.setValue(vgroup, "hotcue_" + (control + 1) + "_clear", true);
    midi.sendShortMsg(status-1, control, 0x00);        // set hotcue LEDs
    DDJ200.refreshUnshiftedPadLed(physicalDeck, control + 1);
};

/**
 * SHIFT + Pad 1: loop de Mixxx (el botón LOOP de la skin).
 * Por qué no usamos 0x3F: ese midino es el botón SHIFT, no la capa SHIFT+pad.
 * Pioneer manda otro status (0x98 / 0x9A) al mantener SHIFT y pulsar el pad.
 */
DDJ200.beatloopActivate = function(channel, control, value, status, group) {
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    engine.setValue(vgroup, "beatloop_activate", value ? 1 : 0);
};

/** SHIFT + Pad 2: mas beats (4 → 8 → 16...). */
DDJ200.loopDouble = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    engine.setValue("[Channel" + vDeckNo + "]", "loop_double", 1);
};

/** SHIFT + Pad 6: menos beats (8 → 4 → 2...). */
DDJ200.loopHalve = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    engine.setValue("[Channel" + vDeckNo + "]", "loop_halve", 1);
};

/** SHIFT + Pad 5: Repite el bucle (salir / volver a entrar). */
DDJ200.reloopToggle = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    engine.setValue("[Channel" + vDeckNo + "]", "reloop_toggle", 1);
};

/**
 * SHIFT + Pads 3/4: mismo "Avanzar en pulsaciones" de la skin.
 * Usa beatjump_size (Tamaño del salto). Si hay loop, mueve el loop.
 */
DDJ200.sendShiftPadLed = function(physicalDeck, padNote, on) {
    midi.sendShortMsg(0x98 + 2 * (physicalDeck - 1), padNote, on ? 0x7F : 0x00);
};

DDJ200.beatjumpByUiSize = function(group, direction, value) {
    var physicalDeck = script.deckFromGroup(group);
    var padNote = direction > 0 ? 0x03 : 0x02;
    // LED solo mientras el pad esta pulsado (capa SHIFT 0x98 / 0x9A).
    DDJ200.sendShiftPadLed(physicalDeck, padNote, !!value);

    var vDeckNo = DDJ200.vDeckNo[physicalDeck];
    var vgroup = "[Channel" + vDeckNo + "]";
    if (engine.getValue(vgroup, "loop_enabled")) {
        if (value) {
            var jumpSize = engine.getValue(vgroup, "beatjump_size");
            engine.setValue(vgroup, "loop_move", direction * jumpSize);
        }
        return;
    }
    // Por qué 1 al pulsar y 0 al soltar: si se deja en 1, la skin queda
    // "clic izquierdo mantenido" y hay que soltar con el derecho.
    engine.setValue(
        vgroup,
        direction > 0 ? "beatjump_forward" : "beatjump_backward",
        value ? 1 : 0
    );
};

DDJ200.beatjumpBackward = function(channel, control, value, status, group) {
    DDJ200.beatjumpByUiSize(group, -1, value);
};

DDJ200.beatjumpForward = function(channel, control, value, status, group) {
    DDJ200.beatjumpByUiSize(group, 1, value);
};

/** SHIFT + Pad 7: Slip (el tema sigue por debajo al scratch/loop). */
DDJ200.slipToggle = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    engine.setValue(vgroup, "slip_enabled", !engine.getValue(vgroup, "slip_enabled"));
};

/** SHIFT + Pad 8: Reverse (otra pulsacion vuelve a adelante). */
DDJ200.reverseToggle = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    engine.setValue(vgroup, "reverse", !engine.getValue(vgroup, "reverse"));
};

DDJ200.quickEffectGroup = function(vDeckNo) {
    return "[QuickEffectRack1_[Channel" + vDeckNo + "]]";
};

/**
 * Mixxx arranca el efecto ON y el super knob a 0 %.
 * La rueda CFX de la DDJ-200 esta en el centro (neutro = 50 %).
 */
DDJ200.initQuickEffect = function(deck) {
    var fxGroup = DDJ200.quickEffectGroup(deck);
    engine.setValue(fxGroup, "enabled", 0);
    engine.setValue(fxGroup, "super1", 0.5);
};

DDJ200.initQuickEffects = function() {
    for (var deck = 1; deck <= 4; deck++) {
        DDJ200.initQuickEffect(deck);
    }
};

DDJ200.onChannelLed = function(group, applyLed) {
    var vDeckNo = script.deckFromGroup(group);
    var physicalDeck = (vDeckNo % 2) ? 1 : 2;
    if (DDJ200.vDeckNo[physicalDeck] !== vDeckNo) {
        return;
    }
    applyLed(physicalDeck);
};

/**
 * Pioneer usa MIDI distinto con SHIFT:
 * PFL = 0x54, efecto = 0x68; hotcue pad 1 = 0x97, loop = 0x98.
 * Beat SYNC (sin SHIFT) es nota 0x58 y sigue a sync_enabled.
 */
DDJ200.refreshSyncLed = function(physicalDeck) {
    var vgroup = "[Channel" + DDJ200.vDeckNo[physicalDeck] + "]";
    var on = engine.getValue(vgroup, "sync_enabled") ? 0x7F : 0x00;
    midi.sendShortMsg(0x90 + physicalDeck - 1, 0x58, on);
};

DDJ200.refreshCueLed = function(physicalDeck) {
    if (DDJ200.fourDeckMode) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[physicalDeck];
    var status = 0x90 + physicalDeck - 1;
    var pflOn = engine.getValue("[Channel" + vDeckNo + "]", "pfl");
    var fxOn = engine.getValue(DDJ200.quickEffectGroup(vDeckNo), "enabled");
    midi.sendShortMsg(status, 0x54, pflOn ? 0x7F : 0x00);
    midi.sendShortMsg(status, 0x68, fxOn ? 0x7F : 0x00);
};

DDJ200.refreshPad1Led = function(physicalDeck) {
    var vgroup = "[Channel" + DDJ200.vDeckNo[physicalDeck] + "]";
    var d = physicalDeck - 1;
    DDJ200.refreshUnshiftedPadLed(physicalDeck, 1);
    midi.sendShortMsg(0x98 + (2 * d), 0x00, engine.getValue(vgroup, "loop_enabled") ? 0x7F : 0x00);
};

/** Pad 5: LED sin SHIFT segun modo; Reloop en capa SHIFT 0x98 / note 0x04. */
DDJ200.refreshPad5Led = function(physicalDeck) {
    var vgroup = "[Channel" + DDJ200.vDeckNo[physicalDeck] + "]";
    var d = physicalDeck - 1;
    DDJ200.refreshUnshiftedPadLed(physicalDeck, 5);
    midi.sendShortMsg(0x98 + (2 * d), 0x04, engine.getValue(vgroup, "loop_enabled") ? 0x7F : 0x00);
};

/**
 * Pads 1 y 5 tambien escriben la capa SHIFT (loop). El resto solo la capa
 * sin SHIFT, que ahora sigue HOT CUE / BEAT LOOP / LOOP ROLL / PAD FX /
 * BEAT JUMP / SAMPLER.
 */
DDJ200.refreshHotcueLed = function(physicalDeck, padNo) {
    if (padNo === 1) {
        DDJ200.refreshPad1Led(physicalDeck);
        return;
    }
    if (padNo === 5) {
        DDJ200.refreshPad5Led(physicalDeck);
        return;
    }
    DDJ200.refreshUnshiftedPadLed(physicalDeck, padNo);
};

DDJ200.refreshHotcueLeds = function(physicalDeck) {
    for (var pad = 1; pad <= 8; pad++) {
        DDJ200.refreshHotcueLed(physicalDeck, pad);
    }
};

/** SHIFT + Pad 7: LED encendido si Slip esta activo. */
DDJ200.refreshSlipLed = function(physicalDeck) {
    var vgroup = "[Channel" + DDJ200.vDeckNo[physicalDeck] + "]";
    DDJ200.sendShiftPadLed(
        physicalDeck,
        0x06,
        engine.getValue(vgroup, "slip_enabled")
    );
};

/**
 * El LED CUE de transporte: fijo en el punto CUE (pausa),
 * parpadeo si hay CUE pero el playhead esta en otro sitio, apagado en play.
 */
DDJ200.isAtMainCue = function(vgroup) {
    var cuePoint = engine.getValue(vgroup, "cue_point");
    var trackSamples = engine.getValue(vgroup, "track_samples");
    var duration = engine.getValue(vgroup, "duration");
    if (cuePoint < 0 || !trackSamples || !duration) {
        return false;
    }
    var cuePos = cuePoint / trackSamples;
    var deltaSec = Math.abs(engine.getValue(vgroup, "playposition") - cuePos) * duration;
    // Varios buffers de audio: Mixxx no deja el playhead en la muestra exacta.
    return deltaSec < 0.05;
};

DDJ200.refreshMainCueLed = function(physicalDeck) {
    var vgroup = "[Channel" + DDJ200.vDeckNo[physicalDeck] + "]";
    var on = 0x00;
    if (engine.getValue(vgroup, "track_loaded") &&
            engine.getValue(vgroup, "cue_point") !== -1 &&
            !engine.getValue(vgroup, "play")) {
        if (DDJ200.isAtMainCue(vgroup) || DDJ200.playBlinkOn) {
            on = 0x7F;
        }
    }
    midi.sendShortMsg(0x90 + physicalDeck - 1, 0x0C, on);
};

DDJ200.refreshMainCueLeds = function() {
    DDJ200.refreshMainCueLed(1);
    DDJ200.refreshMainCueLed(2);
};

/**
 * PLAY: apagado sin tema, parpadeo si hay tema en pausa, fijo si suena.
 */
DDJ200.startPlayBlinkTimer = function() {
    if (DDJ200.playBlinkTimer) {
        return;
    }
    DDJ200.playBlinkOn = true;
    DDJ200.playBlinkTimer = engine.beginTimer(490, function() {
        DDJ200.playBlinkOn = !DDJ200.playBlinkOn;
        DDJ200.refreshPlayLeds();
        DDJ200.refreshMainCueLeds();
    });
};

DDJ200.stopPlayBlinkTimer = function() {
    if (DDJ200.playBlinkTimer) {
        engine.stopTimer(DDJ200.playBlinkTimer);
        DDJ200.playBlinkTimer = 0;
    }
    DDJ200.playBlinkOn = false;
};

DDJ200.needsPlayBlink = function() {
    for (var physical = 1; physical <= 2; physical++) {
        var vgroup = "[Channel" + DDJ200.vDeckNo[physical] + "]";
        if (engine.getValue(vgroup, "track_loaded") && !engine.getValue(vgroup, "play")) {
            return true;
        }
    }
    return false;
};

DDJ200.updatePlayBlinkTimer = function() {
    if (DDJ200.needsPlayBlink()) {
        DDJ200.startPlayBlinkTimer();
    } else {
        DDJ200.stopPlayBlinkTimer();
    }
    DDJ200.refreshPlayLeds();
    DDJ200.refreshMainCueLeds();
};

DDJ200.refreshPlayLeds = function() {
    DDJ200.refreshPlayLed(1);
    DDJ200.refreshPlayLed(2);
};

DDJ200.refreshPlayLed = function(physicalDeck) {
    var vgroup = "[Channel" + DDJ200.vDeckNo[physicalDeck] + "]";
    var on = 0x00;
    if (engine.getValue(vgroup, "play")) {
        on = 0x7F;
    } else if (engine.getValue(vgroup, "track_loaded") && DDJ200.playBlinkOn) {
        on = 0x7F;
    }
    midi.sendShortMsg(0x90 + physicalDeck - 1, 0x0B, on);
};

DDJ200.refreshShiftLayerLeds = function() {
    DDJ200.refreshCueLed(1);
    DDJ200.refreshCueLed(2);
    DDJ200.refreshHotcueLeds(1);
    DDJ200.refreshHotcueLeds(2);
    DDJ200.refreshSlipLed(1);
    DDJ200.refreshSlipLed(2);
    DDJ200.sendShiftPadLed(1, 0x02, false);
    DDJ200.sendShiftPadLed(1, 0x03, false);
    DDJ200.sendShiftPadLed(2, 0x02, false);
    DDJ200.sendShiftPadLed(2, 0x03, false);
    DDJ200.refreshMainCueLeds();
};

/** CUE 1/2 sin SHIFT: PFL a auriculares. */
DDJ200.pfl = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var vgroup = "[Channel" + vDeckNo + "]";
    engine.setValue(vgroup, "pfl", !engine.getValue(vgroup, "pfl"));
};

/** SHIFT + CUE 1/2: enciende/apaga el efecto rapido (knob CFX). */
DDJ200.quickEffectToggle = function(channel, control, value, status, group) {
    if (!value) {
        return;
    }
    var vDeckNo = DDJ200.vDeckNo[script.deckFromGroup(group)];
    var fxGroup = DDJ200.quickEffectGroup(vDeckNo);
    engine.setValue(fxGroup, "enabled", !engine.getValue(fxGroup, "enabled"));
};

DDJ200.switchLEDs = function(vDeckNo) {
    // set LEDs of controller deck 1 or 2 according to virtual deck
    var d = (vDeckNo % 2) ? 0 : 1;           // d = deckNo - 1
    DDJ200.refreshPlayLed(d + 1);
    DDJ200.refreshMainCueLed(d + 1);
    DDJ200.refreshSyncLed(d + 1);
    DDJ200.refreshCueLed(d + 1);
    DDJ200.refreshHotcueLeds(d + 1);
    DDJ200.refreshSlipLed(d + 1);
};

DDJ200.toggleDeck = function(channel, control, value, status, group) {
    if (value) { // only if button pressed, not releases, i.e. value === 0
        if (DDJ200.shiftPressed["left"]) {
            // left shift + pfl 1/2 does not toggle decks but loads track
            DDJ200.LoadSelectedTrack(channel, control, value, status, group);
        } else if (DDJ200.fourDeckMode) { //right shift + pfl 1/2 toggles
            var deckNo = script.deckFromGroup(group);
            var vDeckNo;
            var led = 0x7F;
            if (deckNo === 1) {
                // toggle virtual deck of controller deck 1
                DDJ200.vDeckNo[1] = 4 - DDJ200.vDeckNo[1];
                if (DDJ200.vDeckNo[1] === 1) {
                    led = 0;
                }
                vDeckNo = DDJ200.vDeckNo[1];
            } else { // deckNo === 2
                // toggle virtual deck of controller deck 2
                DDJ200.vDeckNo[2] = 6 - DDJ200.vDeckNo[2];
                if (DDJ200.vDeckNo[2] === 2) {
                    led = 0;
                }
                vDeckNo = DDJ200.vDeckNo[2];
            }
            midi.sendShortMsg(status, 0x54, led); // toggle virtual deck LED
            DDJ200.switchLEDs(vDeckNo); // set LEDs of controller deck
        }
    }
};
