import type { SkillCategory } from '../schemas/analysis';

export interface SkillDef {
  /** Stable id, also used as the display label when `label` is absent. */
  id: string;
  label: string;
  category: SkillCategory;
  /** Lower-case, accent-free aliases (English + French). The label is matched too. */
  aliases?: string[];
  /**
   * Case-sensitive aliases for words that are also ordinary English words
   * ("Go", "Express", "Rust" ...). Matched against the original casing only.
   */
  caseSensitive?: string[];
  /** Skip the lower-case label match (use when the label itself is ambiguous). */
  labelIsAmbiguous?: boolean;
}

/**
 * Curated skills taxonomy. Deliberately small and hand-checked rather than
 * huge and noisy: every entry should be something a recruiter would put in a
 * junior/mid web or AI job ad. French synonyms are included so that French
 * job ads and CVs (common in Tunisia, France, Belgium, Quebec) work too.
 */
export const TAXONOMY: SkillDef[] = [
  // ── Languages ──────────────────────────────────────────────────────────
  { id: 'javascript', label: 'JavaScript', category: 'language', aliases: ['js', 'es6', 'es2015', 'ecmascript', 'vanilla js'] },
  { id: 'typescript', label: 'TypeScript', category: 'language', aliases: ['ts'] },
  { id: 'python', label: 'Python', category: 'language', aliases: ['python3'] },
  { id: 'java', label: 'Java', category: 'language', aliases: ['java 17', 'java 21', 'jdk'] },
  { id: 'csharp', label: 'C#', category: 'language', aliases: ['c sharp', 'csharp'] },
  { id: 'cpp', label: 'C++', category: 'language', aliases: ['cpp'] },
  { id: 'c', label: 'C', category: 'language', aliases: ['langage c', 'c language', 'ansi c'], labelIsAmbiguous: true },
  { id: 'php', label: 'PHP', category: 'language', aliases: ['php8'] },
  { id: 'go', label: 'Go', category: 'language', aliases: ['golang'], caseSensitive: ['Go'], labelIsAmbiguous: true },
  { id: 'rust', label: 'Rust', category: 'language', caseSensitive: ['Rust'], labelIsAmbiguous: true },
  { id: 'kotlin', label: 'Kotlin', category: 'language' },
  { id: 'swift', label: 'Swift', category: 'language', caseSensitive: ['Swift'], labelIsAmbiguous: true },
  { id: 'dart', label: 'Dart', category: 'language' },
  { id: 'ruby', label: 'Ruby', category: 'language' },
  { id: 'sql', label: 'SQL', category: 'database', aliases: ['requetes sql', 'sql queries', 't-sql', 'pl/sql'] },
  { id: 'html', label: 'HTML', category: 'frontend', aliases: ['html5'] },
  { id: 'css', label: 'CSS', category: 'frontend', aliases: ['css3'] },
  { id: 'bash', label: 'Bash', category: 'tool', aliases: ['shell scripting', 'shell', 'scripts shell'] },

  // ── Frontend ───────────────────────────────────────────────────────────
  { id: 'react', label: 'React', category: 'frontend', aliases: ['react.js', 'reactjs', 'react 18', 'react 19', 'react hooks'] },
  { id: 'nextjs', label: 'Next.js', category: 'frontend', aliases: ['nextjs', 'next js'] },
  { id: 'vue', label: 'Vue.js', category: 'frontend', aliases: ['vue', 'vuejs', 'vue 3', 'nuxt', 'nuxt.js'] },
  { id: 'angular', label: 'Angular', category: 'frontend', aliases: ['angularjs', 'angular 17'] },
  { id: 'svelte', label: 'Svelte', category: 'frontend', aliases: ['sveltekit'] },
  { id: 'redux', label: 'Redux', category: 'frontend', aliases: ['redux toolkit', 'zustand'] },
  { id: 'tailwind', label: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind', 'tailwindcss'] },
  { id: 'sass', label: 'Sass', category: 'frontend', aliases: ['scss'] },
  { id: 'bootstrap', label: 'Bootstrap', category: 'frontend' },
  { id: 'react-native', label: 'React Native', category: 'frontend', aliases: ['expo'] },
  { id: 'flutter', label: 'Flutter', category: 'frontend' },
  { id: 'vite', label: 'Vite', category: 'tool', aliases: ['vitejs'] },
  { id: 'webpack', label: 'Webpack', category: 'tool' },
  { id: 'responsive', label: 'Responsive design', category: 'frontend', aliases: ['responsive', 'mobile-first', 'mobile first', 'design responsive', 'responsive web design'] },
  { id: 'a11y', label: 'Accessibility', category: 'frontend', aliases: ['a11y', 'wcag', 'accessibilite', 'aria'] },
  { id: 'figma', label: 'Figma', category: 'tool' },

  // ── Backend ────────────────────────────────────────────────────────────
  { id: 'nodejs', label: 'Node.js', category: 'backend', aliases: ['node', 'nodejs', 'node js'] },
  { id: 'express', label: 'Express', category: 'backend', aliases: ['express.js', 'expressjs'], caseSensitive: ['Express'], labelIsAmbiguous: true },
  { id: 'nestjs', label: 'NestJS', category: 'backend', aliases: ['nest.js', 'nest js'] },
  { id: 'django', label: 'Django', category: 'backend', aliases: ['django rest framework', 'drf'] },
  { id: 'flask', label: 'Flask', category: 'backend' },
  { id: 'fastapi', label: 'FastAPI', category: 'backend', aliases: ['fast api'] },
  { id: 'spring', label: 'Spring Boot', category: 'backend', aliases: ['springboot', 'spring framework'] },
  { id: 'dotnet', label: '.NET', category: 'backend', aliases: ['dotnet', 'asp.net', 'asp.net core', '.net core'] },
  { id: 'laravel', label: 'Laravel', category: 'backend' },
  { id: 'symfony', label: 'Symfony', category: 'backend' },
  { id: 'rails', label: 'Ruby on Rails', category: 'backend', aliases: ['rails', 'ror'] },
  { id: 'rest', label: 'REST APIs', category: 'backend', aliases: ['restful', 'rest api', 'api rest', 'apis rest', 'api restful', 'web services', 'services web'] },
  { id: 'graphql', label: 'GraphQL', category: 'backend', aliases: ['apollo'] },
  { id: 'websockets', label: 'WebSockets', category: 'backend', aliases: ['websocket', 'socket.io', 'temps reel', 'real-time', 'realtime'] },
  { id: 'auth', label: 'Authentication (JWT/OAuth)', category: 'backend', aliases: ['jwt', 'oauth', 'oauth2', 'authentication', 'authentification', 'openid connect'] },
  { id: 'microservices', label: 'Microservices', category: 'backend', aliases: ['micro-services', 'microservice', 'micro services'] },

  // ── Databases ──────────────────────────────────────────────────────────
  { id: 'postgresql', label: 'PostgreSQL', category: 'database', aliases: ['postgres', 'psql'] },
  { id: 'mysql', label: 'MySQL', category: 'database', aliases: ['mariadb'] },
  { id: 'mongodb', label: 'MongoDB', category: 'database', aliases: ['mongo', 'mongoose'] },
  { id: 'redis', label: 'Redis', category: 'database' },
  { id: 'sqlite', label: 'SQLite', category: 'database' },
  { id: 'firebase', label: 'Firebase', category: 'database', aliases: ['firestore'] },
  { id: 'supabase', label: 'Supabase', category: 'database' },
  { id: 'prisma', label: 'Prisma / ORMs', category: 'database', aliases: ['prisma', 'orm', 'typeorm', 'sequelize', 'drizzle'] },
  { id: 'elasticsearch', label: 'Elasticsearch', category: 'database', aliases: ['elastic search', 'opensearch'] },
  { id: 'db-design', label: 'Database design', category: 'database', aliases: ['data modeling', 'data modelling', 'modelisation de donnees', 'conception de base de donnees', 'schema design', 'relational databases', 'bases de donnees relationnelles'] },

  // ── DevOps / cloud ─────────────────────────────────────────────────────
  { id: 'git', label: 'Git', category: 'tool', aliases: ['github', 'gitlab', 'bitbucket', 'version control', 'gestion de versions'] },
  { id: 'docker', label: 'Docker', category: 'devops', aliases: ['docker compose', 'docker-compose', 'containers', 'conteneurs', 'containerisation', 'containerization'] },
  { id: 'kubernetes', label: 'Kubernetes', category: 'devops', aliases: ['k8s', 'helm'] },
  { id: 'cicd', label: 'CI/CD', category: 'devops', aliases: ['ci / cd', 'ci-cd', 'github actions', 'gitlab ci', 'jenkins', 'continuous integration', 'integration continue', 'deploiement continu', 'continuous delivery', 'continuous deployment'] },
  { id: 'aws', label: 'AWS', category: 'devops', aliases: ['amazon web services', 'ec2', 's3', 'aws lambda'] },
  { id: 'azure', label: 'Azure', category: 'devops', aliases: ['microsoft azure'] },
  { id: 'gcp', label: 'Google Cloud', category: 'devops', aliases: ['gcp', 'google cloud platform', 'cloud run', 'firebase hosting'] },
  { id: 'linux', label: 'Linux', category: 'devops', aliases: ['ubuntu', 'debian', 'unix'] },
  { id: 'nginx', label: 'Nginx', category: 'devops' },
  { id: 'vercel', label: 'Vercel / Netlify', category: 'devops', aliases: ['vercel', 'netlify'] },
  { id: 'terraform', label: 'Terraform', category: 'devops', aliases: ['infrastructure as code', 'iac'] },
  { id: 'monitoring', label: 'Monitoring', category: 'devops', aliases: ['observability', 'observabilite', 'grafana', 'prometheus', 'sentry', 'logging'] },

  // ── AI / data ──────────────────────────────────────────────────────────
  { id: 'llm', label: 'LLMs', category: 'ai', aliases: ['llm', 'large language models', 'large language model', 'grands modeles de langage', 'genai', 'gen ai', 'generative ai', 'ia generative', 'gpt', 'chatgpt', 'gemini', 'claude', 'llama'] },
  { id: 'prompt-eng', label: 'Prompt engineering', category: 'ai', aliases: ['prompt engineering', 'prompting', 'prompt design', 'ingenierie de prompt', 'ingenierie des prompts', 'few-shot'] },
  { id: 'ai-agents', label: 'AI agents', category: 'ai', aliases: ['ai agents', 'ai agent', 'agents ia', 'agent ia', 'agentic', 'tool calling', 'function calling'] },
  { id: 'rag', label: 'RAG', category: 'ai', aliases: ['retrieval augmented generation', 'retrieval-augmented generation', 'vector database', 'vector databases', 'embeddings', 'pgvector', 'pinecone'] },
  { id: 'langchain', label: 'LangChain', category: 'ai', aliases: ['llamaindex', 'langgraph'] },
  { id: 'openai-api', label: 'OpenAI API', category: 'ai', aliases: ['openai', 'openai api', 'gemini api', 'anthropic api'] },
  { id: 'ml', label: 'Machine learning', category: 'ai', aliases: ['machine learning', 'apprentissage automatique', 'scikit-learn', 'sklearn', 'deep learning', 'apprentissage profond'] },
  { id: 'nlp', label: 'NLP', category: 'ai', aliases: ['natural language processing', 'traitement du langage naturel'] },
  { id: 'pytorch', label: 'PyTorch', category: 'ai', aliases: ['tensorflow', 'keras'] },
  { id: 'pandas', label: 'Pandas', category: 'ai', aliases: ['numpy', 'jupyter'] },
  { id: 'data-analysis', label: 'Data analysis', category: 'ai', aliases: ['data analysis', 'analyse de donnees', 'data visualization', 'data visualisation', 'power bi'] },

  // ── Tools ──────────────────────────────────────────────────────────────
  { id: 'jira', label: 'Jira', category: 'tool', aliases: ['confluence', 'trello'] },
  { id: 'postman', label: 'Postman', category: 'tool', aliases: ['insomnia', 'swagger', 'openapi'] },
  { id: 'npm', label: 'npm', category: 'tool', aliases: ['yarn', 'pnpm'] },
  { id: 'vscode', label: 'VS Code', category: 'tool', aliases: ['visual studio code', 'vscode'] },

  // ── Practices ──────────────────────────────────────────────────────────
  { id: 'testing', label: 'Automated testing', category: 'practice', aliases: ['unit tests', 'unit testing', 'tests unitaires', 'test unitaire', 'automated tests', 'tests automatises', 'integration tests', 'tests d\'integration', 'jest', 'vitest', 'pytest', 'junit', 'cypress', 'playwright', 'tdd', 'testing library', 'e2e tests'] },
  { id: 'agile', label: 'Agile / Scrum', category: 'practice', aliases: ['agile', 'scrum', 'kanban', 'methodes agiles', 'methodologie agile', 'sprints', 'sprint'] },
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
  { id: 'teamwork', label: 'Teamwork', category: 'soft', aliases: ['team player', 'team work', 'collaboration', 'collaborative', 'travail en equipe', 'travail d\'equipe', 'esprit d\'equipe', 'work in a team'] },
  { id: 'problem-solving', label: 'Problem solving', category: 'soft', aliases: ['problem-solving', 'problem solver', 'resolution de problemes', 'esprit d\'analyse', 'analytical skills', 'analytical mind', 'esprit analytique'] },
  { id: 'autonomy', label: 'Autonomy', category: 'soft', aliases: ['autonomous', 'autonomie', 'autonome', 'self-starter', 'self-motivated', 'work independently', 'independently'] },
  { id: 'curiosity', label: 'Eagerness to learn', category: 'soft', aliases: ['eager to learn', 'willingness to learn', 'curious', 'curiosity', 'curiosite', 'curieux', 'envie d\'apprendre', 'fast learner', 'quick learner', 'growth mindset'] },
  { id: 'ownership', label: 'Ownership', category: 'soft', aliases: ['take ownership', 'sens des responsabilites', 'accountability'] },
  { id: 'time-management', label: 'Time management', category: 'soft', aliases: ['gestion du temps', 'organised', 'organized', 'rigueur', 'rigoureux', 'attention to detail', 'detail-oriented'] },
  { id: 'english', label: 'English', category: 'soft', aliases: ['anglais', 'fluent english', 'english (fluent)', 'professional english'] },
  { id: 'french', label: 'French', category: 'soft', aliases: ['francais', 'fluent french'] },
  { id: 'arabic', label: 'Arabic', category: 'soft', aliases: ['arabe'] },
];

/**
 * Knowing the left skill proves the right one ("MySQL" on a CV satisfies an ad
 * asking for "SQL"). Used for the CV side only, and the evidence quote is the
 * one of the more specific skill.
 */
export const IMPLIES: Record<string, string[]> = {
  mysql: ['sql', 'db-design'],
  postgresql: ['sql', 'db-design'],
  sqlite: ['sql'],
  nextjs: ['react'],
  'react-native': ['react'],
  redux: ['react'],
  express: ['nodejs'],
  nestjs: ['nodejs', 'typescript'],
  django: ['python'],
  flask: ['python'],
  fastapi: ['python'],
  pandas: ['python'],
  pytorch: ['python', 'ml'],
  laravel: ['php'],
  symfony: ['php'],
  spring: ['java'],
  rails: ['ruby'],
  kubernetes: ['docker'],
  typescript: ['javascript'],
  'prompt-eng': ['llm'],
  'ai-agents': ['llm'],
  rag: ['llm'],
  langchain: ['llm'],
};

export const TAXONOMY_BY_ID: ReadonlyMap<string, SkillDef> = new Map(TAXONOMY.map((s) => [s.id, s]));
