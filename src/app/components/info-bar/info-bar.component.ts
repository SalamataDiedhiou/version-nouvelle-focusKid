import { Component, Input, OnChanges, HostBinding } from '@angular/core';

@Component({
  selector: 'app-info-bar',
  templateUrl: './info-bar.component.html',
  styleUrls: ['./info-bar.component.scss']
})
export class InfoBarComponent implements OnChanges {
  @Input() text: string = '…';
  @Input() color: string = '#000';
  @Input() shape: string = '';
  @Input() isNoGo: boolean = false;
  @HostBinding('class.grande-police') @Input() grandePolice: boolean = false;

  @Input() timerVisible: boolean = false;
  @Input() timerValue: number = 20;
  @Input() timerMax: number = 20;

  strokeDashoffset: number = 0;
  strokeColor: string = 'var(--caramel)';

  get isUrgent(): boolean {
    return this.timerValue <= 4 && this.timerValue > 0;
  }

  ngOnChanges() {
    const CIRC = 2 * Math.PI * 30;
    const pct = this.timerMax > 0 ? this.timerValue / this.timerMax : 0;
    this.strokeDashoffset = CIRC * (1 - pct);
    this.strokeColor = this.isUrgent ? '#e8635a' : 'var(--caramel)';
  }
}
