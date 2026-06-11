// Registriert die App als PWA für die Offline-Nutzung
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('PWA Service Worker registriert!', reg))
      .catch(err => console.log('Service Worker Fehler', err));
  });
}
const farben = ['Pik', 'Karo', 'Herz', 'Kreuz'];
const werte = ['A', 'K', 'D', 'B', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
let ausgewaehlteKarten = [];

// 1. FOTO-AUSWAHL & VORSCHAU (GALERIE / DIREKTE KAMERA-AUFNAHME)
window.bildAusgewaehlt = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('preview-container');
        
        if (preview && container) {
            preview.src = e.target.result; // Setzt das geladene Bild als Vorschau
            container.classList.remove('hidden'); // Blendet die Vorschau ein
        }
    };
    reader.readAsDataURL(file); // Liest das Foto ein
};

// INTEGRIERTE OCR-TEXTERKENNUNG (TESSERACT)
window.analysiereFoto = function() {
    const preview = document.getElementById('image-preview');
    
    if (!preview || !preview.src || preview.src === window.location.href) {
        alert("Bitte wähle zuerst ein Foto aus!");
        return;
    }

    // Visuelles Feedback für den User
    const analyzeBtn = document.querySelector('.capture-btn');
    const originalText = analyzeBtn.innerText;
    analyzeBtn.innerText = "⏳ Scanne Karten (OCR)...";
    analyzeBtn.disabled = true;

    console.log("Starte Tesseract OCR-Analyse...");

    // Nutzt Deutsch und Englisch, um Buchstaben-Kombinationen optimal zu matchen
    Tesseract.recognize(
        preview.src,
        'deu+eng',
        { logger: m => console.log(m) } // Zeigt Fortschritt in F12-Konsole
    ).then(({ data: { text } }) => {
        console.log("Erkannter Text vom Bild:", text);
        const scanText = text.toUpperCase();
        let gefundeneKarten = 0;
        
        farben.forEach(farbe => {
            werte.forEach(wert => {
                const farbKuerzel = farbe.toUpperCase();
                
                // Unicode-Symbole zuweisen für flexiblen Abgleich
                let symbol = "";
                if (farbe === "Pik") symbol = "♠";
                if (farbe === "Karo") symbol = "♦";
                if (farbe === "Herz") symbol = "♥";
                if (farbe === "Kreuz") symbol = "♣";

                // Mapping für internationale Kartenwerte (D -> Q, B -> J)
                let suchWert = wert;
                if (wert === 'D') suchWert = 'Q'; 
                if (wert === 'B') suchWert = 'J'; 

                // Prüfen, ob die Farb-Wert-Kombination oder Symbol-Kombination im Freitext vorkommt
                const hatFarbe = scanText.includes(farbKuerzel) || (symbol && scanText.includes(symbol));
                const hatWert = scanText.includes(` ${wert}`) || scanText.includes(` ${suchWert}`) || scanText.startsWith(wert) || scanText.startsWith(suchWert);

                if (hatFarbe && hatWert) {
                    const container = document.querySelector(`.cards[data-color="${farbe}"]`);
                    if (container) {
                        const buttons = container.querySelectorAll('.card-btn');
                        buttons.forEach(btn => {
                            if (btn.innerText === wert && !btn.classList.contains('active')) {
                                if (ausgewaehlteKarten.length < 16) {
                                    toggleKarte(farbe, wert, btn);
                                    gefundeneKarten++;
                                }
                            }
                        });
                    }
                }
            });
        });

        analyzeBtn.innerText = originalText;
        analyzeBtn.disabled = false;

        if (gefundeneKarten > 0) {
            alert(`OCR erfolgreich! ${gefundeneKarten} Karten wurden automatisch erkannt und hinzugefügt.`);
        } else {
            alert("Das Bild wurde gelesen, aber es wurden keine eindeutigen Karten-Muster gefunden. Bitte achte auf gute Beleuchtung oder wähle die Karten manuell aus.");
        }

    }).catch(err => {
        console.error("OCR Fehler:", err);
        alert("Fehler bei der Texterkennung. Stelle sicher, dass das Script-Tag im HTML-Head korrekt eingebunden ist.");
        analyzeBtn.innerText = originalText;
        analyzeBtn.disabled = false;
    });
};

// 2. MANUELLE BUTTON-STEUERUNG (Laden beim Start)
window.onload = function() {
    farben.forEach(farbe => {
        const container = document.querySelector(`.cards[data-color="${farbe}"]`);
        if (!container) return;
        werte.forEach(wert => {
            const btn = document.createElement('button');
            btn.innerText = wert;
            btn.className = 'card-btn';
            btn.onclick = () => toggleKarte(farbe, wert, btn);
            container.appendChild(btn);
        });
    });
};

function toggleKarte(farbe, wert, btn) {
    const kartenString = `${farbe}-${wert}`;
    const index = ausgewaehlteKarten.indexOf(kartenString);

    if (index > -1) {
        ausgewaehlteKarten.splice(index, 1);
        btn.classList.remove('active');
    } else {
        if (ausgewaehlteKarten.length >= 16) return;
        ausgewaehlteKarten.push(kartenString);
        btn.classList.add('active');
    }

    document
document.getElementById('card-count').innerText = ausgewaehlteKarten.length;
    document.getElementById('calc-btn').disabled = (ausgewaehlteKarten.length !== 16);
}

// 3. TAKTISCHE RECHEN-LOGIK (MONTE CARLO)
const getCardPower = w => werte.length - 1 - werte.indexOf(w);

function gemerkteSimulation(hand, trumpf, verbleibendeKarten, wackelFarben) {
    const SIMULATIONEN = 1000;
    let gesamtStiche = 0;
    let stichHistorie = []; 

    for (let sim = 0; sim < SIMULATIONEN; sim++) {
        let deck = [...verbleibendeKarten];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        let gegner1 = deck.slice(0, 16);
        let gegner2 = deck.slice(16, 32);

        let meineSimHand = ausgewaehlteKarten.map(k => {
            const [f, w] = k.split('-');
            return { farbe: f, wert: w, power: getCardPower(w) };
        });

        let trumpfDraussenAnzahl = gegner1.filter(c => c.farbe === trumpf).length + gegner2.filter(c => c.farbe === trumpf).length;
        let sticheInDieserRunde = 0;

        for (let runde = 0; runde < 16; runde++) {
            if (meineSimHand.length === 0) break;

            let ausgespielteKarte;
            let trumpfKartenAufHand = meineSimHand.filter(c => c.farbe === trumpf);
            
            if (trumpfDraussenAnzahl > 0 && trumpfKartenAufHand.length > 0 && sticheInDieserRunde > 0) {
                trumpfKartenAufHand.sort((a, b) => b.power - a.power);
                ausgespielteKarte = trumpfKartenAufHand[0];
            } else {
                meineSimHand.sort((a, b) => b.power - a.power);
                ausgespielteKarte = meineSimHand[0];
            }

            meineSimHand = meineSimHand.filter(c => !(c.farbe === ausgespielteKarte.farbe && c.wert === ausgespielteKarte.wert));

            let g1Karte = gegnerBedientRegelkonform(gegner1, ausgespielteKarte.farbe, trumpf, ausgespielteKarte, null);
            
            let aktuellHoechste = ausgespielteKarte;
            if (g1Karte && gewinntStich(g1Karte, ausgespielteKarte, null, trumpf)) {
                aktuellHoechste = g1Karte;
            }
            let g2Karte = gegnerBedientRegelkonform(gegner2, ausgespielteKarte.farbe, trumpf, ausgespielteKarte, aktuellHoechste);

            // KORREKTUR: Wenn Trumpf gespielt wird, verringert sich die Anzahl der Trümpfe draußen korrekt
            if (ausgespielteKarte.farbe === trumpf) trumpfDraussenAnzahl = Math.max(0, trumpfDraussenAnzahl - 1);
            if (g1Karte && g1Karte.farbe === trumpf) trumpfDraussenAnzahl = Math.max(0, trumpfDraussenAnzahl - 1);
            if (g2Karte && g2Karte.farbe === trumpf) trumpfDraussenAnzahl = Math.max(0, trumpfDraussenAnzahl - 1);

            if (gewinntStich(ausgespielteKarte, g1Karte, g2Karte, trumpf)) {
                sticheInDieserRunde++;
            }
        }

        // KORREKTUR: Künstliche pauschale Abzüge entfernt, da die Simulation das reale Spiel abbildet
        let bereinigteStiche = sticheInDieserRunde; 
        
        gesamtStiche += bereinigteStiche;
        stichHistorie.push(bereinigteStiche);
    }

    let finaleStiche = Math.round(gesamtStiche / SIMULATIONEN);
    let erfolgreicheSpiele = stichHistorie.filter(s => s >= finaleStiche).length;
    let wahrscheinlichkeit = Math.round((erfolgreicheSpiele / SIMULATIONEN) * 100);

    return { finaleStiche, wahrscheinlichkeit, trumpf };
}

window.analysiereHand = function() {
    let hand = { Pik: [], Karo: [], Herz: [], Kreuz: [] };
    ausgewaehlteKarten.forEach(k => {
        const [f, w] = k.split('-');
        hand[f].push(w);
    });

    let trumpf = '';
    let maxTrumpfWert = -100;
    farben.forEach(f => {
        let anzahl = hand[f].length;
        if (anzahl === 0) return;
        let wertung = anzahl * 2;
        if (hand[f].includes('A')) wertung += 3;
        if (hand[f].includes('K')) wertung += 2;
        if (hand[f].includes('D')) wertung += 1;
        if (wertung > maxTrumpfWert) {
            maxTrumpfWert = wertung;
            trumpf = f;
        }
    });

    let verbleibendeKarten = [];
    farben.forEach(f => {
        werte.forEach(w => {
            const cardStr = `${f}-${w}`;
            if (!ausgewaehlteKarten.includes(cardStr)) {
                verbleibendeKarten.push({ farbe: f, wert: w, power: getCardPower(w) });
            }
        });
    });

    let wackelFarben = 0;
    farben.forEach(f => {
        if (f === trumpf) return;
        let kartenInFarbe = hand[f];
        if (kartenInFarbe.length > 0) {
            if (!kartenInFarbe.includes('A') && !(kartenInFarbe.includes('K') && kartenInFarbe.length >= 2)) {
                wackelFarben++;
            }
        }
    });

    const ergebnis = gemerkteSimulation(hand, trumpf, verbleibendeKarten, wackelFarben);

    let gebotText = '';
    if (ergebnis.finaleStiche >= 13) {
        gebotText = "KING (13 Stiche)";
    } else if (ergebnis.finaleStiche >= 8) {
        gebotText = `${ergebnis.finaleStiche} Stiche`;
    } else {
        gebotText = "PASSE";
    }

    document.getElementById('rec-gebot').innerText = gebotText;
    document.getElementById('rec-prob').innerText = `${ergebnis.wahrscheinlichkeit}%`;
    document.getElementById('rec-trumpf').innerText = ergebnis.trumpf ? `${ergebnis.trumpf}` : '-';
    document.getElementById('result-box').classList.remove('hidden');
};

function gegnerBedientRegelkonform(gegnerHand, ausgespielteFarbe, trumpf, startKarte, hoechsteKarteAufTisch) {
    if (gegnerHand.length === 0) return null;
    let zielKarte = hoechsteKarteAufTisch || startKarte;

    let passende = gegnerHand.filter(c => c.farbe === ausgespielteFarbe);
    if (passende.length > 0) {
        // Sortiere so, dass die schwächste Karte am Ende steht (für echtes Drüberstechen)
        if (zielKarte.farbe === ausgespielteFarbe) {
            let hoehere = passende.filter(c => c.power > zielKarte.power);
            if (hoehere.length > 0) {
                // Nimm die kleinste Karte, die GERADE SO ausreicht, um zu gewinnen
                hoehere.sort((a, b) => a.power - b.power);
                let gewaehlt = hoehere[0];
                gegnerHand.splice(gegnerHand.indexOf(gewaehlt), 1);
                return gewaehlt;
            }
        }
        // Wenn man nicht drüberstechen kann, wirf die SCHWÄCHSTE Karte ab (höchste Power-Zahl bedeutet schwächere Karte bei deiner Logik)
        passende.sort((a, b) => b.power - a.power);
        let gewaehlt = passende[0];
        gegnerHand.splice(gegnerHand.indexOf(gewaehlt), 1);
        return gewaehlt;
    }

    if (ausgespielteFarbe !== trumpf) {
        let truesmfe = gegnerHand.filter(c => c.farbe === trumpf);
        if (truesmfe.length > 0) {
            if (zielKarte.farbe === trumpf) {
                let hoehereTrumpf = truesmfe.filter(c => c.power > zielKarte.power);
                if (hoehereTrumpf.length > 0) {
                    hoehereTrumpf.sort((a, b) => a.power - b.power);
                    let gewaehlt = hoehereTrumpf[0];
                    gegnerHand.splice(gegnerHand.indexOf(gewaehlt), 1);
                    return gewaehlt;
                }
            } else {
                truesmfe.sort((a, b) => a.power - b.power);
                let gewaehlt = truesmfe[0];
                gegnerHand.splice(gegnerHand.indexOf(gewaehlt), 1);
                return gewaehlt;
            }
        }
    }

    // Wenn man gar nichts Sinnvolles tun kann, wirf die absolut schwächste Karte ab
    gegnerHand.sort((a, b) => b.power - a.power);
    return gegnerHand.shift();
}

function gewinntStich(meine, g1, g2, trumpf) {
    let mP = meine.power;
    let g1P = g1 ? g1.power : -1;
    let g2P = g2 ? g2.power : -1;

    let meinTrumpf = meine.farbe === trumpf;
    let g1Trumpf = g1 && g1.farbe === trumpf;
    let g2Trumpf = g2 && g2.farbe === trumpf;

    if (meinTrumpf || g1Trumpf || g2Trumpf) {
        let maxTrumpfPower = -1;
        let gewinner = 'ich';

        if (meinTrumpf) maxTrumpfPower = mP;
        if (g1Trumpf && g1P > maxTrumpfPower) { maxTrumpfPower = g1P; gewinner = 'g1'; }
        if (g2Trumpf && g2P > maxTrumpfPower) { maxTrumpfPower = g2P; gewinner = 'g2'; }

        return gewinner === 'ich';
    }

    let maxPower = mP;
    let gewinner = 'ich';

    if (g1 && g1.farbe === meine.farbe && g1P > maxPower) { 
        maxPower = g1P; 
        gewinner = 'g1'; 
    }
    // KORREKTUR: maxPower für g2 wird jetzt sauber aktualisiert!
    if (g2 && g2.farbe === meine.farbe && g2P > maxPower) { 
        maxPower = g2P;
        gewinner = 'g2'; 
    }

    return gewinner === 'ich';
}
