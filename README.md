# candydatos.com — Database Schema

Recruitment platform that connects companies with candidates through job postings and psychometric evaluations (Big Five personality test).

---

## Database Technology

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Database       | Google Cloud Firestore (NoSQL)                |
| Authentication | Firebase Auth — email/password flow           |

The app has two separate login portals:

| Portal             | Users          | Collection     | Entry point         |
|--------------------|----------------|----------------|---------------------|
| **Company Portal** | Recruiters / Admins | `company_users` | `/company/login`  |
| **Candidate Portal** | Job seekers  | `candidates`   | `/candidate/login`  |

Both portals use Firebase Auth with email/password. Firestore documents use the Firebase `uid` as the document `id`. The `email` field is mirrored from Firebase Auth for query convenience — the source of truth for credentials is always Firebase Auth.

After sign-in, the portal is determined by which collection contains a document matching the `uid`. A `company_user` cannot access the candidate portal and vice versa.

---

## Collections

### 1. `companies`
Profile information for hiring organizations.

| Field             | Type        | Description                              |
|-------------------|-------------|------------------------------------------|
| `id`              | `string`    | Firebase UID                             |
| `commercial_name` | `string`    | Public-facing brand or trade name        |
| `business_bio`    | `string`    | Short description of the company         |
| `industry_sector` | `string`    | e.g., `"Technology"`, `"Healthcare"`     |
| `tax_id_type`     | `string`    | e.g., `"NIT"`, `"RUT"`                   |
| `tax_id_number`   | `string`    | Tax identification number                |
| `logo_url`        | `string`    | Public URL for the company logo          |
| `website_url`     | `string`    | Company website                          |
| `created_at`      | `timestamp` | Account creation date                    |

---

### 2. `company_users`
Administrators and recruiters belonging to a company.

| Field        | Type        | Description                              |
|--------------|-------------|------------------------------------------|
| `id`         | `string`    | Firebase UID                             |
| `company_id` | `string`    | Reference to `companies`                 |
| `full_name`  | `string`    | Recruiter's display name                 |
| `email`      | `string`    | Work email address                       |
| `role`       | `string`    | `"admin"` or `"recruiter"`               |
| `created_at` | `timestamp` | Account creation date                    |

---

### 3. `candidates`
Profile information for job seekers.

| Field                   | Type        | Description                              |
|-------------------------|-------------|------------------------------------------|
| `id`                    | `string`    | Firebase UID                             |
| `first_name`            | `string`    | Candidate's first name                   |
| `last_name`             | `string`    | Candidate's last name                    |
| `email`                 | `string`    | Contact email address                    |
| `phone`                 | `string`    | Contact phone number                     |
| `identification_type`   | `string`    | `"CC"`, `"CE"`, or `"Passport"`          |
| `identification_number` | `string`    | Document ID number                       |
| `city`                  | `string`    | Current city of residence                |
| `country`               | `string`    | Country of residence                     |
| `created_at`            | `timestamp` | Account creation date                    |

---

### 4. `job_offers`
Job vacancies posted by companies.

| Field                      | Type        | Description                              |
|----------------------------|-------------|------------------------------------------|
| `id`                       | `string`    | Auto-generated document ID               |
| `company_id`               | `string`    | Reference to `companies`                 |
| `title`                    | `string`    | Job position title                       |
| `description`              | `string`    | Full job description                     |
| `benefits`                 | `array`     | List of offered benefits                 |
| `work_modality`            | `string`    | `"Remote"`, `"On-site"`, or `"Hybrid"`   |
| `status`                   | `string`    | `"Active"`, `"Paused"`, or `"Closed"`    |
| `min_salary`               | `number`    | Minimum offered salary                   |
| `max_salary`               | `number`    | Maximum offered salary                   |
| `years_experience_required`| `number`    | Minimum years of experience required     |
| `max_applicants`           | `number`    | Maximum number of applications accepted  |
| `application_deadline`     | `timestamp` | Closing date for applications            |
| `created_at`               | `timestamp` | Date the offer was published             |

---

### 5. `tests`
Catalog of available psychometric and technical assessments.

| Field                | Type     | Description                              |
|----------------------|----------|------------------------------------------|
| `id`                 | `string` | e.g., `"big_five_v1"`                    |
| `name`               | `string` | Human-readable test name                 |
| `instructions`       | `string` | Instructions displayed to the candidate  |
| `duration_minutes`   | `number` | Allotted time to complete the test       |

---

### 6. `applications`
Links a candidate to a job offer (one per candidate per offer).

| Field               | Type        | Description                                        |
|---------------------|-------------|----------------------------------------------------|
| `id`                | `string`    | Auto-generated document ID                         |
| `candidate_id`      | `string`    | Reference to `candidates`                          |
| `job_offer_id`      | `string`    | Reference to `job_offers`                          |
| `cv_url`            | `string`    | Snapshot of the CV submitted with this application |
| `status`            | `string`    | `"Pending"`, `"Reviewed"`, `"Testing"`, `"Rejected"`, `"Hired"` |
| `reviewer_id`       | `string`    | Reference to `company_users` (optional)            |
| `applied_at`        | `timestamp` | Date the candidate submitted the application       |

---

### 7. `test_results`
Score and metadata for a completed assessment.

| Field          | Type        | Description                              |
|----------------|-------------|------------------------------------------|
| `id`           | `string`    | Auto-generated document ID               |
| `application_id`| `string`   | Reference to `applications`              |
| `test_id`      | `string`    | Reference to `tests`                     |
| `score`        | `number`    | Overall percentage score (0–100)         |
| `trait_scores` | `map`       | Per-dimension breakdown (see below)      |
| `completed_at` | `timestamp` | Date and time the test was submitted     |

#### `trait_scores` — Big Five dimensions

| Field               | Type     | Description                                  |
|---------------------|----------|----------------------------------------------|
| `openness`          | `number` | Curiosity and openness to new experiences    |
| `conscientiousness` | `number` | Organization, dependability, and discipline  |
| `extraversion`      | `number` | Sociability and assertiveness                |
| `agreeableness`     | `number` | Cooperation and empathy toward others        |
| `neuroticism`       | `number` | Emotional instability and tendency to stress |
