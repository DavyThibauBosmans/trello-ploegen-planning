var t = TrelloPowerUp.iframe();

var DEFAULT_PLOEGEN = ["Ploeg 1", "Ploeg 2", "Ploeg 5", "Ploeg 7 / Extra"];
var ploegen = DEFAULT_PLOEGEN.slice();
var VERLOF_ROW_KEY = '__verlof__';
var VIEW_MODUS = 'week';
var WEEK_DAGNAMEN_KORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
var WEEK_DAGNAMEN_LANG = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
var MAAND_NAMEN_KORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
var MAAND_NAMEN_LANG = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

var ankerDatum = new Date();
ankerDatum.setHours(0, 0, 0, 0);

var datumsVanDeWeek = [];
var weekendVlaggen = [];
var trelloKaartCache = {};
var placementCtx = {};

var CUSTOM_COLORS = [
    { bg: '#dfe1e6', text: '#172b4d' },
    { bg: '#ff9f1a', text: '#172b4d' },
    { bg: '#61bd4f', text: '#ffffff' },
    { bg: '#f2d600', text: '#172b4d' },
    { bg: '#0079bf', text: '#ffffff' },
    { bg: '#89609e', text: '#ffffff' },
    { bg: '#ec4c3c', text: '#ffffff' },
    { bg: '#00c2e0', text: '#172b4d' }
];

var PROJECTLEIDERS = [
    { username: 'jenstriest',      naam: 'Jens',            bg: '#ff9f1a', text: '#172b4d' },
    { username: 'evageeroms',      naam: 'Eva',             bg: '#61bd4f', text: '#ffffff' },
    { username: 'davythibau01',    naam: 'Davy',            bg: '#f2d600', text: '#172b4d' },
    { username: 'bertdebie1',      naam: 'Bert',            bg: '#0079bf', text: '#ffffff' },
    { username: 'laurenabsillis1', naam: 'Lauren Absillis', bg: '#c377e0', text: '#ffffff' }
];
var STANDAARD_KAART_STIJL = { bg: '#eaecf0', text: '#172b4d' };

var DEV_MODE = false;
var ADMIN_USERNAMES = ['laurenabsillis1', 'davythibau01'];
var isAdmin = false;
var tableZoom = 1.0;
var tableZoomAuto = true;

function toepassenAdminStatus() {
    var indicator = document.getElementById('mode-indicator');
    if (isAdmin) {
        document.body.classList.remove('view-only-mode');
        if (indicator) { indicator.textContent = '✏️ Bewerken ingeschakeld'; indicator.className = 'mode-indicator edit-mode'; }
    } else {
        document.body.classList.add('view-only-mode');
        if (indicator) { indicator.textContent = '👁️ Alleen-kijken modus'; indicator.className = 'mode-indicator view-only'; }
    }
}

document.addEventListener('click', function() {
    document.querySelectorAll('.color-picker-menu').forEach(function(m) { m.remove(); });
});

/* ── PRINT LOGICA ── */
function printPlanning(modus) {
    var oudeStyle = document.getElementById('print-page-override');
    if (oudeStyle) oudeStyle.remove();
    document.body.classList.remove('print-mode-week', 'print-mode-month', 'print-mode-multi');
    var MM_TO_PX = 3.7795;
    var pageCSS, nettoBreedteMM, nettoHoogteMM;
    if (modus === 'week') {
        pageCSS        = '@page { size: A3 portrait; margin: 10mm 8mm 10mm 8mm; }';
        nettoBreedteMM = 297 - 8 - 8;
        nettoHoogteMM  = 420 - 10 - 10;
    } else if (modus === 'multi') {
        pageCSS        = '@page { size: A3 landscape; margin: 8mm 6mm 8mm 6mm; }';
        nettoBreedteMM = 420 - 6 - 6;
        nettoHoogteMM  = 297 - 8 - 8;
    } else { /* month */
        pageCSS        = '@page { size: A3 landscape; margin: 8mm 6mm 8mm 6mm; }';
        nettoBreedteMM = 420 - 6 - 6;
        nettoHoogteMM  = 297 - 8 - 8;
    }
    var nettoBreedtePx = nettoBreedteMM * MM_TO_PX;
    var nettoHoogtePx  = nettoHoogteMM  * MM_TO_PX;
    var stijlEl = document.createElement('style');
    stijlEl.id = 'print-page-override';
    stijlEl.textContent = pageCSS;
    document.head.appendChild(stijlEl);
    document.body.classList.add('print-mode-' + modus);
    setTimeout(function() {
        var mainContent = document.querySelector('.main-content');
        var tabelWrap   = document.querySelector('.table-scroll-wrap');
        if (mainContent && tabelWrap) {
            mainContent.style.transform = '';
            mainContent.style.transformOrigin = '';
            mainContent.style.width = '';
            var table = mainContent.querySelector('.planning-table');
            if (table) table.style.zoom = '';
            var contentBreedte = mainContent.scrollWidth;
            var contentHoogte  = mainContent.scrollHeight;
            var schaalB = nettoBreedtePx / contentBreedte;
            var schaalH = nettoHoogtePx  / contentHoogte;
            var schaal  = Math.min(schaalB, schaalH, 1);
            /* Maand: als schaal te klein → 2 pagina's */
            if (modus === 'month' && schaal < 0.55) {
                if (table) table.style.zoom = tableZoom;
                printMaand2Paginas(stijlEl);
                return;
            }
            if (schaal < 0.999) {
                stijlEl.textContent += [
                    '@media print {',
                    '  .main-content {',
                    '    transform: scale(' + schaal.toFixed(4) + ') !important;',
                    '    transform-origin: top left !important;',
                    '    width: ' + Math.round(100 / schaal) + '% !important;',
                    '  }',
                    '}'
                ].join('\n');
            }
        }
        window.print();
        setTimeout(function() {
            document.body.classList.remove('print-mode-week', 'print-mode-month', 'print-mode-multi');
            var s = document.getElementById('print-page-override');
            if (s) s.remove();
            if (mainContent) {
                mainContent.style.transform = '';
                mainContent.style.transformOrigin = '';
                mainContent.style.width = '';
                var tAfter = mainContent.querySelector('.planning-table');
                if (tAfter) tAfter.style.zoom = tableZoom;
            }
        }, 1500);
    }, 120);
}

/* ── 2-PAGINA MAAND PRINT ── */
function printMaand2Paginas(stijlEl) {
    var table = document.querySelector('.planning-table');
    if (!table) { window.print(); return; }

    var helft = Math.ceil(datumsVanDeWeek.length / 2);

    /* Kloon de tabel 2× */
    var kloon1 = table.cloneNode(true);
    var kloon2 = table.cloneNode(true);

    /* Verwijder overbodige kolommen uit een kloon
       kolommen in tabel: idx 0 = ploeg, idx 1..N = dagkolommen
       verwijderVan en verwijderTot zijn 0-based dag-indices */
    function verwijderDagKolommen(kloon, verwijderVan, verwijderTot) {
        Array.from(kloon.querySelectorAll('tr')).forEach(function(rij) {
            var cellen = Array.from(rij.children);
            for (var i = cellen.length - 1; i >= 1; i--) {
                var dagIdx = i - 1; /* 0-based dag index */
                if (dagIdx >= verwijderVan && dagIdx < verwijderTot) {
                    rij.removeChild(cellen[i]);
                }
            }
        });
    }

    /* Kloon 1: behoud dag 0..helft-1, verwijder helft..einde */
    verwijderDagKolommen(kloon1, helft, datumsVanDeWeek.length);
    /* Kloon 2: behoud dag helft..einde, verwijder 0..helft-1 */
    verwijderDagKolommen(kloon2, 0, helft);

    /* Grenscorrectie: herstel border-radius en positie aan de knipranden */
    function herstelGrens(kloon) {
        /* band-not-last zonder opvolger in kloon → herstel rechts */
        kloon.querySelectorAll('.placement-band.band-not-last').forEach(function(el) {
            var iid = el.dataset.instanceId || el.dataset.intId;
            if (!iid) return;
            var segs = kloon.querySelectorAll('[data-instance-id="' + iid + '"], [data-int-id="' + iid + '"]');
            if (segs.length <= 1 || segs[segs.length - 1] === el) {
                el.classList.remove('band-not-last');
                el.style.right = '0';
                el.style.borderTopRightRadius = '6px';
                el.style.borderBottomRightRadius = '6px';
            }
        });
        /* band-not-first als eerste zichtbaar in kloon → herstel links + voeg card-body toe */
        kloon.querySelectorAll('.placement-band.band-not-first').forEach(function(el) {
            var iid = el.dataset.instanceId || el.dataset.intId;
            if (!iid) return;
            var segs = kloon.querySelectorAll('[data-instance-id="' + iid + '"], [data-int-id="' + iid + '"]');
            if (segs[0] !== el) return; /* niet de eerste in kloon */
            el.classList.remove('band-not-first');
            el.style.left = '0';
            el.style.borderTopLeftRadius = '6px';
            el.style.borderBottomLeftRadius = '6px';
            /* Voeg card-body toe als die ontbreekt (band-not-first heeft geen card-body) */
            if (!el.querySelector('.card-body')) {
                var origSeg = document.querySelector('[data-instance-id="' + iid + '"]') ||
                              document.querySelector('[data-int-id="' + iid + '"]');
                if (origSeg) {
                    var origBody = origSeg.querySelector('.card-body');
                    if (origBody) el.insertBefore(origBody.cloneNode(true), el.firstChild);
                }
            }
        });
    }
    herstelGrens(kloon1);
    herstelGrens(kloon2);

    /* Bouw print-container */
    var container = document.createElement('div');
    container.id = 'print-2page-container';

    var wrap1 = document.createElement('div'); wrap1.className = 'print-2page-sectie';
    wrap1.appendChild(kloon1);
    var pageBreak = document.createElement('div');
    pageBreak.style.cssText = 'page-break-after:always;break-after:page;';
    var wrap2 = document.createElement('div'); wrap2.className = 'print-2page-sectie';
    wrap2.appendChild(kloon2);

    container.appendChild(wrap1);
    container.appendChild(pageBreak);
    container.appendChild(wrap2);

    /* CSS voor de gekloonde tabellen */
    stijlEl.textContent += [
        '@media print {',
        '  .print-2page-sectie .planning-table {',
        '    table-layout: auto !important; width: 100% !important; font-size: 8px !important;',
        '  }',
        '  .print-2page-sectie .col-ploeg { width: 70px !important; }',
        '  .print-2page-sectie .col-dag { min-width: 0 !important; }',
        '  .print-2page-sectie .card-title { font-size: 8px !important; }',
        '  .print-2page-sectie .card-address { font-size: 7px !important; }',
        '  .print-2page-sectie .card-info-placement { font-size: 7px !important; }',
        '  .print-2page-sectie .planning-table th,',
        '  .print-2page-sectie .planning-table td { padding: 1px 2px !important; font-size: 8px !important; }',
        '  .print-2page-sectie .planning-table th { font-size: 7px !important; }',
        '  .print-2page-sectie .verlof-segment { font-size: 7px !important; padding: 1px 3px !important; min-height: 16px !important; }',
        '  .print-2page-sectie .placement-band { padding: 2px 4px !important; overflow: visible !important; }',
        '}'
    ].join('\n');

    table.style.display = 'none';
    document.querySelector('.table-scroll-wrap').appendChild(container);
    document.body.classList.add('print-2page-modus');

    window.print();

    setTimeout(function() {
        table.style.display = '';
        document.body.classList.remove('print-2page-modus', 'print-mode-month');
        if (container.parentNode) container.parentNode.removeChild(container);
        var s = document.getElementById('print-page-override');
        if (s) s.remove();
        table.style.zoom = tableZoom;
    }, 1500);
}

(function koppelZoomControls() {
    var wrap = document.querySelector('.table-scroll-wrap');
    if (wrap) {
        wrap.addEventListener('wheel', function(e) {
            if (!e.ctrlKey) return;
            e.preventDefault();
            tableZoomAuto = false;
            pasZoomToe(tableZoom * (e.deltaY < 0 ? 1.08 : 0.93));
        }, { passive: false });
    }
    var outBtn = document.getElementById('zoom-out-btn');
    var inBtn  = document.getElementById('zoom-in-btn');
    var fitBtn = document.getElementById('zoom-fit-btn');
    if (outBtn) outBtn.addEventListener('click', function() { tableZoomAuto = false; pasZoomToe(tableZoom * 0.85); });
    if (inBtn)  inBtn.addEventListener('click',  function() { tableZoomAuto = false; pasZoomToe(tableZoom * 1.18); });
    if (fitBtn) fitBtn.addEventListener('click', function() { tableZoomAuto = true;  autoFitZoom(); });
    window.addEventListener('resize', function() { if (tableZoomAuto) autoFitZoom(); });
})();

(function koppelPrintKnoppen() {
    var weekBtn  = document.getElementById('print-week-btn');
    var maandBtn = document.getElementById('print-month-btn');
    /* Week-knop print de huidige view: week=staand A3, multi/maand=liggend A3 */
    if (weekBtn) weekBtn.addEventListener('click', function() {
        printPlanning(VIEW_MODUS === 'week' ? 'week' : VIEW_MODUS === 'multi' ? 'multi' : 'month');
    });
    if (maandBtn) maandBtn.addEventListener('click', function() { printPlanning('month'); });
})();

/* ── LEGENDE ── */
function bouwLegende() {
    var container = document.getElementById('legenda-items');
    if (!container) return;
    container.innerHTML = '';
    PROJECTLEIDERS.forEach(function(p) {
        var item = document.createElement('div');
        item.className = 'legenda-item';
        var swatch = document.createElement('span');
        swatch.className = 'legenda-swatch';
        swatch.style.backgroundColor = p.bg;
        item.appendChild(swatch);
        var label = document.createElement('span');
        label.innerText = p.naam;
        item.appendChild(label);
        container.appendChild(item);
    });
    var item = document.createElement('div');
    item.className = 'legenda-item';
    var swatch = document.createElement('span');
    swatch.className = 'legenda-swatch';
    swatch.style.backgroundColor = STANDAARD_KAART_STIJL.bg;
    item.appendChild(swatch);
    var label = document.createElement('span');
    label.innerText = 'Overig / onbekend';
    item.appendChild(label);
    container.appendChild(item);
}

var legendaToggle = document.getElementById('legenda-toggle');
if (legendaToggle) {
    legendaToggle.addEventListener('click', function() {
        document.getElementById('legenda').classList.toggle('open');
    });
}

/* ── VIEW-SCHAKELAAR ── */
function markeerActieveViewKnop() {
    document.querySelectorAll('.view-switch-btn').forEach(function(btn) {
        if (btn.dataset.viewMode === VIEW_MODUS) btn.classList.add('actief');
        else btn.classList.remove('actief');
    });
}

function wisselView(nieuweModus) {
    if (nieuweModus === VIEW_MODUS) return;
    if (['week', 'multi', 'month'].indexOf(nieuweModus) === -1) return;
    VIEW_MODUS = nieuweModus;
    tableZoomAuto = true;
    document.body.dataset.view = VIEW_MODUS;
    markeerActieveViewKnop();
    snapAnkerNaarPeriode();
    t.set('board', 'shared', 'viewMode', VIEW_MODUS);
    bewaarAnker();
    laadEnRenderAlles();
}

(function koppelViewSchakelaar() {
    var switcher = document.getElementById('view-switcher');
    if (!switcher) return;
    switcher.addEventListener('click', function(e) {
        var btn = e.target.closest('.view-switch-btn');
        if (!btn) return;
        wisselView(btn.dataset.viewMode);
    });
})();

/* ── ANKER-HELPERS ── */
function startVanHuidigePeriode(d) {
    var basis = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    basis.setHours(0, 0, 0, 0);
    if (VIEW_MODUS === 'month') return new Date(basis.getFullYear(), basis.getMonth(), 1);
    var dag = basis.getDay();
    var afstand = (dag === 0) ? -6 : 1 - dag;
    basis.setDate(basis.getDate() + afstand);
    return basis;
}
function snapAnkerNaarPeriode() { ankerDatum = startVanHuidigePeriode(ankerDatum); }
function verschuifAnker(richting) {
    var d = new Date(ankerDatum);
    if (VIEW_MODUS === 'month') {
        d.setMonth(d.getMonth() + richting);
        d = new Date(d.getFullYear(), d.getMonth(), 1);
    } else {
        var stap = (VIEW_MODUS === 'multi') ? 14 : 7;
        d.setDate(d.getDate() + richting * stap);
    }
    d.setHours(0, 0, 0, 0);
    ankerDatum = d;
    bewaarAnker();
    laadEnRenderAlles();
}
function springNaarVandaag() {
    ankerDatum = new Date(); ankerDatum.setHours(0, 0, 0, 0);
    snapAnkerNaarPeriode(); bewaarAnker(); laadEnRenderAlles();
}
function springNaarDatum(isoStr) {
    if (!isoStr) return;
    var parts = isoStr.split('-');
    if (parts.length !== 3) return;
    var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
    if (isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0); ankerDatum = d;
    snapAnkerNaarPeriode(); bewaarAnker(); laadEnRenderAlles();
}
function bewaarAnker() { t.set('board', 'shared', 'ankerDatum', isoVanDate(ankerDatum)); }

(function koppelTijdlijnNav() {
    var prev   = document.getElementById('nav-prev');
    var next   = document.getElementById('nav-next');
    var today  = document.getElementById('nav-today');
    var picker = document.getElementById('nav-datepicker');
    if (prev)  prev.addEventListener('click',  function() { verschuifAnker(-1); });
    if (next)  next.addEventListener('click',  function() { verschuifAnker(1); });
    if (today) today.addEventListener('click', springNaarVandaag);
    if (picker) {
        var nu = new Date();
        picker.min = isoVanDate(new Date(nu.getFullYear() - 1, 0, 1));
        picker.max = isoVanDate(new Date(nu.getFullYear() + 2, 11, 31));
        picker.addEventListener('change', function() { springNaarDatum(this.value); });
    }
})();

/* ── OMSCHRIJVING PARSER (architect weggelaten) ── */
function parseDescriptionFields(desc) {
    if (!desc) return {};
    var lines = desc.split('\n');
    var extracted = {};
    var fieldMappings = [
        { key: 'Project Naam',    label: '📁 Project'   },
        { key: 'Voornaam Klant',  label: '👤 Klant'     },
        { key: 'Tel Klant',       label: '📞 Tel Klant' },
        { key: 'Toegang werf',    label: '🔑 Toegang'   },
        { key: 'CIAW',            label: '📋 CIAW'      },
        { key: 'Opmerkingen',     label: '💬 Opmerking' },
        { key: 'Gsm',             label: '📞 Gsm'       },
        { key: 'Mail',            label: '✉️ Mail'       },
        { key: 'Bestellingen',    label: '📦 Bestel'    },
        { key: 'Meerwerken',      label: '➕ Meerwerk'  },
        { key: 'Plaatsingsadres', label: '📍 Adres'     },
        { key: 'Adres',           label: '📍 Adres'     }
    ];
    lines.forEach(function(line) {
        var parts = line.split(':');
        if (parts.length >= 2) {
            var leftSide  = parts[0].replace(/[🏡🔑📍📞✉️📦➕📁👤📐💳📋💬]/g, '').trim().toLowerCase();
            var rightSide = parts.slice(1).join(':').trim();
            if (rightSide && rightSide !== '') {
                for (var i = 0; i < fieldMappings.length; i++) {
                    var mapping = fieldMappings[i];
                    if (leftSide === mapping.key.toLowerCase()) {
                        if (!extracted[mapping.label]) extracted[mapping.label] = rightSide;
                        break;
                    }
                }
            }
        }
    });
    return extracted;
}

/* ── DATUM HELPERS ── */
function isoVanDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function isISO(str) { return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str); }
function ddMMNaarDate(datumStr) {
    if (!datumStr) return null;
    if (isISO(datumStr)) {
        var p = datumStr.split('-');
        var d = new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10));
        d.setHours(0,0,0,0); return d;
    }
    var parts = datumStr.split('-');
    if (parts.length < 2) return null;
    var dag = parseInt(parts[0],10), maand = parseInt(parts[1],10)-1;
    var jaar = ankerDatum ? ankerDatum.getFullYear() : new Date().getFullYear();
    var od = new Date(jaar, maand, dag); od.setHours(0,0,0,0); return od;
}
function dateNaarDdMM(d) { return isoVanDate(d); }
function aantalDagenTussen(start, eind) {
    var s = ddMMNaarDate(start), e = ddMMNaarDate(eind);
    if (!s || !e) return 0;
    return Math.round((e.getTime() - s.getTime()) / (1000*60*60*24));
}
function voegDagenToe(datumStr, dagen) {
    var d = ddMMNaarDate(datumStr); if (!d) return datumStr;
    d.setDate(d.getDate() + dagen); return dateNaarDdMM(d);
}
function dagenBinnenWeek(startDatum, eindDatum) {
    var sD = ddMMNaarDate(startDatum), eD = ddMMNaarDate(eindDatum);
    if (!sD || !eD) return [];
    if (eD < sD) { var tmp = sD; sD = eD; eD = tmp; }
    var binnen = [];
    datumsVanDeWeek.forEach(function(weekDag) {
        var d = ddMMNaarDate(weekDag);
        if (d >= sD && d <= eD) {
            binnen.push({ datum: weekDag, isExactStart: d.getTime()===sD.getTime(), isExactEind: d.getTime()===eD.getTime() });
        }
    });
    binnen.forEach(function(d, idx) {
        d.isFirstVisible = (idx === 0);
        d.isLastVisible  = (idx === binnen.length - 1);
    });
    return binnen;
}

/* ── PERIODE-LABEL ── */
function isoWeekNummer(d) {
    var dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dag = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dag);
    var jaarStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    return Math.ceil((((dt - jaarStart) / 86400000) + 1) / 7);
}
function updatePeriodeLabel() {
    var el = document.getElementById('periode-label');
    if (!el || datumsVanDeWeek.length === 0) return;
    var eersteD = ddMMNaarDate(datumsVanDeWeek[0]);
    var laatsteD = ddMMNaarDate(datumsVanDeWeek[datumsVanDeWeek.length - 1]);
    var tekst;
    if (VIEW_MODUS === 'month') {
        tekst = MAAND_NAMEN_LANG[eersteD.getMonth()] + ' ' + eersteD.getFullYear();
    } else {
        var wk = isoWeekNummer(eersteD);
        var dStart = eersteD.getDate() + ' ' + MAAND_NAMEN_KORT[eersteD.getMonth()];
        var dEind  = laatsteD.getDate() + ' ' + MAAND_NAMEN_KORT[laatsteD.getMonth()] + ' ' + laatsteD.getFullYear();
        if (VIEW_MODUS === 'multi') {
            tekst = 'Week ' + wk + '–' + isoWeekNummer(laatsteD) + ' · ' + dStart + ' — ' + dEind;
        } else {
            tekst = 'Week ' + wk + ' · ' + dStart + ' — ' + dEind;
        }
    }
    el.innerText = tekst;
    var todayBtn = document.getElementById('nav-today');
    if (todayBtn) {
        var nu = new Date(); nu.setHours(0,0,0,0);
        var nuStart = startVanHuidigePeriode(nu);
        if (isoVanDate(nuStart) === isoVanDate(ankerDatum)) todayBtn.classList.add('op-vandaag');
        else todayBtn.classList.remove('op-vandaag');
    }
    var picker = document.getElementById('nav-datepicker');
    if (picker) picker.value = isoVanDate(ankerDatum);
}

/* ── ZICHTBARE DAGEN ── */
function berekenWeekDatums() {
    datumsVanDeWeek = []; weekendVlaggen = [];
    var startDatum = startVanHuidigePeriode(ankerDatum);
    var aantalDagen;
    if (VIEW_MODUS === 'month') {
        aantalDagen = new Date(startDatum.getFullYear(), startDatum.getMonth() + 1, 0).getDate();
    } else {
        aantalDagen = (VIEW_MODUS === 'multi') ? 14 : 7;
    }
    for (var i = 0; i < aantalDagen; i++) {
        var d = new Date(startDatum);
        d.setDate(startDatum.getDate() + i); d.setHours(0,0,0,0);
        datumsVanDeWeek.push(dateNaarDdMM(d));
        weekendVlaggen.push(d.getDay() === 0 || d.getDay() === 6);
    }
    bouwTabelHeader();
    updatePeriodeLabel();
}

/* ── TABEL-HEADER ──
   is-vandaag wordt nu ook als is-verleden behandeld (geen blauwe stijl meer). */
function bouwTabelHeader() {
    var headRow = document.getElementById('table-head-row');
    if (!headRow) return;
    while (headRow.children.length > 1) headRow.removeChild(headRow.lastChild);
    var vandaagISO = isoVanDate(new Date());
    datumsVanDeWeek.forEach(function(ddmm, idx) {
        var th = document.createElement('th');
        th.className = 'col-dag';
        var isWeekend = weekendVlaggen[idx];
        if (isWeekend) th.classList.add('is-weekend');
        var d = ddMMNaarDate(ddmm);
        var dd = String(d.getDate()).padStart(2,'0');
        var mm = String(d.getMonth()+1).padStart(2,'0');
        var dISO = isoVanDate(d);
        /* Markeer verleden én vandaag als is-verleden (geen is-vandaag meer) */
        if (dISO <= vandaagISO) th.classList.add('is-verleden');
        if (isWeekend) {
            th.innerHTML = WEEK_DAGNAMEN_KORT[d.getDay()] + '<br>' + dd + '/' + mm;
        } else if (VIEW_MODUS === 'month') {
            th.innerText = WEEK_DAGNAMEN_KORT[d.getDay()] + ' ' + dd + '/' + mm;
        } else {
            th.innerText = WEEK_DAGNAMEN_LANG[d.getDay()] + ' ' + dd + '/' + mm;
        }
        headRow.appendChild(th);
    });
}

function maakZoneId(ploeg, datum) {
    return 'zone-' + String(ploeg).replace(/[\s\/]+/g, '-') + '-' + datum;
}

function toonPloegMelding(rijEl, tekst) {
    if (!rijEl) return;
    var bestaand = rijEl.querySelector('.ploeg-warning');
    if (bestaand) bestaand.remove();
    var w = document.createElement('div');
    w.className = 'ploeg-warning'; w.innerText = '⚠️ ' + tekst;
    rijEl.appendChild(w);
    setTimeout(function() { w.classList.add('show'); }, 10);
    setTimeout(function() { w.classList.remove('show'); setTimeout(function() { if (w.parentNode) w.parentNode.removeChild(w); }, 200); }, 3200);
}

/* ── TABEL OPBOUW ── */
function bouwTabel() {
    var tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    var aantalDagen = datumsVanDeWeek.length;
    var vandaagISO = isoVanDate(new Date());

    /* markeerTijd: verleden én vandaag krijgen is-verleden */
    function markeerTijd(cel, datumStr) {
        var dISO = isoVanDate(ddMMNaarDate(datumStr));
        if (dISO <= vandaagISO) cel.classList.add('is-verleden');
    }

    /* VERLOF-RIJ */
    var trV = document.createElement('tr');
    var tdLabel = document.createElement('td');
    tdLabel.className = 'row-verlof-label col-ploeg';
    tdLabel.innerText = 'Afwezig';
    trV.appendChild(tdLabel);
    for (var i = 0; i < aantalDagen; i++) {
        var tdV = document.createElement('td');
        tdV.className = 'dropzone verlof-zone col-dag';
        if (weekendVlaggen[i]) tdV.classList.add('is-weekend');
        markeerTijd(tdV, datumsVanDeWeek[i]);
        tdV.id = maakZoneId(VERLOF_ROW_KEY, datumsVanDeWeek[i]);
        tdV.dataset.ploeg   = VERLOF_ROW_KEY;
        tdV.dataset.datum   = datumsVanDeWeek[i];
        tdV.dataset.rowType = 'verlof';
        tdV.addEventListener('dragover',  allowDrop);
        tdV.addEventListener('dragleave', dragLeave);
        tdV.addEventListener('drop',      drop);
        var addBtnV = document.createElement('button');
        addBtnV.className = 'verlof-add-btn';
        addBtnV.innerHTML = '+'; addBtnV.type = 'button';
        addBtnV.title = 'Snel verlof toevoegen';
        (function(datum) {
            addBtnV.addEventListener('click', function(e) {
                e.stopPropagation(); if (!isAdmin) return; voegVerlofToe(datum);
            });
        })(datumsVanDeWeek[i]);
        tdV.appendChild(addBtnV);
        trV.appendChild(tdV);
    }
    tbody.appendChild(trV);

    /* PLOEG-RIJEN */
    ploegen.forEach(function(ploeg) {
        var tr = document.createElement('tr');
        tr.dataset.ploeg = ploeg;
        var tdPloeg = document.createElement('td');
        tdPloeg.className = 'row-ploeg col-ploeg';
        var wrap = document.createElement('div');
        wrap.className = 'ploeg-naam-wrap';
        var naamEl = document.createElement('span');
        naamEl.className = 'ploeg-naam-editable';
        naamEl.innerText = ploeg;
        naamEl.dataset.origineel = ploeg;
        naamEl.contentEditable = false;
        (function(oudeNaam, naamElement, rijElement) {
            naamElement.addEventListener('click', function() {
                if (!isAdmin) return;
                if (naamElement.isContentEditable) return;
                naamElement.contentEditable = true; naamElement.focus();
                var range = document.createRange(); range.selectNodeContents(naamElement);
                var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            });
            naamElement.addEventListener('blur', function() {
                naamElement.contentEditable = false;
                var nieuwe = naamElement.innerText.trim();
                if (!nieuwe || nieuwe === oudeNaam) { naamElement.innerText = oudeNaam; return; }
                var bestaatAl = ploegen.some(function(p) { return p !== oudeNaam && p.toLowerCase() === nieuwe.toLowerCase(); });
                if (bestaatAl) { naamElement.innerText = oudeNaam; toonPloegMelding(rijElement, 'Er is al een ploeg met de naam "' + nieuwe + '".'); return; }
                hernoemPloeg(oudeNaam, nieuwe).catch(function(err){ console.error('Hernoemen mislukt:', err); naamElement.innerText = oudeNaam; });
            });
            naamElement.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); naamElement.blur(); }
                else if (e.key === 'Escape') { naamElement.innerText = oudeNaam; naamElement.blur(); }
            });
        })(ploeg, naamEl, tr);
        wrap.appendChild(naamEl);
        var delPloegBtn = document.createElement('span');
        delPloegBtn.className = 'ploeg-delete-btn';
        delPloegBtn.innerHTML = '&times;';
        delPloegBtn.title = 'Verwijder deze ploeg';
        (function(naam, rijElement) {
            delPloegBtn.addEventListener('click', function(e) {
                e.stopPropagation(); if (!isAdmin) return; verwijderPloeg(naam, rijElement);
            });
        })(ploeg, tdPloeg);
        wrap.appendChild(delPloegBtn);
        tdPloeg.appendChild(wrap);
        tr.appendChild(tdPloeg);
        for (var j = 0; j < aantalDagen; j++) {
            var td = document.createElement('td');
            td.className = 'dropzone col-dag';
            if (weekendVlaggen[j]) td.classList.add('is-weekend');
            markeerTijd(td, datumsVanDeWeek[j]);
            td.id = maakZoneId(ploeg, datumsVanDeWeek[j]);
            td.dataset.ploeg   = ploeg;
            td.dataset.datum   = datumsVanDeWeek[j];
            td.dataset.rowType = 'ploeg';
            td.addEventListener('dragover',  allowDrop);
            td.addEventListener('dragleave', dragLeave);
            td.addEventListener('drop',      drop);
            var addBtn = document.createElement('button');
            addBtn.className = 'cell-add-btn';
            addBtn.innerHTML = '+'; addBtn.type = 'button';
            addBtn.title = 'Snelle interventie toevoegen';
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation(); if (!isAdmin) return;
                var pzone = this.parentElement;
                voegDirecteInterventieToe(pzone.dataset.ploeg, pzone.dataset.datum);
            });
            td.appendChild(addBtn);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    var trAdd = document.createElement('tr');
    trAdd.className = 'add-ploeg-row';
    var tdAdd = document.createElement('td');
    tdAdd.colSpan = aantalDagen + 1;
    var addPloegBtn = document.createElement('button');
    addPloegBtn.className = 'add-ploeg-btn'; addPloegBtn.type = 'button';
    addPloegBtn.innerHTML = '+ Ploeg toevoegen';
    addPloegBtn.addEventListener('click', function() { if (!isAdmin) return; voegPloegToe(); });
    tdAdd.appendChild(addPloegBtn);
    trAdd.appendChild(tdAdd);
    tbody.appendChild(trAdd);
}

/* ── KLEUR PROJECTLEIDER ── */
function bepaalTrelloKaartStijl(members) {
    if (!members || members.length === 0) return STANDAARD_KAART_STIJL;
    var usernames = members.map(function(m) { return m.username; });
    for (var i = 0; i < PROJECTLEIDERS.length; i++) {
        if (usernames.indexOf(PROJECTLEIDERS[i].username) !== -1)
            return { bg: PROJECTLEIDERS[i].bg, text: PROJECTLEIDERS[i].text };
    }
    return STANDAARD_KAART_STIJL;
}

function genInstanceId(cardId) { return cardId + '::' + Date.now() + '-' + Math.floor(Math.random() * 9999); }
function cardIdVanInstantie(instanceId) { return instanceId.split('::')[0]; }

function isArchiefLijst(naam) {
    if (!naam) return false;
    var n = naam.trim().toLowerCase();
    return n.indexOf('archiveren') !== -1 || n.indexOf('archief') !== -1 || n.indexOf('archive') !== -1;
}

function maakKaartSnapshot(card) {
    return { n: card.name||'', a: card.address||'', u: card.url||'', m: (card.members||[]).map(function(m){return m.username;}) };
}
function snapshotNaarKaart(snap) {
    var naam    = (snap && (snap.n || snap.name))    || '(gearchiveerd project)';
    var adres   = (snap && (snap.a || snap.address)) || '';
    var members = [];
    if (snap && snap.m) { members = snap.m.map(function(u) { return { username: u }; }); }
    else if (snap && snap.members) { members = snap.members; }
    return { name: naam, address: adres, desc: '', members: members };
}

function voegCardToeAanIndex(cardId) {
    return t.get('board', 'shared', 'plannedCardIds', []).then(function(lijst) {
        var arr = Array.isArray(lijst) ? lijst : [];
        if (arr.indexOf(cardId) === -1) { arr.push(cardId); return t.set('board', 'shared', 'plannedCardIds', arr); }
    });
}
function verwijderCardUitIndex(cardId) {
    return t.get('board', 'shared', 'plannedCardIds', []).then(function(lijst) {
        var arr = Array.isArray(lijst) ? lijst : [];
        var gefilterd = arr.filter(function(x) { return x !== cardId; });
        if (gefilterd.length !== arr.length) return t.set('board', 'shared', 'plannedCardIds', gefilterd);
    });
}

function filterZijbalk(zoekterm) {
    var q = (zoekterm || '').trim().toLowerCase();
    var pool = document.getElementById('sidebar-pool');
    if (!pool) return;
    var kaarten = pool.querySelectorAll('.planning-card');
    var zichtbaar = 0;
    kaarten.forEach(function(kaart) {
        var tekst = (kaart.querySelector('.card-body') ? kaart.querySelector('.card-body').textContent : kaart.textContent).toLowerCase();
        if (q === '' || tekst.indexOf(q) !== -1) { kaart.style.display = ''; zichtbaar++; }
        else { kaart.style.display = 'none'; }
    });
    var leegMsg = document.getElementById('search-empty');
    if (leegMsg) leegMsg.style.display = (q !== '' && kaarten.length > 0 && zichtbaar === 0) ? 'block' : 'none';
}

/* ── PLOEG-MUTATIES ── */
function voegPloegToe() {
    var i = 1, nieuwe;
    while (true) {
        nieuwe = 'Ploeg ' + i;
        if (!ploegen.some(function(p) { return p.toLowerCase() === nieuwe.toLowerCase(); })) break;
        i++; if (i > 999) { nieuwe = 'Nieuwe ploeg ' + Date.now(); break; }
    }
    ploegen.push(nieuwe);
    t.set('board', 'shared', 'ploegen', ploegen).then(laadEnRenderAlles);
}

function hernoemPloeg(oudeNaam, nieuweNaam) {
    var idx = ploegen.indexOf(oudeNaam);
    if (idx === -1) return Promise.resolve();
    ploegen[idx] = nieuweNaam;
    var promises = [t.set('board', 'shared', 'ploegen', ploegen)];
    promises.push(
        t.get('board', 'shared', 'interventions', []).then(function(lijst) {
            var arr = Array.isArray(lijst) ? lijst : [], gewijzigd = false;
            arr.forEach(function(it) { if (it.ploeg === oudeNaam) { it.ploeg = nieuweNaam; gewijzigd = true; } });
            if (gewijzigd) return t.set('board', 'shared', 'interventions', arr);
        })
    );
    promises.push(
        t.get('board', 'shared', 'plannedCardIds', []).then(function(ids) {
            var arr = Array.isArray(ids) ? ids : [];
            return Promise.all(arr.map(function(cid) {
                return t.get(cid, 'shared', 'placements', []).then(function(plist) {
                    var pa = Array.isArray(plist) ? plist : [], gewijzigd = false;
                    pa.forEach(function(p) { if (p.ploeg === oudeNaam) { p.ploeg = nieuweNaam; gewijzigd = true; } });
                    if (gewijzigd) return t.set(cid, 'shared', 'placements', pa);
                });
            }));
        })
    );
    return Promise.all(promises).then(laadEnRenderAlles);
}

function verwijderPloeg(naam, rijElement) {
    if (!confirm('⚠️ Ploeg "' + naam + '" verwijderen?\n\nDit kan niet ongedaan worden gemaakt.')) return;
    if (ploegen.length <= 1) { toonPloegMelding(rijElement, 'Er moet minstens één ploeg overblijven.'); return; }
    Promise.all([
        t.get('board', 'shared', 'interventions', []),
        t.get('board', 'shared', 'plannedCardIds', [])
    ]).then(function(r) {
        var ints = Array.isArray(r[0]) ? r[0] : [];
        var ids  = Array.isArray(r[1]) ? r[1] : [];
        var intCount = ints.filter(function(i) { return i.ploeg === naam; }).length;
        return Promise.all(ids.map(function(cid) {
            return t.get(cid, 'shared', 'placements', []).catch(function() { return []; }).then(function(plist) {
                return { cid: cid, placements: Array.isArray(plist) ? plist : [] };
            });
        })).then(function(perKaart) {
            var placementCount = perKaart.reduce(function(som, k) {
                return som + k.placements.filter(function(p) { return p.ploeg === naam; }).length;
            }, 0);
            if (intCount > 0 || placementCount > 0) {
                var extra = '';
                if (intCount      > 0) extra += '\n  • ' + intCount      + ' interventie(s)';
                if (placementCount > 0) extra += '\n  • ' + placementCount + ' ingeplande kaart(en)';
                if (!confirm('⚠️ Ploeg "' + naam + '" bevat nog:' + extra + '\n\nDeze worden mee verwijderd. Toch doorgaan?')) return;
            }
            var nieuweInts = ints.filter(function(i) { return i.ploeg !== naam; });
            var promises = [t.set('board', 'shared', 'interventions', nieuweInts)];
            perKaart.forEach(function(k) {
                var gefilterd = k.placements.filter(function(p) { return p.ploeg !== naam; });
                if (gefilterd.length !== k.placements.length) promises.push(t.set(k.cid, 'shared', 'placements', gefilterd));
            });
            ploegen = ploegen.filter(function(p) { return p !== naam; });
            promises.push(t.set('board', 'shared', 'ploegen', ploegen));
            return Promise.all(promises).then(laadEnRenderAlles);
        });
    }).catch(function(err) {
        toonPloegMelding(rijElement, 'Kon ploeg niet verwijderen — probeer opnieuw.');
        console.error('verwijderPloeg fout:', err);
    });
}

/* ── VERLOF-MUTATIES ── */
function voegVerlofToe(datum) {
    if (!isAdmin) return;
    var nieuw = { id: 'verlof-' + Date.now() + '-' + Math.floor(Math.random()*9999), naam: 'Naam', startDatum: datum, eindDatum: datum, ploeg: VERLOF_ROW_KEY };
    t.get('board', 'shared', 'verlofItems', []).then(function(lijst) {
        var arr = Array.isArray(lijst) ? lijst : [];
        arr.push(nieuw);
        return t.set('board', 'shared', 'verlofItems', arr);
    }).then(function() {
        tekenVerlofItem(nieuw);
        var eersteSegment = document.querySelector('[data-verlof-id="' + nieuw.id + '"] .verlof-naam-editable');
        if (eersteSegment) {
            eersteSegment.contentEditable = true; eersteSegment.focus();
            var range = document.createRange(); range.selectNodeContents(eersteSegment);
            var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        }
    });
}

function updateVerlofNaam(id, nieuweNaam) {
    t.get('board', 'shared', 'verlofItems', []).then(function(lijst) {
        return t.set('board', 'shared', 'verlofItems', (Array.isArray(lijst)?lijst:[]).map(function(v) { if (v.id===id) v.naam=nieuweNaam; return v; }));
    });
}

function verwijderVerlof(id) {
    if (!isAdmin) return;
    t.get('board', 'shared', 'verlofItems', []).then(function(lijst) {
        return t.set('board', 'shared', 'verlofItems', (Array.isArray(lijst)?lijst:[]).filter(function(v) { return v.id !== id; }));
    }).then(function() {
        document.querySelectorAll('[data-verlof-id="' + id + '"]').forEach(function(el) { if (el.parentNode) el.parentNode.removeChild(el); });
    });
}

function hertekenEnkelVerlofItem(item) {
    document.querySelectorAll('[data-verlof-id="' + item.id + '"]').forEach(function(el) { if (el.parentNode) el.parentNode.removeChild(el); });
    if (!item.startDatum || !item.eindDatum) return;
    tekenVerlofItem(item);
}

function tekenVerlofItem(item) {
    var segmentDagen = dagenBinnenWeek(item.startDatum, item.eindDatum);
    segmentDagen.forEach(function(dag) {
        var zone = document.getElementById(maakZoneId(VERLOF_ROW_KEY, dag.datum));
        if (!zone) return;
        zone.appendChild(maakVerlofSegment(item, { datum: dag.datum, isFirstVisible: dag.isFirstVisible, isLastVisible: dag.isLastVisible }));
    });
}

function maakVerlofSegment(item, opts) {
    var el = document.createElement('div');
    el.className = 'verlof-segment';
    if (!opts.isFirstVisible) el.classList.add('not-first');
    if (!opts.isLastVisible)  el.classList.add('not-last');
    if (!opts.isFirstVisible && !opts.isLastVisible) el.classList.add('continuation');
    el.id = 'vseg-' + item.id + '-' + opts.datum;
    el.dataset.verlofId = item.id; el.dataset.datum = opts.datum; el.dataset.rol = 'verlof';
    el.draggable = isAdmin;
    var bodyEl = document.createElement('div');
    bodyEl.className = 'verlof-segment-body';
    if (opts.isFirstVisible) {
        var naamEl = document.createElement('span');
        naamEl.className = 'verlof-naam-editable';
        naamEl.innerText = item.naam || 'Naam';
        naamEl.contentEditable = false;
        (function(itemId, naamElement) {
            naamElement.addEventListener('click', function() {
                if (!isAdmin) return;
                if (naamElement.isContentEditable) return;
                naamElement.contentEditable = true; naamElement.focus();
                var range = document.createRange(); range.selectNodeContents(naamElement);
                var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            });
            naamElement.addEventListener('blur', function() {
                naamElement.contentEditable = false;
                var txt = naamElement.innerText.trim();
                if (!txt) { naamElement.innerText = '(leeg)'; updateVerlofNaam(itemId, '(leeg)'); }
                else { updateVerlofNaam(itemId, txt); }
            });
            naamElement.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); naamElement.blur(); }
            });
            naamElement.addEventListener('mousedown', function(e) { if (naamElement.isContentEditable) e.stopPropagation(); });
        })(item.id, naamEl);
        bodyEl.appendChild(naamEl);
        if (isAdmin) {
            var delBtn = document.createElement('span');
            delBtn.className = 'delete-btn'; delBtn.innerHTML = '&times;'; delBtn.title = 'Verwijder verlof';
            (function(itemId) {
                delBtn.addEventListener('click', function(e) { e.stopPropagation(); verwijderVerlof(itemId); });
                delBtn.addEventListener('mousedown', function(e) { e.stopPropagation(); });
            })(item.id);
            bodyEl.appendChild(delBtn);
        }
    } else { bodyEl.innerHTML = '&nbsp;'; }
    el.appendChild(bodyEl);
    if (opts.isLastVisible && isAdmin) {
        el.appendChild(maakResizeHandle(function(e) { startVerlofResize(e, item); }));
    }
    el.addEventListener('dragstart', drag);
    el.addEventListener('dragend',   dragEnd);
    return el;
}

/* ── RESIZE-HANDVAT ── */
function maakResizeHandle(onStart) {
    var h = document.createElement('div');
    h.className = 'span-resize-handle';
    h.title = 'Sleep om uit te rekken of in te korten';
    h.addEventListener('mousedown', onStart);
    return h;
}

/* ── VERLOF RESIZE ── */
var verlofResizeState = null;
function startVerlofResize(e, itemSnapshot) {
    if (!isAdmin) return;
    e.preventDefault(); e.stopPropagation();
    verlofResizeState = { itemId: itemSnapshot.id, naam: itemSnapshot.naam, startDatum: itemSnapshot.startDatum, origineelEind: itemSnapshot.eindDatum, huidigEind: itemSnapshot.eindDatum };
    document.body.classList.add('span-resizing');
    document.addEventListener('mousemove', onVerlofResizeMove);
    document.addEventListener('mouseup',   onVerlofResizeEnd);
}
function onVerlofResizeMove(e) {
    if (!verlofResizeState) return;
    var zone = (document.elementFromPoint(e.clientX, e.clientY) || {}).closest ? document.elementFromPoint(e.clientX, e.clientY).closest('.verlof-zone') : null;
    if (!zone || !zone.dataset.datum) return;
    var nieuweEind = zone.dataset.datum;
    var sD = ddMMNaarDate(verlofResizeState.startDatum), nD = ddMMNaarDate(nieuweEind);
    if (sD && nD && nD < sD) nieuweEind = verlofResizeState.startDatum;
    if (nieuweEind === verlofResizeState.huidigEind) return;
    verlofResizeState.huidigEind = nieuweEind;
    hertekenEnkelVerlofItem({ id: verlofResizeState.itemId, naam: verlofResizeState.naam, startDatum: verlofResizeState.startDatum, eindDatum: verlofResizeState.huidigEind, ploeg: VERLOF_ROW_KEY });
}
function onVerlofResizeEnd() {
    if (!verlofResizeState) return;
    document.body.classList.remove('span-resizing');
    document.removeEventListener('mousemove', onVerlofResizeMove);
    document.removeEventListener('mouseup',   onVerlofResizeEnd);
    var itemId = verlofResizeState.itemId, nieuweEind = verlofResizeState.huidigEind, ongewijzigd = (nieuweEind === verlofResizeState.origineelEind);
    verlofResizeState = null;
    if (ongewijzigd) return;
    t.get('board', 'shared', 'verlofItems', []).then(function(lijst) {
        return t.set('board', 'shared', 'verlofItems', (Array.isArray(lijst)?lijst:[]).map(function(v) { if (v.id===itemId) v.eindDatum=nieuweEind; return v; }));
    });
}

/* ── ZOOMLOGICA ── */
function pasZoomToe(factor) {
    tableZoom = Math.min(2.0, Math.max(0.2, factor));
    var table = document.querySelector('.planning-table');
    if (table) table.style.zoom = tableZoom;
    var indicator = document.getElementById('zoom-indicator');
    if (indicator) indicator.textContent = Math.round(tableZoom * 100) + '%';
    var fitBtn = document.getElementById('zoom-fit-btn');
    if (fitBtn) {
        if (tableZoomAuto) fitBtn.classList.add('actief');
        else fitBtn.classList.remove('actief');
    }
    herstelBandSpreiding();
}
function autoFitZoom() {
    if (!tableZoomAuto) return;
    var wrap = document.querySelector('.table-scroll-wrap');
    var table = document.querySelector('.planning-table');
    if (!wrap || !table) return;
    /* Meet de beschikbare breedte — tabel past altijd horizontaal in beeld */
    var beschikbaarBreed = wrap.clientWidth;
    var huidig = table.style.zoom;
    table.style.zoom = '';
    var tabelBreedte = table.scrollWidth;
    table.style.zoom = huidig;
    if (beschikbaarBreed > 30 && tabelBreedte > 0 && tabelBreedte > beschikbaarBreed) {
        pasZoomToe(beschikbaarBreed / tabelBreedte);
    } else {
        pasZoomToe(1.0);
    }
}

/* ── STAPELLOGICA ── */
var stackMap = {};
var BAND_HOOGTE = 56, BAND_GAP = 4, BAND_TOP = 6;
/* ── HERSCHIKKEN ── */
var ploegLaanVolgorde = {};   // { ploegNaam: [instanceId, ...] }
var plaatsingsData = {};       // { instanceId: plaatsingObject }
var allePlaatsingsParen = [];  // [{ p, ctx }, ...]
var alleInterventies = [];
var alleVerlofItems = [];
var _reorderLastIdx = 0;  // bewaar laatste insert-index voor drop
var _dragCurrentId = '';    // id van de kaart die gesleept wordt
var _dragCurrentPloeg = ''; // ploeg van die kaart
var _dragCurrentDatum = ''; // datum van de cel waar de drag begon
function rijNaarTop(rij) { return BAND_TOP + rij * (BAND_HOOGTE + BAND_GAP); }
function stapelReserveer(zoneIds, instanceId) {
    zoneIds.forEach(function(zid) { if (!stackMap[zid]) stackMap[zid] = {}; });
    var rij = 0;
    while (true) {
        if (zoneIds.every(function(zid) { var b=stackMap[zid][rij]; return b===undefined||b===instanceId; })) break;
        rij++; if (rij > 200) break;
    }
    zoneIds.forEach(function(zid) { stackMap[zid][rij] = instanceId; });
    zoneIds.forEach(updateZoneHoogte);
    return { rij: rij, top: rijNaarTop(rij) };
}
function stapelVrijgeven(instanceId) {
    Object.keys(stackMap).forEach(function(zid) {
        Object.keys(stackMap[zid]).forEach(function(rij) { if (stackMap[zid][rij]===instanceId) delete stackMap[zid][rij]; });
        updateZoneHoogte(zid);
    });
}
function updateZoneHoogte(zoneId) {
    var zone = document.getElementById(zoneId); if (!zone) return;
    var zoneRijen = stackMap[zoneId] || {}, maxRij = -1;
    Object.keys(zoneRijen).forEach(function(r) { var ri=parseInt(r,10); if (ri>maxRij) maxRij=ri; });
    zone.style.minHeight = maxRij < 0 ? '' : Math.max(80, rijNaarTop(maxRij) + BAND_HOOGTE + 30) + 'px';
}
function herlayoutPloegRijen() {
    var tableEl = document.querySelector('.planning-table');
    /* Reset zoom voor accurate offsetHeight meting (CSS zoom beïnvloedt offsetHeight) */
    if (tableEl) tableEl.style.zoom = '';
    var sv = instellingen[VIEW_MODUS];
    var rijHoogte = sv.rijHoogte || { vast: false, hoogte: 120 };
    var perRijHoogte = sv.perRijHoogte || {};
    var zones = document.querySelectorAll('.dropzone[data-row-type="ploeg"]');
    var perPloeg = {};
    zones.forEach(function(z) { var pl=z.dataset.ploeg; if (!pl) return; if (!perPloeg[pl]) perPloeg[pl]=[]; perPloeg[pl].push(z); });
    /* Eerste pas: bereken content-gedreven hoogte per ploeg-rij */
    var contentHoogtes = {};
    Object.keys(perPloeg).forEach(function(pl) {
        var cellen = perPloeg[pl], baanHoogtes = {}, items = [];
        cellen.forEach(function(z) {
            z.querySelectorAll('.planning-card, .placement-band').forEach(function(el) {
                if (el.dataset.lane === undefined || el.dataset.lane === '') return;
                var baan = parseInt(el.dataset.lane, 10); if (isNaN(baan)) return;
                /* Verborgen vervolgsegmenten (herstelBandSpreiding) niet meenemen in hoogtebepaling */
                if (el.style.display === 'none') return;
                el.style.height = 'auto'; var h = el.offsetHeight;
                if (!baanHoogtes[baan] || h > baanHoogtes[baan]) baanHoogtes[baan] = h;
                items.push({ el: el, baan: baan });
            });
        });
        var banen = Object.keys(baanHoogtes).map(function(k){return parseInt(k,10);}).sort(function(a,b){return a-b;});
        var tops = {}, cursor = BAND_TOP;
        banen.forEach(function(b) { tops[b]=cursor; cursor+=baanHoogtes[b]+BAND_GAP; });
        var totaal = (banen.length ? (cursor-BAND_GAP) : BAND_TOP) + 30;
        /* Hoogte-egalisatie volgt in tweede pass, ná herstelBandSpreiding */
        items.forEach(function(it) { it.el.style.top=tops[it.baan]+'px'; it.el.style.height='auto'; it.el.style.bottom='auto'; });
        contentHoogtes[pl] = Math.max(80, totaal);
    });
    /* Tweede pas: bepaal uiteindelijke hoogte per rij op basis van instellingen */
    var maxAutoHoogte = 80;
    Object.keys(perPloeg).forEach(function(pl) {
        var prh = perRijHoogte[pl];
        if (!(prh && prh.aan) && !rijHoogte.vast) {
            if ((contentHoogtes[pl] || 80) > maxAutoHoogte) maxAutoHoogte = contentHoogtes[pl];
        }
    });
    Object.keys(perPloeg).forEach(function(pl) {
        var cellen = perPloeg[pl];
        var prh = perRijHoogte[pl];
        var hoogte;
        if (prh && prh.aan && prh.hoogte) {
            hoogte = Math.max(prh.hoogte, contentHoogtes[pl] || 80);
        } else if (rijHoogte.vast && rijHoogte.hoogte) {
            hoogte = Math.max(rijHoogte.hoogte, contentHoogtes[pl] || 80);
        } else {
            hoogte = maxAutoHoogte;
        }
        cellen.forEach(function(z) { z.style.minHeight = hoogte + 'px'; });
    });
    /* Herstel zoom na meting */
    if (tableEl) tableEl.style.zoom = tableZoom;
    autoFitZoom();
    herstelBandSpreiding();
    /* Tweede pass: egaliseer hoogten per top-groep (na band-spreiding) */
    /* Reset zoom zodat offsetHeight niet door CSS zoom wordt beïnvloed */
    (function(){
        if(tableEl)tableEl.style.zoom='';
        var topGroepen={};
        Object.keys(perPloeg).forEach(function(pl){
            perPloeg[pl].forEach(function(z){
                z.querySelectorAll('.planning-card,.placement-band').forEach(function(el){
                    if(el.style.display==='none')return;
                    var t=el.style.top; if(!t)return;
                    var key=pl+'|'+t;
                    if(!topGroepen[key])topGroepen[key]=[];
                    el.style.height='auto';
                    topGroepen[key].push({el:el,h:el.offsetHeight});
                });
            });
        });
        Object.keys(topGroepen).forEach(function(key){
            var groep=topGroepen[key];
            var maxH=groep.reduce(function(m,g){return Math.max(m,g.h);},0);
            if(maxH>0)groep.forEach(function(g){g.el.style.height=maxH+'px';});
        });
        if(tableEl)tableEl.style.zoom=tableZoom;
    })();
}

/* ── MEERDAAGSE BANDEN: één doorlopend blok (Google Agenda-stijl) ── */
function herstelBandSpreiding() {
    var table = document.querySelector('.planning-table');
    if (!table) return;
    var zoom = tableZoom || 1;
    var behandeld = {};
    table.querySelectorAll('.placement-band').forEach(function(seg) {
        var id = seg.dataset.instanceId || seg.dataset.intId;
        if (!id || behandeld[id]) return;
        behandeld[id] = true;
        var selector = seg.dataset.instanceId ?
            '[data-instance-id="' + id + '"]' :
            '[data-int-id="' + id + '"]';
        var alleSegs = Array.from(table.querySelectorAll(selector));
        if (alleSegs.length <= 1) {
            var s = alleSegs[0];
            if (s) { s.style.display = ''; s.style.left = ''; s.style.right = ''; s.style.width = '';
                     s.style.borderTopLeftRadius = ''; s.style.borderBottomLeftRadius = '';
                     s.style.borderTopRightRadius = ''; s.style.borderBottomRightRadius = ''; }
            return;
        }
        var eerste = alleSegs[0];
        var laatste = alleSegs[alleSegs.length - 1];
        var eersteCell = eerste.closest('td');
        var laatssteCell = laatste.closest('td');
        if (!eersteCell || !laatssteCell) return;
        var r1 = eersteCell.getBoundingClientRect();
        var r2 = laatssteCell.getBoundingClientRect();
        if (!r1.width || !r2.width) return;
        var breedte = (r2.right - r1.left) / zoom;
        alleSegs.forEach(function(s) { s.style.display = (s === eerste) ? '' : 'none'; });
        eerste.style.left = '0';
        eerste.style.right = 'auto';
        eerste.style.width = breedte + 'px';
        var isEchtBegin = !eerste.classList.contains('band-not-first');
        var isEchtEinde = !laatste.classList.contains('band-not-last');
        eerste.style.borderTopLeftRadius    = isEchtBegin ? '6px' : '0';
        eerste.style.borderBottomLeftRadius = isEchtBegin ? '6px' : '0';
        eerste.style.borderTopRightRadius    = isEchtEinde ? '6px' : '0';
        eerste.style.borderBottomRightRadius = isEchtEinde ? '6px' : '0';
    });
}

/* ── HERSCHIKKEN: helperfuncties ── */
function sorteerPlaatsingenVoorRender(paren) {
    paren.sort(function(a, b) {
        var plA = a.p.ploeg || '', plB = b.p.ploeg || '';
        if (plA !== plB) return 0; // ploegen onderling niet herordenen
        var vA = ploegLaanVolgorde[plA] || [], vB = ploegLaanVolgorde[plB] || [];
        var iA = vA.indexOf(a.p.instanceId), iB = vB.indexOf(b.p.instanceId);
        if (iA === -1 && iB === -1) return 0;
        if (iA === -1) return 1;
        if (iB === -1) return -1;
        return iA - iB;
    });
}

function hertekenVanuitCache() {
    document.querySelectorAll('.dropzone').forEach(function(z) { z.innerHTML = ''; });
    stackMap = {};
    sorteerPlaatsingenVoorRender(allePlaatsingsParen);
    allePlaatsingsParen.forEach(function(item) { tekenPlacement(item.p, item.ctx); });
    alleInterventies.forEach(function(int) { tekenInterventie(int); });
    alleVerlofItems.forEach(function(v) { tekenVerlofItem(v); });
    herlayoutPloegRijen();
}

function bouwHuidigeVolgorde(ploeg) {
    var laanNaarId = {};
    document.querySelectorAll('[data-ploeg-row]').forEach(function(el) {
        if (el.dataset.ploegRow !== ploeg) return;
        var id = el.dataset.instanceId || el.dataset.intId;
        var laan = parseInt(el.dataset.lane, 10);
        if (id && !isNaN(laan) && laanNaarId[laan] === undefined) laanNaarId[laan] = id;
    });
    return Object.keys(laanNaarId).map(Number).sort(function(a,b){return a-b;}).map(function(l){return laanNaarId[l];});
}

function herschikKaart(instanceId, ploeg, insertOpIndex) {
    if (!ploegLaanVolgorde[ploeg]) ploegLaanVolgorde[ploeg] = bouwHuidigeVolgorde(ploeg);
    var volgorde = ploegLaanVolgorde[ploeg].filter(function(id){return id!==instanceId;});
    volgorde.splice(insertOpIndex, 0, instanceId);
    // onbekende instanceIds en interventie-IDs van dezelfde ploeg achteraan toevoegen
    allePlaatsingsParen.forEach(function(item) {
        if (item.p.ploeg === ploeg && volgorde.indexOf(item.p.instanceId) === -1) volgorde.push(item.p.instanceId);
    });
    alleInterventies.forEach(function(int) {
        if (int.ploeg === ploeg && volgorde.indexOf(int.id) === -1) volgorde.push(int.id);
    });
    ploegLaanVolgorde[ploeg] = volgorde;
    t.set('board', 'shared', 'ploegLaanVolgorde', ploegLaanVolgorde);
    hertekenVanuitCache();
}

function placementStart(p) { return p.datum; }
function placementEind(p)  { return p.eindDatum || p.datum; }

function hertekenEnkelPlacement(p, ctx) {
    document.querySelectorAll('[data-instance-id="' + p.instanceId + '"]').forEach(function(el) { if (el.parentNode) el.parentNode.removeChild(el); });
    stapelVrijgeven(p.instanceId); tekenPlacement(p, ctx); herlayoutPloegRijen();
}

function tekenPlacement(p, ctx) {
    if (!p.ploeg || !p.datum) return;
    placementCtx[p.instanceId] = ctx;
    plaatsingsData[p.instanceId] = p;
    var start=placementStart(p), eind=placementEind(p);
    var dagen=dagenBinnenWeek(start,eind);
    if (dagen.length===0) return;
    var meerdaags = (start!==eind) && (dagen.length>1 || aantalDagenTussen(start,eind)>0);
    if (!meerdaags) {
        var zoneId=maakZoneId(p.ploeg,start), zone=document.getElementById(zoneId);
        if (!zone) return;
        var pos1=stapelReserveer([zoneId],p.instanceId);
        var kaart=maakTrelloInstantieKaart(ctx.card,p,{isArchief:ctx.isArchief,kanTonen:ctx.kanTonen,url:ctx.url,metResize:true,ctx:ctx});
        kaart.dataset.lane=pos1.rij; kaart.dataset.ploegRow=p.ploeg; kaart.dataset.datum=start; zone.appendChild(kaart);
    } else {
        var zoneIds=dagen.map(function(dag){return maakZoneId(p.ploeg,dag.datum);});
        var pos=stapelReserveer(zoneIds,p.instanceId);
        dagen.forEach(function(dag) {
            var zone=document.getElementById(maakZoneId(p.ploeg,dag.datum)); if (!zone) return;
            var seg=maakPlacementBandSegment(ctx.card,p,{datum:dag.datum,isFirstVisible:dag.isFirstVisible,isLastVisible:dag.isLastVisible,ctx:ctx,top:pos.top,height:BAND_HOOGTE});
            seg.dataset.lane=pos.rij; seg.dataset.ploegRow=p.ploeg; zone.appendChild(seg);
        });
    }
}

function maakPlacementBandSegment(card, p, opts) {
    var ctx=opts.ctx;
    var el=document.createElement('div');
    el.className='placement-band';
    if (!opts.isFirstVisible) el.classList.add('band-not-first');
    if (!opts.isLastVisible)  el.classList.add('band-not-last');
    if (p.zwevend) el.classList.add('zwevend');
    el.id='pseg-'+p.instanceId+'-'+opts.datum;
    el.dataset.instanceId=p.instanceId; el.dataset.datum=opts.datum; el.dataset.rol='instantie';
    el.draggable=false;
    el.style.top=(opts.top!==undefined?opts.top:6)+'px';
    el.style.height=(opts.height!==undefined?opts.height:BAND_HOOGTE)+'px';
    el.style.bottom='auto';
    var stijl=bepaalTrelloKaartStijl(card.members);
    el.style.backgroundColor=stijl.bg; el.style.color=stijl.text;
    if (opts.isFirstVisible) {
        var body=document.createElement('div'); body.className='card-body';
        vulTrelloBasis(body,card);
        if (ctx.isArchief) { var tag=document.createElement('span'); tag.className='archief-tag'; tag.innerText='📦 Archief'; body.appendChild(tag); }
        if (p.zwevend) { var zbadge=document.createElement('span'); zbadge.className='zwevend-badge'; zbadge.innerText='☁ Onzeker'; body.appendChild(zbadge); }
        var infoEl=document.createElement('div'); infoEl.className='card-info-placement'; infoEl.innerText=p.infoPlaatsing||'';
        maakBewerkbaarVeld(infoEl,function(txt){updateInstantieInfo(cardIdVanInstantie(p.instanceId),p.instanceId,txt);});
        body.appendChild(infoEl); el.appendChild(body);
        if (isAdmin) {
            var zwBtn=document.createElement('span');
            zwBtn.className='zwevend-toggle-btn'+(p.zwevend?' actief':'');
            zwBtn.title=p.zwevend?'Markeer als zeker ingepland':'Markeer als onzeker (zwevend)';
            zwBtn.innerHTML='☁';
            (function(placement){ zwBtn.addEventListener('click',function(e){e.stopPropagation();toggleZwevend(placement,ctx);}); })(p);
            var controls=document.createElement('div'); controls.className='card-controls band-controls'; controls.appendChild(zwBtn); el.appendChild(controls);
            voegReorderHandleToe(el);
        }
    }
    if ((opts.isFirstVisible || opts.isLastVisible) && isAdmin) el.appendChild(maakResizeHandle(function(e){startPlacementResize(e,p,ctx);}));
    el.addEventListener('dragstart',drag); el.addEventListener('dragend',dragEnd);
    koppelKaartOpenen(el,{kaartData:card,kanTonen:!!ctx.kanTonen,cardId:cardIdVanInstantie(p.instanceId),url:ctx.url||''});
    return el;
}

function toggleZwevend(p, ctx) {
    if (!isAdmin) return;
    var cardId=cardIdVanInstantie(p.instanceId);
    t.get(cardId,'shared','placements',[]).then(function(lijst) {
        var arr=Array.isArray(lijst)?lijst:[];
        arr=arr.map(function(pl){if(pl.instanceId===p.instanceId){pl.zwevend=!pl.zwevend;p.zwevend=pl.zwevend;}return pl;});
        return t.set(cardId,'shared','placements',arr);
    }).then(function(){hertekenEnkelPlacement(p,ctx);});
}

/* ── PLACEMENT RESIZE ── */
var placementResizeState=null;
function startPlacementResize(e,p,ctx){
    if(!isAdmin)return; e.preventDefault(); e.stopPropagation();
    placementResizeState={instanceId:p.instanceId,cardId:cardIdVanInstantie(p.instanceId),ploeg:p.ploeg,start:placementStart(p),origEind:placementEind(p),huidigEind:placementEind(p),werkItem:{instanceId:p.instanceId,ploeg:p.ploeg,datum:placementStart(p),eindDatum:placementEind(p),infoPlaatsing:p.infoPlaatsing,zwevend:p.zwevend},ctx:ctx};
    document.body.classList.add('span-resizing');
    document.addEventListener('mousemove',onPlacementResizeMove);
    document.addEventListener('mouseup',onPlacementResizeEnd);
}
function onPlacementResizeMove(e){
    if(!placementResizeState)return;
    var el=document.elementFromPoint(e.clientX,e.clientY); if(!el)return;
    var zone=el.closest?el.closest('.dropzone'):null;
    if(!zone||zone.dataset.rowType!=='ploeg'||zone.dataset.ploeg!==placementResizeState.ploeg)return;
    var nieuwEind=zone.dataset.datum;
    var sD=ddMMNaarDate(placementResizeState.start),nD=ddMMNaarDate(nieuwEind);
    if(sD&&nD&&nD<sD)nieuwEind=placementResizeState.start;
    if(nieuwEind===placementResizeState.huidigEind)return;
    placementResizeState.huidigEind=nieuwEind; placementResizeState.werkItem.eindDatum=nieuwEind;
    hertekenEnkelPlacement(placementResizeState.werkItem,placementResizeState.ctx);
}
function onPlacementResizeEnd(){
    if(!placementResizeState)return;
    document.body.classList.remove('span-resizing');
    document.removeEventListener('mousemove',onPlacementResizeMove);
    document.removeEventListener('mouseup',onPlacementResizeEnd);
    var st=placementResizeState; placementResizeState=null;
    if(st.huidigEind===st.origEind)return;
    t.get(st.cardId,'shared','placements',[]).then(function(lijst){
        return t.set(st.cardId,'shared','placements',(Array.isArray(lijst)?lijst:[]).map(function(p){
            if(p.instanceId===st.instanceId){if(st.huidigEind===p.datum){delete p.eindDatum;}else{p.eindDatum=st.huidigEind;}}return p;
        }));
    });
}

/* ── INTERVENTIES ── */
function intStart(i){return i.datum;}
function intEind(i){return i.eindDatum||i.datum;}

function hertekenEnkeleInterventie(int){
    document.querySelectorAll('[data-int-id="'+int.id+'"]').forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
    var oudLos=document.getElementById(int.id); if(oudLos&&oudLos.parentNode)oudLos.parentNode.removeChild(oudLos);
    stapelVrijgeven(int.id); tekenInterventie(int); herlayoutPloegRijen();
}

function tekenInterventie(int){
    if(!int.ploeg||!int.datum){var pool=document.getElementById('sidebar-pool');if(pool)pool.appendChild(maakInterventieKaart(int));return;}
    var start=intStart(int),eind=intEind(int),dagen=dagenBinnenWeek(start,eind);
    if(dagen.length===0)return;
    var meerdaags=(start!==eind)&&(dagen.length>1||aantalDagenTussen(start,eind)>0);
    if(!meerdaags){
        var zoneId=maakZoneId(int.ploeg,start),zone=document.getElementById(zoneId);
        if(!zone){var pool=document.getElementById('sidebar-pool');if(pool)pool.appendChild(maakInterventieKaart(int));return;}
        var pos1=stapelReserveer([zoneId],int.id);
        var kaart=maakInterventieKaart(int,{metResize:true});
        kaart.dataset.lane=pos1.rij; kaart.dataset.ploegRow=int.ploeg; kaart.dataset.datum=start; zone.appendChild(kaart);
    } else {
        var zoneIds=dagen.map(function(dag){return maakZoneId(int.ploeg,dag.datum);});
        var pos=stapelReserveer(zoneIds,int.id);
        dagen.forEach(function(dag){
            var zone=document.getElementById(maakZoneId(int.ploeg,dag.datum));if(!zone)return;
            var seg=maakInterventieBandSegment(int,{datum:dag.datum,isFirstVisible:dag.isFirstVisible,isLastVisible:dag.isLastVisible,top:pos.top,height:BAND_HOOGTE});
            seg.dataset.lane=pos.rij; seg.dataset.ploegRow=int.ploeg; zone.appendChild(seg);
        });
    }
}

function maakInterventieBandSegment(int,opts){
    var el=document.createElement('div');
    el.className='placement-band';
    if(!opts.isFirstVisible)el.classList.add('band-not-first');
    if(!opts.isLastVisible)el.classList.add('band-not-last');
    if(int.zwevend)el.classList.add('zwevend');
    el.id='iseg-'+int.id+'-'+opts.datum;
    el.dataset.intId=int.id; el.dataset.datum=opts.datum; el.dataset.rol='interventie';
    el.draggable=false;
    el.style.top=(opts.top!==undefined?opts.top:6)+'px';
    el.style.height=(opts.height!==undefined?opts.height:BAND_HOOGTE)+'px';
    el.style.bottom='auto';
    var stijl=int.colorObj||CUSTOM_COLORS[0];
    el.style.backgroundColor=stijl.bg; el.style.color=stijl.text;
    if(opts.isFirstVisible){
        var body=document.createElement('div');body.className='card-body';
        var titleEl=document.createElement('div');titleEl.className='card-title';titleEl.innerText=int.name;
        maakBewerkbaarVeld(titleEl,function(txt){updateInterventionText(int.id,txt);});
        body.appendChild(titleEl);
        if(int.address){var adresEl=document.createElement('div');adresEl.className='card-address';adresEl.innerText='📍 '+int.address;body.appendChild(adresEl);}
        var infoEl=document.createElement('div');infoEl.className='card-info-placement';infoEl.innerText=int.infoPlaatsing||'';
        maakBewerkbaarVeld(infoEl,function(txt){updateInterventionInfo(int.id,txt);});
        body.appendChild(infoEl);
        if(int.zwevend){var zbadge=document.createElement('span');zbadge.className='zwevend-badge';zbadge.innerText='☁ Onzeker';body.appendChild(zbadge);}
        el.appendChild(body);
        if(isAdmin){
            var controls=document.createElement('div');controls.className='card-controls band-controls';
            var izwBtn=document.createElement('span');izwBtn.className='zwevend-toggle-btn'+(int.zwevend?' actief':'');
            izwBtn.title=int.zwevend?'Markeer als zeker ingepland':'Markeer als onzeker (zwevend)';izwBtn.innerHTML='☁';
            izwBtn.addEventListener('click',function(e){e.stopPropagation();toggleZwevendInterventie(int.id);});
            controls.appendChild(izwBtn);
            var colorBtn=document.createElement('span');colorBtn.className='color-btn';colorBtn.innerHTML='🎨';
            colorBtn.addEventListener('click',function(e){
                e.stopPropagation();document.querySelectorAll('.color-picker-menu').forEach(function(m){m.remove();});
                var pm=document.createElement('div');pm.className='color-picker-menu';
                CUSTOM_COLORS.forEach(function(kleur){var sw=document.createElement('div');sw.className='color-swatch';sw.style.backgroundColor=kleur.bg;sw.addEventListener('click',function(e2){e2.stopPropagation();setInterventionColor(int.id,null,kleur);pm.remove();});pm.appendChild(sw);});
                controls.appendChild(pm);
            });
            controls.appendChild(colorBtn);
            var delBtn=document.createElement('span');delBtn.className='delete-btn';delBtn.innerHTML='&times;';
            delBtn.addEventListener('click',function(e){e.stopPropagation();verwijderInterventie(int.id);});
            controls.appendChild(delBtn);el.appendChild(controls);
            voegReorderHandleToe(el);
        }
    }
    if((opts.isFirstVisible||opts.isLastVisible)&&isAdmin)el.appendChild(maakResizeHandle(function(e){startInterventieResize(e,int);}));
    el.addEventListener('dragstart',drag);el.addEventListener('dragend',dragEnd);
    return el;
}

/* ── INTERVENTIE RESIZE ── */
var interventieResizeState=null;
function startInterventieResize(e,int){
    if(!isAdmin)return;e.preventDefault();e.stopPropagation();
    interventieResizeState={id:int.id,ploeg:int.ploeg,start:intStart(int),origEind:intEind(int),huidigEind:intEind(int),werkItem:JSON.parse(JSON.stringify(int))};
    interventieResizeState.werkItem.datum=intStart(int);interventieResizeState.werkItem.eindDatum=intEind(int);
    document.body.classList.add('span-resizing');
    document.addEventListener('mousemove',onInterventieResizeMove);document.addEventListener('mouseup',onInterventieResizeEnd);
}
function onInterventieResizeMove(e){
    if(!interventieResizeState)return;
    var el=document.elementFromPoint(e.clientX,e.clientY);if(!el)return;
    var zone=el.closest?el.closest('.dropzone'):null;
    if(!zone||zone.dataset.rowType!=='ploeg'||zone.dataset.ploeg!==interventieResizeState.ploeg)return;
    var nieuwEind=zone.dataset.datum;
    var sD=ddMMNaarDate(interventieResizeState.start),nD=ddMMNaarDate(nieuwEind);
    if(sD&&nD&&nD<sD)nieuwEind=interventieResizeState.start;
    if(nieuwEind===interventieResizeState.huidigEind)return;
    interventieResizeState.huidigEind=nieuwEind;interventieResizeState.werkItem.eindDatum=nieuwEind;
    hertekenEnkeleInterventie(interventieResizeState.werkItem);
}
function onInterventieResizeEnd(){
    if(!interventieResizeState)return;
    document.body.classList.remove('span-resizing');
    document.removeEventListener('mousemove',onInterventieResizeMove);document.removeEventListener('mouseup',onInterventieResizeEnd);
    var st=interventieResizeState;interventieResizeState=null;
    if(st.huidigEind===st.origEind)return;
    t.get('board','shared','interventions',[]).then(function(lijst){
        return t.set('board','shared','interventions',(Array.isArray(lijst)?lijst:[]).map(function(i){
            if(i.id===st.id){if(st.huidigEind===i.datum){delete i.eindDatum;}else{i.eindDatum=st.huidigEind;}}return i;
        }));
    });
}

/* ── HOOFDLAADFUNCTIE ── */
function laadEnRenderAlles(){
    berekenWeekDatums();bouwLegende();markeerActieveViewKnop();
    trelloKaartCache={};placementCtx={};stackMap={};plaatsingsData={};allePlaatsingsParen=[];alleInterventies=[];alleVerlofItems=[];
    var pool=document.getElementById('sidebar-pool');
    var loadingMsg=document.getElementById('loading-msg');
    var errorMsg=document.getElementById('error-msg');
    if(loadingMsg)loadingMsg.style.display='block';
    if(errorMsg)errorMsg.style.display='none';
    if(pool)pool.innerHTML='';
    return Promise.all([
        t.cards('id','name','members','address','desc','idList','url','labels','due','dueComplete'),
        t.lists('id','name'),
        t.get('board','shared','interventions',[]),
        t.get('board','shared','plannedCardIds',[]),
        t.get('board','shared','ploegen',null),
        t.get('board','shared','verlofItems',[]),
        t.get('board','shared','adminUsernames', null),
        DEV_MODE ? Promise.resolve(null) : t.member('username').catch(function(){return null;}),
        t.get('board','shared','ploegLaanVolgorde',{})
    ]).then(function(resultaten){
        var cards=resultaten[0],lists=resultaten[1],interventions=resultaten[2];
        var indexIds=Array.isArray(resultaten[3])?resultaten[3]:[];
        var opgeslagenPloegen=resultaten[4];
        var verlofItems=Array.isArray(resultaten[5])?resultaten[5]:[];
        var opgeslagenAdmins=resultaten[6];
        var memberInfo=resultaten[7];
        ploegLaanVolgorde=(resultaten[8]&&typeof resultaten[8]==='object'&&!Array.isArray(resultaten[8]))?resultaten[8]:{};
        if(Array.isArray(opgeslagenAdmins)&&opgeslagenAdmins.length>0){ADMIN_USERNAMES=opgeslagenAdmins;}
        if(DEV_MODE){isAdmin=true;}
        else{var u=(memberInfo&&memberInfo.username)?memberInfo.username.toLowerCase():'';isAdmin=ADMIN_USERNAMES.indexOf(u)!==-1;}
        toepassenAdminStatus();
        if(Array.isArray(opgeslagenPloegen)&&opgeslagenPloegen.length>0){ploegen=opgeslagenPloegen.slice();}
        else{ploegen=DEFAULT_PLOEGEN.slice();t.set('board','shared','ploegen',ploegen);}
        var verlofMigratieNodig=false;
        verlofItems.forEach(function(v){
            if(!v.startDatum&&v.datum){v.startDatum=v.datum;v.eindDatum=v.eindDatum||v.datum;delete v.datum;verlofMigratieNodig=true;}
            if(!v.eindDatum&&v.startDatum){v.eindDatum=v.startDatum;verlofMigratieNodig=true;}
        });
        if(verlofMigratieNodig)t.set('board','shared','verlofItems',verlofItems);
        bouwTabel();
        if(loadingMsg)loadingMsg.style.display='none';
        var archiefLijstIds={};
        lists.forEach(function(l){if(isArchiefLijst(l.name))archiefLijstIds[l.id]=true;});
        var visibleById={};cards.forEach(function(c){visibleById[c.id]=c;});
        var alleIds=[],gezien={};
        cards.forEach(function(c){if(!gezien[c.id]){gezien[c.id]=true;alleIds.push(c.id);}});
        indexIds.forEach(function(id){if(!gezien[id]){gezien[id]=true;alleIds.push(id);}});
        var idPromises=alleIds.map(function(cardId){
            return Promise.all([
                t.get(cardId,'shared','placements',null),
                t.get(cardId,'shared','planning',null),
                t.get(cardId,'shared','infoPlaatsing',''),
                t.get(cardId,'shared','cardSnapshot',null)
            ]).then(function(stored){
                var placements=stored[0],cardSnapshot=stored[3];
                if(!Array.isArray(placements)){
                    var oud=stored[1];
                    if(oud&&oud.ploeg&&oud.datum){placements=[{instanceId:genInstanceId(cardId),ploeg:oud.ploeg,datum:oud.datum,infoPlaatsing:stored[2]||''}];t.set(cardId,'shared','placements',placements);}
                    else{placements=[];}
                }
                var migratieNodig=false;
                placements.forEach(function(p){
                    if(p.snapshot){
                        if(!cardSnapshot){var s=p.snapshot;if(s.n!==undefined){cardSnapshot=s;}else{cardSnapshot={n:s.name||'',a:s.address||'',u:s.url||'',m:(s.members||[]).map(function(m){return m.username||m;})};}}
                        delete p.snapshot;migratieNodig=true;
                    }
                });
                return{cardId:cardId,placements:placements,cardSnapshot:cardSnapshot,migratieNodig:migratieNodig};
            }).catch(function(){
                /* 5.1 – als één kaart niet geladen kan worden, gewoon overslaan i.p.v. alles te breken */
                return{cardId:cardId,placements:[],cardSnapshot:null,migratieNodig:false};
            });
        });
        return Promise.all(idPromises).then(function(resultatenPerId){
            var nieuweIndex=[];
            resultatenPerId.forEach(function(r){
                var cardId=r.cardId,placements=r.placements,cardSnapshot=r.cardSnapshot,migratieNodig=r.migratieNodig;
                var liveCard=visibleById[cardId],isZichtbaar=!!liveCard;
                var inArchiefLijst=isZichtbaar&&!!archiefLijstIds[liveCard.idList];
                var verbergUitZijbalk=(!isZichtbaar)||inArchiefLijst;
                if(placements.length>0&&nieuweIndex.indexOf(cardId)===-1)nieuweIndex.push(cardId);
                if(isZichtbaar){
                    trelloKaartCache[cardId]=liveCard;
                    var verseSnap=maakKaartSnapshot(liveCard);
                    if(JSON.stringify(cardSnapshot)!==JSON.stringify(verseSnap)){cardSnapshot=verseSnap;t.set(cardId,'shared','cardSnapshot',cardSnapshot);}
                }
                if(migratieNodig){t.set(cardId,'shared','placements',placements);if(cardSnapshot)t.set(cardId,'shared','cardSnapshot',cardSnapshot);}
                if(isZichtbaar&&!verbergUitZijbalk)pool.appendChild(maakTrelloBronKaart(liveCard,placements.length));
                placements.forEach(function(p){
                    if(!p.ploeg||!p.datum)return;
                    var kaartData=isZichtbaar?liveCard:snapshotNaarKaart(cardSnapshot||{});
                    var openUrl=isZichtbaar?(liveCard.url||''):((cardSnapshot&&(cardSnapshot.u||cardSnapshot.url))||'');
                    var ctx={card:kaartData,kanTonen:isZichtbaar,url:openUrl,isArchief:verbergUitZijbalk,ploeg:p.ploeg};
                    allePlaatsingsParen.push({p:p,ctx:ctx});
                });
            });
            if(JSON.stringify(nieuweIndex.slice().sort())!==JSON.stringify(indexIds.slice().sort()))t.set('board','shared','plannedCardIds',nieuweIndex);
            sorteerPlaatsingenVoorRender(allePlaatsingsParen);
            allePlaatsingsParen.forEach(function(item){tekenPlacement(item.p,item.ctx);});
            alleInterventies=interventions;
            alleVerlofItems=verlofItems;
            interventions.forEach(function(int){tekenInterventie(int);});
            verlofItems.forEach(function(v){tekenVerlofItem(v);});
            herlayoutPloegRijen();
            var zoekVeld=document.getElementById('sidebar-search');
            if(zoekVeld)filterZijbalk(zoekVeld.value);
        });
    }).catch(function(err){
        console.error('Fout bij laden kaarten:',err&&err.message?err.message:err);
        if(loadingMsg)loadingMsg.style.display='none';
        if(errorMsg)errorMsg.style.display='block';
    });
}

t.render(function(){
    return Promise.all([t.get('board','shared','viewMode','week'),t.get('board','shared','ankerDatum',null)]).then(function(res){
        var opgeslagenView=res[0],opgeslagenAnker=res[1];
        if(['week','multi','month'].indexOf(opgeslagenView)!==-1)VIEW_MODUS=opgeslagenView;
        document.body.dataset.view=VIEW_MODUS;
        if(isISO(opgeslagenAnker)){var p=opgeslagenAnker.split('-');ankerDatum=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));ankerDatum.setHours(0,0,0,0);}
        else{ankerDatum=new Date();ankerDatum.setHours(0,0,0,0);}
        snapAnkerNaarPeriode();return laadEnRenderAlles();
    });
});

/* ── HULPFUNCTIE: VELD BEWERKBAAR ── */
function maakBewerkbaarVeld(veldEl,opslaanCallback){
    veldEl.contentEditable=false;
    veldEl.addEventListener('click',function(){if(!isAdmin)return;if(veldEl.isContentEditable)return;veldEl.contentEditable=true;veldEl.focus();var range=document.createRange();range.selectNodeContents(veldEl);range.collapse(false);var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);});
    veldEl.addEventListener('blur',function(){veldEl.contentEditable=false;var txt=veldEl.innerText.trim();if(!txt){veldEl.innerHTML='';}opslaanCallback(txt);});
    veldEl.addEventListener('keydown',function(e){
        if(e.key==='Enter'){if(e.shiftKey){e.preventDefault();if(document.queryCommandSupported&&document.queryCommandSupported('insertLineBreak')){document.execCommand('insertLineBreak');}else{var sel=window.getSelection();if(sel&&sel.rangeCount>0){var range=sel.getRangeAt(0);range.deleteContents();var br=document.createElement('br');range.insertNode(br);range.setStartAfter(br);range.setEndAfter(br);sel.removeAllRanges();sel.addRange(range);}}}else{e.preventDefault();veldEl.blur();}}
    });
}

/* ── GEDEELDE PROJECTINHOUD ── */
function vulTrelloBasis(bodyContainer,card){
    var titleEl=document.createElement('div');titleEl.className='card-title';titleEl.innerText=card.name;bodyContainer.appendChild(titleEl);
    if(card.address){var adresEl=document.createElement('div');adresEl.className='card-address';adresEl.innerText='📍 '+card.address;bodyContainer.appendChild(adresEl);}
    if(card.desc){
        var extraFields=parseDescriptionFields(card.desc);
        for(var label in extraFields){
            if(label.indexOf('Adres')!==-1&&card.address)continue;
            if(label.indexOf('Klant')!==-1)continue;
            var fieldEl=document.createElement('div');fieldEl.className='card-address';fieldEl.innerText=label+': '+extraFields[label];bodyContainer.appendChild(fieldEl);
        }
    }
}

/* ── KAART-INFO POPUP ── */
function koppelKaartOpenen(el,info){
    if(!info||(!info.cardId&&!info.url))return;
    el.title='Klik voor kaartinfo — de planning blijft open';
    el.addEventListener('click',function(e){
        if(e.target.closest('.card-info-placement, .card-address-editable, .card-controls, .span-resize-handle'))return;
        var sel=window.getSelection();if(sel&&sel.toString().length>0)return;
        toonKaartPopup(info.kaartData||{},info);
    });
}
function sluitKaartPopup(){var b=document.getElementById('card-popup-overlay');if(b&&b.parentNode)b.parentNode.removeChild(b);}
var TRELLO_LABEL_KLEUREN={green:'#61bd4f',yellow:'#f2d600',orange:'#ff9f1a',red:'#eb5a46',purple:'#c377e0',blue:'#0079bf',sky:'#00c2e0',lime:'#51e898',pink:'#ff78cb',black:'#344563'};
function labelKleur(c){if(!c)return'#b3bac5';return TRELLO_LABEL_KLEUREN[String(c).split('_')[0]]||'#b3bac5';}
function formatteerDatum(iso){if(!iso)return'';var d=new Date(iso);if(isNaN(d.getTime()))return'';return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function toonKaartPopup(kaartData,info){
    sluitKaartPopup();
    var overlay=document.createElement('div');overlay.className='card-popup-overlay';overlay.id='card-popup-overlay';
    overlay.addEventListener('click',function(e){if(e.target===overlay)sluitKaartPopup();});
    function onEsc(ev){if(ev.key==='Escape'){sluitKaartPopup();document.removeEventListener('keydown',onEsc);}}
    document.addEventListener('keydown',onEsc);
    var popup=document.createElement('div');popup.className='card-popup';
    var sluit=document.createElement('span');sluit.className='card-popup-close';sluit.innerHTML='&times;';sluit.title='Sluiten';sluit.addEventListener('click',sluitKaartPopup);popup.appendChild(sluit);
    var stijl=bepaalTrelloKaartStijl(kaartData.members);
    var bar=document.createElement('div');bar.className='card-popup-color-bar';bar.style.backgroundColor=stijl.bg;popup.appendChild(bar);
    var titel=document.createElement('div');titel.className='card-popup-title';titel.innerText=kaartData.name||'(naam onbekend)';popup.appendChild(titel);
    var ledenNamen=(kaartData.members||[]).map(function(m){return m.fullName||m.username||m.initials||'';}).filter(function(n){return n;});
    if(ledenNamen.length){var leden=document.createElement('div');leden.className='card-popup-field';leden.innerText='👥 '+ledenNamen.join(', ');popup.appendChild(leden);}
    if(kaartData.labels&&kaartData.labels.length){var labelWrap=document.createElement('div');labelWrap.className='card-popup-labels';kaartData.labels.forEach(function(lbl){var chip=document.createElement('span');chip.className='card-popup-label';chip.style.backgroundColor=labelKleur(lbl.color);chip.innerText=lbl.name||(lbl.color||'label');labelWrap.appendChild(chip);});popup.appendChild(labelWrap);}
    if(kaartData.due){var due=document.createElement('div');due.className='card-popup-field';due.innerText='📅 Vervaldatum: '+formatteerDatum(kaartData.due)+(kaartData.dueComplete?' ✓ voltooid':'');popup.appendChild(due);}
    if(kaartData.address){var adr=document.createElement('div');adr.className='card-popup-field';adr.innerText='📍 '+kaartData.address;popup.appendChild(adr);}
    if(kaartData.desc&&kaartData.desc.trim()){var descLabel=document.createElement('div');descLabel.className='card-popup-section-label';descLabel.innerText='📝 Omschrijving';popup.appendChild(descLabel);var descBlok=document.createElement('div');descBlok.className='card-popup-desc';descBlok.innerText=kaartData.desc;popup.appendChild(descBlok);}
    else if(!kaartData.address&&!ledenNamen.length){var leeg=document.createElement('div');leeg.className='card-popup-field';leeg.style.fontStyle='italic';leeg.style.opacity='0.7';leeg.innerText='Geen extra info beschikbaar.';popup.appendChild(leeg);}
    if(!info.kanTonen){var an=document.createElement('div');an.className='card-popup-field';an.style.fontStyle='italic';an.style.opacity='0.7';an.style.marginTop='8px';an.innerText='📦 Gearchiveerde kaart — beperkte momentopname.';popup.appendChild(an);}
    var btn=document.createElement('button');btn.className='card-popup-open-btn';btn.type='button';btn.innerText='📇 Volledige kaart openen in Trello';
    btn.addEventListener('click',function(){document.removeEventListener('keydown',onEsc);sluitKaartPopup();if(info.kanTonen&&info.cardId){t.showCard(info.cardId);}else if(info.url){t.navigate({url:info.url});}});
    popup.appendChild(btn);
    var hint=document.createElement('div');hint.className='card-popup-hint';hint.innerText='Sluit (Esc of ×) om verder te plannen.';popup.appendChild(hint);
    overlay.appendChild(popup);document.body.appendChild(overlay);
}

/* ── BRON-KAART ── */
function maakTrelloBronKaart(card,aantalGepland){
    var el=document.createElement('div');el.className='planning-card';el.id=card.id;el.draggable=isAdmin;el.dataset.rol='bron';
    var body=document.createElement('div');body.className='card-body';vulTrelloBasis(body,card);
    var badge=document.createElement('span');badge.className='plan-badge';body.appendChild(badge);
    el.appendChild(body);
    var stijl=bepaalTrelloKaartStijl(card.members);el.style.backgroundColor=stijl.bg;el.style.color=stijl.text;
    el.addEventListener('dragstart',drag);el.addEventListener('dragend',dragEnd);
    koppelKaartOpenen(el,{kaartData:card,kanTonen:true,cardId:card.id,url:card.url||''});
    zetBronBadge(el,aantalGepland);
    return el;
}
function zetBronBadge(el,count){if(!el)return;var badge=el.querySelector('.plan-badge');if(!badge)return;if(count>0){badge.innerText='📌 '+count+'× ingepland';badge.style.display='inline-block';}else{badge.style.display='none';}}
function updateBronBadgeById(cardId,count){zetBronBadge(document.getElementById(cardId),count);}

/* ── INSTANTIE-KAART ── */
function maakTrelloInstantieKaart(card,placement,opts){
    opts=opts||{};
    var el=document.createElement('div');el.className='planning-card';if(placement.zwevend)el.classList.add('zwevend');
    el.id=placement.instanceId;el.dataset.instanceId=placement.instanceId;el.draggable=false;el.dataset.rol='instantie';
    var body=document.createElement('div');body.className='card-body';vulTrelloBasis(body,card);
    if(opts.isArchief){var tag=document.createElement('span');tag.className='archief-tag';tag.innerText='📦 Archief';body.appendChild(tag);}
    if(placement.zwevend){var zbadge=document.createElement('span');zbadge.className='zwevend-badge';zbadge.innerText='☁ Onzeker';body.appendChild(zbadge);}
    var infoEl=document.createElement('div');infoEl.className='card-info-placement';infoEl.innerText=placement.infoPlaatsing||'';
    maakBewerkbaarVeld(infoEl,function(txt){updateInstantieInfo(cardIdVanInstantie(placement.instanceId),placement.instanceId,txt);});
    body.appendChild(infoEl);el.appendChild(body);
    var stijl=bepaalTrelloKaartStijl(card.members);el.style.backgroundColor=stijl.bg;el.style.color=stijl.text;
    el.addEventListener('dragstart',drag);el.addEventListener('dragend',dragEnd);
    if(opts.metResize&&isAdmin&&opts.ctx){el.appendChild(maakResizeHandle(function(e){startPlacementResize(e,placement,opts.ctx);}));}
    if(isAdmin&&opts.ctx){
        var zwBtn=document.createElement('span');zwBtn.className='zwevend-toggle-btn'+(placement.zwevend?' actief':'');
        zwBtn.title=placement.zwevend?'Markeer als zeker ingepland':'Markeer als onzeker (zwevend)';zwBtn.innerHTML='☁';
        (function(p,ctx){zwBtn.addEventListener('click',function(e){e.stopPropagation();toggleZwevend(p,ctx);});})(placement,opts.ctx);
        var controls=document.createElement('div');controls.className='card-controls';controls.appendChild(zwBtn);el.appendChild(controls);
    }
    if(isAdmin){voegReorderHandleToe(el);}
    koppelKaartOpenen(el,{kaartData:card,kanTonen:!!opts.kanTonen,cardId:cardIdVanInstantie(placement.instanceId),url:opts.url||''});
    return el;
}

/* ── INTERVENTIE-KAART ── */
function maakInterventieKaart(int,opts){
    opts=opts||{};
    var id=int.id;
    var el=document.createElement('div');el.className='planning-card';if(int.zwevend)el.classList.add('zwevend');
    el.id=id;el.dataset.intId=id;el.draggable=false;el.dataset.rol='interventie';
    var body=document.createElement('div');body.className='card-body';
    var titleEl=document.createElement('div');titleEl.className='card-title';titleEl.innerText=int.name;
    maakBewerkbaarVeld(titleEl,function(txt){updateInterventionText(id,txt);});body.appendChild(titleEl);
    var addressEl=document.createElement('div');addressEl.className='card-address card-address-editable';addressEl.innerText=int.address||'';
    maakBewerkbaarVeld(addressEl,function(txt){updateInterventionAddress(id,txt);});body.appendChild(addressEl);
    var infoEl=document.createElement('div');infoEl.className='card-info-placement';infoEl.innerText=int.infoPlaatsing||'';
    maakBewerkbaarVeld(infoEl,function(txt){updateInterventionInfo(id,txt);});body.appendChild(infoEl);
    if(int.zwevend){var izbadge=document.createElement('span');izbadge.className='zwevend-badge';izbadge.innerText='☁ Onzeker';body.appendChild(izbadge);}
    el.appendChild(body);
    var stijl=int.colorObj||CUSTOM_COLORS[0];el.style.backgroundColor=stijl.bg;el.style.color=stijl.text;
    if(isAdmin){
        var controls=document.createElement('div');controls.className='card-controls';
        var izwBtn=document.createElement('span');izwBtn.className='zwevend-toggle-btn'+(int.zwevend?' actief':'');
        izwBtn.title=int.zwevend?'Markeer als zeker ingepland':'Markeer als onzeker (zwevend)';izwBtn.innerHTML='☁';
        izwBtn.addEventListener('click',function(e){e.stopPropagation();toggleZwevendInterventie(id);});controls.appendChild(izwBtn);
        var colorBtn=document.createElement('span');colorBtn.className='color-btn';colorBtn.innerHTML='🎨';
        colorBtn.addEventListener('click',function(e){
            e.stopPropagation();document.querySelectorAll('.color-picker-menu').forEach(function(m){m.remove();});
            var pm=document.createElement('div');pm.className='color-picker-menu';
            CUSTOM_COLORS.forEach(function(kleur){var sw=document.createElement('div');sw.className='color-swatch';sw.style.backgroundColor=kleur.bg;sw.addEventListener('click',function(e2){e2.stopPropagation();setInterventionColor(id,el,kleur);pm.remove();});pm.appendChild(sw);});
            controls.appendChild(pm);
        });
        controls.appendChild(colorBtn);
        var delBtn=document.createElement('span');delBtn.className='delete-btn';delBtn.innerHTML='&times;';
        delBtn.addEventListener('click',function(e){e.stopPropagation();verwijderInterventie(id);});controls.appendChild(delBtn);el.appendChild(controls);
        voegReorderHandleToe(el);
    }
    el.addEventListener('dragstart',drag);el.addEventListener('dragend',dragEnd);
    if(opts.metResize&&isAdmin){el.appendChild(maakResizeHandle(function(e){startInterventieResize(e,int);}));}
    return el;
}

/* ── DATA OPSLAG ── */
function updateInstantieInfo(cardId,instanceId,tekst){t.get(cardId,'shared','placements',[]).then(function(lijst){return t.set(cardId,'shared','placements',(Array.isArray(lijst)?lijst:[]).map(function(p){if(p.instanceId===instanceId)p.infoPlaatsing=tekst;return p;}));});}
function updateInterventionText(id,tekst){t.get('board','shared','interventions',[]).then(function(lijst){return t.set('board','shared','interventions',(Array.isArray(lijst)?lijst:[]).map(function(i){if(i.id===id)i.name=tekst;return i;}));}).catch(function(e){console.error('updateInterventionText fout:',e);});}
function updateInterventionAddress(id,adres){t.get('board','shared','interventions',[]).then(function(lijst){return t.set('board','shared','interventions',(Array.isArray(lijst)?lijst:[]).map(function(i){if(i.id===id)i.address=adres;return i;}));}).catch(function(e){console.error('updateInterventionAddress fout:',e);});}
function updateInterventionInfo(id,tekst){t.get('board','shared','interventions',[]).then(function(lijst){return t.set('board','shared','interventions',(Array.isArray(lijst)?lijst:[]).map(function(i){if(i.id===id)i.infoPlaatsing=tekst;return i;}));}).catch(function(e){console.error('updateInterventionInfo fout:',e);});}
function setInterventionColor(id,kaartEl,gekozenKleurObj){
    t.get('board','shared','interventions',[]).then(function(lijst){
        return t.set('board','shared','interventions',(Array.isArray(lijst)?lijst:[]).map(function(item){if(item.id===id)item.colorObj=gekozenKleurObj;return item;})).then(function(){
            if(kaartEl){kaartEl.style.backgroundColor=gekozenKleurObj.bg;kaartEl.style.color=gekozenKleurObj.text;}
            else{document.querySelectorAll('[data-int-id="'+id+'"]').forEach(function(seg){seg.style.backgroundColor=gekozenKleurObj.bg;seg.style.color=gekozenKleurObj.text;});}
        });
    });
}
function toggleZwevendInterventie(id){
    if(!isAdmin)return;
    t.get('board','shared','interventions',[]).then(function(lijst){
        var arr=Array.isArray(lijst)?lijst:[],gewijzigd=null;
        arr=arr.map(function(i){if(i.id===id){i.zwevend=!i.zwevend;gewijzigd=i;}return i;});
        return t.set('board','shared','interventions',arr).then(function(){return gewijzigd;});
    }).then(function(int){if(!int)return;hertekenEnkeleInterventie(int);});
}

function voegDirecteInterventieToe(ploeg,datum){
    if(!isAdmin)return;
    var nieuw={id:'int-'+Date.now(),name:'Nieuwe interventie',ploeg:ploeg,datum:datum,members:[],address:'',infoPlaatsing:'',colorObj:CUSTOM_COLORS[0]};
    t.get('board','shared','interventions',[]).then(function(lijst){var arr=Array.isArray(lijst)?lijst:[];arr.push(nieuw);return t.set('board','shared','interventions',arr);})
    .then(function(){
        tekenInterventie(nieuw);herlayoutPloegRijen();
        var cardEl=document.getElementById(nieuw.id)||document.querySelector('[data-int-id="'+nieuw.id+'"]');
        if(cardEl){var titleEl=cardEl.querySelector('.card-title');if(titleEl){titleEl.contentEditable=true;titleEl.focus();var range=document.createRange();range.selectNodeContents(titleEl);var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);}}
    });
}

function verwijderInterventie(id){
    if(!isAdmin)return;
    t.get('board','shared','interventions',[]).then(function(lijst){return t.set('board','shared','interventions',lijst.filter(function(i){return i.id!==id;}));})
    .then(function(){
        document.querySelectorAll('[data-int-id="'+id+'"]').forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
        var los=document.getElementById(id);if(los&&los.parentNode)los.parentNode.removeChild(los);
        stapelVrijgeven(id);herlayoutPloegRijen();
    });
}

/* ── DRAG AND DROP ── */
function allowDrop(e){
    if(!isAdmin)return;
    var dragType=document.body.dataset.dragType||'';
    var zoneIsVerlof=(this.dataset.rowType==='verlof');
    if(dragType==='verlof'&&!zoneIsVerlof)return;
    if(dragType&&dragType!=='verlof'&&zoneIsVerlof)return;
    e.preventDefault();this.classList.add('dragover');
    if((dragType==='instantie'||dragType==='interventie')&&_dragCurrentId&&this.dataset.ploeg===_dragCurrentPloeg){
        var sD,eD;
        if(dragType==='instantie'){
            var p=plaatsingsData[_dragCurrentId];
            if(p){sD=ddMMNaarDate(placementStart(p));eD=ddMMNaarDate(placementEind(p));}
        } else {
            var int0=null;
            for(var i=0;i<alleInterventies.length;i++){if(alleInterventies[i].id===_dragCurrentId){int0=alleInterventies[i];break;}}
            if(int0){sD=ddMMNaarDate(intStart(int0));eD=ddMMNaarDate(intEind(int0));}
        }
        if(sD&&eD){if(this.dataset.datum===_dragCurrentDatum)toonReorderIndicator(this,e);}
    }
}
function toonReorderIndicator(zone, e){
    var ploeg=zone.dataset.ploeg; if(!ploeg)return;
    /* Verzamel alle zichtbare kaarten in dezelfde ploeg-rij, gesorteerd op top */
    var kaarten=[];
    document.querySelectorAll('.dropzone[data-ploeg="'+ploeg+'"] > .planning-card, .dropzone[data-ploeg="'+ploeg+'"] > .placement-band').forEach(function(el){
        if(el.style.display==='none')return;
        var rect=el.getBoundingClientRect();
        kaarten.push({el:el,midY:(rect.top+rect.bottom)/2,topY:rect.top});
    });
    kaarten.sort(function(a,b){return a.topY-b.topY;});
    /* Bepaal insert-positie op basis van muisY */
    var insertIdx=kaarten.length;
    for(var i=0;i<kaarten.length;i++){if(e.clientY<kaarten[i].midY){insertIdx=i;break;}}
    zone.dataset.reorderInsertIdx=insertIdx;
    _reorderLastIdx=insertIdx;
    /* Teken indicator lijn */
    verwijderReorderIndicator();
    var zoneRect=zone.getBoundingClientRect();
    var indicatorY;
    if(kaarten.length===0){
        indicatorY=BAND_TOP;
    } else if(insertIdx===0){
        indicatorY=(kaarten[0].topY-zoneRect.top)/tableZoom-2;
    } else if(insertIdx>=kaarten.length){
        var last=kaarten[kaarten.length-1].el.getBoundingClientRect();
        indicatorY=(last.bottom-zoneRect.top)/tableZoom+2;
    } else {
        var prevBottom=kaarten[insertIdx-1].el.getBoundingClientRect().bottom;
        var nextTop=kaarten[insertIdx].topY;
        indicatorY=((prevBottom+nextTop)/2-zoneRect.top)/tableZoom;
    }
    var lijn=document.createElement('div');lijn.className='reorder-indicator';
    lijn.style.top=indicatorY+'px';
    zone.appendChild(lijn);
}
function dragLeave(e){
    if(e.relatedTarget && this.contains(e.relatedTarget)) return;
    this.classList.remove('dragover');
    var dragType=document.body.dataset.dragType||'';
    if(dragType==='instantie'||dragType==='interventie'){
        var relZone=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest('.dropzone');
        if(relZone&&relZone.dataset.ploeg===_dragCurrentPloeg) return;
    }
    verwijderReorderIndicator();
}
function voegReorderHandleToe(el){
    var handle=document.createElement('span');
    handle.className='reorder-handle';
    handle.draggable=false;
    handle.innerHTML='&#8942;&#8942;';
    handle.addEventListener('mousedown',function(e){
        e.stopPropagation();
        el.draggable=true;
        function resetDraggable(){
            if(!document.body.dataset.dragType) el.draggable=false;
            document.removeEventListener('mouseup',resetDraggable,true);
        }
        document.addEventListener('mouseup',resetDraggable,true);
    });
    el.appendChild(handle);
}
function verwijderReorderIndicator(){
    document.querySelectorAll('.reorder-indicator').forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
    document.querySelectorAll('.dropzone[data-reorder-insert-idx]').forEach(function(z){delete z.dataset.reorderInsertIdx;});
}
function drag(e){
    if(!isAdmin){e.preventDefault();return;}
    var rol=e.currentTarget.dataset.rol||'';
    document.body.dataset.dragType=rol;
    var transferId;
    if(rol==='verlof'&&e.currentTarget.dataset.verlofId)transferId=e.currentTarget.dataset.verlofId;
    else if(rol==='instantie'&&e.currentTarget.dataset.instanceId)transferId=e.currentTarget.dataset.instanceId;
    else if(rol==='interventie'&&e.currentTarget.dataset.intId)transferId=e.currentTarget.dataset.intId;
    else transferId=e.currentTarget.id;
    e.dataTransfer.setData("text",transferId);
    _dragCurrentId=transferId;
    _dragCurrentPloeg=e.currentTarget.dataset.ploegRow||'';
    _dragCurrentDatum=e.currentTarget.dataset.datum||'';
}
function dragEnd(e){
    delete document.body.dataset.dragType;
    if(e.currentTarget){
        delete e.currentTarget.dataset.dragAction;
        var rol=e.currentTarget.dataset.rol;
        if(rol==='instantie'||rol==='interventie') e.currentTarget.draggable=false;
    }
    _dragCurrentId='';_dragCurrentPloeg='';_dragCurrentDatum='';
    verwijderReorderIndicator();
}

function drop(e){
    if(!isAdmin)return;
    e.preventDefault();this.classList.remove('dragover');delete document.body.dataset.dragType;
    var doelZone=this,id=e.dataTransfer.getData("text");
    if(!id)return;
    var doelPloeg=doelZone.dataset.ploeg,doelDatum=doelZone.dataset.datum,doelRowType=doelZone.dataset.rowType||'';
    var naarZijbalk=!doelPloeg;

    var soort;
    if(id.indexOf('verlof-')===0)soort='verlof';
    else if(id.indexOf('int-')===0)soort='interventie';
    else if(id.indexOf('::')!==-1)soort='instantie';
    else soort='bron';

    if(soort==='verlof'){
        if(naarZijbalk||doelRowType!=='verlof')return;
        t.get('board','shared','verlofItems',[]).then(function(lijst){
            var arr=Array.isArray(lijst)?lijst:[],item=null;
            arr.forEach(function(v){if(v.id===id)item=v;});
            if(!item)return;
            var oudeStart=item.startDatum||item.datum,oudeEind=item.eindDatum||oudeStart;
            if(oudeStart===doelDatum)return;
            var rangeLengte=aantalDagenTussen(oudeStart,oudeEind);
            item.startDatum=doelDatum;item.eindDatum=voegDagenToe(doelDatum,rangeLengte);delete item.datum;
            return t.set('board','shared','verlofItems',arr).then(function(){hertekenEnkelVerlofItem(item);});
        });
        return;
    }
    if(doelRowType==='verlof'&&soort!=='verlof')return;

    if(soort==='instantie'){
        /* Zelfde ploeg + valt binnen huidige datumspanne → herschikken */
        var p0=plaatsingsData[id];
        if(p0&&doelPloeg===p0.ploeg){
            var sD0=ddMMNaarDate(placementStart(p0)),eD0=ddMMNaarDate(placementEind(p0)),dD0=ddMMNaarDate(doelDatum);
            if(doelDatum===_dragCurrentDatum){
                var insertIdx0=parseInt(doelZone.dataset.reorderInsertIdx,10);
                if(isNaN(insertIdx0))insertIdx0=_reorderLastIdx;
                verwijderReorderIndicator();
                herschikKaart(id,doelPloeg,insertIdx0);
                return;
            }
        }
        var cardId=cardIdVanInstantie(id),ctx=placementCtx[id];
        if(naarZijbalk){
            document.querySelectorAll('[data-instance-id="'+id+'"]').forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
            stapelVrijgeven(id);
            t.get(cardId,'shared','placements',[]).then(function(lijst){
                var arr=(Array.isArray(lijst)?lijst:[]).filter(function(p){return p.instanceId!==id;});
                return t.set(cardId,'shared','placements',arr).then(function(){return arr.length;});
            }).then(function(aantal){updateBronBadgeById(cardId,aantal);if(aantal===0)verwijderCardUitIndex(cardId);});
            return;
        }
        t.get(cardId,'shared','placements',[]).then(function(lijst){
            var arr=Array.isArray(lijst)?lijst:[],doelP=null;
            arr=arr.map(function(p){
                if(p.instanceId===id){
                    var oudStart=p.datum,oudEind=p.eindDatum||p.datum,len=aantalDagenTussen(oudStart,oudEind);
                    p.ploeg=doelPloeg;p.datum=doelDatum;
                    if(len>0){p.eindDatum=voegDagenToe(doelDatum,len);}else{delete p.eindDatum;}
                    doelP=p;
                }return p;
            });
            return t.set(cardId,'shared','placements',arr).then(function(){return doelP;});
        }).then(function(doelP){
            if(!doelP)return;
            if(ctx){ctx.ploeg=doelPloeg;}
            else{
                var liveCard=trelloKaartCache[cardId];
                if(liveCard){ctx={card:liveCard,kanTonen:true,url:liveCard.url||'',isArchief:false,ploeg:doelPloeg};hertekenEnkelPlacement(doelP,ctx);}
                else{t.get(cardId,'shared','cardSnapshot',null).then(function(snap){ctx={card:snapshotNaarKaart(snap||{}),kanTonen:false,url:(snap&&(snap.u||snap.url))||'',isArchief:true,ploeg:doelPloeg};hertekenEnkelPlacement(doelP,ctx);});}
                return;
            }
            hertekenEnkelPlacement(doelP,ctx);
        });
        return;
    }

    if(soort==='bron'){
        if(naarZijbalk)return;
        var card=trelloKaartCache[id];if(!card)return;
        var nieuwePlacement={instanceId:genInstanceId(id),ploeg:doelPloeg,datum:doelDatum,infoPlaatsing:''};
        t.set(id,'shared','cardSnapshot',maakKaartSnapshot(card));
        t.get(id,'shared','placements',[]).then(function(lijst){
            var arr=Array.isArray(lijst)?lijst:[];arr.push(nieuwePlacement);
            return t.set(id,'shared','placements',arr).then(function(){return arr.length;});
        }).then(function(aantal){
            var ctx={card:card,kanTonen:true,url:card.url||'',isArchief:false,ploeg:doelPloeg};
            tekenPlacement(nieuwePlacement,ctx);herlayoutPloegRijen();updateBronBadgeById(id,aantal);voegCardToeAanIndex(id);
        });
        return;
    }

    if(soort==='interventie'){
        /* Zelfde ploeg + valt binnen huidige datumspanne → herschikken */
        var int0r=null;
        for(var ii=0;ii<alleInterventies.length;ii++){if(alleInterventies[ii].id===id){int0r=alleInterventies[ii];break;}}
        if(int0r&&doelPloeg&&doelPloeg===int0r.ploeg){
            var siD=ddMMNaarDate(intStart(int0r)),eiD=ddMMNaarDate(intEind(int0r)),diD=ddMMNaarDate(doelDatum);
            if(doelDatum===_dragCurrentDatum){
                var insertIdxI=parseInt(doelZone.dataset.reorderInsertIdx,10);
                if(isNaN(insertIdxI))insertIdxI=_reorderLastIdx;
                verwijderReorderIndicator();
                herschikKaart(id,doelPloeg,insertIdxI);
                return;
            }
        }
        if(naarZijbalk){
            document.querySelectorAll('[data-int-id="'+id+'"]').forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
            var losEl=document.getElementById(id);if(losEl&&losEl.parentNode)losEl.parentNode.removeChild(losEl);
            stapelVrijgeven(id);
            t.get('board','shared','interventions',[]).then(function(lijst){
                var arr=Array.isArray(lijst)?lijst:[],doelInt=null;
                arr=arr.map(function(item){if(item.id===id){item.ploeg=null;item.datum=null;delete item.eindDatum;doelInt=item;}return item;});
                return t.set('board','shared','interventions',arr).then(function(){return doelInt;});
            }).then(function(doelInt){
                if(doelInt){tekenInterventie(doelInt);herlayoutPloegRijen();}
                var z=document.getElementById('sidebar-search');if(z)filterZijbalk(z.value);
            });
            return;
        }
        t.get('board','shared','interventions',[]).then(function(lijst){
            var arr=Array.isArray(lijst)?lijst:[],doelInt=null;
            arr=arr.map(function(item){
                if(item.id===id){
                    var oudStart=item.datum,oudEind=item.eindDatum||item.datum,len=(oudStart?aantalDagenTussen(oudStart,oudEind):0);
                    item.ploeg=doelPloeg;item.datum=doelDatum;
                    if(len>0){item.eindDatum=voegDagenToe(doelDatum,len);}else{delete item.eindDatum;}
                    doelInt=item;
                }return item;
            });
            return t.set('board','shared','interventions',arr).then(function(){return doelInt;});
        }).then(function(doelInt){if(doelInt)hertekenEnkeleInterventie(doelInt);});
        return;
    }
}

var poolEl=document.getElementById('sidebar-pool');
poolEl.addEventListener('dragover',function(e){if(!isAdmin)return;if((document.body.dataset.dragType||'')==='verlof')return;e.preventDefault();poolEl.classList.add('dragover');});
poolEl.addEventListener('dragleave',function(){poolEl.classList.remove('dragover');});
poolEl.addEventListener('drop',function(e){
    if(!isAdmin)return;
    if((document.body.dataset.dragType||'')==='verlof'){poolEl.classList.remove('dragover');delete document.body.dataset.dragType;return;}
    drop.call(poolEl,e);
});

var searchInput=document.getElementById('sidebar-search');
if(searchInput)searchInput.addEventListener('input',function(){filterZijbalk(this.value);});
document.addEventListener('focusout',function(e){var t2=e.target;if(t2&&t2.closest&&t2.closest('.dropzone[data-row-type="ploeg"]'))setTimeout(herlayoutPloegRijen,0);});

/* ════════════════════════════════════════════════════════
   ── INSTELLINGEN PANEEL ──
   Sla kolombreedtes + rijhoogte per view op via t.set.
   ════════════════════════════════════════════════════════ */

var INSTELLINGEN_KEY = 'layoutInstellingen';

/* Standaardwaarden per view */
var INST_DEFAULTS = {
    week:  { weekdag: 150, weekend: 100, ploegKol: 130, tekstGrootte: 13, rijHoogte: { vast: false, hoogte: 120 }, perRijHoogte: {} },
    multi: { weekdag: 120, weekend:  80, ploegKol: 130, tekstGrootte: 12, rijHoogte: { vast: false, hoogte: 100 }, perRijHoogte: {} },
    month: { weekdag: 100, weekend:  67, ploegKol: 130, tekstGrootte: 10, rijHoogte: { vast: false, hoogte:  80 }, perRijHoogte: {} }
};

function kloonInstDefaults(v) {
    var d = INST_DEFAULTS[v];
    return Object.assign({}, d, {
        rijHoogte: Object.assign({}, d.rijHoogte),
        perRijHoogte: Object.assign({}, d.perRijHoogte)
    });
}

/* Huidige instellingen (gevuld bij laden) */
var instellingen = {
    week:  kloonInstDefaults('week'),
    multi: kloonInstDefaults('multi'),
    month: kloonInstDefaults('month')
};

/* Actieve tab in het paneel */
var settingsPaneelView = 'week';

/* ── CSS injectiepunt ── */
var colStijlEl = document.getElementById('col-stijl');
if (!colStijlEl) { colStijlEl = document.createElement('style'); colStijlEl.id = 'col-stijl'; document.head.appendChild(colStijlEl); }

function pasColStijlToe() {
    var css = '';
    ['week','multi','month'].forEach(function(v) {
        var s = instellingen[v];
        css += 'body[data-view="' + v + '"] .col-dag { min-width:' + s.weekdag + 'px; width:' + s.weekdag + 'px; }\n';
        css += 'body[data-view="' + v + '"] .col-dag.is-weekend { min-width:' + s.weekend + 'px; width:' + s.weekend + 'px; }\n';
        css += 'body[data-view="' + v + '"] .col-ploeg { width:' + s.ploegKol + 'px; min-width:' + s.ploegKol + 'px; }\n';
        if (s.tekstGrootte) {
            var t0 = s.tekstGrootte;
            var t1 = Math.max(7, t0 - 2);
            css += 'body[data-view="' + v + '"] .planning-card .card-title,'
                 + 'body[data-view="' + v + '"] .placement-band .card-title { font-size:' + t0 + 'px; }\n';
            css += 'body[data-view="' + v + '"] .planning-card .card-address,'
                 + 'body[data-view="' + v + '"] .placement-band .card-address,'
                 + 'body[data-view="' + v + '"] .planning-card .card-info-placement,'
                 + 'body[data-view="' + v + '"] .placement-band .card-info-placement { font-size:' + t1 + 'px; }\n';
        }
    });
    colStijlEl.textContent = css;
}

function slaInstellingenOp() {
    t.set('board', 'shared', INSTELLINGEN_KEY, instellingen);
}

function laadInstellingen() {
    return Promise.all([
        t.get('board', 'shared', INSTELLINGEN_KEY, null),
        t.get('board', 'shared', 'layoutStandaard', null)
    ]).then(function(results) {
        var opgeslagen = results[0];
        var standaard  = results[1];
        if (standaard && typeof standaard === 'object') {
            ['week','multi','month'].forEach(function(v) {
                if (standaard[v]) INST_DEFAULTS[v] = Object.assign({}, INST_DEFAULTS[v], standaard[v]);
            });
        }
        if (opgeslagen && typeof opgeslagen === 'object') {
            ['week','multi','month'].forEach(function(v) {
                if (opgeslagen[v]) {
                    instellingen[v] = Object.assign({}, INST_DEFAULTS[v], opgeslagen[v]);
                    if (opgeslagen[v].rijHoogte) instellingen[v].rijHoogte = Object.assign({}, INST_DEFAULTS[v].rijHoogte, opgeslagen[v].rijHoogte);
                    instellingen[v].perRijHoogte = Object.assign({}, opgeslagen[v].perRijHoogte || {});
                }
            });
        }
        pasColStijlToe();
    });
}

/* ── Paneel bouwen ── */
function bouwSettingsPaneel() {
    var overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) sluitSettings(); });

    var panel = document.createElement('div');
    panel.className = 'settings-panel';

    /* Header */
    var hdr = document.createElement('div'); hdr.className = 'settings-header';
    var title = document.createElement('h3'); title.innerText = '⚙️ Lay-out instellingen';
    var closeBtn = document.createElement('button'); closeBtn.className = 'settings-close'; closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', sluitSettings);
    hdr.appendChild(title); hdr.appendChild(closeBtn); panel.appendChild(hdr);

    var body = document.createElement('div'); body.className = 'settings-body';

    /* View tabs */
    var tabs = document.createElement('div'); tabs.className = 'settings-view-tabs';
    [['week','Week'],['multi','2 weken'],['month','Maand']].forEach(function(pair) {
        var tb = document.createElement('button');
        tb.className = 'settings-view-tab' + (pair[0] === settingsPaneelView ? ' actief' : '');
        tb.innerText = pair[1]; tb.dataset.tab = pair[0];
        tb.addEventListener('click', function() {
            settingsPaneelView = pair[0];
            sluitSettings();
            bouwSettingsPaneel();
            toonSettings();
        });
        tabs.appendChild(tb);
    });
    body.appendChild(tabs);

    /* Invulvelden voor huidige tab-view */
    var sv = instellingen[settingsPaneelView];
    var vLabels = { week: 'Week', multi: '2 weken', month: 'Maand' };

    function maakNumInput(labelTekst, sleutel, min, max, stap) {
        var rij = document.createElement('div'); rij.className = 'settings-row';
        var lbl = document.createElement('label'); lbl.innerText = labelTekst;
        var inp = document.createElement('input');
        inp.type = 'number'; inp.className = 'settings-num';
        inp.min = min; inp.max = max; inp.step = stap;
        inp.value = sv[sleutel] !== undefined ? sv[sleutel] : INST_DEFAULTS[settingsPaneelView][sleutel];
        var unit = document.createElement('span'); unit.className = 'settings-num-unit'; unit.innerText = 'px';
        function toepassen() {
            var val = parseInt(inp.value, 10);
            if (isNaN(val) || val < min) { val = min; inp.value = val; }
            if (val > max) { val = max; inp.value = val; }
            instellingen[settingsPaneelView][sleutel] = val;
            pasColStijlToe();
            slaInstellingenOp();
        }
        inp.addEventListener('input', toepassen);
        inp.addEventListener('change', toepassen);
        rij.appendChild(lbl); rij.appendChild(inp); rij.appendChild(unit);
        return rij;
    }

    var secKol = document.createElement('div'); secKol.className = 'settings-section-label';
    secKol.innerText = 'Kolombreedtes — ' + vLabels[settingsPaneelView];
    body.appendChild(secKol);
    body.appendChild(maakNumInput('Weekdag kolom', 'weekdag', 60, 300, 5));
    body.appendChild(maakNumInput('Weekend kolom', 'weekend', 40, 200, 5));
    body.appendChild(maakNumInput('Ploeg kolom (1e kol)', 'ploegKol', 80, 300, 5));

    var secTekst = document.createElement('div'); secTekst.className = 'settings-section-label';
    secTekst.innerText = 'Tekstgrootte — ' + vLabels[settingsPaneelView];
    body.appendChild(secTekst);
    body.appendChild(maakNumInput('Kaarttitel', 'tekstGrootte', 7, 18, 1));

    /* ── Rijhoogte sectie ── */
    var secRij = document.createElement('div'); secRij.className = 'settings-section-label';
    secRij.innerText = 'Rijhoogte — ' + vLabels[settingsPaneelView];
    body.appendChild(secRij);

    if (!sv.rijHoogte) sv.rijHoogte = { vast: false, hoogte: 120 };
    if (!sv.perRijHoogte) sv.perRijHoogte = {};

    /* Master blok */
    var masterBlok = document.createElement('div'); masterBlok.className = 'settings-master-blok';
    var masterCb = document.createElement('input'); masterCb.type = 'checkbox'; masterCb.id = 'rij-hoogte-vast'; masterCb.checked = sv.rijHoogte.vast;
    var masterLbl = document.createElement('label'); masterLbl.htmlFor = 'rij-hoogte-vast'; masterLbl.innerText = 'Vaste hoogte voor alle rijen';
    var masterInp = document.createElement('input'); masterInp.type = 'number'; masterInp.className = 'settings-num';
    masterInp.min = 50; masterInp.max = 600; masterInp.step = 10; masterInp.value = sv.rijHoogte.hoogte || 120;
    masterInp.disabled = !sv.rijHoogte.vast;
    var masterUnit = document.createElement('span'); masterUnit.className = 'settings-num-unit'; masterUnit.innerText = 'px';
    masterCb.addEventListener('change', function() {
        sv.rijHoogte = { vast: masterCb.checked, hoogte: parseInt(masterInp.value, 10) || 120 };
        masterInp.disabled = !masterCb.checked;
        slaInstellingenOp(); herlayoutPloegRijen();
    });
    masterInp.addEventListener('input', function() {
        var val = Math.max(50, parseInt(masterInp.value, 10) || 50);
        sv.rijHoogte = { vast: sv.rijHoogte.vast, hoogte: val };
        slaInstellingenOp(); herlayoutPloegRijen();
    });
    masterBlok.appendChild(masterCb); masterBlok.appendChild(masterLbl); masterBlok.appendChild(masterInp); masterBlok.appendChild(masterUnit);
    body.appendChild(masterBlok);

    /* Per-rij overrides */
    var rijList = document.createElement('div'); rijList.className = 'settings-rij-list';
    ploegen.forEach(function(ploeg) {
        var prh = sv.perRijHoogte[ploeg] || { aan: false, hoogte: sv.rijHoogte.hoogte || 120 };
        var item = document.createElement('div'); item.className = 'settings-rij-item';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = prh.aan;
        var lbl = document.createElement('label'); lbl.innerText = ploeg; lbl.style.cssText = 'flex:1;font-size:13px;color:#172b4d;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        var inp = document.createElement('input'); inp.type = 'number'; inp.className = 'settings-num';
        inp.min = 50; inp.max = 600; inp.step = 10; inp.value = prh.hoogte || sv.rijHoogte.hoogte || 120;
        inp.disabled = !prh.aan;
        var unit = document.createElement('span'); unit.className = 'settings-num-unit'; unit.innerText = 'px';
        (function(pl, cbEl, inpEl) {
            cbEl.addEventListener('change', function() {
                sv.perRijHoogte[pl] = { aan: cbEl.checked, hoogte: parseInt(inpEl.value, 10) || 120 };
                inpEl.disabled = !cbEl.checked;
                slaInstellingenOp(); herlayoutPloegRijen();
            });
            inpEl.addEventListener('input', function() {
                var val = Math.max(50, parseInt(inpEl.value, 10) || 50);
                sv.perRijHoogte[pl] = { aan: cbEl.checked, hoogte: val };
                slaInstellingenOp(); herlayoutPloegRijen();
            });
        })(ploeg, cb, inp);
        item.appendChild(cb); item.appendChild(lbl); item.appendChild(inp); item.appendChild(unit);
        rijList.appendChild(item);
    });
    body.appendChild(rijList);

    /* Knoppenrij onderaan */
    var btnRij = document.createElement('div'); btnRij.className = 'settings-btn-rij';

    var resetBtn = document.createElement('button');
    resetBtn.className = 'settings-action-btn';
    resetBtn.innerText = '↺ Standaard herstellen';
    resetBtn.title = 'Herstelt de standaardwaarden voor ' + vLabels[settingsPaneelView];
    resetBtn.addEventListener('click', function() {
        instellingen[settingsPaneelView] = kloonInstDefaults(settingsPaneelView);
        pasColStijlToe(); slaInstellingenOp(); herlayoutPloegRijen();
        sluitSettings(); bouwSettingsPaneel(); toonSettings();
    });

    var slaStdBtn = document.createElement('button');
    slaStdBtn.className = 'settings-action-btn primair';
    slaStdBtn.innerText = '💾 Sla op als standaard';
    slaStdBtn.title = 'Overschrijft de standaardwaarden met de huidige instellingen (alle views)';
    slaStdBtn.addEventListener('click', function() {
        ['week','multi','month'].forEach(function(v) {
            INST_DEFAULTS[v] = Object.assign({}, instellingen[v]);
        });
        t.set('board', 'shared', 'layoutStandaard', INST_DEFAULTS);
        var origTekst = slaStdBtn.innerText;
        slaStdBtn.innerText = '✓ Opgeslagen!';
        setTimeout(function() { slaStdBtn.innerText = origTekst; }, 2000);
    });

    btnRij.appendChild(resetBtn);
    btnRij.appendChild(slaStdBtn);
    body.appendChild(btnRij);

    /* ── Admin beheer sectie ── */
    var hrAdmin = document.createElement('hr');
    hrAdmin.style.cssText = 'border:none;border-top:1px solid #ebecf0;margin:16px 0 12px;';
    body.appendChild(hrAdmin);

    var secAdmin = document.createElement('div'); secAdmin.className = 'settings-section-label';
    secAdmin.style.marginTop = '0'; secAdmin.innerText = 'Admin gebruikers';
    body.appendChild(secAdmin);

    var adminLijstEl = document.createElement('div');
    adminLijstEl.style.cssText = 'font-size:12px;color:#5e6c84;font-style:italic;padding:4px 0;';
    adminLijstEl.innerText = 'Boardleden laden…';
    body.appendChild(adminLijstEl);

    t.board('members').then(function(board) {
        var leden = (board && board.members) || [];
        adminLijstEl.innerHTML = '';
        adminLijstEl.style.cssText = '';
        if (leden.length === 0) {
            adminLijstEl.style.cssText = 'font-size:12px;color:#5e6c84;font-style:italic;';
            adminLijstEl.innerText = 'Geen boardleden gevonden.';
            return;
        }
        var checkboxes = [];
        leden.forEach(function(lid) {
            var rij = document.createElement('div');
            rij.className = 'settings-rij-item';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'admin-cb-' + lid.username;
            cb.checked = ADMIN_USERNAMES.indexOf(lid.username) !== -1;
            var lbl = document.createElement('label');
            lbl.htmlFor = cb.id;
            lbl.style.cssText = 'font-size:13px;color:#172b4d;flex:1;margin:0;cursor:pointer;';
            lbl.innerText = (lid.fullName || lid.username) + ' (@' + lid.username + ')';
            checkboxes.push({ cb: cb, username: lid.username });
            rij.appendChild(cb); rij.appendChild(lbl);
            adminLijstEl.appendChild(rij);
        });
        var adminOpslaanBtn = document.createElement('button');
        adminOpslaanBtn.className = 'settings-action-btn primair';
        adminOpslaanBtn.style.cssText = 'margin-top:10px;width:100%;';
        adminOpslaanBtn.innerText = 'Opslaan';
        adminOpslaanBtn.addEventListener('click', function() {
            if (!isAdmin) return;
            var nieuweAdmins = checkboxes.filter(function(x) { return x.cb.checked; }).map(function(x) { return x.username; });
            if (nieuweAdmins.length === 0) {
                alert('Er moet minstens één admin zijn.');
                return;
            }
            ADMIN_USERNAMES = nieuweAdmins;
            t.set('board', 'shared', 'adminUsernames', ADMIN_USERNAMES).then(function() {
                var origTekst = adminOpslaanBtn.innerText;
                adminOpslaanBtn.innerText = '✓ Opgeslagen!';
                setTimeout(function() { adminOpslaanBtn.innerText = origTekst; }, 2000);
                t.member('username').then(function(member) {
                    var u = (member && member.username) ? member.username.toLowerCase() : '';
                    isAdmin = ADMIN_USERNAMES.indexOf(u) !== -1;
                    toepassenAdminStatus();
                }).catch(function() {});
            });
        });
        adminLijstEl.appendChild(adminOpslaanBtn);
    }).catch(function() {
        adminLijstEl.style.cssText = 'font-size:12px;color:#bf2600;font-style:italic;';
        adminLijstEl.innerText = 'Kon boardleden niet laden.';
    });

    /* ── Backup & Herstel sectie ── */
    var hr = document.createElement('hr');
    hr.style.cssText = 'border:none;border-top:1px solid #ebecf0;margin:16px 0 12px;';
    body.appendChild(hr);

    var secBak = document.createElement('div'); secBak.className = 'settings-section-label';
    secBak.style.marginTop = '0'; secBak.innerText = 'Backup & Herstel';
    body.appendChild(secBak);

    /* Export knop */
    var exportBtn = document.createElement('button');
    exportBtn.className = 'settings-reset-btn';
    exportBtn.style.cssText = 'margin-top:6px;background:#e3fcef;color:#006644;border-color:#57d9a3;';
    exportBtn.innerText = '💾 Download back-up (JSON)';
    exportBtn.addEventListener('click', function() {
        exportBtn.innerText = '⏳ Bezig met verzamelen…';
        exportBtn.disabled = true;
        exporteerBackup().then(function() {
            exportBtn.innerText = '✓ Back-up gedownload!';
            setTimeout(function() { exportBtn.innerText = '💾 Download back-up (JSON)'; exportBtn.disabled = false; }, 2500);
        }).catch(function() {
            exportBtn.innerText = '⚠️ Fout — probeer opnieuw';
            exportBtn.disabled = false;
        });
    });
    body.appendChild(exportBtn);

    /* Import / herstel */
    var importLabel = document.createElement('div');
    importLabel.style.cssText = 'font-size:12px;color:#5e6c84;margin:10px 0 4px;';
    importLabel.innerText = '📂 Herstel vanuit back-upbestand:';
    body.appendChild(importLabel);

    var importInput = document.createElement('input');
    importInput.type = 'file'; importInput.accept = '.json';
    importInput.style.cssText = 'width:100%;font-size:12px;font-family:inherit;color:#172b4d;';
    importInput.addEventListener('change', function() {
        if (!this.files || !this.files[0]) return;
        var f = this.files[0];
        this.value = '';
        importeerBackup(f, function() { sluitSettings(); });
    });
    body.appendChild(importInput);

    var importHint = document.createElement('div');
    importHint.style.cssText = 'font-size:11px;color:#97a0af;margin-top:4px;font-style:italic;';
    importHint.innerText = '⚠️ Herstel overschrijft alle huidige planningsdata.';
    body.appendChild(importHint);

    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
}

function toonSettings() { var o = document.getElementById('settings-overlay'); if (o) o.style.display = 'flex'; }
function sluitSettings() { var o = document.getElementById('settings-overlay'); if (o && o.parentNode) o.parentNode.removeChild(o); }

/* Tandwiel knop tonen enkel voor admins — wordt aangeroepen na toepassenAdminStatus */
var origToepassenAdminStatus = toepassenAdminStatus;
toepassenAdminStatus = function() {
    origToepassenAdminStatus();
    var btn = document.getElementById('settings-btn');
    if (btn) btn.style.display = isAdmin ? 'inline-flex' : 'none';
};

(function koppelSettingsKnop() {
    var btn = document.getElementById('settings-btn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        if (document.getElementById('settings-overlay')) { sluitSettings(); return; }
        settingsPaneelView = VIEW_MODUS; /* open op huidige view-tab */
        bouwSettingsPaneel();
        toonSettings();
    });
})();

/* ════════════════════════════════════════════════════════
   ── BACKUP & HERSTEL (5.2 / 5.3) ──
   ════════════════════════════════════════════════════════ */

var BACKUP_REMINDER_KEY = 'ploegenPlanningLastBackup';
var BACKUP_INTERVAL_DAGEN = 14;
var _backupReminderGetoond = false;

/* ── Export: verzamel alle data en download als JSON ── */
function exporteerBackup() {
    return Promise.all([
        t.get('board','shared','ploegen',[]),
        t.get('board','shared','interventions',[]),
        t.get('board','shared','verlofItems',[]),
        t.get('board','shared','plannedCardIds',[]),
        t.get('board','shared','layoutInstellingen',null),
        t.get('board','shared','layoutStandaard',null)
    ]).then(function(res) {
        var data = {
            versie: 2,
            tijdstip: new Date().toISOString(),
            ploegen:           res[0] || [],
            interventions:     res[1] || [],
            verlofItems:       res[2] || [],
            plannedCardIds:    res[3] || [],
            layoutInstellingen: res[4],
            layoutStandaard:   res[5],
            placements:    {},
            cardSnapshots: {}
        };
        var ids = Array.isArray(data.plannedCardIds) ? data.plannedCardIds : [];
        return Promise.all(ids.map(function(cid) {
            return Promise.all([
                t.get(cid,'shared','placements',[]),
                t.get(cid,'shared','cardSnapshot',null)
            ]).then(function(r) {
                if (r[0] && r[0].length > 0) data.placements[cid] = r[0];
                if (r[1]) data.cardSnapshots[cid] = r[1];
            }).catch(function(){});
        })).then(function() {
            var json = JSON.stringify(data, null, 2);
            var blob = new Blob([json], {type:'application/json'});
            var url  = URL.createObjectURL(blob);
            var a    = document.createElement('a');
            a.href   = url;
            a.download = 'ploegen-planning-backup-' + new Date().toISOString().slice(0,10) + '.json';
            document.body.appendChild(a); a.click();
            setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
            try { localStorage.setItem(BACKUP_REMINDER_KEY, new Date().toISOString()); } catch(e){}
        });
    });
}

/* ── Import: herstel vanuit JSON-bestand ── */
function importeerBackup(bestand, onKlaar) {
    if (!isAdmin) return;
    var reader = new FileReader();
    reader.onerror = function(){ alert('⚠️ Kon het bestand niet lezen.'); };
    reader.onload  = function(e) {
        var data;
        try { data = JSON.parse(e.target.result); } catch(err) {
            alert('⚠️ Ongeldig bestand — controleer of je het juiste JSON-back-upbestand hebt geselecteerd.');
            return;
        }
        if (!data || !data.versie) {
            alert('⚠️ Dit is geen geldige ploegen-planning back-up.');
            return;
        }
        if (!confirm(
            '⚠️ Back-up herstellen?\n\n' +
            'Tijdstip back-up: ' + (data.tijdstip ? data.tijdstip.replace('T',' ').slice(0,16) : 'onbekend') + '\n\n' +
            'Dit overschrijft ALLE huidige planningsdata:\n' +
            '  • Ploegen\n  • Verlof\n  • Interventies\n  • Alle geplande kaarten\n\n' +
            'Deze actie kan NIET ongedaan worden gemaakt.\nDoorgaan?'
        )) return;

        var ops = [
            t.set('board','shared','ploegen',        data.ploegen        || []),
            t.set('board','shared','interventions',  data.interventions  || []),
            t.set('board','shared','verlofItems',    data.verlofItems    || []),
            t.set('board','shared','plannedCardIds', data.plannedCardIds || [])
        ];
        if (data.layoutInstellingen) ops.push(t.set('board','shared','layoutInstellingen', data.layoutInstellingen));
        if (data.layoutStandaard)    ops.push(t.set('board','shared','layoutStandaard',    data.layoutStandaard));

        var pl = data.placements    || {};
        var sn = data.cardSnapshots || {};
        Object.keys(pl).forEach(function(cid){ ops.push(t.set(cid,'shared','placements',   pl[cid])); });
        Object.keys(sn).forEach(function(cid){ if(sn[cid]) ops.push(t.set(cid,'shared','cardSnapshot', sn[cid])); });

        Promise.all(ops).then(function(){
            if (onKlaar) onKlaar();
            laadEnRenderAlles();
        }).catch(function(err){
            alert('⚠️ Herstel mislukt: ' + (err && err.message ? err.message : 'Onbekende fout'));
        });
    };
    reader.readAsText(bestand);
}

/* ── Periodieke back-up herinnering ── */
function controleerBackupReminder() {
    if (!isAdmin || _backupReminderGetoond) return;
    var tonen = false;
    try {
        var laaste = localStorage.getItem(BACKUP_REMINDER_KEY);
        if (!laaste) { tonen = true; }
        else {
            var dagenGeleden = (Date.now() - new Date(laaste).getTime()) / 86400000;
            if (dagenGeleden >= BACKUP_INTERVAL_DAGEN) tonen = true;
        }
    } catch(e) { tonen = true; }
    if (tonen) { _backupReminderGetoond = true; setTimeout(toonBackupReminder, 3000); }
}

function toonBackupReminder() {
    if (document.getElementById('backup-reminder-overlay')) return;
    var laasteTekst = '';
    try {
        var l = localStorage.getItem(BACKUP_REMINDER_KEY);
        if (l) {
            var d = new Date(l);
            laasteTekst = '(laatste: ' + String(d.getDate()).padStart(2,'0') + '/' +
                String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() + ')';
        }
    } catch(e){}

    var overlay = document.createElement('div');
    overlay.id = 'backup-reminder-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(9,30,66,0.42);display:flex;align-items:center;justify-content:center;z-index:900;';

    var popup = document.createElement('div');
    popup.style.cssText = 'background:#fff;border-radius:10px;width:min(400px,92vw);padding:28px 24px 20px;box-shadow:0 8px 32px rgba(0,0,0,0.28);text-align:center;font-family:inherit;';

    var icoon = document.createElement('div');
    icoon.style.cssText = 'font-size:44px;margin-bottom:10px;'; icoon.innerText = '💾';

    var titel = document.createElement('div');
    titel.style.cssText = 'font-size:16px;font-weight:700;color:#172b4d;margin-bottom:8px;';
    titel.innerText = 'Back-up herinnering';

    var tekst = document.createElement('div');
    tekst.style.cssText = 'font-size:13px;color:#5e6c84;line-height:1.55;margin-bottom:22px;white-space:pre-wrap;';
    tekst.innerText = 'Het is al meer dan ' + BACKUP_INTERVAL_DAGEN + ' dagen geleden dat er een back-up werd gemaakt ' +
        laasteTekst + '.\n\nDownload regelmatig een kopie om je planning te beschermen.';

    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';

    var dlBtn = document.createElement('button');
    dlBtn.style.cssText = 'background:#0052cc;color:#fff;border:none;border-radius:6px;padding:10px 22px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s;';
    dlBtn.innerText = '💾 Download back-up';
    dlBtn.addEventListener('mouseover',function(){ dlBtn.style.background='#0747a6'; });
    dlBtn.addEventListener('mouseout', function(){ dlBtn.style.background='#0052cc'; });
    dlBtn.addEventListener('click', function() {
        dlBtn.innerText = '⏳ Bezig…'; dlBtn.disabled = true;
        exporteerBackup().then(function(){
            document.body.removeChild(overlay);
        }).catch(function(){
            dlBtn.innerText = '💾 Download back-up'; dlBtn.disabled = false;
        });
    });

    var laterBtn = document.createElement('button');
    laterBtn.style.cssText = 'background:none;color:#5e6c84;border:1px solid #dfe1e6;border-radius:6px;padding:10px 22px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;';
    laterBtn.innerText = 'Later herinneren';
    laterBtn.addEventListener('click', function() {
        /* stel de teller terug zodat reminder pas na 3 dagen opnieuw verschijnt */
        try { localStorage.setItem(BACKUP_REMINDER_KEY, new Date(Date.now() - (BACKUP_INTERVAL_DAGEN - 3) * 86400000).toISOString()); } catch(e){}
        document.body.removeChild(overlay);
    });

    btnWrap.appendChild(dlBtn); btnWrap.appendChild(laterBtn);
    popup.appendChild(icoon); popup.appendChild(titel); popup.appendChild(tekst); popup.appendChild(btnWrap);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

/* Activeer reminder check telkens als admin-status gezet wordt */
(function() {
    var orig2 = toepassenAdminStatus;
    toepassenAdminStatus = function() { orig2(); controleerBackupReminder(); };
})();

/* Laad instellingen bij opstart (wordt aangeroepen voor t.render) */
laadInstellingen();
