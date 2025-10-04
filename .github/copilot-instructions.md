# OWUI Playwright Presenton Automation - Copilot Instructions

This is a complete automation solution that extracts LLM responses from Open WebUI and automatically creates presentations in Presenton using Playwright.

## Project Overview

This Node.js/TypeScript project provides end-to-end automation for:
- Extracting responses from Open WebUI with UWAT knowledge selection
- Automatically creating presentations in Presenton
- Advanced button detection and workflow handling
- Browser management with extended wait times for review

## Key Features Implemented

- **UWAT Knowledge Integration**: Automatic selection of UWAT knowledge base before prompt submission
- **Advanced Button Detection**: 15-minute patient waiting for "Generate Presentation" button
- **Enhanced Browser Management**: 5-minute browser stay open on final presentation URL
- **Smart Workflow Handling**: Intelligent template selection and presentation generation
- **Robust Error Handling**: Extended debug periods and comprehensive logging

## Architecture

- `src/index.ts`: Main automation orchestrator
- `src/extractors/openwebui-extractor.ts`: Open WebUI interaction logic with UWAT knowledge selection
- `src/creators/presenton-creator.ts`: Presenton interaction logic with advanced button handling
- `src/types/presentation.ts`: TypeScript type definitions
- `tests/basic.spec.ts`: Playwright test suite

## Configuration

The project uses environment variables for configuration:
- Open WebUI: http://localhost:8080
- Presenton: http://localhost:5000
- Credentials: UWAT@sonalysts.com / password

## Usage

Run automation with: `npm run dev "Create a presentation about [topic] with [X] slides"`

The automation will:
1. Login to Open WebUI
2. Select UWAT knowledge
3. Submit prompt and extract response
4. Create presentation in Presenton
5. Handle template selection and button clicking
6. Keep browser open for 5 minutes for review

This project is production-ready and fully functional.