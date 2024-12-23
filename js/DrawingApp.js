import { Point } from './models/Point.js';
import { Polygon } from './models/Polygon.js';
import { GridService } from './services/GridService.js';
import { DrawingService } from './services/DrawingService.js';
import { UIService } from './services/UIService.js';

export class DrawingApp {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Inicjalizacja serwisów
        this.gridService = new GridService(this.ctx);
        this.drawingService = new DrawingService(this.ctx);
        this.uiService = new UIService();
        
        // Stan aplikacji
        this.points = new Map();
        this.polygons = [];
        this.activePolygonIndex = -1;
        this.nextPointId = 1;
        this.selectedPoints = new Set();
        this.drawingMode = 'polygon';
        this.isDrawingLine = false;
        this.isFillMode = false;
        this.firstPointInPolygon = null;
        this.showDimensions = true;
        
        // Dodane: śledzenie aktualnej pozycji myszy
        this.currentMousePosition = null;
        
        this.setupEventListeners();
        this.createNewPolygon();
        this.gridService.drawGrid();
    }

    setupEventListeners() {
        // Obsługa przycisków trybu
        document.getElementById('drawPolygon').addEventListener('click', () => {
            this.drawingMode = 'polygon';
            this.updateDrawingModeButtons();
        });

        document.getElementById('drawLine').addEventListener('click', () => {
            this.drawingMode = 'line';
            this.isDrawingLine = true;
            this.updateDrawingModeButtons();
        });

        document.getElementById('fill').addEventListener('click', () => {
            this.drawingMode = 'fill';
            this.isFillMode = true;
            this.updateDrawingModeButtons();
        });

        // Obsługa canvas
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Obsługa skalowania siatki za pomocą kółka myszy
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const gridSizeInput = document.getElementById('gridSize');
                const currentSize = parseInt(gridSizeInput.value);
                const delta = e.deltaY > 0 ? -5 : 5; // Zmiana o 5 pikseli
                const newSize = Math.max(
                    this.gridService.minGridSize, 
                    Math.min(
                        this.gridService.maxGridSize, 
                        Math.round(currentSize / 5) * 5 + delta // Zaokrąglenie do wielokrotności 5
                    )
                );
                
                gridSizeInput.value = newSize;
                this.gridService.setGridSize(newSize);
                this.redraw();
            }
        }, { passive: false });

        // Obsługa klawiatury
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteSelectedPoints();
            }
        });

        // Pozostałe przyciski
        document.getElementById('reset').addEventListener('click', () => this.reset());
        document.getElementById('newPolygon').addEventListener('click', () => {
            this.createNewPolygon();
            this.redraw();
        });

        // Skala siatki
        document.getElementById('gridSize').addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            // Zaokrąglenie do najbliższej wielokrotności 5
            const newSize = Math.max(
                this.gridService.minGridSize,
                Math.min(
                    this.gridService.maxGridSize,
                    Math.round(value / 5) * 5
                )
            );
            e.target.value = newSize; // Aktualizacja wartości w polu input
            this.gridService.setGridSize(newSize);
            this.redraw();
        });

        // Obsługa checkboxa wymiarów
        document.getElementById('showDimensions').addEventListener('change', (e) => {
            this.showDimensions = e.target.checked;
            this.redraw();
        });
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const coords = this.gridService.screenToGrid(x, y);
        
        if (this.drawingMode === 'polygon') {
            const clickedPointId = this.findPointAt(coords);
            
            if (clickedPointId !== null) {
                if (clickedPointId === this.firstPointInPolygon && this.polygons[this.activePolygonIndex].points.length > 2) {
                    const polygon = this.polygons[this.activePolygonIndex];
                    if (polygon.close()) {
                        const area = this.calculatePolygonArea(polygon);
                        this.uiService.showAreaTooltip(e.clientX, e.clientY, area);
                        this.updatePolygonInfo();
                        this.createNewPolygon();
                    }
                }
                return;
            }

            if (this.activePolygonIndex === -1 || 
                !this.polygons[this.activePolygonIndex] || 
                this.polygons[this.activePolygonIndex].isClosed) {
                this.createNewPolygon();
            }

            const point = new Point(coords.x, coords.y, coords.realX, coords.realY);
            const pointId = this.nextPointId++;
            this.points.set(pointId, point);
            
            const polygon = this.polygons[this.activePolygonIndex];
            polygon.addPoint(pointId);
            
            if (polygon.points.length === 1) {
                this.firstPointInPolygon = pointId;
            }
            
            this.updatePolygonInfo();
            this.redraw();
        } else if (this.drawingMode === 'fill') {
            this.handleFillClick(e);
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const coords = this.gridService.screenToGrid(x, y);
        
        // Zapisz aktualną pozycję myszy
        this.currentMousePosition = coords;
        
        this.uiService.updateCoordinates(coords.realX, coords.realY);

        if (this.activePolygonIndex !== -1) {
            const polygon = this.polygons[this.activePolygonIndex];
            if (polygon.points.length > 0) {
                const lastPoint = this.points.get(polygon.points[polygon.points.length - 1]);
                const distance = Math.sqrt(
                    Math.pow(lastPoint.realX - coords.realX, 2) + 
                    Math.pow(lastPoint.realY - coords.realY, 2)
                );
                this.uiService.showDistanceTooltip(e.clientX, e.clientY, distance);
            } else {
                this.uiService.hideDistanceTooltip();
            }
        } else {
            this.uiService.hideDistanceTooltip();
        }

        this.redraw();
    }

    deleteSelectedPoints() {
        if (this.selectedPoints.size === 0) return;

        const polygon = this.polygons[this.activePolygonIndex];
        if (!polygon) return;

        polygon.points = polygon.points.filter(pointId => !this.selectedPoints.has(pointId));
        this.selectedPoints.forEach(pointId => this.points.delete(pointId));

        if (polygon.points.length === 0) {
            this.firstPointInPolygon = null;
            this.nextPointId = 1;
        } else {
            if (this.selectedPoints.has(this.firstPointInPolygon)) {
                this.firstPointInPolygon = polygon.points[0];
            }
            this.nextPointId = Math.max(...Array.from(this.points.keys())) + 1;
        }

        polygon.isClosed = false;
        this.selectedPoints.clear();
        this.updatePolygonInfo();
        this.redraw();
    }

    handleFillClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const coords = this.gridService.screenToGrid(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        const polygonIndex = this.findPolygonAtPoint(coords);
        
        if (polygonIndex !== -1) {
            const polygon = this.polygons[polygonIndex];
            if (!polygon.isClosed && polygon.points.length > 2) {
                polygon.close();
                const area = this.calculatePolygonArea(polygon);
                this.uiService.showAreaTooltip(e.clientX, e.clientY, area);
                this.updatePolygonInfo();
                this.redraw();
            }
        }
    }

    findPointAt(coords) {
        for (const [id, point] of this.points) {
            const distance = Math.sqrt(
                Math.pow(point.x - coords.x, 2) + 
                Math.pow(point.y - coords.y, 2)
            );
            if (distance < 5) return id;
        }
        return null;
    }

    findPolygonAtPoint(coords) {
        for (let i = this.polygons.length - 1; i >= 0; i--) {
            const polygon = this.polygons[i];
            if (polygon.points.length < 3) continue;

            const points = polygon.points.map(id => this.points.get(id));
            let inside = false;

            for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
                if (((points[j].y > coords.y) !== (points[k].y > coords.y)) &&
                    (coords.x < (points[k].x - points[j].x) * (coords.y - points[j].y) / 
                    (points[k].y - points[j].y) + points[j].x)) {
                    inside = !inside;
                }
            }

            if (inside) return i;
        }
        return -1;
    }

    calculatePolygonArea(polygon) {
        if (!polygon.isClosed || polygon.points.length < 3) return 0;
        
        const points = polygon.points.map(id => this.points.get(id));
        let area = 0;
        
        // Używamy wzoru na pole wielokąta z współrzędnych
        for (let i = 0; i < points.length - 1; i++) {
            area += (points[i].realX * points[i + 1].realY) - 
                   (points[i + 1].realX * points[i].realY);
        }
        
        return Math.abs(area / 2);
    }

    updatePolygonInfo() {
        this.uiService.updatePolygonInfo(
            this.polygons, 
            this.activePolygonIndex,
            (polygon) => this.calculatePolygonArea(polygon)
        );
    }

    createNewPolygon() {
        const name = document.getElementById('polygonName').value || `Figura ${this.polygons.length + 1}`;
        this.polygons.push(new Polygon(name));
        this.activePolygonIndex = this.polygons.length - 1;
        this.firstPointInPolygon = null;
    }

    reset() {
        this.points = new Map();
        this.polygons = [];
        this.activePolygonIndex = -1;
        this.nextPointId = 1;
        this.selectedPoints.clear();
        this.firstPointInPolygon = null;
        this.drawingMode = 'polygon';
        this.isDrawingLine = false;
        this.isFillMode = false;
        
        document.getElementById('polygonName').value = '';
        this.createNewPolygon();
        this.redraw();
    }

    updateDrawingModeButtons() {
        const buttons = {
            'drawPolygon': this.drawingMode === 'polygon',
            'drawLine': this.drawingMode === 'line',
            'fill': this.drawingMode === 'fill'
        };

        Object.entries(buttons).forEach(([id, active]) => {
            document.getElementById(id).classList.toggle('active', active);
        });
    }

    redraw() {
        this.drawingService.clear();
        this.gridService.drawGrid();

        // Rysuj wielokąty
        this.polygons.forEach(polygon => {
            if (polygon.points.length < 2) return;

            const points = polygon.points.map(id => this.points.get(id));
            
            // Rysuj linie między punktami i wymiary
            for (let i = 0; i < points.length - 1; i++) {
                const startPoint = points[i];
                const endPoint = points[i + 1];
                
                this.drawingService.drawLine(
                    startPoint.x, startPoint.y,
                    endPoint.x, endPoint.y
                );

                // Pokaż wymiary jeśli opcja jest włączona
                if (this.showDimensions) {
                    const distance = Math.sqrt(
                        Math.pow(endPoint.realX - startPoint.realX, 2) +
                        Math.pow(endPoint.realY - startPoint.realY, 2)
                    );

                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;

                    this.drawingService.drawDimensionLabel(
                        midX, midY,
                        `${distance.toFixed(2)}m`
                    );
                }
            }

            // Jeśli wielokąt jest zamknięty
            if (polygon.isClosed && points.length > 2) {
                // Rysuj linię zamykającą
                this.drawingService.drawLine(
                    points[points.length - 1].x, points[points.length - 1].y,
                    points[0].x, points[0].y
                );

                // Wypełnij wielokąt
                this.drawingService.fillPolygon(points);

                // Pokaż pole powierzchni jeśli opcja jest włączona
                if (this.showDimensions) {
                    const area = this.calculatePolygonArea(polygon);
                    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

                    this.drawingService.drawAreaLabel(
                        centerX, centerY,
                        `${area.toFixed(2)}m²`
                    );
                }
            }

            // Rysuj punkty
            points.forEach((point, i) => {
                this.drawingService.drawPoint(
                    point.x, point.y,
                    this.selectedPoints.has(polygon.points[i]),
                    polygon.points[i] === this.firstPointInPolygon
                );
            });
        });

        // Rysuj tymczasową linię
        if (this.currentMousePosition && this.activePolygonIndex !== -1) {
            const polygon = this.polygons[this.activePolygonIndex];
            if (polygon && polygon.points.length > 0 && !polygon.isClosed) {
                const lastPoint = this.points.get(polygon.points[polygon.points.length - 1]);
                this.drawingService.drawLine(
                    lastPoint.x, lastPoint.y,
                    this.currentMousePosition.x, this.currentMousePosition.y,
                    '#999'
                );

                // Pokaż wymiar tymczasowej linii
                if (this.showDimensions) {
                    const distance = Math.sqrt(
                        Math.pow(this.currentMousePosition.realX - lastPoint.realX, 2) +
                        Math.pow(this.currentMousePosition.realY - lastPoint.realY, 2)
                    );

                    const midX = (lastPoint.x + this.currentMousePosition.x) / 2;
                    const midY = (lastPoint.y + this.currentMousePosition.y) / 2;

                    this.drawingService.drawDimensionLabel(
                        midX, midY,
                        `${distance.toFixed(2)}m`
                    );
                }
            }
        }
    }
}

// Inicjalizacja aplikacji
window.addEventListener('load', () => {
    window.app = new DrawingApp('canvas');
});
