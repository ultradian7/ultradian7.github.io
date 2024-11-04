class KnobComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
        <style>
            .knob-container {
                width: 55px;
                height: auto;
                position: relative;
            }
    
            .knob {
                width: 100%;
                height: 100%;
                cursor: pointer;
                border-radius: 50%;
                box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1), -2px -2px 5px rgba(255, 255, 255, 0.05);
            }
    
            #knob-circle {
                fill: url(#knob-gradient); /* Apply gradient with darker edges */
            }
    
            .knob-label {
                width: 100%;
                text-align: center;
                background: inherit;
                border: none;
                color: #FFF;
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                resize: none;
                cursor: default;
                user-select: contain;
                overflow: hidden;
            }
    
            .indicator-line {
                stroke: rgba(255, 255, 255, 0.8);
                stroke-width: 3;
            }
        </style>
        <div class="knob-container">
            <svg class="knob" viewBox="0 0 100 100">
                <!-- Define the radial gradient with darker edges -->
                <defs>
                    <radialGradient id="knob-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="80%" style="stop-color: ${this.getAttribute("colour") || "#ccc"}; stop-opacity: 1" />
                        <stop offset="100%" style="stop-color: #000000; stop-opacity: 0.6" />
                    </radialGradient>
                </defs>
                
                <!-- Min and Max indicators positioned outside the knob -->
                <line x1="50" y1="5" x2="50" y2="15" class="indicator-line" id="min-indicator"/>
                <line x1="50" y1="5" x2="50" y2="15" class="indicator-line" id="max-indicator"/>
                
                <circle cx="50" cy="50" r="45" id="knob-circle"/>
                <circle cx="50" cy="20" r="6" fill="rgba(0, 0, 0, 0.55)" id="indicator"/>
            </svg>
    
            <textarea class="knob-label"></textarea> 
        </div>
    `;
    
    
    }

    connectedCallback() {
        this.knob = this.shadowRoot.querySelector(".knob");
        this.indicator = this.shadowRoot.querySelector("#indicator");
        this.circle = this.shadowRoot.querySelector("#knob-circle");
        this.label = this.shadowRoot.querySelector(".knob-label");
        this.minIndicator = this.shadowRoot.querySelector("#min-indicator");
        this.maxIndicator = this.shadowRoot.querySelector("#max-indicator");

        this.maxAngle = parseInt(this.getAttribute("max-angle")) || 160;
        this.paramMin = parseFloat(this.getAttribute("min")) || 0;
        this.paramMax = parseFloat(this.getAttribute("max")) || 1;
        this.knobName = this.getAttribute("name") || "Name";
        this.valueUnit = this.getAttribute("unit") || "";
        this.initValue = parseFloat(this.getAttribute("init-value")) || (this.paramMin + this.paramMax) / 2;
        this.colour = this.getAttribute("colour") || "#ccc";

        this.currentAngle = this.valueToAngle(this.initValue);
        this.startY = 0;
        this.isDragging = false;
        this.isEditing = false;

        this.label.value = this.knobName;
        this.circle.setAttribute("fill", this.colour);

        // Set initial rotation for min and max indicators
        this.minIndicator.setAttribute("transform", `rotate(${-this.maxAngle} 50 50)`);
        this.maxIndicator.setAttribute("transform", `rotate(${this.maxAngle} 50 50)`);

        this.knob.addEventListener("mousedown", this.startDrag.bind(this));
        this.knob.addEventListener("touchstart", this.startTouch.bind(this));

        document.addEventListener("mousemove", this.drag.bind(this));
        document.addEventListener("touchmove", this.dragTouch.bind(this), { passive: false });

        document.addEventListener("mouseup", this.endDrag.bind(this));
        document.addEventListener("touchend", this.endTouch.bind(this));

        this.shadowRoot.querySelector(".knob-container").addEventListener("mouseenter", this.showCurrentValue.bind(this));
        this.shadowRoot.querySelector(".knob-container").addEventListener("mouseleave", this.showKnobName.bind(this));
        this.label.addEventListener("click", this.editLabel.bind(this));
        this.label.addEventListener("blur", this.updateValueFromLabel.bind(this));
        this.label.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.label.blur();
            }
        });

        // Initialize the knob to the initial value
        this.updateKnob(this.currentAngle);
        this.updateParameter(this.currentAngle, false); // Update without dispatching the event
    }


        startDrag(e) {
            this.isDragging = true;
            this.startY = e.clientY;
        }

        startTouch(e) {
            this.isDragging = true;
            this.startY = e.touches[0].clientY;
        }

        drag(e) {
            if (this.isDragging) {
                const deltaY = this.startY - e.clientY;
                const angleChange = deltaY * 0.5; // Adjust sensitivity
                let angle = this.currentAngle + angleChange;

                // Constrain angle within [-maxAngle, maxAngle]
                angle = Math.max(-this.maxAngle, Math.min(this.maxAngle, angle));
                this.currentAngle = angle;
                this.updateKnob(this.currentAngle);
                this.updateParameter(this.currentAngle);

                this.startY = e.clientY; // Update startY for the next move
            }
        }

        dragTouch(e) {
            if (this.isDragging) {
                e.preventDefault(); // Prevent scrolling
                const deltaY = this.startY - e.touches[0].clientY;
                const angleChange = deltaY * 0.5; // Adjust sensitivity
                let angle = this.currentAngle + angleChange;

                // Constrain angle within [-maxAngle, maxAngle]
                angle = Math.max(-this.maxAngle, Math.min(this.maxAngle, angle));
                this.currentAngle = angle;
                this.updateKnob(this.currentAngle);
                this.updateParameter(this.currentAngle);

                this.startY = e.touches[0].clientY; // Update startY for the next move
            }
        }

        endDrag() {
            this.isDragging = false;
            this.showKnobName();
        }

        endTouch() {
            this.isDragging = false;
            this.showKnobName();
        }

        updateKnob(angle) {
            this.indicator.setAttribute("transform", `rotate(${angle} 50 50)`);
        }

        updateParameter(angle, dispatchEvent = true) {
            const paramValue = ((angle + this.maxAngle) / (2 * this.maxAngle)) * (this.paramMax - this.paramMin) + this.paramMin;
            if (dispatchEvent) {
                this.dispatchEvent(new CustomEvent("value-change", {
                    detail: {
                        value: paramValue
                    }
                }));
            }
            this.label.value = this.formatLabel(paramValue);
        }

        formatLabel(value) {
            let labelValue = "";
            if (this.valueUnit !== "") {
                labelValue = `${value.toFixed(2)} ${this.valueUnit}`;
            } else {
                labelValue = value.toFixed(2);
            }
            return labelValue;
        }

        valueToAngle(value) {
            return ((value - this.paramMin) / (this.paramMax - this.paramMin)) * (2 * this.maxAngle) - this.maxAngle;
        }

        showCurrentValue() {
            const paramValue = ((this.currentAngle + this.maxAngle) / (2 * this.maxAngle)) * (this.paramMax - this.paramMin) + this.paramMin;
            this.label.value = this.formatLabel(paramValue);
        }

        showKnobName() {
            if (!this.isDragging && !this.isEditing) {
                this.label.value = this.knobName;
            }
        }

        editLabel() {
            this.isEditing = true;
            this.label.focus();
            this.showCurrentValue();
            this.label.select();
        }

        updateValueFromLabel() {
            const newValue = parseFloat(this.label.value);
            if (!isNaN(newValue)) {
                const clampedValue = Math.max(this.paramMin, Math.min(this.paramMax, newValue));
                const newAngle = this.valueToAngle(clampedValue);
                this.currentAngle = newAngle;
                this.updateKnob(this.currentAngle);
                this.updateParameter(this.currentAngle);
            }
            this.isEditing = false;
        }

        get value() {
            const paramValue = ((this.currentAngle + this.maxAngle) / (2 * this.maxAngle)) * (this.paramMax - this.paramMin) + this.paramMin;
            return paramValue;
        }

        set value(newValue) {
            if (!isNaN(newValue)) {
                const clampedValue = Math.max(this.paramMin, Math.min(this.paramMax, newValue));
                const newAngle = this.valueToAngle(clampedValue);
                this.currentAngle = newAngle;
                this.updateKnob(this.currentAngle);
                this.updateParameter(this.currentAngle, false); // Update without dispatching the event
            }
        }
    }

    export { KnobComponent };
    customElements.define("knob-component", KnobComponent);
