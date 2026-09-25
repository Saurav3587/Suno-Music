import React from 'react';
import { X, RotateCcw, Volume2, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

const FREQUENCY_LABELS = [
  { freq: '60 Hz', label: 'Sub Bass' },
  { freq: '230 Hz', label: 'Bass' },
  { freq: '910 Hz', label: 'Mid' },
  { freq: '3.6 kHz', label: 'Presence' },
  { freq: '14 kHz', label: 'Treble' }
];

const CROSSFADE_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 2, label: '2s' },
  { value: 4, label: '4s' },
  { value: 6, label: '6s' },
  { value: 8, label: '8s' },
  { value: 12, label: '12s' }
];

export default function EqualizerModal({ onClose }) {
  const {
    eqEnabled,
    toggleEq,
    eqPreset,
    setEqPreset,
    eqBands,
    setEqBand,
    bassBoost,
    setBassBoost,
    EQ_PRESETS,
    crossfadeDuration,
    setCrossfadeDuration
  } = useMusic();

  const presetNames = Object.keys(EQ_PRESETS);

  const handleReset = () => {
    setEqPreset('Flat');
    setBassBoost(0);
  };

  return (
    <div className="eq-modal-backdrop" onClick={onClose}>
      <div className="eq-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="eq-modal-header">
          <div className="eq-modal-title-group">
            <div className="eq-modal-icon-badge">
              <SlidersHorizontal size={18} color="#f5a65b" />
            </div>
            <div>
              <h2 className="eq-modal-title">Studio Equalizer</h2>
              <span className="eq-modal-subtitle">5-Band Audiophile Sound Shaper</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Master Toggle */}
            <button
              type="button"
              className={`eq-master-toggle ${eqEnabled ? 'active' : ''}`}
              onClick={() => toggleEq(!eqEnabled)}
              title={eqEnabled ? 'Disable Equalizer' : 'Enable Equalizer'}
            >
              <div className="eq-toggle-knob" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="action-btn"
              title="Close Equalizer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Presets Horizontal Row */}
        <div className="eq-presets-wrapper">
          <div className="eq-presets-scroll">
            {presetNames.map((name) => {
              const isActive = eqPreset === name;
              return (
                <button
                  key={name}
                  type="button"
                  className={`eq-preset-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setEqPreset(name)}
                  disabled={!eqEnabled}
                >
                  {name}
                </button>
              );
            })}
            {eqPreset === 'Custom' && (
              <span className="eq-preset-chip active custom">Custom</span>
            )}
          </div>
        </div>

        {/* 5-Band Vertical Frequency Sliders */}
        <div className={`eq-sliders-container ${!eqEnabled ? 'disabled' : ''}`}>
          {FREQUENCY_LABELS.map((item, idx) => {
            const gain = eqBands[idx] !== undefined ? eqBands[idx] : 0;
            return (
              <div key={item.freq} className="eq-band-column">
                <span className="eq-band-gain">
                  {gain > 0 ? `+${gain}` : gain}dB
                </span>

                <div className="eq-slider-track-wrap">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={gain}
                    onChange={(e) => setEqBand(idx, parseFloat(e.target.value))}
                    className="eq-vertical-slider"
                    disabled={!eqEnabled}
                    title={`${item.label} (${item.freq}): ${gain}dB`}
                  />
                  {/* Zero dB Centerline indicator */}
                  <div className="eq-slider-zeroline" />
                </div>

                <div className="eq-band-info">
                  <span className="eq-band-freq">{item.freq}</span>
                  <span className="eq-band-label">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bass Boost Dial & Slider */}
        <div className={`eq-bass-boost-card ${!eqEnabled ? 'disabled' : ''}`}>
          <div className="eq-bass-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#f5a65b" />
              <span className="eq-bass-title">Sub-Bass & Punch</span>
            </div>
            <span className="eq-bass-value">{bassBoost}%</span>
          </div>

          <div className="eq-bass-slider-wrap">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={bassBoost}
              onChange={(e) => setBassBoost(parseInt(e.target.value, 10))}
              className="eq-horizontal-slider"
              disabled={!eqEnabled}
            />
            <div
              className="eq-bass-glow-fill"
              style={{ width: `${bassBoost}%` }}
            />
          </div>
        </div>

        {/* Crossfade Audio Transitions */}
        <div className="eq-crossfade-card">
          <div className="eq-crossfade-header">
            <div>
              <div className="eq-crossfade-title">Smooth Crossfade (Gapless)</div>
              <div className="eq-crossfade-desc">
                Blends the end of each track smoothly into the next
              </div>
            </div>
          </div>

          <div className="eq-crossfade-options">
            {CROSSFADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`eq-crossfade-chip ${crossfadeDuration === opt.value ? 'active' : ''}`}
                onClick={() => setCrossfadeDuration(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="eq-modal-footer">
          <button
            type="button"
            className="eq-reset-btn"
            onClick={handleReset}
            disabled={!eqEnabled}
          >
            <RotateCcw size={14} />
            <span>Reset to Flat</span>
          </button>

          <button
            type="button"
            className="eq-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
