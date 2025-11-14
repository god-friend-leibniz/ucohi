# **ucohi**

## Table of content

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [Supported languages](#supported-languages)

## Introduction

ucohi is a VSCode plugin that highlights all functions that are defined but never called in your code

## Installation

### Requirements

- <kbd>VSCode >= 1.80.0</kbd>
- <kbd>nodejs</kbd>
- <kbd>vsce</kbd>: `npm install -g vsce`

### Cloning

Clone repository to desired folder

```Bash
git clone https://github.com/god-friend-leibniz/ucohi.git
```

### Building

Go to cloned directory

```Bash
cd ucohi
```

Install all dependencies

```Bash
npm install
```

Compile the project

```Bash
npm run compile
```

Generate extension installer (answer `y` on all questions)

```Bash
vsce package
```

### Embedding

Open VSCode, use <kbd>Ctrl+Shift+P</kbd> to open command panel and write
<kbd>Extensions: Install from VSIX...</kbd>
Choose the generated file

## Usage

At this point, ucohi will autostart on opening source code file inside the project
If you wanna manually run inspection, use <kbd>Ctrl+Shift+P</kbd> and type
Find Dead C++ Functions

## Supported languages

At this point, ucohi is able to inspect

- C/C++
