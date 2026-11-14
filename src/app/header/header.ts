import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../core/theme.service';
import { RippleDirective } from '../shared/ripple.directive';

@Component({
  selector: 'app-header',
  imports: [RippleDirective, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected readonly theme = inject(ThemeService);
  /** true pendant la petite animation de l'icône du thème */
  protected readonly popping = signal(false);

  protected toggleTheme(): void {
    this.theme.toggle();
    this.popping.set(true);
  }
}
