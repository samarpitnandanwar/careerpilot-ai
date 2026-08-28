// ============================================================================
// CareerPilot AI — Skill Normalizer
// ============================================================================
//
// Deterministic normalization of technology and skill names for accurate
// matching between resume and job requirements. No AI/Gemini dependency.
// ============================================================================

// ---------------------------------------------------------------------------
// Alias maps
// ---------------------------------------------------------------------------

const SKILL_ALIASES: Record<string, string> = {
  // JavaScript ecosystem
  "react.js": "React",
  "reactjs": "React",
  "react tsx": "React",
  "vue.js": "Vue.js",
  "vuejs": "Vue.js",
  "vue ts": "Vue.js",
  "angular.js": "Angular",
  "angularjs": "Angular",
  "next.js": "Next.js",
  "nextjs": "Next.js",
  "nuxt.js": "Nuxt.js",
  "nuxtjs": "Nuxt.js",
  "express.js": "Express.js",
  "expressjs": "Express.js",
  "node": "Node.js",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "node ts": "Node.js",
  "fastify.js": "Fastify",
  "fastifyjs": "Fastify",
  "nestjs": "NestJS",
  "nest.js": "NestJS",
  "remix.js": "Remix",
  "remixjs": "Remix",

  // Languages
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "javascript": "JavaScript",
  "es6": "JavaScript",
  "es2015": "JavaScript",
  "es2020": "JavaScript",
  "python3": "Python",
  "python 3": "Python",
  "golang": "Go",
  "c sharp": "C#",
  "c#/.net": "C#",
  ".net core": ".NET",
  ".net 6": ".NET",
  ".net 7": ".NET",
  ".net 8": ".NET",
  ".net framework": ".NET",
  "c plus plus": "C++",
  "cplusplus": "C++",

  // Data & DB
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "psql": "PostgreSQL",
  "ms sql": "SQL Server",
  "mssql": "SQL Server",
  "microsoft sql server": "SQL Server",
  "ms-sql": "SQL Server",
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "mysql": "MySQL",
  "redis": "Redis",
  "elasticsearch": "Elasticsearch",
  "elastic search": "Elasticsearch",
  "sqlite": "SQLite",
  "cassandra": "Cassandra",
  "dynamodb": "DynamoDB",
  "dynamo db": "DynamoDB",

  // Cloud
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "GCP",
  "google cloud": "GCP",
  "google cloud platform": "GCP",
  "azure": "Azure",
  "microsoft azure": "Azure",

  // DevOps & infra
  "docker": "Docker",
  "k8s": "Kubernetes",
  "kubernetes": "Kubernetes",
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",
  "terraform": "Terraform",
  "ansible": "Ansible",
  "jenkins": "Jenkins",
  "github actions": "GitHub Actions",
  "githubactions": "GitHub Actions",
  "circleci": "CircleCI",
  "circle ci": "CircleCI",
  "travis ci": "Travis CI",
  "travisci": "Travis CI",

  // ML / AI
  "tensorflow": "TensorFlow",
  "tensor flow": "TensorFlow",
  "pytorch": "PyTorch",
  "py torch": "PyTorch",
  "scikit-learn": "Scikit-learn",
  "scikit learn": "Scikit-learn",
  "sklearn": "Scikit-learn",
  "machine learning": "Machine Learning",
  "deep learning": "Deep Learning",
  "nlp": "NLP",
  "natural language processing": "NLP",
  "llm": "LLM",
  "large language models": "LLM",

  // Frontend
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  "sass": "Sass",
  "scss": "Sass",
  "styled components": "Styled Components",
  "styled-components": "Styled Components",
  "material ui": "Material UI",
  "material-ui": "Material UI",
  "mui": "Material UI",
  "bootstrap": "Bootstrap",
  "html5": "HTML",
  "css3": "CSS",
  "responsive design": "Responsive Design",

  // Testing
  "jest": "Jest",
  "mocha": "Mocha",
  "cypress": "Cypress",
  "playwright": "Playwright",
  "selenium": "Selenium",
  "vitest": "Vitest",
  "testing library": "Testing Library",
  "@testing-library": "Testing Library",
  "unit testing": "Unit Testing",
  "integration testing": "Integration Testing",
  "e2e testing": "E2E Testing",
  "end-to-end testing": "E2E Testing",

  // Auth
  "oauth": "OAuth",
  "oauth2": "OAuth 2.0",
  "oauth 2.0": "OAuth 2.0",
  "jwt": "JWT",
  "json web tokens": "JWT",
  "saml": "SAML",

  // Architecture
  "rest": "REST APIs",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  "restful": "REST APIs",
  "graphql": "GraphQL",
  "grpc": "gRPC",
  "websocket": "WebSockets",
  "websockets": "WebSockets",
  "web socket": "WebSockets",
  "microservices": "Microservices",
  "micro-services": "Microservices",
  "serverless": "Serverless",
  "lambda": "AWS Lambda",
  "aws lambda": "AWS Lambda",

  // Firebase & Google
  "firebase": "Firebase",
  "firebase auth": "Firebase Auth",
  "firestore": "Cloud Firestore",
  "cloud firestore": "Cloud Firestore",
  "google cloud run": "Cloud Run",
  "cloud run": "Cloud Run",
  "cloud functions": "Cloud Functions",
  "google cloud functions": "Cloud Functions",
  "pub/sub": "Pub/Sub",
  "pubsub": "Pub/Sub",
  "cloud storage": "Cloud Storage",
  "google cloud storage": "Cloud Storage",

  // Tools
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "bitbucket": "Bitbucket",
  "vscode": "VS Code",
  "vs code": "VS Code",
  "visual studio code": "VS Code",
  "vim": "Vim",
  "neovim": "Neovim",

  // Misc
  "agile": "Agile",
  "scrum": "Scrum",
  "kanban": "Kanban",
  "jira": "Jira",
  "confluence": "Confluence",
  "figma": "Figma",
  "sketch": "Sketch",
  "adobe xd": "Adobe XD",
  "linux": "Linux",
  "unix": "Unix",
  "bash": "Bash",
  "shell scripting": "Shell Scripting",
  "webpack": "Webpack",
  "vite": "Vite",
  "esbuild": "esbuild",
  "babel": "Babel",
  "npm": "npm",
  "yarn": "Yarn",
  "pnpm": "pnpm",
  "bun": "Bun",
  "web accessibility": "Web Accessibility",
  "wcag": "WCAG",
  "a11y": "Accessibility",
  "accessibility": "Accessibility",
  "seo": "SEO",
  "search engine optimization": "SEO",
  "pwa": "PWA",
  "progressive web app": "PWA",
  "single page application": "SPA",
  "spa": "SPA",
  "ssr": "SSR",
  "server-side rendering": "SSR",
  "ssg": "SSG",
  "static site generation": "SSG",
  "isr": "ISR",
  "incremental static regeneration": "ISR",
  "design systems": "Design Systems",
  "design system": "Design Systems",
  "performance optimization": "Performance Optimization",
  "web performance": "Performance Optimization",
};

// ---------------------------------------------------------------------------
// Canonical form mapping (display normalization)
// ---------------------------------------------------------------------------

const CANONICAL_DISPLAY: Record<string, string> = {
  react: "React",
  "react.js": "React",
  reactjs: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  "node.js": "Node.js",
  nodejs: "Node.js",
  "vue.js": "Vue.js",
  vuejs: "Vue.js",
  "express.js": "Express.js",
  expressjs: "Express.js",
  angular: "Angular",
  "angular.js": "Angular",
  angularjs: "Angular",
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  golang: "Go",
  go: "Go",
  "c#": "C#",
  "c++": "C++",
  "c": "C",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  ruby: "Ruby",
  php: "PHP",
  scala: "Scala",
  haskell: "Haskell",
  elixir: "Elixir",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  redis: "Redis",
  mysql: "MySQL",
  sqlite: "SQLite",
  dynamodb: "DynamoDB",
  cassandra: "Cassandra",
  elasticsearch: "Elasticsearch",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  jenkins: "Jenkins",
  graphql: "GraphQL",
  grpc: "gRPC",
  rest: "REST APIs",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  microservices: "Microservices",
  serverless: "Serverless",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  jest: "Jest",
  cypress: "Cypress",
  playwright: "Playwright",
  selenium: "Selenium",
  git: "Git",
  github: "GitHub",
  firebase: "Firebase",
  firestore: "Cloud Firestore",
  linux: "Linux",
  unix: "Unix",
};

// ---------------------------------------------------------------------------
// Seniority normalization
// ---------------------------------------------------------------------------

const SENIORITY_LEVELS: { level: string; rank: number; keywords: string[] }[] = [
  { level: "intern", rank: 0, keywords: ["intern", "internship", "trainee"] },
  { level: "junior", rank: 1, keywords: ["junior", "entry", "associate", "jr", "graduate"] },
  { level: "mid", rank: 2, keywords: ["mid", "mid-level", "intermediate"] },
  { level: "senior", rank: 3, keywords: ["senior", "sr", "experienced"] },
  { level: "lead", rank: 4, keywords: ["lead", "staff", "tech lead", "architect", "principle", "principal"] },
  { level: "manager", rank: 5, keywords: ["manager", "director", "vp", "head", "chief", "c-level"] },
];

export function normalizeSeniority(raw: string): string {
  const lower = raw.toLowerCase().trim();
  for (const { level, keywords } of SENIORITY_LEVELS) {
    if (keywords.some((kw) => lower.includes(kw))) return level;
  }
  // Default to "mid" if ambiguous
  return "mid";
}

// ---------------------------------------------------------------------------
// Education normalization
// ---------------------------------------------------------------------------

const DEGREE_HIERARCHY: Record<string, number> = {
  doctorate: 5,
  phd: 5,
  "doctor of philosophy": 5,
  doctor: 5,
  master: 4,
  "master's": 4,
  mba: 4,
  msc: 4,
  ms: 4,
  ma: 4,
  bachelor: 3,
  "bachelor's": 3,
  bs: 3,
  ba: 3,
  bsc: 3,
  btech: 3,
  "b.tech": 3,
  associate: 2,
  diploma: 2,
  "high school": 1,
  ged: 1,
};

export function normalizeDegree(raw: string): { level: string; rank: number } {
  const lower = raw.toLowerCase().trim();
  for (const [key, rank] of Object.entries(DEGREE_HIERARCHY)) {
    if (lower.includes(key)) {
      // Find canonical level name
      if (rank >= 5) return { level: "doctorate", rank };
      if (rank >= 4) return { level: "master", rank };
      if (rank >= 3) return { level: "bachelor", rank };
      if (rank >= 2) return { level: "associate", rank };
      return { level: "high_school", rank };
    }
  }
  return { level: "other", rank: 0 };
}

// ---------------------------------------------------------------------------
// Domain / technology field normalization
// ---------------------------------------------------------------------------

const DOMAIN_ALIASES: Record<string, string> = {
  "web development": "Web Development",
  webdev: "Web Development",
  "web dev": "Web Development",
  "backend development": "Backend Development",
  backend: "Backend Development",
  "front end": "Frontend Development",
  "front-end": "Frontend Development",
  frontend: "Frontend Development",
  "full stack": "Full-Stack Development",
  "full-stack": "Full-Stack Development",
  fullstack: "Full-Stack Development",
  "machine learning": "Machine Learning",
  ml: "Machine Learning",
  "artificial intelligence": "AI",
  ai: "AI",
  "data science": "Data Science",
  "data engineering": "Data Engineering",
  devops: "DevOps",
  "cloud computing": "Cloud Computing",
  mobile: "Mobile Development",
  "mobile development": "Mobile Development",
  "ios development": "iOS Development",
  "android development": "Android Development",
  cybersecurity: "Cybersecurity",
  "information security": "Information Security",
  "blockchain": "Blockchain",
  "embedded systems": "Embedded Systems",
  "game development": "Game Development",
  "database": "Database",
};

export function normalizeDomain(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  return DOMAIN_ALIASES[lower] || trimmed;
}

// ---------------------------------------------------------------------------
// Main skill normalization function
// ---------------------------------------------------------------------------

/**
 * Normalize a skill name to its canonical form.
 * Returns an object with both the canonical display name and
 * a lowercase key for deterministic comparison.
 */
export function normalizeSkill(raw: string): {
  canonical: string;
  key: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { canonical: "", key: "" };

  const lower = trimmed.toLowerCase();

  // Check alias map first
  const aliasTarget = SKILL_ALIASES[lower];
  if (aliasTarget) {
    return { canonical: aliasTarget, key: aliasTarget.toLowerCase() };
  }

  // Check canonical display map
  const canonical = CANONICAL_DISPLAY[lower];
  if (canonical) {
    return { canonical, key: canonical.toLowerCase() };
  }

  // Default: use trimmed original with lowercase key
  return { canonical: trimmed, key: lower };
}

/**
 * Extract all skill names from a ParsedResume into a single normalized list.
 */
export function extractResumeSkills(resume: {
  skills?: { technical?: string[]; tools?: string[]; frameworks?: string[] };
  experience?: { technologies?: string[] }[];
  projects?: { technologies?: string[] }[];
  certifications?: string[];
}): string[] {
  const skills = new Set<string>();

  if (resume.skills) {
    for (const s of resume.skills.technical ?? []) {
      if (s) skills.add(normalizeSkill(s).canonical);
    }
    for (const s of resume.skills.tools ?? []) {
      if (s) skills.add(normalizeSkill(s).canonical);
    }
    for (const s of resume.skills.frameworks ?? []) {
      if (s) skills.add(normalizeSkill(s).canonical);
    }
  }

  for (const exp of resume.experience ?? []) {
    for (const t of exp.technologies ?? []) {
      if (t) skills.add(normalizeSkill(t).canonical);
    }
  }

  for (const proj of resume.projects ?? []) {
    for (const t of proj.technologies ?? []) {
      if (t) skills.add(normalizeSkill(t).canonical);
    }
  }

  for (const cert of resume.certifications ?? []) {
    if (cert) skills.add(normalizeSkill(cert).canonical);
  }

  return Array.from(skills).filter(Boolean);
}

/**
 * Extract all skill names from a job posting into a single normalized list.
 */
export function extractJobSkills(job: {
  skills?: string[];
  parsedData?: {
    requiredSkills?: string[];
    preferredSkills?: string[];
    technologies?: string[];
    keywords?: string[];
  } | null;
}): { required: string[]; preferred: string[]; all: string[] } {
  const required = new Set<string>();
  const preferred = new Set<string>();

  if (job.parsedData) {
    for (const s of job.parsedData.requiredSkills ?? []) {
      if (s) required.add(normalizeSkill(s).canonical);
    }
    for (const s of job.parsedData.preferredSkills ?? []) {
      if (s) preferred.add(normalizeSkill(s).canonical);
    }
    for (const s of job.parsedData.technologies ?? []) {
      if (s) required.add(normalizeSkill(s).canonical);
    }
  }

  // Fallback: flat skills array treated as required
  if (job.skills) {
    for (const s of job.skills) {
      if (s) required.add(normalizeSkill(s).canonical);
    }
  }

  const all = new Set([...required, ...preferred]);
  return {
    required: Array.from(required),
    preferred: Array.from(preferred),
    all: Array.from(all),
  };
}

/**
 * Parse an experience requirement string (e.g. "5+ years") into a number.
 * Returns null if unparseable.
 */
export function parseExperienceRequirement(
  req: string | null | undefined,
): number | null {
  if (!req) return null;
  const match = req.match(/(\d+[\+]?)\s*year/i);
  if (!match) return null;
  return parseInt(match[1].replace("+", ""), 10);
}
