class HexagonGrid extends HTMLElement {
    static get observedAttributes() {
        return ['cell-size', 'rows', 'cols'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.svgNamespace = "http://www.w3.org/2000/svg";
        this.cellSize = 50;
        this.rows = 12;
        this.cols = 10;
        this.cellValues = [];
        this.dragging = false;
        this.activeNotes = new Map();
        this.createTable();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            switch (name) {
                case 'cell-size':
                    this.cellSize = parseInt(newValue, 10);
                    break;
                case 'rows':
                    this.rows = parseInt(newValue, 10);
                    break;
                case 'cols':
                    this.cols = parseInt(newValue, 10);
                    break;
            }
            this.updateTable(this.rows, this.cols);
        }
    }

    setCellValues(values) {
        this.cellValues = values;
        this.updateTable(this.rows, this.cols);
    }

    createTable() {
        const style = document.createElement("style");
        style.textContent = `
            svg {
                font-family: Arial, sans-serif;
                -webkit-user-select: none; /* Safari */
                -moz-user-select: none;    /* Firefox */
                -ms-user-select: none;     /* Internet Explorer/Edge */
                user-select: none;         /* Non-prefixed version, currently supported by Chrome, Opera and Edge */
            }
        `;

        const svg = document.createElementNS(this.svgNamespace, "svg");
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(svg);

        this.updateTable(this.rows, this.cols);
    }

    drawTable(svg, rows, cols) {
        const cellSize = this.cellSize;
        const strokeColor = "white";

        // Calculate SVG width and height
        const width = Math.sqrt(3) * cellSize * (cols + 0.5);
        const height = (2 * cellSize) * (3 / 4) * (rows - 1) + 2 * cellSize;

        svg.setAttribute("width", width);
        svg.setAttribute("height", height);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const hexagonGroup = this.createHexagonGroup(col, row, cellSize, strokeColor);
                svg.appendChild(hexagonGroup);

                // Add event listeners for mouse and touch
                hexagonGroup.addEventListener("mousedown", (e) => this.handleMouseDown(e, row, col));
                hexagonGroup.addEventListener("mouseup", (e) => this.handleMouseUp(e, row, col));
                hexagonGroup.addEventListener("touchstart", (e) => this.handleTouchStart(e, row, col));
                hexagonGroup.addEventListener("touchend", (e) => this.handleTouchEnd(e, row, col));
            }
        }

        // Add global event listeners for mouse and touch move
        svg.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        svg.addEventListener("touchmove", (e) => this.handleTouchMove(e));
    }

    handleMouseDown(event, row, col) {
        this.dragging = true;
        this.dispatchCustomNoteEvent("mousedown", row, col);
    }

    handleMouseUp(event, row, col) {
        this.dragging = false;
        this.dispatchCustomNoteEvent("mouseup", row, col);
        this.clearActiveNotes();
    }

    handleTouchStart(event, row, col) {
        this.dragging = true;
        Array.from(event.changedTouches).forEach(touch => {
            const [touchRow, touchCol] = this.getRowColFromTouch(touch);
            this.dispatchCustomNoteEvent("touchstart", touchRow, touchCol, touch.identifier);
        });
    }

    handleTouchEnd(event, row, col) {
        this.dragging = false;
        Array.from(event.changedTouches).forEach(touch => {
            const [touchRow, touchCol] = this.getRowColFromTouch(touch);
            this.dispatchCustomNoteEvent("touchend", touchRow, touchCol, touch.identifier);
        });
        this.clearActiveNotes();
    }

    handleMouseMove(event) {
        if (this.dragging) {
            const [row, col] = this.getRowColFromEvent(event);
            this.dispatchCustomNoteEvent("mousemove", row, col);
        }
    }

    handleTouchMove(event) {
        if (this.dragging) {
            Array.from(event.changedTouches).forEach(touch => {
                const [touchRow, touchCol] = this.getRowColFromTouch(touch);
                this.dispatchCustomNoteEvent("touchmove", touchRow, touchCol, touch.identifier);
            });
        }
    }

    getRowColFromEvent(event) {
        const svg = this.shadowRoot.querySelector("svg");
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return this.calculateRowColFromCoords(x, y);
    }

    getRowColFromTouch(touch) {
        const svg = this.shadowRoot.querySelector("svg");
        const rect = svg.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        return this.calculateRowColFromCoords(x, y);
    }

    calculateRowColFromCoords(x, y) {
        const cellSize = this.cellSize;
        const width = Math.sqrt(3) * cellSize;
        const height = 2 * cellSize;
        const row = Math.floor(y / (3 / 4 * height));
        const col = Math.floor((x - (row % 2) * (width / 2)) / width);
        return [row, col];
    }

    dispatchCustomNoteEvent(eventType, row, col, identifier = null) {
        const index = row * this.cols + col;
        if (index >= 0 && index < this.cellValues.length) {
            const value = this.cellValues[index] !== undefined ? this.cellValues[index] : `R${row+1}C${col+1}`;
            const noteKey = identifier !== null ? `${value}-${identifier}` : value;

            if (eventType === "mousemove" || eventType === "touchmove") {
                if (!this.activeNotes.has(noteKey)) {
                    this.clearActiveNoteForIdentifier(identifier);
                    this.activeNotes.set(noteKey, value);
                    this.dispatchEvent(new CustomEvent("hexagon-note", {
                        detail: { row: row + 1, col: col + 1, noteType: "start-drag", value: value }
                    }));
                }
            } else {
                this.dispatchEvent(new CustomEvent("hexagon-note", {
                    detail: { row: row + 1, col: col + 1, noteType: eventType, value: value }
                }));
            }
        }
    }

    clearActiveNotes() {
        this.activeNotes.forEach((value, key) => {
            this.dispatchEvent(new CustomEvent("hexagon-note", {
                detail: { noteType: "stop-drag", value: value }
            }));
        });
        this.activeNotes.clear();
    }

    clearActiveNoteForIdentifier(identifier) {
        if (identifier !== null) {
            const keysToDelete = [];
            this.activeNotes.forEach((value, key) => {
                if (key.endsWith(`-${identifier}`)) {
                    this.dispatchEvent(new CustomEvent("hexagon-note", {
                        detail: { noteType: "stop-drag", value: value }
                    }));
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach(key => this.activeNotes.delete(key));
        }
    }

    createHexagonGroup(col, row, size, strokeColor) {
        const group = document.createElementNS(this.svgNamespace, "g");
        const hexagon = this.createHexagon(col, row, size, strokeColor);
        const [cx, cy] = this.hexagonCenter(col, row, size);

        const text = document.createElementNS(this.svgNamespace, "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy);
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("stroke", strokeColor);

        const index = row * this.cols + col;
        text.textContent = this.cellValues[index] !== undefined ? this.cellValues[index] : `R${row+1}C${col+1}`;

        group.appendChild(hexagon);
        group.appendChild(text);

        return group;
    }

    createHexagon(col, row, size, strokeColor) {
        const points = this.calculateHexagonPoints(col, row, size);
        const hexagon = document.createElementNS(this.svgNamespace, "polygon");
        hexagon.setAttribute("points", points.join(" "));
        hexagon.setAttribute("stroke", strokeColor);
        hexagon.setAttribute("fill", "black");
        return hexagon;
    }

    calculateHexagonPoints(col, row, size) {
        const width = Math.sqrt(3) * size;
        const height = 2 * size;
        const xOffset = width * (col + 0.5 * (row % 2));
        const yOffset = height * (3 / 4) * row;

        return [
            [xOffset + width / 2, yOffset],
            [xOffset + width, yOffset + height / 4],
            [xOffset + width, yOffset + 3 * height / 4],
            [xOffset + width / 2, yOffset + height],
            [xOffset, yOffset + 3 * height / 4],
            [xOffset, yOffset + height / 4]
        ];
    }

    hexagonCenter(col, row, size) {
        const width = Math.sqrt(3) * size;
        const height = 2 * size;
        const xOffset = width * (col + 0.5 * (row % 2));
        const yOffset = height * (3 / 4) * row;

        return [xOffset + width / 2, yOffset + height / 2];
    }

    // Method to update the table
    updateTable(rows, cols) {
        const svg = this.shadowRoot.querySelector("svg");
        // Clear existing SVG content
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        // Draw new table
        this.drawTable(svg, rows, cols);
    }
}

customElements.define("hexagon-grid", HexagonGrid);

export { HexagonGrid };
