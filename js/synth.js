export class PolyphonicSynth {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.filter = null;
        this.activeVoices = new Map(); // Map of note numbers to voice objects
        this.noteToBitMap = new Map(); // Track which bit is playing which note
        this.maxVoices = 8; // Maximum number of simultaneous voices
        
        // Synth parameters
        this.waveform = 'sawtooth';
        this.volume = -12; // dB
        this.filterFrequency = 2000;
        this.filterResonance = 1;
        
        // ADSR envelope parameters
        this.attack = 0.01;
        this.decay = 0.1;
        this.sustain = 0.7;
        this.release = 0.3;
        
        this.isInitialized = false;
    }

    async init() {
        try {
            // Create audio context - this needs user interaction in most browsers
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            this.masterGain = this.audioContext.createGain();
            this.updateVolume();
            
            // Create lowpass filter
            this.filter = this.audioContext.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.updateFilter();
            
            // Connect filter to master gain to destination
            this.filter.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            return { success: true };
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            return { success: false, error: error.message };
        }
    }

    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // Convert MIDI note number to frequency
    midiToFreq(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    // Convert dB to gain
    dbToGain(db) {
        return Math.pow(10, db / 20);
    }

    setWaveform(waveform) {
        this.waveform = waveform;
    }

    setVolume(db) {
        this.volume = db;
        this.updateVolume();
    }

    updateVolume() {
        if (this.masterGain) {
            const gain = this.dbToGain(this.volume);
            this.masterGain.gain.setValueAtTime(gain, this.audioContext.currentTime);
        }
    }

    setFilterFrequency(freq) {
        this.filterFrequency = freq;
        this.updateFilter();
    }

    setFilterResonance(q) {
        this.filterResonance = q;
        this.updateFilter();
    }

    updateFilter() {
        if (this.filter) {
            const now = this.audioContext.currentTime;
            this.filter.frequency.setValueAtTime(this.filterFrequency, now);
            this.filter.Q.setValueAtTime(this.filterResonance, now);
        }
    }

    setAttack(time) {
        this.attack = time;
    }

    setDecay(time) {
        this.decay = time;
    }

    setSustain(level) {
        this.sustain = level;
    }

    setRelease(time) {
        this.release = time;
    }

    noteOn(midiNote, velocity = 100) {
        if (!this.isInitialized || !this.audioContext) return;

        // Resume context if suspended (needed for Chrome autoplay policy)
        this.resume();

        // Stop existing note if playing
        if (this.activeVoices.has(midiNote)) {
            this.noteOff(midiNote);
        }

        // Voice limiting: if we have max voices, stop the oldest one
        if (this.activeVoices.size >= this.maxVoices) {
            const oldestNote = this.activeVoices.keys().next().value;
            this.noteOff(oldestNote);
        }

        const now = this.audioContext.currentTime;
        const freq = this.midiToFreq(midiNote);
        const velocityGain = velocity / 127;

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = this.waveform;
        oscillator.frequency.setValueAtTime(freq, now);

        // Create gain node for this voice (for envelope)
        const voiceGain = this.audioContext.createGain();
        voiceGain.gain.setValueAtTime(0, now);

        // ADSR Envelope
        // Attack
        voiceGain.gain.linearRampToValueAtTime(velocityGain, now + this.attack);
        // Decay to sustain
        voiceGain.gain.linearRampToValueAtTime(
            velocityGain * this.sustain, 
            now + this.attack + this.decay
        );

        // Connect oscillator -> voice gain -> filter
        oscillator.connect(voiceGain);
        voiceGain.connect(this.filter);

        // Start oscillator
        oscillator.start(now);

        // Store voice
        this.activeVoices.set(midiNote, {
            oscillator,
            voiceGain,
            velocityGain,
            startTime: now
        });
    }

    noteOff(midiNote) {
        if (!this.isInitialized || !this.audioContext) return;

        const voice = this.activeVoices.get(midiNote);
        if (!voice) return;

        const now = this.audioContext.currentTime;
        const { oscillator, voiceGain } = voice;

        // Cancel any scheduled changes
        voiceGain.gain.cancelScheduledValues(now);

        // Get current gain value
        const currentGain = voiceGain.gain.value;

        // Release envelope
        voiceGain.gain.setValueAtTime(currentGain, now);
        voiceGain.gain.linearRampToValueAtTime(0, now + this.release);

        // Stop oscillator after release
        oscillator.stop(now + this.release);

        // Remove from active voices immediately to free up voice slots
        this.activeVoices.delete(midiNote);
        this.noteToBitMap.delete(midiNote);
    }

    allNotesOff() {
        if (!this.isInitialized || !this.audioContext) {
            this.activeVoices.clear();
            this.noteToBitMap.clear();
            return;
        }

        // Release all active notes
        const notes = Array.from(this.activeVoices.keys());
        notes.forEach(note => this.noteOff(note));
        
        // Ensure maps are cleared
        this.activeVoices.clear();
        this.noteToBitMap.clear();
    }

    // Handle bytebeat value - trigger notes based on bit pattern
    handleValue(value, noteConfig) {
        if (!this.isInitialized) return;

        const currentBitNotes = new Map(); // Map of bit -> note for this step
        const notesToBits = new Map(); // Map of note -> Set of bits playing it

        // Build mapping of which bits are playing which notes
        for (let bit = 0; bit <= 7; bit++) {
            if ((value >> bit) & 1) {
                const config = noteConfig[bit];
                if (config) {
                    currentBitNotes.set(bit, config.note);
                    
                    if (!notesToBits.has(config.note)) {
                        notesToBits.set(config.note, new Set());
                    }
                    notesToBits.get(config.note).add(bit);
                }
            }
        }

        // Handle note retriggering logic
        for (const [note, bitsPlayingIt] of notesToBits) {
            const previousBit = this.noteToBitMap.get(note);
            const currentBit = bitsPlayingIt.values().next().value; // Get first bit playing this note
            
            if (this.activeVoices.has(note)) {
                // Note is already playing
                if (previousBit !== undefined && !bitsPlayingIt.has(previousBit)) {
                    // Different bit is now playing this note - retrigger
                    this.noteOff(note);
                    const config = noteConfig[currentBit];
                    this.noteOn(config.note, config.velocity);
                    this.noteToBitMap.set(note, currentBit);
                }
                // else: same bit is still playing - sustain
            } else {
                // Note is not playing - start it
                const config = noteConfig[currentBit];
                this.noteOn(config.note, config.velocity);
                this.noteToBitMap.set(note, currentBit);
            }
        }

        // Stop notes that are no longer active
        for (const [note] of this.activeVoices) {
            if (!notesToBits.has(note)) {
                this.noteOff(note);
            }
        }
    }
}