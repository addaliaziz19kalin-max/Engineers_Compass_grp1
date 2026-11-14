import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth.service';
import { GlobalErrorHandler } from './core/global-error-handler';
import { httpErrorInterceptor } from './core/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // la session Supabase est relue AVANT l'affichage : les gardes et les services connaissent déjà le compte
    provideAppInitializer(() => inject(AuthService).init()),
    // erreurs côté client (JS) → page d'erreur ; erreurs de l'API → page d'erreur adaptée
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    // anchorScrolling : garde le fonctionnement des liens #defis, #offres… de l'accueil
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' })),
  ],
};
