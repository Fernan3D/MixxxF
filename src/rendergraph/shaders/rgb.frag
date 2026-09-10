#version 440

layout(location = 0) in highp vec3 vColor;
layout(location = 0) out highp vec4 fragColor;

void main() {
    // MixxxF: alpha 0.9 para ver el solape de L/M/H y la rejilla detras.
    const float waveformAlpha = 0.9;
    fragColor = vec4(vColor * waveformAlpha, waveformAlpha);
}
