# DMC Bodega

Sistema de control de inventario de **Comercializadora DMC S.P.A.**: stock por bodega, despachos por cotización aprobada, entradas (packing list y devoluciones), revisión de devoluciones, salida manual, reservas, stock crítico, kardex, toma de inventario, maestros y configuración.

Es la réplica en código del diseño **Sys Bodega DMC** (Claude Design), con datos **ficticios en memoria** por ahora. La capa de acceso a datos está aislada para conectarla a SQL Server sin tocar la interfaz.

> **Estado:** prototipo funcional completo (18 pantallas + login). No apto para producción hasta completar la sección [Pendiente para producción](#pendiente-para-producción).

---

## Contenido

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Usuarios demo y permisos](#usuarios-demo-y-permisos)
- [Pantallas](#pantallas)
- [Reglas de negocio](#reglas-de-negocio)
- [Arquitectura](#arquitectura)
- [Seguridad](#seguridad)
- [Diseño y accesibilidad](#diseño-y-accesibilidad)
- [Qué se corrigió respecto al prototipo](#qué-se-corrigió-respecto-al-prototipo)
- [Pasar a SQL Server](#pasar-a-sql-server)
- [Pendiente para producción](#pendiente-para-producción)
- [Control de versiones](#control-de-versiones)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`) |
| UI | React 19 · Tailwind CSS 4 (`@theme` tokens) · lucide-react |
| Lenguaje | TypeScript 5 (estricto) |
| Validación | Zod 4 |
| PDF | pdf-lib (comprobante de despacho) |
| Base de datos | `mssql` (pool listo en `src/server/db/mssql.ts`, **sin usar todavía**) |
| Tipografía | Archivo (vía `next/font`, sin peticiones externas) |

## Requisitos

- Node.js ≥ 20.9 (recomendado LTS actual)
- npm ≥ 10

## Inicio rápido

```bash
npm install
cp .env.example .env.local       # en PowerShell: Copy-Item .env.example .env.local
# edite .env.local y defina SESSION_SECRET (≥ 32 caracteres), ver abajo
npm run dev                       # http://localhost:3000
```

Genere un secreto de sesión:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Compilación de producción local:

```bash
npm run build
npm run start                     # exige SESSION_SECRET y DEMO_PASSWORD
```

## Variables de entorno

Se leen de `.env.local` (nunca se versiona; ver [Control de versiones](#control-de-versiones)). La plantilla es `.env.example`.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `SESSION_SECRET` | Sí | Clave HMAC para firmar la cookie de sesión (≥ 32 caracteres). |
| `DEMO_PASSWORD` | Solo en producción | Contraseña de los usuarios demo. Si falta en desarrollo se usa `dmc2026`; en producción la app **se niega a iniciar sesión** sin ella. |
| `NEXT_PUBLIC_SHOW_DEMO_USERS` | No | `1` muestra accesos rápidos de usuarios demo en el login (solo desarrollo). |
| `MSSQL_SERVER` · `MSSQL_DATABASE` · `MSSQL_USER` · `MSSQL_PASSWORD` | Futuro | Conexión a SQL Server cuando se reemplacen los datos ficticios. |
| `MSSQL_ENCRYPT` · `MSSQL_TRUST_SERVER_CERT` | Futuro | Cifrado de la conexión (`true` / `false` por defecto seguro). |

> Variables `NEXT_PUBLIC_*` quedan expuestas al navegador. **Nunca** ponga secretos en ellas.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con Turbopack. |
| `npm run build` | Compila para producción (también verifica tipos). |
| `npm run start` | Sirve la compilación de producción. |
| `npm run typecheck` | `tsc --noEmit`. |

## Usuarios demo y permisos

Contraseña: `dmc2026` si no define `DEMO_PASSWORD`.

| Usuario | Rol | Puede |
| --- | --- | --- |
| `avidal` | Admin | Todo: maestros, configuración, aprobar conteos, cerrar cotizaciones con saldo |
| `lperez` | Bodeguero | Operar: despachar, ingresar, devoluciones, revisión, salidas manuales, contar |
| `gcoloma` | Ventas | Solo lectura |

Matriz de permisos (`src/lib/rbac.ts`), aplicada **en el servidor**:

| Permiso | Admin | Bodeguero | Ventas |
| --- | :-: | :-: | :-: |
| `operar` (despachos, entradas, revisión, salida manual, conteos sin aprobar) | ✅ | ✅ | — |
| `aprobar` (aprobar/aplicar conteos, cerrar cotizaciones con saldo) | ✅ | — | — |
| `maestros` (productos, familias, subfamilias, bodegas, fotos) | ✅ | — | — |
| `config` (alertas, plantilla de correo, parámetros) | ✅ | — | — |

## Pantallas

| Grupo | Ruta | Descripción |
| --- | --- | --- |
| — | `/login` | Inicio de sesión. |
| Operación | `/` | Dashboard: indicadores, actividad, alertas. |
| | `/despacho` | Buscar cotización y despachar. |
| | `/cotizaciones` | Cotizaciones aprobadas (filtros, exportación CSV). |
| | `/despachar/[id]` | Despacho de una cotización: **modal interceptado** al abrirlo desde las listas; página completa si se entra directo o se recarga. |
| | `/parciales` | Despachos parciales y cierre de saldo (Admin). |
| | `/entradas` | Ingreso por packing list (CSV) y devoluciones. |
| | `/revision` | Revisión de devoluciones (reingresar / dañado). |
| | `/salida-manual` | Salidas fuera de cotización, con motivo. |
| Control | `/inventario` | Stock por producto y bodega, con semáforo. |
| | `/reservas` | Stock reservado por cotizaciones abiertas. |
| | `/stock-critico` | Productos bajo el mínimo. |
| | `/movimientos` | Kardex con filtros y exportación. |
| | `/toma-inventario` · `/toma-inventario/[id]` | Conteos físicos, diferencias, aprobación. |
| Maestros | `/productos` · `/productos/nuevo` · `/productos/[cod]` · `/productos/[cod]/editar` | Catálogo y ficha de producto (foto, medidas, peso). |
| | `/maestros/[kind]` | Familias, subfamilias y bodegas. |
| Sistema | `/configuracion` | Alertas, correo, parámetros. |

Rutas de API (todas exigen sesión y permiso):

| Ruta | Método | Descripción |
| --- | --- | --- |
| `/api/export/[kind]` | GET | Exportación CSV con los mismos filtros de la pantalla. |
| `/api/despachos/[id]/pdf` | GET | Comprobante de despacho en PDF (pdf-lib). |
| `/api/productos/[cod]/foto` | GET · POST · DELETE | Foto del producto (POST/DELETE solo Admin). |

## Reglas de negocio

- **Stock nunca negativo.** Se valida en el servidor; el esquema SQL lo refuerza con `CHECK`.
- **Despacho todo-o-nada por línea:** si una línea supera el stock, no se despacha nada. Exige al menos un documento (guía, OC o HEP).
- **Cotizaciones abiertas con fecha vencida** pasan a *Vencida*: no son despachables ni reservan stock.
- **Cerrar una cotización con saldo** solo lo puede hacer Admin.
- **Conteos:** cualquiera con `operar` cuenta; solo Admin aprueba y aplica el ajuste. Números de conteo/devolución/despacho sin colisiones.
- **Devoluciones:** las filas con error se rechazan (no se descartan en silencio).
- **Salida manual:** dos filas del mismo producto y bodega no pueden superar juntas el stock disponible.
- **Productos:** se desactivan, no se borran (conserva el historial).
- **Kardex:** cada cambio de stock deja un movimiento con saldo; el usuario sale de la **sesión**, nunca del cliente.
- **Semáforo de stock:** siempre con ícono + texto, no solo color.
- Fechas en ISO y zona horaria `America/Santiago`. Los datos ficticios desplazan las fechas del prototipo (base 23/09/2026) para que "hoy" sea hoy.

## Arquitectura

```
src/
  proxy.ts               CSP con nonce por petición + filtro de acceso (sin sesión → /login)
  app/
    layout.tsx           raíz (dinámica: `await connection()` para que el nonce aplique)
    login/               pantalla de acceso
    (app)/               pantallas autenticadas
      layout.tsx         contadores, índice de búsqueda y slot `@modal`
      @modal/            rutas paralelas + interceptadas (despacho como modal)
      …/page.tsx         una carpeta por pantalla
    api/                 exportación CSV, PDF, fotos
  actions/               acciones de servidor: sesión → permiso → Zod → lógica → revalidar
    run.ts               wrapper `run(permiso, schema, input, fn)`
  server/
    inventory.ts         reglas de negocio + acceso a datos  ← único archivo a reescribir para SQL
    store.ts             datos ficticios (singleton en globalThis)
    queries.ts           lecturas/filtros compartidos por páginas y exportaciones
    auth.ts              sesión, scrypt, límite de intentos
    db/mssql.ts          pool de SQL Server (listo, sin usar)
  lib/                   dominio puro: tipos, esquemas Zod, RBAC, CSV, formato, navegación
  components/            UI compartida (Dialog accesible, FilterBar por URL, AppShell…)
db/schema.sql            esquema SQL Server propuesto
```

Decisiones clave:

- **Filtros en la URL** (`FilterBar`): enlaces compartibles, y las mismas funciones de consulta alimentan pantallas y CSV.
- **Un solo punto de datos:** páginas y acciones solo hablan con `server/inventory.ts` y `server/queries.ts`.
- **Modal con ruta propia:** `/despachar/[id]` se abre como modal sobre la lista (ruta interceptada) y es una página completa si se entra directo o se recarga.
- **Tokens de diseño** en Tailwind 4 (`@theme`): paleta neutral n100–n900, acento `#ec3013`, radio 0, reglas de 2 px.

## Seguridad

- **Autenticación:** contraseñas con `scrypt` + sal por usuario, comparación en tiempo constante (también si el usuario no existe), mensaje de error genérico.
- **Sesión:** cookie firmada con HMAC, `HttpOnly`, `SameSite=Lax`, `Secure` y prefijo `__Host-` en producción, TTL 8 h. El rol se relee del almacén en cada petición. Al cerrar sesión se borra con los mismos atributos.
- **Límite de intentos:** 5 fallos por IP+usuario y 20 por IP en 15 minutos (en memoria; ver pendientes).
- **Autorización en servidor:** páginas, acciones y rutas de API. Ocultar un botón nunca es el control.
- **Entrada:** todo pasa por Zod 4; cantidades enteras, longitudes máximas, documentos obligatorios.
- **Cabeceras:** CSP con nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`), `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`, `COOP`. `Cache-Control: private, no-store`.
- **CSV:** generado en servidor con protección contra inyección de fórmulas de Excel.
- **Subida de imágenes:** valida la firma real (PNG/JPEG), máx. 2 MB, mismo origen, solo Admin; se sirven con CSP restrictivo.
- **Errores:** los internos no se muestran al usuario.
- **Dependencias:** se evitó una librería de Excel con vulnerabilidades conocidas (packing list en CSV).

Para reportar una vulnerabilidad, avise al responsable del proyecto en privado; no abra un issue público.

## Diseño y accesibilidad

- Sistema **Modernist**: Archivo, radio 0, un solo rojo de acento, reglas de 2 px.
- Responsive: menú lateral en cajón en móvil, tablas con scroll horizontal.
- Contraste AA (botón primario y texto secundario), foco visible, zonas táctiles ≥ 40/44 px, `prefers-reduced-motion`.
- Diálogos con foco atrapado, `Escape`, `aria-modal` y bloqueo de scroll. Enlace "saltar al contenido".

## Qué se corrigió respecto al prototipo

**Seguridad**
- Login real en lugar de una contraseña fija; se eliminó el selector "Ver como" (cualquiera podía asumir Admin).
- Permisos en servidor, validación Zod, usuario del kardex desde la sesión, CSP, cabeceras, CSV seguro, subida de imágenes validada.

**Funcionalidad**
- Cotizaciones vencidas automáticas y sin reserva; cierre con saldo solo Admin; conteos con aprobación solo Admin.
- Packing list lee CSV real y valida fila por fila; el `.xlsx` se rechaza con un mensaje claro.
- Devoluciones sin descartes silenciosos; salida manual con control de duplicados; comprobante PDF; filtros en la URL.

**Diseño**
- Responsive (el prototipo exigía 1280 px), contraste, foco, objetivos táctiles, movimiento reducido.

## Pasar a SQL Server

1. Cree la base con `db/schema.sql` (tablas, `CHECK` de stock no negativo, índice del kardex).
2. Defina las variables `MSSQL_*` y use el pool de `src/server/db/mssql.ts`.
3. Reimplemente `src/server/inventory.ts` y `src/server/queries.ts` con **consultas parametrizadas**, **transacciones** y bloqueo de fila (`UPDLOCK, ROWLOCK`) al mover stock. Es el único acoplamiento a los datos: la UI y las acciones no cambian.
4. Mueva usuarios a la tabla `Usuario` (`PasswordHash` + `Salt` ya previstos).

## Pendiente para producción

1. Reimplementar `src/server/inventory.ts` contra SQL Server (ver arriba).
2. Usuarios y contraseñas en base de datos (hoy son demo) y, si corresponde, SSO.
3. Servidor de correo para las alertas (hoy el "correo de prueba" es simulado).
4. Límite de intentos en un almacén compartido (Redis/SQL) si hay más de una instancia.
5. Series del Dashboard y de la ficha (hoy de demostración) como `GROUP BY` sobre `Movimiento`.
6. Almacenamiento persistente de fotos de producto (hoy en memoria).
7. Registro de auditoría persistente y respaldos.
8. Revisión de seguridad formal y pruebas automatizadas (no hay suite de tests todavía).

## Control de versiones

El repositorio versiona solo código y configuración reproducible. `.gitignore` excluye:

- **Secretos y entorno:** `.env`, `.env.*` (se conserva `.env.example`), claves y certificados.
- **Dependencias y build:** `node_modules/`, `.next/`, `out/`, `next-env.d.ts`, `*.tsbuildinfo`.
- **Cachés y logs:** `.cache/`, `*.log`, cobertura, volcados.
- **Herramientas locales:** `.impeccable/`, `.claude/settings.local.json`.
- **Datos locales:** `uploads/`, respaldos y bases de datos (`*.bak`, `*.mdf`, `*.sqlite`…).
- **Editor y sistema operativo:** `.idea/`, `.vscode/` (salvo configuración compartida), `.DS_Store`, `Thumbs.db`.

`.gitattributes` normaliza los saltos de línea a LF (sin avisos LF/CRLF en Windows). `package-lock.json` **sí** se versiona.

Primer commit:

```bash
git init -b main
git add .
git status          # revise: no debe aparecer .env ni node_modules
git commit -m "feat: réplica de Sys Bodega DMC con datos ficticios"
```

> Si alguna vez se subió un secreto por error, **rótelo** (cambie `SESSION_SECRET`/credenciales): borrarlo del último commit no lo elimina del historial.

## Limitaciones conocidas

- Los datos viven en memoria y se reinician al reiniciar el servidor.
- Las bodegas están fijas a las tres del dato ficticio; no se pueden crear nuevas hasta conectar SQL Server.
- No se verificó visualmente el ancho móvil real; el responsive está implementado pero sin prueba en dispositivo.
- Los avisos del hook de diseño sobre el borde de acento del panel lateral (`Dialog`, variante `right`) se mantienen por fidelidad al original.
