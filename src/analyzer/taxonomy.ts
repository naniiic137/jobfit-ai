import type { SkillCategory } from '../schemas/categories';

export interface SkillDef {
  /** Stable id. */
  id: string;
  /** Display label; also matched (lower-cased) unless `labelIsAmbiguous`. */
  label: string;
  category: SkillCategory;
  /**
   * Lower-case, accent-free terms that mean THIS skill (English + French), e.g.
   * a version ("java 17") or a sub-product of the same vendor ("ec2" for AWS).
   * Never a different product: "Zustand" is not "Redux", "GitLab" is not "Git".
   * A different product that proves this one goes in `IMPLIES` instead.
   */
  aliases?: string[];
  /**
   * Pure spelling variants of the label ("reactjs", "react.js" → "React").
   * Also matched like aliases, and they are the ONLY surfaces the offline
   * analyzer may rewrite in a CV bullet (to mirror the ad's spelling).
   */
  variants?: string[];
  /**
   * Case-sensitive terms for words that are also ordinary words or names
   * ("Go", "Express", "Claude"). Matched against the original casing only.
   */
  caseSensitive?: string[];
  /** Skip the lower-case label match (use when the label itself is ambiguous). */
  labelIsAmbiguous?: boolean;
  /**
   * For case-sensitive terms: the same line must also match this pattern
   * (e.g. "API", "LLM", "model") or the term must carry a version ("GPT-4o").
   * Stops people's names ("Claude Martin") from counting as a skill.
   */
  context?: RegExp;
  /** Case-sensitive terms may be followed by a version: "GPT-4o", "Llama 3". */
  versioned?: boolean;
}

/** Words that show an LLM product name is used in a technical sense. */
const AI_CONTEXT =
  /\b(apis?|sdk|llms?|models?|modeles?|ai|ia|genai|mistral|openai|anthropic|ollama|chatbots?|prompts?|prompting|agents?|agentic|rag|embeddings?|langchain|fine[\s-]?tun\w*|inference|tokens?|assistants?|copilot|hugging\s?face|transformers?|vertex)\b/i;

const LLM_NAME = { labelIsAmbiguous: true, context: AI_CONTEXT, versioned: true } as const;

/**
 * Curated skills taxonomy. Deliberately small and hand-checked rather than
 * huge and noisy: every entry should be something a recruiter would put in a
 * junior/mid web or AI job ad. French synonyms are included so that French
 * job ads and CVs (common in Tunisia, France, Belgium, Quebec) work too.
 *
 * Rule of thumb: one entry per product. Related products are separate skills
 * linked by `IMPLIES` when knowing one really proves the other.
 */
export const TAXONOMY: SkillDef[] = [
  // ── Languages ──────────────────────────────────────────────────────────
  { id: 'javascript', label: 'JavaScript', category: 'language', variants: ['js'], aliases: ['es6', 'es2015', 'ecmascript', 'vanilla js'] },
  { id: 'typescript', label: 'TypeScript', category: 'language', variants: ['ts'] },
  { id: 'python', label: 'Python', category: 'language', aliases: ['python3', 'python 3'] },
  { id: 'java', label: 'Java', category: 'language', aliases: ['java 8', 'java 11', 'java 17', 'java 21', 'jdk'] },
  { id: 'csharp', label: 'C#', category: 'language', variants: ['c sharp', 'csharp'] },
  { id: 'cpp', label: 'C++', category: 'language', variants: ['cpp'] },
  { id: 'c', label: 'C', category: 'language', aliases: ['langage c', 'c language', 'ansi c'], labelIsAmbiguous: true },
  { id: 'php', label: 'PHP', category: 'language', aliases: ['php8', 'php 8'] },
  { id: 'go', label: 'Go', category: 'language', variants: ['golang'], caseSensitive: ['Go'], labelIsAmbiguous: true },
  { id: 'rust', label: 'Rust', category: 'language', caseSensitive: ['Rust'], labelIsAmbiguous: true },
  { id: 'kotlin', label: 'Kotlin', category: 'language' },
  { id: 'swift', label: 'Swift', category: 'language', caseSensitive: ['Swift'], labelIsAmbiguous: true },
  { id: 'dart', label: 'Dart', category: 'language' },
  { id: 'ruby', label: 'Ruby', category: 'language' },
  { id: 'sql', label: 'SQL', category: 'database', aliases: ['requetes sql', 'sql queries', 't-sql', 'pl/sql'] },
  { id: 'html', label: 'HTML', category: 'frontend', aliases: ['html5'] },
  { id: 'css', label: 'CSS', category: 'frontend', aliases: ['css3'] },
  { id: 'bash', label: 'Bash', category: 'tool', aliases: ['shell scripting', 'shell scripts', 'scripts shell', 'bash scripting'] },

  // ── Frontend ───────────────────────────────────────────────────────────
  { id: 'react', label: 'React', category: 'frontend', variants: ['react.js', 'reactjs', 'react js'], aliases: ['react 18', 'react 19', 'react hooks'] },
  { id: 'nextjs', label: 'Next.js', category: 'frontend', variants: ['nextjs', 'next js'] },
  { id: 'vue', label: 'Vue.js', category: 'frontend', variants: ['vue', 'vuejs', 'vue js'], aliases: ['vue 3', 'vue 2'] },
  { id: 'nuxt', label: 'Nuxt', category: 'frontend', variants: ['nuxt.js', 'nuxtjs'] },
  { id: 'angular', label: 'Angular', category: 'frontend', aliases: ['angular 17', 'angular 18'] },
  { id: 'angularjs', label: 'AngularJS', category: 'frontend', variants: ['angular.js'] },
  { id: 'svelte', label: 'Svelte', category: 'frontend' },
  { id: 'sveltekit', label: 'SvelteKit', category: 'frontend' },
  { id: 'redux', label: 'Redux', category: 'frontend', aliases: ['redux toolkit'] },
  { id: 'zustand', label: 'Zustand', category: 'frontend' },
  { id: 'tailwind', label: 'Tailwind CSS', category: 'frontend', variants: ['tailwind', 'tailwindcss'] },
  { id: 'sass', label: 'Sass', category: 'frontend', aliases: ['scss'] },
  { id: 'bootstrap', label: 'Bootstrap', category: 'frontend' },
  { id: 'react-native', label: 'React Native', category: 'frontend' },
  { id: 'expo', label: 'Expo', category: 'frontend', caseSensitive: ['Expo'], labelIsAmbiguous: true },
  { id: 'flutter', label: 'Flutter', category: 'frontend' },
  { id: 'vite', label: 'Vite', category: 'tool', variants: ['vitejs'] },
  { id: 'webpack', label: 'Webpack', category: 'tool' },
  { id: 'responsive', label: 'Responsive design', category: 'frontend', aliases: ['responsive', 'mobile-first', 'mobile first', 'design responsive', 'responsive web design'] },
  { id: 'a11y', label: 'Accessibility', category: 'frontend', aliases: ['a11y', 'wcag', 'accessibilite', 'aria'] },
  { id: 'figma', label: 'Figma', category: 'tool' },

  // ── Backend ────────────────────────────────────────────────────────────
  { id: 'nodejs', label: 'Node.js', category: 'backend', variants: ['node', 'nodejs', 'node js'] },
  { id: 'express', label: 'Express', category: 'backend', variants: ['express.js', 'expressjs'], caseSensitive: ['Express'], labelIsAmbiguous: true },
  { id: 'nestjs', label: 'NestJS', category: 'backend', variants: ['nest.js', 'nest js'] },
  { id: 'django', label: 'Django', category: 'backend', aliases: ['django rest framework', 'drf'] },
  { id: 'flask', label: 'Flask', category: 'backend' },
  { id: 'fastapi', label: 'FastAPI', category: 'backend', variants: ['fast api'] },
  { id: 'spring', label: 'Spring Boot', category: 'backend', variants: ['springboot'], aliases: ['spring framework'] },
  { id: 'dotnet', label: '.NET', category: 'backend', variants: ['dotnet'], aliases: ['asp.net', 'asp.net core', '.net core'] },
  { id: 'laravel', label: 'Laravel', category: 'backend' },
  { id: 'symfony', label: 'Symfony', category: 'backend' },
  { id: 'rails', label: 'Ruby on Rails', category: 'backend', aliases: ['rails', 'ror'] },
  {
    id: 'rest',
    label: 'REST APIs',
    category: 'backend',
    variants: ['rest api', 'restful api', 'restful apis'],
    aliases: ['restful', 'api rest', 'apis rest', 'api restful', 'web services', 'services web'],
    // Bare "REST" is a real signal in skill lists ("Java, Spring, REST"); "rest" is not.
    caseSensitive: ['REST'],
  },
  { id: 'graphql', label: 'GraphQL', category: 'backend' },
  { id: 'apollo', label: 'Apollo GraphQL', category: 'backend', aliases: ['apollo', 'apollo client', 'apollo server'] },
  { id: 'websockets', label: 'WebSockets', category: 'backend', variants: ['websocket', 'web sockets'] },
  { id: 'socketio', label: 'Socket.IO', category: 'backend', variants: ['socket.io', 'socketio'] },
  { id: 'auth', label: 'Authentication', category: 'backend', aliases: ['authentication', 'authentification', 'user authentication'] },
  { id: 'jwt', label: 'JWT', category: 'backend', aliases: ['json web token', 'json web tokens'] },
  { id: 'oauth', label: 'OAuth', category: 'backend', aliases: ['oauth2', 'oauth 2.0'] },
  { id: 'microservices', label: 'Microservices', category: 'backend', aliases: ['micro-services', 'microservice', 'micro services'] },
  { id: 'kafka', label: 'Kafka', category: 'backend', aliases: ['apache kafka'] },
  { id: 'rabbitmq', label: 'RabbitMQ', category: 'backend' },

  // ── Databases ──────────────────────────────────────────────────────────
  { id: 'postgresql', label: 'PostgreSQL', category: 'database', variants: ['postgres'], aliases: ['psql'] },
  { id: 'mysql', label: 'MySQL', category: 'database' },
  { id: 'mariadb', label: 'MariaDB', category: 'database' },
  { id: 'mongodb', label: 'MongoDB', category: 'database', variants: ['mongo'] },
  { id: 'mongoose', label: 'Mongoose', category: 'database' },
  { id: 'redis', label: 'Redis', category: 'database' },
  { id: 'sqlite', label: 'SQLite', category: 'database' },
  { id: 'firebase', label: 'Firebase', category: 'database', aliases: ['firestore'] },
  { id: 'supabase', label: 'Supabase', category: 'database' },
  { id: 'orm', label: 'ORMs', category: 'database', aliases: ['orm'] },
  { id: 'prisma', label: 'Prisma', category: 'database' },
  { id: 'typeorm', label: 'TypeORM', category: 'database' },
  { id: 'sequelize', label: 'Sequelize', category: 'database' },
  { id: 'drizzle', label: 'Drizzle ORM', category: 'database', aliases: ['drizzle'] },
  { id: 'hibernate', label: 'Hibernate', category: 'database' },
  { id: 'jpa', label: 'JPA', category: 'database', aliases: ['java persistence api', 'spring data jpa'] },
  { id: 'elasticsearch', label: 'Elasticsearch', category: 'database', variants: ['elastic search'] },
  { id: 'opensearch', label: 'OpenSearch', category: 'database' },
  {
    id: 'rdbms',
    label: 'Relational databases',
    category: 'database',
    aliases: ['relational database', 'relational databases', 'rdbms', 'base de donnees relationnelle', 'bases de donnees relationnelles', 'sgbdr'],
  },
  { id: 'db-design', label: 'Database design', category: 'database', aliases: ['data modeling', 'data modelling', 'modelisation de donnees', 'conception de base de donnees', 'schema design'] },

  // ── DevOps / cloud ─────────────────────────────────────────────────────
  { id: 'git', label: 'Git', category: 'tool', aliases: ['version control', 'gestion de versions', 'controle de version'] },
  { id: 'github', label: 'GitHub', category: 'tool' },
  { id: 'gitlab', label: 'GitLab', category: 'tool' },
  { id: 'bitbucket', label: 'Bitbucket', category: 'tool' },
  { id: 'docker', label: 'Docker', category: 'devops', aliases: ['docker compose', 'docker-compose', 'containers', 'conteneurs', 'containerisation', 'containerization'] },
  { id: 'kubernetes', label: 'Kubernetes', category: 'devops', variants: ['k8s'] },
  { id: 'helm', label: 'Helm', category: 'devops', caseSensitive: ['Helm'], labelIsAmbiguous: true },
  {
    id: 'cicd',
    label: 'CI/CD',
    category: 'devops',
    variants: ['ci / cd', 'ci-cd'],
    aliases: ['continuous integration', 'integration continue', 'deploiement continu', 'continuous delivery', 'continuous deployment'],
  },
  { id: 'github-actions', label: 'GitHub Actions', category: 'devops' },
  { id: 'gitlab-ci', label: 'GitLab CI', category: 'devops', aliases: ['gitlab ci/cd', 'gitlab-ci'] },
  { id: 'jenkins', label: 'Jenkins', category: 'devops' },
  { id: 'argocd', label: 'Argo CD', category: 'devops', variants: ['argocd'] },
  { id: 'aws', label: 'AWS', category: 'devops', aliases: ['amazon web services', 'ec2', 's3', 'aws lambda'] },
  { id: 'azure', label: 'Azure', category: 'devops', aliases: ['microsoft azure'] },
  { id: 'gcp', label: 'Google Cloud', category: 'devops', aliases: ['gcp', 'google cloud platform', 'cloud run'] },
  { id: 'linux', label: 'Linux', category: 'devops', aliases: ['ubuntu', 'debian', 'unix'] },
  { id: 'nginx', label: 'Nginx', category: 'devops' },
  { id: 'vercel', label: 'Vercel', category: 'devops' },
  { id: 'netlify', label: 'Netlify', category: 'devops' },
  { id: 'iac', label: 'Infrastructure as code', category: 'devops', aliases: ['infrastructure as code', 'iac'] },
  { id: 'terraform', label: 'Terraform', category: 'devops' },
  { id: 'monitoring', label: 'Monitoring', category: 'devops', aliases: ['observability', 'observabilite'] },
  { id: 'prometheus', label: 'Prometheus', category: 'devops' },
  { id: 'grafana', label: 'Grafana', category: 'devops' },
  { id: 'sentry', label: 'Sentry', category: 'devops' },

  // ── AI / data ──────────────────────────────────────────────────────────
  {
    id: 'llm',
    label: 'LLMs',
    category: 'ai',
    aliases: ['llm', 'large language models', 'large language model', 'grands modeles de langage', 'genai', 'gen ai', 'generative ai', 'ia generative'],
  },
  { id: 'openai', label: 'OpenAI API', category: 'ai', aliases: ['openai', 'openai api', 'azure openai'], caseSensitive: ['GPT'], ...LLM_NAME },
  { id: 'claude', label: 'Claude (Anthropic)', category: 'ai', aliases: ['anthropic', 'anthropic api', 'claude api'], caseSensitive: ['Claude'], ...LLM_NAME },
  { id: 'gemini', label: 'Gemini', category: 'ai', aliases: ['gemini api', 'google gemini'], caseSensitive: ['Gemini'], ...LLM_NAME },
  { id: 'llama', label: 'Llama', category: 'ai', caseSensitive: ['Llama', 'LLaMA'], ...LLM_NAME },
  { id: 'ollama', label: 'Ollama', category: 'ai' },
  { id: 'chatgpt', label: 'ChatGPT', category: 'ai' },
  { id: 'prompt-eng', label: 'Prompt engineering', category: 'ai', aliases: ['prompt engineering', 'prompting', 'prompt design', 'ingenierie de prompt', 'ingenierie des prompts', 'few-shot'] },
  { id: 'ai-agents', label: 'AI agents', category: 'ai', aliases: ['ai agents', 'ai agent', 'agents ia', 'agent ia', 'agentic', 'tool calling', 'function calling'] },
  { id: 'rag', label: 'RAG', category: 'ai', aliases: ['retrieval augmented generation', 'retrieval-augmented generation'] },
  {
    id: 'vector-db',
    label: 'Vector databases',
    category: 'ai',
    aliases: ['vector database', 'vector databases', 'vector store', 'vector stores', 'base de donnees vectorielle', 'bases de donnees vectorielles'],
  },
  { id: 'pgvector', label: 'pgvector', category: 'ai' },
  { id: 'pinecone', label: 'Pinecone', category: 'ai' },
  { id: 'embeddings', label: 'Embeddings', category: 'ai', aliases: ['embeddings', 'text embeddings'], labelIsAmbiguous: true },
  { id: 'langchain', label: 'LangChain', category: 'ai' },
  { id: 'langgraph', label: 'LangGraph', category: 'ai' },
  { id: 'llamaindex', label: 'LlamaIndex', category: 'ai', variants: ['llama index', 'llama-index'] },
  { id: 'huggingface', label: 'Hugging Face', category: 'ai', variants: ['huggingface'] },
  { id: 'ml', label: 'Machine learning', category: 'ai', aliases: ['machine learning', 'apprentissage automatique'] },
  { id: 'deep-learning', label: 'Deep learning', category: 'ai', aliases: ['deep learning', 'apprentissage profond'] },
  { id: 'sklearn', label: 'scikit-learn', category: 'ai', variants: ['sklearn', 'scikit learn'] },
  { id: 'nlp', label: 'NLP', category: 'ai', aliases: ['natural language processing', 'traitement du langage naturel'] },
  { id: 'pytorch', label: 'PyTorch', category: 'ai' },
  { id: 'tensorflow', label: 'TensorFlow', category: 'ai' },
  { id: 'keras', label: 'Keras', category: 'ai' },
  { id: 'pandas', label: 'Pandas', category: 'ai' },
  { id: 'numpy', label: 'NumPy', category: 'ai' },
  { id: 'jupyter', label: 'Jupyter', category: 'ai', aliases: ['jupyter notebook', 'jupyter notebooks'] },
  { id: 'data-analysis', label: 'Data analysis', category: 'ai', aliases: ['data analysis', 'analyse de donnees', 'data visualization', 'data visualisation', 'dataviz'] },
  { id: 'powerbi', label: 'Power BI', category: 'tool', variants: ['powerbi'] },
  { id: 'excel', label: 'Excel', category: 'tool', aliases: ['microsoft excel', 'ms excel'], caseSensitive: ['Excel'], labelIsAmbiguous: true },

  // ── Tools ──────────────────────────────────────────────────────────────
  { id: 'jira', label: 'Jira', category: 'tool' },
  { id: 'confluence', label: 'Confluence', category: 'tool' },
  { id: 'trello', label: 'Trello', category: 'tool' },
  { id: 'postman', label: 'Postman', category: 'tool' },
  { id: 'openapi', label: 'OpenAPI / Swagger', category: 'tool', aliases: ['openapi', 'open api', 'swagger'], labelIsAmbiguous: true },
  { id: 'npm', label: 'npm', category: 'tool' },
  { id: 'yarn', label: 'Yarn', category: 'tool' },
  { id: 'pnpm', label: 'pnpm', category: 'tool' },
  { id: 'vscode', label: 'VS Code', category: 'tool', variants: ['visual studio code', 'vscode'] },

  // ── Practices ──────────────────────────────────────────────────────────
  {
    id: 'testing',
    label: 'Automated testing',
    category: 'practice',
    aliases: [
      'unit tests', 'unit test', 'unit testing', 'tests unitaires', 'test unitaire', 'automated tests', 'automated testing', 'test automation',
      'tests automatises', 'integration tests', 'integration testing', "tests d'integration", 'e2e tests', 'end-to-end tests', 'tests e2e',
    ],
  },
  { id: 'jest', label: 'Jest', category: 'tool' },
  { id: 'vitest', label: 'Vitest', category: 'tool' },
  { id: 'pytest', label: 'pytest', category: 'tool' },
  { id: 'junit', label: 'JUnit', category: 'tool', aliases: ['junit5', 'junit 5'] },
  { id: 'mockito', label: 'Mockito', category: 'tool' },
  { id: 'cypress', label: 'Cypress', category: 'tool' },
  { id: 'playwright', label: 'Playwright', category: 'tool' },
  { id: 'testing-library', label: 'Testing Library', category: 'tool', aliases: ['react testing library'] },
  { id: 'tdd', label: 'TDD', category: 'practice', aliases: ['test-driven development', 'test driven development'] },
  { id: 'agile', label: 'Agile', category: 'practice', aliases: ['agile', 'methodes agiles', 'methodologie agile', 'agilite'] },
  { id: 'scrum', label: 'Scrum', category: 'practice', aliases: ['sprints', 'sprint'] },
  { id: 'kanban', label: 'Kanban', category: 'practice' },
  { id: 'code-review', label: 'Code review', category: 'practice', aliases: ['code reviews', 'revue de code', 'revues de code', 'pull requests', 'pull request'] },
  { id: 'clean-code', label: 'Clean code', category: 'practice', aliases: ['clean architecture', 'solid principles', 'principes solid', 'design patterns', 'bonnes pratiques', 'best practices', 'code propre'] },
  { id: 'oop', label: 'OOP', category: 'practice', aliases: ['object-oriented', 'object oriented programming', 'programmation orientee objet', 'poo'] },
  { id: 'performance', label: 'Web performance', category: 'practice', aliases: ['web performance', 'performance optimization', 'optimisation des performances', 'lighthouse', 'core web vitals'] },
  { id: 'security', label: 'Web security', category: 'practice', aliases: ['owasp', 'web security', 'securite web', 'securite applicative', 'application security'] },
  { id: 'seo', label: 'SEO', category: 'practice', aliases: ['referencement', 'referencement naturel'] },
  { id: 'documentation', label: 'Technical documentation', category: 'practice', aliases: ['technical documentation', 'documentation technique', 'technical writing'] },
  { id: 'fullstack', label: 'Full-stack development', category: 'practice', aliases: ['full-stack', 'full stack', 'fullstack'] },

  // ── Soft skills ────────────────────────────────────────────────────────
  { id: 'communication', label: 'Communication', category: 'soft', aliases: ['communication skills', 'bonne communication', 'communicate clearly', 'aisance relationnelle'] },
  { id: 'teamwork', label: 'Teamwork', category: 'soft', aliases: ['team player', 'team work', 'collaboration', 'collaborative', 'travail en equipe', "travail d'equipe", "esprit d'equipe", 'work in a team'] },
  { id: 'problem-solving', label: 'Problem solving', category: 'soft', aliases: ['problem-solving', 'problem solver', 'resolution de problemes', "esprit d'analyse", 'analytical skills', 'analytical mind', 'esprit analytique'] },
  { id: 'autonomy', label: 'Autonomy', category: 'soft', aliases: ['autonomous', 'autonomie', 'autonome', 'self-starter', 'self-motivated', 'work independently', 'independently'] },
  { id: 'curiosity', label: 'Eagerness to learn', category: 'soft', aliases: ['eager to learn', 'willingness to learn', 'curious', 'curiosity', 'curiosite', 'curieux', "envie d'apprendre", 'fast learner', 'quick learner', 'growth mindset'] },
  { id: 'ownership', label: 'Ownership', category: 'soft', aliases: ['take ownership', 'sens des responsabilites', 'accountability'] },
  { id: 'time-management', label: 'Time management', category: 'soft', aliases: ['gestion du temps', 'organised', 'organized', 'rigueur', 'rigoureux', 'attention to detail', 'detail-oriented'] },
  { id: 'english', label: 'English', category: 'soft', aliases: ['anglais', 'fluent english', 'english (fluent)', 'professional english'] },
  { id: 'french', label: 'French', category: 'soft', aliases: ['francais', 'fluent french'] },
  { id: 'arabic', label: 'Arabic', category: 'soft', aliases: ['arabe'] },
];

/**
 * Knowing the left skill proves the right one ("MySQL" on a CV satisfies an ad
 * asking for "SQL", "Helm" proves "Kubernetes"). Only TRUE implications belong
 * here: the reverse direction never holds (Kubernetes does not prove Helm).
 * Used for the CV side only, and the evidence quote is the one of the more
 * specific skill.
 */
export const IMPLIES: Record<string, string[]> = {
  // Languages & frameworks
  typescript: ['javascript'],
  nextjs: ['react'],
  'react-native': ['react'],
  expo: ['react-native'],
  nuxt: ['vue'],
  sveltekit: ['svelte'],
  angularjs: ['javascript'],
  tailwind: ['css'],
  express: ['nodejs'],
  nestjs: ['nodejs', 'typescript'],
  django: ['python'],
  flask: ['python'],
  fastapi: ['python'],
  spring: ['java'],
  laravel: ['php'],
  symfony: ['php'],
  rails: ['ruby'],
  apollo: ['graphql'],
  socketio: ['websockets'],
  jwt: ['auth'],
  oauth: ['auth'],
  // Data
  mysql: ['sql', 'rdbms'],
  mariadb: ['sql', 'rdbms'],
  postgresql: ['sql', 'rdbms'],
  sqlite: ['sql', 'rdbms'],
  mongoose: ['mongodb'],
  prisma: ['orm'],
  typeorm: ['orm'],
  sequelize: ['orm'],
  drizzle: ['orm'],
  hibernate: ['orm', 'java'],
  jpa: ['orm', 'java'],
  // DevOps
  github: ['git'],
  gitlab: ['git'],
  bitbucket: ['git'],
  'github-actions': ['cicd', 'github'],
  'gitlab-ci': ['cicd', 'gitlab'],
  jenkins: ['cicd'],
  argocd: ['cicd', 'kubernetes'],
  helm: ['kubernetes'],
  terraform: ['iac'],
  prometheus: ['monitoring'],
  grafana: ['monitoring'],
  sentry: ['monitoring'],
  // AI
  openai: ['llm'],
  claude: ['llm'],
  gemini: ['llm'],
  llama: ['llm'],
  ollama: ['llm'],
  'prompt-eng': ['llm'],
  'ai-agents': ['llm'],
  rag: ['llm'],
  langchain: ['llm'],
  langgraph: ['llm'],
  llamaindex: ['llm'],
  pgvector: ['vector-db', 'postgresql'],
  pinecone: ['vector-db'],
  pytorch: ['python', 'ml', 'deep-learning'],
  tensorflow: ['ml', 'deep-learning'],
  keras: ['ml', 'deep-learning'],
  sklearn: ['python', 'ml'],
  'deep-learning': ['ml'],
  pandas: ['python'],
  numpy: ['python'],
  powerbi: ['data-analysis'],
  // Testing & process
  jest: ['testing'],
  vitest: ['testing'],
  pytest: ['testing', 'python'],
  junit: ['testing', 'java'],
  mockito: ['testing', 'java'],
  cypress: ['testing'],
  playwright: ['testing'],
  'testing-library': ['testing'],
  tdd: ['testing'],
  scrum: ['agile'],
  kanban: ['agile'],
};

export const TAXONOMY_BY_ID: ReadonlyMap<string, SkillDef> = new Map(TAXONOMY.map((s) => [s.id, s]));
