document.addEventListener('DOMContentLoaded', function() {
    // Wait for core app to initialize
    setTimeout(() => {
        // Load all enhancements
        addTouchSupport();
        addKeyboardControls();
        enhanceVisuals();
        addAdvancedAudio();
        addRecordingFeature();
        addScaleSelector();
        addAutoPlayFeature();
        addWelcomeModal();
        addHelpButton();
        
        console.log("All SoundSpace enhancements loaded successfully!");
    }, 300);
});

// Touch Support
function addTouchSupport() {
    // Touch move
    document.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Update cursor position
            window.cursor.style.left = x + 'px';
            window.cursor.style.top = y + 'px';
            document.querySelector('.cursor-ring').style.left = x + 'px';
            document.querySelector('.cursor-ring').style.top = y + 'px';
            
            // Update coordinates display
            const coordsDisplay = document.getElementById('coordinates');
            coordsDisplay.textContent = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
            
            // Get note from position
            const noteData = window.getNoteFromPosition(x, y);
            const parameters = window.getParametersFromY(y);
            
            if (window.isMouseDown) {
                // If we're on a different note, stop the previous one
                if (window.currentNote && window.currentNote.note !== noteData.note) {
                    window.stopNote(window.currentNote);
                    window.currentNote = noteData;
                    window.playNote(noteData, parameters);
                } else if (!window.currentNote) {
                    window.currentNote = noteData;
                    window.playNote(noteData, parameters);
                } else {
                    // Update parameters for current note
                    window.updateNote(noteData, parameters);
                }
            }
            
            // Draw on canvas
            window.drawCanvas(x, y, noteData, parameters);
        }
    }, { passive: false });

    // Touch start
    document.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.isMouseDown = true;
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Simulate active cursor
            window.cursor.classList.add('active');
            
            // Get note from position
            const noteData = window.getNoteFromPosition(x, y);
            const parameters = window.getParametersFromY(y);
            
            window.currentNote = noteData;
            window.playNote(noteData, parameters);
        }
    }, { passive: false });

    // Touch end
    document.addEventListener('touchend', () => {
        window.isMouseDown = false;
        
        // Remove active cursor
        window.cursor.classList.remove('active');
        
        if (window.currentNote) {
            window.stopNote(window.currentNote);
            window.currentNote = null;
        }
    });
}

// Keyboard Controls
function addKeyboardControls() {
    // Keyboard mapping for piano notes (ASDFGHJKL)
    const keyboardMap = {
        'a': { index: 0, note: window.scale[0] },
        's': { index: 1, note: window.scale[1] },
        'd': { index: 2, note: window.scale[2] },
        'f': { index: 3, note: window.scale[3] },
        'g': { index: 4, note: window.scale[4] },
        'h': { index: 5, note: window.scale[5] },
        'j': { index: 6, note: window.scale[6] },
        'k': { index: 7, note: window.scale[7] },
        'l': { index: 8, note: window.scale[8] },
        ';': { index: 9, note: window.scale[9] },
        '\'': { index: 10, note: window.scale[10] }
    };

    // Track active keys
    const activeKeys = {};

    // Add keyboard event listeners
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        // Only process if it's in our map and not already active
        if (keyboardMap[key] && !activeKeys[key]) {
            // Calculate parameter from current mouse position or use default
            const y = window.cursor.offsetTop || window.innerHeight / 2;
            const parameters = window.getParametersFromY(y);
            
            // Get note data
            const noteData = keyboardMap[key].note;
            
            // Play the note
            window.playNote(noteData, parameters);
            
            // Mark key as active
            activeKeys[key] = noteData;
            
            // Visual feedback - simulate a mouse position
            const virtualX = (keyboardMap[key].index / (window.scale.length - 1)) * window.innerWidth;
            window.drawCanvas(virtualX, y, noteData, parameters);
            
            // Create virtual particle for visual feedback
            window.createParticle(virtualX, y);
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        
        // Stop the note if it's active
        if (activeKeys[key]) {
            window.stopNote(activeKeys[key]);
            delete activeKeys[key];
        }
    });

    // Update keyboard map when scale changes
    window.updateKeyboardMap = function() {
        for (const key in keyboardMap) {
            if (keyboardMap[key].index < window.scale.length) {
                keyboardMap[key].note = window.scale[keyboardMap[key].index];
            }
        }
    };

    // Add to instructions
    const instructions = document.querySelector('.instructions');
    instructions.innerHTML += '<br><span>A-L keys</span> can also be used to play notes.';
}

// Visual Enhancements
function enhanceVisuals() {
    // Add a frequency analyzer for audio visualization
    const analyser = window.audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connect the analyser to the main output
    window.mainGainNode.connect(analyser);

    // Override the drawCanvas function to include audio visualization
    const originalDrawCanvas = window.drawCanvas;
    window.drawCanvas = function(x, y, noteData, parameters) {
        window.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate values based on position
        const noteIndex = window.scale.indexOf(noteData);
        const hue = (noteIndex / window.scale.length) * 360;
        
        // Draw background gradient
        const gradient = window.ctx.createRadialGradient(x, y, 0, x, y, window.canvas.width);
        gradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.2)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        window.ctx.fillStyle = gradient;
        window.ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
        
        // Draw grid lines
        window.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        window.ctx.lineWidth = 1;
        
        // Vertical grid lines (notes)
        for (let i = 0; i <= window.scale.length; i++) {
            const lineX = (i / window.scale.length) * window.canvas.width;
            window.ctx.beginPath();
            window.ctx.moveTo(lineX, 0);
            window.ctx.lineTo(lineX, window.canvas.height);
            window.ctx.stroke();
        }
        
        // Horizontal grid lines (parameters)
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const lineY = (i / gridLines) * window.canvas.height;
            window.ctx.beginPath();
            window.ctx.moveTo(0, lineY);
            window.ctx.lineTo(lineX, window.canvas.height);
            window.ctx.stroke();
        }
        
        // Draw frequency bars at the bottom
        const barWidth = window.canvas.width / bufferLength;
        let barHeight;
        let barX = 0;
        
        window.ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.5)`;
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * (window.canvas.height / 4);
            
            window.ctx.fillRect(barX, window.canvas.height - barHeight, barWidth, barHeight);
            barX += barWidth;
        }
        
        // Draw active position
        if (window.isMouseDown || Object.keys(window.activeOscillators).length > 0) {
            window.ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.3)`;
            window.ctx.beginPath();
            window.ctx.arc(x, y, 50, 0, Math.PI * 2);
            window.ctx.fill();
            
            // Draw ripple effect
            window.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.5)`;
            window.ctx.lineWidth = 2;
            
            // Multiple ripples
            for (let i = 0; i < 3; i++) {
                const phase = (Date.now() / 200) + (i * Math.PI / 1.5);
                const radius = 70 + Math.sin(phase) * 20;
                window.ctx.beginPath();
                window.ctx.arc(x, y, radius, 0, Math.PI * 2);
                window.ctx.stroke();
            }
        }
        
        // Draw note labels
        window.ctx.font = '14px Inter, sans-serif';
        window.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        window.ctx.textAlign = 'center';
        
        for (let i = 0; i < window.scale.length; i++) {
            const labelX = (i / (window.scale.length - 1)) * window.canvas.width;
            window.ctx.fillText(window.scale[i].note, labelX, window.canvas.height - 20);
        }
    };

    // Override createParticle for more dynamic particles
    const originalCreateParticle = window.createParticle;
    window.createParticle = function(x, y) {
        const particleCount = Math.floor(Math.random() * 3) + 2; // 2-4 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random size
            const size = Math.random() * 40 + 20;
            
            // Random color based on note
            const hue = (x / window.innerWidth) * 360;
            const brightness = 70 + Math.random() * 20;
            
            // Random position offset
            const offsetX = Math.random() * 60 - 30;
            const offsetY = Math.random() * 60 - 30;
            
            // Random translation for animation
            particle.style.setProperty('--tx', `${Math.random() * 50 - 25}px`);
            particle.style.setProperty('--ty', `${Math.random() * -50 - 10}px`);
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${x + offsetX}px`;
            particle.style.top = `${y + offsetY}px`;
            particle.style.background = `hsla(${hue}, 100%, ${brightness}%, 0.8)`;
            particle.style.filter = 'blur(1px)';
            particle.style.mixBlendMode = 'screen';
            
            // Random animation duration
            const duration = 0.8 + Math.random() * 0.8;
            
            // Add to body
            document.body.appendChild(particle);
            
            // Animate and remove
            particle.style.animation = `fadeOut ${duration}s forwards`;
            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        }
    };
}

// Advanced Audio Features
async function addAdvancedAudio() {
    // Add reverb effect using convolver node
    let reverbNode = null;

    // Create reverb effect
    async function createReverb() {
        // Create a convolver node
        reverbNode = window.audioCtx.createConvolver();
        
        // Create a buffer for the impulse response
        const impulseLength = window.audioCtx.sampleRate * 2; // 2 second reverb
        const impulse = window.audioCtx.createBuffer(2, impulseLength, window.audioCtx.sampleRate);
        
        // Fill the buffer with noise
        for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
            const impulseData = impulse.getChannelData(channel);
            
            for (let i = 0; i < impulseLength; i++) {
                // Create exponentially decaying white noise
                impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 3);
            }
        }
        
        // Set the buffer to the convolver node
        reverbNode.buffer = impulse;
        
        // Connect reverb to main output
        reverbNode.connect(window.mainGainNode);
        
        // Create a wet/dry control
        const reverbGain = window.audioCtx.createGain();
        reverbGain.gain.value = 0.2; // Initial reverb amount
        
        // Add reverb control to UI
        const controlsDiv = document.querySelector('.controls');
        const reverbControl = document.createElement('div');
        reverbControl.className = 'control-item';
        reverbControl.innerHTML = `
            <div class="control-label">Reverb</div>
            <input type="range" min="0" max="0.7" step="0.05" value="0.2" id="reverb">
        `;
        controlsDiv.appendChild(reverbControl);
        
        // Add listener for reverb control
        const reverbSlider = document.getElementById('reverb');
        reverbSlider.addEventListener('input', (e) => {
            reverbGain.gain.value = e.target.value;
        });
        
        return reverbGain;
    }

    // Add octave shift controls
    function addOctaveControls() {
        // Add octave shift buttons
        const controlsDiv = document.querySelector('.controls');
        const octaveControl = document.createElement('div');
        octaveControl.className = 'control-item';
        octaveControl.innerHTML = `
            <div class="control-label">Octave</div>
            <div class="octave-buttons">
                <button id="octave-down">-</button>
                <span id="current-octave">0</span>
                <button id="octave-up">+</button>
            </div>
        `;
        controlsDiv.appendChild(octaveControl);
        
        // Track octave shift
        let octaveShift = 0;
        const currentOctaveDisplay = document.getElementById('current-octave');
        
        // Original scale (for reference)
        const originalScale = window.scale.map(note => ({ ...note }));
        
        // Add event listeners for octave buttons
        document.getElementById('octave-down').addEventListener('click', () => {
            if (octaveShift > -2) {
                octaveShift--;
                currentOctaveDisplay.textContent = octaveShift;
                shiftOctave(octaveShift);
            }
        });
        
        document.getElementById('octave-up').addEventListener('click', () => {
            if (octaveShift < 2) {
                octaveShift++;
                currentOctaveDisplay.textContent = octaveShift;
                shiftOctave(octaveShift);
            }
        });
        
        // Function to shift all notes by octave
        function shiftOctave(shift) {
            // Stop all active notes
            Object.keys(window.activeOscillators).forEach(note => {
                window.stopNote({ note: note });
            });
            
            // Calculate the octave multiplier (2^octave)
            const multiplier = Math.pow(2, shift);
            
            // Update each note in the scale
            for (let i = 0; i < window.scale.length; i++) {
                // Get the original frequency
                const originalFrequency = originalScale[i].frequency;
                
                // Calculate the new frequency with the shift
                const newFrequency = originalFrequency * multiplier;
                
                // Update the note name based on the shift
                const noteNameParts = originalScale[i].note.split('');
                const noteLetter = noteNameParts[0];
                let noteOctave = parseInt(noteNameParts[1]) + shift;
                
                // Update the scale
                window.scale[i] = {
                    note: `${noteLetter}${noteOctave}`,
                    frequency: newFrequency
                };
            }
            
            // Update keyboard mapping if it exists
            if (typeof window.updateKeyboardMap === 'function') {
                window.updateKeyboardMap();
            }
        }
    }

    // Modify playNote function to include reverb and filtering
    async function enhancePlayNote() {
        // Create reverb if it doesn't exist
        const reverbGain = await createReverb();
        
        // Store the original playNote function
        const originalPlayNote = window.playNote;
        
        // Override playNote with enhanced version
        window.playNote = function(noteData, parameters) {
            if (window.activeOscillators[noteData.note]) {
                window.updateNote(noteData, parameters);
                return;
            }
            
            // Start audio context if it's suspended
            if (window.audioCtx.state === 'suspended') {
                window.audioCtx.resume();
            }
            
            // Create oscillator and gain node
            const oscillator = window.audioCtx.createOscillator();
            const gainNode = window.audioCtx.createGain();
            
            // Add a filter for more interesting sounds
            const filter = window.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 20000 - (parameters.modulation * 5000); // Y controls filter cutoff
            
            // Set oscillator parameters
            oscillator.type = window.soundSelect.value;
            oscillator.frequency.value = noteData.frequency;
            oscillator.detune.value = parameters.detune;
            
            // Connect oscillator to filter to gain node
            oscillator.connect(filter);
            filter.connect(gainNode);
            
            // Connect to main output and effects
            gainNode.connect(window.mainGainNode);
            
            // Connect to delay if active
            if (document.getElementById('delay').value > 0) {
                gainNode.connect(window.delayNode);
            }
            
            // Connect to reverb if active
            if (reverbNode && document.getElementById('reverb').value > 0) {
                const reverbAmount = parseFloat(document.getElementById('reverb').value);
                
                // Split the signal for wet/dry mix
                // Dry signal already goes to mainGainNode
                
                // Wet signal - create a separate gain for the reverb amount
                const wetGain = window.audioCtx.createGain();
                wetGain.gain.value = reverbAmount;
                
                gainNode.connect(wetGain);
                wetGain.connect(reverbNode);
            }
            
            // Start oscillator
            oscillator.start();
            
            // Store oscillator and gain node
            window.activeOscillators[noteData.note] = {
                oscillator: oscillator,
                gainNode: gainNode,
                filter: filter
            };
            
            // Show note display
            const noteDisplay = document.getElementById('note-display');
            noteDisplay.textContent = noteData.note;
            noteDisplay.classList.add('visible');
            
            // Create particle effect
            window.createParticle(window.cursor.offsetLeft, window.cursor.offsetTop);
        };
        
        // Modify updateNote to update filter as well
        const originalUpdateNote = window.updateNote;
        window.updateNote = function(noteData, parameters) {
            if (!window.activeOscillators[noteData.note]) return;
            
            const { oscillator, filter } = window.activeOscillators[noteData.note];
            oscillator.detune.value = parameters.detune;
            
            // Update filter cutoff based on Y position
            if (filter) {
                filter.frequency.value = 20000 - (parameters.modulation * 5000);
            }
        };
    }

    // Initialize all audio enhancements
    await enhancePlayNote();
    addOctaveControls();
}

// Add Recording Feature
function addRecordingFeature() {
    // Create recording UI
    const controlsDiv = document.querySelector('.controls');
    const recordControl = document.createElement('div');
    recordControl.className = 'control-item';
    recordControl.innerHTML = `
        <div class="control-label">Recording</div>
        <button id="record-button" class="record-button">Record</button>
        <span id="recording-time" class="recording-time">00:00</span>
    `;
    controlsDiv.appendChild(recordControl);
    
    // Create recording controls panel
    const recordingControls = document.createElement('div');
    recordingControls.className = 'recording-controls';
    recordingControls.innerHTML = `
        <div class="playback-controls">
            <button id="play-recording">Play</button>
            <button id="stop-playback">Stop</button>
        </div>
        <div class="download-controls">
            <button id="download-recording">Download</button>
            <button id="discard-recording">Discard</button>
        </div>
    `;
    document.body.appendChild(recordingControls);
    
    // Recording variables
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingStartTime = 0;
    let recordingTimer = null;
    let audioBlob = null;
    let audioUrl = null;
    let recordingAudio = new Audio();
    
    // Recorder setup
    async function setupRecorder() {
        try {
            if (window.audioCtx.destination.stream) {
                const stream = window.audioCtx.destination.stream;
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                    audioUrl = URL.createObjectURL(audioBlob);
                    recordingAudio.src = audioUrl;
                    
                    recordingControls.classList.add('visible');
                };
                
                return true;
            } else {
                // Fallback to navigator.mediaDevices
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                    audioUrl = URL.createObjectURL(audioBlob);
                    recordingAudio.src = audioUrl;
                    
                    recordingControls.classList.add('visible');
                };
                
                return true;
            }
        } catch (error) {
            console.error('Error setting up recorder:', error);
            alert('Recording requires a newer browser that supports audio recording.');
            return false;
        }
    }
    
    // Event listeners
    const recordButton = document.getElementById('record-button');
    const recordingTimeDisplay = document.getElementById('recording-time');
    
    recordButton.addEventListener('click', async () => {
        // If recording, stop it
        if (recordButton.classList.contains('recording')) {
            stopRecording();
        } else {
            // Try to set up recorder if not already
            if (!mediaRecorder) {
                const success = await setupRecorder();
                if (!success) return;
            }
            
            // Start recording
            recordedChunks = [];
            mediaRecorder.start();
            
            recordButton.classList.add('recording');
            recordButton.textContent = 'Stop';
            
            // Start timer
            recordingStartTime = Date.now();
            updateRecordingTime();
            recordingTimer = setInterval(updateRecordingTime, 1000);
        }
    });
    
    // Update recording time display
    function updateRecordingTime() {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        recordingTimeDisplay.textContent = `${minutes}:${seconds}`;
    }
    
    // Stop recording
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Record';
            
            // Stop timer
            clearInterval(recordingTimer);
        }
    }
    
    // Playback controls
    document.getElementById('play-recording').addEventListener('click', () => {
        recordingAudio.play();
    });
    
    document.getElementById('stop-playback').addEventListener('click', () => {
        recordingAudio.pause();
        recordingAudio.currentTime = 0;
    });
    
    // Download recording
    document.getElementById('download-recording').addEventListener('click', () => {
        if (!audioBlob) return;
        
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `soundspace-recording-${new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-')}.webm`;
        a.click();
    });
    
    // Discard recording
    document.getElementById('discard-recording').addEventListener('click', () => {
        recordingControls.classList.remove('visible');
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
            audioBlob = null;
        }
    });
}

// Add Scale Selector
function addScaleSelector() {
    // Define different scales
    const musicalScales = {
        'pentatonic': {
            name: 'Pentatonic Major',
            intervals: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], // Whole steps: C, D, E, G, A
        },
        'pentatonicMinor': {
            name: 'Pentatonic Minor',
            intervals: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24], // C, Eb, F, G, Bb
        },
        'major': {
            name: 'Major',
            intervals: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24], // C Major scale
        },
        'minor': {
            name: 'Minor (Natural)',
            intervals: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24], // C Minor scale
        },
        'harmonicMinor': {
            name: 'Harmonic Minor',
            intervals: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 23, 24], // C Harmonic Minor
        },
        'blues': {
            name: 'Blues',
            intervals: [0, 3, 5, 6, 7, 10, 12, 15, 17, 18, 19, 22, 24], // C Blues scale
        },
        'chromatic': {
            name: 'Chromatic',
            intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], // All semitones
        }
    };
    
    // Create UI control
    const controlsDiv = document.querySelector('.controls');
    const scaleControl = document.createElement('div');
    scaleControl.className = 'control-item';
    scaleControl.innerHTML = `
        <div class="control-label">Scale</div>
        <select id="scale-type">
            <option value="pentatonic">Pentatonic Major</option>
            <option value="pentatonicMinor">Pentatonic Minor</option>
            <option value="major">Major</option>
            <option value="minor">Minor (Natural)</option>
            <option value="harmonicMinor">Harmonic Minor</option>
            <option value="blues">Blues</option>
            <option value="chromatic">Chromatic</option>
        </select>
    `;
    
    // Also add key selection
    const keyControl = document.createElement('div');
    keyControl.className = 'control-item';
    keyControl.innerHTML = `
        <div class="control-label">Key</div>
        <select id="key-select">
            <option value="C">C</option>
            <option value="C#">C#/Db</option>
            <option value="D">D</option>
            <option value="D#">D#/Eb</option>
            <option value="E">E</option>
            <option value="F">F</option>
            <option value="F#">F#/Gb</option>
            <option value="G">G</option>
            <option value="G#">G#/Ab</option>
            <option value="A">A</option>
            <option value="A#">A#/Bb</option>
            <option value="B">B</option>
        </select>
    `;
    
    // Insert both controls at the beginning
    controlsDiv.insertBefore(keyControl, controlsDiv.firstChild);
    controlsDiv.insertBefore(scaleControl, controlsDiv.firstChild);
    
    // Base frequency for each key (A4 = 440Hz)
    const keyBaseFreqs = {
        'C': 261.63, // C4
        'C#': 277.18,
        'D': 293.66,
        'D#': 311.13,
        'E': 329.63,
        'F': 349.23,
        'F#': 369.99,
        'G': 392.00,
        'G#': 415.30,
        'A': 440.00,
        'A#': 466.16,
        'B': 493.88
    };
    
    // Note names
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Function to calculate frequency from a note name and octave
    function getFrequency(noteName, octave) {
        // A4 is 440Hz
        const A4 = 440;
        const A4_INDEX = 57; // MIDI note number for A4
        
        // Find the index of the note name
        let noteIndex = noteNames.indexOf(noteName);
        if (noteIndex === -1) return null;
        
        // Calculate the MIDI note number
        const midiNote = noteIndex + (octave * 12);
        
        // Calculate frequency using the formula: f = 440 * 2^((n-69)/12)
        // where n is the MIDI note number
        return A4 * Math.pow(2, (midiNote - A4_INDEX) / 12);
    }
    
    // Function to generate note name with octave
    function getNoteNameWithOctave(keyName, semitones, baseOctave = 4) {
        const keyIndex = noteNames.indexOf(keyName);
        const totalSemitones = keyIndex + semitones;
        
        // Calculate new index and octave adjustment
        const newIndex = totalSemitones % 12;
        const octaveAdjust = Math.floor(totalSemitones / 12);
        
        return {
            note: noteNames[newIndex] + (baseOctave + octaveAdjust),
            frequency: getFrequency(noteNames[newIndex], baseOctave + octaveAdjust)
        };
    }
    
    // Function to update the scale
    function updateScale() {
        const selectedKey = document.getElementById('key-select').value;
        const selectedScale = document.getElementById('scale-type').value;
        
        // Get the intervals for the selected scale
        const intervals = musicalScales[selectedScale].intervals;
        
        // Generate the new scale
        const newScale = intervals.map(semitones => {
            return getNoteNameWithOctave(selectedKey, semitones);
        });
        
        // Update the global scale (assuming 'scale' is defined in the global scope)
        window.scale.length = 0; // Clear the existing scale
        newScale.forEach(note => {
            window.scale.push(note);
        });
        
        // Update keyboard mapping if it exists
        if (typeof window.updateKeyboardMap === 'function') {
            window.updateKeyboardMap();
        }
        
        // Stop any currently playing notes
        Object.keys(window.activeOscillators).forEach(note => {
            window.stopNote({ note: note });
        });
    }
    
    // Add event listeners
    document.getElementById('scale-type').addEventListener('change', updateScale);
    document.getElementById('key-select').addEventListener('change', updateScale);
}

// Add Auto-Play Feature
function addAutoPlayFeature() {
    // Define musical patterns
    const patterns = {
        'arpeggio-up': {
            name: 'Arpeggio Up',
            pattern: [0, 2, 4, 6, 4, 2, 0],
            durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1]
        },
        'arpeggio-down': {
            name: 'Arpeggio Down',
            pattern: [6, 4, 2, 0, 2, 4, 6],
            durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1]
        },
        'scale-run': {
            name: 'Scale Run',
            pattern: [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0],
            durations: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1]
        },
        'bounce': {
            name: 'Bounce',
            pattern: [0, 4, 0, 4, 0, 4, 0, 6],
            durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1]
        },
        'melody-1': {
            name: 'Simple Melody',
            pattern: [0, 0, 4, 0, 6, 5, 0, 0, 4, 0, 7, 6],
            durations: [0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1]
        },
        'random': {
            name: 'Random',
            pattern: [], // Will be generated randomly
            durations: [] // Will be generated randomly
        }
    };
    
    // Create UI for auto-play
    const controlsDiv = document.querySelector('.controls');
    const autoPlayControl = document.createElement('div');
    autoPlayControl.className = 'control-item auto-play-control';
    autoPlayControl.innerHTML = `
        <div class="control-label">Auto-Play</div>
        <select id="pattern-select">
            <option value="">Select Pattern...</option>
            <option value="arpeggio-up">Arpeggio Up</option>
            <option value="arpeggio-down">Arpeggio Down</option>
            <option value="scale-run">Scale Run</option>
            <option value="bounce">Bounce</option>
            <option value="melody-1">Simple Melody</option>
            <option value="random">Random</option>
        </select>
        <button id="play-pattern">Play</button>
        <div class="tempo-control">
            <span>Tempo:</span>
            <input type="range" min="40" max="200" value="120" id="tempo-slider">
            <span id="tempo-value">120 BPM</span>
        </div>
    `;
    
    // Add to bottom of controls
    controlsDiv.appendChild(autoPlayControl);
    
    // Variables for pattern playback
    let patternInterval = null;
    let currentPatternIndex = 0;
    let currentPattern = null;
    let isPlaying = false;
    
    // Generate random pattern
    function generateRandomPattern() {
        const length = Math.floor(Math.random() * 8) + 4; // 4-12 notes
        const patternNotes = [];
        const patternDurations = [];
        
        for (let i = 0; i < length; i++) {
            // Random index within scale length
            patternNotes.push(Math.floor(Math.random() * Math.min(7, window.scale.length)));
            
            // Random duration (0.25, 0.5, 1)
            const durations = [0.25, 0.5, 1];
            patternDurations.push(durations[Math.floor(Math.random() * durations.length)]);
        }
        
        return {
            pattern: patternNotes,
            durations: patternDurations
        };
    }
    
    // Function to play a note from the pattern
    function playPatternNote() {
        if (!currentPattern || currentPatternIndex >= currentPattern.pattern.length) {
            currentPatternIndex = 0;
        }
        
        // Get the note index from the pattern
        const noteIndex = currentPattern.pattern[currentPatternIndex];
        
        // Make sure the note exists in the scale
        if (noteIndex < window.scale.length) {
            const noteData = window.scale[noteIndex];
            
            // Calculate a y position for parameters (middle of screen)
            const y = window.innerHeight / 2;
            const parameters = window.getParametersFromY(y);
            
            // Calculate an x position for visualization
            const x = (noteIndex / (window.scale.length - 1)) * window.innerWidth;
            
            // Play the note
            window.playNote(noteData, parameters);
            
            // Visual feedback
            window.drawCanvas(x, y, noteData, parameters);
            window.createParticle(x, y);
            
            // Set up note release
            const tempo = parseInt(document.getElementById('tempo-slider').value);
            const noteDuration = (60 / tempo) * 1000 * currentPattern.durations[currentPatternIndex];
            
            setTimeout(() => {
                window.stopNote(noteData);
            }, noteDuration * 0.8); // Release slightly before next note
        }
        
        // Move to next note
        currentPatternIndex++;
        
        // If we reached the end, loop back
        if (currentPatternIndex >= currentPattern.pattern.length) {
            currentPatternIndex = 0;
        }
    }
    
    // Play/stop pattern
    function togglePattern() {
        const patternSelect = document.getElementById('pattern-select');
        const playButton = document.getElementById('play-pattern');
        
        if (isPlaying) {
            // Stop current pattern
            clearInterval(patternInterval);
            playButton.textContent = 'Play';
            playButton.classList.remove('playing');
            isPlaying = false;
            
            // Stop any playing notes
            Object.keys(window.activeOscillators).forEach(note => {
                window.stopNote({ note: note });
            });
        } else {
            // Make sure a pattern is selected
            const selectedPattern = patternSelect.value;
            if (!selectedPattern) {
                alert('Please select a pattern first');
                return;
            }
            
            // Get the pattern
            if (selectedPattern === 'random') {
                const randomPattern = generateRandomPattern();
                currentPattern = {
                    pattern: randomPattern.pattern,
                    durations: randomPattern.durations
                };
            } else {
                currentPattern = {
                    pattern: [...patterns[selectedPattern].pattern],
                    durations: [...patterns[selectedPattern].durations]
                };
            }
            
            // Reset pattern index
            currentPatternIndex = 0;
            
            // Get the tempo
            const tempo = parseInt(document.getElementById('tempo-slider').value);
            const beatDuration = 60 / tempo * 1000; // in ms
            
            // Start playback
            playPatternNote(); // Play first note immediately
            
            // Set up interval for remaining notes
            patternInterval = setInterval(() => {
                playPatternNote();
            }, beatDuration);
            
            // Update UI
            playButton.textContent = 'Stop';
            playButton.classList.add('playing');
            isPlaying = true;
        }
    }
    
    // Add event listeners
    document.getElementById('play-pattern').addEventListener('click', togglePattern);
    
    // Update tempo display
    document.getElementById('tempo-slider').addEventListener('input', (e) => {
        const tempo = e.target.value;
        document.getElementById('tempo-value').textContent = `${tempo} BPM`;
        
        // If pattern is playing, restart with new tempo
        if (isPlaying) {
            clearInterval(patternInterval);
            
            const beatDuration = 60 / tempo * 1000; // in ms
            patternInterval = setInterval(() => {
                playPatternNote();
            }, beatDuration);
        }
    });
    
    // Stop pattern on scale or sound type change
    document.getElementById('scale-type').addEventListener('change', () => {
        if (isPlaying) {
            togglePattern(); // Stop the pattern
        }
    });
    
    document.getElementById('key-select').addEventListener('change', () => {
        if (isPlaying) {
            togglePattern(); // Stop the pattern
        }
    });
    
    document.getElementById('sound-type').addEventListener('change', () => {
        if (isPlaying) {
            togglePattern(); // Stop the pattern
        }
    });
}

// Add Welcome Modal
function addWelcomeModal() {
    // Create the modal
    const modal = document.createElement('div');
    modal.className = 'info-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Welcome to SoundSpace</h2>
            <p>Interactive Audio Experience</p>
            
            <div class="instruction-section">
                <h3>How to Play</h3>
                <ul>
                    <li><strong>Mouse:</strong> Move around and click to create sounds. X-axis controls pitch, Y-axis controls timbre.</li>
                    <li><strong>Keyboard:</strong> Use A-L keys to play notes (like a piano).</li>
                    <li><strong>Touch:</strong> Mobile devices supported! Tap and drag to create sounds.</li>
                </ul>
            </div>
            
            <div class="instruction-section">
                <h3>New Features</h3>
                <ul>
                    <li><strong>Scales:</strong> Change musical scales and keys</li>
                    <li><strong>Effects:</strong> Adjust reverb, delay, and other sound parameters</li>
                    <li><strong>Auto-Play:</strong> Use built-in patterns for inspiration</li>
                    <li><strong>Recording:</strong> Save your performances as audio files</li>
                </ul>
            </div>
            
            <button class="start-button">Start Playing</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal on button click
    const startButton = modal.querySelector('.start-button');
    startButton.addEventListener('click', () => {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.5s ease';
        
        // Remove from DOM after transition
        setTimeout(() => {
            modal.remove();
        }, 500);
        
        // Ensure audio context is started
        if (window.audioCtx.state === 'suspended') {
            window.audioCtx.resume();
        }
    });
}

// Add Help Button
function addHelpButton() {
    const helpButton = document.createElement('button');
    helpButton.className = 'help-button';
    helpButton.innerHTML = '?';
    document.body.appendChild(helpButton);
    
    // Show the info modal when clicked
    helpButton.addEventListener('click', () => {
        addWelcomeModal();
    });
}
