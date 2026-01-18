import { BytebeatEngine } from './bytebeat.js';
import { MIDIController } from './midi.js';
import { PolyphonicSynth } from './synth.js';

// Make MIDIController available globally for note conversion
window.MIDIController = MIDIController;

class App {
    constructor() {
        this.bytebeat = new BytebeatEngine();
        this.midi = new MIDIController();
        this.synth = new PolyphonicSynth();
        
        this.isPlaying = false;
        this.isPaused = false;
        this.bpm = 120;
        this.intervalId = null;
        this.outputMode = 'synth'; // 'synth' or 'midi'
        
        this.initElements();
        this.initEventListeners();
        this.initMIDI();
        this.initSynth();
        this.updateLEDLabels();
        this.updateDisplay(0);
    }

    initElements() {
        // Code input
        this.codeInput = document.getElementById('bytebeat-code');
        this.hintButtons = document.querySelectorAll('.hint-btn');
        
        // BPM controls
        this.bpmInput = document.getElementById('bpm');
        this.bpmDecrease = document.getElementById('bpm-decrease');
        this.bpmIncrease = document.getElementById('bpm-increase');
        
        // Scale controls
        this.scaleRoot = document.getElementById('scale-root');
        this.scaleMode = document.getElementById('scale-mode');
        
        // LEDs
        this.leds = document.querySelectorAll('.led');
        this.ledWrappers = document.querySelectorAll('.led-wrapper');
        this.currentValueDisplay = document.getElementById('current-value');
        
        // Inline LED Editor
        this.ledEditorInline = document.getElementById('led-editor-inline');
        this.inlineBitNum = document.getElementById('inline-bit-num');
        this.inlineNoteInput = document.getElementById('inline-note-input');
        this.inlineVelocityInput = document.getElementById('inline-velocity-input');
        this.inlineCloseBtn = document.getElementById('inline-close-btn');
        this.currentEditingBit = null;
        
        // Output Mode
        this.modeSynthBtn = document.getElementById('mode-synth');
        this.modeMidiBtn = document.getElementById('mode-midi');
        this.synthSection = document.getElementById('synth-section');
        this.midiSection = document.getElementById('midi-section');
        
        // Synth Controls
        this.synthStatus = document.getElementById('synth-status');
        this.synthWaveform = document.getElementById('synth-waveform');
        this.synthVolume = document.getElementById('synth-volume');
        this.synthVolumeValue = document.getElementById('synth-volume-value');
        this.synthFilterFreq = document.getElementById('synth-filter-freq');
        this.synthFilterFreqValue = document.getElementById('synth-filter-freq-value');
        this.synthFilterRes = document.getElementById('synth-filter-res');
        this.synthFilterResValue = document.getElementById('synth-filter-res-value');
        this.synthAttack = document.getElementById('synth-attack');
        this.synthAttackValue = document.getElementById('synth-attack-value');
        this.synthDecay = document.getElementById('synth-decay');
        this.synthDecayValue = document.getElementById('synth-decay-value');
        this.synthSustain = document.getElementById('synth-sustain');
        this.synthSustainValue = document.getElementById('synth-sustain-value');
        this.synthRelease = document.getElementById('synth-release');
        this.synthReleaseValue = document.getElementById('synth-release-value');
        
        // MIDI
        this.midiStatus = document.getElementById('midi-status');
        this.midiOutputSelect = document.getElementById('midi-output');
        this.midiChannelSelect = document.getElementById('midi-channel');
        
        // Transport
        this.playBtn = document.getElementById('play-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.stepCounter = document.getElementById('step-counter');
    }

    initEventListeners() {
        // Code input
        this.codeInput.addEventListener('input', () => this.onCodeChange());
        this.codeInput.addEventListener('blur', () => this.onCodeChange());
        this.codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.codeInput.blur();
                this.onCodeChange();
            }
        });
        
        // Hint buttons
        this.hintButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.codeInput.value = btn.dataset.code;
                this.onCodeChange();
            });
        });
        
        // BPM controls
        this.bpmInput.addEventListener('input', () => this.onBPMChange());
        this.bpmInput.addEventListener('change', () => this.onBPMChange());
        this.bpmDecrease.addEventListener('click', () => {
            this.bpmInput.value = Math.max(20, parseInt(this.bpmInput.value) - 5);
            this.onBPMChange();
        });
        this.bpmIncrease.addEventListener('click', () => {
            this.bpmInput.value = Math.min(300, parseInt(this.bpmInput.value) + 5);
            this.onBPMChange();
        });
        
        // Scale controls
        this.scaleRoot.addEventListener('change', () => this.onScaleRootChange());
        this.scaleRoot.addEventListener('blur', () => this.onScaleRootChange());
        this.scaleMode.addEventListener('change', () => this.onScaleModeChange());
        
        // Output Mode
        this.modeSynthBtn.addEventListener('click', () => this.setOutputMode('synth'));
        this.modeMidiBtn.addEventListener('click', () => this.setOutputMode('midi'));
        
        // Synth Controls
        this.synthWaveform.addEventListener('change', () => {
            this.synth.setWaveform(this.synthWaveform.value);
        });
        
        this.synthVolume.addEventListener('input', () => {
            const value = parseFloat(this.synthVolume.value);
            this.synth.setVolume(value);
            this.synthVolumeValue.textContent = `${value} dB`;
        });
        
        this.synthFilterFreq.addEventListener('input', () => {
            const value = parseFloat(this.synthFilterFreq.value);
            this.synth.setFilterFrequency(value);
            this.synthFilterFreqValue.textContent = `${Math.round(value)} Hz`;
        });
        
        this.synthFilterRes.addEventListener('input', () => {
            const value = parseFloat(this.synthFilterRes.value);
            this.synth.setFilterResonance(value);
            this.synthFilterResValue.textContent = value.toFixed(1);
        });
        
        this.synthAttack.addEventListener('input', () => {
            const value = parseFloat(this.synthAttack.value);
            this.synth.setAttack(value);
            this.synthAttackValue.textContent = `${value.toFixed(2)}s`;
        });
        
        this.synthDecay.addEventListener('input', () => {
            const value = parseFloat(this.synthDecay.value);
            this.synth.setDecay(value);
            this.synthDecayValue.textContent = `${value.toFixed(2)}s`;
        });
        
        this.synthSustain.addEventListener('input', () => {
            const value = parseFloat(this.synthSustain.value);
            this.synth.setSustain(value);
            this.synthSustainValue.textContent = value.toFixed(2);
        });
        
        this.synthRelease.addEventListener('input', () => {
            const value = parseFloat(this.synthRelease.value);
            this.synth.setRelease(value);
            this.synthReleaseValue.textContent = `${value.toFixed(2)}s`;
        });
        
        // MIDI output selection
        this.midiOutputSelect.addEventListener('change', () => {
            this.midi.selectOutput(this.midiOutputSelect.value);
            this.updateMIDIOutputStatus();
        });
        
        // MIDI channel selection
        this.midiChannelSelect.addEventListener('change', () => {
            this.midi.setChannel(parseInt(this.midiChannelSelect.value));
        });
        
        // Transport controls
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        // LED click handlers
        this.ledWrappers.forEach(wrapper => {
            wrapper.addEventListener('click', () => {
                const bit = parseInt(wrapper.dataset.bit);
                this.openLEDEditor(bit);
            });
        });
        
        // Inline editor handlers
        this.inlineCloseBtn.addEventListener('click', () => this.closeInlineEditor());
        
        this.inlineNoteInput.addEventListener('blur', () => {
            this.saveInlineConfig();
        });
        
        this.inlineNoteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.inlineVelocityInput.focus();
            }
        });
        
        this.inlineVelocityInput.addEventListener('blur', () => {
            this.saveInlineConfig();
        });
        
        this.inlineVelocityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.closeInlineEditor();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Close inline editor on Escape
            if (e.key === 'Escape' && this.ledEditorInline.style.display !== 'none') {
                this.closeInlineEditor();
                return;
            }
            
            // Don't trigger shortcuts when typing in inputs or editor is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (this.ledEditorInline.style.display !== 'none') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.isPlaying && !this.isPaused) {
                        this.pause();
                    } else {
                        this.play();
                    }
                    break;
                case 'Escape':
                    this.stop();
                    break;
            }
        });
    }

    async initMIDI() {
        const result = await this.midi.init();
        
        if (result.success) {
            if (result.outputs.length > 0) {
                this.updateMIDIStatus('connected', 'MIDI Available');
                this.populateMIDIOutputs(result.outputs);
            } else {
                this.updateMIDIStatus('connected', 'No MIDI Outputs');
            }
        } else {
            this.updateMIDIStatus('error', result.error || 'MIDI Not Available');
        }
    }

    async initSynth() {
        const result = await this.synth.init();
        
        if (result.success) {
            this.updateSynthStatus('connected', 'Ready');
        } else {
            this.updateSynthStatus('error', 'Audio Error');
            console.error('Synth initialization failed:', result.error);
        }
    }

    setOutputMode(mode) {
        this.outputMode = mode;
        
        // Update button states
        this.modeSynthBtn.classList.toggle('active', mode === 'synth');
        this.modeMidiBtn.classList.toggle('active', mode === 'midi');
        
        // Show/hide sections
        this.synthSection.style.display = mode === 'synth' ? 'block' : 'none';
        this.midiSection.style.display = mode === 'midi' ? 'block' : 'none';
    }

    updateMIDIStatus(status, text) {
        this.midiStatus.className = 'midi-status ' + status;
        this.midiStatus.querySelector('.status-text').textContent = text;
    }

    updateSynthStatus(status, text) {
        this.synthStatus.className = 'synth-status ' + status;
        this.synthStatus.querySelector('.status-text').textContent = text;
    }

    updateMIDIOutputStatus() {
        if (this.midiOutputSelect.value) {
            this.updateMIDIStatus('connected', 'MIDI Connected');
        } else {
            this.updateMIDIStatus('connected', 'No Output Selected');
        }
    }

    populateMIDIOutputs(outputs) {
        this.midiOutputSelect.innerHTML = '<option value="">Select MIDI Output...</option>';
        
        outputs.forEach(output => {
            const option = document.createElement('option');
            option.value = output.id;
            option.textContent = output.name;
            this.midiOutputSelect.appendChild(option);
        });
    }

    onCodeChange() {
        const code = this.codeInput.value.trim();
        
        if (!code) {
            this.codeInput.style.borderColor = 'var(--error)';
            return;
        }
        
        const result = this.bytebeat.compile(code);
        
        if (result.success) {
            this.codeInput.style.borderColor = '';
        } else {
            this.codeInput.style.borderColor = 'var(--error)';
        }
    }

    onBPMChange() {
        this.bpm = parseInt(this.bpmInput.value) || 120;
        this.bpm = Math.max(20, Math.min(300, this.bpm));
        this.bpmInput.value = this.bpm;
        
        // Restart interval if playing
        if (this.isPlaying && !this.isPaused) {
            this.stopInterval();
            this.startInterval();
        }
    }

    onScaleRootChange() {
        const rootValue = this.scaleRoot.value.trim();
        if (!rootValue) return;
        
        // Try to parse as note name or MIDI number
        const midiNumber = /^\d+$/.test(rootValue) ? 
            parseInt(rootValue) : 
            MIDIController.noteNameToNumber(rootValue);
        
        if (midiNumber !== null && midiNumber >= 0 && midiNumber <= 127) {
            this.midi.setRootNote(midiNumber);
            this.scaleRoot.style.borderColor = '';
            
            // Update bit 0 to match the root note if in scale mode
            if (this.midi.scaleMode !== 'None') {
                this.reapplyAllNoteConfigs();
            }
        } else {
            this.scaleRoot.style.borderColor = 'var(--error)';
        }
    }

    onScaleModeChange() {
        const scaleMode = this.scaleMode.value;
        this.midi.setScaleMode(scaleMode);
        
        // Re-apply all note configurations with scale quantization
        this.reapplyAllNoteConfigs();
    }

    reapplyAllNoteConfigs() {
        // Re-apply all note configs to trigger scale quantization
        for (let bit = 0; bit <= 7; bit++) {
            const config = this.midi.noteConfig[bit];
            if (config) {
                this.midi.setNoteConfig(bit, config.note, config.velocity);
            }
        }
        this.updateLEDLabels();
    }

    async play() {
        // Ensure we have a valid expression
        this.onCodeChange();
        
        // Initialize/resume audio context if using synth
        if (this.outputMode === 'synth' && this.synth.audioContext) {
            await this.synth.resume();
        }
        
        if (this.isPaused) {
            this.isPaused = false;
            this.startInterval();
        } else if (!this.isPlaying) {
            this.isPlaying = true;
            this.isPaused = false;
            this.startInterval();
        }
        
        this.updateTransportButtons();
    }

    pause() {
        if (this.isPlaying) {
            this.isPaused = true;
            this.stopInterval();
            
            // Stop all notes
            if (this.outputMode === 'synth') {
                this.synth.allNotesOff();
            } else {
                this.midi.allNotesOff();
            }
        }
        
        this.updateTransportButtons();
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.stopInterval();
        this.bytebeat.reset();
        
        // Stop all notes
        if (this.outputMode === 'synth') {
            this.synth.allNotesOff();
        } else {
            this.midi.allNotesOff();
        }
        
        this.updateDisplay(0);
        this.stepCounter.textContent = '0';
        
        this.updateTransportButtons();
    }

    startInterval() {
        // Each step should be a 16th note at the given BPM
        // At 120 BPM: 120 beats/min = 2 beats/sec = 8 sixteenth notes/sec
        // So interval = 60000 / (BPM * 4) for quarter notes, or * 2 for eighth notes
        // To match user's expectation: double the speed
        const intervalMs = (60 / this.bpm) * 1000 / 2;
        
        // Execute first tick immediately
        this.tick();
        
        this.intervalId = setInterval(() => {
            this.tick();
        }, intervalMs);
    }

    stopInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    tick() {
        const value = this.bytebeat.step();
        this.updateDisplay(value);
        
        // Send to appropriate output
        if (this.outputMode === 'synth') {
            this.synth.handleValue(value, this.midi.noteConfig);
        } else {
            this.midi.sendNotesForValue(value);
        }
        
        this.stepCounter.textContent = this.bytebeat.getTime();
    }

    updateDisplay(value) {
        const bits = this.bytebeat.getBits(value);
        // Get velocity for each bit from MIDI config
        const velocities = [];
        for (let i = 0; i < 8; i++) {
            const config = this.midi.noteConfig && this.midi.noteConfig[i];
            velocities[i] = config ? config.velocity : 100;
        }

        // Update LEDs
        this.leds.forEach((led, index) => {
            if (bits[index]) {
                led.classList.add('active');
                // Set brightness as a CSS variable (0.2 to 1.0)
                const v = velocities[index];
                const brightness = 0.2 + 0.8 * (Math.max(0, Math.min(127, v)) / 127);
                led.style.setProperty('--led-brightness', brightness);
            } else {
                led.classList.remove('active');
                led.style.setProperty('--led-brightness', 0.2);
            }
        });

        // Update value display
        this.currentValueDisplay.textContent = value;
    }

    updateTransportButtons() {
        this.playBtn.classList.toggle('active', this.isPlaying && !this.isPaused);
        this.pauseBtn.classList.toggle('active', this.isPaused);
    }

    openLEDEditor(bit) {
        this.currentEditingBit = bit;
        this.inlineBitNum.textContent = bit;
        
        // Get current configuration
        const config = this.midi.noteConfig[bit];
        const noteName = MIDIController.noteNumberToName(config.note);
        
        this.inlineNoteInput.value = noteName;
        this.inlineVelocityInput.value = config.velocity;
        
        this.ledEditorInline.style.display = 'block';
        this.inlineNoteInput.focus();
        this.inlineNoteInput.select();
    }

    closeInlineEditor() {
        this.saveInlineConfig();
        this.ledEditorInline.style.display = 'none';
        this.currentEditingBit = null;
    }

    saveInlineConfig() {
        if (this.currentEditingBit === null) return;
        
        const noteValue = this.inlineNoteInput.value.trim();
        const velocity = parseInt(this.inlineVelocityInput.value);
        
        if (!noteValue) return;
        
        // Validate note - can be note name, MIDI number, or interval
        let isValid = false;
        
        if (/^[+\-]\d+$/.test(noteValue)) {
            // Interval format: +3, -2, etc.
            isValid = true;
        } else if (/^\d+$/.test(noteValue)) {
            // MIDI number format
            const num = parseInt(noteValue);
            isValid = num >= 0 && num <= 127;
        } else {
            // Note name format
            const midiNumber = MIDIController.noteNameToNumber(noteValue);
            isValid = midiNumber !== null;
        }
        
        if (!isValid) {
            this.inlineNoteInput.style.borderColor = 'var(--error)';
            return;
        }
        
        this.inlineNoteInput.style.borderColor = '';
        
        // Update MIDI config (used by both synth and MIDI)
        this.midi.setNoteConfig(this.currentEditingBit, noteValue, velocity);
        
        // Update LED label
        this.updateLEDLabel(this.currentEditingBit);
    }

    updateLEDLabels() {
        // Update all LED labels with current note names
        for (let bit = 0; bit <= 7; bit++) {
            this.updateLEDLabel(bit);
        }
    }

    updateLEDLabel(bit) {
        const led = document.querySelector(`.led[data-bit="${bit}"]`);
        if (!led) return;
        
        const noteText = led.querySelector('.led-note-text');
        if (!noteText) return;
        
        const config = this.midi.noteConfig[bit];
        const noteName = MIDIController.noteNumberToName(config.note);
        noteText.textContent = noteName;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});