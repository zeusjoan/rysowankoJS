import { Point } from './models/Point.js';
import { Polygon } from './models/Polygon.js';
import { GridService } from './services/GridService.js';
import { DrawingService } from './services/DrawingService.js';
import { UIService } from './services/UIService.js';
import { DebugService } from './services/DebugService.js';

export class DrawingApp {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Inicjalizacja serwisów
        this.gridService = new GridService(this.ctx);
        this.drawingService = new DrawingService(this.ctx);
        this.uiService = new UIService();
        this.debugService = new DebugService();
        
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
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

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

    handleWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -5 : 5;
            const newGridSize = Math.round((this.gridService.gridSize + delta) / 5) * 5;
            
            if (newGridSize >= this.gridService.minGridSize && newGridSize <= this.gridService.maxGridSize) {
                // Zapisz aktualne pozycje punktów w metrach
                const pointsInMeters = new Map();
                this.points.forEach((point, id) => {
                    pointsInMeters.set(id, {
                        realX: point.realX,
                        realY: point.realY
                    });
                });

                // Zmień rozmiar siatki
                const oldGridSize = this.gridService.gridSize;
                this.gridService.setGridSize(newGridSize);

                // Przelicz pozycje punktów na nową siatkę
                pointsInMeters.forEach((coords, id) => {
                    const point = this.points.get(id);
                    // Zachowaj proporcje względem starej siatki
                    const scaleRatio = newGridSize / oldGridSize;
                    const newX = Math.round((point.x * scaleRatio) / newGridSize) * newGridSize;
                    const newY = Math.round((point.y * scaleRatio) / newGridSize) * newGridSize;
                    
                    point.x = newX;
                    point.y = newY;
                    point.realX = newX / 100;
                    point.realY = newY / 100;
                });

                // Aktualizuj input
                const gridSizeInput = document.getElementById('gridSize');
                if (gridSizeInput) {
                    gridSizeInput.value = newGridSize;
                }

                this.redraw();
            }
        }
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
            if (!polygon.isClosed && polygon.points.length > 0) {
                const lastPoint = this.points.get(polygon.points[polygon.points.length - 1]);
                // Sprawdzamy czy kursor jest blisko pierwszego punktu (do zamknięcia figury)
                if (polygon.points.length > 2) {
                    const firstPoint = this.points.get(polygon.points[0]);
                    const distanceToFirst = Math.sqrt(
                        Math.pow(firstPoint.x - coords.x, 2) + 
                        Math.pow(firstPoint.y - coords.y, 2)
                    );
                    if (distanceToFirst < 20) { // 20 pikseli tolerancji
                        this.currentMousePosition = firstPoint;
                    }
                }
            }
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
        const polygon = new Polygon(name, this.debugService);
        this.polygons.push(polygon);
        this.activePolygonIndex = this.polygons.length - 1;
        
        if (this.debugService) {
            this.debugService.log('DrawingApp', {
                action: 'createNewPolygon',
                name: name,
                index: this.activePolygonIndex
            });
        }
    }

    reset() {
        // Wyczyść wszystkie kolekcje
        this.points.clear();
        this.polygons = [];
        this.activePolygonIndex = -1;
        this.nextPointId = 0;
        this.firstPointInPolygon = null;
        this.currentMousePosition = null;

        // Zresetuj UI
        this.uiService.hideDistanceTooltip();
        this.uiService.hideAreaTooltip();
        this.uiService.updatePolygonInfo(this.polygons, this.activePolygonIndex, this.calculatePolygonArea.bind(this));

        // Wyczyść canvas
        this.drawingService.clear();
        this.gridService.drawGrid();

        // Zresetuj tryb rysowania
        this.drawingMode = 'polygon';
        document.getElementById('drawingMode').value = 'polygon';

        // Zresetuj rozmiar siatki
        const defaultGridSize = 10;
        this.gridService.setGridSize(defaultGridSize);
        document.getElementById('gridSize').value = defaultGridSize;

        // Odśwież canvas
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
        this.uiService.hideAreaTooltip(); // Dodane czyszczenie chmurki

        if (this.debugService) {
            this.debugService.log('DrawingApp', {
                action: 'redraw',
                activePolygonIndex: this.activePolygonIndex,
                totalPolygons: this.polygons.length,
                showDimensions: true
            });
        }

        // Rysuj wszystkie wielokąty
        this.polygons.forEach((polygon, index) => {
            this.ctx.strokeStyle = '#2196F3'; // jednolity kolor dla wszystkich zatwierdzonych linii
            polygon.draw(this.ctx, this.points, true);
        });

        // Rysuj aktualną linię
        if (this.currentMousePosition && this.activePolygonIndex !== -1) {
            const activePolygon = this.polygons[this.activePolygonIndex];
            if (!activePolygon.isClosed && activePolygon.points.length > 0) {
                const lastPoint = this.points.get(activePolygon.points[activePolygon.points.length - 1]);
                
                // Sprawdź czy linia jest prostopadła
                const dx = Math.abs(this.currentMousePosition.x - lastPoint.x);
                const dy = Math.abs(this.currentMousePosition.y - lastPoint.y);
                const tolerance = 0.1;
                const isOrthogonal = dx < tolerance || dy < tolerance;
                
                // Ustaw kolor w zależności od tego czy linia jest prostopadła
                this.ctx.strokeStyle = isOrthogonal ? '#4CAF50' : '#FF5722';
                
                this.ctx.beginPath();
                this.ctx.setLineDash([5, 5]);
                this.ctx.moveTo(lastPoint.x, lastPoint.y);
                this.ctx.lineTo(this.currentMousePosition.x, this.currentMousePosition.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                // Pokaż wymiar dla aktualnie rysowanej linii
                const distance = Math.sqrt(
                    Math.pow(this.currentMousePosition.x - lastPoint.x, 2) +
                    Math.pow(this.currentMousePosition.y - lastPoint.y, 2)
                ) / 100; // konwersja na metry

                const centerX = (lastPoint.x + this.currentMousePosition.x) / 2;
                const centerY = (lastPoint.y + this.currentMousePosition.y) / 2;

                this.ctx.save();
                this.ctx.translate(centerX, centerY);
                
                // Rysuj tło dla wymiaru
                this.ctx.font = '12px Arial';
                const text = `${distance.toFixed(2)}m`;
                const metrics = this.ctx.measureText(text);
                const padding = 4;
                
                // Przesuń etykietę nad linię
                const labelOffset = 15;
                this.ctx.translate(0, -labelOffset);
                
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.ctx.fillRect(
                    -metrics.width/2 - padding,
                    -8 - padding,
                    metrics.width + 2 * padding,
                    16 + 2 * padding
                );
                
                this.ctx.fillStyle = isOrthogonal ? '#4CAF50' : '#FF5722';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(text, 0, 0);
                this.ctx.restore();

                if (this.debugService) {
                    this.debugService.log('GuideLine', {
                        startPoint: { x: lastPoint.x, y: lastPoint.y },
                        endPoint: this.currentMousePosition,
                        isOrthogonal: isOrthogonal,
                        dx: dx,
                        dy: dy
                    });
                }
            }
        }
    }
}

// Inicjalizacja aplikacji
window.addEventListener('load', () => {
    window.app = new DrawingApp('canvas');
});
