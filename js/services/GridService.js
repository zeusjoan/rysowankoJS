export class GridService {
    constructor(ctx, gridSize = 10) {
        this.ctx = ctx;
        this.gridSize = gridSize;
        this.minGridSize = 5;
        this.maxGridSize = 100;
        this.gridColor = 'rgba(255, 165, 0, 0.2)';
        this.pixelsPerMeter = 100; // 1 metr = 100 pikseli
    }

    setGridSize(size) {
        const newSize = Math.max(this.minGridSize, Math.min(this.maxGridSize, size));
        if (this.gridSize !== newSize) {
            this.gridSize = newSize;
            // Aktualizuj pole input jeśli istnieje
            const gridSizeInput = document.getElementById('gridSize');
            if (gridSizeInput) {
                gridSizeInput.value = this.gridSize;
            }
        }
    }

    drawGrid() {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;

        // Pionowe linie
        for (let x = 0; x <= width; x += this.gridSize) {
            this.ctx.moveTo(Math.floor(x) + 0.5, 0);
            this.ctx.lineTo(Math.floor(x) + 0.5, height);
        }

        // Poziome linie
        for (let y = 0; y <= height; y += this.gridSize) {
            this.ctx.moveTo(0, Math.floor(y) + 0.5);
            this.ctx.lineTo(width, Math.floor(y) + 0.5);
        }

        this.ctx.stroke();
    }

    screenToGrid(x, y) {
        // Pobierz aktualne wymiary canvasa
        const canvasRect = this.ctx.canvas.getBoundingClientRect();
        const scaleX = this.ctx.canvas.width / canvasRect.width;
        const scaleY = this.ctx.canvas.height / canvasRect.height;

        // Przeskaluj współrzędne ekranu na współrzędne canvasa
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;

        // Przyciągnij do najbliższej linii siatki
        const gridX = Math.round(canvasX / this.gridSize) * this.gridSize;
        const gridY = Math.round(canvasY / this.gridSize) * this.gridSize;

        return {
            x: gridX,
            y: gridY,
            realX: gridX / this.pixelsPerMeter,
            realY: gridY / this.pixelsPerMeter
        };
    }

    gridToPixels(gridX, gridY) {
        return {
            x: gridX * this.gridSize,
            y: gridY * this.gridSize
        };
    }

    metersToPixels(realX, realY) {
        const pixelX = realX * this.pixelsPerMeter;
        const pixelY = realY * this.pixelsPerMeter;
        return {
            x: Math.round(pixelX / this.gridSize) * this.gridSize,
            y: Math.round(pixelY / this.gridSize) * this.gridSize
        };
    }

    pixelsToMeters(pixelX, pixelY) {
        return {
            realX: pixelX / this.pixelsPerMeter,
            realY: pixelY / this.pixelsPerMeter
        };
    }
}
