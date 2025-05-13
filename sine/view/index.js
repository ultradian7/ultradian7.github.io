

/*
    This simple web component just manually creates a set of plain sliders for the
    known parameters, and uses some listeners to connect them to the patch.
*/
class sine_View extends HTMLElement
{
    constructor (patchConnection)
    {
        super();
        this.patchConnection = patchConnection;
        this.classList = "main-view-element";
        this.innerHTML = this.getHTML();
    }

    connectedCallback()
    {
        // When the HTMLElement is shown, this is a good place to connect
        // any listeners you need to the PatchConnection object..

        // First, find our frequency slider:
        const freqSlider = this.querySelector ("#frequency-slider");
        const gainSlider = this.querySelector ("#gain-slider");
        const freqText = this.querySelector ("#frequency-text");
        const gainText = this.querySelector ("#gain-text");

        // When the slider is moved, this will cause the new value to be sent to the patch:
        freqSlider.oninput = () => {
            const sliderValue = parseFloat(freqSlider.value);
            this.patchConnection.sendEventOrValue ("frequency", sliderValue);
            freqText.value = sliderValue.toFixed(2);
        };

        gainSlider.oninput = () => {
            const sliderValue = parseFloat(gainSlider.value);
            this.patchConnection.sendEventOrValue ("gain", sliderValue);
            gainText.value = sliderValue.toFixed(2);
        };

        freqText.oninput = () => {
            this.patchConnection.sendEventOrValue ("frequency", freqText.value);
            freqSlider.value = freqText.value;
        };

        gainText.oninput = () => {
            this.patchConnection.sendEventOrValue ("gain", gainText.value);
            gainSlider.value = gainText.value;
        };

        // Create a listener for the frequency endpoint, so that when it changes, we update our slider..
        this.freqListener = value => {
            freqSlider.value = value;
            freqText.value = value;
        }
        this.patchConnection.addParameterListener ("frequency", this.freqListener);

        // Now request an initial update, to get our slider to show the correct starting value:
        this.patchConnection.requestParameterValue ("frequency");
    }

    disconnectedCallback()
    {
        // When our element is removed, this is a good place to remove
        // any listeners that you may have added to the PatchConnection object.
        this.patchConnection.removeParameterListener ("frequency", this.freqListener);
    }

    getHTML()
    {
        return `
        <style>
            .main-view-element {
                background: #000;
                display: block;
                width: 100%;
                height: 100%;
                padding: 1rem;
                overflow: auto;
                touch-action: none;
            }

            .controls {
                display: flex;
                flex-direction: column;
                place-content: center;
                background-color: #333;
                margin: 1rem 0;
                border-radius: 0.5rem;
                padding: 1rem;
            }

            .slider {
                display: inline-block;
            }

            input[type=range]{
                width: 100%;
                max-width: 40rem;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                height: 3rem;
                margin: 1rem 0;
                background: #ccc;
                border: 1px solid #000;
                align-self: center; 
                borrer-radius: 0.5rem;
            }

            input[type=range]::-webkit-slider-thumb  {
              -webkit-appearance: none;
              width: 0.25rem;
              height: 3rem;
              background: #4285f4;
              cursor: pointer;
            }
            input[type=range]:active::-webkit-slider-thumb {
              background: #3367d6;
            }

            label {
                font-size: 2rem;
                align-self: center;
            }

            .freq-text-wrapper {
                align-self: center;
            }
            

            input[type=number] {
                font-family: Monaco, Consolas, monospace;
                width: 8rem;
                align-self: center;
                font-size: 2rem;
                padding-left: 0.5rem;
                background: #999;
                text-align: right;
            }

            @media (min-width: 900px) {
            
                body, html {
                    font-size: 36px;
                }
            }

            
        </style>

        <div class="controls" id="freq-controls">
          <label class="frequency-slider-label" for="frequency-slider">Frequency</label>
          <input type="range" class="slider" id="frequency-slider" min="1" max="200" step="0.01" value="40.00"></input>
          <div class="freq-text-wrapper">
            <input type="number" class="slider-text" id="frequency-text" min="1" max="12000" step="0.01" value="40.00"></input>
            <label for="frequency-text">Hz</label>
          </div>  
        </div>
        <div class="controls" id="gain-controls">
            <label for="gain-slider">Gain</label>
            <input type="range" class="slider" id="gain-slider" min="0" max="1" step="0.01" value="0.5"></input>
             <input type="number" class="slider-text" id="gain-text" min="0" max="1" step="0.01" value="0.50"></input>
        </div>`;
    }
}

window.customElements.define ("sine-view", sine_View);

/* This is the function that a host (the command line patch player, or a Cmajor plugin
   loader, or our VScode extension, etc) will call in order to create a view for your patch.

   Ultimately, a DOM element must be returned to the caller for it to append to its document.
   However, this function can be `async` if you need to perform asyncronous tasks, such as
   fetching remote resources for use in the view, before completing.
*/
export default function createPatchView (patchConnection)
{
    return new sine_View (patchConnection);
}
