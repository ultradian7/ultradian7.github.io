    import * as utils from "./utils.js";
    import { KnobComponent } from "./knob-component.js";
    import { BarsComponent, OptionSquareComponent } from "./bars-component.js";

    function createKeyMapping(values, whiteKeysOnlySetting) {
      let freqMapping = new Array(128).fill(null);

      if (whiteKeysOnlySetting) {
        const whiteKeys = utils.generateWhiteKeys();
        whiteKeys.forEach(
          (
            keyIndex,
            valueIndex // Map values to white keys directly. If values run out, repeat them from the start.
          ) => {
            freqMapping[keyIndex] = values[valueIndex % values.length];
          }
        );

        // Fill in black keys by copying the frequency from the last white key
        freqMapping.forEach((val, index, arr) => {
          if (val === null) {
            arr[index] = arr[index - 1];
          } // Repeat the previous frequency
        });
      } // Not whiteKeysOnlySetting: Distribute the values across all 128 keys, repeating if necessary
      else {
        for (let i = 0; i < freqMapping.length; i++) {
          freqMapping[i] = values[i % values.length];
        }
      }

      if (freqMapping.length > 128) {
        freqMapping = freqMapping.slice(0, 128);
      }

      return freqMapping;
    }

    function hslToHex(h, s, l) {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, "0"); // Convert to Hex and pad with zeroes
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    }

    function createKeyMappingExplorer(keyMapping, whiteKeysOnlySetting) {
      const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      let html = `<div style="overflow-x: auto; width: 100%;"><table class="key-mapping-explorer" id="keyMappingExplorer"><tr><th>#</th>`;
    
      // Create the header row with note names
      for (let i = 0; i < noteNames.length; i++) {
        const noteName = noteNames[i];
        const isBlackKey = ["C#", "D#", "F#", "G#", "A#"].includes(noteName);
    
        if (whiteKeysOnlySetting && isBlackKey) {
          continue;
        } // Skip black keys if whiteKeysOnlySetting is true
    
        const bgColor = isBlackKey ? "black" : "white";
        const textColor = isBlackKey ? "white" : "black"; // Ensure text is readable
        html += `<th style="background-color: ${bgColor}; color: ${textColor};">${noteName}</th>`;
      }
      html += `</tr>`;
    
      // Create each full row for the table
      for (let i = 0; i < 10; i++) {
        const hue = (i * 36) % 360; // Calculate hue value for each octave (36 degrees apart for 10 colors)
        const octaveColor = hslToHex(hue, 100, 50); // Convert HSL to Hex
        html += `<tr><td style="background-color: ${octaveColor}; color: black;">${i}</td>`;
        for (let j = 0; j < 12; j++) {
          const noteName = noteNames[j];
          const isBlackKey = ["C#", "D#", "F#", "G#", "A#"].includes(noteName);
    
          if (whiteKeysOnlySetting && isBlackKey) {
            continue;
          } // Skip black keys if whiteKeysOnlySetting is true
    
          let index = i * 12 + j; // Calculate index for the keyMapping array
          let frequency = keyMapping[index]; // Retrieve the frequency using the index
          
          // Set base color and gradient
          const baseColor = isBlackKey ? "#000000" : "#ffffff";
          const gradient = `radial-gradient(circle at center, ${baseColor}, ${octaveColor})`;
          
          // Apply gradient to cell
          html += `<td style="background: ${gradient}; color: ${isBlackKey ? 'white' : 'black'}">${frequency}</td>`;
        }
        html += `</tr>`;
      }
    
      // Create the additional row for the remaining 8 notes
      const hue = (10 * 36) % 360; // Hue for the 11th row
      const octaveColor = hslToHex(hue, 100, 50);
      html += `<tr><td style="background-color: ${octaveColor}; color: black;">10</td>`;
      for (let j = 0; j < 8; j++) {
        const noteName = noteNames[j];
        const isBlackKey = ["C#", "D#", "F#", "G#", "A#"].includes(noteName);
    
        if (whiteKeysOnlySetting && isBlackKey) {
          continue;
        } // Skip black keys if whiteKeysOnlySetting is true
    
        let index = 120 + j; // Calculate index for the keyMapping array
        let frequency = keyMapping[index]; // Retrieve the frequency using the index
        
        // Set base color and gradient
        const baseColor = isBlackKey ? "#000000" : "#ffffff";
        const gradient = `radial-gradient(circle at center, ${baseColor}, ${octaveColor})`;
        
        // Apply gradient to cell
        html += `<td style="background: ${gradient}; color: ${isBlackKey ? 'white' : 'black'}">${frequency}</td>`;
      }
    
      // Add empty cells for the remaining columns if whiteKeysOnlySetting is false
      if (!whiteKeysOnlySetting) {
        for (let j = 8; j < 12; j++) {
          html += `<td></td>`;
        }
      }
      html += `</tr>`;
    
      return html;
    }
    
    
    

    function saveDocument(filename, text) {
      const element = document.createElement("a");
      const blob = new Blob([text], { type: "text/plain" });
      element.href = URL.createObjectURL(blob);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    function createMultiplyHTML(baseValues, multipliers, html) {
      multipliers = utils.removeItemsFromArray(multipliers, [0, 1]);

      // Top row
      html += `<tr><th>#</th>`;
      baseValues.forEach((value) => {
        value = value % 1 === 0 ? value.toString() : value.toFixed(2);
        html += `<th>${value}</th>`;
      });
      html += `</tr>`;

      // Rows
      multipliers.forEach((multiplier) => {
        multiplier = multiplier % 1 === 0 ? multiplier.toString() : multiplier.toFixed(4);
        html += `<tr><td>${multiplier}</td>`;
        baseValues.forEach((value) => {
          html += `<td></td>`;
        });
        html += `</tr>`;
      });
      return html;
    }

    function createKeyMappingTable(keyMapping, whiteKeysOnlySetting) {
      const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const whiteKeys = new Set(utils.generateWhiteKeys()); // Use a Set for efficient look-up
      let title = "Key Mapping";
      if (whiteKeysOnlySetting) {
        title = title + " [White Keys Only]";
      }

      let html = `<span class="textarea-title">${title}</span><div style="overflow-x: auto; width: 100%;"><table class="key-mapping-list-table"><tr><th>Index</th><th>Note</th><th>Frequency</th><th>Key Colour</th></tr>`;

      for (let i = 0; i < 128; i++) {
        let octave = Math.floor(i / 12); // Calculate the current octave based on the index
        let currentNoteName = `${noteNames[i % 12]}${octave - 2}`; // Note name with octave
        let frequency = keyMapping[i] % 1 === 0 ? keyMapping[i].toString() : keyMapping[i].toFixed(2); // Retrieve the frequency using the index
        let keyColour = whiteKeys.has(i) ? "white" : "black"; // Determine the color based on whether it's a white key
        let textColour = "white";
        const indexColour = "#543E74";
        const noteNameColour = "#7455A0";
        const freqColour = "#81A055";

        if (whiteKeysOnlySetting && !whiteKeys.has(i)) {
          textColour = "gray";
        }
        // Apply styles directly to the row
        html += `<tr><td>${i}</td><td  >${currentNoteName}</td><td style="color: ${textColour}; ">${frequency}</td><td style="background-color: ${keyColour};"></td></tr>`;
      }

      html += `</table></div>`;
      return html;
    }

    function generateASCL(keyMapping, description) {
      const referenceNoteIndex = 0; // MIDI note 69 is A4
      const referenceFrequency = keyMapping[0];
      const referenceNote = 0;
      const referenceOctave = 3;
      const baseFrequency = keyMapping[referenceNoteIndex];
      const cents = keyMapping.map((frequency) => 1200 * Math.log2(frequency / baseFrequency));

      let asclContent = `!\n${description}\n!\n${keyMapping.length}\n!\n`;

      for (let i = 0; i < keyMapping.length; i++) {
        asclContent += `${cents[i].toFixed(6)} ! ${keyMapping[i]}hz\n`;
      }

      asclContent += `!\n!@ABL REFERENCE_PITCH ${referenceOctave} ${referenceNote} ${referenceFrequency}\n!@ABL NOTE_NAMES `;

      for (let i = 0; i < keyMapping.length; i++) {
        asclContent += `${keyMapping[i]} `;
      }
      asclContent += `\n`;

      saveDocument("ValueSynthTuning.ascl", asclContent);
    }

    function calculateSaturation(value, closestValue, range) {
      const maxDifference = range.max - range.min;
      const difference = Math.abs(value - closestValue);
      return 100 * (1 - difference / maxDifference); // Saturation decreases as the difference increases
    }

    function highlightMatchedResults(value, cell, valueBankRanges) {
      if (utils.checkValueWithinRange(value, valueBankRanges)) {
        const closestValue = utils.findClosestValue(
          value,
          valueBankRanges.map((range) => (range.min + range.max) / 2)
        );
        const range = valueBankRanges.find((range) => value >= range.min && value <= range.max);
        const saturation = calculateSaturation(value, closestValue, range);
        cell.style.backgroundColor = `hsl(45, ${saturation}%, 50%)`; // Gold color with variable saturation
      } else {
        cell.style.backgroundColor = "";
      }
    }

    function handleToggleButtonState(target, bool, colour, bgColour) {
      if (bool) {
        target.style.backgroundColor = "#ccc";
        target.style.color = "#000";
      } else {
        target.style.backgroundColor = "";
        target.style.color = "";
      }
    }

    function updateValuesListTextareaLabel(target, values) {
      const targetName = target.id.replace(/Label/, "");
      const labeTitle = utils.camelCaseToStandard(targetName);
      target.textContent = `${labeTitle} [${values.length}]`;
    }

    function mapValuesToTextarea(target, values, fract) {
      target.value = values.map((value) => (value % 1 === 0 ? value.toString() : value.toFixed(fract))).join(" ");
    }

    function generateETFrequencies(baseFrequency, baseNote, divisions) {
      const frequencies = new Array(128);
      const ratio = Math.pow(2, 1 / divisions); // Ratio between two consecutive notes in X-ET
    
      for (let i = 0; i < 128; i++) {
        frequencies[i] = baseFrequency * Math.pow(ratio, i - baseNote);
        frequencies[i] = parseFloat(frequencies[i].toFixed(2)); // Round to 2 decimal places
      }
    
      return frequencies;
    }
    class ValueSynthView extends HTMLElement {
      constructor(patchConnection) {
        super();
        this.patchConnection = patchConnection;
        this.classList.add("value-synth-element");

        this.valueBank = [
          10.8, 13.8, 14.3, 19.7, 20.8, 27.3, 27.7, 31.32, 31.7, 32, 33, 33.8, 35, 38, 39, 40, 45, 46.98, 55, 59.9, 62.64,
          63, 70, 70.47, 73.6, 80, 83, 90, 98.4, 105, 108, 110, 111, 120, 126.22, 136.1, 140.25, 141.27, 144.72, 147,
          147.85, 160, 172.06, 174, 183.58, 187.61, 194.18, 194.71, 197, 207.36, 210.42, 211.44, 221.23, 250, 256, 264, 273,
          285, 288, 293, 315, 315.8, 320, 341, 342, 345, 360, 372, 384, 396, 402, 404, 408, 410, 413, 416, 417, 420.82, 440,
          441, 445, 448, 464, 480, 492.8, 526, 528, 586, 620, 630, 639, 685, 728, 741, 784, 852, 880, 963, 984, 1000, 1033,
          1052, 1074, 1185, 1296, 1417, 1820, 2025, 2041, 2675, 3240, 3835, 3975, 4049, 4129, 4173, 4221, 4280, 4444, 4671,
          4840, 5201, 5284, 5907, 6051, 8000, 9999, 12000,
        ];
        this.colundiValues = [
          10.8, 13.8, 14.3, 19.7, 20.8, 27.3, 27.7, 31.32, 31.7, 32, 33, 33.8, 35, 38, 39, 40, 45, 46.98, 55, 59.9, 62.64,
          63, 70, 70.47, 73.6, 80, 83, 90, 98.4, 105, 108, 110, 111, 120, 126.22, 136.1, 140.25, 141.27, 144.72, 147,
          147.85, 160, 172.06, 174, 183.58, 187.61, 194.18, 194.71, 197, 207.36, 210.42, 211.44, 221.23, 250, 256, 264, 273,
          285, 288, 293, 315, 315.8, 320, 341, 342, 345, 360, 372, 384, 396, 402, 404, 408, 410, 413, 416, 417, 420.82, 440,
          441, 445, 448, 464, 480, 492.8, 526, 528, 586, 620, 630, 639, 685, 728, 741, 784, 852, 880, 963, 984, 1000, 1033,
          1052, 1074, 1185, 1296, 1417, 1820, 2025, 2041, 2675, 3240, 3835, 3975, 4049, 4129, 4173, 4221, 4280, 4444, 4671,
          4840, 5201, 5284, 5907, 6051, 8000, 9999, 12000,
        ];
        this.noteFrequencies = this.valueBank;
        this.harmonicRatios = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        this.valueBankRanges = utils.calcTargetValuesRanges(this.valueBank);
        this.baseValues = [];
        this.multipliers = [];
        this.keyMapping = this.valueBank; //createKeyMapping(valueBank, false)
        this.harmonicAmplitudes = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.envelopeMap = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.expoDecayRate = 0;
        //this.phaseOffsets = [];

        this.whiteKeysOnlySetting = false;
        this.sortNoteFrequenciesSetting = true;
        this.uniqueNoteFrequenciesSetting = true;
        this.showValueMatchesSetting = true;
        this.showHarmonicMatchesSetting = true;
        this.noteFreqToWaveCanvasSetting = false;
        this.envelope1SustainIsEnabledSetting = true;
        this.envelope2SustainIsEnabledSetting = true;
        this.envelope3SustainIsEnabledSetting = true;

        this.valueBankVisible = false;
        this.valueExplorerVisible = false;
        this.keyMappingExplorerVisible = false;
        this.keyMappingTableVisible = false;
        this.harmonicTableVisible = false;
        this.waveCanvasVisible = true;

        this.settings = {
          whiteKeysOnly: false,
          sortNoteFrequencies: true,
          uniqueNoteFrequencies: true,
          showValueMatches: true,
          showHarmonicMatches: true,
          noteFreqToFilter: true,
          noteFreqToWaveCanvas: false,
          sustainIsEnabled: true,
        };

        this.isVisible = {
          valueBank: false,
          valueExplorer: true,
          keyMappingExplorer: false,
          keyMappingTable: false,
          harmonicTable: false,
          waveCanvas: true,
        };

        this.waveCanvasFreq = 1;
        this.waveCanvasAmp = 60;


        this.render();

        //this.querySelector("#harmonic-sliders-column").innerHTML = createHarmonicSlidersHTML(this.harmonicAmplitudes, this.harmonicRatios, this.envelopeMap);
      }

      render() {
        this.innerHTML = /*html*/ `
          <style>
            * {
              font-family: Avenir, "Avenir Next LT Pro", Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif;
            }

            .main-container {
              display: flex;
              flex-direction: column;
              align-content: center;
              gap: 0.5rem;
              padding: 0;
              margin: 0;
              width: calc(100vw - 0.5rem);
              height: auto;
              overflow: auto;
              background: #352749;
            }

            .header-container {
              display: flex;
              justify-content: space-between;
              padding-top: 0;
              padding-bottom: 0.5rem;
              padding-right: 0.5rem;
              width: 100%;
              background-color: #352749;
              background: radial-gradient(circle at center, #543e74, #3b2858);
              z-index: 1000;
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              margin: 0;
            }

            h1 {
              align-self: center;
              margin-top: 0.25rem;
              margin-left: 1rem;
            }

            #noteFrequenciesContainer {
            }

            button,
            .visibility-dropdown {
              border-radius: 6px;
              font-size: 12px;
            }

            .dropdown-container {
              margin-top: 0.25rem;
              width: 100%;
              display: flex;
              justify-content: center;
              flex: 1;
            }

            .visibility-dropdown {
              padding: 0.25rem;
              padding-top: 0.16182rem;
              padding-bottom: 0.16182rem;
              background: #543e74;
              color: white;
              border: 1px solid gray;
              cursor: pointer;
              appearance: none; /* Remove default styling */
            }

            .visibility-dropdown option {
              background-color: #543e74;
              color: white;
            }

            .value-synth-element {
              display: flex;
              flex-direction: row;
              gap: 0.5rem;
              padding: 0.25rem;
              padding-top: 1.5rem;
              background: #352749;
              color: white;
              font-size: 12px;
              user-select: none;
              border-radius: 5px;
              margin: 0;
              max-width: 100%;
            }

            .bars-container {
              border-radius: 10px;
              padding: 10px;
              background: black;
              max-width: 100%;
              max-height: 100%;
            }

            .controls-column {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 5px;
              margin-bottom: 10px;
              border-radius: 10px;
              padding: 5px;
              font-size: 12px;
              width: 100%;
              background: radial-gradient(circle at center, #543e74, #3b2858);
              box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.4), -3px -3px 10px rgba(255, 255, 255, 0.1);
            }

            .bars-column {
              background: radial-gradient(circle at center, #543e74, #3b2858);
              box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.4), -3px -3px 10px rgba(255, 255, 255, 0.1);
              width: 430px;
            }

            .controls-container {
              display: flex;
              margin-bottom: 10px;
              align-items: row;
            }

            .button-column {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 5px;
              border: none;
              font-weight: 600;
            }

            .header-buttons {
              margin-top: 0.5rem;
            }

            .harmonic-table-inner-container {
              overflow-x: auto;
              width: 100%;
              resize: horizontal;
            }

            .knob-row-container {
              height: auto;
              width: 100%;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-around;
              gap: 0.25rem;
              margin-bottom: 10px;
              border-radius: 10px;
              padding: 5px;
              font-size: 12px;
              background: radial-gradient(circle at center, #543e74, #3b2858);
              box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.4), -3px -3px 10px rgba(255, 255, 255, 0.1);
            }

            .harmonic-slider-container {
              display: flex;
              flex-direction: column;
              gap: 5px;
              align-items: center;
            }
            .slider-container {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 5px;
            }
            .left-column,
            .right-column {
              padding-right: 0.5rem;
              overflow-x: hidden;
              max-height: calc(100vh - 4rem); /* Adjust height to account for header */
              max-width: 100%;
            }

            .right-column {
              flex: 1;
              overflow-x: auto;
            }

            *::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            *::-webkit-scrollbar-track {
              background: #543e74;
              border-radius: 4px;
            }

            *::-webkit-scrollbar-thumb {
              background: #7455a0;
              border-radius: 4px;
            }

            *::-webkit-scrollbar-thumb:hover {
              background: #8563b0;
            }
            .slider-title {
              width: 110px;
              font-size: 12px;
              text-align: right;
            }
            .slider-value-textarea,
            .envelope-map-textarea {
              width: 80px;
              height: 20px;
              resize: none;
              font-size: 12px;
              background: inherit;
              color: white;
              border: none;
              user-select: contain;
            }
            .envelope-map-textarea {
              width: 40px;
              font-size: 12px;
            }
            .textarea-title {
              font-size: 12px;
              text-align: left;
            }

            .textarea-title,
            .label-button-container {
              margin-bottom: 0.25em;
            }

            .label-button-container {
              display: flex;
              align-items: center;
              flex-direction: row;
              justify-content: left;
              gap: 10px;
            }

            .control-slider {
              background-color: purple;
              width: 183px;
              height: 7px;
              cursor: grab;
            }
            .button-row {
              gap: 0.5rem;
              display: flex;
            }
            .toggle-button {
              background: black;
              color: white;
              border: 1px solid gray;
              padding: 2px;
              font-size: 11px;
              white-space: nowrap;
              display: inline-block;
              max-width: 100%;
              cursor: pointer;
            }
            .values-list-textarea {
              width: 100%;
              height: 100px;
              font-size: 12px;
              background: black;
              color: white;
              border-radius: 6px;
              user-select: contain;
              resize: both;
              padding: 3px;
              font-family: "Courier", sans-serif;
              min-height: 1rem;
              min-width: 288px;
            }

            #harmonicRatiosTextarea {
              margin-bottom: 10px;
              height: 3em;
            }

            #numberGeneratorTextarea {
              margin-bottom: 10px;
              height: 25px;
            }

            .harmonic-table th,
            .harmonic-table td {
              width: 60px;
              height: 30px;
              text-align: center;
              border: 1px solid gray;
            }

            .key-mapping-list-table th {
              background-color: #81a055; /*green*/
            }

            .key-mapping-list-table td:nth-child(1) {
              background-color: #7455a0; /*purple*/
            }

            .key-mapping-list-table td:nth-child(2) {
              background-color: #694e92; /*purple darker*/
            }

            .key-mapping-list-table td:nth-child(2) {
              background-color: #543e74; /*purple darkerer*/
            }

            .key-mapping-list-table th {
              background-color: #81a055; /*green*/
            }

            .harmonic-table th:not(:first-child) {
              background-color: #81a055; /*green*/
            }

            .harmonic-table tr:not(:first-child) td:first-child {
              background-color: #7455a0; /*purple*/
            }

            .value-explorer,
            .harmonic-table,
            .key-mapping-list-table,
            .key-mapping-explorer {
              background: radial-gradient(circle at center, #543e74, #3b2858);
              display: block;
              table-layout: fixed;
              font-size: 12px;
              font-weight: bold;
              margin-top: 5px;
              cursor: crosshair;
              border-collapse: separate; /* Ensures the border radius is visible */
              border-radius: 10px;
              overflow:auto;
            }

            .key-mapping-explorer tr td {
              border: 0;
            }
            .key-mapping-explorer tr:not(:first-child) td:not(:first-child) {
              background: radial-gradient(circle at center, #543e74, #000);
            }
            .key-mapping-explorer th {
              font-weight: 600;
              font-size: 18px;
            }

            .key-mapping-explorer tr td:first-child {
              font-weight: 600;
              font-size: 18px;
            }

            .harmonic-table {
              width: auto;
              min-width: 100%;
            }

            .key-mapping-list-table {
              height: 600px;
              width: 250px;
              color: white;
            }
            .wave-canvas-container {
              margin-bottom: 15px;
              padding: 5px;
              width: auto;
              height: 240px;
              font-size: 11px;
              background: #543e74;
              border-radius: 10px;
              resize: both;
              overflow: auto;
              max-width: 600px;
              min-width: 300px;
              min-height: 160px;
              background: radial-gradient(circle at center, #543e74, #3b2858);
              box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.4), -3px -3px 10px rgba(255, 255, 255, 0.1);
            }

            .key-mapping-list-table th,
            .key-mapping-list-table td {
              text-align: right;
              border: 1px solid gray;
              padding: 5px;
            }
            .value-explorer th,
            .value-explorer td,
            .key-mapping-explorer th,
            .key-mapping-explorer td {
              border-radius: 45%;
              text-align: center;
              border: 1px solid gray;
              min-width: 64px;
              height: 64px;
              width: 64px;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            #positionToggleButton, #noteFreqToWaveCanvasSettingToggleButton {

              width: 1.5rem;
              min-width: 1.5rem;
            }

            [contenteditable="true"]:focus {
              outline: 1px solid #555;
            }
            /* Target the top row headers after the first header cell */
            .value-explorer th:not(:first-child) {
              background-color: #81a055; /*green*/
            }

            /* Target the first cell in each row, excluding the header row */
            .value-explorer tr:not(:first-child) td:first-child {
              background-color: #7455a0; /*purple*/
            }

            label {
              display: block;
              color: #fff;
              font-size: 12px;
              font-weight: bold;
            }

            .sustain-column {
              align-self: center;
              align-items: center;
            }

            .sustain-button {
              height: 2.25rem;
              width: 2.25rem;
              margin-bottom: 0.25rem;
              font-size: 1.25rem;
              font-weight: 600;
              color: rgba(0,0,0,0.7);
              border: none;
              border-radius: 13%;
              background: radial-gradient(circle at center, #fcd658, #c3a737);
              cursor: pointer;
              transition: background 0.3s;
            }

            .sustain-button:active {
              background: radial-gradient(circle at center, #c3a737, #fcd658);
              box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.2);
            }

            canvas {
              width: 100%;
              height: calc(100% - 2rem);
              max-width: 100%;
              max-height: calc(100% - 2rem);
              margin-bottom: 5px;
              border-radius: 10px;
              overflow: auto;
              resize: both;
            }

            #waveCanvasFreqSlider,
            #waveCanvasAmpSlider {
              min-width: 50px;
              max-width: 200x;
            }

            #ASRContainer {
              flex-direction:column;
              width: 100%;
              padding-left: 1rem;
              padding-right: 1rem;
            }

            .envelope-row {
              display: flex;
              flex-direction: row;
              width: 100%;
              justify-content: space-between;
          }


            #harmonicTableContainer {
              margin-bottom: 15px;
              display: none;
            }

            #keyMappingExplorerContainer {
              display: none;
              margin-bottom: 15px;
            }

            #valueBankContainer {
              display: none;
            }

            #valueBankTextarea {
              margin-bottom: 10px;
              height: 140px;
            }

            #valueExplorerContainer {
              display: none;
              border: 0;
            }

            #baseValuesTextarea,
            #multipliersTextarea {
              height: 50px;
            }

            #envelope1SustainSettingToggleButton {
              background: radial-gradient(circle at center, #85a357, #6e8a47);
              box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.4), -2px -2px 5px rgba(255, 255, 255, 0.2);
            }

            #envelope1SustainSettingToggleButton:active {
              background: radial-gradient(circle at center, #6e8a47, #85a357);
              box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.2);
            }

            #envelope2SustainSettingToggleButton {
              background: radial-gradient(circle at center, #fcd658, #c3a737);
              box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.4), -2px -2px 5px rgba(255, 255, 255, 0.2);
            }

            #envelope2SustainSettingToggleButton:active {
              background: radial-gradient(circle at center, #c3a737, #fcd658);
              box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.2);
            }

            #envelope3SustainSettingToggleButton {
              background: radial-gradient(circle at center, #dd4d37, #b43c2d);
              box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.4), -2px -2px 5px rgba(255, 255, 255, 0.2);
            }

            #envelope3SustainSettingToggleButton:active {
              background: radial-gradient(circle at center, #b43c2d, #dd4d37);
              box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.2);
            }


          </style>

          <div class="main-container">
            <div class="header-container">
              <h1>freqMajor</h1>
              <div class="dropdown-container">
                <select class="visibility-dropdown" id="visibilityDropdown">
                  <option value="" disabled selected hidden>Components ˅</option>
                  <option value="masterVolumeContainer">Gain / Modulation</option>
                  <option value="ASRContainer">Envelope</option>
                  <option value="noiseContainer">Noise</option>
                  <option value="noteFreqsContainer">Note Frequencies</option>
                  <option value="harmonicRatiosContainer">Harmonic Ratios</option>
                  <option value="barsContainer">Harmonic Amplitudes</option>
                  <option value="harmonicTableContainer">Harmonic Table</option>
                  <option value="keyMappingTableContainer">Key Mapping</option>
                  <option value="waveCanvasContainer">Waveform</option>
                  <option value="keyMappingExplorerContainer">Controller</option>
                  <option value="valueBankContainer">Value Bank</option>
                  <option value="valueExplorerContainer">Value Explorer</option>
                  <option value="commandContainer">Command</option>
                </select>
              </div>
            </div>

            <div class="value-synth-element">
              <div class="left-column">
                <div class="knob-row-container" id="masterVolumeContainer">
                  <knob-component id="masterVolumeKnob" name="Master Gain" min="-85" max="6" init-value="0" unit="dB" colour="#ce690a"></knob-component>
                  <knob-component id="harmonicExponentAmplitudeKnob" name="Exp Mod" min="0" max="1" init-value="0" colour="#527a03"></knob-component>
                  <knob-component id="harmonicMatchAmplitudeKnob" name="Magic Mod" min="0" max="3" init-value="0" colour="#852596"></knob-component>
                  <knob-component id="ringModVolumeKnob" name="R.Mod Gain" min="-85" max="12" init-value="-85" colour="#87bcba"></knob-component>
                  <knob-component id="ringModFrequencyKnob" name="R.Mod Freq" min="0" max="12000" init-value="0" colour="#87bcba"></knob-component>
                </div>

                <div class="knob-row-container" id="ASRContainer">
                  <div class="envelope-row">
                    <knob-component id="envelope1AttackPeriodKnob" name="A Attack" min="0" max="20000" unit="ms" colour="#85A357"></knob-component>
                    <knob-component id="envelope1DecayPeriodKnob" name="A Decay" min="0" max="20000" unit="ms" colour="#85A357"></knob-component>
                    <knob-component id="envelope1SustainLevelKnob" name="A Sustain" min="0" max="100  " colour="#85A357"></knob-component>
                    <knob-component id="envelope1ReleasePeriodKnob" name="A Release" min="0" max="40000" unit="ms" colour="#85A357"></knob-component>
                  </div>
                  <div class="envelope-row">
                    <knob-component id="envelope2AttackPeriodKnob" name="B Attack" min="0" max="20000" unit="ms" colour="#fcd658"></knob-component>
                    <knob-component id="envelope2DecayPeriodKnob" name="B Decay" min="0" max="20000" unit="ms" colour="#fcd658"></knob-component>
                    <knob-component id="envelope2SustainLevelKnob" name="B Sustain" min="0" max="1" colour="#fcd658"></knob-component>
                    <knob-component id="envelope2ReleasePeriodKnob" name="B Release" min="0" max="40000" unit="ms" colour="#fcd658"></knob-component>
                  </div>
                  <div class="envelope-row">
                    <knob-component id="envelope3AttackPeriodKnob" name="C Attack" min="0" max="20000" unit="ms" colour="#dd4d37"></knob-component>
                    <knob-component id="envelope3DecayPeriodKnob" name="C Decay" min="0" max="20000" unit="ms" colour="#dd4d37"></knob-component>
                    <knob-component id="envelope3SustainLevelKnob" name="C Sustain" min="0" max="1" colour="#dd4d37"></knob-component>
                    <knob-component id="envelope3ReleasePeriodKnob" name="C Release" min="0" max="40000" unit="ms" colour="#dd4d37"></knob-component>
                  </div>

       
                </div>

                <div class="knob-row-container" id="noiseContainer">
                  <knob-component id="noiseVolumeKnob" name="Noise Gain" min="-85" max="12" unit="dB" colour="#b27815"></knob-component>
                  <knob-component id="noiseFilterModeKnob" name="Filter Mode" min="0" max="2" colour="#b27815"></knob-component>
                  <knob-component id="noiseFilterFrequencyKnob" name="Filter Freq" min="0" max="24000" unit="hz" colour="#b27815"></knob-component>
                  <knob-component id="noiseFilterQKnob" name="Filter Q" min="0" max="200" colour="#b27815"></knob-component>
                </div>                    

                <section class="controls-column" id="noteFreqsContainer">
                  <div class="label-button-container">
                    <label for="noteFrequenciesTextarea" id="noteFrequenciesLabel">Note Frequencies</label>
                    <select id="noteFrequenciesOptions" class="visibility-dropdown">
                      <option value="" disabled selected hidden>Note Options ˅</option> 
                      <option value="sort">Sort Ascending</option>
                      <option value="unique">Omit Duplicates</option>
                      <option value="whiteKeysOnly">White Keys Only</option>
                      <option value="exportASCL">Export .ascl</option>
                    </select>
                    <select id="generateNotesSelect" class="visibility-dropdown">
                      <option value="" disabled selected hidden>Generate Notes ˅</option> 
                      <option value="equalTemperament">Equal Temperament</option>
                      <option value="colundi">Colundi Values</option>
                    </select>
                  </div>
                  <textarea class="values-list-textarea" id="noteFrequenciesTextarea"></textarea>
                </section>

                <section class="controls-column" id="harmonicRatiosContainer">
                  <div class="label-button-container">
                    <label for="harmonicRatiosTextarea" id="harmonicRatiosLabel">Harmonic Ratios</label>
                  </div>
                  <textarea class="values-list-textarea" id="harmonicRatiosTextarea"></textarea>
                </section>

                <section class="controls-column" id="commandContainer">
                  <label for="numberGeneratorTextarea" class="textarea-title">Command</label>
                  <textarea class="values-list-textarea" id="numberGeneratorTextarea"></textarea>
                </section>

                <section class="controls-column" id="valueBankContainer">
                  <div class="label-button-container">
                    <label for="valueBankTextarea" class="textarea-title" id="valueBankLabel">Value Bank</label>
                    <button id="showValueMatchesSettingToggleButton" class="toggle-button">Show Matches</button>
                  </div>
                  <textarea class="values-list-textarea" id="valueBankTextarea"></textarea>
                </section>

                <div id="keyMappingTableContainer"></div>
              </div>

              <div class="right-column">
                <div class="wave-canvas-container" id="waveCanvasContainer">                    
                  <canvas id="waveCanvas"></canvas>
                  <div class="slider-container">
                  <button class="toggle-button" id="positionToggleButton"><</button>
                    <button class="toggle-button" id="noteFreqToWaveCanvasSettingToggleButton">☻</button>
                    <span class="slider-title" for="waveCanvasFreqSlider">f</span>
                    <input type="range" class="control-slider" id="waveCanvasFreqSlider" min="0" max="12000" value="1" step="0.01">
                    <textarea class="slider-value-textarea" id="waveCanvasFreqValue">1</textarea>
                    <span class="slider-title" for="waveCanvasAmpSlider">a</span>
                    <input type="range" class="control-slider" id="waveCanvasAmpSlider" min="0" max="100" value="60" step="0.01">
                    <textarea class="slider-value-textarea" id="waveCanvasAmpValue">60</textarea>
                  </div>
                </div>

                <div class="controls-column bars-column" id="barsContainer"> 
                  <bars-component class="bars-container" id="bars" bar-width="20" bar-gap="5" bar-colour="#5A5530"></bars-component>
                </div>

                <div id="harmonicTableContainer"></div>
                <div id="keyMappingExplorerContainer"></div>                    

                <div id="valueExplorerContainer">
                  <label for="baseValuesTextarea" class="textarea-title">Base Values</label>
                  <textarea class="values-list-textarea" id="baseValuesTextarea"></textarea>
                  <label for="multipliersTextarea" class="textarea-title">Multipliers</label>
                  <textarea class="values-list-textarea" id="multipliersTextarea"></textarea>
                  <div id="valueExplorer"></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      manageEventListeners(action) {
        // Function to decide which event method to call
        const eventMethod = action === "add" ? "addEventListener" : "removeEventListener";

        const noteEventTypeStrings = ["mouseup", "mousedown", "touchstart", "touchend"];

      
        for (const knob of this.querySelectorAll('[id$="Knob"]')) {
          knob[eventMethod]("value-change", (event) => this.handleKnobEvent(event));
        }

        const bars = this.querySelector("#bars");
        bars[eventMethod]("bar-change", (event) => {
          this.handleHarmonicAmplitudeChange(event.detail.index, event.detail.value);
        });
        bars[eventMethod]("parameter-change", (event) => {
          this.handleEnvelopeMapChange(event.detail.index, event.detail.value);
        });

        const valueExplorer = this.querySelector("#valueExplorer");
        valueExplorer[eventMethod]("click", (event) => this.handleValueExplorerClick(event));
        for (const eventType of noteEventTypeStrings) {
          valueExplorer[eventMethod](eventType, (event) => this.handleValueExplorerNote(event));
        }

        const keyMappingExplorer = this.querySelector("#keyMappingExplorerContainer");
        for (const eventType of noteEventTypeStrings) {
          keyMappingExplorer[eventMethod](eventType, (event) => this.handleValueExplorerNote(event));
        }

        const keyMappingContainer = this.querySelector("#keyMappingTableContainer");
        for (const eventType of noteEventTypeStrings) {
          keyMappingContainer[eventMethod](eventType, (event) => this.handleKeyMappingNote(event));
        }

        for (const slider of this.querySelectorAll(".control-slider")) {
          slider[eventMethod]("input", (event) => this.handleSliderEvent(event));
        }

        for (const visibleToggleButton of this.querySelectorAll('[id$="VisibleToggleButton"]')) {
          visibleToggleButton[eventMethod]("click", (event) => this.toggleContainerVisible(event));
        }

        for (const settingToggleButton of this.querySelectorAll('[id$="SettingToggleButton"]')) {
          settingToggleButton[eventMethod]("click", (event) => this.handleBoolStateAndToggleButton(event));
        }

        for (const valuesListTextarea of this.querySelectorAll(".values-list-textarea")) {
          valuesListTextarea[eventMethod]("blur", (event) => this.handleValuesListTextarea(event));
        }

        for (const sliderValueTextarea of this.querySelectorAll(".slider-value-textarea")) {
          sliderValueTextarea[eventMethod]("blur", (event) => this.handleSliderTextarea(event));
          sliderValueTextarea[eventMethod]("focus", () => sliderValueTextarea.select());
        }

        for (const textarea of this.querySelectorAll('[class$="textarea"]')) {
          textarea[eventMethod]("keypress", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.target.blur();
            }
          });
        }

        this.patchConnection[`${action}EndpointListener`]("playedNoteOut", (value) =>
          this.handleNotePlayedFrequency(value)
        );

        this.patchConnection[`${action}AllParameterListener`]((event) => this.handleParamCallback(event));

        this.patchConnection[`${action}StoredStateValueListener`]((data) => this.storedStateCallback(data));

        const dropdown = this.querySelector("#visibilityDropdown");
        dropdown[eventMethod]("change", (event) => this.handleDropdownChange(event));

        const optionsDropdown = this.querySelector("#noteFrequenciesOptions");
        optionsDropdown[eventMethod]("change", (event) => this.handleOptionsChange(event));
        
        this.querySelector("#positionToggleButton")[eventMethod]("click", () => this.toggleWaveCanvasPosition());
        this.querySelector("#generateNotesSelect")[eventMethod]("click", (event) => this.handleGenerateNotesSelect(event));
        }

      storedStateCallback(data) {
        //console.log("storedStateCallback", data.key, data.value);
        if (typeof this[`update${utils.capitalizeFirstLetter(data.key)}`] === "function") {
          if (data.value != null) {
            this[`update${utils.capitalizeFirstLetter(data.key)}`](data.value);
          } else {
            this[`update${utils.capitalizeFirstLetter(data.key)}`](this[data.key]);
          }
        }

        if (data.key.match("Textarea") && data.value != null) {
          this.querySelector(`#${data.key}`).value = data.value;
        }

        if (data.key.match("Setting") && data.value != null) {
          this[data.key] = data.value;
          handleToggleButtonState(this.querySelector(`#${data.key}ToggleButton`), this[data.key]);
        }

        if (data.key.match("waveCanvas" && data.value != null)) {
          this[data.key] = data.value;
          this.querySelector(`#${data.key}Slider`).value = data.value;
          this.querySelector(`#${data.key}Value`).value = data.value;
        }

        if (data.key.match("envelopeMap") && data.value != null) {
          this.envelopeMap = data.value;
          for (let i = 0; i < this.envelopeMap.length; i++) {
            const bars = this.querySelector("#bars");
            bars.setOptionSquareValue(i, this.envelopeMap[i]);
          }
        }
      }

      /*updateHarmonicSliderLabels(ratios)
        {
            for (let i =  1; i < ratios.length; i++)
            {
                const ratioLabel = this.querySelector(`#harmonicAmplitudeSliderLabel${i + 1}`);
            
                if (ratioLabel.textContent != ratios[i])
                    {
                        ratioLabel.textContent = utils.formatNumber(ratios[i]);
                    }
            }
        }*/
            toggleWaveCanvasPosition() {
              const waveCanvasContainer = this.querySelector("#waveCanvasContainer");
              const waveCanvas = this.querySelector("#waveCanvas");
              const sliderContainer = this.querySelector(".slider-container");
              const positionToggleButton = this.querySelector("#positionToggleButton");
              const leftColumn = this.querySelector(".left-column");
              const rightColumn = this.querySelector(".right-column");
            
              if (leftColumn.contains(waveCanvasContainer)) {
                // Move to right column
                waveCanvasContainer.style.width = "432px";
                rightColumn.prepend(waveCanvasContainer);
                sliderContainer.insertBefore(positionToggleButton, sliderContainer.firstChild); // Place button as first child
                positionToggleButton.textContent = "<"; // Point left to indicate movement to the left
              } else {
                // Move to left column
                waveCanvasContainer.style.width = "300px";
                leftColumn.prepend(waveCanvasContainer);
                sliderContainer.appendChild(positionToggleButton); // Place button as last child
                positionToggleButton.textContent = ">"; // Point right to indicate movement to the right
              }
            }
            
            
            
            handleDropdownChange(event) {
              const selectedContainer = event.target.value;
          
              if (selectedContainer) {
                  const container = this.querySelector(`#${selectedContainer}`);
          
                  if (container) {
                      // Check if this is the first time the container is being toggled
                      const isInitiallyHidden = container.style.display === "";
          
                      // Toggle visibility based on initial state
                      if (isInitiallyHidden || container.style.display === "none") {
                          container.style.display = container.className === "knob-row-container" || container.id === "barsContainer" 
                              ? "flex" 
                              : "block";
                      } else {
                          container.style.display = "none";
                      }
          
                      // Update dropdown labels after setting visibility
                      this.updateDropdownLabels();
                  }
          
                  // Reset dropdown for consistent future use
                  event.target.value = "";
              }
          }
          
          updateDropdownLabels() {
            const dropdown = this.querySelector("#visibilityDropdown");
            const options = dropdown.options;
        
            for (let i = 1; i < options.length; i++) { // Start from 1 to skip the placeholder option
                const value = options[i].value;
                const container = this.querySelector(`#${value}`);
        
                // Add or remove the checkmark at the end based on visibility (if not "none")
                if (container && container.style.display !== "none") {
                    options[i].textContent = options[i].textContent.replace(" ✓", "") + " ✓";
                } else {
                    options[i].textContent = options[i].textContent.replace(" ✓", "");
                }
            }
        }
        


        handleOptionsChange(event) {
          const selectedOption = event.target.value;
          
          // Toggle the appropriate setting
          if (selectedOption === "sort") {
            this.sortNoteFrequenciesSetting = !this.sortNoteFrequenciesSetting;
          } else if (selectedOption === "unique") {
            this.uniqueNoteFrequenciesSetting = !this.uniqueNoteFrequenciesSetting;
          } else if (selectedOption === "whiteKeysOnly") {
            this.whiteKeysOnlySetting = !this.whiteKeysOnlySetting;
          } else if (selectedOption === "exportASCL") {
            generateASCL(this.keyMapping, "freqMajor exported note frequencies.");
          }
        
          // Update dropdown labels to reflect new state with checkmarks
          this.updateOptionsDropdownLabels();
          
          // Re-apply the note frequencies based on the updated settings
          this.updateNoteFrequencies(this.noteFrequencies);
          event.target.value = "";
        }
        
        // Method to update dropdown labels with a checkmark if the setting is active
        updateOptionsDropdownLabels() {
          const dropdown = this.querySelector("#noteFrequenciesOptions");
          const options = dropdown.options;
        
          // Clear previous checkmarks and apply based on the current settings
          options[1].textContent = this.sortNoteFrequenciesSetting ? "Sort Ascending ✓" : "Sort Ascending";
          options[2].textContent = this.uniqueNoteFrequenciesSetting ? "Omit Duplicates ✓" : "Omit Duplicates";
          options[3].textContent = this.whiteKeysOnlySetting ? "White Keys Only ✓" : "White Keys Only";
        }

        handleGenerateNotesSelect(event){
          const selectedOption = event.target.value;
          const textarea = this.querySelector("#noteFrequenciesTextarea");
          let freqs;
          
          if (selectedOption === "colundi") {
            freqs = this.colundiValues;
          } else if (selectedOption === "equalTemperament") {
            freqs = generateETFrequencies(440, 69, 12);
          }
          if (freqs) {
            this.updateNoteFrequencies(freqs)
            event.target.value = "";
          }

        }

      generateNumbers(input) {
        const targetMap = {
          n: "noteFrequencies",
          h: "harmonicRatios",
          m: "multipliers",
          b: "baseValues",
          v: "valueBank",
        };

        const [target, initialInput, incrementInput, iterationsInput, primeOnly] = input.split(" ");
        const targetKey = targetMap[target] || target; // Determine the actual target key using the targetMap
        const initialValues = this.parseValuesWithConstants(initialInput);
        const incrementValues = this.parseValuesWithConstants(incrementInput);
        const initial = initialValues.length > 0 ? initialValues[0] : NaN;
        const increment = incrementValues.length > 0 ? incrementValues[0] : NaN;
        const iterations = parseInt(iterationsInput, 10);

        if ([initial, increment, iterations].some(isNaN)) {
          console.error("Invalid input for number generation.");
          return;
        }

        const numbers = [];
        for (let i = 0; i < iterations; i++) {
          let value = initial + increment * i;
          if (primeOnly !== "p" || utils.isPrime(value)) {
            numbers.push(value);
          }
        }
        return [targetKey, numbers];
      }

      evaluateExpression(expression) {
        const constantsMap = {
          pi: Math.PI,
          e: Math.E,
          phi: (1 + Math.sqrt(5)) / 2,
          tau: 2 * Math.PI,
        };
        // Split the expression by '*' to find operands
        let parts = expression.split("*").map((part) => {
          // Convert constants or numbers to their numeric values
          return constantsMap[part] || parseFloat(part);
        });

        // Calculate the product of parts (if it's a multiplication expression)
        return parts.length === 2 ? parts[0] * parts[1] : parts[0];
      }

      parseValuesWithConstants(text) {
        const regex = /\b(\d+\/\d+|\d+(\.\d+)?|pi|e|phi|tau)(\*\d+(\.\d+)?)?\b/g;
        let results = [];

        let match;
        while ((match = regex.exec(text)) != null) {
          if (match[1].includes("/")) {
            const [numerator, denominator] = match[1].split("/").map(Number);
            results.push(numerator / denominator);
          } else {
            results.push(this.evaluateExpression(match[0]));
          }
        }

        return results.filter((value) => !isNaN(value));
      }

      updateValueBank(values) {
        this.valueBank = [...new Set(values)].sort((a, b) => a - b);
        mapValuesToTextarea(this.querySelector("#valueBankTextarea"), values, 2);
        this.valueBankRanges = utils.calcTargetValuesRanges(this.valueBank);
        this.patchConnection.sendEventOrValue("valueBankIn", this.valueBank);
      }

      handleEnvelopeMapChange(index, value) {
        //console.log(this.envelopeMap);
        this.envelopeMap[index] = value;
        this.patchConnection.sendEventOrValue("envelopeMapIn", this.envelopeMap);
        this.patchConnection.sendStoredStateValue("envelopeMap", this.envelopeMap);
      }

      handleParamCallback(event) {
        if (event.endpointID.match("Param")) {
          const target = event.endpointID.replace(/Param$/, "");

          let value = event.value;

          if (target.match("Period")) {
            value = value * 1000;
          }

          if (target.match("Exponent")) {
            this.expoDecayRate = value;
            this.drawWave(
              this.harmonicRatios,
              this.harmonicAmplitudes,
              this.expoDecayRate,
              this.waveCanvasFreq,
              this.waveCanvasAmp
            );
            this.patchConnection.sendStoredStateValue("expoDecayRate", value);
          }

          const slider = this.querySelector("#" + target + "Slider");

          if (slider) {
            this.querySelector("#" + target + "Slider").value = value;
            this.updateSliderTextareaValue(target, value.toFixed(2));
          }

          const knob = this.querySelector("#" + target + "Knob");

          if (knob) {
            knob.value = value;
          }

          if (target.match("harmonicAmplitude")) {
            console.log(target, value);
            const index = utils.getNumberFromString(target) - 1;
            this.harmonicAmplitudes[index] = value;
            const bars = this.querySelector("#bars");
            bars.setBarValue(index, value);
            //this.querySelector(`label[for="harmonic-${index}"]`).textContent = `[${index + 1}] ${this.harmonicRatios[index]}: ${value}`;
            this.drawWave(
              this.harmonicRatios,
              this.harmonicAmplitudes,
              this.expoDecayRate,
              this.waveCanvasFreq,
              this.waveCanvasAmp
            );
          }
        }
      }

      handleBoolStateAndToggleButton(event) {
        const target = event.target.id.replace(/ToggleButton$/, "");
        this[target] = !this[target];
        this.patchConnection.sendStoredStateValue(target, this[target]);
        handleToggleButtonState(event.target, this[target]);
        if ((target.match("Frequencies") && this[target]) || target === "whiteKeysOnlySetting") {
          if (this.noteFrequencies.length > 0) {
            this.updateNoteFrequencies(this.noteFrequencies);
          }
        }
        if (target === "showValueMatchesSetting") {
          this.populateValueTable(this.baseValues, this.multipliers, "#valueExplorer", this[target]);
        }
        if (target.match("SustainSetting")) {
          this.patchConnection.sendEventOrValue(`${target}Param`, this[target]);
        }
        return [target, this[target]];
      }

      toggleContainerVisible(event) {
        const target = event.target.id.replace(/ToggleButton$/, "");
        const containerPrefix = target.replace(/Visible$/, "");
        const container = this.querySelector(`#${containerPrefix}Container`);
        this[target] = !this[target];
        handleToggleButtonState(event.target, this[target]);
        container.style.display = container.style.display === "none" ? "block" : "none";
      }


      


handleValuesListTextarea(event) {
  const target = event.target.id.replace(/Textarea$/, "");
  
  if (target === "noteFrequencies") {
    const values = utils.getNumbersFromString(this.querySelector("#noteFrequenciesTextarea").value);
    if (values) {
      this.updateNoteFrequencies(values);
      this.patchConnection.sendStoredStateValue(target, this[target]);
    }
  } else if (target === "harmonicRatios") {
    const values = this.parseValuesWithConstants(this.querySelector("#harmonicRatiosTextarea").value);
    if (values) {
      this.updateHarmonicRatios(values);
      this.patchConnection.sendStoredStateValue(target, this[target]);
      this.drawWave(
        this.harmonicRatios,
        this.harmonicAmplitudes,
        this.expoDecayRate,
        this.waveCanvasFreq,
        this.waveCanvasAmp
      );
    }
  } else if (target === "baseValues" || target === "multipliers") {
    this.createValueExplorer(event, target);
    this.patchConnection.sendStoredStateValue(target, this[target]);
  } else if (target === "valueBank") {
    const values = utils.getNumbersFromString(event.target.value);
    this.updateValueBank(values);
    this.patchConnection.sendStoredStateValue(target, this[target]);
  } else if (target === "numberGenerator") {
    const input = event.target.value.trim();
    const [command, tuning, frequency, noteNumber] = input.split(" ");
    
    // Detect and parse ET tuning format, e.g., "7et", "12et"
    const etMatch = tuning.match(/^(\d+)et$/);
    
    if (command === "n" && etMatch && !isNaN(frequency) && !isNaN(noteNumber)) {
      const divisions = parseInt(etMatch[1]); // Extract number of equal divisions
      const frequencies = generateETFrequencies(parseFloat(frequency), parseInt(noteNumber), divisions);
      this.updateNoteFrequencies(frequencies);
      mapValuesToTextarea(this.querySelector("#noteFrequenciesTextarea"), frequencies, 2);
    } else {
      // Fallback to the existing number generation logic for other commands
      let [targetKey, numbers] = this.generateNumbers(input);
      const outputTextarea = this.querySelector(`#${targetKey}Textarea`);
      mapValuesToTextarea(outputTextarea, numbers, 3);
      outputTextarea.focus();
      outputTextarea.blur();
    }
  }
}

      
      updateNoteFrequencies(values) {
        // Ensure unique values if 'Unique' option is selected
        if (this.uniqueNoteFrequenciesSetting) {
          values = [...new Set(values)];
        }
      
        // Sort values if 'Sort' option is selected
        if (this.sortNoteFrequenciesSetting) {
          values = values.sort((a, b) => a - b);
        }
      
        // Apply the modified values
        this.noteFrequencies = values;
        this.keyMapping = createKeyMapping(values, this.whiteKeysOnlySetting); // Adjusts key mapping based on whiteKeysOnlySetting
        
        // Save the current keyMapping
        this.patchConnection.sendStoredStateValue("keyMapping", this.keyMapping);
      
        // Reflect sorted/unique frequencies in the textarea
        mapValuesToTextarea(this.querySelector("#noteFrequenciesTextarea"), values, 2);
        updateValuesListTextareaLabel(this.querySelector("#noteFrequenciesLabel"), this.noteFrequencies);

        if (this.keyMapping && this.keyMapping.length > 0) {
          this.patchConnection.sendEventOrValue("noteFrequenciesIn", this.keyMapping);
          if (!this.valueBankRanges == []) {
            this.createValueTable("#harmonicTableContainer", this.noteFrequencies, this.harmonicRatios);
            this.populateValueTable(
              this.noteFrequencies,
              this.harmonicRatios,
              "#harmonicTable",
              this.showHarmonicMatchesSetting
            );
          }
          this.createValueTable("#keyMappingTableContainer");
          this.createValueTable("#keyMappingExplorerContainer");
        }
      }

      updateHarmonicRatios(values) {
        this.harmonicRatios = [];
        this.harmonicRatios = values;
        let ratios = new Array(16).fill(0);
        for (let i = 0; i < Math.min(16, values.length); i++) {
          ratios[i] = values[i];
        }
        if (values.length > 0) {
          updateValuesListTextareaLabel(this.querySelector("#harmonicRatiosLabel"), values);
          mapValuesToTextarea(this.querySelector("#harmonicRatiosTextarea"), values, 5);
          //this.updateHarmonicSliderLabels(ratios);

          this.patchConnection.sendEventOrValue("harmonicRatiosIn", ratios);
          if (!this.valueBankRanges == []) {
            this.createValueTable("#harmonicTableContainer", this.noteFrequencies, this.harmonicRatios);
            this.populateValueTable(
              this.noteFrequencies,
              this.harmonicRatios,
              "#harmonicTable",
              this.showHarmonicMatchesSetting
            );
          }
          //this.drawWave(this.harmonicRatios, this.harmonicAmplitudes, this.expoDecayRate, this.waveCanvasFreq, this.waveCanvasAmp);
        }
      }

      updateSliderTextareaValue(targetName, value) {
        const unitNamesList = {
          Volume: "dB",
          Frequency: "hz",
          Period: "ms",
        };

        const target = this.querySelector(`#${targetName}Value`);
        if (targetName.match("noiseFilterMode")) {
          const filterModes = ["Lowpass", "Highpass", "Bandpass"];
          target.value = filterModes[parseInt(value)];
        } else {
          const units = unitNamesList[utils.getLastWord(targetName)];
          if (units != undefined) {
            target.value = `${value} ${units}`;
          } else {
            target.value = value;
          }
        }
      }

      

      handleSliderEvent(event) {
        let paramName = event.target.id.replace(/Slider$/, "");
        let value = event.target.value;
        if (event.target.id.match("Value")) {
          paramName = event.target.id.replace(/Value$/, "");
          const value_string = event.target.value.match(/^[\d.-]+/);
          value = value_string ? parseFloat(value_string[0]) : NaN;
        }

        this.updateSliderTextareaValue(paramName, value);

        if (event.target.id.match("Exponent")) {
          this.expoDecayRate = value;
          this.drawWave(
            this.harmonicRatios,
            this.harmonicAmplitudes,
            this.expoDecayRate,
            this.waveCanvasFreq,
            this.waveCanvasAmp
          );
          this.patchConnection.sendStoredStateValue("expoDecayRate", value);
        }

        if (paramName.match("Period")) {
          value = value / 1000;
        }

        if (!paramName.match("waveCanvas")) {
          this.patchConnection.sendStoredStateValue(`${paramName}Param`, value);
          this.patchConnection.sendEventOrValue(`${paramName}Param`, value);
          //console.log(paramName, value);
        } else {
          this[paramName] = value;
          this.patchConnection.sendStoredStateValue(paramName, value);
          this.drawWave(
            this.harmonicRatios,
            this.harmonicAmplitudes,
            this.expoDecayRate,
            this.waveCanvasFreq,
            this.waveCanvasAmp
          );
        }
      }

      handleKnobEvent(event) {
        let paramName = event.target.id.replace(/Knob$/, "");
        let value = event.detail.value;
        if (event.target.id.match("Value")) {
          paramName = event.target.id.replace(/Value$/, "");
          const value_string = event.target.value.match(/^[\d.-]+/);
          value = value_string ? parseFloat(value_string[0]) : NaN;
        }

        if (event.target.id.match("Exponent")) {
          this.expoDecayRate = value;
          this.drawWave(
            this.harmonicRatios,
            this.harmonicAmplitudes,
            this.expoDecayRate,
            this.waveCanvasFreq,
            this.waveCanvasAmp
          );
          this.patchConnection.sendStoredStateValue("expoDecayRate", value);
        }

        if (paramName.match("Period")) {
          value = value / 1000;
        }

        this.patchConnection.sendStoredStateValue(`${paramName}Param`, value);
        this.patchConnection.sendEventOrValue(`${paramName}Param`, value);
      }

      handleSliderTextarea(event) {
        const targetID = event.target.id;
        const value_string = event.target.value.match(/^[\d.-]+/);
        const value = value_string ? parseFloat(value_string[0]) : NaN;
        const sliderName = targetID.replace(/Value$/, "Slider");
        this.querySelector(`#${sliderName}`).value = value;
        this.handleSliderEvent(event);
      }

      handleHarmonicAmplitudeChange(index, value) {
        this.harmonicAmplitudes[index] = value;
        this.patchConnection.sendEventOrValue(`harmonicAmplitude${index + 1}Param`, this.harmonicAmplitudes[index]);
        //this.querySelector(`label[for="harmonic-${index}"]`).textContent = `[${index + 1}] ${this.harmonicRatios[index]}: ${value}`;
        this.drawWave(
          this.harmonicRatios,
          this.harmonicAmplitudes,
          this.expoDecayRate,
          this.waveCanvasFreq,
          this.waveCanvasAmp
        );
        this.patchConnection.sendStoredStateValue("harmonicAmplitdues", this.harmonicAmplitudes);
      }

      createCustomNote(eventType, frequency) {
        const noteOnVelocity = 1;
        const noteOffVelocity = 0;
        if (eventType === "mousedown" || eventType === "touchstart" || eventType === "start-drag") {
          this.patchConnection.sendEventOrValue("customNoteIn", [frequency, noteOnVelocity]);
        } else if (eventType === "mouseup" || eventType === "touchend" || eventType === "stop-drag") {
          this.patchConnection.sendEventOrValue("customNoteIn", [frequency, noteOffVelocity]);
        }
      }

      drawWave(ratios, amplitudes, decayRate, frequency, globalAmp) {
        const canvas = this.querySelector("#waveCanvas");
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        for (let x = 0; x < width; x++) {
          let y = 0;
          const t = (x / width) * (2 * Math.PI);

          // Sum the harmonics with exponential decay
          for (let i = 0; i < ratios.length; i++) {
            const decay = i === 0 ? 1 : Math.exp(-decayRate * i);
            y += amplitudes[i] * decay * Math.sin(ratios[i] * frequency * t);
          }

          y = centerY - y * globalAmp;
          ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      handleValueExplorerNote(event) {
        if (!event.ctrlKey && event.target.matches("th:not(:first-of-type), td:not(:first-child)")) {
          const cellValue = parseFloat(event.target.innerText);
          if (!isNaN(cellValue)) {
            this.createCustomNote(event.type, cellValue);
          }
        }
      }

      handleKeyMappingNote(event) {
        const target = event.target.closest("tr");
        const rowIndex = target.rowIndex;
        if (rowIndex > 0) {
          const frequencyCell = target.querySelector("td:nth-child(3)");
          const frequency = parseFloat(frequencyCell.innerText);
          if (!isNaN(frequency)) {
            this.createCustomNote(event.type, frequency);
          }
        }
      }

      handleNotePlayedFrequency(value) {
        if (this.settings.noteFreqToFilter === true) {
          this.querySelector("#noiseFilterFrequencyKnob").value = value;
        }
        if (this.noteFreqToWaveCanvasSetting === true) {
          this.waveCanvasFreq = value;
          this.querySelector("#waveCanvasFreqSlider").value = value;
          this.querySelector("#waveCanvasFreqValue").value = value.toFixed(2);
          this.drawWave(
            this.harmonicRatios,
            this.harmonicAmplitudes,
            this.expoDecayRate,
            this.waveCanvasFreq,
            this.waveCanvasAmp
          );
        }
      }

      handleValueExplorerClick(event) {
        if (event.ctrlKey && event.type === "click") {
          const cellValue = parseFloat(event.target.innerText);
          if (!isNaN(cellValue)) {
            if (event.altKey) {
              // Find the closest value in the valueBank
              const closestValue = utils.checkValueWithinRange(cellValue, this.valueBank);
              // Append the closest value to the note frequencies textarea
              const textarea = this.querySelector("#noteFrequenciesTextarea");
              textarea.value += `${closestValue} `;
            } else {
              // Add the cell's value directly
              const textarea = this.querySelector("#noteFrequenciesTextarea");
              textarea.value += `${cellValue} `;
            }
          }
        }
      }

      populateValueTable(baseValues, multipliers, targetContainer, showMatches) {
        multipliers = multipliers.filter((multiplier) => multiplier !== 1);
        multipliers.forEach((multiplierValue, rowIndex) => {
          baseValues.forEach((baseValue, colIndex) => {
            const resultCell = this.querySelector(
              `${targetContainer} tr:nth-child(${rowIndex + 2}) td:nth-child(${colIndex + 2})`
            );
            if (resultCell) {
              const resultValue = baseValue * multiplierValue;
              resultCell.innerText = resultValue % 1 === 0 ? resultValue.toString() : resultValue.toFixed(2);

              if (showMatches) {
                highlightMatchedResults(resultValue, resultCell, this.valueBankRanges); // Pass valueBankRanges
              } else {
                resultCell.style.backgroundColor = "";
              }
            }
          });
        });
      }

      createValueExplorer(event, targetName) {
        const textareaValue = event.target.value;
        this[targetName] = this.parseValuesWithConstants(textareaValue);
        this.createValueTable("#valueExplorer", this.baseValues, this.multipliers);
        this.populateValueTable(this.baseValues, this.multipliers, "#valueExplorer", this.showValueMatchesSetting);
      }

      createValueTable(target, baseValues, multipliers) {
        let targetContainer = this.querySelector(target);
        let html = "";

        if (targetContainer) {
          if (target === "#harmonicTableContainer") {
            html = `<span class="textarea-title">Harmonic Table</span><div class="harmonic-table-inner-container"><table class="harmonic-table" id="harmonicTable">`;
            html = createMultiplyHTML(baseValues, multipliers, html);
          } else if (target === "#valueExplorer") {
            html = `<table class="value-explorer">`;
            html = createMultiplyHTML(baseValues, multipliers, html);
          } else if (target === "#keyMappingTableContainer") {
            if (this.keyMapping && this.keyMapping.length > 0) {
              html = createKeyMappingTable(this.keyMapping, this.whiteKeysOnlySetting);
              //html = createKeyMappingExplorer(this.keyMapping);
            }
          } else if (target === "#keyMappingExplorerContainer") {
            if (this.keyMapping && this.keyMapping.length > 0) {
              html = createKeyMappingExplorer(this.keyMapping, this.whiteKeysOnlySetting);
            }
          }

          if (html !== "") {
            html += `</table>`;
            targetContainer.innerHTML = html;
          }
        }
      }

      requestValuesListsStoredState() {
        const valueListStrings = ["noteFrequencies", "harmonicRatios", "valueBank"];

        for (const valueList of valueListStrings) {
          this.patchConnection.requestStoredStateValue(valueList);
        }
      }

      connectedCallback() {
        this.manageEventListeners("add"); // Add event listeners.

        for (const slider of this.querySelectorAll('[id*="Slider"]')) {
          let paramID;
          if (!slider.id.match("waveCanvas")) {
            paramID = slider.id.replace(/Slider/, "Param");
            this.patchConnection.requestParameterValue(paramID);
          } else {
            paramID = slider.id.replace(/Slider/, "");
            this.patchConnection.requestStoredStateValue(paramID);
          }
        }

        for (const knob of this.querySelectorAll('[id*="Knob"]')) {
          const paramID = knob.id.replace(/Knob/, "Param");
          this.patchConnection.requestParameterValue(paramID);
        }

        for (const toggleButton of this.querySelectorAll('[id*="SettingToggleButton"]')) {
          const settingName = toggleButton.id.replace(/ToggleButton/, "");
          this.patchConnection.requestStoredStateValue(settingName);
          handleToggleButtonState(toggleButton, this[settingName]);
        }

        for (const toggleButton of this.querySelectorAll('[id*="VisibleToggleButton"]')) {
          const settingName = toggleButton.id.replace(/ToggleButton/, "");
          this.patchConnection.requestStoredStateValue(settingName);
          handleToggleButtonState(toggleButton, this[settingName]);
        }

        for (const valuesListTextarea of this.querySelectorAll(".values-list-textarea")) {
          this.patchConnection.requestStoredStateValue(valuesListTextarea.id);
        }

        this.requestValuesListsStoredState();

        for (let i = 1; i < this.harmonicAmplitudes.length + 1; i++) {
          this.patchConnection.requestParameterValue(`harmonicAmplitude${i}Param`);
        }

        this.patchConnection.requestStoredStateValue("envelopeMap");

        this.querySelector("#masterVolumeContainer").style.display = "flex";
        this.querySelector("#ASRContainer").style.display = "flex";
        this.querySelector("#noiseContainer").style.display = "flex";
        this.querySelector("#waveCanvasContainer").style.display = "block";
        this.querySelector("#barsContainer").style.display = "flex";
        this.querySelector("#keyMappingExplorerContainer").style.display = "none";
        this.querySelector("#keyMappingTableContainer").style.display = "none";
        this.querySelector("#valueBankContainer").style.display = "none";
        this.querySelector("#valueExplorerContainer").style.display = "none";
        this.querySelector("#harmonicTableContainer").style.display = "none";


        this.updateDropdownLabels();

      }


      disconnectedCallback() {
        this.manageEventListeners("remove");
      }
    }

    window.customElements.define("value-synth-view", ValueSynthView);

    export default function createPatchView(patchConnection) {
      return new ValueSynthView(patchConnection);
    }
