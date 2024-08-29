class OptionSquareComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.value = 0;
        this.colors = ["#85A357", "#fcd658", "#dd4d37"]; // Colors for 0, 1, 2
        this.labels = ["A", "B", "C"]; // Labels for 0, 1, 2
    }

    connectedCallback() {
        this.render();
        this.square = this.shadowRoot.querySelector(".option-square");
        this.label = this.shadowRoot.querySelector(".option-label");

        this.square.addEventListener("click", this.handleClick.bind(this));
        this.square.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
        this.square.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .option-square {
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .option-label {
                    font-size: 12px;
                    color: white;
                }
            </style>
            <div class="option-square" style="background-color: ${this.colors[this.value]};">
                <span class="option-label">${this.labels[this.value]}</span>
            </div>
        `;
    }

    handleClick() {
        this.incrementValue();
    }

    handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling
        this.incrementValue();
    }

    handleTouchEnd(event) {
        event.preventDefault();
    }

    incrementValue() {
        this.value = (this.value + 1) % 3;
        this.updateSquare();
        this.dispatchEvent(new CustomEvent("option-change", {
            detail: {
                value: this.value
            }
        }));
    }

    updateSquare() {
        this.square.style.backgroundColor = this.colors[this.value];
        this.label.textContent = this.labels[this.value];
    }

    setValue(value) {
        if (value >= 0 && value < 3) {
            this.value = value;
            this.updateSquare();
        }
    }

    getValue() {
        return this.value;
    }
}

customElements.define("option-square-component", OptionSquareComponent);

class BarsComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.activeTouches = {};
    }

    connectedCallback() {
        // Get attributes or set default values
        this.svgHeight = parseInt(this.getAttribute("bar-height")) || 200;
        this.barWidth = parseInt(this.getAttribute("bar-width")) || 20;
        this.barGap = parseInt(this.getAttribute("bar-gap")) || 10;
        this.numBars = parseInt(this.getAttribute("num-bars")) || 16;
        this.barColour = this.getAttribute("bar-colour") || "black";
        this.minValue = parseFloat(this.getAttribute("min-value")) || 0;
        this.maxValue = parseFloat(this.getAttribute("max-value")) || 1;
        this.svgWidth = this.numBars * this.barWidth + (this.numBars - 1) * this.barGap;

        this.render();
        this.svg = this.shadowRoot.querySelector("svg");
        this.createBars();
        this.createOptionSquares();
        this.isDragging = false;

        this.svg.addEventListener("mousedown", this.handleMouseDown.bind(this));
        document.addEventListener("mousemove", this.handleMouseMove.bind(this));
        document.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.svg.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener("touchend", this.handleTouchEnd.bind(this));
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .bar {
                    fill: ${this.barColour};
                    cursor: pointer;
                }
                .bar:hover {
                    fill: grey;
                }
                .bar-value {
                    font-size: 10px;
                    fill: white;
                    text-anchor: middle;
                    pointer-events: none;
                }
                .option-square-container {
                    display: flex;
                    justify-content: space-between;
                }
            </style>
            <svg width="${this.svgWidth}" height="${this.svgHeight}"></svg>
            <div class="option-square-container"></div>
        `;
    }

    createBars() {
        for (let i = 0; i < this.numBars; i++) {
            const x = i * (this.barWidth + this.barGap);
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.classList.add("bar");
            rect.setAttribute("x", x);
            rect.setAttribute("y", this.svgHeight / 2); // Initial y position
            rect.setAttribute("width", this.barWidth);
            rect.setAttribute("height", this.svgHeight / 2); // Initial height
            rect.setAttribute("data-index", i); // Store the index of the bar

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.classList.add("bar-value");
            text.setAttribute("x", x + this.barWidth / 2);
            text.setAttribute("y", this.svgHeight - (this.svgHeight / 4)); // Initial y position
            text.setAttribute("data-index", i);
            text.textContent = "";

            this.svg.appendChild(rect);
            this.svg.appendChild(text);

            rect.addEventListener("mouseover", this.handleMouseOver.bind(this));
            rect.addEventListener("mouseout", this.handleMouseOut.bind(this));
        }
    }

    createOptionSquares() {
        const container = this.shadowRoot.querySelector(".option-square-container");
        this.optionSquares = [];
        for (let i = 0; i < this.numBars; i++) {
            const optionSquare = document.createElement("option-square-component");
            optionSquare.setAttribute("data-index", i);
            optionSquare.addEventListener("option-change", (event) => {
                const index = optionSquare.getAttribute("data-index");
                this.dispatchEvent(new CustomEvent("parameter-change", {
                    detail: {
                        index: parseInt(index, 10),
                        value: event.detail.value
                    }
                }));
            });
            container.appendChild(optionSquare);
            this.optionSquares.push(optionSquare);
        }
    }

    setOptionSquareValue(index, value) {
        if (index >= 0 && index < this.optionSquares.length) {
            this.optionSquares[index].setValue(value);
        }
    }

    isWithinComponent(clientX, clientY) {
        const rect = this.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }

    setHeight(clientX, clientY, identifier) {
        const svgRect = this.svg.getBoundingClientRect();
        const clickY = clientY - svgRect.top;
        const heightValue = this.svgHeight - (clickY / svgRect.height * this.svgHeight);
        const height = Math.max(0, Math.min(this.svgHeight, heightValue));

        if (this.activeTouches[identifier] && this.activeTouches[identifier].currentBar) {
            const currentBar = this.activeTouches[identifier].currentBar;
            currentBar.setAttribute("height", height);
            currentBar.setAttribute("y", this.svgHeight - height);
            this.updateBarValue(currentBar, height);
            this.dispatchBarChangeEvent(currentBar);
        } else {
            const bars = this.shadowRoot.querySelectorAll(".bar");
            bars.forEach((bar) => {
                const barRect = bar.getBoundingClientRect();
                if (clientX >= barRect.left && clientX <= barRect.right) {
                    bar.setAttribute("height", height);
                    bar.setAttribute("y", this.svgHeight - height);
                    this.activeTouches[identifier] = { currentBar: bar };
                    this.updateBarValue(bar, height);
                    this.dispatchBarChangeEvent(bar);
                }
            });
        }
    }

    updateBarValue(bar, height) {
        const index = bar.getAttribute("data-index");
        const scaledValue = this.minValue + (height / this.svgHeight) * (this.maxValue - this.minValue);
        const text = this.shadowRoot.querySelector(`.bar-value[data-index="${index}"]`);
        if (text) {
            text.textContent = scaledValue.toFixed(2);
            text.setAttribute("y", this.svgHeight - height / 2); // Center the text in the bar
        }
    }

    clearBarValue(bar) {
        const index = bar.getAttribute("data-index");
        const text = this.shadowRoot.querySelector(`.bar-value[data-index="${index}"]`);
        if (text) {
            text.textContent = "";
        }
    }

    dispatchBarChangeEvent(bar) {
        const index = bar.getAttribute("data-index");
        const height = parseFloat(bar.getAttribute("height"));
        const scaledValue = this.minValue + (height / this.svgHeight) * (this.maxValue - this.minValue);
        const event = new CustomEvent("bar-change", {
            detail: {
                index: parseInt(index, 10), // Ensure index is an integer
                value: scaledValue
            }
        });
        this.dispatchEvent(event);
    }

    handleMouseOver(e) {
        const bar = e.target;
        const height = parseFloat(bar.getAttribute("height"));
        this.updateBarValue(bar, height);
    }

    handleMouseOut(e) {
        const bar = e.target;
        this.clearBarValue(bar);
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.setHeight(e.clientX, e.clientY, "mouse");
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            this.setHeight(e.clientX, e.clientY, "mouse");
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        if (this.activeTouches["mouse"] && this.activeTouches["mouse"].currentBar) {
            this.clearBarValue(this.activeTouches["mouse"].currentBar);
        }
        delete this.activeTouches["mouse"];
    }

    handleTouchStart(e) {
        Array.from(e.changedTouches).forEach(touch => {
            if (this.isWithinComponent(touch.clientX, touch.clientY)) {
                this.setHeight(touch.clientX, touch.clientY, touch.identifier);
                this.activeTouches[touch.identifier] = { clientX: touch.clientX, clientY: touch.clientY };
            }
        });
        e.preventDefault(); // Prevent scrolling
    }

    handleTouchMove(e) {
        Array.from(e.changedTouches).forEach(touch => {
            if (this.activeTouches[touch.identifier]) {
                this.setHeight(touch.clientX, touch.clientY, touch.identifier);
                this.activeTouches[touch.identifier] = { clientX: touch.clientX, clientY: touch.clientY };
            }
        });
        e.preventDefault(); // Prevent scrolling
    }

    handleTouchEnd(e) {
        Array.from(e.changedTouches).forEach(touch => {
            if (this.activeTouches[touch.identifier] && this.activeTouches[touch.identifier].currentBar) {
                this.clearBarValue(this.activeTouches[touch.identifier].currentBar);
            }
            delete this.activeTouches[touch.identifier];
        });
    }

    getBarValue(index) {
        const bar = this.shadowRoot.querySelector(`.bar[data-index="${index}"]`);
        if (bar) {
            const height = parseFloat(bar.getAttribute("height"));
            const scaledValue = this.minValue + (height / this.svgHeight) * (this.maxValue - this.minValue);
            return scaledValue;
        }
        return null;
    }

    setBarValue(index, value) {
        const bar = this.shadowRoot.querySelector(`.bar[data-index="${index}"]`);
        if (bar) {
            const clampedValue = Math.max(this.minValue, Math.min(this.maxValue, value));
            const height = ((clampedValue - this.minValue) / (this.maxValue - this.minValue)) * this.svgHeight;
            bar.setAttribute("height", height);
            bar.setAttribute("y", this.svgHeight - height);
            this.updateBarValue(bar, height);
            setTimeout(() => this.clearBarValue(bar), 1000); // Clear value after a short delay
        }
    }
}

export { BarsComponent, OptionSquareComponent };
customElements.define("bars-component", BarsComponent);

