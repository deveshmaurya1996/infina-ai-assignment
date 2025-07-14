#!/usr/bin/env swift

import Foundation
import AVFoundation
import CoreAudio

/**
 * macOS System Audio Capture Tool
 * 
 * This Swift CLI tool captures system audio output (not microphone) on macOS.
 * It uses CoreAudio and AVFoundation to tap into the system audio stream.
 * 
 * Requirements:
 * - macOS 10.15+ (for AVFoundation audio engine)
 * - Audio permissions in System Preferences
 * - Virtual audio device (BlackHole, Loopback, etc.) for routing
 * 
 * Usage: ./audio_capture.swift [output_file] [duration_seconds]
 * Example: ./audio_capture.swift system_audio.caf 30
 */

class SystemAudioCapture {
    private var audioEngine: AVAudioEngine?
    private var audioFile: AVAudioFile?
    private var isRecording = false
    
    // Audio format configuration
    private let sampleRate: Double = 44100.0
    private let channels: AVAudioChannelCount = 2
    private let bitDepth: AVAudioCommonFormat = .pcmFormatFloat32
    
    init() {
        setupAudioSession()
    }
    
    private func setupAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, 
                                       mode: .default, 
                                       options: [.allowBluetooth, .allowBluetoothA2DP])
            try audioSession.setActive(true)
        } catch {
            print("❌ Error setting up audio session: \(error)")
            exit(1)
        }
    }
    
    func startRecording(outputPath: String, duration: TimeInterval? = nil) {
        guard !isRecording else {
            print("⚠️  Already recording!")
            return
        }
        
        do {
            // Initialize audio engine
            audioEngine = AVAudioEngine()
            guard let engine = audioEngine else {
                print("❌ Failed to initialize audio engine")
                exit(1)
            }
            
            // Get the main mixer node (system audio output)
            let mainMixer = engine.mainMixerNode
            
            // Create output file
            let outputURL = URL(fileURLWithPath: outputPath)
            let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: channels)!
            
            audioFile = try AVAudioFile(forWriting: outputURL, 
                                       settings: format.settings)
            
            // Install tap on main mixer to capture system audio
            mainMixer.installTap(onBus: 0, 
                                bufferSize: 1024, 
                                format: format) { [weak self] buffer, time in
                self?.processAudioBuffer(buffer)
            }
            
            // Start the engine
            try engine.start()
            isRecording = true
            
            print("🎵 Started recording system audio to: \(outputPath)")
            print("📊 Format: \(sampleRate)Hz, \(channels) channels, \(bitDepth)")
            
            // Set up timer for duration if specified
            if let duration = duration {
                DispatchQueue.main.asyncAfter(deadline: .now() + duration) { [weak self] in
                    self?.stopRecording()
                }
            }
            
        } catch {
            print("❌ Error starting recording: \(error)")
            exit(1)
        }
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let audioFile = audioFile else { return }
        
        do {
            try audioFile.write(from: buffer)
        } catch {
            print("❌ Error writing audio buffer: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        
        audioEngine?.stop()
        audioEngine?.mainMixerNode.removeTap(onBus: 0)
        audioEngine = nil
        audioFile = nil
        isRecording = false
        
        print("✅ Recording stopped")
    }
    
    func listAudioDevices() {
        print("\n📋 Available Audio Devices:")
        print("=" * 50)
        
        var propertySize: UInt32 = 0
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        // Get size of property data
        AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject),
                                     &propertyAddress,
                                     0,
                                     nil,
                                     &propertySize)
        
        let deviceCount = Int(propertySize) / MemoryLayout<AudioDeviceID>.size
        var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)
        
        // Get device IDs
        AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject),
                                 &propertyAddress,
                                 0,
                                 nil,
                                 &propertySize,
                                 &deviceIDs)
        
        // Print device information
        for deviceID in deviceIDs {
            var nameSize: UInt32 = 256
            var deviceName = [CChar](repeating: 0, count: 256)
            
            var nameProperty = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyDeviceNameCFString,
                mScope: kAudioObjectPropertyScopeGlobal,
                mElement: kAudioObjectPropertyElementMain
            )
            
            AudioObjectGetPropertyData(deviceID,
                                     &nameProperty,
                                     0,
                                     nil,
                                     &nameSize,
                                     &deviceName)
            
            if let name = String(cString: deviceName, encoding: .utf8) {
                print("🔊 \(name) (ID: \(deviceID))")
            }
        }
    }
}

// MARK: - Main Execution

func printUsage() {
    print("""
    🎵 macOS System Audio Capture Tool
    
    Usage:
        ./audio_capture.swift [output_file] [duration_seconds]
    
    Examples:
        ./audio_capture.swift system_audio.caf 30
        ./audio_capture.swift output.wav
        ./audio_capture.swift --list-devices
    
    Notes:
        - Requires virtual audio device (BlackHole, Loopback, etc.)
        - Grant microphone permissions in System Preferences
        - Output formats: .caf, .wav, .aiff, .m4a
    
    Recommended Virtual Audio Devices:
        - BlackHole (free): https://github.com/ExistentialAudio/BlackHole
        - Loopback (paid): https://rogueamoeba.com/loopback/
        - Soundflower (legacy): https://github.com/mattingalls/Soundflower
    """)
}

func main() {
    let args = CommandLine.arguments
    
    if args.count < 2 {
        printUsage()
        exit(1)
    }
    
    let capture = SystemAudioCapture()
    
    // Handle special commands
    if args.contains("--list-devices") {
        capture.listAudioDevices()
        exit(0)
    }
    
    // Parse arguments
    let outputFile = args[1]
    let duration = args.count > 2 ? TimeInterval(args[2]) : nil
    
    // Validate output file extension
    let validExtensions = ["caf", "wav", "aiff", "m4a"]
    let fileExtension = (outputFile as NSString).pathExtension.lowercased()
    
    guard validExtensions.contains(fileExtension) else {
        print("❌ Invalid output format. Supported: \(validExtensions.joined(separator: ", "))")
        exit(1)
    }
    
    // Set up signal handling for graceful shutdown
    signal(SIGINT) { _ in
        print("\n🛑 Received interrupt signal")
        capture.stopRecording()
        exit(0)
    }
    
    // Start recording
    capture.startRecording(outputPath: outputFile, duration: duration)
    
    // Keep running until interrupted or duration expires
    if duration == nil {
        print("⏳ Recording... Press Ctrl+C to stop")
        RunLoop.main.run()
    }
}

// Run the main function
main() 