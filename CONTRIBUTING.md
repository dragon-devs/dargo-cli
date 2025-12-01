# Contributing to dargo-cli

Thank you for considering contributing to **dargo-cli**.\
This project aims to provide a reliable, production-grade deployment
tool for Next.js applications running on Debian-based VPS servers. High
code quality, stability, and clarity are essential.

------------------------------------------------------------------------

## 1. Code of Conduct

By contributing to this repository, you agree to maintain a respectful,
collaborative environment. Low-effort, spammy, or disrespectful
contributions will be rejected.

------------------------------------------------------------------------

## 2. How You Can Contribute

-   Report bugs\
-   Suggest features\
-   Improve documentation\
-   Add stable enhancements\
-   Test on different VPS providers and environments\
-   Review and refine CLI logic

------------------------------------------------------------------------

## 3. Getting Started

### Clone the repository

``` bash
git clone https://github.com/dragon-devs/dargo-cli.git
cd dargo-cli
```

### Install dependencies

``` bash
pnpm install
```

### Run the CLI locally

``` bash
pnpm dev
```

### Build the package

``` bash
pnpm build
```

------------------------------------------------------------------------

## 4. Branching Strategy

-   `main` → stable releases\
-   `dev` → active development

Use the following naming conventions:

-   Features: `feature/<short-description>`
-   Bugfixes: `fix/<issue-number-or-summary>`

Always branch off **dev**, never from main.

------------------------------------------------------------------------

## 5. Commit Guidelines

Use conventional commit messages:

    feat: add new deploy flag
    fix: resolve env push timeout issue
    docs: improve provisioning documentation
    refactor: simplify Nginx config generation
    chore: update dependencies

Avoid vague messages like "update code" or "fix stuff".

------------------------------------------------------------------------

## 6. Pull Requests

Before opening a PR:

1.  Sync your branch with `dev`

2.  Run checks:

    ``` bash
    pnpm lint
    pnpm build
    ```

3.  Ensure your update is tested

4.  Provide a clear explanation

### PR Requirements

-   Descriptive title\
-   Detailed rationale\
-   Logs or screenshots when relevant\
-   Linked issues (if applicable)\
-   One focused purpose per PR

Unstable or untested deployment-related PRs will be rejected.

------------------------------------------------------------------------

## 7. Reporting Issues

Include the following to avoid delays:

-   dargo-cli version\
-   Node.js version\
-   Local OS + server OS\
-   Full error logs\
-   Steps to reproduce

Issues with insufficient details may be closed.

------------------------------------------------------------------------

## 8. Feature Requests

Before proposing:

-   Search existing issues\
-   Justify why the feature is needed\
-   Stay aligned with the tool's philosophy: **minimal,
    production-grade, and practical**

------------------------------------------------------------------------

## 9. Testing Your Changes

Please validate the major commands:

-   `dargo deploy`\
-   `dargo env push` / `dargo env pull`\
-   `dargo logs`\
-   `dargo ssh`\
-   `dargo rollback`\
-   Provisioning on a fresh VPS

Deployment-related PRs must include evidence of testing.

------------------------------------------------------------------------

## 10. License

By submitting a contribution, you agree your code is licensed under the
MIT License and may be modified by project maintainers.

------------------------------------------------------------------------

## 11. Need Help?

Open an issue or start a discussion on GitHub.\
Your contributions help strengthen the tool for everyone.
