document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Custom cursor
    const cursor = document.querySelector('.cursor');
    const cursorRing = document.querySelector('.cursor-ring');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursorRing.style.left = e.clientX + 'px';
        cursorRing.style.top = e.clientY + 'px';
        
        // Update coordinates display
        const coordsDisplay = document.getElementById('coordinates');
        coordsDisplay.textContent = `X: ${Math.round(e.clientX)} Y: ${Math.round(e.clientY)}`;
    });
    
    document.addEventListener('mousedown', () => {
        cursor.classList.add('active');
    });
    
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('active');
    });
    
    // Audio context setup
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    // Main gain node (volume control)
    const mainGainNode = audioCtx.createGain();
    mainGainNode.connect(audioCtx.destination);
    
    // Delay effect
    const delayNode = audioCtx.createDelay(5.0);
    const delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = 0.3;
    
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(mainGainNode);
    
    // UI controls
    const soundSelect = document.getElementById('sound-type');
    const volumeSlider = document.getElementById('volume');
    const delaySlider = document.getElementById('delay');
    
    // Set initial volume
    mainGainNode.gain.value = volumeSlider.value;
    delayNode.delayTime.value = delaySlider.value;
    
    // Track active oscillators
    const activeOscillators = {};
    
    // Musical scale (pentatonic)
    const scale = [
        { note: 'C4', frequency: 261.63 },
        { note: 'D4', frequency: 293.66 },
        { note: 'E4', frequency: 329.63 },
        { note: 'G4', frequency: 392.00 },
        { note: 'A4', frequency: 440.00 },
        { note: 'C5', frequency: 523.25 },
        { note: 'D5', frequency: 587.33 },
        { note: 'E5', frequency: 659.25 },
        { note: 'G5', frequency: 784.00 },
        { note: 'A5', frequency: 880.00 },
        { note: 'C6', frequency: 1046.50 }
    ];
    
    // Get note from position
    function getNoteFromPosition(x, y) {
        const width = window.innerWidth;
        // Map x position to note index
        const noteIndex = Math.floor((x / width) * scale.length);
        return scale[Math.min(noteIndex, scale.length - 1)];
    }
    
    // Control oscillator parameters based on Y position
    function getParametersFromY(y) {
        const height = window.innerHeight;
        // Normalize Y position (0 to 1)
        const normalizedY = y / height;
        
        // Calculate detune based on Y position (-50 to +50 cents)
        const detune = (normalizedY - 0.5) * 100;
        
        return {
            detune: detune,
            harmonicity: 1 + normalizedY,
            modulation: normalizedY * 5
        };
    }
    
    // Play a note with parameters
    function playNote(noteData, parameters) {
        if (activeOscillators[noteData.note]) {
            updateNote(noteData, parameters);
            return;
        }
        
        // Start audio context if it's suspended
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // Create oscillator and gain node
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // Set oscillator parameters
        oscillator.type = soundSelect.value;
        oscillator.frequency.value = noteData.frequency;
        oscillator.detune.value = parameters.detune;
        
        // Connect oscillator to gain node
        oscillator.connect(gainNode);
        
        // Connect to main output and delay (if active)
        gainNode.connect(mainGainNode);
        if (delaySlider.value > 0) {
            gainNode.connect(delayNode);
        }
        
        // Start oscillator
        oscillator.start();
        
        // Store oscillator and gain node
        activeOscillators[noteData.note] = {
            oscillator: oscillator,
            gainNode: gainNode
        };
        
        // Show note display
        const noteDisplay = document.getElementById('note-display');
        noteDisplay.textContent = noteData.note;
        noteDisplay.classList.add('visible');
        
        // Create particle effect
        createParticle(cursor.offsetLeft, cursor.offsetTop);
    }
    
    // Update note parameters
    function updateNote(noteData, parameters) {
        if (!activeOscillators[noteData.note]) return;
        
        const { oscillator } = activeOscillators[noteData.note];
        oscillator.detune.value = parameters.detune;
    }
    
    // Stop a note
    function stopNote(noteData) {
        if (!activeOscillators[noteData.note]) return;
        
        const { oscillator, gainNode } = activeOscillators[noteData.note];
        
        // Gradual release to avoid clicks
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        // Stop oscillator after release
        setTimeout(() => {
            oscillator.stop();
            delete activeOscillators[noteData.note];
            
            // Hide note display if no notes are playing
            if (Object.keys(activeOscillators).length === 0) {
                const noteDisplay = document.getElementById('note-display');
                noteDisplay.classList.remove('visible');
            }
        }, 300);
    }
    
    // Create particle effect
    function createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random size
        const size = Math.random() * 40 + 20;
        
        // Random color based on note
        const hue = (x / window.innerWidth) * 360;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.background = `hsla(${hue}, 100%, 70%, 0.8)`;
        
        // Add to body
        document.body.appendChild(particle);
        
        // Animate and remove
        particle.style.animation = 'fadeOut 1s forwards';
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
    
    // Handle mouse/touch events
    let isMouseDown = false;
    let currentNote = null;
    
    document.addEventListener('mousemove', (e) => {
        // Get note from position
        const noteData = getNoteFromPosition(e.clientX, e.clientY);
        const parameters = getParametersFromY(e.clientY);
        
        if (isMouseDown) {
            // If we're on a different note, stop the previous one
            if (currentNote && currentNote.note !== noteData.note) {
                stopNote(currentNote);
                currentNote = noteData;
                playNote(noteData, parameters);
            } else if (!currentNote) {
                currentNote = noteData;
                playNote(noteData, parameters);
            } else {
                // Update parameters for current note
                updateNote(noteData, parameters);
            }
        }
        
        // Draw on canvas
        drawCanvas(e.clientX, e.clientY, noteData, parameters);
    });
    
    document.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        
        // Get note from position
        const noteData = getNoteFromPosition(e.clientX, e.clientY);
        const parameters = getParametersFromY(e.clientY);
        
        currentNote = noteData;
        playNote(noteData, parameters);
    });
    
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        
        if (currentNote) {
            stopNote(currentNote);
            currentNote = null;
        }
    });
    
    // Handle control changes
    volumeSlider.addEventListener('input', (e) => {
        mainGainNode.gain.value = e.target.value;
    });
    
    delaySlider.addEventListener('input', (e) => {
        delayNode.delayTime.value = e.target.value;
        delayFeedback.gain.value = e.target.value * 0.5; // Reduce feedback with delay time
    });
    
    // Canvas visualizations
    function drawCanvas(x, y, noteData, parameters) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate values based on position
        const noteIndex = scale.indexOf(noteData);
        const hue = (noteIndex / scale.length) * 360;
        
        // Draw background gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, canvas.width);
        gradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.2)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical grid lines (notes)
        for (let i = 0; i <= scale.length; i++) {
            const lineX = (i / scale.length) * canvas.width;
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, canvas.height);
            ctx.stroke();
        }
        
        // Horizontal grid lines (parameters)
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const lineY = (i / gridLines) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(canvas.width, lineY);
            ctx.stroke();
        }
        
        // Draw active position
        if (isMouseDown) {
            ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.3)`;
            ctx.beginPath();
            ctx.arc(x, y, 50, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw ripple effect
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.5)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 70 + Math.sin(Date.now() / 200) * 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Make functions globally available for enhancements
    window.audioCtx = audioCtx;
    window.mainGainNode = mainGainNode;
    window.delayNode = delayNode;
    window.scale = scale;
    window.activeOscillators = activeOscillators;
    window.playNote = playNote;
    window.updateNote = updateNote;
    window.stopNote = stopNote;
    window.getNoteFromPosition = getNoteFromPosition;
    window.getParametersFromY = getParamet
