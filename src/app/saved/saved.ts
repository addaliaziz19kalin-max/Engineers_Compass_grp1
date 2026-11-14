import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SavedService } from '../core/saved.service';
import { Icon } from '../shared/icon';

/** Page « Enregistrés » : tout ce que l'utilisateur a enregistré. */
@Component({
  selector: 'app-saved',
  imports: [RouterLink, Icon],
  templateUrl: './saved.html',
  styleUrls: ['../account/account-shared.css', './saved.css'],
})
export class Saved {
  protected readonly saved = inject(SavedService);
  protected readonly kinds = { post: 'Publication', offer: 'Offre', challenge: 'Défi' };
}
