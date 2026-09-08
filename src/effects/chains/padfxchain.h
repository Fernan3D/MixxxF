#pragma once

#include <QString>

#include "effects/chains/pergroupeffectchain.h"

/// PadFxChain es la cadena de efectos que alimenta el modo PAD FX de los
/// Performance Pads. Existe una por deck y no se muestra en el rack de
/// efectos: los pads son su unica interfaz.
///
/// A diferencia de un EffectUnit normal (4 slots compartidos entre decks),
/// esta cadena tiene un slot por pad (kNumPadFxSlots). El constructor carga
/// una tabla por defecto; el usuario puede cambiar efecto e intensidad desde
/// la skin. Esa asignacion se guarda en effects.xml.
///
/// Los slots nacen deshabilitados, asi que mientras no se pulse un pad la
/// cadena no procesa audio: EngineEffectChain omite los efectos deshabilitados
/// y deja el buffer de salida intacto.
///
/// Cada pad se acciona escribiendo en el control "enabled" de su slot
/// (`[PadFxRack1_[ChannelN]_EffectK],enabled`), momentaneo desde la skin y
/// desde las asignaciones MIDI.
class PadFxChain : public PerGroupEffectChain {
    Q_OBJECT
  public:
    PadFxChain(const ChannelHandleAndGroup& handleAndGroup,
            EffectsManager* pEffectsManager,
            EffectsMessengerPointer pEffectsMessenger);

    /// Grupo de la cadena de un deck, p.ej. "[PadFxRack1_[Channel1]]".
    static QString formatEffectChainGroup(const QString& group);

    /// Grupo del slot de un pad (indice 0), p.ej.
    /// "[PadFxRack1_[Channel1]_Effect1]".
    static QString formatEffectSlotGroup(const QString& group,
            int iEffectSlotNumber = 0);

    /// Restaura efecto y metaknob de cada pad. Fuerza mix 1.0 y deja los
    /// slots apagados: PAD FX es momentaneo, no debe quedar un efecto ON
    /// de un cierre anterior.
    void loadChainPreset(EffectChainPresetPointer pPreset) override;

  private:
    /// Carga la tabla fija de efectos en los slots. Un efecto que no exista en
    /// esta compilacion deja su pad vacio en lugar de abortar la carga.
    void loadDefaultPadEffects();
};
