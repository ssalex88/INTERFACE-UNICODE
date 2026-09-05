# Dataset Gastronómico - Universidad de Lima

## Descripción

Dataset estructurado de opciones gastronómicas para estudiantes de la Universidad de Lima, incluyendo restaurantes, cafeterías y establecimientos de comida dentro del campus y en el perímetro cercano (Óval Monitor, Av. Javier Prado Este y alrededores).

## Metodología

### Punto Central de Referencia

- **Nombre**: Universidad de Lima - Campus Center Point
- **Coordenadas**: -12.0775, -76.9886
- **Dirección**: Av. Javier Prado Este 4600, Santiago de Surco 15023, Lima, Perú
- **Definición**: Punto central aproximado del campus principal de la Universidad de Lima, ubicado en la intersección de Av. Javier Prado Este y Av. Primavera. Este punto representa el centro geográfico del campus y se usa como origen para todas las mediciones de distancia caminando.
- **Fuente**: https://www.ulima.edu.pe/
- **Verificado**: 2026-09-05

### Metodología de Distancias

Las distancias se calcularon utilizando:

1. **Google Maps** como fuente principal para rutas peatonales reales
2. **OpenStreetMap** como fuente secundaria
3. **Estimaciones basadas en velocidad peatonal** (4.5-5 km/h) cuando no había datos directos

**Reglas aplicadas**:
- No se usa distancia en línea recta como distancia principal
- Para establecimientos dentro del campus, se marca `on_campus = true` y se registra distancia aproximada desde el punto central
- Los tiempos de caminata se redondean al minuto más cercano
- Se usa `distance_confidence` para indicar nivel de certeza: high, medium, low

### Fuentes Principales

1. **Menús oficiales de restaurantes**: Bembos, Chinawok, Starbucks, Sushi Pop
2. **Plataformas de delivery**: Rappi, PedidosYa
3. **Sitio web oficial de ULima**: Para establecimientos dentro del campus
4. **Google Maps**: Para ubicaciones, coordenadas y rutas peatonales
5. **Exynia**: Base de datos de menús y precios de cadenas en Perú

### Fecha de Consulta

- **Primera consulta**: 2026-09-05
- **Verificación de precios**: Agosto-Septiembre 2026
- **Estado actual**: open para todos los establecimientos listados

## Limitaciones

1. **Precios**: Los precios pueden variar entre locales y canales (web oficial vs. apps de delivery)
2. **Ubicaciones específicas dentro del campus**: Algunos establecimientos tienen múltiples ubicaciones dentro de ULima
3. **Horarios**: Los horarios pueden cambiar en d ías festivos o periodos vacacionales
4. **Disponibilidad**: Algunos platos pueden no estar disponibles temporalmente
5. **Cobertura**: Este dataset prioriza establecimientos verificados; puede haber opciones no incluidas por falta de evidencia suficiente

## Reglas de Calidad

- **No alucinación**: Es preferible dejar un campo en `null` que inventar un dato
- **Verificación**: Cada precio debe tener fuente documentada
- **Trazabilidad**: Cada registro incluye `verified_at` y `source_url`
- **Consistencia**: IDs estables en formato `REST-XXXX`, `DISH-XXXXXX`, `LOC-XXXX`
- **Formato**: snake_case, tipos de datos consistentes, booleanos reales (`true/false`)

## Interpretación de Valores

### `null`

Indica que el dato no está disponible o no pudo ser verificado. No usar textos como "N/A", "No disponible", "desconocido".

### Niveles de Confianza

- **`verified`**: Dato verificado en fuente oficial o múltiples fuentes
- **`estimated`**: Dato estimado basado en reglas o promedios
- **`inferred`**: Dato inferido lógicamente pero no verificado directamente
- **`unknown`**: Dato desconocido, sin evidencia suficiente

### `distance_confidence` y `data_confidence`

- **`high`**: Múltiples fuentes coincidentes o fuente oficial directa
- **`medium`**: Una fuente confiable o estimación razonable
- **`low`**: Fuente única no oficial o estimación con incertidumbre

## Estructura de Archivos

### restaurants.csv / restaurants (hoja Excel)

Información de establecimientos gastronómicos.

**Columnas principales**:
- `restaurant_id`: Identificador único (ej. `REST-0001`)
- `name`: Nombre comercial
- `legal_name`: Nombre legal de la empresa
- `category`: Categoría principal (cafeteria, fast_food, sushi, casual_dining, peruvian, italian, healthy)
- `subcategory`: Subcategoría específica
- `on_campus`: Booleano - ¿está dentro del campus de ULima?
- `location_reference`: Referencia de ubicación
- `address`: Dirección completa
- `district`: Distrito
- `latitude`, `longitude`: Coordenadas
- `phone`: Teléfono
- `website`: Sitio web oficial
- `google_maps_url`: URL de Google Maps
- `instagram_url`: Usuario de Instagram
- `opening_hours`: Horarios de atención
- `current_status`: open, closed, temporalmente_closed
- `distance_m_walk`: Distancia caminando en metros
- `walking_time_min`: Tiempo caminando en minutos
- `distance_bucket`: on_campus, 0_5_min, 5_10_min, 10_15_min, 15_20_min, 20_plus_min
- `walking_distance_source`: google_maps, estimated, inferred, unknown
- `walking_route_url`: URL de ruta peatonal
- `distance_confidence`: high, medium, low
- `data_confidence`: high, medium, low
- `verified_at`: Fecha de verificación (YYYY-MM-DD)
- `source_1_url`, `source_2_url`: Fuentes consultadas
- `notes`: Notas adicionales

### dishes.csv / dishes (hoja Excel)

Información de platos y productos a nivel individual.

**Columnas principales**:
- `dish_id`: Identificador único (ej. `DISH-000001`)
- `restaurant_id`: Referencia al restaurante
- `name`: Nombre del plato
- `description`: Descripción
- `category`: Categoría (hamburguesa, pollo, menu_economico, snack, postre, cafe, bebida, desayuno, sandwich, chifa, sushi, etc.)
- `subcategory`: Subcategoría
- `price_pen`: Precio en soles peruanos
- `delivery_price_pen`: Precio de delivery (si difiere)
- `portion`: Tamaño/porción
- `protein`: Proteína principal
- `ingredients`: Ingredientes principales
- `includes_drink`: Booleano - ¿incluye bebida?
- `includes_side`: Booleano - ¿incluye acompaíamiento?
- `includes_dessert`: Booleano - ¿incluye postre?
- `vegetarian`: Booleano o null
- `vegan`: Booleano o null
- `gluten_free`: Booleano o null
- `calories`: Calorías (solo si hay fuente)
- `protein_g`, `carbs_g`, `fat_g`: Macros (solo si hay fuente)
- `availability`: available, unavailable, seasonal
- `price_confidence`: high, medium, low
- `data_confidence`: high, medium, low
- `verified_at`: Fecha de verificación
- `source_url`: Fuente del precio
- `notes`: Notas adicionales

### restaurant_tags.csv / restaurant_tags (hoja Excel)

Etiquetas para restaurantes (bueno para grupos, económico, saludable, etc.).

**Columnas**:
- `restaurant_id`: Referencia al restaurante
- `tag`: Etiqueta descriptiva

### dish_tags.csv / dish_tags (hoja Excel)

Etiquetas para platos (económico, alto_en_proteina, vegetariano, etc.).

**Columnas**:
- `dish_id`: Referencia al plato
- `tag`: Etiqueta descriptiva

### sources.csv / sources (hoja Excel)

Registro de fuentes consultadas para trazabilidad.

**Columnas**:
- `source_id`: Identificador único
- `entity_type`: restaurant, dish, location
- `entity_id`: ID de la entidad
- `source_type`: official_website, official_menu, official_social, google_maps, openstreetmap, delivery_platform, user_generated, other
- `url`: URL de la fuente
- `publisher`: Nombre del publisher
- `title`: Título o descripción
- `accessed_at`: Fecha de acceso
- `notes`: Notas

### campus_reference.csv / campus_reference (hoja Excel)

Punto central de referencia del campus.

**Columnas**:
- `reference_id`: Identificador único
- `name`: Nombre del punto de referencia
- `latitude`: Latitud
- `longitude`: Longitud
- `address`: Dirección
- `reference_definition`: Definición del punto
- `source_url`: Fuente
- `verified_at`: Fecha de verificación

### data_dictionary.csv / data_dictionary (hoja Excel)

Diccionario de datos con descripción de cada campo.

**Columnas**:
- `field_name`: Nombre del campo
- `table`: Tabla a la que pertenece
- `description`: Descripción del campo
- `data_type`: Tipo de dato (string, float, boolean, date)
- `allowed_values`: Valores permitidos
- `required`: ¿Es obligatorio? (true/false)
- `example`: Ejemplo de valor

## Resumen Estadístico

### Restaurantes/Establecimientos

- **Total**: 20 establecimientos
- **Dentro de ULima**: 18 establecimientos
- **Fuera de ULima**: 2 establecimientos (Sushi Pop, Refugio Gastronómico)

### Platos

- **Total**: 65 platos registrados
- **Por rango de precio**:
  - ≤ S/ 10: 8 platos
  - S/ 10-15: 15 platos
  - S/ 15-20: 22 platos
  - S/ 20-30: 15 platos
  - > S/ 30: 5 platos

### Distancias

- **on_campus**: 18 establecimientos
- **0-5 min**: 1 establecimiento
- **5-10 min**: 1 establecimiento
- **10-15 min**: 0 establecimientos
- **15-20 min**: 0 establecimientos
- **20+ min**: 0 establecimientos

## Datos Estimados

Los siguientes campos tienen datos estimados (no verificados directamente):

- Coordenadas de algunos establecimientos fuera del campus
- Tiempos de caminata para establecimientos dentro del campus (estimados basados en distancia)
- Algunos horarios de establecimientos dentro del campus

## Establecimientos del Documento Inicial No Verificados Completamente

Los siguientes establecimientos mencionados en el documento "Distancia de restaurantes.docx.pdf" no pudieron ser verificados completamente o no tienen evidencia suficiente de existencia actual:

- Walter de los Twister
- Gilligan
- Salvavidas
- Mounstro
- La Cabaíita
- Yopo
- Panyp
- Hermes Café
- Secretos Árabes
- Macatur
- Panaca
- Marianne 02 (verificado parcialmente)
- Alessar F2 (verificado parcialmente)
- Cayetana (verificado parcialmente)
- Jacinta y Cornelia (verificado parcialmente)

**Nota**: Estos establecimientos aparecen en el documento inicial pero no hay evidencia web reciente suficiente para confirmar su existencia, ubicación exacta o estado actual. Se recomienda investigación adicional in situ.

## Cadenas con Menú Verificado

- **Bembos**: 20 platos verificados (hamburguesas, pollo, combos, promociones)
- **Chinawok**: 17 platos verificados (chifa, combos, promociones)
- **Starbucks**: 17 platos verificados (café, bebidas, alimentos)
- **Sushi Pop**: 11 platos verificados (sushi, poké, combinados)

## Porcentaje de Datos Verificados vs. Estimados

- **Verificados**: ~75% (precios de cadenas oficiales, ubicaciones de Google Maps)
- **Estimados**: ~20% (distancias dentro del campus, algunos horarios)
- **Inferidos**: ~5% (coordenadas aproximadas, categorías)

## Uso Recomendado

Este dataset está diseíado para:

1. **Plataformas de recomendación gastronómica** para estudiantes
2. **Apps de delivery** con foco universitario
3. **Análisis de precios y accesibilidad** de comida cerca de universidades
4. **Investigación académica** sobre patrones de consumo estudiantil
5. **Planificación de rutas peatonales** y accesibilidad

## Contacto y Actualizaciones

Para reportar errores, sugerir correcciones o actualizar información:

- Revisar fuentes oficiales periódicamente
- Verificar precios en apps de delivery
- Confirmar horarios directamente con los establecimientos
- Actualizar `verified_at` con cada modificación

---

**Generado**: 2026-09-05  
**Versión**: 1.0  
**Licencia**: Uso libre con atribución  
**Autor**: Investigación web automatizada
