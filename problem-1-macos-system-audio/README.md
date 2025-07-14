# 🎵 macOS System Audio Capture Tool

**Author:** Devesh Maurya  
**Email:** deveshmaurya1996@gmail.com  
**GitHub:** [deveshmaurya1996](https://github.com/deveshmaurya1996)

**TL;DR**: A Swift CLI tool that captures system audio output (not microphone) on macOS, with an Electron bridge for frontend integration.

## 📋 Overview

This solution provides a complete system for capturing macOS system audio output using Swift and CoreAudio, with a Node.js/Electron bridge for frontend integration. It captures only system audio (applications, music, etc.) without microphone input.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Electron UI   │◄──►│  Node.js Bridge  │◄──►│  Swift CLI Tool │
│   (Frontend)    │    │   (bridge.ts)    │    │ (audio_capture) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Process Mgmt   │    │  CoreAudio API  │
                       │  IPC Handling   │    │  AVFoundation   │
                       └─────────────────┘    └─────────────────┘
```

## 🛠️ Technical Implementation

### Swift CLI Tool (`audio_capture.swift`)

**Core Components:**
- **AVAudioEngine**: Main audio processing engine
- **CoreAudio**: Low-level audio device management
- **Audio Taps**: Captures system audio stream
- **Signal Handling**: Graceful shutdown with SIGINT

**Key Features:**
- Real-time system audio capture
- Multiple output formats (CAF, WAV, AIFF, M4A)
- Device enumeration and listing
- Configurable duration and quality settings
- Error handling and validation

### Electron Bridge (`bridge.ts`)

**Core Components:**
- **Child Process Management**: Spawns and manages Swift process
- **Event Emitter**: Real-time status updates
- **IPC Communication**: Frontend-backend communication
- **Process Lifecycle**: Start, stop, cleanup

**Key Features:**
- TypeScript interfaces for type safety
- Async/await API for modern JavaScript
- Error handling and recovery
- Device enumeration wrapper
- Status monitoring

## 🚀 Quick Start

### Prerequisites

1. **macOS 10.15+** (for AVFoundation audio engine)
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Swift 5.0+**:
   ```bash
   swift --version
   ```
4. **Virtual Audio Device** (recommended):
   - [BlackHole](https://github.com/ExistentialAudio/BlackHole) (free)
   - [Loopback](https://rogueamoeba.com/loopback/) (paid)
   - [Soundflower](https://github.com/mattingalls/Soundflower) (legacy)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd infina-ai-assignment/problem-1-macos-system-audio
   ```

2. **Make Swift script executable**:
   ```bash
   chmod +x swift/audio_capture.swift
   ```

3. **Install Node.js dependencies** (if using Electron bridge):
   ```bash
   cd electron-integration
   npm install
   ```

### Usage

#### Direct Swift CLI Usage

```bash
# Basic recording (continuous until Ctrl+C)
./swift/audio_capture.swift output.caf

# Timed recording (30 seconds)
./swift/audio_capture.swift output.wav 30

# List available audio devices
./swift/audio_capture.swift --list-devices

# Help
./swift/audio_capture.swift
```

#### Electron Bridge Usage

```typescript
import { AudioCaptureBridge } from './bridge';

const bridge = new AudioCaptureBridge();

// Start recording
await bridge.startRecording({
    outputPath: './system_audio.caf',
    duration: 30 // optional
});

// Stop recording
await bridge.stopRecording();

// List devices
const devices = await bridge.listAudioDevices();

// Get status
const status = bridge.getStatus();
```

## 🔧 Configuration

### Audio Format Settings

```swift
// Default settings in audio_capture.swift
private let sampleRate: Double = 44100.0
private let channels: AVAudioChannelCount = 2
private let bitDepth: AVAudioCommonFormat = .pcmFormatFloat32
```

### Supported Output Formats

| Format | Extension | Quality | File Size |
|--------|-----------|---------|-----------|
| CAF    | .caf      | High    | Large     |
| WAV    | .wav      | High    | Large     |
| AIFF   | .aiff     | High    | Large     |
| M4A    | .m4a      | Compressed| Small    |

## 🔒 Permissions & Security

### Required Permissions

1. **Microphone Access**: Required for audio session setup
2. **System Preferences**: Grant access in Security & Privacy
3. **Virtual Device**: Install and configure virtual audio device

### Security Considerations

- **Sandboxing**: Swift tool runs in user space
- **File Access**: Only writes to specified output path
- **Process Isolation**: Electron bridge manages Swift process lifecycle
- **Error Handling**: Graceful failure without system impact

## 🐛 Troubleshooting

### Common Issues

1. **"Permission denied"**
   - Grant microphone access in System Preferences
   - Check virtual audio device installation

2. **"No audio devices found"**
   - Install virtual audio device (BlackHole, Loopback)
   - Restart audio services: `sudo killall coreaudiod`

3. **"Swift not found"**
   - Install Xcode Command Line Tools
   - Verify Swift installation: `swift --version`

4. **"Recording produces silence"**
   - Check virtual audio device routing
   - Verify system audio is playing
   - Test with different applications

### Debug Mode

```bash
# Enable verbose logging
SWIFT_VERBOSE=1 ./swift/audio_capture.swift output.caf

# Check audio devices
./swift/audio_capture.swift --list-devices
```

## 📊 Performance Considerations

### Resource Usage

- **CPU**: ~5-10% during recording
- **Memory**: ~50-100MB for audio buffers
- **Disk**: Depends on recording duration and format
- **Network**: None (local processing only)

### Optimization Tips

1. **Use CAF format** for best performance
2. **Limit recording duration** for large files
3. **Monitor system resources** during long recordings
4. **Use SSD storage** for better I/O performance

## 🔄 Integration Examples

### Electron App Integration

```typescript
// main.ts
import { app, ipcMain } from 'electron';
import { AudioCaptureBridge } from './bridge';

const bridge = new AudioCaptureBridge();

ipcMain.handle('start-recording', async (event, options) => {
    await bridge.startRecording(options);
});

ipcMain.handle('stop-recording', async () => {
    await bridge.stopRecording();
});

ipcMain.handle('get-devices', async () => {
    return await bridge.listAudioDevices();
});
```

### React Frontend Integration

```typescript
// AudioCapture.tsx
import { useState, useEffect } from 'react';

const AudioCapture = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [devices, setDevices] = useState([]);

    const startRecording = async () => {
        await window.electronAPI.startRecording({
            outputPath: './recording.caf',
            duration: 30
        });
        setIsRecording(true);
    };

    const stopRecording = async () => {
        await window.electronAPI.stopRecording();
        setIsRecording(false);
    };

    return (
        <div>
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
        </div>
    );
};
```

## 📈 Future Enhancements

### Planned Features

1. **Real-time Audio Processing**
   - Live filtering and effects
   - Audio level monitoring
   - Spectral analysis

2. **Advanced Format Support**
   - FLAC lossless compression
   - MP3 encoding
   - Custom bitrate settings

3. **Multi-channel Support**
   - Surround sound capture
   - Individual channel routing
   - Channel mixing

4. **Cloud Integration**
   - Direct upload to cloud storage
   - Streaming to remote servers
   - Real-time collaboration

### Performance Improvements

1. **Zero-copy Audio Buffers**
2. **Hardware Acceleration**
3. **Parallel Processing**
4. **Memory Pooling**

## 📚 Technical Deep Dive

### CoreAudio Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│                   AVFoundation                            │
├─────────────────────────────────────────────────────────────┤
│                    CoreAudio                               │
├─────────────────────────────────────────────────────────────┤
│                 Audio HAL (Hardware)                      │
└─────────────────────────────────────────────────────────────┘
```

### Audio Flow

1. **System Audio Output** → Audio HAL
2. **Audio HAL** → CoreAudio
3. **CoreAudio** → AVAudioEngine
4. **AVAudioEngine** → Audio Tap
5. **Audio Tap** → AVAudioFile
6. **AVAudioFile** → Disk Storage

### Error Handling Strategy

1. **Graceful Degradation**: Fallback to basic recording
2. **Retry Logic**: Automatic retry on transient failures
3. **Resource Cleanup**: Proper cleanup on errors
4. **User Feedback**: Clear error messages and suggestions

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

This project is part of the Infina AI assignment. See the main repository for license information.

## 🔗 Related Links

- [CoreAudio Programming Guide](https://developer.apple.com/library/archive/documentation/MusicAudio/Conceptual/CoreAudioOverview/Introduction/Introduction.html)
- [AVFoundation Framework](https://developer.apple.com/documentation/avfoundation)
- [BlackHole Virtual Audio Driver](https://github.com/ExistentialAudio/BlackHole)
- [Loopback Audio Routing](https://rogueamoeba.com/loopback/)

---

**Note**: This tool is designed specifically for macOS. For cross-platform audio capture, consider using Web Audio API or platform-specific alternatives. 