import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-shape-item',
  templateUrl: './shape-item.component.html',
  styleUrls: ['./shape-item.component.scss']
})
export class ShapeItemComponent implements OnChanges {
  @Input() type: string = 'circle';
  @Input() color: string = '#e8635a';
  @Input() size: number = 100;

  starPoints: string = '';
  pentagonPoints: string = '';

  ngOnChanges() {
    this.starPoints = this._starPoints(50, 50, 44, 18, 5);
    this.pentagonPoints = this._polygonPoints(50, 52, 44, 5, -90);
  }

  private _starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }

  private _polygonPoints(cx: number, cy: number, r: number, sides: number, offsetDeg: number): string {
    const pts = [];
    const offset = (offsetDeg * Math.PI) / 180;
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides + offset;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }
}
