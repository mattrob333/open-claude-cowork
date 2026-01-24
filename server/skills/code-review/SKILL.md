---
name: Code Review
description: Thorough code review with security, performance, and best practices analysis
triggers:
  - "review this code"
  - "code review"
  - "check this code"
  - "review my code"
  - "analyze this code"
version: 1.0.0
author: open-claude-cowork
---

# Code Review Skill

## Overview
This skill enables comprehensive code review with focus on security, performance, maintainability, and best practices.

## Review Process

When reviewing code, systematically analyze the following areas:

### 1. Security Analysis
- Check for injection vulnerabilities (SQL, XSS, command injection)
- Validate input handling and sanitization
- Review authentication and authorization logic
- Check for sensitive data exposure
- Identify insecure dependencies
- Review error handling for information leakage

### 2. Performance Review
- Identify potential bottlenecks (N+1 queries, unnecessary loops)
- Check for memory leaks and resource cleanup
- Review algorithmic complexity
- Analyze caching opportunities
- Check for blocking operations in async contexts

### 3. Code Quality
- Adherence to language conventions and style guides
- Function/method length and complexity (cyclomatic complexity)
- Proper naming conventions
- Code duplication detection
- Dead code identification
- Comment quality and documentation

### 4. Architecture & Design
- SOLID principles compliance
- Separation of concerns
- Dependency management
- Error handling patterns
- Testing considerations
- Scalability implications

### 5. Best Practices
- Type safety (if applicable)
- Null/undefined handling
- Resource management (files, connections)
- Logging and observability
- Configuration management

## Output Format

Structure your review as follows:

```markdown
## Code Review Summary

### Critical Issues (Must Fix)
- Issue description with line references
- Suggested fix

### Warnings (Should Fix)
- Issue description with line references
- Suggested fix

### Suggestions (Nice to Have)
- Improvement opportunity
- Alternative approach

### Positive Observations
- Good practices observed
- Well-implemented patterns

### Security Checklist
- [ ] Input validation
- [ ] Authentication/Authorization
- [ ] Sensitive data handling
- [ ] Error handling
- [ ] Dependency security

### Recommended Actions
1. Priority action item
2. Secondary action item
```

## Guidelines

- Be specific with line numbers and code references
- Provide actionable feedback with examples
- Balance criticism with positive observations
- Consider the context and constraints
- Prioritize issues by severity and impact
- Offer alternative implementations when suggesting changes
