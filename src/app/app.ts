import { DOCUMENT } from '@angular/common';
import { Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Assistant } from './assistant/assistant';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Assistant],
  template: '<router-outlet /><app-assistant />',
})
export class App {
  private readonly root = inject(DOCUMENT).documentElement;

  constructor() {
    // la classe "intro" (posée dans index.html) ne sert qu'à l'animation d'entrée du titre
    afterNextRender(() => setTimeout(() => this.root.classList.remove('intro'), 3000));
  }
}
