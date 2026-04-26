import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';

import { AppHeaderComponent } from './app-header/app-header.component';
import { FeedbackBoxComponent } from './feedback-box/feedback-box.component';
import { GameSidebarComponent } from './game-sidebar/game-sidebar.component';
import { InfoBarComponent } from './info-bar/info-bar.component';
import { InstructionCardComponent } from './instruction-card/instruction-card.component';
import { LogoHeaderComponent } from './logo-header/logo-header.component';
import { ShapeGridComponent } from './shape-grid/shape-grid.component';
import { ShapeItemComponent } from './shape-item/shape-item.component';
import { ShapesShowcaseComponent } from './shapes-showcase/shapes-showcase.component';

@NgModule({
  declarations: [
    AppHeaderComponent,
    FeedbackBoxComponent,
    GameSidebarComponent,
    InfoBarComponent,
    InstructionCardComponent,
    LogoHeaderComponent,
    ShapeGridComponent,
    ShapeItemComponent,
    ShapesShowcaseComponent,
  ],
  imports: [SharedModule],
  exports: [
    AppHeaderComponent,
    FeedbackBoxComponent,
    GameSidebarComponent,
    InfoBarComponent,
    InstructionCardComponent,
    LogoHeaderComponent,
    ShapeGridComponent,
    ShapeItemComponent,
    ShapesShowcaseComponent,
  ],
})
export class ComponentsModule {}
