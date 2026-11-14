import { Directive, ElementRef, inject } from '@angular/core';

/** Ondulation au clic sur un bouton : <a class="btn" appRipple>. */
@Directive({
  selector: '[appRipple]',
  host: { '(click)': 'onClick($event)' },
})
export class RippleDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected onClick(event: MouseEvent): void {
    if (this.reduceMotion) return;
    const rect = this.el.getBoundingClientRect();
    const wave = document.createElement('span');
    wave.className = 'ripple';
    wave.style.left = `${event.clientX - rect.left}px`;
    wave.style.top = `${event.clientY - rect.top}px`;
    this.el.appendChild(wave);
    setTimeout(() => wave.remove(), 650);
  }
}
