export class UIService {
    constructor() {
        this.initializeTooltips();
        this.initializeCoordinatesDisplay();
    }

    initializeTooltips() {
        this.distanceTooltip = document.createElement('div');
        this.distanceTooltip.className = 'tooltip distance-tooltip';
        document.body.appendChild(this.distanceTooltip);

        this.areaTooltip = document.createElement('div');
        this.areaTooltip.className = 'tooltip area-tooltip';
        document.body.appendChild(this.areaTooltip);
    }

    initializeCoordinatesDisplay() {
        this.coordinatesDisplay = document.getElementById('coordinates');
        if (!this.coordinatesDisplay) {
            this.coordinatesDisplay = document.createElement('div');
            this.coordinatesDisplay.id = 'coordinates';
            document.body.appendChild(this.coordinatesDisplay);
        }
    }

    updatePolygonInfo(polygons, activeIndex, calculateArea) {
        const polygonList = document.getElementById('polygonList');
        const totalArea = document.getElementById('totalArea');
        
        // Aktualizuj listę wielokątów
        let polygonListHTML = '<h3>Lista figur:</h3>';
        let totalAreaValue = 0;
        
        polygons.forEach((polygon, index) => {
            if (polygon.points.length > 0) {
                const area = polygon.isClosed ? calculateArea(polygon) : 0;
                totalAreaValue += area;
                
                polygonListHTML += `<div class="polygon-item ${index === activeIndex ? 'active' : ''}">
                    ${polygon.name || `Figura ${index + 1}`}: ${area.toFixed(2)} m²
                </div>`;
            }
        });
        
        polygonList.innerHTML = polygonListHTML;
        totalArea.textContent = `Suma pól: ${totalAreaValue.toFixed(2)} m²`;
    }

    showDistanceTooltip(x, y, distance) {
        this.distanceTooltip.textContent = `${distance.toFixed(2)}m`;
        this.distanceTooltip.style.display = 'block';
        // Przesuń etykietę nad linię
        this.distanceTooltip.style.left = `${x - 40}px`;
        this.distanceTooltip.style.top = `${y - 25}px`;
    }

    hideDistanceTooltip() {
        this.distanceTooltip.style.display = 'none';
    }

    showAreaTooltip(x, y, area) {
        this.areaTooltip.textContent = `${area.toFixed(2)}m²`;
        this.areaTooltip.style.display = 'block';
        // Przesuń etykietę nad środek wielokąta
        this.areaTooltip.style.left = `${x - 40}px`;
        this.areaTooltip.style.top = `${y - 25}px`;
    }

    hideAreaTooltip() {
        this.areaTooltip.style.display = 'none';
    }

    updateCoordinates(x, y) {
        this.coordinatesDisplay.textContent = `Współrzędne: ${x.toFixed(2)}m, ${y.toFixed(2)}m`;
    }

    drawDimensionLabel(ctx, startX, startY, endX, endY, distance) {
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        
        // Oblicz przesunięcie etykiety prostopadle do linii
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const offsetX = -dy / length * 20; // 20px przesunięcie prostopadłe
        const offsetY = dx / length * 20;

        ctx.save();
        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Narysuj tło dla etykiety
        const text = `${distance.toFixed(2)}m`;
        const metrics = ctx.measureText(text);
        const padding = 4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
            centerX + offsetX - metrics.width/2 - padding,
            centerY + offsetY - 8 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
        );
        
        // Narysuj tekst
        ctx.fillStyle = 'black';
        ctx.fillText(text, centerX + offsetX, centerY + offsetY);
        ctx.restore();
    }

    drawAreaLabel(ctx, centerX, centerY, area) {
        ctx.save();
        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Narysuj tło dla etykiety
        const text = `${area.toFixed(2)}m²`;
        const metrics = ctx.measureText(text);
        const padding = 4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
            centerX - metrics.width/2 - padding,
            centerY - 8 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
        );
        
        // Narysuj tekst
        ctx.fillStyle = 'black';
        ctx.fillText(text, centerX, centerY);
        ctx.restore();
    }
}
