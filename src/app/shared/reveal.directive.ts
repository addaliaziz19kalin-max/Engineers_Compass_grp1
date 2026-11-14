import { Directive, ElementRef, afterNextRender, inject, input, numberAttribute, signal } from '@angular/core';

/**
 * Fait apparaître l'élément quand il entre dans l'écran.
 * Usage : <article [appReveal]="index"> — la valeur sert à décaler l'animation (effet cascade).
 */
@Directive({
  selector: '[appReveal]',
  host: {
    class: 'reveal',
    '[class.in]': 'visible()',
    '[style.--d]': 'delay()',
  },
})
export class RevealDirective {
  readonly delay = input(0, { alias: 'appReveal', transform: (v: unknown) => numberAttribute(v, 0) });
  protected readonly visible = signal(false);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) {
        this.visible.set(true);
        return;
      }
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.visible.set(true);
            io.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      io.observe(this.el.nativeElement);
    });
  }
}
