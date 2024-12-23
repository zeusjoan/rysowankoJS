export class GridService {
    constructor(ctx, gridSize = 10) {
        this.ctx = ctx;
        this.gridSize = gridSize;
        this.minGridSize = 5;
        this.maxGridSize = 100;
        this.gridColor = 'rgba(255, 165, 0, 0.2)'; // Wyblakły pomarańczowy
    }

    setGridSize(size) {
        this.gridSize = Math.max(this.minGridSize, Math.min(this.maxGridSize, size));
    }

    drawGrid() {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;

        // Pionowe linie
        for (let x = 0; x <= width; x += this.gridSize) {
            this.ctx.moveTo(x + 0.5, 0); // +0.5 dla ostrych linii
            this.ctx.lineTo(x + 0.5, height);
        }

        // Poziome linie
        for (let y = 0; y <= height; y += this.gridSize) {
            this.ctx.moveTo(0, y + 0.5); // +0.5 dla ostrych linii
            this.ctx.lineTo(width, y + 0.5);
        }

        this.ctx.stroke();
    }

    screenToGrid(x, y) {
        // Konwersja współrzędnych ekranu na współrzędne siatki
        const canvasRect = this.ctx.canvas.getBoundingClientRect();
        const scaleX = this.ctx.canvas.width / canvasRect.width;
        const scaleY = this.ctx.canvas.height / canvasRect.height;
        
        // Przeskaluj współrzędne
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        
        // Przyciągnij do najbliższej linii siatki
        const gridX = Math.round(scaledX / this.gridSize) * this.gridSize;
        const gridY = Math.round(scaledY / this.gridSize) * this.gridSize;

        return {
            x: gridX,
            y: gridY,
            realX: gridX / 100, // Konwersja na metry (1 piksel = 0.01m)
            realY: gridY / 100
        };
    }
}
