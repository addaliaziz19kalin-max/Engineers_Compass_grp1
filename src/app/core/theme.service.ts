import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const STORAGE_KEY = 'ec-theme';

/**
 * Thème clair / sombre.
 * Par défaut on suit le système ; le bouton force un thème et le mémorise.
 * Le thème est porté par l'attribut data-theme de <html> (voir styles.css).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  readonly isDark = signal(this.readIsDark());

  constructor() {
    // tant que l'utilisateur n'a rien forcé, on suit les changements du système
    this.media.addEventListener('change', () => {
      if (!this.root.getAttribute('data-theme')) this.isDark.set(this.media.matches);
    });
  }

  toggle(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.root.setAttribute('data-theme', next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* stockage indisponible */ }
    this.isDark.set(next === 'dark');
  }

  private readIsDark(): boolean {
    const explicit = this.root.getAttribute('data-theme');
    return explicit ? explicit === 'dark' : this.media.matches;
  }
}
