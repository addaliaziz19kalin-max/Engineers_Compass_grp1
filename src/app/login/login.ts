import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthShell } from '../auth/auth-shell';
import { AuthService } from '../core/auth.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, RippleDirective, AuthShell, Icon],
  templateUrl: './login.html',
  styleUrls: ['../auth/auth-shared.css', './login.css'],
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly shake = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  private fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
    this.shake.set(false);
    requestAnimationFrame(() => this.shake.set(true));
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.shake.set(false);
      requestAnimationFrame(() => this.shake.set(true));
      return;
    }
    this.loading.set(true);
    const { email, password, remember } = this.form.getRawValue();
    const ok = await this.auth.login(email, password, remember);
    if (!ok) return this.fail('E-mail ou mot de passe incorrect.');
    // rechargement complet : les données du compte (fil, messages, réglages…) sont relues pour CE compte
    window.location.assign('/fil');
  }
}
