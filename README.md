# OWUI Playwright Presenton Automation

A complete automation solution that extracts LLM responses from Open WebUI and automatically creates presentations in Presenton using Playwright.

## 🚀 Features

### ✅ Complete End-to-End Automation
- **Open WebUI Integration**: Automatic login, UWAT knowledge selection, and prompt submission
- **LLM Response Extraction**: Smart detection of response completion with follow-up question monitoring
- **Presenton Integration**: Automated presentation creation with template selection and button handling
- **UWAT Knowledge Support**: Automatic selection of UWAT knowledge base before prompt entry

### 🎯 Advanced Button Detection
- **15-minute patient waiting** for "Generate Presentation" button to become enabled
- **Immediate automatic clicking** when button transitions from "Loading..." to ready state
- **Visual verification** with checkmarks and background color changes for template selection
- **Intelligent fallback logic** for various button text variations

### ⏱️ Enhanced Browser Management
- **5-minute browser stay open** on final presentation URL for review
- **Real-time progress updates** with countdown timers
- **Automatic screenshots** at key workflow stages
- **Graceful error handling** with extended debug periods

### 🔧 Robust Workflow Handling
- **Smart URL detection** for different workflow stages
- **Template selection automation** with "General" template preference
- **Spinning wheel detection** to wait for presentation rendering completion
- **Multiple fallback strategies** for element detection

## 📋 Prerequisites

- Node.js (v16 or higher)
- Open WebUI running on `http://localhost:8080` (or configured URL)
- Presenton running on `http://localhost:5000` (or configured URL)
- UWAT knowledge base configured in Open WebUI

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
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

4. Create environment file (optional):
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
OPENWEBUI_URL=http://localhost:8080
PRESENTON_URL=http://localhost:5000
OPENWEBUI_EMAIL=UWAT@sonalysts.com
OPENWEBUI_PASSWORD=password
```

## 🚀 Usage

### Basic Usage
```bash
npm run dev "Create a presentation about AI in education with 5 slides"
```

### Available Scripts
- `npm run dev <prompt>` - Run the automation with a custom prompt
- `npm run build` - Build the TypeScript project
- `npm run test` - Run Playwright tests
- `npm start` - Run the built JavaScript

### Example Commands
```bash
# AI and Technology topics
npm run dev "Create a presentation about machine learning fundamentals with 4 slides"
npm run dev "Generate a presentation on cybersecurity best practices with 6 slides"

# Business and Strategy
npm run dev "Create a presentation about digital transformation with 5 slides"
npm run dev "Generate slides about project management methodologies"

# Education and Training
npm run dev "Create a training presentation about data analytics with 7 slides"
```

## 🏗️ Project Structure

```
├── src/
│   ├── index.ts                 # Main automation orchestrator
│   ├── extractors/
│   │   └── openwebui-extractor.ts   # Open WebUI interaction logic
│   ├── creators/
│   │   └── presenton-creator.ts     # Presenton interaction logic
│   └── types/
│       └── presentation.ts          # TypeScript type definitions
├── tests/
│   └── basic.spec.ts            # Playwright test suite
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot workspace instructions
├── package.json
├── playwright.config.ts         # Playwright configuration
├── tsconfig.json               # TypeScript configuration
└── README.md
```

## ⚙️ Configuration

### Environment Variables
- `OPENWEBUI_URL`: Open WebUI base URL (default: http://localhost:8080)
- `PRESENTON_URL`: Presenton base URL (default: http://localhost:5000)
- `OPENWEBUI_EMAIL`: Login email for Open WebUI
- `OPENWEBUI_PASSWORD`: Login password for Open WebUI

### Playwright Configuration
The automation is configured with:
- **Timeout Settings**: 5-minute total workflow timeout with 15-minute button waiting
- **Browser Options**: Chrome with no-sandbox for automation compatibility
- **Screenshot Capture**: Automatic screenshots at key workflow stages
- **Error Handling**: Extended debug periods with browser keep-alive

## 🔄 Workflow Steps

1. **Open WebUI Authentication**
   - Navigate to Open WebUI
   - Detect login requirements
   - Perform authentication with provided credentials

2. **UWAT Knowledge Selection**
   - Type `#` to trigger knowledge dropdown
   - Select "UWAT" knowledge base
   - Prepare prompt with knowledge context

3. **Prompt Submission and Response Extraction**
   - Submit prompt to LLM
   - Monitor for response completion using follow-up question detection
   - Extract generated content

4. **Presenton Presentation Creation**
   - Navigate to Presenton upload interface
   - Fill presentation data
   - Navigate through outline generation

5. **Template Selection and Generation**
   - Click "Select a Template" button
   - Select "General" template with visual verification
   - Wait for "Generate Presentation" button (up to 15 minutes)
   - Automatically click when button becomes enabled

6. **Final Presentation Review**
   - Wait for presentation rendering completion
   - Keep browser open for 5 minutes on final URL
   - Provide countdown updates for review period

## 🐛 Troubleshooting

### Common Issues

**Browser closes during automation:**
- Ensure no other processes are interfering with the browser
- Check that sufficient system resources are available

**"Generate Presentation" button timeout:**
- The button can take several minutes to become enabled (this is normal)
- The automation waits up to 15 minutes automatically

**UWAT knowledge not found:**
- Verify UWAT knowledge base is properly configured in Open WebUI
- Check that knowledge base is accessible with provided credentials

**Template selection fails:**
- Ensure Presenton is running and accessible
- Check network connectivity to localhost:5000

### Debug Information
The automation generates detailed logs and screenshots:
- `openwebui-response-complete.png` - LLM response completion
- `debug-generate-button-ready.png` - Button state before clicking
- `final-presentation-[timestamp].png` - Final presentation capture
- `completed-presentation-[timestamp].png` - Rendered presentation

## 🧪 Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- Basic Playwright functionality verification
- Element detection validation
- Workflow step verification

## 📚 Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes in appropriate modules
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

### Code Structure
- **Extractors**: Handle data extraction from source systems
- **Creators**: Handle data input and creation in target systems
- **Types**: TypeScript interfaces and type definitions
- **Tests**: Playwright test specifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Playwright**: For robust browser automation capabilities
- **Open WebUI**: For LLM interface and knowledge base integration
- **Presenton**: For AI-powered presentation generation
- **TypeScript**: For type-safe development experience

## 🔗 Related Projects

- [Open WebUI](https://github.com/open-webui/open-webui) - Open source LLM interface
- [Presenton](https://presenton.ai/) - AI presentation generator
- [Playwright](https://playwright.dev/) - Browser automation framework

---

**Note**: This automation requires both Open WebUI and Presenton to be running locally. Ensure both services are accessible before running the automation.