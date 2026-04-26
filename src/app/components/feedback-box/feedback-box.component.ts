import { Component } from '@angular/core';

const MESSAGES: Record<string, {icon: string, text: string}[]> = {
  'go-success': [
    { icon: '🎉', text: "Bravo, c'est ça !"       },
    { icon: '⭐', text: 'Super bien joué !'         },
    { icon: '🏆', text: 'Excellent !'               },
    { icon: '🌟', text: 'Tu es fort(e) !'           },
    { icon: '🎯', text: 'En plein dans le mille !'  },
  ],
  'nogo-success': [
    { icon: '🦸', text: 'Tu as résisté ! Incroyable !'                      },
    { icon: '🧠', text: "Ton cerveau est plus fort que l'impulsivité !"    },
    { icon: '💪', text: "Tu t'es contrôlé(e) — c'est du vrai courage !"  },
    { icon: '🏅', text: 'Pas de piège pour toi !'                           },
    { icon: '🌟', text: 'Champion(ne) du self-control !'                    },
  ],
  'go-error': [
    { icon: '😊', text: 'Presque… essaie encore !'    },
    { icon: '💪', text: 'Tu vas y arriver !'           },
    { icon: '🔍', text: 'Cherche encore un peu…'      },
    { icon: '😄', text: 'Pas grave, continue !'        },
  ],
  'nogo-error': [
    { icon: '🔍', text: "Elle n'était pas là ! Regarde bien avant de cliquer 👀" },
    { icon: '🤔', text: "Attends… est-ce qu'elle est vraiment là ?"              },
    { icon: '🐢', text: 'Prends le temps de regarder avant de cliquer !'          },
  ],
};

@Component({
  selector: 'app-feedback-box',
  templateUrl: './feedback-box.component.html',
  styleUrls: ['./feedback-box.component.scss']
})
export class FeedbackBoxComponent {
  currentIcon: string = '🎉';
  currentMsg: string = 'Bravo !';
  cssClass: string = 'success';
  isVisible: boolean = false;

  private _timeout: any = null;

  show(type: string) {
    clearTimeout(this._timeout);

    const pool = MESSAGES[type] || MESSAGES['go-success'];
    const pick = pool[Math.floor(Math.random() * pool.length)];

    this.currentIcon = pick.icon;
    this.currentMsg = pick.text;

    const isSuccess = type.includes('success');
    this.cssClass = isSuccess ? 'success' : 'error';

    this.isVisible = false;
    setTimeout(() => {
      this.isVisible = true;
      this._timeout = setTimeout(() => {
        this.isVisible = false;
      }, isSuccess ? 2500 : 2000);
    }, 10);
  }
}