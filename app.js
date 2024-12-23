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
        this.tempLine = null;
        
        // Dodane zmienne dla zaznaczania
        this.selectedPoints = new Set();
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDragging = false;
        
        // Tryb rysowania
        this.drawingMode = 'polygon'; // 'polygon' lub 'line'
        this.lineStartPoint = null;
        this.isDrawingLine = false;

        // Tooltip dla odległości
        this.tooltip = document.getElementById('distanceTooltip');
        
        this.setupEventListeners();
        this.createNewPolygon();
        this.drawGrid();
    }

    setupEventListeners() {
        // Przyciski trybu rysowania
        document.getElementById('drawPolygon').addEventListener('click', () => {
            this.drawingMode = 'polygon';
            this.updateDrawingModeButtons();
        });

        document.getElementById('drawLine').addEventListener('click', () => {
            this.drawingMode = 'line';
            this.isDrawingLine = true;
            this.updateDrawingModeButtons();
        });

        document.getElementById('gridSize').addEventListener('change', (e) => {
            const newSize = parseInt(e.target.value);
            if (newSize >= this.minGridSize && newSize <= this.maxGridSize) {
                this.updateGridSize(newSize);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (!e.metaKey) {  
                if (this.drawingMode === 'polygon') {
                    this.handlePolygonClick(e);
                } else {
                    this.handleLineClick(e);
                }
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.metaKey) {  
                this.isSelecting = true;
                this.selectionStart = { x: e.clientX - this.canvas.getBoundingClientRect().left, y: e.clientY - this.canvas.getBoundingClientRect().top };
                this.selectionEnd = { ...this.selectionStart };
                
                // Sprawdź, czy kliknięto punkt
                const clickedPoint = this.findPointAtPosition(e.clientX, e.clientY);
                if (clickedPoint) {
                    if (this.selectedPoints.has(clickedPoint)) {
                        this.selectedPoints.delete(clickedPoint);
                    } else {
                        this.selectedPoints.add(clickedPoint);
                    }
                    this.redraw();
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isSelecting && e.metaKey) {  
                this.selectionEnd = { x: e.clientX - this.canvas.getBoundingClientRect().left, y: e.clientY - this.canvas.getBoundingClientRect().top };
                this.redraw();
            } else {
                this.handleMouseMove(e);
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isSelecting) {
                this.isSelecting = false;
                if (this.selectionStart && this.selectionEnd) {
                    this.selectPointsInArea();
                }
                this.redraw();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedPoints.size > 0) {
                e.preventDefault(); // Zapobiegamy domyślnej akcji przeglądarki
                this.deleteSelectedPoints();
            }
            
            // Obsługa klawisza ESC
            if (e.key === 'Escape') {
                if (this.drawingMode === 'line' && this.isDrawingLine) {
                    // Zakończ rysowanie linii
                    this.finishLine();
                }
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            if (e.metaKey) {
                e.preventDefault();
                // Obliczamy zmianę skali bazując na deltaY, ale z mniejszym współczynnikiem
                const scaleFactor = 0.5; // Współczynnik zmiany - można dostosować
                const delta = (e.deltaY > 0 ? 1 : -1) * scaleFactor;
                
                // Obliczamy nową skalę z jednym miejscem po przecinku
                const newGridSize = Math.round((this.gridSize - delta) * 10) / 10;
                
                // Ograniczamy zakres
                const clampedGridSize = Math.max(
                    this.minGridSize,
                    Math.min(this.maxGridSize, newGridSize)
                );
                
                if (clampedGridSize !== this.gridSize) {
                    this.updateGridSize(clampedGridSize);
                    
                    // Aktualizujemy pole input
                    const gridSizeInput = document.getElementById('gridSize');
                    gridSizeInput.value = clampedGridSize;
                }
            }
        });
        
        document.getElementById('newPolygon').addEventListener('click', () => this.createNewPolygon());
        document.getElementById('reset').addEventListener('click', () => this.reset());
    }

    updateDrawingModeButtons() {
        const polygonButton = document.getElementById('drawPolygon');
        const lineButton = document.getElementById('drawLine');
        
        if (this.drawingMode === 'polygon') {
            polygonButton.classList.add('active');
            lineButton.classList.remove('active');
        } else {
            lineButton.classList.add('active');
            polygonButton.classList.remove('active');
        }
    }

    handleLineClick(e) {
        const coords = this.screenToGrid(e.clientX, e.clientY);
        
        // Rozpocznij rysowanie linii, jeśli jeszcze nie rozpoczęto
        if (!this.isDrawingLine) {
            this.isDrawingLine = true;
        }
        
        // Dodaj nowy punkt bez resetowania poprzednich wielokątów
        const id = this.nextPointId++;
        this.points.set(id, {x: coords.x, y: coords.y, realX: coords.realX, realY: coords.realY});
        
        // Jeśli to pierwszy punkt w nowej linii
        if (this.tempPoints.length === 0) {
            this.tempPoints = [id];
        } else {
            this.tempPoints.push(id);
            
            // Dodaj linię między poprzednim a obecnym punktem
            const prevPointId = this.tempPoints[this.tempPoints.length - 2];
            const currentPointId = id;
            
            // Dodaj linię do aktywnego wielokąta
            if (!this.polygons[this.activePolygonIndex].lines) {
                this.polygons[this.activePolygonIndex].lines = [];
            }
            this.polygons[this.activePolygonIndex].lines.push({
                id1: prevPointId,
                id2: currentPointId
            });
        }
        
        this.redraw();
    }

    handlePolygonClick(e) {
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
            // Zamykamy wielokąt dodając pierwszy punkt jako ostatni
            const currentPolygon = this.polygons[this.activePolygonIndex];
            currentPolygon.points = [...this.tempPoints];
            currentPolygon.points.push(this.firstPointInPolygon);
            currentPolygon.isClosed = true;
            currentPolygon.name = document.getElementById('polygonName').value || `Wielokąt ${this.polygons.length}`;
            
            // Resetujemy stan rysowania
            this.tempPoints = [];
            this.firstPointInPolygon = null;
            this.tempLine = null;
            
            // Tworzymy nowy wielokąt
            this.createNewPolygon();
            this.updatePolygonInfo();
            this.clearTooltip();
        } else {
            this.addTempPoint(coords.x, coords.y, coords.realX, coords.realY);
        }
        
        this.redraw();
    }

    handleMouseMove(e) {
        const coords = this.screenToGrid(e.clientX, e.clientY);
        document.getElementById('coordinates').textContent = 
            `Współrzędne: ${coords.realX.toFixed(2)}m, ${coords.realY.toFixed(2)}m`;
        
        if (this.isSelecting && e.metaKey) {
            this.selectionEnd = { 
                x: e.clientX - this.canvas.getBoundingClientRect().left, 
                y: e.clientY - this.canvas.getBoundingClientRect().top 
            };
            this.redraw();
            return;
        }

        // Wyświetlanie odległości
        if (this.tempPoints.length > 0) {
            const lastPoint = this.points.get(this.tempPoints[this.tempPoints.length - 1]);
            const distance = Math.sqrt(
                Math.pow(lastPoint.realX - coords.realX, 2) + 
                Math.pow(lastPoint.realY - coords.realY, 2)
            );
            
            // Aktualizacja pozycji i treści chmurki
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = (e.clientX + 15) + 'px';
            this.tooltip.style.top = (e.clientY + 15) + 'px';
            this.tooltip.textContent = `Odległość: ${distance.toFixed(2)}m`;
        } else {
            this.tooltip.style.display = 'none';
        }

        // Aktualizacja linii prowadzącej
        if (this.tempPoints.length > 0) {
            const lastPoint = this.points.get(this.tempPoints[this.tempPoints.length - 1]);
            this.tempLine = {
                start: { x: lastPoint.x, y: lastPoint.y },
                end: { x: coords.x, y: coords.y }
            };
            this.redraw();
        }
    }

    findPointAtPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        for (const [id, point] of this.points) {
            const distance = Math.sqrt(
                Math.pow(point.x - x, 2) + 
                Math.pow(point.y - y, 2)
            );
            
            if (distance < 10) { // Tolerancja kliknięcia 10px
                return id;
            }
        }
        return null;
    }

    selectPointsInArea() {
        const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const right = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const bottom = Math.max(this.selectionStart.y, this.selectionEnd.y);

        this.points.forEach((point, id) => {
            if (point.x >= left && point.x <= right && 
                point.y >= top && point.y <= bottom) {
                this.selectedPoints.add(id);
            }
        });
    }

    deleteSelectedPoints() {
        const activePolygon = this.polygons[this.activePolygonIndex];
        if (!activePolygon) return;

        // Usuń zaznaczone punkty
        for (const pointId of this.selectedPoints) {
            // Usuń punkt z mapy punktów
            this.points.delete(pointId);
            
            // Usuń punkt z wielokąta
            const pointIndex = activePolygon.points.indexOf(pointId);
            if (pointIndex !== -1) {
                activePolygon.points.splice(pointIndex, 1);
            }
            
            // Usuń linie związane z tym punktem
            activePolygon.lines = activePolygon.lines.filter(line => 
                line.id1 !== pointId && line.id2 !== pointId
            );
            
            // Jeśli usunięto pierwszy punkt wielokąta
            if (pointId === this.firstPointInPolygon) {
                this.firstPointInPolygon = null;
            }
            
            // Usuń z tempPoints jeśli był tam obecny
            const tempIndex = this.tempPoints.indexOf(pointId);
            if (tempIndex !== -1) {
                this.tempPoints.splice(tempIndex, 1);
            }
        }

        // Wyczyść zaznaczenie
        this.selectedPoints.clear();
        this.redraw();
    }

    redraw() {
        // Wyczyść canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Narysuj siatkę
        this.drawGrid();
        
        // Rysuj wszystkie wielokąty
        this.drawPolygons();
        
        // Rysuj aktywny wielokąt i tymczasowe elementy
        this.drawActivePolygon();
        
        // Rysuj obszar zaznaczenia
        if (this.isSelecting && this.selectionStart && this.selectionEnd) {
            this.drawSelectionArea();
        }
    }

    drawActivePolygon() {
        if (this.tempPoints.length === 0) return;
        
        this.ctx.save();
        
        // Rysuj tymczasowe punkty i linie
        this.ctx.beginPath();
        const firstPoint = this.points.get(this.tempPoints[0]);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);
        
        // Rysuj linie między punktami
        for (let i = 1; i < this.tempPoints.length; i++) {
            const point = this.points.get(this.tempPoints[i]);
            this.ctx.lineTo(point.x, point.y);
        }
        
        // Jeśli jest tymczasowa linia do kursora, dodaj ją
        if (this.tempLine) {
            this.ctx.lineTo(this.tempLine.end.x, this.tempLine.end.y);
            
            // Sprawdź możliwość zamknięcia wielokąta tylko w trybie wielokąta
            if (this.drawingMode === 'polygon' && this.tempPoints.length > 2) {
                const firstPoint = this.points.get(this.firstPointInPolygon);
                const distance = Math.sqrt(
                    Math.pow(firstPoint.x - this.tempLine.end.x, 2) + 
                    Math.pow(firstPoint.y - this.tempLine.end.y, 2)
                );
                
                if (distance < 5) { // 5 pikseli tolerancji
                    this.ctx.lineTo(firstPoint.x, firstPoint.y);
                    // Dodaj wypełnienie, jeśli wielokąt jest prawie zamknięty
                    this.ctx.fillStyle = 'rgba(100, 149, 237, 0.2)';
                    this.ctx.fill();
                }
            }
        }
        
        // Rysuj linie
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Rysuj punkty
        this.tempPoints.forEach((pointId, index) => {
            const point = this.points.get(pointId);
            
            // Rysuj punkt
            this.ctx.fillStyle = this.selectedPoints.has(pointId) ? 'red' : '#000';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Rysuj długość linii
            if (index > 0) {
                const prevPoint = this.points.get(this.tempPoints[index - 1]);
                this.drawLineLength(prevPoint, point);
            }
        });
        
        this.ctx.restore();
    }

    drawPolygons() {
        this.ctx.save();
        
        this.polygons.forEach((polygon, index) => {
            // Najpierw rysuj wielokąty (aby były pod liniami)
            if (polygon.points.length >= 2 && polygon.isClosed) {
                this.ctx.beginPath();
                const firstPoint = this.points.get(polygon.points[0]);
                this.ctx.moveTo(firstPoint.x, firstPoint.y);
                
                // Rysuj ścieżkę wielokąta
                for (let i = 1; i < polygon.points.length; i++) {
                    const point = this.points.get(polygon.points[i]);
                    this.ctx.lineTo(point.x, point.y);
                }
                
                // Wypełnij zamknięte wielokąty
                this.ctx.fillStyle = 'rgba(100, 149, 237, 0.2)';
                this.ctx.fill();
                
                // Rysuj obramowanie wielokąta
                this.ctx.strokeStyle = index === this.activePolygonIndex ? '#4CAF50' : '#000';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            // Następnie rysuj linie (aby były nad wypełnieniami)
            if (polygon.lines && polygon.lines.length > 0) {
                this.ctx.beginPath();
                polygon.lines.forEach(line => {
                    const point1 = this.points.get(line.id1);
                    const point2 = this.points.get(line.id2);
                    if (point1 && point2) {
                        this.ctx.moveTo(point1.x, point1.y);
                        this.ctx.lineTo(point2.x, point2.y);
                    }
                });
                this.ctx.strokeStyle = index === this.activePolygonIndex ? '#4CAF50' : '#000';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            // Na końcu rysuj punkty (aby były na wierzchu)
            polygon.points.forEach((pointId, i) => {
                const point = this.points.get(pointId);
                if (point) {
                    this.ctx.fillStyle = this.selectedPoints.has(pointId) ? 'red' : '#000';
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Rysuj długości linii
                    if (i > 0) {
                        const prevPoint = this.points.get(polygon.points[i - 1]);
                        this.drawLineLength(prevPoint, point);
                    }
                }
            });
        });
        
        this.ctx.restore();
    }

    drawSelectionArea() {
        this.ctx.strokeStyle = 'blue';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
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

    createNewPolygon() {
        this.polygons.push({
            points: [],
            lines: [], // Dodane pole lines dla przechowywania linii
            name: '',
            isClosed: false
        });
        this.activePolygonIndex = this.polygons.length - 1;
        this.tempPoints = [];
        this.firstPointInPolygon = null;
        this.tempLine = null;
        document.getElementById('polygonName').value = '';
    }

    updatePolygonInfo() {
        const polygonList = document.getElementById('polygonList');
        const activePolygon = document.getElementById('activePolygon');
        const totalArea = document.getElementById('totalArea');
        
        // Aktualizuj listę wielokątów
        if (this.polygons.length > 0) {
            const polygonNames = this.polygons
                .map((p, index) => `${p.name || `Wielokąt ${index + 1}`}`)
                .join(', ');
            polygonList.textContent = `Figury: ${polygonNames}`;
        } else {
            polygonList.textContent = 'Figury: -';
        }
        
        // Aktualizuj aktywny wielokąt
        if (this.activePolygonIndex >= 0 && this.polygons[this.activePolygonIndex]) {
            const active = this.polygons[this.activePolygonIndex];
            activePolygon.textContent = `Aktywna figura: ${active.name || `Wielokąt ${this.activePolygonIndex + 1}`}`;
        } else {
            activePolygon.textContent = 'Aktywna figura: -';
        }
        
        // Oblicz i zaktualizuj sumę pól
        let totalAreaValue = 0;
        this.polygons.forEach(polygon => {
            if (polygon.points.length > 2) {
                totalAreaValue += this.calculatePolygonArea(polygon);
            }
        });
        totalArea.textContent = `Suma pól: ${totalAreaValue.toFixed(2)} m²`;
    }

    calculatePolygonArea(polygon) {
        if (polygon.points.length < 3) return 0;
        
        let area = 0;
        const points = polygon.points.map(id => this.points.get(id));
        
        for (let i = 0; i < points.length - 1; i++) {
            area += points[i].realX * points[i + 1].realY;
            area -= points[i + 1].realX * points[i].realY;
        }
        
        return Math.abs(area) / 2;
    }

    finishPolygon() {
        if (this.tempPoints.length > 2) {
            const name = document.getElementById('polygonName').value || `Wielokąt ${this.polygons.length + 1}`;
            const currentPolygonIndex = this.activePolygonIndex;
            
            // Upewnij się, że wielokąt jest zamknięty
            const firstPoint = this.points.get(this.firstPointInPolygon);
            const lastPoint = this.points.get(this.tempPoints[this.tempPoints.length - 1]);
            
            // Jeśli ostatni punkt nie jest taki sam jak pierwszy, dodaj go
            if (firstPoint && lastPoint && 
                (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y)) {
                const closingPointId = this.addTempPoint(firstPoint.x, firstPoint.y, firstPoint.realX, firstPoint.realY);
                this.polygons[currentPolygonIndex].points.push(closingPointId);
            }
            
            // Ustaw nazwę i zaktualizuj informacje
            this.polygons[currentPolygonIndex].name = name;
            this.polygons[currentPolygonIndex].isClosed = true;
            
            // Zachowaj referencję do zamkniętego wielokąta
            const closedPolygon = this.polygons[currentPolygonIndex];
            
            // Utwórz nowy wielokąt
            this.createNewPolygon();
            
            // Ustaw poprzedni wielokąt jako aktywny
            this.activePolygonIndex = currentPolygonIndex;
            
            this.updatePolygonInfo();
            this.clearTooltip();
            this.redraw();
            
            // Po krótkim opóźnieniu aktywuj nowy wielokąt
            setTimeout(() => {
                this.activePolygonIndex = this.polygons.length - 1;
                this.redraw();
            }, 100);
        }
    }

    finishLine() {
        if (this.tempPoints.length > 1) { // Zmienione z > 0 na > 1, aby upewnić się, że mamy co najmniej 2 punkty
            // Zapisz punkty do aktywnego wielokąta
            this.polygons[this.activePolygonIndex].points = [...this.tempPoints];
            this.polygons[this.activePolygonIndex].name = 
                document.getElementById('polygonName').value || `Linia ${this.polygons.length}`;
            
            // Resetuj stan
            this.isDrawingLine = false;
            this.tempPoints = [];
            this.tempLine = null;
            
            // Utwórz nowy wielokąt dla następnej linii
            this.createNewPolygon();
            this.updatePolygonInfo();
            this.clearTooltip();
            this.redraw();
        }
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
        this.selectedPoints.clear();
        this.createNewPolygon();
        this.clearTooltip();
        this.redraw();
    }

    drawGrid() {
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

    clearTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
}

window.addEventListener('load', () => {
    window.app = new DrawingApp();
});
