// audio-processor.js
// This file implements a noise reduction processor for AudioWorklet

class NoiseReducerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.noiseReductionEnabled = false;
    
    // Buffer for echo cancellation
    this.bufferSize = 2048;
    this.delayBuffer = new Float32Array(this.bufferSize);
    this.delayBufferIndex = 0;
    
    // Parameters for noise reduction
    this.threshold = 0.015; // Noise threshold (slightly increased)
    this.attackTime = 0.005; // Attack time in seconds
    this.releaseTime = 0.05; // Release time in seconds
    this.attackCoef = Math.exp(-1 / (this.attackTime * sampleRate));
    this.releaseCoef = Math.exp(-1 / (this.releaseTime * sampleRate));
    this.prevEnvelope = 0;
    
    // Listen for messages from the main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'enableNoiseReduction') {
        this.noiseReductionEnabled = event.data.enabled;
      }
    };
  }

  // Enhanced noise reduction with smoother gating
  applyNoiseReduction(inputData) {
    const outputData = new Float32Array(inputData.length);
    
    for (let i = 0; i < inputData.length; i++) {
      // Calculate envelope using attack and release
      const inputAbs = Math.abs(inputData[i]);
      let envelope = 0;
      
      if (inputAbs > this.prevEnvelope) {
        envelope = this.attackCoef * this.prevEnvelope + (1 - this.attackCoef) * inputAbs;
      } else {
        envelope = this.releaseCoef * this.prevEnvelope + (1 - this.releaseCoef) * inputAbs;
      }
      
      this.prevEnvelope = envelope;
      
      // Apply soft noise gate with smoother transition
      if (envelope < this.threshold) {
        // Calculate attenuation factor (smoother than hard gate)
        const attenuationFactor = Math.pow(envelope / this.threshold, 2);
        outputData[i] = inputData[i] * attenuationFactor;
      } else {
        outputData[i] = inputData[i];
      }
      
      // Apply echo cancellation using delay buffer
      // Subtract a portion of the delayed signal to reduce echo
      const delayedSample = this.delayBuffer[this.delayBufferIndex];
      outputData[i] -= delayedSample * 0.3; // Echo reduction factor
      
      // Update delay buffer
      this.delayBuffer[this.delayBufferIndex] = outputData[i];
      this.delayBufferIndex = (this.delayBufferIndex + 1) % this.bufferSize;
    }
    
    return outputData;
  }

  process(inputs, outputs, parameters) {
    // Get the input and output
    const input = inputs[0];
    const output = outputs[0];
    
    // Check if we have valid input
    if (!input || input.length === 0 || !input[0] || input[0].length === 0) {
      return true;
    }
    
    // Process each channel
    for (let channel = 0; channel < input.length; channel++) {
      const inputData = input[channel];
      const outputData = output[channel];
      
      if (this.noiseReductionEnabled) {
        // Apply enhanced noise reduction
        const processedData = this.applyNoiseReduction(inputData);
        
        // Copy processed data to output
        for (let i = 0; i < outputData.length; i++) {
          outputData[i] = processedData[i];
        }
      } else {
        // Pass through without processing
        for (let i = 0; i < outputData.length; i++) {
          outputData[i] = inputData[i];
        }
      }
    }
    
    // Return true to keep the processor running
    return true;
  }
}

// Register the processor
registerProcessor('noise-reducer-processor', NoiseReducerProcessor);
