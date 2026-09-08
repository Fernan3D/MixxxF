#include "effects/chains/padfxchain.h"

#include <array>

#include "effects/backends/effectsbackendmanager.h"
#include "effects/effectslot.h"
#include "effects/effectsmanager.h"
#include "effects/presets/effectchainpreset.h"
#include "moc_padfxchain.cpp"
#include "util/assert.h"

namespace {

/// Asignacion fija de pad -> efecto, en el orden de la cuadricula 2x4
/// (pads 1-4 arriba, 5-8 abajo). El metaknob se fija aqui porque un pad
/// momentaneo no tiene mando: el valor por defecto de cada efecto suele ser
/// neutro y no se notaria al pulsar.
struct PadFxPreset {
    const char* effectId;
    double metaknob;
};

constexpr std::array<PadFxPreset, kNumPadFxSlots> kPadFxPresets = {{
        {"org.mixxx.effects.echo", 0.40},
        {"org.mixxx.effects.reverb", 0.40},
        {"org.mixxx.effects.flanger", 0.50},
        {"org.mixxx.effects.phaser", 0.50},
        // El metaknob del filtro es neutro en 0.5; 0.75 deja un paso alto
        // marcado, que es el uso habitual del pad.
        {"org.mixxx.effects.filter", 0.75},
        {"org.mixxx.effects.bitcrusher", 0.50},
        {"org.mixxx.effects.autopan", 0.50},
        {"org.mixxx.effects.tremolo", 0.50},
}};

} // anonymous namespace

PadFxChain::PadFxChain(const ChannelHandleAndGroup& handleAndGroup,
        EffectsManager* pEffectsManager,
        EffectsMessengerPointer pEffectsMessenger)
        : PerGroupEffectChain(handleAndGroup,
                  formatEffectChainGroup(handleAndGroup.name()),
                  SignalProcessingStage::Postfader,
                  pEffectsManager,
                  pEffectsMessenger) {
    for (int i = 0; i < kNumPadFxSlots; ++i) {
        addEffectSlot(formatEffectSlotGroup(handleAndGroup.name(), i));
    }

    // Enrutar antes de cargar: EffectSlot crea el EngineEffect con los canales
    // activos de la cadena, de modo que el estado DSP de este deck se reserva
    // en el hilo principal y no en el callback de audio.
    enableForInputChannel(handleAndGroup);

    loadDefaultPadEffects();
}

QString PadFxChain::formatEffectChainGroup(const QString& group) {
    return QStringLiteral("[PadFxRack1_%1]").arg(group);
}

QString PadFxChain::formatEffectSlotGroup(const QString& group,
        int iEffectSlotNumber) {
    return QStringLiteral("[PadFxRack1_%1_Effect%2]")
            .arg(group, QString::number(iEffectSlotNumber + 1));
}

void PadFxChain::loadDefaultPadEffects() {
    const EffectsBackendManagerPointer pBackendManager =
            m_pEffectsManager->getBackendManager();
    VERIFY_OR_DEBUG_ASSERT(pBackendManager) {
        return;
    }

    for (int i = 0; i < kNumPadFxSlots; ++i) {
        const QString effectId = QString::fromLatin1(kPadFxPresets[i].effectId);
        const EffectManifestPointer pManifest =
                pBackendManager->getManifest(effectId, EffectBackendType::BuiltIn);
        if (!pManifest) {
            qWarning() << "PadFxChain" << getGroup() << ": el efecto" << effectId
                       << "no esta disponible, el pad" << (i + 1) << "queda vacio";
            continue;
        }

        const EffectSlotPointer pSlot = m_effectSlots.at(i);
        pSlot->loadEffectWithDefaults(pManifest);
        pSlot->setMetaParameter(kPadFxPresets[i].metaknob, true);
    }
}

void PadFxChain::loadChainPreset(EffectChainPresetPointer pPreset) {
    EffectChain::loadChainPreset(pPreset);
    // PerGroupEffectChain ya deja mix en 1.0; loadChainPreset no lo toca,
    // pero lo reafirmamos por si un preset futuro guardara wet/dry.
    m_pControlChainMix->set(1.0);
    sendParameterUpdate();
    for (const auto& pSlot : std::as_const(m_effectSlots)) {
        pSlot->setEnabled(false);
    }
}
