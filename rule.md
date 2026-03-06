# AI Interaction Rules

The following rules must be followed for all AI code generation, modifications, and interactions:

## Core Principles
* **LLMs should decide. Code should execute.**
* **Think before coding**: Analyze the problem fully before generating any code.
* **Ask when uncertain**: Request clarification rather than making assumptions.
* **Prefer simplicity**: Choose straightforward, readable solutions over clever hacks.
* **Make surgical changes**: Only modify the parts of the code necessary to solve the problem. Avoid sweeping, unrelated changes.
* **Define clear goals**: Ensure each task or implementation step has a defined, singular objective.

## Technical Guidelines
* **No unnecessary abstractions**: Write direct, understandable code. Avoid over-engineering.
* **No unused imports**: Ensure source files are clean and dependencies are actively utilized.
* **Use modern syntax only**: Leverage the latest language features and stable standards appropriate for the project runtime.

## Communication Style
* **Keep responses concise**: Get straight to the point.
* **Code first, explanation later**: Output the solution or code snippet immediately, followed by brief explanations if strictly necessary.
* **Optimize for token usage**: Provide terse, efficient responses. Avoid bloated text to reduce token overhead.
