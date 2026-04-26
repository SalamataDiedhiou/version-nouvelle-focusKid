import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    email = '';
    password = '';
    errorMessage = '';

    constructor(private router: Router) {}

    login(): void {
        if (!this.email.trim() || !this.password.trim()) {
            this.errorMessage = 'Veuillez remplir tous les champs.';
            return;
        }

        localStorage.setItem('isErgoLoggedIn', 'true');
        this.router.navigate(['/dashboard']);
    }
}