import { Component } from '@angular/core';

@Component({
  selector: 'app-shapes-showcase',
  templateUrl: './shapes-showcase.component.html',
  styleUrls: ['./shapes-showcase.component.scss']
})
export class ShapesShowcaseComponent {
  showcase = [
    { type: 'circle',   color: '#f04438', size: 68,  cls: 's1' },
    { type: 'triangle', color: '#fbbf24', size: 80,  cls: 's2' },
    { type: 'square',   color: '#3b82f6', size: 90,  cls: 's3' },
    { type: 'circle',   color: '#22c55e', size: 80,  cls: 's4' },
    { type: 'triangle', color: '#a855f7', size: 68,  cls: 's5' },
    { type: 'circle',   color: '#ec4899', size: 56,  cls: 's6' },
  ];
}
