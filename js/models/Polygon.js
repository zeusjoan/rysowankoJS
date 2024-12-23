export class Polygon {
    constructor(name = '', debugService = null) {
        this.name = name;
        this.points = [];
        this.isClosed = false;
        this.debug = debugService;
    }

    addPoint(pointId) {
        this.points.push(pointId);
        if (this.debug) {
            this.debug.log('Polygon', {
                action: 'addPoint',
                pointId: pointId,
                totalPoints: this.points.length
            });
        }
    }

    removePoint(pointId) {
        const index = this.points.indexOf(pointId);
        if (index !== -1) {
            this.points.splice(index, 1);
            if (this.points.length < 3) {
                this.isClosed = false;
            }
            if (this.debug) {
                this.debug.log('Polygon', {
                    action: 'removePoint',
                    pointId: pointId,
                    remainingPoints: this.points.length
                });
            }
        }
    }

    close() {
        if (this.points.length > 2) {
            if (this.points[0] !== this.points[this.points.length - 1]) {
                this.points.push(this.points[0]);
            }
            this.isClosed = true;
            if (this.debug) {
                this.debug.log('Polygon', {
                    action: 'close',
                    points: this.points.length
                });
            }
            return true;
        }
        return false;
    }

    clear() {
        this.points = [];
        this.isClosed = false;
        if (this.debug) {
            this.debug.log('Polygon', {
                action: 'clear'
            });
        }
    }

    isLineOrthogonal(point1, point2) {
        // Sprawdź czy linia jest pozioma lub pionowa
        // Dodajemy małą tolerancję dla niedokładności
        const dx = Math.abs(point2.x - point1.x);
        const dy = Math.abs(point2.y - point1.y);
        const tolerance = 0.1; // tolerancja w pikselach
        
        return dx < tolerance || dy < tolerance;
    }

    draw(ctx, points, showDimensions = false) {
        if (this.points.length < 1) return;

        if (this.debug) {
            this.debug.log('Polygon', {
                action: 'draw',
                pointsCount: this.points.length,
                showDimensions: showDimensions,
                isClosed: this.isClosed
            });
        }

        // Rysuj linie i wymiary
        for (let i = 1; i < this.points.length; i++) {
            const point = points.get(this.points[i]);
            const prevPoint = points.get(this.points[i - 1]);
            
            // Rysuj linię
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();

            // Rysuj wymiary dla każdej linii
            if (showDimensions) {
                const distance = Math.sqrt(
                    Math.pow(point.realX - prevPoint.realX, 2) +
                    Math.pow(point.realY - prevPoint.realY, 2)
                );

                if (this.debug) {
                    this.debug.log('Dimensions', {
                        lineIndex: i,
                        startPoint: { x: prevPoint.x, y: prevPoint.y },
                        endPoint: { x: point.x, y: point.y },
                        distance: distance,
                        center: {
                            x: (prevPoint.x + point.x) / 2,
                            y: (prevPoint.y + point.y) / 2
                        }
                    });
                }

                // Oblicz środek linii
                const centerX = (prevPoint.x + point.x) / 2;
                const centerY = (prevPoint.y + point.y) / 2;

                ctx.save();
                ctx.translate(centerX, centerY);
                
                // Rysuj tło dla wymiaru
                ctx.font = '12px Arial';
                const text = `${distance.toFixed(2)}m`;
                const metrics = ctx.measureText(text);
                const padding = 4;
                const textHeight = 16;
                
                // Przesuń etykietę nad linię
                const labelOffset = 15;
                ctx.translate(0, -labelOffset);
                
                // Rysuj białe tło
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    -metrics.width/2 - padding,
                    -textHeight/2 - padding,
                    metrics.width + 2 * padding,
                    textHeight + 2 * padding
                );
                
                // Rysuj tekst
                ctx.fillStyle = '#2196F3';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 0, 0);
                
                ctx.restore();
            }
        }

        if (this.isClosed) {
            ctx.beginPath();
            ctx.moveTo(points.get(this.points[0]).x, points.get(this.points[0]).y);
            for (let i = 1; i < this.points.length; i++) {
                const point = points.get(this.points[i]);
                ctx.lineTo(point.x, point.y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
            ctx.fill();

            // Pokaż pole powierzchni na środku wielokąta
            if (showDimensions) {
                const area = this.calculateArea(points);
                
                // Oblicz środek wielokąta
                let centerX = 0;
                let centerY = 0;
                let pointCount = this.points.length - 1;
                
                for (let i = 0; i < pointCount; i++) {
                    const point = points.get(this.points[i]);
                    centerX += point.x;
                    centerY += point.y;
                }
                
                centerX /= pointCount;
                centerY /= pointCount;

                if (this.debug) {
                    this.debug.log('Area', {
                        center: { x: centerX, y: centerY },
                        area: area,
                        pointCount: pointCount
                    });
                }

                // Rysuj pole powierzchni
                ctx.save();
                ctx.font = '14px Arial';
                const text = `${area.toFixed(2)}m²`;
                const metrics = ctx.measureText(text);
                const padding = 6;
                const textHeight = 18;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    centerX - metrics.width/2 - padding,
                    centerY - textHeight/2 - padding,
                    metrics.width + 2 * padding,
                    textHeight + 2 * padding
                );
                
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#2196F3';
                ctx.fillText(text, centerX, centerY);
                ctx.restore();
            }
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
