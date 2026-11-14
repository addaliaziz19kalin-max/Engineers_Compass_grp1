import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthShell } from '../auth/auth-shell';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

@Component({
  selector: 'app-forgot',
  imports: [RouterLink, RippleDirective, AuthShell, Icon],
  templateUrl: './forgot.html',
  styleUrls: ['../auth/auth-shared.css', './forgot.css'],
})
export class Forgot {
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly invalid = signal(false);

  protected submit(event: Event, email: HTMLInputElement): void {
    event.preventDefault();
    this.invalid.set(!email.checkValidity());
    if (this.invalid()) return;

    this.loading.set(true);
    // TODO : appeler l'API « envoyer le lien de réinitialisation »
    setTimeout(() => {
      this.loading.set(false);
      this.sent.set(true);
      // démo : on ouvre ensuite l'accueil du compte
      setTimeout(() => void this.router.navigateByUrl('/fil'), 1800);
    }, 900);
  }
}
