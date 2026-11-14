import { Component } from '@angular/core';
import { CompassStage } from '../compass-stage/compass-stage';
import { RippleDirective } from '../shared/ripple.directive';

@Component({
  selector: 'app-hero',
  imports: [CompassStage, RippleDirective],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {}
