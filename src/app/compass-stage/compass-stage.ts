import { Component, ElementRef, DestroyRef, afterNextRender, inject, signal, viewChild } from '@angular/core';

/**
 * Boussole + cartes flottantes.
 * - Au survol : l'aiguille fait deux tours puis suit le curseur (ressort), les cartes bougent en profondeur.
 * - Au repos : l'aiguille oscille doucement.
 * La rotation de l'aiguille est écrite directement dans le DOM (60 images/s) : pas de détection de changement.
 */
@Component({
  selector: 'app-compass-stage',
  templateUrl: './compass-stage.html',
  styleUrl: './compass-stage.css',
})
export class CompassStage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly compass = viewChild.required<ElementRef<SVGSVGElement>>('compass');
  private readonly needle = viewChild.required<ElementRef<SVGGElement>>('needle');

  /** true quand le curseur est sur la scène (classe .hot) */
  protected readonly hot = signal(false);

  private readonly rest = -48;           // angle de repos (NE ↔ SO), comme sur le logo
  private angle = this.rest;
  private speed = 0;
  private target = this.rest;
  private lockUntil = 0;                 // pendant le tour d'accueil, on ignore le curseur
  private visible = true;
  private reduceMotion = false;

  constructor() {
    afterNextRender(() => this.init());
  }

  protected onEnter(): void {
    this.hot.set(true);
    if (this.reduceMotion) return;
    this.target = this.angle + 720;
    this.lockUntil = performance.now() + 1100;
  }

  protected onLeave(): void {
    this.hot.set(false);
    this.target = this.rest + 360 * Math.round((this.angle - this.rest) / 360);
    this.floatingCards().forEach((c) => {
      c.style.removeProperty('--px');
      c.style.removeProperty('--py');
    });
  }

  private init(): void {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.angle = this.reduceMotion ? this.rest : this.rest - 540;   // petit tour d'arrivée
    this.draw();

    const stage = this.stage().nativeElement;
    const onMove = (e: PointerEvent) => this.onMove(e);
    stage.addEventListener('pointermove', onMove, { passive: true });

    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([entry]) => (this.visible = entry.isIntersecting));
      io.observe(stage);
    }

    let raf = 0;
    if (!this.reduceMotion) {
      const loop = (now: number) => {
        if (this.visible && !document.hidden) {
          const sway = this.hot() ? 0 : Math.sin(now / 900) * 6;
          this.speed += (this.target + sway - this.angle) * 0.045;
          this.speed *= 0.84;
          this.angle += this.speed;
          this.draw();
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      stage.removeEventListener('pointermove', onMove);
    });
  }

  private onMove(e: PointerEvent): void {
    const r = this.compass().nativeElement.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);

    if (!this.reduceMotion && performance.now() > this.lockUntil) {
      const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      // chemin le plus court vers l'angle du curseur
      this.target = this.angle + this.mod(deg - this.angle + 180, 360) - 180;
    }

    this.floatingCards().forEach((c) => {
      const z = Number(c.dataset['z']) || 0;
      c.style.setProperty('--px', `${((dx / r.width) * z).toFixed(1)}px`);
      c.style.setProperty('--py', `${((dy / r.width) * z).toFixed(1)}px`);
    });
  }

  private floatingCards(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>('.float'));
  }

  private mod(x: number, m: number): number {
    return ((x % m) + m) % m;
  }

  private draw(): void {
    this.needle().nativeElement.setAttribute('transform', `rotate(${this.angle.toFixed(2)} 280 280)`);
  }
}
