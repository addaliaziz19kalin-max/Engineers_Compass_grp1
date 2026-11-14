import { Component } from '@angular/core';
import { Features } from '../features/features';
import { Header } from '../header/header';
import { Hero } from '../hero/hero';

@Component({
  selector: 'app-home',
  imports: [Header, Hero, Features],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
