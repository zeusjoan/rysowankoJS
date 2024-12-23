class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 50;
        this.points = new Map(); // Mapa punktów: id -> {x, y}
        this.polygons = []; // Lista wielokątów
        this.activePolygonIndex = -1;
        this.nextPointId = 1;
        this.firstPointInPolygon = null;
        this.tempPoints = []; // Tymczasowe punkty dla aktualnie rysowanej figury
        
        this.setupEventListeners();
        this.createNewPolygon();
        this.drawGrid();
    }

    setupEventListeners() {
        // Obsługa zmiany rozmiaru siatki
        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.redraw();
        });

        // Obsługa myszy na canvas
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Obsługa przycisków
        document.getElementById('newPolygon').addEventListener('click', () => this.createNewPolygon());
        document.getElementById('reset').addEventListener('click', () => this.reset());
    }

    handleCanvasClick(e) {
        const coords = this.screenToGrid(e.clientX, e.clientY);
        
        // Jeśli to pierwszy punkt
        if (this.tempPoints.length === 0) {
            this.firstPointInPolygon = this.addTempPoint(coords.x, coords.y);
            return;
        }
        
        // Sprawdź, czy kliknięto blisko pierwszego punktu
        const firstPoint = this.points.get(this.firstPointInPolygon);
        const distance = Math.sqrt(
            Math.pow(firstPoint.x - coords.x, 2) + 
            Math.pow(firstPoint.y - coords.y, 2)
        );
        
        if (distance < 10 && this.tempPoints.length > 2) {
            // Zamknij wielokąt
            this.finishPolygon();
        } else {
            // Dodaj nowy punkt
            this.addTempPoint(coords.x, coords.y);
        }
    }

    handleMouseMove(e) {
        const coords = this.screenToGrid(e.clientX, e.clientY);
        document.getElementById('coordinates').textContent = `Współrzędne: ${coords.x/this.gridSize}m, ${coords.y/this.gridSize}m`;
        
        // Pokaż linię prowadzącą od ostatniego punktu
        if (this.tempPoints.length > 0) {
            const lastPoint = this.points.get(this.tempPoints[this.tempPoints.length - 1]);
            this.tempLine = {
                start: lastPoint,
                end: coords
            };
            
            // Jeśli jesteśmy blisko pierwszego punktu i mamy wystarczającą liczbę punktów
            if (this.tempPoints.length > 2) {
                const firstPoint = this.points.get(this.firstPointInPolygon);
                const distance = Math.sqrt(
                    Math.pow(firstPoint.x - coords.x, 2) + 
                    Math.pow(firstPoint.y - coords.y, 2)
                );
                
                if (distance < 10) {
                    this.tempLine.end = firstPoint;
                }
            }
            
            this.redraw();
        }
    }

    addTempPoint(x, y) {
        const id = this.nextPointId++;
        this.points.set(id, {x, y});
        this.tempPoints.push(id);
        
        // Jeśli mamy więcej niż jeden punkt, dodaj linię
        if (this.tempPoints.length > 1) {
            const prevPointId = this.tempPoints[this.tempPoints.length - 2];
            this.addLine(prevPointId, id);
        }
        
        this.redraw();
        return id;
    }

    finishPolygon() {
        if (this.tempPoints.length < 3) return;
        
        const name = document.getElementById('polygonName').value.trim() || `Figura ${this.polygons.length + 1}`;
        
        // Dodaj ostatnią linię zamykającą
        this.addLine(this.tempPoints[this.tempPoints.length - 1], this.firstPointInPolygon);
        
        // Zapisz punkty do aktywnego wielokąta
        const activePolygon = this.polygons[this.activePolygonIndex];
        activePolygon.points = [...this.tempPoints];
        activePolygon.name = name;
        activePolygon.isClosed = true;
        
        // Wyczyść tymczasowe punkty
        this.tempPoints = [];
        this.firstPointInPolygon = null;
        this.tempLine = null;
        
        // Aktualizuj informacje
        this.updatePolygonInfo();
        this.createNewPolygon();
        this.redraw();
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
        
        // Wyczyść pole nazwy
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
        
        // Aktualizuj listę figur
        const closedPolygons = this.polygons
            .filter(p => p.isClosed)
            .map(p => p.name)
            .join(', ');
        polygonList.textContent = `Figury: ${closedPolygons || 'brak'}`;
    }

    redraw() {
        this.drawGrid();
        
        // Rysowanie wielokątów
        this.polygons.forEach((polygon, index) => {
            if (polygon.points.length < 3) return;
            
            this.ctx.strokeStyle = polygon.color;
            this.ctx.lineWidth = 2;
            
            // Wypełnienie dla zamkniętych wielokątów
            if (polygon.isClosed) {
                this.ctx.fillStyle = polygon.color.replace(')', ', 0.2)');
                this.ctx.beginPath();
                
                // Rysuj ścieżkę wielokąta
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
            
            // Rysowanie linii i ich długości
            polygon.lines.forEach(line => {
                const point1 = this.points.get(line.id1);
                const point2 = this.points.get(line.id2);
                
                if (point1 && point2) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(point1.x, point1.y);
                    this.ctx.lineTo(point2.x, point2.y);
                    this.ctx.stroke();
                    
                    // Rysuj długość linii
                    this.drawLineLength(point1, point2);
                }
            });
        });
        
        // Rysowanie tymczasowej linii
        if (this.tempLine) {
            this.ctx.strokeStyle = '#999';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.tempLine.start.x, this.tempLine.start.y);
            this.ctx.lineTo(this.tempLine.end.x, this.tempLine.end.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Rysuj długość tymczasowej linii
            this.drawLineLength(this.tempLine.start, this.tempLine.end);
        }
        
        // Rysowanie punktów
        this.points.forEach((point, id) => {
            const isFirstPoint = id === this.firstPointInPolygon;
            const radius = isFirstPoint ? 6 : 4;
            
            this.ctx.fillStyle = isFirstPoint ? '#00ff00' : '#333';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Wyświetlanie ID punktu
            this.ctx.fillStyle = '#000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(id.toString(), point.x + 8, point.y - 8);
        });
    }

    addLine(id1, id2) {
        if (this.activePolygonIndex === -1) return;
        
        const point1 = this.points.get(id1);
        const point2 = this.points.get(id2);
        
        if (point1 && point2) {
            const polygon = this.polygons[this.activePolygonIndex];
            // Sprawdź, czy linia już nie istnieje
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

        // Linie pionowe
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Linie poziome
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    screenToGrid(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        return {
            x: Math.round(canvasX / this.gridSize) * this.gridSize,
            y: Math.round(canvasY / this.gridSize) * this.gridSize
        };
    }

    // Obliczanie długości linii w metrach
    calculateLineLength(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        // Długość w pikselach
        const lengthInPixels = Math.sqrt(dx * dx + dy * dy);
        // Konwersja na metry (dzielimy przez rozmiar siatki)
        return lengthInPixels / this.gridSize;
    }

    // Rysowanie długości linii
    drawLineLength(start, end) {
        const length = this.calculateLineLength(start, end);
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        
        // Oblicz kąt linii
        let angle = Math.atan2(end.y - start.y, end.x - start.x);
        
        // Dostosuj kąt tak, aby tekst był zawsze czytelny
        if (angle > Math.PI/2 || angle < -Math.PI/2) {
            angle += Math.PI; // Obróć tekst o 180 stopni
        }
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(angle);
        
        // Rysuj tło dla tekstu
        this.ctx.font = '12px Arial';
        const text = `${length.toFixed(2)}m`;
        const textWidth = this.ctx.measureText(text).width;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-textWidth/2 - 4, -10, textWidth + 8, 20);
        
        // Rysuj tekst
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, 0, 0);
        
        this.ctx.restore();
    }
}

// Inicjalizacja aplikacji
window.addEventListener('load', () => {
    window.app = new DrawingApp();
});
