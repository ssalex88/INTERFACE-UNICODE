# 🦦 NUTRIA

## Nombre y misión

**NUTRIA** es una plataforma web de bienestar preventivo que ayuda a estudiantes universitarios a tomar mejores decisiones de alimentación cuando tienen poco tiempo, presupuesto limitado y alta carga académica.

---

## Problema y enfoque Lean

Durante semanas de parciales, entregas y exámenes, muchos estudiantes universitarios se saltan comidas, comen tarde o terminan comprando lo primero que encuentran.

Esto ocurre principalmente por:

- poco tiempo disponible;
- presupuesto limitado;
- alta carga académica;
- desconocimiento de opciones reales alrededor del campus;
- restricciones o preferencias alimentarias.

NUTRIA busca reducir esa fricción combinando:

```text
Contexto del estudiante
        +
Presupuesto
        +
Tiempo disponible
        +
Perfil alimentario declarado
        +
Opciones reales de comida
        ↓
Recomendación contextual
```

### Usuario objetivo

El piloto inicial está dirigido a estudiantes de la **Universidad de Lima**.

### MVP

El MVP demuestra el siguiente escenario:

> “Dormí 4 horas, no almorcé, tengo parcial en 40 minutos y me quedan S/12.”

NUTRIA:

1. interpreta el contexto;
2. identifica presupuesto y tiempo disponible;
3. consulta el perfil alimentario declarado;
4. revisa opciones disponibles alrededor del campus;
5. descarta o advierte opciones incompatibles;
6. genera un ranking;
7. explica por qué recomienda cada alternativa.

NUTRIA **no diagnostica enfermedades ni interpreta tratamientos médicos**.

---

## Stack tecnológico e IA

### Frontend

- HTML5
- CSS3
- JavaScript
- ES Modules

### Persistencia

- `localStorage`
- Arquitectura local-first
- Sin necesidad de cuenta para el flujo principal

### Datos

- Dataset estructurado en JSON
- Opciones de comida alrededor de la Universidad de Lima
- Precio
- tiempo estimado;
- características alimentarias;
- origen de la información.

### Motor NUTRIA

El MVP utiliza módulos propios para:

- análisis del contexto;
- compatibilidad alimentaria;
- detección de patrones;
- ranking contextual;
- generación de recomendaciones explicables.

### Inteligencia Artificial

El núcleo del MVP utiliza un **parser determinístico basado en reglas, palabras clave y expresiones regulares**.

No depende de un modelo generativo externo para completar el flujo principal.

Esto permite obtener resultados:

- reproducibles;
- rápidos;
- explicables;
- estables durante la demostración.

La arquitectura permite integrar posteriormente modelos de lenguaje para mejorar la interpretación del contexto.

---

## Arquitectura

Usuario
   ↓
Interfaz Web
   ↓
Parser de contexto
   ↓
Registro local
   ↓
Perfil alimentario + Dataset ULima
   ↓
Motor de compatibilidad
   ↓
Motor de recomendación
   ↓
Ranking contextual
   ↓
Recomendación explicable

La arquitectura completa se encuentra en:

companion-base/docs/ARQUITECTURA.md

---

## Estructura del proyecto

companion-base/
│
├── css/
│   └── estilos.css
│
├── data/
│   └── menus-semilla.json
│
├── docs/
│   ├── ARQUITECTURA.md
│   ├── DATASET.md
│   └── DEMO.md
│
├── js/
│   ├── app.js
│   │
│   ├── capa2/
│   │   └── modelo.js
│   │
│   ├── datos/
│   │   ├── almacen.js
│   │   ├── demo.js
│   │   └── menus.js
│   │
│   ├── motor/
│   │   ├── compatibilidad.js
│   │   ├── insignias.js
│   │   ├── metas.js
│   │   ├── patrones.js
│   │   ├── recomendador.js
│   │   └── reporte.js
│   │
│   ├── parser/
│   │   ├── analizador.js
│   │   └── gazetteer.js
│   │
│   └── ui/
│       ├── comunidad.js
│       ├── iconos.js
│       ├── mascota.js
│       ├── movimiento.js
│       ├── sesion.js
│       └── vistas.js
│
└── tests/

---

## Setup local

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd UNICODE-HACKATHON
```

### 2. Entrar a la aplicación

```bash
cd companion-base
```

### 3. Iniciar servidor local

Con Python:

```bash
python -m http.server 5180
```

En algunos sistemas:

```bash
python3 -m http.server 5180
```

### 4. Abrir la aplicación

```text
http://localhost:5180
```

El MVP actual no requiere instalar dependencias adicionales.

---

## Integrantes y roles

| Integrante | GitHub | Rol |
|---|---|---|
| [Abigail] | @[abislytering20-sys] | Frontend y experiencia de usuario |
| [Maria] | @[20248108-arch] | Dataset y recomendaciones |
| [Alexander]| @[ssalex88] | Parser y lógica del sistema |
| [Williams] | @[Killiams] | Integración, QA y documentación |

---

## Estado del MVP

- ✅ Código base
- ✅ Registro contextual
- ✅ Persistencia local
- ✅ Parser contextual
- ✅ Motor de patrones
- ✅ Perfil alimentario
- 🚧 Dataset ULima
- 🚧 Compatibilidad alimentaria
- 🚧 Ranking contextual
- 🚧 Integración final del flujo

---

## Principio del producto

> **NUTRIA no adivina tu salud. Entiende tu contexto y cruza lo que declaraste voluntariamente con información útil de tu campus.**
