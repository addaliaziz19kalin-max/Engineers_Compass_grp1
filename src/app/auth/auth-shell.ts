import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../core/theme.service';
import { Icon } from '../shared/icon';
import { SiteFooter } from '../shared/site-footer';

/**
 * Cadre commun des pages d'authentification (connexion, mot de passe oublié, inscription) :
 * barre du haut (logo, langue, thème) + zone centrée où s'affiche la carte.
 * Un bouton peut être injecté dans la barre avec <a slot="actions">…</a>.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, Icon, SiteFooter],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
})
export class AuthShell {
  /** affiche le pied de page sous la zone centrale (pages d'erreur) */
  readonly withFooter = input(false);
  protected readonly theme = inject(ThemeService);
  protected readonly popping = signal(false);

  protected toggleTheme(): void {
    this.theme.toggle();
    this.popping.set(true);
  }
}
