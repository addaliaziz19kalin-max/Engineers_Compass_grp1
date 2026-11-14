import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from './user.service';

/** Pages réservées aux employeurs (créer / administrer une page entreprise) : étudiants, ingénieurs et autres sont renvoyés au fil. */
export const employerGuard: CanActivateFn = () => inject(UserService).isEmployer() || inject(Router).createUrlTree(['/fil']);
