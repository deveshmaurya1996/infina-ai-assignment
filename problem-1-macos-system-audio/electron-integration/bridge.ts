import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Electron Bridge for macOS System Audio Capture
 * 
 * This TypeScript module provides a Node.js wrapper around the Swift CLI tool
 * for capturing system audio. It handles process management, IPC communication,
 * and provides a clean API for the Electron frontend.
 */

export interface AudioCaptureOptions {
    outputPath: string;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    format?: 'caf' | 'wav' | 'aiff' | 'm4a';
}

export interface AudioDevice {
    id: string;
    name: string;
    type: 'input' | 'output' | 'both';
}

export interface CaptureStatus {
    isRecording: boolean;
    duration: number;
    outputPath: string;
    error?: string;
}

export class AudioCaptureBridge extends EventEmitter {
    private swiftProcess: ChildProcess | null = null;
    private isRecording = false;
    private startTime: number = 0;
    private outputPath: string = '';
    
    private readonly swiftScriptPath = path.join(__dirname, '../swift/audio_capture.swift');
    
    constructor() {
        super();
        this.setupEventHandlers();
    }
    
    async startRecording(options: AudioCaptureOptions): Promise<void> {
        if (this.isRecording) {
            throw new Error('Already recording');
        }
        
        this.validateOptions(options);
        
        const outputDir = path.dirname(options.outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const args = [options.outputPath];
        if (options.duration) {
            args.push(options.duration.toString());
        }
        
        try {
            this.swiftProcess = spawn('swift', [this.swiftScriptPath, ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.dirname(this.swiftScriptPath)
            });
            
            this.setupProcessHandlers();
            
            this.isRecording = true;
            this.startTime = Date.now();
            this.outputPath = options.outputPath;
            
            this.emit('recordingStarted', {
                outputPath: options.outputPath,
                duration: options.duration || 0
            });
            
        } catch (error) {
            this.emit('error', `Failed to start recording: ${error}`);
            throw error;
        }
    }
    
    async stopRecording(): Promise<void> {
        if (!this.isRecording || !this.swiftProcess) {
            return;
        }
        
        try {
            this.swiftProcess.kill('SIGINT');
            
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Process termination timeout'));
                }, 5000);
                
                this.swiftProcess!.once('exit', (code) => {
                    clearTimeout(timeout);
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Process exited with code ${code}`));
                    }
                });
            });
            
        } catch (error) {
            if (this.swiftProcess) {
                this.swiftProcess.kill('SIGKILL');
            }
            throw error;
        } finally {
            this.cleanup();
        }
    }
    
    async listAudioDevices(): Promise<AudioDevice[]> {
        return new Promise((resolve, reject) => {
            const process = spawn('swift', [this.swiftScriptPath, '--list-devices'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.dirname(this.swiftScriptPath)
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    const devices = this.parseDeviceList(stdout);
                    resolve(devices);
                } else {
                    reject(new Error(`Failed to list devices: ${stderr}`));
                }
            });
            
            process.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    getStatus(): CaptureStatus {
        const duration = this.isRecording ? (Date.now() - this.startTime) / 1000 : 0;
        
        return {
            isRecording: this.isRecording,
            duration,
            outputPath: this.outputPath,
        };
    }
    
    async checkSwiftAvailability(): Promise<boolean> {
        return new Promise((resolve) => {
            const process = spawn('swift', ['--version']);
            
            process.on('close', (code) => {
                resolve(code === 0);
            });
            
            process.on('error', () => {
                resolve(false);
            });
        });
    }
    
    private validateOptions(options: AudioCaptureOptions): void {
        if (!options.outputPath) {
            throw new Error('Output path is required');
        }
        
        const validFormats = ['caf', 'wav', 'aiff', 'm4a'];
        const fileExt = path.extname(options.outputPath).toLowerCase().slice(1);
        
        if (!validFormats.includes(fileExt)) {
            throw new Error(`Invalid output format. Supported: ${validFormats.join(', ')}`);
        }
        
        if (options.duration && options.duration <= 0) {
            throw new Error('Duration must be positive');
        }
    }
    
    private setupProcessHandlers(): void {
        if (!this.swiftProcess) return;
        
        this.swiftProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            this.emit('output', output);
            
            if (output.includes('Started recording')) {
                this.emit('status', 'Recording started');
            } else if (output.includes('Recording stopped')) {
                this.emit('status', 'Recording stopped');
            }
        });
        
        this.swiftProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            this.emit('error', error);
        });
        
        this.swiftProcess.on('exit', (code, signal) => {
            this.emit('processExited', { code, signal });
            
            if (code !== 0 && code !== null) {
                this.emit('error', `Process exited with code ${code}`);
            }
            
            this.cleanup();
        });
        
        this.swiftProcess.on('error', (error) => {
            this.emit('error', `Process error: ${error.message}`);
            this.cleanup();
        });
    }
    
    private parseDeviceList(output: string): AudioDevice[] {
        const devices: AudioDevice[] = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            if (line.includes('🔊') && line.includes('(ID:')) {
                const match = line.match(/🔊 (.+?) \(ID: (\d+)\)/);
                if (match) {
                    devices.push({
                        id: match[2],
                        name: match[1].trim(),
                        type: 'both'
                    });
                }
            }
        }
        
        return devices;
    }
    
    private cleanup(): void {
        this.isRecording = false;
        this.startTime = 0;
        this.outputPath = '';
        
        if (this.swiftProcess) {
            this.swiftProcess.removeAllListeners();
            this.swiftProcess = null;
        }
        
        this.emit('recordingStopped');
    }
    
    private setupEventHandlers(): void {
        process.on('exit', () => {
            if (this.isRecording) {
                this.stopRecording().catch(console.error);
            }
        });
    }
}

export const audioCaptureBridge = new AudioCaptureBridge(); 