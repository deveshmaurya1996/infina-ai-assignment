# Infina AI Assignment

**Author:** Devesh Maurya  
**Email:** deveshmaurya1996@gmail.com  
**GitHub:** [deveshmaurya1996](https://github.com/deveshmaurya1996)

## Overview

This repository contains solutions for three challenging audio and web development problems:

1. **macOS System Audio Only Recording** - Native audio capture using Electron + Swift
2. **Browser Audio Stream Separation** - Real-time audio processing with Web Audio API
3. **Google Calendar Integration** - OAuth-based calendar app without WebSockets/BaaS

## Project Structure

```
infina-ai-assignment/
├── problem-1-macos-system-audio/          # macOS audio capture solution
├── problem-2-browser-audio-separation/    # Browser audio separation demo
├── problem-3-google-calendar-ui/          # Google Calendar integration
├── test-setup.js                          # Project validation script
└── README.md                              # This file
```

## Quick Start

### Prerequisites
- Node.js (>=16)
- Python (>=3.8)
- Swift (macOS only, for Problem 1)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/deveshmaurya1996/infina-ai-assignment.git
   cd infina-ai-assignment
   ```

2. **Run validation:**
   ```bash
   node test-setup.js
   ```

3. **Test each problem:**
   ```bash
   # Problem 2 - Browser Audio Separation
   cd problem-2-browser-audio-separation
   python -m http.server 8000
   # Open http://localhost:8000/public/
   
   # Problem 3 - Google Calendar UI
   cd problem-3-google-calendar-ui/frontend
   npm install
   npm run dev
   # Open the local URL in browser
   ```

## Problem Details

### Problem 1: macOS System Audio Only Recording
- **Technology:** Electron + Swift + AVFoundation
- **Challenge:** Capture system audio without microphone input
- **Solution:** Native bridge using Swift CLI and Electron integration

### Problem 2: Browser Audio Stream Separation
- **Technology:** Web Audio API + JavaScript + Python
- **Challenge:** Separate microphone and system audio streams
- **Solution:** Adaptive filtering, spectral subtraction, and noise gating

### Problem 3: Google Calendar Integration
- **Technology:** React + TypeScript + Google OAuth
- **Challenge:** Real-time calendar updates without WebSockets/BaaS
- **Solution:** Smart polling with incremental sync tokens

## Features

- ✅ **Complete Solutions:** All three problems fully implemented
- ✅ **Modern UI/UX:** Beautiful, responsive interfaces
- ✅ **Comprehensive Documentation:** Detailed READMEs and diagrams
- ✅ **Error Handling:** Robust error handling and user feedback
- ✅ **Cross-platform:** Works on Windows, macOS, and Linux

## Technical Highlights

- **Real-time Audio Processing:** Web Audio API with advanced algorithms
- **OAuth Integration:** Secure Google Calendar authentication
- **Smart Polling:** Efficient API usage with visibility detection
- **Native Integration:** Electron + Swift for macOS audio capture
- **Modern Development:** TypeScript, React, and modern JavaScript

## Contact

- **Name:** Devesh Maurya
- **Email:** deveshmaurya1996@gmail.com
- **GitHub:** [deveshmaurya1996](https://github.com/deveshmaurya1996)
