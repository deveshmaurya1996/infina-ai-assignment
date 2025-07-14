#!/usr/bin/env python3
"""
Echo Cancellation Script for Audio Separation

This script provides offline echo cancellation and audio separation using
advanced signal processing techniques including:
- Spectral Subtraction
- Adaptive Filtering (LMS Algorithm)
- Wiener Filtering
- Noise Estimation

Requirements:
    pip install numpy scipy matplotlib librosa soundfile
"""

import numpy as np
import scipy.signal as signal
from scipy.io import wavfile
import matplotlib.pyplot as plt
import librosa
import soundfile as sf
import argparse
import os
from typing import Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


class EchoCancellation:
    """
    Advanced echo cancellation and audio separation using multiple algorithms
    """
    
    def __init__(self, sample_rate: int = 44100):
        self.sample_rate = sample_rate
        self.frame_size = 2048
        self.hop_size = 512
        
    def load_audio(self, file_path: str) -> Tuple[np.ndarray, int]:
        """
        Load audio file and return samples and sample rate
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Tuple of (samples, sample_rate)
        """
        try:
            # Try loading with soundfile first (better format support)
            samples, sr = sf.read(file_path)
            if len(samples.shape) > 1:
                samples = samples[:, 0]  # Take first channel if stereo
        except:
            # Fallback to scipy
            sr, samples = wavfile.read(file_path)
            if samples.dtype != np.float32:
                samples = samples.astype(np.float32) / np.iinfo(samples.dtype).max
        
        # Resample if necessary
        if sr != self.sample_rate:
            samples = librosa.resample(samples, orig_sr=sr, target_sr=self.sample_rate)
        
        return samples, self.sample_rate
    
    def spectral_subtraction(self, noisy_signal: np.ndarray, 
                           noise_estimate: np.ndarray,
                           alpha: float = 2.0,
                           beta: float = 0.01) -> np.ndarray:
        """
        Spectral subtraction for noise reduction
        
        Args:
            noisy_signal: Input signal with noise
            noise_estimate: Estimated noise spectrum
            alpha: Subtraction factor (default: 2.0)
            beta: Spectral floor (default: 0.01)
            
        Returns:
            Denoised signal
        """
        # Convert to frequency domain
        stft = librosa.stft(noisy_signal, n_fft=self.frame_size, hop_length=self.hop_size)
        noise_stft = librosa.stft(noise_estimate, n_fft=self.frame_size, hop_length=self.hop_size)
        
        # Calculate noise spectrum
        noise_spectrum = np.mean(np.abs(noise_stft) ** 2, axis=1, keepdims=True)
        
        # Spectral subtraction
        signal_spectrum = np.abs(stft) ** 2
        subtracted_spectrum = signal_spectrum - alpha * noise_spectrum
        
        # Apply spectral floor
        subtracted_spectrum = np.maximum(subtracted_spectrum, beta * signal_spectrum)
        
        # Reconstruct signal
        phase = np.angle(stft)
        cleaned_stft = np.sqrt(subtracted_spectrum) * np.exp(1j * phase)
        
        return librosa.istft(cleaned_stft, hop_length=self.hop_size)
    
    def adaptive_filter_lms(self, desired: np.ndarray, 
                          reference: np.ndarray,
                          filter_length: int = 512,
                          mu: float = 0.01) -> Tuple[np.ndarray, np.ndarray]:
        """
        Least Mean Squares (LMS) adaptive filter
        
        Args:
            desired: Desired signal (clean signal)
            reference: Reference signal (noise/echo)
            filter_length: Length of adaptive filter
            mu: Step size (learning rate)
            
        Returns:
            Tuple of (filtered_signal, filter_coefficients)
        """
        # Initialize filter coefficients
        w = np.zeros(filter_length)
        
        # Pad signals for convolution
        padded_ref = np.pad(reference, (filter_length - 1, 0), mode='constant')
        
        # LMS algorithm
        filtered_signal = np.zeros_like(desired)
        
        for n in range(len(desired)):
            # Get input vector
            x = padded_ref[n:n + filter_length][::-1]  # Reverse for convolution
            
            # Filter output
            y = np.dot(w, x)
            filtered_signal[n] = y
            
            # Error
            e = desired[n] - y
            
            # Update filter coefficients
            w += mu * e * x
        
        return filtered_signal, w
    
    def wiener_filter(self, noisy_signal: np.ndarray,
                     noise_estimate: np.ndarray,
                     snr_estimate: float = 10.0) -> np.ndarray:
        """
        Wiener filter for optimal noise reduction
        
        Args:
            noisy_signal: Input signal with noise
            noise_estimate: Estimated noise
            snr_estimate: Estimated signal-to-noise ratio in dB
            
        Returns:
            Filtered signal
        """
        # Convert SNR to linear scale
        snr_linear = 10 ** (snr_estimate / 10)
        
        # Calculate Wiener filter frequency response
        stft = librosa.stft(noisy_signal, n_fft=self.frame_size, hop_length=self.hop_size)
        noise_stft = librosa.stft(noise_estimate, n_fft=self.frame_size, hop_length=self.hop_size)
        
        # Estimate noise power spectrum
        noise_psd = np.mean(np.abs(noise_stft) ** 2, axis=1, keepdims=True)
        
        # Estimate signal power spectrum
        signal_psd = np.abs(stft) ** 2
        
        # Wiener filter
        wiener_filter = signal_psd / (signal_psd + noise_psd / snr_linear)
        
        # Apply filter
        filtered_stft = stft * wiener_filter
        
        return librosa.istft(filtered_stft, hop_length=self.hop_size)
    
    def noise_estimation(self, signal: np.ndarray, 
                        noise_frames: int = 10) -> np.ndarray:
        """
        Estimate noise from the beginning of the signal
        
        Args:
            signal: Input signal
            noise_frames: Number of frames to use for noise estimation
            
        Returns:
            Estimated noise signal
        """
        # Use first few frames as noise estimate
        noise_length = noise_frames * self.hop_size
        noise_estimate = signal[:noise_length]
        
        return noise_estimate
    
    def separate_audio(self, mixed_signal: np.ndarray,
                      reference_signal: Optional[np.ndarray] = None,
                      method: str = 'spectral') -> np.ndarray:
        """
        Separate audio using multiple methods
        
        Args:
            mixed_signal: Mixed audio signal
            reference_signal: Reference signal (if available)
            method: Separation method ('spectral', 'adaptive', 'wiener')
            
        Returns:
            Separated audio signal
        """
        if method == 'spectral':
            # Estimate noise from beginning of signal
            noise_estimate = self.noise_estimation(mixed_signal)
            return self.spectral_subtraction(mixed_signal, noise_estimate)
            
        elif method == 'adaptive' and reference_signal is not None:
            # Use adaptive filtering
            filtered_signal, _ = self.adaptive_filter_lms(mixed_signal, reference_signal)
            return filtered_signal
            
        elif method == 'wiener':
            # Use Wiener filtering
            noise_estimate = self.noise_estimation(mixed_signal)
            return self.wiener_filter(mixed_signal, noise_estimate)
            
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def process_file(self, input_file: str, 
                    output_file: str,
                    method: str = 'spectral',
                    reference_file: Optional[str] = None) -> None:
        """
        Process audio file and save result
        
        Args:
            input_file: Path to input audio file
            output_file: Path to output audio file
            method: Processing method
            reference_file: Path to reference audio file (for adaptive filtering)
        """
        print(f"Processing {input_file} using {method} method...")
        
        # Load input signal
        mixed_signal, sr = self.load_audio(input_file)
        
        # Load reference signal if provided
        reference_signal = None
        if reference_file and os.path.exists(reference_file):
            reference_signal, _ = self.load_audio(reference_file)
            # Ensure same length
            min_length = min(len(mixed_signal), len(reference_signal))
            mixed_signal = mixed_signal[:min_length]
            reference_signal = reference_signal[:min_length]
        
        # Process signal
        processed_signal = self.separate_audio(mixed_signal, reference_signal, method)
        
        # Save result
        sf.write(output_file, processed_signal, sr)
        print(f"Saved processed audio to {output_file}")
        
        # Generate analysis plots
        self.plot_analysis(mixed_signal, processed_signal, sr, method)
    
    def plot_analysis(self, original: np.ndarray, 
                     processed: np.ndarray,
                     sample_rate: int,
                     method: str) -> None:
        """
        Generate analysis plots
        
        Args:
            original: Original signal
            processed: Processed signal
            sample_rate: Sample rate
            method: Processing method used
        """
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle(f'Audio Separation Analysis - {method.title()} Method', fontsize=16)
        
        # Time domain plots
        time_orig = np.arange(len(original)) / sample_rate
        time_proc = np.arange(len(processed)) / sample_rate
        
        axes[0, 0].plot(time_orig, original)
        axes[0, 0].set_title('Original Signal')
        axes[0, 0].set_xlabel('Time (s)')
        axes[0, 0].set_ylabel('Amplitude')
        axes[0, 0].grid(True)
        
        axes[0, 1].plot(time_proc, processed)
        axes[0, 1].set_title('Processed Signal')
        axes[0, 1].set_xlabel('Time (s)')
        axes[0, 1].set_ylabel('Amplitude')
        axes[0, 1].grid(True)
        
        # Frequency domain plots
        f_orig, psd_orig = signal.welch(original, sample_rate, nperseg=1024)
        f_proc, psd_proc = signal.welch(processed, sample_rate, nperseg=1024)
        
        axes[1, 0].semilogy(f_orig, psd_orig)
        axes[1, 0].set_title('Original Signal PSD')
        axes[1, 0].set_xlabel('Frequency (Hz)')
        axes[1, 0].set_ylabel('Power Spectral Density')
        axes[1, 0].grid(True)
        
        axes[1, 1].semilogy(f_proc, psd_proc)
        axes[1, 1].set_title('Processed Signal PSD')
        axes[1, 1].set_xlabel('Frequency (Hz)')
        axes[1, 1].set_ylabel('Power Spectral Density')
        axes[1, 1].grid(True)
        
        plt.tight_layout()
        
        # Save plot
        plot_file = f"analysis_{method}.png"
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        print(f"Analysis plot saved as {plot_file}")
        plt.close()


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description='Echo Cancellation and Audio Separation')
    parser.add_argument('input', help='Input audio file')
    parser.add_argument('output', help='Output audio file')
    parser.add_argument('--method', choices=['spectral', 'adaptive', 'wiener'], 
                       default='spectral', help='Processing method')
    parser.add_argument('--reference', help='Reference audio file (for adaptive filtering)')
    parser.add_argument('--sample-rate', type=int, default=44100, help='Sample rate')
    
    args = parser.parse_args()
    
    # Create processor
    processor = EchoCancellation(sample_rate=args.sample_rate)
    
    # Process file
    processor.process_file(args.input, args.output, args.method, args.reference)


if __name__ == '__main__':
    main() 