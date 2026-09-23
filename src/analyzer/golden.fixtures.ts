import type { Importance } from '../schemas/categories';
import { SAMPLE_CV, SAMPLE_JOB } from '../data/samples';

/**
 * Hand-labelled golden set for the offline analyzer.
 *
 * `expected` is what a careful human recruiter would extract from the ad,
 * with its importance and whether the CV really proves it. Skills the
 * taxonomy does not know are included on purpose (ids starting with "x:"):
 * they can never be found, so they lower recall honestly instead of being
 * hidden. Cases 1–5 are the ones from the external code review.
 */
export interface GoldenCase {
  name: string;
  lang: 'en' | 'fr';
  cv: string;
  job: string;
  /** skill id → [importance, proven by the CV] */
  expected: Record<string, [Importance, boolean]>;
}

const CV_JAVA = `Amira Trabelsi
Backend Developer · Sfax, Tunisia

PROFILE
Backend developer with 2 years of professional experience building Java services.

EXPERIENCE
Java Developer — Telnet, Sfax
09/2023 - Present
- Developed Spring Boot microservices for a telecom billing platform (Java 17, PostgreSQL)
- Wrote JUnit and Mockito tests, raising coverage from 45% to 80%
- Containerised services with Docker and deployed them through GitLab CI
- Took part in daily Scrum meetings and code reviews

EDUCATION
Engineering degree in Computer Science — ENIS, 2018 - 2023

SKILLS
Java, Spring Boot, Hibernate/JPA, PostgreSQL, Docker, Git, Linux, REST
Languages: Arabic, French, English`;

const JOB_JAVA = `Backend Engineer (Java) at Vermeg
Location: Tunis (hybrid)

About us
Vermeg builds financial software used by banks across Europe.

Requirements
- 2+ years of experience with Java and Spring Boot
- Solid knowledge of SQL and relational databases (PostgreSQL or Oracle)
- Experience building REST APIs
- Unit testing (JUnit)
- Git

Nice to have
- Kafka, Kubernetes
- Experience with AWS
- Angular

What we offer
- Free Docker and Kubernetes trainings`;

const CV_FR = `Yassine Mansouri
Développeur Front-End · Lyon

PROFIL
Développeur front-end passionné, 1 an d'expérience, curieux et autonome.

EXPÉRIENCE PROFESSIONNELLE
Développeur Front-End — Agence Pixel, Lyon
01/2025 - aujourd'hui
- Développement d'interfaces en React et TypeScript pour des sites e-commerce
- Intégration de maquettes Figma en HTML/CSS responsive avec Tailwind
- Mise en place de tests unitaires avec Vitest
- Participation aux revues de code et aux sprints Scrum

Stage Développeur Web — StartUp Verte, Lyon
03/2024 - 08/2024
- Création d'un tableau de bord en Vue.js consommant une API REST

FORMATION
Licence Informatique — Université Lyon 1, 2021 - 2024

COMPÉTENCES
React, TypeScript, JavaScript, Vue.js, HTML, CSS, Tailwind, Git, Figma
Langues : français, anglais`;

const JOB_FR = `Développeur Full-Stack JavaScript – Qonto (Paris)

Vos missions
- Développer de nouvelles fonctionnalités front et back
- Concevoir des API REST avec Node.js et NestJS
- Participer aux revues de code

Votre profil
- 2 ans d'expérience minimum en développement web
- Maîtrise de React et TypeScript
- Bonne connaissance de PostgreSQL
- Travail en équipe et esprit d'analyse
- Anglais professionnel

Serait un plus
- Docker, Kubernetes
- Expérience sur AWS`;

const CV_MARKETING = `Claude Martin
Marketing & Data Analyst

EXPERIENCE
Marketing Analyst — Decathlon
2021 - 2025
- Built Power BI dashboards to track campaign performance across 12 countries
- Analysed customer data in Excel and Google Analytics
- Coordinated with a collaborative team of 8 people; organized weekly reporting
- Managed the company GitHub page for the open-source store locator
- Designed real-time KPI reports for the sales team

SKILLS
Excel, Power BI, Google Analytics, communication, teamwork, English, French`;

const JOB_DEVOPS = `Senior DevOps / Platform Engineer at Datadog
Requirements
- 5+ years of experience running production infrastructure on AWS or GCP
- Expert in Kubernetes, Terraform and Helm
- Strong Go or Python programming skills
- CI/CD pipelines (GitHub Actions, ArgoCD)
- Observability: Prometheus, Grafana
- Linux internals and networking
- Experience with LLMs is a plus
Nice to have
- Kafka, Istio, eBPF`;

const JOB_INLINE = `Frontend Developer
Requirements
- React is required, TypeScript is a plus
- Redux`;

const CV_INLINE = `Lina Ben Ali
EXPERIENCE
- Built React apps with Zustand for state management and TypeScript`;

const JOB_NURSE = `Registered Nurse – City Hospital
Requirements
- Valid nursing licence
- 3 years of ICU experience
- BLS/ACLS certification
- Compassion and communication`;

const JOB_AI = `AI Engineer at Lumen Health
Requirements
- Python and FastAPI
- Experience building RAG pipelines with a vector database (pgvector or Pinecone)
- Hands-on with the OpenAI API or Claude
- Docker
Nice to have
- LangChain or LlamaIndex
- Kubernetes experience would be a plus`;

const CV_AI = `Nour Ben Amor
AI Engineer
EXPERIENCE
- Built a document Q&A assistant with the Claude API and pgvector (RAG) in Python
- Exposed the models through a FastAPI service, containerised with Docker
- Wrote pytest suites for the retrieval pipeline
SKILLS
Python, FastAPI, PostgreSQL, Docker, LangChain, Git`;

const JOB_ANGULAR = `Développeur Angular (H/F) – Sopra (Tunis)
Profil recherché
- Maîtrise d'Angular et TypeScript, RxJS est un plus
- Connaissance de Java / Spring Boot appréciée
- Git, méthodes agiles (Scrum)
Atouts
- Docker, Jenkins`;

const CV_ANGULAR = `Salma Gharbi
Développeuse Front-End
EXPÉRIENCE
- Développement d'une application de gestion en Angular 17 et TypeScript
- Mise en place d'un pipeline Jenkins pour les tests
COMPÉTENCES
Angular, TypeScript, HTML, CSS, Git, Scrum`;

export const GOLDEN: GoldenCase[] = [
  {
    name: '1 Java backend (EN)',
    lang: 'en',
    cv: CV_JAVA,
    job: JOB_JAVA,
    expected: {
      java: ['required', true],
      spring: ['required', true],
      sql: ['required', true],
      rdbms: ['required', true],
      postgresql: ['required', true],
      'x:oracle': ['required', false],
      rest: ['required', true],
      testing: ['required', true],
      junit: ['required', true],
      git: ['required', true],
      kafka: ['nice', false],
      kubernetes: ['nice', false],
      aws: ['nice', false],
      angular: ['nice', false],
    },
  },
  {
    name: '2 French full-stack (FR)',
    lang: 'fr',
    cv: CV_FR,
    job: JOB_FR,
    expected: {
      fullstack: ['required', false],
      javascript: ['required', true],
      rest: ['required', true],
      nodejs: ['required', false],
      nestjs: ['required', false],
      'code-review': ['required', true],
      react: ['required', true],
      typescript: ['required', true],
      postgresql: ['required', false],
      teamwork: ['required', false],
      'problem-solving': ['required', false],
      english: ['required', true],
      docker: ['nice', false],
      kubernetes: ['nice', false],
      aws: ['nice', false],
    },
  },
  {
    name: '3 Marketing CV vs DevOps ad',
    lang: 'en',
    cv: CV_MARKETING,
    job: JOB_DEVOPS,
    expected: {
      aws: ['required', false],
      gcp: ['required', false],
      kubernetes: ['required', false],
      terraform: ['required', false],
      helm: ['required', false],
      go: ['required', false],
      python: ['required', false],
      cicd: ['required', false],
      'github-actions': ['required', false],
      argocd: ['required', false],
      monitoring: ['required', false],
      prometheus: ['required', false],
      grafana: ['required', false],
      linux: ['required', false],
      'x:networking': ['required', false],
      llm: ['nice', false],
      kafka: ['nice', false],
      'x:istio': ['nice', false],
      'x:ebpf': ['nice', false],
    },
  },
  {
    name: '4 "required, … is a plus" + Zustand',
    lang: 'en',
    cv: CV_INLINE,
    job: JOB_INLINE,
    expected: {
      react: ['required', true],
      typescript: ['nice', true],
      redux: ['required', false],
    },
  },
  {
    name: '5 Non-tech (nurse) ad',
    lang: 'en',
    cv: CV_JAVA,
    job: JOB_NURSE,
    expected: {
      'x:nursing-licence': ['required', false],
      'x:icu': ['required', false],
      'x:bls-acls': ['required', false],
      'x:compassion': ['required', false],
      communication: ['required', false],
    },
  },
  {
    name: '6 Bundled sample',
    lang: 'en',
    cv: SAMPLE_CV,
    job: SAMPLE_JOB,
    expected: {
      fullstack: ['required', true],
      react: ['required', true],
      nodejs: ['required', true],
      'clean-code': ['nice', false],
      rest: ['required', true],
      testing: ['required', true],
      'code-review': ['required', true],
      scrum: ['required', false],
      javascript: ['required', true],
      typescript: ['required', true],
      express: ['required', true],
      postgresql: ['required', false],
      rdbms: ['required', true],
      sql: ['required', true],
      git: ['required', true],
      github: ['required', true],
      docker: ['required', false],
      communication: ['required', false],
      english: ['required', true],
      french: ['required', true],
      teamwork: ['required', true],
      nextjs: ['nice', false],
      cicd: ['nice', false],
      'github-actions': ['nice', false],
      llm: ['nice', false],
      'prompt-eng': ['nice', false],
      aws: ['nice', false],
    },
  },
  {
    name: '7 AI engineer (RAG, Claude API)',
    lang: 'en',
    cv: CV_AI,
    job: JOB_AI,
    expected: {
      python: ['required', true],
      fastapi: ['required', true],
      rag: ['required', true],
      'vector-db': ['required', true],
      pgvector: ['required', true],
      pinecone: ['required', false],
      openai: ['required', false],
      claude: ['required', true],
      docker: ['required', true],
      langchain: ['nice', true],
      llamaindex: ['nice', false],
      kubernetes: ['nice', false],
    },
  },
  {
    name: '8 Angular (FR, inline "est un plus")',
    lang: 'fr',
    cv: CV_ANGULAR,
    job: JOB_ANGULAR,
    expected: {
      angular: ['required', true],
      typescript: ['required', true],
      'x:rxjs': ['nice', false],
      java: ['nice', false],
      spring: ['nice', false],
      git: ['required', true],
      agile: ['required', true],
      scrum: ['required', true],
      docker: ['nice', false],
      jenkins: ['nice', true],
    },
  },
];
