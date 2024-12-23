export class Polygon {
    constructor(name = '') {
        this.name = name;
        this.points = [];
        this.isClosed = false;
    }

    addPoint(pointId) {
        this.points.push(pointId);
    }

    removePoint(pointId) {
        const index = this.points.indexOf(pointId);
        if (index !== -1) {
            this.points.splice(index, 1);
            if (this.points.length < 3) {
                this.isClosed = false;
            }
        }
    }

    close() {
        if (this.points.length > 2) {
            if (this.points[0] !== this.points[this.points.length - 1]) {
                this.points.push(this.points[0]);
            }
            this.isClosed = true;
            return true;
        }
        return false;
    }

    clear() {
        this.points = [];
        this.isClosed = false;
    }

    draw(ctx, points, showDimensions = false, uiService) {
        if (this.points.length < 1) return;

        ctx.beginPath();
        ctx.moveTo(points.get(this.points[0]).x, points.get(this.points[0]).y);

        for (let i = 1; i < this.points.length; i++) {
            const point = points.get(this.points[i]);
            ctx.lineTo(point.x, point.y);

            // Rysuj wymiary dla każdej linii
            if (showDimensions) {
                const prevPoint = points.get(this.points[i - 1]);
                const distance = Math.sqrt(
                    Math.pow(point.realX - prevPoint.realX, 2) +
                    Math.pow(point.realY - prevPoint.realY, 2)
                );

                // Oblicz środek linii
                const centerX = (prevPoint.x + point.x) / 2;
                const centerY = (prevPoint.y + point.y) / 2;

                // Rysuj wymiar dokładnie na środku linii
                ctx.save();
                ctx.font = '12px Arial';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Tło dla wymiaru
                const text = `${distance.toFixed(2)}m`;
                const metrics = ctx.measureText(text);
                const padding = 4;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    centerX - metrics.width/2 - padding,
                    centerY - 8 - padding,
                    metrics.width + 2 * padding,
                    16 + 2 * padding
                );
                
                // Tekst wymiaru
                ctx.fillStyle = 'black';
                ctx.fillText(text, centerX, centerY);
                ctx.restore();
            }
        }

        if (this.isClosed) {
            ctx.closePath();
            ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
            ctx.fill();
            ctx.stroke();

            // Pokaż pole powierzchni na środku wielokąta
            if (showDimensions) {
                const area = this.calculateArea(points);
                
                // Oblicz środek wielokąta
                let centerX = 0;
                let centerY = 0;
                let pointCount = this.points.length - 1; // Bez ostatniego punktu (który jest duplikatem pierwszego)
                
                for (let i = 0; i < pointCount; i++) {
                    const point = points.get(this.points[i]);
                    centerX += point.x;
                    centerY += point.y;
                }
                
                centerX /= pointCount;
                centerY /= pointCount;

                // Rysuj pole powierzchni na środku
                ctx.save();
                ctx.font = '14px Arial';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Tło dla pola powierzchni
                const text = `${area.toFixed(2)}m²`;
                const metrics = ctx.measureText(text);
                const padding = 6;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    centerX - metrics.width/2 - padding,
                    centerY - 9 - padding,
                    metrics.width + 2 * padding,
                    18 + 2 * padding
                );
                
                // Tekst pola powierzchni
                ctx.fillStyle = '#2196F3';
                ctx.fillText(text, centerX, centerY);
                ctx.restore();
            }
        } else {
            ctx.stroke();
        }

        // Rysuj punkty
        this.points.forEach((pointId, index) => {
            const point = points.get(pointId);
            const isFirst = index === 0;
            const isSelected = index === this.points.length - 1 && !this.isClosed;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = isSelected ? '#2196F3' : (isFirst ? '#4CAF50' : '#000');
            ctx.fill();
        });
    }

    calculateArea(points) {
        if (!this.isClosed || this.points.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            const point1 = points.get(this.points[i]);
            const point2 = points.get(this.points[i + 1]);
            area += point1.realX * point2.realY - point2.realX * point1.realY;
        }

        return Math.abs(area) / 2;
    }
}
