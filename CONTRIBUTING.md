# Contributing to CELMS

Thank you for your interest in contributing to the Campus Equipment Loan Management System! This document provides guidelines for contributing to this project.

## Code of Conduct

Please be respectful and considerate when participating in this project. We welcome contributors of all skill levels and backgrounds.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with a detailed description including:

1. Steps to reproduce the bug
2. Expected behavior
3. Actual behavior
4. Screenshots if applicable
5. Environment information (browser, OS, etc.)

### Feature Requests

If you have an idea for a new feature, please open an issue with:

1. A clear description of the feature
2. Any potential implementation approaches
3. Why this feature would be valuable to users

### Pull Requests

We welcome pull requests! To contribute code:

1. Fork the repository
2. Create a new branch for your feature/bugfix: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write or update tests as needed
5. Ensure the code lints and tests pass
6. Submit a pull request with a clear description of your changes

## Development Setup

Follow these steps to set up the project for development:

1. Clone the repository
2. Install backend dependencies: `cd celms-api && npm install`
3. Install frontend dependencies: `cd celms-client && npm install`
4. Set up the database with Docker: `docker-compose up -d`
5. Initialize the database: Run the SQL scripts as described in the README
6. Start the development servers:
   - Backend: `cd celms-api && npm run dev`
   - Frontend: `cd celms-client && npm start`

## Coding Standards

### JavaScript/React

- Follow the ESLint configuration included in the project
- Use ES6+ syntax where appropriate
- Use functional components with hooks in React
- Add JSDoc comments for functions and components
- Use camelCase for variables and functions
- Use PascalCase for component names
- Use UPPER_SNAKE_CASE for constants

### SQL

- Use UPPER_SNAKE_CASE for database identifiers
- Include comments for complex queries
- Use consistent indentation for readability

## Testing

- Write unit tests for utility functions
- Write component tests for React components
- Include API endpoint tests for backend routes

## Documentation

- Update documentation when adding or changing features
- Document API endpoints in the API.md file
- Keep code comments current and relevant

## Review Process

All pull requests will be reviewed by the project maintainers. We may suggest changes or improvements before merging.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license.
