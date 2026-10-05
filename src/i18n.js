// =================================================================
// i18n.js — El idioma de la app (español / inglés)
//
// La visión está en docs/IDIOMA.md. Aquí va lo mínimo que la hace andar:
//
//   · LA LLAVE ES LA FRASE EN ESPAÑOL. El español sigue escrito donde siempre
//     (HTML y JS), y el diccionario EN dice cómo se dice en inglés. Si falta
//     una traducción, sale el español: nunca un hueco en blanco.
//   · Los diccionarios viven en src/i18n/en-*.js, uno por módulo, y cada uno
//     hace Object.assign(EN, {...}).
//   · En JS: t('Te falta ahorrar:') o, con huecos, t('Le faltan {n} días', { n }).
//   · En el HTML no hay que marcar nada: traducirDOM() recorre los textos y los
//     atributos (title, placeholder, alt, aria-label) al abrir. Un párrafo con
//     negritas adentro se marca con data-i18n-html y se cambia entero.
//   · El idioma se guarda en localStorage (se lee sin esperar, antes de pintar)
//     y cambiarlo recarga la ventana: todo se vuelve a pintar ya en el otro.
//
// Va ANTES que todos los demás scripts de popup.html.
// =================================================================

const EN = {};

const IDIOMA = (function () {
  try { return localStorage.getItem('idioma') === 'en' ? 'en' : 'es'; }
  catch (e) { return 'es'; }
})();

// Para fechas. El dinero NO: ese lo formatea la moneda (MONEDAS, src/app.js).
const LOCALE_FECHAS = IDIOMA === 'en' ? 'en-US' : 'es-CO';

// Una misma palabra con dos sentidos en inglés lleva contexto tras la barra:
// t('Abono|préstamo'). En español la barra y el contexto no se ven.
function t(es, vars) {
  let txt = (IDIOMA === 'en' && EN[es]) || es.split('|')[0];
  if (vars) txt = txt.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return txt;
}

// data/refranes.json -> data/refranes.en.json cuando la app está en inglés.
function rutaDatos(ruta) {
  return IDIOMA === 'en' ? ruta.replace(/\.json$/, '.en.json') : ruta;
}

// El menú del clic derecho (src/background.js) no ve el localStorage del
// popup: por eso el idioma también se copia en chrome.storage.sync.
function avisarIdioma(cual) {
  try { chrome.storage.sync.set({ idioma: cual }); } catch (e) { /* sin almacén */ }
}

function cambiarIdioma(nuevo) {
  try { localStorage.setItem('idioma', nuevo); } catch (e) { /* sin almacén */ }
  avisarIdioma(nuevo);
  location.reload();
}

const I18N_ATRIBUTOS = ['title', 'placeholder', 'alt', 'aria-label'];

function traducirDOM(raiz) {
  if (IDIOMA !== 'en') return;
  raiz = raiz || document.body;

  raiz.querySelectorAll('[data-i18n-html]').forEach(el => {
    const llave = el.innerHTML.replace(/\s+/g, ' ').trim();
    if (EN[llave]) el.innerHTML = EN[llave];
  });

  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentNode && /^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  for (let n = caminante.nextNode(); n; n = caminante.nextNode()) {
    const crudo = n.nodeValue;
    const llave = crudo.replace(/\s+/g, ' ').trim();
    if (!llave || !EN[llave]) continue;
    const antes = crudo.match(/^\s*/)[0];
    const despues = crudo.match(/\s*$/)[0];
    n.nodeValue = antes + EN[llave] + despues;
  }

  raiz.querySelectorAll('*').forEach(el => {
    I18N_ATRIBUTOS.forEach(a => {
      const v = el.getAttribute(a);
      if (!v) return;
      const llave = v.replace(/\s+/g, ' ').trim();
      if (EN[llave]) el.setAttribute(a, EN[llave]);
    });
  });
}

// Corre primero que los DOMContentLoaded de los demás (este script va antes),
// así solo toca el HTML fijo y nunca lo que escribió la persona.
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = IDIOMA;
  avisarIdioma(IDIOMA);
  traducirDOM(document.body);

  const btn = document.getElementById('btn-idioma');
  if (btn) {
    btn.textContent = IDIOMA === 'en' ? 'ES' : 'EN';
    btn.title = IDIOMA === 'en' ? 'Cambiar a español' : 'Switch to English';
    btn.addEventListener('click', () => cambiarIdioma(IDIOMA === 'en' ? 'es' : 'en'));
  }
});
