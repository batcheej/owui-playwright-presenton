# Quick Setup Guide for New Computer

## Prerequisites
- Node.js 18+ installed
- Open WebUI running on http://localhost:8080
- Presenton running on http://localhost:5000

## Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/owui-playwright-presenton.git
cd owui-playwright-presenton
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. Copy environment configuration:
```bash
cp .env.example .env
```

5. Update `.env` file with your credentials if different from defaults

## Quick Test

Run the automation:
```bash
npm run dev "Create a presentation about renewable energy with 5 slides"
```

## Troubleshooting

- Ensure Open WebUI and Presenton are running before starting automation
- Check that UWAT knowledge is available in Open WebUI
- Verify credentials in `.env` file match your setup

## Repository Contents

All code is production-ready and includes:
- ✅ Complete automation workflow
- ✅ UWAT knowledge integration
- ✅ Advanced button detection (15-minute timeout)
- ✅ 5-minute browser stay-open for review
- ✅ Comprehensive error handling and logging