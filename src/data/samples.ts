/**
 * Fictional sample data for the "Try with a sample" buttons.
 * The person and the company are invented; any resemblance is coincidental.
 */

export const SAMPLE_CV = `Sami Ben Salah
Junior Full-Stack Developer · Tunis, Tunisia
sami.bensalah@example.com · github.com/sami-example

SUMMARY
Full-stack developer who enjoys turning messy requirements into simple, fast web apps. Comfortable across ReactJS, Node.js and MongoDB, and eager to learn.

EXPERIENCE
Web Developer (internship → part-time) — Medina Soft, Tunis
06/2024 - Present
- Worked on the customer dashboard in ReactJS and TypeScript used by 40 partner shops
- Built a REST API with Node.js and Express for orders and invoices, documented with Swagger
- Helped with migrating legacy jQuery pages to React components
- Wrote unit tests with Jest for the pricing module and reviewed pull requests from other interns

Freelance Web Developer — self-employed
2022 - 2023
- Made responsive websites for 5 local businesses with HTML, CSS and JavaScript
- Responsible for deployment on Netlify and domain setup

PROJECTS
Recipe Finder — React + Firebase app with search, favourites and offline support
Chat-Room — real-time chat with Socket.io and MongoDB, JWT authentication

SKILLS
JavaScript, TypeScript, ReactJS, Node.js, Express, MongoDB, MySQL, Git, GitHub, Jest, Tailwind, Figma
Languages: Arabic (native), French (fluent), English (professional)
Soft skills: teamwork, problem solving, autonomy

EDUCATION
Bachelor in Computer Science — ISI Ariana
2019 - 2022
`;

export const SAMPLE_JOB = `Junior Full-Stack Developer (React / Node.js) at Nimbus Labs
Location: Tunis (hybrid) · Full-time

About us
Nimbus Labs builds a SaaS platform that helps small retailers manage stock and orders. We are a team of 12 engineers who value clean code and kindness.

What you'll do
- Build new features across our React front-end and Node.js back-end
- Design and maintain REST APIs consumed by our web and mobile apps
- Write automated tests and take part in code reviews
- Work closely with product and design in two-week sprints (Scrum)

Requirements
- 2+ years of experience building web applications
- Strong knowledge of JavaScript and TypeScript
- Solid experience with React and Node.js / Express
- Experience with PostgreSQL or another relational database (SQL)
- Git and GitHub workflow
- Docker for local development
- Good communication skills in English and French; team player

Nice to have
- Experience with Next.js
- CI/CD with GitHub Actions
- Familiarity with LLM APIs or prompt engineering is a plus
- AWS basics

What we offer
- Hybrid work, flexible hours
- Learning budget (courses, conferences)
- Private health insurance
`;

/** The same fictional candidate and company, in French, for the "Français" output language. */
export const SAMPLE_CV_FR = `Sami Ben Salah
Développeur Full-Stack Junior · Tunis, Tunisie
sami.bensalah@example.com · github.com/sami-example

PROFIL
Développeur full-stack qui aime transformer des besoins flous en applications web simples et rapides. À l'aise avec ReactJS, Node.js et MongoDB, curieux et motivé.

EXPÉRIENCE
Développeur web (stage → temps partiel) — Medina Soft, Tunis
06/2024 - Aujourd'hui
- Participé au tableau de bord client en ReactJS et TypeScript utilisé par 40 boutiques partenaires
- Développé une API REST avec Node.js et Express pour les commandes et les factures, documentée avec Swagger
- Aidé à migrer d'anciennes pages jQuery vers des composants React
- Écrit des tests unitaires avec Jest pour le module de tarification et relu les pull requests des autres stagiaires

Développeur web freelance — indépendant
2022 - 2023
- Réalisé des sites responsive pour 5 commerces locaux en HTML, CSS et JavaScript
- Responsable du déploiement sur Netlify et de la configuration des domaines

PROJETS
Recipe Finder — application React + Firebase avec recherche, favoris et mode hors ligne
Chat-Room — chat en temps réel avec Socket.io et MongoDB, authentification JWT

COMPÉTENCES
JavaScript, TypeScript, ReactJS, Node.js, Express, MongoDB, MySQL, Git, GitHub, Jest, Tailwind, Figma
Langues : arabe (langue maternelle), français (courant), anglais (professionnel)
Savoir-être : travail en équipe, résolution de problèmes, autonomie

FORMATION
Licence en informatique — ISI Ariana
2019 - 2022
`;

export const SAMPLE_JOB_FR = `Développeur Full-Stack Junior (React / Node.js) chez Nimbus Labs
Lieu : Tunis (hybride) · CDI

À propos
Nimbus Labs édite une plateforme SaaS qui aide les petits commerçants à gérer leurs stocks et leurs commandes. Nous sommes une équipe de 12 développeurs attachés au code propre et à la bienveillance.

Vos missions
- Développer de nouvelles fonctionnalités sur notre front-end React et notre back-end Node.js
- Concevoir et maintenir des API REST utilisées par nos applications web et mobiles
- Écrire des tests automatisés et participer aux revues de code
- Travailler avec le produit et le design en sprints de deux semaines (Scrum)

Profil recherché
- 2 ans d'expérience ou plus en développement d'applications web
- Bonne maîtrise de JavaScript et TypeScript
- Solide expérience avec React et Node.js / Express
- Expérience avec PostgreSQL ou une autre base de données relationnelle (SQL)
- Git et GitHub au quotidien
- Docker pour le développement local
- Bonne communication en français et en anglais ; esprit d'équipe

Atouts
- Expérience avec Next.js
- CI/CD avec GitHub Actions
- Une première expérience avec les API de LLM ou le prompt engineering est un plus
- Notions d'AWS

Ce que nous offrons
- Télétravail partiel, horaires flexibles
- Budget formation (cours, conférences)
- Mutuelle privée
`;

export const SAMPLES = {
  en: { cv: SAMPLE_CV, job: SAMPLE_JOB },
  fr: { cv: SAMPLE_CV_FR, job: SAMPLE_JOB_FR },
} as const;
