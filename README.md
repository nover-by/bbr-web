# Bytebeat MIDI Sequencer

A web-based bytebeat pattern generator with MIDI output capabilities. Create complex rhythmic patterns using simple mathematical expressions and send them as MIDI notes to your DAW or hardware synthesizers.

![Bytebeat MIDI Screenshot](screenshot.png)

## Features

- **Bytebeat Expression Engine**: Write mathematical expressions using the variable `t` (time counter)
- **8-bit LED Visualization**: Visual feedback showing each bit of the output value
- **MIDI Output**: Send MIDI notes based on the bytebeat output
- **Configurable MIDI Mapping**: Assign different MIDI notes and velocities to each bit
- **BPM Control**: Adjustable tempo from 20 to 300 BPM
- **Transport Controls**: Play, Pause, and Stop functionality
- **Keyboard Shortcuts**: Space to play/pause, Escape to stop

## How It Works

Bytebeat is a technique for creating music using simple mathematical formulas. The variable `t` increments with each step, and the formula produces an 8-bit value (0-255). Each bit of the output can trigger a different MIDI note.

### Example Expressions

- `t&t>>3` - Classic bytebeat rhythm
- `t*(t>>5|t>>8)` - More complex pattern
- `t>>4&t>>8` - Simple polyrhythm
- `(t*5&t>>7)|(t*3&t>>10)` - Layered pattern

## Running Locally

### Option 1: Using Python (Recommended)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000 in your browser.

### Option 2: Using Node.js

```bash
# Install a simple server
npm install -g http-server

# Run it
http-server -p 8000
```

Then open http://localhost:8000 in your browser.

### Option 3: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Hosting on GitHub Pages

1. Create a new GitHub repository
2. Push all files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to repository Settings → Pages
4. Under "Source", select "Deploy from a branch"
5. Select `main` branch and `/ (root)` folder
6. Click Save
7. Your site will be available at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## MIDI Setup

1. Connect your MIDI device or open a virtual MIDI port (like loopMIDI on Windows or IAC Driver on macOS)
2. Select the MIDI output device from the dropdown
3. Choose the MIDI channel
4. Configure note and velocity values for each bit
5. Press Play!

### Default MIDI Mapping

| Bit | Default Note | Note Name |
|-----|--------------|-----------|
| 7 (MSB) | 36 | C2 (Kick) |
| 6 | 38 | D2 (Snare) |
| 5 | 40 | E2 |
| 4 | 42 | F#2 (Hi-hat) |
| 3 | 44 | G#2 |
| 2 | 46 | A#2 |
| 1 | 48 | C3 |
| 0 (LSB) | 50 | D3 |

## Browser Compatibility

This app requires a browser that supports the Web MIDI API:
- ✅ Chrome / Chromium (recommended)
- ✅ Edge
- ✅ Opera
- ❌ Firefox (no Web MIDI support without extensions)
- ❌ Safari (no Web MIDI support)

## License

MIT License - Feel free to use and modify!

## Credits

Inspired by the bytebeat music scene. Learn more about bytebeat at [canonical.org/~kragen/bytebeat/](http://canonical.org/~kragen/bytebeat/)