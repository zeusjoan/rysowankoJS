class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 10; // Domyślna skala: 10px = 0.1m
        this.minGridSize = 5;
        this.maxGridSize = 100;
        this.points = new Map(); // Mapa punktów: id -> {x, y, realX, realY}
        this.polygons = [];
        this.activePolygonIndex = -1;
        this.nextPointId = 1;
        this.firstPointInPolygon = null;
        this.tempPoints = [];
        
        this.setupEventListeners();
        this.createNewPolygon();
        this.drawGrid();
    }

    // Konwersja współrzędnych rzeczywistych (w metrach) na piksele
    realToPixel(realCoord) {
        return realCoord * (this.gridSize / 0.1);
    }

    // Konwersja współrzędnych w pikselach na rzeczywiste (w metrach)
    pixelToReal(pixelCoord) {
        return pixelCoord / (this.gridSize / 0.1);
    }

    screenToGrid(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        // Zaokrąglij do najbliższego punktu siatki
        const gridX = Math.round(canvasX / this.gridSize) * this.gridSize;
        const gridY = Math.round(canvasY / this.gridSize) * this.gridSize;
        
        // Przelicz na metry
        // Przy gridSize = 10px, jeden segment siatki = 0.1m
        const realX = (gridX / this.gridSize) * 0.1;
        const realY = (gridY / this.gridSize) * 0.1;
        
        return {
            x: gridX,
            y: gridY,
            realX: realX,
            realY: realY
        };
    }

    addTempPoint(x, y, realX, realY) {
        const id = this.nextPointId++;
        this.points.set(id, {x, y, realX, realY});
        this.tempPoints.push(id);
        
        if (this.tempPoints.length > 1) {
            const prevPointId = this.tempPoints[this.tempPoints.length - 2];
            this.addLine(prevPointId, id);
        }
        
        this.redraw();
        return id;
    }

    handleCanvasClick(e) {
        const coords = this.screenToGrid(e.clientX, e.clientY);
        
        if (this.tempPoints.length === 0) {
            this.firstPointInPolygon = this.addTempPoint(coords.x, coords.y, coords.realX, coords.realY);
            return;
        }
        
        const firstPoint = this.points.get(this.firstPointInPolygon);
        const distance = Math.sqrt(
            Math.pow(firstPoint.realX - coords.realX, 2) + 
            Math.pow(firstPoint.realY - coords.realY, 2)
        );
        
        if (distance < 0.05 && this.tempPoints.length > 2) { // Tolerancja 5cm
            this.finishPolygon();
        } else {
            this.addTempPoint(coords.x, coords.y, coords.realX, coords.realY);
        }
    }

    handleMouseMove(e) {
        const coords = this.screenToGrid(e.clientX, e.clientY);
        document.getElementById('coordinates').textContent = 
            `Współrzędne: ${coords.realX.toFixed(2)}m, ${coords.realY.toFixed(2)}m`;
        
        if (this.tempPoints.length > 0) {
            const lastPoint = this.points.get(this.tempPoints[this.tempPoints.length - 1]);
            this.tempLine = {
                start: {x: lastPoint.x, y: lastPoint.y},
                end: {x: coords.x, y: coords.y}
            };
            
            if (this.tempPoints.length > 2) {
                const firstPoint = this.points.get(this.firstPointInPolygon);
                const distance = Math.sqrt(
                    Math.pow(firstPoint.realX - coords.realX, 2) + 
                    Math.pow(firstPoint.realY - coords.realY, 2)
                );
                
                if (distance < 0.05) { // Zmniejszona tolerancja dociągania do 5cm
                    this.tempLine.end = {x: firstPoint.x, y: firstPoint.y};
                }
            }
            
            this.redraw();
        }
    }

    setupEventListeners() {
        document.getElementById('gridSize').addEventListener('change', (e) => {
            const newSize = parseInt(e.target.value);
            if (newSize >= this.minGridSize && newSize <= this.maxGridSize) {
                this.updateGridSize(newSize);
            }
        });

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -5 : 5;
                const newGridSize = Math.max(
                    this.minGridSize,
                    Math.min(this.maxGridSize, this.gridSize + delta)
                );
                
                if (newGridSize !== this.gridSize) {
                    this.updateGridSize(newGridSize);
                }
            }
        });
        
        document.getElementById('newPolygon').addEventListener('click', () => this.createNewPolygon());
        document.getElementById('reset').addEventListener('click', () => this.reset());
    }

    updateGridSize(newSize) {
        this.gridSize = newSize;
        document.getElementById('gridSize').value = this.gridSize;
        
        // Przelicz pozycje wszystkich punktów
        this.points.forEach((point, id) => {
            point.x = this.realToPixel(point.realX);
            point.y = this.realToPixel(point.realY);
        });
        
        this.redraw();
    }

    redraw() {
        this.drawGrid();
        
        // Rysowanie wielokątów
        this.polygons.forEach((polygon, index) => {
            if (polygon.points.length < 3) return;
            
            this.ctx.strokeStyle = polygon.color;
            this.ctx.lineWidth = 2;
            
            if (polygon.isClosed) {
                this.ctx.fillStyle = polygon.color.replace(')', ', 0.2)');
                this.ctx.beginPath();
                
                polygon.points.forEach((pointId, i) => {
                    const point = this.points.get(pointId);
                    if (i === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                });
                
                this.ctx.closePath();
                this.ctx.fill();
            }
            
            polygon.lines.forEach(line => {
                const point1 = this.points.get(line.id1);
                const point2 = this.points.get(line.id2);
                
                if (point1 && point2) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(point1.x, point1.y);
                    this.ctx.lineTo(point2.x, point2.y);
                    this.ctx.stroke();
                    
                    this.drawLineLength(point1, point2);
                }
            });
        });
        
        if (this.tempLine) {
            this.ctx.strokeStyle = '#999';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.tempLine.start.x, this.tempLine.start.y);
            this.ctx.lineTo(this.tempLine.end.x, this.tempLine.end.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            this.drawLineLength(this.tempLine.start, this.tempLine.end);
        }
        
        this.points.forEach((point, id) => {
            const isFirstPoint = id === this.firstPointInPolygon;
            const radius = isFirstPoint ? 6 : 4;
            
            this.ctx.fillStyle = isFirstPoint ? '#00ff00' : '#333';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(id.toString(), point.x + 8, point.y - 8);
        });
    }

    createNewPolygon() {
        this.polygons.push({
            points: [],
            lines: [],
            name: '',
            isClosed: false,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
        this.activePolygonIndex = this.polygons.length - 1;
        this.tempPoints = [];
        this.firstPointInPolygon = null;
        this.updatePolygonInfo();
        
        document.getElementById('polygonName').value = '';
    }

    updatePolygonInfo() {
        const activePolygon = document.getElementById('activePolygon');
        const polygonList = document.getElementById('polygonList');
        
        if (this.activePolygonIndex === -1) {
            activePolygon.textContent = 'Aktywna figura: brak';
            polygonList.textContent = 'Figury: brak';
            return;
        }
        
        const current = this.polygons[this.activePolygonIndex];
        activePolygon.textContent = `Aktywna figura: ${current.name || 'bez nazwy'}`;
        
        const closedPolygons = this.polygons
            .filter(p => p.isClosed)
            .map(p => p.name)
            .join(', ');
        polygonList.textContent = `Figury: ${closedPolygons || 'brak'}`;
    }

    finishPolygon() {
        if (this.tempPoints.length < 3) return;
        
        const name = document.getElementById('polygonName').value.trim() || `Figura ${this.polygons.length + 1}`;
        
        this.addLine(this.tempPoints[this.tempPoints.length - 1], this.firstPointInPolygon);
        
        const activePolygon = this.polygons[this.activePolygonIndex];
        activePolygon.points = [...this.tempPoints];
        activePolygon.name = name;
        activePolygon.isClosed = true;
        
        this.tempPoints = [];
        this.firstPointInPolygon = null;
        this.tempLine = null;
        
        this.updatePolygonInfo();
        this.createNewPolygon();
        this.redraw();
    }

    addLine(id1, id2) {
        if (this.activePolygonIndex === -1) return;
        
        const point1 = this.points.get(id1);
        const point2 = this.points.get(id2);
        
        if (point1 && point2) {
            const polygon = this.polygons[this.activePolygonIndex];
            const lineExists = polygon.lines.some(line => 
                (line.id1 === id1 && line.id2 === id2) || 
                (line.id1 === id2 && line.id2 === id1)
            );
            
            if (!lineExists) {
                polygon.lines.push({id1, id2});
            }
        }
    }

    reset() {
        this.points.clear();
        this.polygons = [];
        this.activePolygonIndex = -1;
        this.nextPointId = 1;
        this.firstPointInPolygon = null;
        this.tempPoints = [];
        this.tempLine = null;
        this.createNewPolygon();
        this.redraw();
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    calculateLineLength(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        // Długość w pikselach
        const lengthInPixels = Math.sqrt(dx * dx + dy * dy);
        // Konwersja na metry
        // Przy gridSize = 10px, 10px = 0.1m
        return ((lengthInPixels / this.gridSize) * 0.1).toFixed(2);
    }

    drawLineLength(start, end) {
        const length = this.calculateLineLength(start, end);
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        
        let angle = Math.atan2(end.y - start.y, end.x - start.x);
        
        if (angle > Math.PI/2 || angle < -Math.PI/2) {
            angle += Math.PI; 
        }
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(angle);
        
        this.ctx.font = '12px Arial';
        const text = `${length}m`;
        const textWidth = this.ctx.measureText(text).width;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-textWidth/2 - 4, -10, textWidth + 8, 20);
        
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, 0, 0);
        
        this.ctx.restore();
    }
}

window.addEventListener('load', () => {
    window.app = new DrawingApp();
});
