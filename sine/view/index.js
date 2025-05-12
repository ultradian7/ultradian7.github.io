

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
        const freqText = this.querySelector ("#frequency-text");

        // When the slider is moved, this will cause the new value to be sent to the patch:
        freqSlider.oninput = () => {
            this.patchConnection.sendEventOrValue ("frequency", freqSlider.value)
            freqText.value = freqSlider.value
        };

        freqText.oninput = () => {
            this.patchConnection.sendEventOrValue ("frequency", freqText.value),
            freqSlider.value = freqText.value;
        };

        // Create a listener for the frequency endpoint, so that when it changes, we update our slider..
        this.freqListener = value => freqSlider.value = value;
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
            }

            .slider {
                display: inline-block;
                margin: 1rem;
                width: 90%;
                max-width: 40rem;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                height: 3rem;
                margin: 1rem 0;
                background: dark gray;
                border: 1px solid #fff;
                align-self: center;
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
        
            .frequency-slider-label {
              align-self: center;
              font-size: 2rem;
            }

            label {
                font-size: 2rem;
            }

            .freq-text-wrapper {
                align-self: center;
            }
            
            .freq-text {
                display: inline-block;
                width: 8rem;
                align-self: center;
                font-size: 2rem;
                padding-left: 0.5rem;
            }

            @media (min-width: 900px) {
            
                body, html {
                    font-size: 36px;
                }
            }

            
        </style>

        <div class="controls" id="controls">
          <label class="frequency-slider-label" for="frequency-slider">Frequency</label>
          <input type="range" class="slider" id="frequency-slider" min="1" max="130" step="0.01"></input>
          <div class="freq-text-wrapper">
            <input type="number" class="freq-text" id="frequency-text" min="1" max="12000" step="0.01"></input>
            <label for="frequency-text">Hz</label>
          </div>  
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
