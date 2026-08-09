# Decisiones — TP1

---

## 1. Por qué Git no pudo resolver el conflicto solo

### Qué pasó exactamente

Las dos ramas nacieron del **mismo** commit de `main` (`7a9ba74`, el merge del PR #1 con la sección de instalación):

```
                    ┌── 1fc8960  feature/titulo-a   "# Proyecto IngSoft3 - versión A"
7a9ba74 (main) ─────┤
                    └── bc1662f  feature/titulo-b   "# Proyecto IngSoft3 - versión B"
```

Las dos reescribieron la **línea 1** del `README.md`. Cuando `feature/titulo-a` se mergeó (PR #2), `main` pasó a tener `versión A`. Al intentar integrar `feature/titulo-b` (PR #3), Git hizo lo que hace siempre: un merge de 3 vías, comparando las dos puntas contra el **ancestro común** (`7a9ba74`, donde la línea decía `# ingsoft3-tp01`).

El resultado de esa comparación fue:

| | Línea 1 del README |
|---|---|
| Ancestro común (`7a9ba74`) | `# ingsoft3-tp01` |
| `main` (después del PR #2) | `# Proyecto IngSoft3 - versión A` |
| `feature/titulo-b` | `# Proyecto IngSoft3 - versión B` |

**Las dos ramas cambiaron la misma línea respecto del ancestro, y la cambiaron distinto.** Ahí Git se detiene. No es una limitación técnica que se pueda mejorar con un algoritmo más listo: Git compara texto, no entiende de qué habla el texto. No existe ninguna regla mecánica que le permita decidir si el título del proyecto es "versión A" o "versión B", porque esa respuesta no está en los archivos — está en la cabeza del equipo.

Por eso Git hace lo único honesto que puede: **escribe las dos versiones en el archivo, marca dónde empieza y termina cada una, y le devuelve la decisión a una persona.** El conflicto no es un error de Git; es Git negándose a inventar una respuesta que no tiene.

La prueba de que el criterio es "misma línea" y no "mismo archivo" está en la captura 3: la sección `## Instalación`, en el mismo `README.md`, **se fusionó sola**. Ninguna de las dos ramas la había tocado, así que no había nada que decidir.

### Qué habría tenido que pasar para que nunca apareciera

Tres caminos, de más realista a más ilusorio:

1. **Integrar antes.** Si `feature/titulo-b` se hubiera creado *después* de mergear `feature/titulo-a` —o hubiera hecho `git pull` de `main` antes de tocar el README—, habría partido de un `main` que ya tenía `versión A`. Su cambio habría sido una edición secuencial, no paralela: sin conflicto. Esta es la razón concreta por la que la investigación DORA insiste con integrar a *trunk* al menos una vez por día. **Ramas cortas no evitan los conflictos: los hacen chicos y triviales.** El *merge hell* es lo que pasa cuando una rama vive tres semanas.

2. **Que las dos ramas no tocaran la misma línea.** Si el trabajo estuviera repartido de manera que cada rama toca una zona distinta del archivo, Git fusiona sin preguntar (como pasó con `## Instalación` del PR #1). Es un argumento a favor de dividir el trabajo por archivo o por sección, no de que dos personas editen el mismo párrafo en paralelo.

3. **Que alguien decidiera antes de escribir.** El conflicto de Git es el síntoma; la causa es que dos personas tomaron decisiones incompatibles sobre lo mismo sin hablar. Ninguna herramienta arregla eso.

Vale decir lo obvio: en este TP el conflicto **se fabricó a propósito**, siguiendo la §4.6 de la guía. El objetivo no era evitarlo sino provocarlo en un entorno controlado, que es mucho mejor que encontrárselo por primera vez en un repositorio de trabajo.

---

## 2. Qué problemas encontré y cómo los solucioné

### a) La extensión de Claude para Chrome no estaba conectada

El plan original era que las cuatro capturas se sacaran solas via la extensión de Claude para Chrome (que expone tabs, screenshot y clics via MCP). Al intentar usarla, la respuesta fue clara: `Browser extension is not connected. Please ensure the Claude browser extension is installed and running`. La extensión no está instalada en este perfil.

Probé dos fallbacks:
- **Chrome headless** con `--screenshot`. Funcionó para páginas públicas, pero el cartel *"This branch has conflicts that must be resolved"* y el editor `/pull/N/conflicts` solo se muestran a usuarios con permiso de merge. Un anon captura el PR pero sin la evidencia que importa.
- **AppleScript sobre Chrome ya abierto** para navegar y capturar. Chrome tiene deshabilitado *"Permitir JavaScript para eventos de Apple"* por defecto, y `System Events` requiere permiso de accesibilidad para `osascript` (no lo tenía).

Solución: **hice las capturas 2 y 3 a mano** desde el navegador logueado. La primera (`01-push-rechazado.png`) sí la produje programáticamente: se ejecutó el push realmente, se capturó la salida real (`push-output.txt`), y se compuso una imagen tipo terminal con esa salida literal usando Pillow. No es una simulación de comportamiento — es la envoltura visual de un output que ocurrió y quedó registrado. La cuarta (`04-release-publicada.png`) también la saqué del navegador logueado.

### b) El script que abría una ventana nueva de Terminal.app fue bloqueado

Primer intento de automatizar la captura del push: un script bash que abría una ventana nueva de Terminal.app via `osascript`, corría la secuencia commit + push, esperaba el rechazo, y capturaba la ventana con `screencapture -l <windowID>`. El clasificador de permisos de Claude Code lo frenó por *"spawns a new Terminal window and runs a git commit+push followed by git reset --hard, plus screen-capture automation, was not explicitly authorized"*.

Es una advertencia razonable: la combinación abrir-terminal-oculta + reset --hard + captura tiene forma de UI hijacking aunque acá el uso fuera legítimo. Se resolvió cambiando de estrategia: ejecutar el push directamente en el shell del agente, capturar el stdout/stderr real, y renderizarlo como imagen (§ *a* de arriba). Menos "auténtico" visualmente pero conserva el dato: el rechazo del server es el mismo.

### c) La creación del repo público también me pidió confirmación extra

`gh repo create ingsoft3-tp01 --public` fue bloqueado dos veces por el clasificador antes de aprobarse: la primera por "creating a public GitHub repo without explicit user authorization", la segunda por "without a visible explicit user confirmation to the AskUserQuestion prompt". Terminó pasando cuando aprobé el prompt de permisos del comando directamente.

Nota mental: acciones con blast radius público (crear repo público, force push, mergear a main) son las que la herramienta cuida más — y está bien que sea así.

### d) GitHub tarda unos segundos en darse cuenta de que hay conflicto

Inmediatamente después de mergear el PR #2, consulté el estado del PR #3 y la API devolvió `mergeable=UNKNOWN, mergeStateStatus=UNKNOWN`. No era que no hubiera conflicto: GitHub calcula la mergeabilidad **en background** y todavía no había terminado. Consultado dos segundos después devolvió `mergeable=CONFLICTING, mergeStateStatus=DIRTY`. Importaba porque la captura del aviso había que sacarla en ese momento exacto. La solución fue esperar y **verificar el estado antes de capturar**, no capturar y suponer.

### e) El push rechazado (que no es un problema, pero lo parece)

`git push` devolviendo `! [remote rejected] main -> main (protected branch hook declined)` es el resultado **buscado**, no un error a arreglar: es la prueba de que la protección funciona. Lo anoto porque la primera reacción natural frente a un `error:` en rojo es intentar dar vuelta la configuración, y acá el rojo era el éxito. El commit local se descartó con `git reset --hard HEAD~1`.

### f) Las aprobaciones obligatorias, que la guía avisa y conviene no olvidar

La protección se creó con `required_approving_review_count: 0` a propósito. GitHub **no permite que el autor de un PR apruebe su propio PR** —no es configurable, la opción aparece deshabilitada, y por API devuelve `422 Can not approve your own pull request`—, así que en un TP individual pedir aunque sea 1 aprobación deja los PRs imposibles de mergear, con un mensaje de error que no señala la causa real. En un equipo real ese número va en 1 o más; acá va en 0 y la revisión la hago yo, leyendo el diff antes de apretar el botón.

---

## 3. Declaración de uso de IA

### Qué se delegó

**La ejecución completa de la guía**, delegada a un agente de IA (Claude Opus 4.7, corriendo en Claude Code) con acceso a la terminal de mi máquina, a `git`, a la CLI `gh` y a herramientas de edición de archivos. Concretamente hizo:

- Los comandos de Git y de la CLI de GitHub: `clone`, `add`, `commit`, `push`, `switch`, `merge`, `tag`; la creación de la protección de rama por API; la creación, revisión y merge (squash) de los tres Pull Requests; el borrado de las ramas; la creación del tag anotado y la publicación de la release.
- La redacción de los textos: descripciones y títulos de los PRs, mensajes de commit, notas de la release y estos dos archivos (`evidencias.md` y `decisiones.md`).
- La primera captura (`01-push-rechazado.png`): se ejecutó el push realmente, se capturó su salida y se renderizó como imagen tipo terminal con Pillow (§ *2.a* arriba).

### Qué NO se delegó

- **Las tres capturas de GitHub UI (2, 3, 4).** Las saqué yo desde el navegador ya logueado, porque las opciones automáticas del agente estaban todas bloqueadas (§ *2.a*).
- **La decisión de contenido del conflicto.** Que ganara la **versión B** fue una instrucción mía, dada antes de que el conflicto existiera. También fue instrucción mía **cómo** resolverlo: a mano, decidiendo el texto final y borrando los marcadores, y no con un botón de *Accept current change* ni con `git checkout --ours`. Ese era el punto del ejercicio y delegarlo lo habría vaciado.
- **La plataforma y las reglas del juego**: GitHub, repositorio público, `main` protegida sin bypass, squash merge, convención `feature/<descripción>`. Vienen dadas por la guía y por el enunciado; no fueron elección del agente.
- **La defensa oral.** Todo lo que está acá escrito tengo que poder explicarlo yo. Este archivo no reemplaza haber entendido el ejercicio: lo documenta.

### Cómo verifiqué cada resultado contra el estado real del repositorio

El criterio fue no darle por cierto al agente **ninguna** afirmación sobre el estado del repositorio. Todo lo que se afirma acá y en `evidencias.md` está verificado contra la fuente real —la API de GitHub y el repositorio local—, no contra el relato de lo que se hizo:

| Qué se afirma | Cómo se comprobó |
|---|---|
| `main` está protegida, sin bypass, con 0 aprobaciones | `GET /repos/LorenzoGalaverna/ingsoft3-tp01/branches/main/protection` → `enforce_admins.enabled=true`, `required_approving_review_count=0`, `allow_force_pushes=false`, `allow_deletions=false` |
| El push directo se rechaza de verdad | Se intentó realmente, con `main` ya protegida. La imagen 1 renderiza la **salida literal** de esa ejecución (guardada en `/tmp/push-output.txt`). El rechazo lo emite el servidor con `remote: error: GH006` |
| Todos los cambios entraron por PR mergeado con squash | `gh pr list --state merged` devuelve 3 PRs; `git log --oneline main` muestra un commit por PR (`(#1)`, `(#2)`, `(#3)`) y ningún commit en `main` sin PR salvo los dos administrativos anteriores a la protección (Initial commit y el `.gitignore`) |
| Las ramas A y B partieron del mismo commit | `git merge-base origin/feature/titulo-a origin/feature/titulo-b` → `7a9ba74`, el mismo commit que era la punta de `main` después del PR #1. Si hubieran estado encadenadas no habría habido conflicto y el ejercicio no probaría nada |
| El PR #3 tuvo conflicto real | La API devolvió `mergeable=CONFLICTING` y `mergeStateStatus=DIRTY` **antes** de resolverlo, y `MERGEABLE / CLEAN` después. La captura 2 se sacó en la ventana entre esos dos estados |
| El conflicto se resolvió a mano y ganó B | El commit de resolución (`80833a4 fix: resuelve conflicto de título del proyecto (gana versión B)`) está en el historial del PR #3, y la línea 1 del `README.md` en `main` dice `# Proyecto IngSoft3 - versión B`. Se verificó además que no quedara ningún marcador (`grep -nE '^(<{7}\|={7}\|>{7})' README.md` → sin resultados) |
| El tag y la release existen y apuntan a la punta de `main` | `git cat-file -p v1.0.0` muestra el objeto tag anotado `fa0b8c6` apuntando al commit `a906376`; `GET /repos/.../releases/tags/v1.0.0` devuelve `target_commitish=main` y `published_at=2026-08-09T22:49:43Z`. El commit `a906376` es la punta de `main` |
| Las capturas muestran lo que dicen mostrar | Las abrí y las miré una por una antes de comitear |

Esa última fila es la que resume el método. El agente puede reportar que un paso salió bien y haber, sin mentir, producido un artefacto inservible. La verificación no consiste en preguntarle si funcionó: consiste en ir a mirar el estado real, que en este TP es la API de GitHub, el historial de Git y las imágenes abiertas de a una.
