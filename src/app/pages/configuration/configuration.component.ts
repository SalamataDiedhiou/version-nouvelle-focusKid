import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { DEFAULT_CONFIG, SessionConfig, FormeType, ColorName, PaletteKey, ShapePaletteKey, FORMES_DISPONIBLES, COULEURS_DISPONIBLES, PALETTE_KEYS, PALETTE_LABELS, COLOR_PALETTES, COLORS, SHAPE_PALETTE_KEYS, SHAPE_PALETTE_LABELS, SHAPE_PALETTES, FormeOption, CouleurOption } from '../../models/session-config.model';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss'],
})
export class ConfigurationComponent implements OnInit {
  configForm: FormGroup;
  patient: Patient | null = null;
  toastMessage = '';
  toastVisible = false;
  isLaunching = false;

  // Expose constants to template
  readonly FORMES_DISPONIBLES: FormeOption[] = FORMES_DISPONIBLES;
  readonly COULEURS_DISPONIBLES: CouleurOption[] = COULEURS_DISPONIBLES;
  readonly PALETTE_KEYS: PaletteKey[] = PALETTE_KEYS;
  readonly PALETTE_LABELS: Record<PaletteKey, string> = PALETTE_LABELS;
  readonly COLOR_PALETTES: Record<PaletteKey, ColorName[]> = COLOR_PALETTES;
  readonly COLORS: Record<ColorName, string> = COLORS;
  readonly SHAPE_PALETTE_KEYS: ShapePaletteKey[] = SHAPE_PALETTE_KEYS;
  readonly SHAPE_PALETTE_LABELS: Record<ShapePaletteKey, string> = SHAPE_PALETTE_LABELS;
  readonly SHAPE_PALETTES: Record<ShapePaletteKey, FormeType[]> = SHAPE_PALETTES;
  readonly FORMES_DISPONIBLES_MAP: Record<FormeType, FormeOption> = FORMES_DISPONIBLES.reduce(
    (acc, forme) => ({ ...acc, [forme.type]: forme }),
    {} as Record<FormeType, FormeOption>
  );

  readonly SPEED_OPTIONS = [
    { value: 'lente',   label: '🐢 Lente' },
    { value: 'moyenne', label: '🚶 Moyenne' },
    { value: 'rapide',  label: '🚀 Rapide' },
  ];

  // Local state for multi-select (not in FormGroup — managed manually)
  formesActives: Set<FormeType> = new Set(DEFAULT_CONFIG.formesActives);
  couleursActives: Set<ColorName> = new Set(DEFAULT_CONFIG.couleursActives);

  constructor(
      private fb: FormBuilder,
      private configService: ConfigService,
      private patientService: PatientService,
      public router: Router,
  ) {
    const c = DEFAULT_CONFIG;
    this.configForm = this.fb.group({
      niveau:            [c.niveau],
      mode:              [c.mode],
      activerTempsReponse: [c.activerTempsReponse],
      tempsReponse:      [c.tempsReponse],
      dureePartie:       [c.dureePartie],
      nbParties:         [c.nbParties],
      vitesse:           [c.vitesse],
      audioConsigne:     [c.audioConsigne],
      sonSucces:         [c.sonSucces],
      sonErreur:         [c.sonErreur],
      volumeGeneral:     [c.volumeGeneral],
      grandePolice:      [c.grandePolice],
      fortContraste:     [c.fortContraste],
      animationsReduites:[c.animationsReduites],
      selectedPalette:   [c.selectedPalette],
      selectedShapePalette: [c.selectedShapePalette],
      
      quantiteFormes:    [c.quantiteFormes],
      modeCouleur:       [c.modeCouleur],
      couleurUnique:     [c.couleurUnique],
      modeForme:         [c.modeForme],
      formeUnique:       [c.formeUnique],
      tailleFormes:      [c.tailleFormes],
    });

  }

  ngOnInit(): void {
    this.patientService.selectedPatient$.subscribe(p => { this.patient = p; });
    const saved = this.configService.getConfig();
    if (saved) {
      this.configForm.patchValue(saved);
      this.formesActives   = new Set(saved.formesActives);
      this.couleursActives = new Set(saved.couleursActives);
      if (saved.selectedPalette) {
        this.updateCouleursFromPalette(saved.selectedPalette);
      }
      if (saved.selectedShapePalette) {
        this.updateFormesFromPalette(saved.selectedShapePalette);
      }
    }
  }

  // ── Palette & Couleurs ─────────────────────────────────────────────────────

  setPalette(paletteKey: PaletteKey): void {
    this.configForm.patchValue({ selectedPalette: paletteKey });
    this.updateCouleursFromPalette(paletteKey);
  }

  private updateCouleursFromPalette(paletteKey: PaletteKey): void {
    const colors = COLOR_PALETTES[paletteKey];
    this.couleursActives = new Set(colors);
  }

  getSelectedPalette(): PaletteKey {
    return this.configForm.get('selectedPalette')?.value ?? 'apaisantes';
  }

  getPaletteColorsPreview(paletteKey: PaletteKey): string[] {
    return COLOR_PALETTES[paletteKey].map(colorName => COLORS[colorName as ColorName]);
  }

  // ── Palette & Formes ────────────────────────────────────────────────────────

  setShapePalette(shapePaletteKey: ShapePaletteKey): void {
    this.configForm.patchValue({ selectedShapePalette: shapePaletteKey });
    this.updateFormesFromPalette(shapePaletteKey);
  }

  private updateFormesFromPalette(shapePaletteKey: ShapePaletteKey): void {
    const formes = SHAPE_PALETTES[shapePaletteKey];
    this.formesActives = new Set(formes);
  }

  getSelectedShapePalette(): ShapePaletteKey {
    return this.configForm.get('selectedShapePalette')?.value ?? 'basiques';
  }

  getShapePaletteEmojis(shapePaletteKey: ShapePaletteKey): string {
    return SHAPE_PALETTES[shapePaletteKey]
      .map(formeType => this.FORMES_DISPONIBLES_MAP[formeType]?.emoji ?? '?')
      .join(' ');
  }

  get f() { return this.configForm.controls; }

  // ── Formes & Couleurs toggles ──────────────────────────────────────────────

  toggleForme(type: FormeType): void {
    if (this.formesActives.has(type)) {
      if (this.formesActives.size > 1) {          // always keep at least 1
        this.formesActives.delete(type);
      }
    } else {
      this.formesActives.add(type);
    }
  }

  isFormeActive(type: FormeType): boolean {
    return this.formesActives.has(type);
  }

  toggleCouleur(name: ColorName): void {
    if (this.couleursActives.has(name)) {
      if (this.couleursActives.size > 1) {        // always keep at least 1
        this.couleursActives.delete(name);
      }
    } else {
      this.couleursActives.add(name);
    }
  }

  isCouleurActive(name: ColorName): boolean {
    return this.couleursActives.has(name);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getRangePct(controlName: string, min: number, max: number): string {
    const val = this.configForm.get(controlName)?.value ?? min;
    return ((val - min) / (max - min) * 100) + '%';
  }

  setSpeed(val: string): void {
    this.configForm.patchValue({ vitesse: val });
  }

  getNiveauLabel(): string {
    const map: Record<string, string> = {
      'niveau1': 'Niveau 1',
      'niveau-intermediaire': 'Niveau Intermédiaire',
      'niveau2': 'Niveau 2',
    };
    return map[this.f['niveau'].value] || this.f['niveau'].value;
  }

  getModeLabel(): string {
    const map: Record<string, string> = {
      libre:      'Mode libre',
      progressif: 'Mode progressif',
      etape1:     'Étape 1',
      etape2:     'Étape 2',
      etape3:     'Étape 3',
      etape4:     'Étape 4',
    };
    return map[this.f['mode'].value] || this.f['mode'].value;
  }

  getVitesseLabel(): string {
    const v = this.f['vitesse'].value as string;
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  getFormesLabel(): string {
    return [...this.formesActives]
        .map(t => FORMES_DISPONIBLES.find(f => f.type === t)?.emoji ?? t)
        .join(' ');
  }

  getCouleursLabel(): string {
    if (this.configForm.get('modeCouleur')?.value === 'unique') {
      const name = this.configForm.get('couleurUnique')?.value;
      return COULEURS_DISPONIBLES.find(c => c.name === name)?.label ?? name;
    }
    return [...this.couleursActives]
        .map(n => COULEURS_DISPONIBLES.find(c => c.name === n)?.label ?? n)
        .join(', ');
  }

  getQuantiteLabel(): string {
    const map: Record<string, string> = {
      petit: 'Petit nombre',
      moyen: 'Nombre moyen',
      beaucoup: 'Beaucoup de formes',
    };
    return map[this.configForm.get('quantiteFormes')?.value] || '';
  }

  getTailleLabel(): string {
    const map: Record<string, string> = {
      petite: 'Petite taille',
      moyenne: 'Taille moyenne',
      grande: 'Grande taille',
      varie: 'Tailles variées',
    };
    return map[this.configForm.get('tailleFormes')?.value] || '';
  }

  setQuantite(val: string): void {
    this.configForm.patchValue({ quantiteFormes: val });
  }

  setTaille(val: string): void {
    this.configForm.patchValue({ tailleFormes: val });
  }

  setModeCouleur(val: string): void {
    this.configForm.patchValue({ modeCouleur: val });
  }

  setCouleurUnique(val: ColorName): void {
    this.configForm.patchValue({ couleurUnique: val });
  }

  setModeForme(val: string): void {
    this.configForm.patchValue({ modeForme: val });
  }

  setFormeUnique(val: FormeType): void {
    this.configForm.patchValue({ formeUnique: val });
  }

  getUniqueFormeLabel(): string {
    const type = this.configForm.get('formeUnique')?.value as FormeType;
    return this.FORMES_DISPONIBLES_MAP[type]?.label ?? type;
  }

  getUniqueColorLabel(): string {
    const name = this.configForm.get('couleurUnique')?.value as ColorName;
    return COULEURS_DISPONIBLES.find(c => c.name === name)?.label ?? name;
  }

  // ── Build final config ─────────────────────────────────────────────────────

  private buildConfig(): SessionConfig {
    const selectedPalette = this.getSelectedPalette();
    const selectedShapePalette = this.getSelectedShapePalette();
    return {
      ...this.configForm.value,
      formesActives:   [...this.formesActives],
      couleursActives: [...this.couleursActives],
      selectedPalette: selectedPalette,
      selectedShapePalette: selectedShapePalette,
    } as SessionConfig;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  saveConfig(): void {
    this.configService.updateConfig(this.buildConfig());
    this.showToast('✅ Configuration enregistrée !');
  }

  launchSession(): void {
    const isModeUniqueForme = this.configForm.get('modeForme')?.value === 'unique';
    const isModeUniqueCouleur = this.configForm.get('modeCouleur')?.value === 'unique';

    if (!isModeUniqueForme && this.formesActives.size === 0) {
      this.showToast('⚠️ Sélectionne au moins une forme !');
      return;
    }
    if (!isModeUniqueCouleur && this.couleursActives.size === 0) {
      this.showToast('⚠️ Sélectionne au moins une couleur !');
      return;
    }

    const config = this.buildConfig();
    this.configService.updateConfig(config);
    this.isLaunching = true;

    setTimeout(() => {
      if (config.niveau === 'niveau2') {
        this.router.navigate(['/niveau2']);
      } else if (config.niveau === 'niveau-intermediaire') {
        this.router.navigate(['/niveau-intermediaire'])
      } else {  
        this.router.navigate(['/niveau1']);
      }
    }, 800);
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 2200);
  }

  getInitials(p: Patient): string {
    return (p.prenom[0] + p.nom[0]).toUpperCase();
  }
}