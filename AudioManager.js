export class AudioManager {
    constructor() {
        this.ctx = null;
        this.bgmVolumeNode = null;
        this.sfxVolumeNode = null;
        this.bgmOscillator = null;
        this.isBgmPlaying = false;
        
        this.bgmVolume = 1.0;
        this.sfxVolume = 1.0;
        
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Master Volume Nodes
        this.bgmVolumeNode = this.ctx.createGain();
        this.bgmVolumeNode.gain.value = this.bgmVolume;
        this.bgmVolumeNode.connect(this.ctx.destination);

        this.sfxVolumeNode = this.ctx.createGain();
        this.sfxVolumeNode.gain.value = this.sfxVolume;
        this.sfxVolumeNode.connect(this.ctx.destination);
        
        this.initialized = true;
    }

    setBGMVolume(val) {
        this.bgmVolume = val;
        if (this.bgmVolumeNode) {
            this.bgmVolumeNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        }
    }

    setSFXVolume(val) {
        this.sfxVolume = val;
        if (this.sfxVolumeNode) {
            this.sfxVolumeNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        }
    }

    startBGM() {
        if (!this.initialized) this.init();
        if (this.isBgmPlaying) return;

        // Simple procedural beat/drone
        this.playBgmLoop();
        this.isBgmPlaying = true;
    }

    stopBGM() {
        this.isBgmPlaying = false;
        
        // Stop Gameplay Loop
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }

        // Stop Cutscene Drone
        if (this.bgmOscillator) {
            this.bgmOscillator.stop();
            this.bgmOscillator = null;
        }
        if (this.bgmLfo) {
             this.bgmLfo.stop();
             this.bgmLfo = null;
        }
    }

    playCutsceneBGM() {
         this.stopBGM();
         this.isBgmPlaying = true;

        // Atmospheric Drone (Sawtooth + LFO Filter)
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 110; // A2
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        // LFO for filter
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.5; // Slow pulse
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 200;
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        
        osc.connect(filter);
        filter.connect(this.bgmVolumeNode);
        osc.start();
        
        this.bgmOscillator = osc;
        this.bgmLfo = lfo;
    }

    playGameplayBGM() {
        this.stopBGM();
        this.isBgmPlaying = true;

        const notes = [
            261.63, // C4
            329.63, // E4
            392.00, // G4
            523.25, // C5
            392.00, // G4
            329.63, // E4
        ];
        
        let noteIndex = 0;
        const tempo = 0.15; // Fast arpeggio

        this.bgmInterval = setInterval(() => {
            if (!this.isBgmPlaying) {
                clearInterval(this.bgmInterval);
                return;
            }

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.bgmVolumeNode);
            
            osc.type = 'triangle'; 
            osc.frequency.value = notes[noteIndex];
            
            const now = this.ctx.currentTime;
            
            // Short pluck
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
            
            noteIndex = (noteIndex + 1) % notes.length;
        }, tempo * 1000);
    }

    // Alias for compatibility if needed, but we will switch to explicit calls
    playBgmLoop() {
        this.playGameplayBGM(); 
    }



    playSFX(type) {
        if (!this.initialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxVolumeNode);

        const now = this.ctx.currentTime;

        if (type === 'jump') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } 
        else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.setValueAtTime(1600, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
        else if (type === 'powerup') {
            osc.type = 'triangle';
            // Arpeggio
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.1); // C#
            osc.frequency.setValueAtTime(659, now + 0.2); // E
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
        else if (type === 'crash') {
            // Noise buffer for crash
            const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 sec
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            // noise.connect(gain); // Connect noise instead of osc
            
            // Re-route for noise
            const noiseGain = this.ctx.createGain();
            noiseGain.connect(this.sfxVolumeNode);
            noise.connect(noiseGain);
            
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            noise.start(now);
        }
        else if (type === 'boost') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(400, now + 1.0); // Longer rise
            
            // Low pass filter effect by proxy? No, just volume envelope
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.0);
            
            osc.start(now);
            osc.stop(now + 1.0);
        }
    }
}
