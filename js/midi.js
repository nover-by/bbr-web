export class MIDIController {
    constructor() {
        this.midiAccess = null;
        this.selectedOutput = null;
        this.channel = 0;
        this.noteConfig = this.getDefaultNoteConfig();
        this.activeNotes = new Set();
        this.noteToBitMap = new Map(); // Track which bit is playing which note
        this.isAvailable = false;
        this.scaleMode = 'None'; // None, Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
        this.rootNote = 57; // A3 by default (same as bit 0)
    }

    // Convert note name (e.g., "C4", "A#5", "Bb2") to MIDI number (0-127)
    static noteNameToNumber(noteName) {
        if (typeof noteName === 'number') {
            return Math.max(0, Math.min(127, Math.floor(noteName)));
        }

        const match = noteName.trim().toUpperCase().match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/);
        if (!match) return null;

        const [, note, accidental = '', octave] = match;
        
        const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
        let midiNote = noteMap[note];
        
        // Apply accidentals
        if (accidental.includes('#')) {
            midiNote += accidental.length;
        } else if (accidental.includes('b')) {
            midiNote -= accidental.length;
        }
        
        // Calculate final MIDI number (C4 = 60)
        const midiNumber = (parseInt(octave) + 1) * 12 + midiNote;
        
        return Math.max(0, Math.min(127, midiNumber));
    }

    // Convert MIDI number to note name (e.g., 60 -> "C4")
    static noteNumberToName(midiNumber) {
        if (midiNumber < 0 || midiNumber > 127) return String(midiNumber);
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNumber / 12) - 1;
        const noteName = noteNames[midiNumber % 12];
        
        return `${noteName}${octave}`;
    }

    // Get scale intervals in semitones from root
    static getScaleIntervals(scaleName) {
        const scales = {
            'None': null,
            'Major': [0, 2, 4, 5, 7, 9, 11],
            'Minor': [0, 2, 3, 5, 7, 8, 10],
            'Dorian': [0, 2, 3, 5, 7, 9, 10],
            'Phrygian': [0, 1, 3, 5, 7, 8, 10],
            'Lydian': [0, 2, 4, 6, 7, 9, 11],
            'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
            'Aeolian': [0, 2, 3, 5, 7, 8, 10], // Natural minor
            'Locrian': [0, 1, 3, 5, 6, 8, 10]
        };
        return scales[scaleName] || null;
    }

    // Quantize a note to the nearest note in the scale
    static quantizeToScale(midiNote, rootNote, scaleIntervals) {
        if (!scaleIntervals) return midiNote;
        
        // Calculate the interval from root
        const interval = midiNote - rootNote;
        const octaveOffset = Math.floor(interval / 12);
        const noteInOctave = ((interval % 12) + 12) % 12; // Ensure positive
        
        // Find nearest scale degree
        let nearestInterval = scaleIntervals[0];
        let minDistance = Math.abs(noteInOctave - nearestInterval);
        
        for (const scaleInterval of scaleIntervals) {
            const distance = Math.abs(noteInOctave - scaleInterval);
            if (distance < minDistance) {
                minDistance = distance;
                nearestInterval = scaleInterval;
            }
        }
        
        // Check if wrapping around octave is closer
        const distanceFromAbove = Math.abs(noteInOctave - (scaleIntervals[scaleIntervals.length - 1] - 12));
        const distanceFromBelow = Math.abs(noteInOctave - (scaleIntervals[0] + 12));
        
        if (noteInOctave < scaleIntervals[0] && distanceFromAbove < minDistance) {
            nearestInterval = scaleIntervals[scaleIntervals.length - 1];
            return rootNote + (octaveOffset - 1) * 12 + nearestInterval;
        } else if (noteInOctave > scaleIntervals[scaleIntervals.length - 1] && distanceFromBelow < minDistance) {
            nearestInterval = scaleIntervals[0];
            return rootNote + (octaveOffset + 1) * 12 + nearestInterval;
        }
        
        return rootNote + octaveOffset * 12 + nearestInterval;
    }

    getDefaultNoteConfig() {
        // Default: A minor chord (A, C, E) with extensions (G, B, D, F, A')
        // 7: G2, 6: A2, 5: B2, 4: C3, 3: D3, 2: E3, 1: F3, 0: A3
        return {
            7: { note: 43, velocity: 100 }, // G2
            6: { note: 45, velocity: 100 }, // A2 (root)
            5: { note: 47, velocity: 100 }, // B2
            4: { note: 48, velocity: 100 }, // C3 (minor third)
            3: { note: 50, velocity: 100 }, // D3
            2: { note: 52, velocity: 100 }, // E3 (fifth)
            1: { note: 53, velocity: 100 }, // F3
            0: { note: 57, velocity: 100 }, // A3 (octave)
        };
    }

    async init() {
        if (!navigator.requestMIDIAccess) {
            this.isAvailable = false;
            return { 
                success: false, 
                error: 'Web MIDI API is not supported in this browser',
                outputs: []
            };
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.midiAccess.onstatechange = (e) => this.onStateChange(e);
            this.isAvailable = true;
            return { success: true, outputs: this.getOutputs() };
        } catch (error) {
            this.isAvailable = false;
            return { success: false, error: error.message, outputs: [] };
        }
    }

    getOutputs() {
        if (!this.midiAccess) return [];
        
        const outputs = [];
        this.midiAccess.outputs.forEach((output) => {
            outputs.push({
                id: output.id,
                name: output.name,
                manufacturer: output.manufacturer
            });
        });
        return outputs;
    }

    selectOutput(outputId) {
        if (!this.midiAccess) return false;
        
        if (!outputId) {
            this.selectedOutput = null;
            return true;
        }
        
        this.selectedOutput = this.midiAccess.outputs.get(outputId);
        return this.selectedOutput !== undefined;
    }

    setChannel(channel) {
        this.channel = Math.max(0, Math.min(15, channel));
    }

    setScaleMode(scaleName) {
        this.scaleMode = scaleName;
    }

    setRootNote(note) {
        // Accept note name or MIDI number
        const noteNumber = typeof note === 'string' ? 
            MIDIController.noteNameToNumber(note) : note;
        
        if (noteNumber !== null && noteNumber >= 0 && noteNumber <= 127) {
            this.rootNote = noteNumber;
        }
    }

    setNoteConfig(bit, note, velocity) {
        if (bit >= 0 && bit <= 7) {
            let noteNumber;
            
            // Handle different input formats
            if (typeof note === 'string') {
                const trimmed = note.trim();
                
                // Check if it's an interval (starts with + or -)
                if (/^[+\-]\d+$/.test(trimmed)) {
                    // Parse as interval from base note (bit 0)
                    const baseNote = this.noteConfig[0].note;
                    const interval = parseInt(trimmed);
                    noteNumber = baseNote + interval;
                } 
                // Check if it's a plain number (MIDI note)
                else if (/^\d+$/.test(trimmed)) {
                    noteNumber = parseInt(trimmed);
                }
                // Otherwise treat as note name
                else {
                    noteNumber = MIDIController.noteNameToNumber(trimmed);
                }
            } else {
                noteNumber = note;
            }
            
            if (noteNumber !== null && noteNumber !== undefined) {
                // Apply scale quantization if a scale is selected
                const scaleIntervals = MIDIController.getScaleIntervals(this.scaleMode);
                if (scaleIntervals) {
                    noteNumber = MIDIController.quantizeToScale(noteNumber, this.rootNote, scaleIntervals);
                }
                
                this.noteConfig[bit] = {
                    note: Math.max(0, Math.min(127, noteNumber)),
                    velocity: Math.max(0, Math.min(127, velocity))
                };
            }
        }
    }

    sendNotesForValue(value) {
        // If no MIDI output selected, just return silently
        if (!this.selectedOutput) return;

        const currentBitNotes = new Map(); // Map of bit -> note for this step
        const notesToBits = new Map(); // Map of note -> Set of bits playing it
        
        // Build mapping of which bits are playing which notes
        for (let bit = 0; bit <= 7; bit++) {
            if ((value >> bit) & 1) {
                const config = this.noteConfig[bit];
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
            
            if (this.activeNotes.has(note)) {
                // Note is already playing
                if (previousBit !== undefined && !bitsPlayingIt.has(previousBit)) {
                    // Different bit is now playing this note - retrigger
                    this.sendNoteOff(note);
                    const config = this.noteConfig[currentBit];
                    this.sendNoteOn(config.note, config.velocity);
                    this.noteToBitMap.set(note, currentBit);
                }
                // else: same bit is still playing - sustain
            } else {
                // Note is not playing - start it
                const config = this.noteConfig[currentBit];
                this.sendNoteOn(config.note, config.velocity);
                this.activeNotes.add(note);
                this.noteToBitMap.set(note, currentBit);
            }
        }

        // Stop notes that are no longer active
        for (const note of this.activeNotes) {
            if (!notesToBits.has(note)) {
                this.sendNoteOff(note);
                this.activeNotes.delete(note);
                this.noteToBitMap.delete(note);
            }
        }
    }

    sendNoteOn(note, velocity) {
        if (!this.selectedOutput) return;
        
        const status = 0x90 | this.channel; // Note On
        this.selectedOutput.send([status, note, velocity]);
    }

    sendNoteOff(note) {
        if (!this.selectedOutput) return;
        
        const status = 0x80 | this.channel; // Note Off
        this.selectedOutput.send([status, note, 0]);
    }

    allNotesOff() {
        // If no MIDI output, just clear active notes
        if (!this.selectedOutput) {
            this.activeNotes.clear();
            this.noteToBitMap.clear();
            return;
        }
        
        // Send note-off for all active notes
        for (const note of this.activeNotes) {
            this.sendNoteOff(note);
        }
        this.activeNotes.clear();
        this.noteToBitMap.clear();

        // Also send All Notes Off CC message
        const status = 0xB0 | this.channel; // Control Change
        this.selectedOutput.send([status, 123, 0]); // All Notes Off
    }

    onStateChange(event) {
        console.log('MIDI state change:', event.port.name, event.port.state);
    }
}