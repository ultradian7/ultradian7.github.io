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
                font-size: 10px;
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

                // Add event listener for click/touch
                hexagonGroup.addEventListener("click", () => {
                    console.log(`Hexagon R${row+1}C${col+1}`);
                });
            }
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