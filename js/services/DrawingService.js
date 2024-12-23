export class DrawingService {
    constructor(ctx) {
        this.ctx = ctx;
        this.dimensionLabels = new Map();
        this.areaLabels = new Map();
    }

    drawPoint(x, y, isSelected = false, isFirst = false) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
        
        if (isSelected) {
            this.ctx.fillStyle = '#2196F3';
        } else if (isFirst) {
            this.ctx.fillStyle = '#4CAF50';
        } else {
            this.ctx.fillStyle = '#000';
        }
        
        this.ctx.fill();
    }

    drawLine(startX, startY, endX, endY, color = '#000') {
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }

    fillPolygon(points, color = 'rgba(33, 150, 243, 0.3)') {
        if (points.length < 3) return;

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    drawDimensionLabel(x, y, text) {
        const label = document.createElement('div');
        label.className = 'dimension-label';
        label.style.left = x + 'px';
        label.style.top = y + 'px';
        label.textContent = text;
        
        const key = `${x},${y}`;
        if (this.dimensionLabels.has(key)) {
            document.body.removeChild(this.dimensionLabels.get(key));
        }
        
        document.body.appendChild(label);
        this.dimensionLabels.set(key, label);
    }

    drawAreaLabel(x, y, text) {
        const label = document.createElement('div');
        label.className = 'area-label';
        label.style.left = x + 'px';
        label.style.top = y + 'px';
        label.textContent = text;
        
        const key = `${x},${y}`;
        if (this.areaLabels.has(key)) {
            document.body.removeChild(this.areaLabels.get(key));
        }
        
        document.body.appendChild(label);
        this.areaLabels.set(key, label);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        
        // Usuń wszystkie etykiety
        this.dimensionLabels.forEach(label => {
            document.body.removeChild(label);
        });
        this.dimensionLabels.clear();
        
        this.areaLabels.forEach(label => {
            document.body.removeChild(label);
        });
        this.areaLabels.clear();
    }
}
