---
name: flow-pattern-object-design
description: "Pattern object design — write a class for a concept as an object with affordances - one class that keeps a value, its representations and its operations. Use when you write or review a class that keeps one value, when a class has only static methods, when a method takes an argument that selects between two behaviours, when a caller needs a function outside a class to read or change its value, or when another skill sends code to a pattern object."
---
# Pattern Object Design

A **pattern object** is a class for one concept. The concept can be anything. `/flow-code-placement` decides when code goes to one.

These rules apply to server code. They do not apply to frontend code.

Write each pattern object as an **object with affordances**: keep one value, each representation of that value, and each operation on that value in one class. `Date` is an example.

These rules do not say how to build each kind of pattern object. Look at a class of the same kind in this codebase. If there is none, use the common way to write that kind of class.

Use these rules when you write a pattern object and when you review one.

## Rules

- A caller must not need a function outside the class to read, show, change, or compare the value. If a caller needs one, add it to the class as a method.
- Give each representation and each operation its own method. Do not add an argument that selects between two behaviours. `Date` has `toISOString()` and `toLocaleDateString()`. It does not have `toString(mode)`.
- Do not make a class that has only static methods. That class keeps no value. It is helper functions with a class name.
- Keep the defaults and the validation of the value in the class.
- Write the work of a method in the method. Do not split it into private methods to make it shorter. Add a private method only when its name says which part of the work it does.

## Hand back

Give these blocks. Omit a block that has nothing in it.

- **Objects to write** — each one with its file and its methods.
- **Rules broken** — each one with its file and the rule.
