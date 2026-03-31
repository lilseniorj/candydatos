# candydatos.com — Esquema de Base de Datos

Plataforma de reclutamiento que conecta empresas con candidatos a través de ofertas laborales y evaluaciones psicométricas (Test Big Five).

---

## Tecnología

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Database       | Google Cloud Firestore (NoSQL)                |
| Authentication | Firebase Auth — email/password flow           |

La aplicación tiene dos portales de acceso separados:

| Portal             | Users               | Collection      | Entry point        |
|--------------------|---------------------|-----------------|--------------------|
| **Company Portal** | Recruiters / Admins | `company_users` | `/company/login`   |
| **Candidate Portal** | Job seekers       | `candidates`    | `/candidate/login` |

Ambos portales usan Firebase Auth con correo y contraseña. El documento en Firestore usa el `uid` de Firebase como `id`. El campo `email` se copia desde Firebase Auth para facilitar las consultas — la fuente de verdad de las credenciales siempre es Firebase Auth.

Al iniciar sesión, la app determina a qué portal pertenece el usuario buscando su `uid` en la colección correspondiente. Un `company_user` no puede acceder al portal de candidatos y viceversa.

---

## Portal de Empresas — Flujo de usuario

### Paso 1 — Autenticación
El usuario entra a `/company/login` y puede **registrarse** o **iniciar sesión** con correo y contraseña.

### Pasos 2 y 3 — Configuración de empresa
Después de iniciar sesión, la app busca en `company_users` un documento con el `uid` del usuario:

| Scenario | Outcome |
|----------|---------|
| El usuario ya tiene una empresa asignada (`company_id`) | Se redirige directamente al dashboard de la empresa |
| El usuario existe pero no tiene empresa | Ve las invitaciones pendientes en `company_invitations` y la opción de **crear una nueva empresa** |
| Es el primer inicio de sesión (no existe documento) | Se crea el registro en `company_users`; el usuario ve invitaciones o el formulario para crear empresa |

Un **admin** puede invitar a otros usuarios enviando una invitación a través de `company_invitations`. El invitado se registra normalmente y queda vinculado a la empresa al aceptar.

### Paso 4 — Gestión de ofertas laborales
Desde el dashboard de la empresa, el usuario puede:

| Action | Details |
|--------|---------|
| Ver todas las ofertas | Filtradas por estado (`Active`, `Paused`, `Closed`) |
| Crear / Editar / Eliminar ofertas | CRUD completo sobre `job_offers` |
| Asignar un reclutador responsable | Guarda `reviewer_id` en cada `application` |
| Filtrar candidatos | Por estado, fecha, puntaje de test, etc. |
| Aceptar o rechazar candidatos | Actualiza `application.status` a `"Hired"` o `"Rejected"` |
| Asignar un manager a un candidato | Actualiza `reviewer_id` en una `application` específica |

### Paso 5 — Dashboard de historial de candidatos
Vista por oferta que muestra el embudo completo de candidatos: total recibidos, en revisión, en pruebas, contratados y rechazados. Se obtiene de `applications` agrupado por `job_offer_id`.

### Paso 6 — Dashboard de resultados psicométricos
Vista descriptiva por candidato que muestra sus puntajes Big Five desde `test_results.trait_scores`, permitiendo comparar candidatos entre sí por dimensión de personalidad.

---

## Portal de Candidatos — Flujo de usuario

### Paso 1 — Autenticación
El candidato entra a `/candidate/login` y puede **registrarse** o **iniciar sesión** con correo y contraseña.

### Paso 2 — Perfil y hoja de vida
Después de iniciar sesión, el candidato completa su perfil y sube al menos una hoja de vida (PDF/DOCX guardado en Firebase Storage). Al subir el documento, **Gemini API** lo procesa automáticamente y:

- Extrae información básica (nombre, habilidades, experiencia, educación) → se guarda en `candidate_resumes.extracted_data`
- Genera sugerencias de mejora → se guardan en `candidate_resumes.suggestions`

### Paso 3 — Banner de progreso del perfil
Se muestra una barra de progreso en la parte superior del dashboard del candidato. El porcentaje se calcula con base en los campos de `candidates` y la existencia de al menos una hoja de vida:

| Criteria | Weight |
|----------|--------|
| Información básica completa (`first_name`, `last_name`, `phone`, `city`, `country`, `identification_*`) | 60% |
| Al menos una hoja de vida subida | 40% |

El porcentaje actual se guarda en `candidates.profile_completion_pct` y se actualiza en tiempo real cada vez que el candidato guarda cambios.

### Paso 4 — Ver y filtrar ofertas laborales
Una vez que el perfil está al 100%, el candidato puede ver las `job_offers` con `status = "Active"` y filtrarlas u ordenarlas por:

| Filter | Field |
|--------|-------|
| Rango salarial | `min_salary` / `max_salary` |
| País | `country` |
| Cargo / palabras clave | `title`, `description` |
| Modalidad de trabajo | `work_modality` |
| Ordenar por fecha | `created_at` |
| Ordenar por salario | `min_salary` |

### Paso 5 — Aplicar con validación de Gemini
Para aplicar, el candidato selecciona una de sus hojas de vida. **Gemini API** compara la hoja de vida contra los requisitos de la oferta y devuelve un resultado guardado en `applications.fit_check`:

| Outcome | Next action |
|---------|-------------|
| `fit_check.passed = true` | La aplicación continúa al siguiente paso |
| `fit_check.passed = false` | El candidato recibe el `fit_check.feedback` y no puede continuar |

### Paso 6 — Test evaluado por Gemini
Si la oferta tiene un `required_test_id`, después de pasar la validación el candidato realiza el test. **Gemini API** evalúa las respuestas y guarda el resultado en `test_results` con un mapa `gemini_evaluation` que contiene el puntaje, el desglose por dimensión y retroalimentación cualitativa.

### Paso 7 — Borrador en tiempo real y retoma de proceso
Cada paso de la aplicación se guarda en tiempo real en `applications.current_step` a través de Firestore. Si el candidato abandona el proceso, al volver la app lee `current_step` y retoma desde donde lo dejó.

| `current_step` value | Meaning |
|----------------------|---------|
| `"cv_selection"`     | El candidato aún no ha seleccionado una hoja de vida |
| `"fit_check"`        | Hoja de vida seleccionada, esperando validación de Gemini |
| `"test"`             | Validación aprobada, test en curso |
| `"submitted"`        | Aplicación completada y enviada |

Las aplicaciones con `status = "Draft"` solo son visibles para el candidato.

### Paso 8 — Mis aplicaciones
El candidato tiene una página dedicada donde puede ver todas sus `applications` con:
- Nombre de la oferta y empresa
- Estado actual (`status`)
- Comentarios del reclutador (`feedback_to_candidate`), si los hay
- Fecha en que aplicó (`applied_at`)

---

## Colecciones

### 1. `companies`
Datos de las empresas que publican ofertas laborales.

| Field             | Type        | Description                              |
|-------------------|-------------|------------------------------------------|
| `id`              | `string`    | Firebase UID                             |
| `commercial_name` | `string`    | Nombre comercial o de marca              |
| `business_bio`    | `string`    | Descripción corta de la empresa          |
| `industry_sector` | `string`    | Ej: `"Technology"`, `"Healthcare"`       |
| `tax_id_type`     | `string`    | Ej: `"NIT"`, `"RUT"`                     |
| `tax_id_number`   | `string`    | Número de identificación tributaria      |
| `logo_url`        | `string`    | URL pública del logo de la empresa       |
| `website_url`     | `string`    | Sitio web de la empresa                  |
| `created_at`      | `timestamp` | Fecha de creación de la cuenta           |

---

### 2. `company_users`
Administradores y reclutadores que pertenecen a una empresa.

| Field        | Type        | Description                              |
|--------------|-------------|------------------------------------------|
| `id`         | `string`    | Firebase UID                             |
| `company_id` | `string`    | Referencia a `companies`                 |
| `full_name`  | `string`    | Nombre del reclutador                    |
| `email`      | `string`    | Correo electrónico de trabajo            |
| `role`       | `string`    | `"admin"` o `"recruiter"`                |
| `created_at` | `timestamp` | Fecha de creación de la cuenta           |

---

### 3. `company_invitations`
Invitaciones pendientes enviadas por un admin a nuevos usuarios de la empresa.

| Field          | Type        | Description                                                    |
|----------------|-------------|----------------------------------------------------------------|
| `id`           | `string`    | ID generado automáticamente                                    |
| `company_id`   | `string`    | Referencia a `companies`                                       |
| `invited_by`   | `string`    | Referencia a `company_users` (admin que envió la invitación)   |
| `email`        | `string`    | Correo del invitado                                            |
| `role`         | `string`    | Rol asignado al aceptar: `"admin"` o `"recruiter"`             |
| `status`       | `string`    | `"Pending"`, `"Accepted"` o `"Expired"`                        |
| `expires_at`   | `timestamp` | Fecha de vencimiento de la invitación                          |
| `created_at`   | `timestamp` | Fecha en que se envió la invitación                            |

---

### 4. `candidates`
Datos de los candidatos que buscan empleo.

| Field                   | Type        | Description                                                 |
|-------------------------|-------------|-------------------------------------------------------------|
| `id`                    | `string`    | Firebase UID                                                |
| `first_name`            | `string`    | Nombre del candidato                                        |
| `last_name`             | `string`    | Apellido del candidato                                      |
| `email`                 | `string`    | Correo electrónico de contacto                              |
| `phone`                 | `string`    | Teléfono de contacto                                        |
| `identification_type`   | `string`    | `"CC"`, `"CE"` o `"Passport"`                               |
| `identification_number` | `string`    | Número del documento de identidad                           |
| `city`                  | `string`    | Ciudad de residencia actual                                 |
| `country`               | `string`    | País de residencia                                          |
| `profile_completion_pct`| `number`    | Porcentaje de perfil completado (0–100), se actualiza al guardar |
| `created_at`            | `timestamp` | Fecha de creación de la cuenta                              |

---

### 5. `candidate_resumes`
Hojas de vida subidas por el candidato. Cada documento es procesado por Gemini API al momento de la carga.

| Field            | Type        | Description                                                            |
|------------------|-------------|------------------------------------------------------------------------|
| `id`             | `string`    | ID generado automáticamente                                            |
| `candidate_id`   | `string`    | Referencia a `candidates`                                              |
| `name`           | `string`    | Nombre que el candidato le da a esta hoja de vida                      |
| `document_url`   | `string`    | URL de Firebase Storage del archivo subido                             |
| `extracted_data` | `map`       | Información básica extraída por Gemini (ver detalle abajo)             |
| `suggestions`    | `array`     | Lista de recomendaciones de mejora generadas por Gemini                |
| `created_at`     | `timestamp` | Fecha de carga                                                         |
| `updated_at`     | `timestamp` | Última vez que Gemini reprocesó o el usuario actualizó el documento    |

#### `extracted_data` — campos extraídos por Gemini

| Field          | Type     | Description                                         |
|----------------|----------|-----------------------------------------------------|
| `full_name`    | `string` | Nombre detectado en el documento                    |
| `email`        | `string` | Correo detectado en el documento                    |
| `phone`        | `string` | Teléfono detectado en el documento                  |
| `skills`       | `array`  | Lista de habilidades identificadas                  |
| `experience`   | `array`  | Experiencia laboral (cargo, empresa, años)          |
| `education`    | `array`  | Estudios (título, institución)                      |
| `summary`      | `string` | Resumen profesional extraído del documento          |

---

### 6. `job_offers`
Ofertas laborales publicadas por las empresas.

| Field                      | Type        | Description                                           |
|----------------------------|-------------|-------------------------------------------------------|
| `id`                       | `string`    | ID generado automáticamente                           |
| `company_id`               | `string`    | Referencia a `companies`                              |
| `title`                    | `string`    | Título del cargo                                      |
| `description`              | `string`    | Descripción completa del puesto                       |
| `benefits`                 | `array`     | Lista de beneficios ofrecidos                         |
| `work_modality`            | `string`    | `"Remote"`, `"On-site"` o `"Hybrid"`                  |
| `status`                   | `string`    | `"Active"`, `"Paused"` o `"Closed"`                   |
| `min_salary`               | `number`    | Salario mínimo ofrecido                               |
| `max_salary`               | `number`    | Salario máximo ofrecido                               |
| `years_experience_required`| `number`    | Años mínimos de experiencia requeridos                |
| `max_applicants`           | `number`    | Número máximo de aplicaciones aceptadas               |
| `country`                  | `string`    | País donde está basado el puesto                      |
| `required_test_id`         | `string`    | Referencia a `tests` (opcional)                       |
| `application_deadline`     | `timestamp` | Fecha límite para aplicar                             |
| `created_at`               | `timestamp` | Fecha en que se publicó la oferta                     |

---

### 7. `tests`
Catálogo de evaluaciones psicométricas y técnicas disponibles.

| Field              | Type     | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `id`               | `string` | Ej: `"big_five_v1"`                              |
| `name`             | `string` | Nombre legible del test                          |
| `instructions`     | `string` | Instrucciones que se muestran al candidato       |
| `duration_minutes` | `number` | Tiempo disponible para completar el test         |

---

### 8. `applications`
Vincula a un candidato con una oferta laboral (una por candidato por oferta). Se crea como borrador en el primer paso y se actualiza en tiempo real en cada paso siguiente.

| Field                   | Type        | Description                                                                      |
|-------------------------|-------------|----------------------------------------------------------------------------------|
| `id`                    | `string`    | ID generado automáticamente                                                      |
| `candidate_id`          | `string`    | Referencia a `candidates`                                                        |
| `job_offer_id`          | `string`    | Referencia a `job_offers`                                                        |
| `resume_id`             | `string`    | Referencia a `candidate_resumes` seleccionada para esta aplicación               |
| `status`                | `string`    | `"Draft"`, `"Pending"`, `"Reviewed"`, `"Testing"`, `"Rejected"`, `"Hired"`       |
| `current_step`          | `string`    | `"cv_selection"`, `"fit_check"`, `"test"` o `"submitted"`                        |
| `fit_check`             | `map`       | Resultado de la validación de Gemini (ver detalle abajo)                         |
| `reviewer_id`           | `string`    | Referencia a `company_users` asignado a esta aplicación (opcional)               |
| `feedback_to_candidate` | `string`    | Comentario del reclutador visible para el candidato (opcional)                   |
| `applied_at`            | `timestamp` | Fecha en que el candidato envió la aplicación completa                           |
| `updated_at`            | `timestamp` | Última actualización en tiempo real (se actualiza en cada cambio de paso)        |

#### `fit_check` — resultado de validación de Gemini

| Field      | Type      | Description                                                               |
|------------|-----------|---------------------------------------------------------------------------|
| `passed`   | `boolean` | Si el candidato cumple los requisitos mínimos de la oferta                |
| `score`    | `number`  | Porcentaje de compatibilidad estimado por Gemini (0–100)                  |
| `feedback` | `string`  | Explicación de Gemini (se muestra al candidato si no aprobó)              |

---

### 9. `test_results`
Puntaje y metadatos de un test completado.

| Field               | Type        | Description                                              |
|---------------------|-------------|----------------------------------------------------------|
| `id`                | `string`    | ID generado automáticamente                              |
| `application_id`    | `string`    | Referencia a `applications`                              |
| `test_id`           | `string`    | Referencia a `tests`                                     |
| `score`             | `number`    | Puntaje general (0–100)                                  |
| `trait_scores`      | `map`       | Desglose por dimensión (ver detalle abajo)               |
| `gemini_evaluation` | `map`       | Evaluación cualitativa generada por Gemini (ver abajo)   |
| `completed_at`      | `timestamp` | Fecha y hora en que se envió el test                     |

#### `trait_scores` — dimensiones del Big Five

| Field               | Type     | Description                                            |
|---------------------|----------|--------------------------------------------------------|
| `openness`          | `number` | Curiosidad y apertura a nuevas experiencias            |
| `conscientiousness` | `number` | Organización, responsabilidad y disciplina             |
| `extraversion`      | `number` | Sociabilidad y asertividad                             |
| `agreeableness`     | `number` | Cooperación y empatía hacia los demás                  |
| `neuroticism`       | `number` | Inestabilidad emocional y tendencia al estrés          |

#### `gemini_evaluation` — evaluación cualitativa de la IA

| Field      | Type      | Description                                                         |
|------------|-----------|---------------------------------------------------------------------|
| `passed`   | `boolean` | Si el resultado supera el umbral mínimo definido por la empresa     |
| `score`    | `number`  | Puntaje general asignado por Gemini (0–100)                         |
| `feedback` | `string`  | Resumen narrativo de fortalezas y áreas de mejora                   |
