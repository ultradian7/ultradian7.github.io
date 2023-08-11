class OscillatorGroup {
  constructor(x, y) {
    this.osc = new p5.Oscillator('sine');
    this.osc.amp(0);

    this.modOsc = new p5.Oscillator('sine');  // Modulator oscillator
    this.modOsc.amp(0);  // Initial amplitude of modulator
    this.modOsc.start();
    this.modOsc.disconnect();

    this.freqInput = createInput('315');
    this.freqInput.position(x, y).style('font-family', 'courier').style('width', '74px').style('font-size', '19px');
    this.freqInput.changed(() => this.updateFrequency());
    
    this.toggleButton = createButton('start tone');
    this.toggleButton.position(x, y + 36).style('font-family', 'courier').style('font-size', '19px');
    this.toggleButton.mousePressed(() => this.toggleOscillator());
    
    this.volumeSlider = createSlider(0, 1, 0, 0);
    this.volumeSlider.position(x - 104, y + 47).style('width', '172px').style('height', '40px');
    this.volumeSlider.style('transform', 'rotate(270deg)');
    this.volumeSlider.input(() => this.osc.amp(this.volumeSlider.value(), 0.162));

    this.modInput = createInput('0');
    this.modInput.position(x, y + 77).style('font-family', 'courier').style('width', '74px').style('font-size', '19px');
    this.modInput.changed(() => this.updateModulationfreq());

    this.modSlider = createSlider(0, 1, 0, 0)
    this.modSlider.position(x, y + 98).style('width', '80px').style('height', '40px');
    this.modSlider.input(() => this.updateModulationAmp());


  }

  updateOpacity(opacityValue) {
      this.freqInput.style('opacity', opacityValue);
      this.toggleButton.style('opacity', opacityValue);
      this.volumeSlider.style('opacity', opacityValue);
      this.modSlider.style('opacity', opacityValue);
      this.modInput.style('opacity', opacityValue);
    }

    toggleOscillator() {
      if (this.osc.started) {
        this.osc.stop();
        this.toggleButton.html('start tone');
        activeOscillatorCount--;
      } else {
        const freq = parseFloat(this.freqInput.value());
        this.osc.freq(freq);
        this.osc.amp(this.modOsc);  // The carrier's amplitude is controlled by the modulator
        this.osc.start();
        this.toggleButton.html('stop tone');
        activeOscillatorCount++;
      }
    }
    

    
    
    updateFrequency() {
      if (this.osc.started) {
        const freq = parseFloat(this.freqInput.value());
        this.osc.freq(freq);
      }
    }
  
    updateModulationfreq() {
      const modFreq = parseFloat(this.modInput.value());
      this.modOsc.freq(modFreq);
    }
  
    updateModulationAmp() {
      const modAmp = this.modSlider.value();
      this.modOsc.amp(modAmp);
    }

  }

let oscillatorGroups = [];
let oscilloscopeButton, opacitySlider, fft;
let activeOscillatorCount = 0;
let activeOscilloscope = false;

function setup() {
  createCanvas(600, 400, WEBGL);

  if (screen.orientation) {
    screen.orientation.lock('landscape');
  }
  
  oscillatorGroups.push(new OscillatorGroup(30, 27));
  oscillatorGroups.push(new OscillatorGroup(200, 27));

  // For oscilloscope and opacity, I'm keeping them outside of the OscillatorGroup as they seem more global in function
  oscilloscopeButton = createButton('start oscilloscope');
  oscilloscopeButton.position(0 + 10, height - 100).style('font-family', 'courier').style('font-size', '16px');
  oscilloscopeButton.mousePressed(toggleOscilloscope);

  opacitySlider = createSlider(0, 255, 255);
  opacitySlider.position(0, height - 70).style('width', '197px').style('height', '16px');
  /*opacitySlider.style('transform', 'rotate(270deg)');*/
  opacitySlider.input(updateOpacity);
  
  fft = new p5.FFT();
}

function toggleOscilloscope() {
  activeOscilloscope = !activeOscilloscope;
  if (activeOscilloscope) {
    oscilloscopeButton.html('stop oscilloscope');
  } else {
    oscilloscopeButton.html('start oscilloscope');
  }
}


function updateOpacity() {
  const opacity = opacitySlider.value();
  oscilloscopeButton.style('opacity', opacity / 255);
  opacitySlider.style('opacity', opacity / 255);
  updateOpacityForAllGroups()
}

function updateOpacityForAllGroups() {
  const opacityValue = opacitySlider.value() / 255;
  for (let group of oscillatorGroups) {
    group.updateOpacity(opacityValue);
  }
}

function draw() {
  background(0);

  // Check if any oscillator is active using the count
  if (activeOscillatorCount > 0 && activeOscilloscope) {
    // Analyze the waveform using FFT
    const oscWaveform = fft.waveform();
    const oscWaveformLength = oscWaveform.length;

    noFill();
    stroke(255);

    const centerX = width / 32;
    const centerY = height / 32;
    const baseRadius = Math.min(windowWidth, windowHeight) * 0.1618; // base radius for the circle, using 40% of the smaller dimension

    beginShape();
    for (let i = 0; i < oscWaveformLength; i++) {
      // map current index to an angle (from 0 to TWO_PI)
      const angle = map(i, 0, oscWaveformLength, 0, TWO_PI);
      
      // use waveform value to adjust radius (this can be scaled for stronger/weaker effect)
      const radius = baseRadius + oscWaveform[i] * 100; // 100 is a scaling factor, adjust as needed

      const x = centerX + radius * cos(angle);
      const y = centerY + radius * sin(angle);
      vertex(x, y);
    }
    endShape(CLOSE); // Use CLOSE to close the shape and connect the last point to the first
  }
}

function touchStarted() {
  if (getAudioContext().state !=='running') {
    getAudioContext().resume();
  }
}
