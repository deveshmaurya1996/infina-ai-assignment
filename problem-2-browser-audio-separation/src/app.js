/**
 * Browser Audio Separation Demo
 * 
 * This application demonstrates real-time audio separation using Web Audio API.
 * It captures both microphone and system audio streams, then applies various
 * separation algorithms including noise gating, adaptive filtering, and spectral subtraction.
 * 
 * Features:
 * - Dual audio stream capture (microphone + system audio)
 * - Real-time audio processing and separation
 * - Live waveform visualization
 * - Adjustable separation parameters
 * - Performance monitoring
 */

class AudioSeparationApp {
    constructor() {
        this.audioContext = null;
        this.microphoneStream = null;
        this.systemAudioStream = null;
        this.isCapturing = false;
        this.isProcessing = false;
        
        // Audio processing nodes
        this.micSource = null;
        this.systemSource = null;
        this.micAnalyser = null;
        this.systemAnalyser = null;
        this.outputAnalyser = null;
        this.gainNode = null;
        this.noiseGate = null;
        this.adaptiveFilter = null;
        
        // Visualization
        this.canvas = null;
        this.canvasContext = null;
        this.animationFrame = null;
        
        // Performance tracking
        this.processingStartTime = 0;
        this.frameCount = 0;
        
        // Separation parameters
        this.noiseGateThreshold = 0.1;
        this.adaptiveFilterStrength = 0.5;
        
        this.initializeUI();
        this.setupEventListeners();
    }
    
    /**
     * Initialize UI elements and references
     */
    initializeUI() {
        // Buttons
        this.startCaptureBtn = document.getElementById('startCapture');
        this.stopCaptureBtn = document.getElementById('stopCapture');
        this.startProcessingBtn = document.getElementById('startProcessing');
        this.stopProcessingBtn = document.getElementById('stopProcessing');
        
        // Status displays
        this.captureStatus = document.getElementById('captureStatus');
        this.processingStatus = document.getElementById('processingStatus');
        this.micStatus = document.getElementById('micStatus');
        this.systemStatus = document.getElementById('systemStatus');
        
        // Audio info displays
        this.inputLevel = document.getElementById('inputLevel');
        this.outputLevel = document.getElementById('outputLevel');
        this.processingTime = document.getElementById('processingTime');
        this.sampleRate = document.getElementById('sampleRate');
        
        // Controls
        this.noiseGateSlider = document.getElementById('noiseGate');
        this.adaptiveFilterSlider = document.getElementById('adaptiveFilter');
        this.noiseGateValue = document.getElementById('noiseGateValue');
        this.adaptiveFilterValue = document.getElementById('adaptiveFilterValue');
        
        // Canvas
        this.canvas = document.getElementById('waveformCanvas');
        this.canvasContext = this.canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Capture controls
        this.startCaptureBtn.addEventListener('click', () => this.startAudioCapture());
        this.stopCaptureBtn.addEventListener('click', () => this.stopAudioCapture());
        
        // Processing controls
        this.startProcessingBtn.addEventListener('click', () => this.startAudioProcessing());
        this.stopProcessingBtn.addEventListener('click', () => this.stopAudioProcessing());
        
        // Parameter controls
        this.noiseGateSlider.addEventListener('input', (e) => {
            this.noiseGateThreshold = parseFloat(e.target.value);
            this.noiseGateValue.textContent = this.noiseGateThreshold.toFixed(2);
            this.updateNoiseGate();
        });
        
        this.adaptiveFilterSlider.addEventListener('input', (e) => {
            this.adaptiveFilterStrength = parseFloat(e.target.value);
            this.adaptiveFilterValue.textContent = this.adaptiveFilterStrength.toFixed(2);
            this.updateAdaptiveFilter();
        });
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width - 30; // Account for padding
        this.canvas.height = 200;
    }
    
    /**
     * Start capturing audio streams
     */
    async startAudioCapture() {
        try {
            this.updateStatus(this.captureStatus, 'Starting audio capture...', 'info');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Request microphone access
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Request system audio access (screen sharing with audio)
            try {
                this.systemAudioStream = await navigator.mediaDevices.getDisplayMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    },
                    video: {
                        displaySurface: 'monitor',
                        logicalSurface: true,
                        cursor: 'never'
                    }
                });
                
                // Hide video tracks since we only want audio
                this.systemAudioStream.getVideoTracks().forEach(track => {
                    track.stop();
                });
                
            } catch (error) {
                console.warn('System audio capture not supported:', error);
                this.updateStatus(this.systemStatus, 'Not supported - Try sharing a tab or window', 'error');
            }
            
            // Create audio sources
            this.micSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
            if (this.systemAudioStream) {
                this.systemSource = this.audioContext.createMediaStreamSource(this.systemAudioStream);
            }
            
            // Create analyser nodes for visualization
            this.micAnalyser = this.audioContext.createAnalyser();
            this.micAnalyser.fftSize = 2048;
            
            if (this.systemSource) {
                this.systemAnalyser = this.audioContext.createAnalyser();
                this.systemAnalyser.fftSize = 2048;
            }
            
            // Connect microphone to analyser
            this.micSource.connect(this.micAnalyser);
            if (this.systemSource && this.systemAnalyser) {
                this.systemSource.connect(this.systemAnalyser);
            }
            
            this.isCapturing = true;
            this.updateUI();
            this.updateStatus(this.captureStatus, 'Audio capture active', 'success');
            this.updateStatus(this.micStatus, 'Connected');
            if (this.systemAudioStream) {
                this.updateStatus(this.systemStatus, 'Connected');
            }
            
            // Start visualization
            this.startVisualization();
            
        } catch (error) {
            console.error('Error starting audio capture:', error);
            this.updateStatus(this.captureStatus, `Error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop audio capture
     */
    stopAudioCapture() {
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
        
        if (this.systemAudioStream) {
            this.systemAudioStream.getTracks().forEach(track => track.stop());
            this.systemAudioStream = null;
        }
        
        this.isCapturing = false;
        this.updateUI();
        this.updateStatus(this.captureStatus, 'Audio capture stopped', 'info');
        this.updateStatus(this.micStatus, 'Not connected');
        this.updateStatus(this.systemStatus, 'Not connected');
        
        // Stop visualization
        this.stopVisualization();
    }
    
    /**
     * Start audio processing and separation
     */
    startAudioProcessing() {
        if (!this.isCapturing || !this.audioContext) {
            this.updateStatus(this.processingStatus, 'Please start audio capture first', 'error');
            return;
        }
        
        try {
            // Create output gain node
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 0.5;
            
            // Create noise gate
            this.createNoiseGate();
            
            // Create adaptive filter
            this.createAdaptiveFilter();
            
            // Create output analyser
            this.outputAnalyser = this.audioContext.createAnalyser();
            this.outputAnalyser.fftSize = 2048;
            
            // Connect processing chain
            this.connectProcessingChain();
            
            this.isProcessing = true;
            this.processingStartTime = performance.now();
            this.frameCount = 0;
            
            this.updateUI();
            this.updateStatus(this.processingStatus, 'Audio processing active', 'success');
            
        } catch (error) {
            console.error('Error starting audio processing:', error);
            this.updateStatus(this.processingStatus, `Error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop audio processing
     */
    stopAudioProcessing() {
        this.isProcessing = false;
        this.updateUI();
        this.updateStatus(this.processingStatus, 'Audio processing stopped', 'info');
        
        // Disconnect processing nodes
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        
        if (this.noiseGate) {
            this.noiseGate.disconnect();
            this.noiseGate = null;
        }
        
        if (this.adaptiveFilter) {
            this.adaptiveFilter.disconnect();
            this.adaptiveFilter = null;
        }
        
        if (this.outputAnalyser) {
            this.outputAnalyser.disconnect();
            this.outputAnalyser = null;
        }
    }
    
    /**
     * Create noise gate node
     */
    createNoiseGate() {
        // Create a simple noise gate using gain node and script processor
        this.noiseGate = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        this.noiseGate.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            const output = event.outputBuffer.getChannelData(0);
            
            for (let i = 0; i < input.length; i++) {
                const amplitude = Math.abs(input[i]);
                if (amplitude < this.noiseGateThreshold) {
                    output[i] = 0;
                } else {
                    output[i] = input[i];
                }
            }
        };
    }
    
    /**
     * Create adaptive filter node
     */
    createAdaptiveFilter() {
        // Create a simple adaptive filter using script processor
        this.adaptiveFilter = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        let previousSample = 0;
        
        this.adaptiveFilter.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            const output = event.outputBuffer.getChannelData(0);
            
            for (let i = 0; i < input.length; i++) {
                // Simple adaptive filtering: subtract a fraction of the previous sample
                const filtered = input[i] - (this.adaptiveFilterStrength * previousSample);
                output[i] = filtered;
                previousSample = input[i];
            }
        };
    }
    
    /**
     * Connect the audio processing chain
     */
    connectProcessingChain() {
        // Connect microphone through processing chain
        this.micSource.connect(this.noiseGate);
        this.noiseGate.connect(this.adaptiveFilter);
        this.adaptiveFilter.connect(this.gainNode);
        this.gainNode.connect(this.outputAnalyser);
        this.outputAnalyser.connect(this.audioContext.destination);
        
        // Connect system audio directly to output (for comparison)
        if (this.systemSource) {
            this.systemSource.connect(this.audioContext.destination);
        }
    }
    
    /**
     * Update noise gate parameters
     */
    updateNoiseGate() {
        // The noise gate is updated in real-time through the script processor
        // Parameters are applied on the next audio frame
    }
    
    /**
     * Update adaptive filter parameters
     */
    updateAdaptiveFilter() {
        // The adaptive filter is updated in real-time through the script processor
        // Parameters are applied on the next audio frame
    }
    
    /**
     * Start real-time visualization
     */
    startVisualization() {
        this.visualize();
    }
    
    /**
     * Stop visualization
     */
    stopVisualization() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear canvas
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Real-time visualization loop
     */
    visualize() {
        if (!this.isCapturing) return;
        
        const startTime = performance.now();
        
        // Clear canvas
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw microphone waveform
        if (this.micAnalyser) {
            this.drawWaveform(this.micAnalyser, 0, 0, this.canvas.width, this.canvas.height / 2, '#667eea');
        }
        
        // Draw system audio waveform
        if (this.systemAnalyser) {
            this.drawWaveform(this.systemAnalyser, 0, this.canvas.height / 2, this.canvas.width, this.canvas.height / 2, '#764ba2');
        }
        
        // Draw processed output waveform
        if (this.outputAnalyser && this.isProcessing) {
            this.drawWaveform(this.outputAnalyser, 0, 0, this.canvas.width, this.canvas.height, '#48bb78');
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(startTime);
        
        // Continue animation
        this.animationFrame = requestAnimationFrame(() => this.visualize());
    }
    
    /**
     * Draw waveform on canvas
     */
    drawWaveform(analyser, x, y, width, height, color) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        
        this.canvasContext.strokeStyle = color;
        this.canvasContext.lineWidth = 2;
        this.canvasContext.beginPath();
        
        const sliceWidth = width / bufferLength;
        let currentX = x;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const currentY = y + (v * height) / 2;
            
            if (i === 0) {
                this.canvasContext.moveTo(currentX, currentY);
            } else {
                this.canvasContext.lineTo(currentX, currentY);
            }
            
            currentX += sliceWidth;
        }
        
        this.canvasContext.lineTo(width, height / 2);
        this.canvasContext.stroke();
    }
    
    /**
     * Update performance metrics display
     */
    updatePerformanceMetrics(startTime) {
        const processingTime = performance.now() - startTime;
        this.processingTime.textContent = `${processingTime.toFixed(1)} ms`;
        
        // Update sample rate
        if (this.audioContext) {
            this.sampleRate.textContent = `${(this.audioContext.sampleRate / 1000).toFixed(1)} kHz`;
        }
        
        // Calculate audio levels
        if (this.micAnalyser) {
            const micLevel = this.calculateAudioLevel(this.micAnalyser);
            this.inputLevel.textContent = `${micLevel.toFixed(1)} dB`;
        }
        
        if (this.outputAnalyser && this.isProcessing) {
            const outputLevel = this.calculateAudioLevel(this.outputAnalyser);
            this.outputLevel.textContent = `${outputLevel.toFixed(1)} dB`;
        }
        
        this.frameCount++;
    }
    
    /**
     * Calculate audio level in dB
     */
    calculateAudioLevel(analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        
        const average = sum / dataArray.length;
        return 20 * Math.log10(average / 255);
    }
    
    /**
     * Update UI state based on current status
     */
    updateUI() {
        // Update button states
        this.startCaptureBtn.disabled = this.isCapturing;
        this.stopCaptureBtn.disabled = !this.isCapturing;
        this.startProcessingBtn.disabled = !this.isCapturing || this.isProcessing;
        this.stopProcessingBtn.disabled = !this.isProcessing;
        
        // Update button classes
        this.startCaptureBtn.classList.toggle('recording', this.isCapturing);
        this.startProcessingBtn.classList.toggle('recording', this.isProcessing);
    }
    
    /**
     * Update status display
     */
    updateStatus(element, message, type = 'info') {
        if (!element) return;
        
        element.textContent = message;
        element.className = `status ${type}`;
        element.style.display = 'block';
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        this.stopAudioCapture();
        this.stopAudioProcessing();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new AudioSeparationApp();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
    
    // Expose app instance for debugging
    window.audioApp = app;
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioSeparationApp;
} 