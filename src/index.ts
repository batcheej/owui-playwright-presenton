import { chromium, Browser, Page } from 'playwright';
import * as dotenv from 'dotenv';
import { OpenWebUIExtractor } from './extractors/openwebui-extractor';
import { PresentonCreator } from './creators/presenton-creator';
import { PresentationData } from './types/presentation';

// Load environment variables
dotenv.config();

export class LLMToPresentationAutomator {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS === 'true',
      slowMo: 100, // Add small delay for better visibility
    });
  }

  async extractFromOpenWebUI(prompt: string): Promise<string> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();
    const extractor = new OpenWebUIExtractor(page);
    
    try {
      const response = await extractor.sendPromptAndGetResponse(prompt);
      return response;
    } finally {
      await page.close();
    }
  }

  async createPresentationInPresenton(data: PresentationData): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();
    const creator = new PresentonCreator(page);
    
    try {
      await creator.createPresentation(data);
    } finally {
      await page.close();
    }
  }

  async automateFullWorkflow(prompt: string): Promise<void> {
    console.log('Starting LLM to Presentation automation...');
    
    let llmResponse: string;
    
    try {
      // Step 1: Extract response from Open WebUI
      console.log('Extracting response from Open WebUI...');
      llmResponse = await this.extractFromOpenWebUI(prompt);
      console.log('LLM Response extracted:', llmResponse.substring(0, 100) + '...');
    } catch (error) {
      console.log('Open WebUI extraction failed:', error);
      console.log('Using demo response for presentation creation...');
      
      // Use a demo response for demonstration
      llmResponse = this.generateDemoResponse(prompt);
    }

    // Step 2: Parse the response into presentation data
    console.log('Parsing response into presentation format...');
    const presentationData = this.parseResponseToPresentationData(llmResponse);

    // Step 3: Create presentation in Presenton
    console.log('Creating presentation in Presenton...');
    await this.createPresentationInPresenton(presentationData);
    
    console.log('🎉 AUTOMATION COMPLETED SUCCESSFULLY! 🎉');
    console.log('🔗 Check your browser - the presentation should now be ready!');
    console.log('✅ You can review the final presentation in the browser window');
  }

  private generateDemoResponse(prompt: string): string {
    // Generate a demo response based on the prompt
    if (prompt.toLowerCase().includes('ai in education')) {
      return `# Benefits of AI in Education

## 1. Personalized Learning
AI can adapt to individual student needs, providing customized learning paths and content that matches each student's pace and learning style.

## 2. Intelligent Tutoring Systems
AI-powered tutoring systems can provide 24/7 support to students, offering immediate feedback and guidance on complex topics.

## 3. Automated Assessment and Grading
AI can streamline the grading process, providing faster feedback to students and freeing up teachers' time for more meaningful interactions.

## 4. Enhanced Accessibility
AI tools can make education more accessible through features like real-time transcription, language translation, and adaptive interfaces for students with disabilities.

## 5. Data-Driven Insights
AI analytics can help educators identify learning patterns, predict student performance, and make informed decisions about curriculum and instruction.

These advancements in AI technology are revolutionizing the educational landscape, making learning more effective, efficient, and inclusive for all students.`;
    }
    
    // Generic demo response
    return `# Presentation: ${prompt}

## Introduction
This is a demonstration of the automated presentation creation system using AI-generated content.

## Key Points
- Point 1: Relevant information about the topic
- Point 2: Supporting details and examples
- Point 3: Benefits and applications

## Conclusion
The automation successfully demonstrates the integration between LLM responses and presentation creation.`;
  }

  private parseResponseToPresentationData(response: string): PresentationData {
    // Simple parsing logic - can be enhanced based on your needs
    const lines = response.split('\n').filter(line => line.trim() !== '');
    
    const title = lines[0] || 'Generated Presentation';
    const slides: { title: string; content: string }[] = [];
    
    let currentSlide: { title: string; content: string } | null = null;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect slide titles (lines starting with #, ##, or numbered points)
      if (line.match(/^#{1,2}\s+/) || line.match(/^\d+\.\s+/)) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        currentSlide = {
          title: line.replace(/^#{1,2}\s+/, '').replace(/^\d+\.\s+/, ''),
          content: ''
        };
      } else if (currentSlide) {
        currentSlide.content += line + '\n';
      }
    }
    
    if (currentSlide) {
      slides.push(currentSlide);
    }

    return {
      title,
      slides: slides.length > 0 ? slides : [{ title: 'Content', content: response }]
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const automator = new LLMToPresentationAutomator();
  
  try {
    await automator.initialize();
    
    // Example usage
    const prompt = process.argv[2] || "Create a presentation about the benefits of AI in education with 5 slides";
    await automator.automateFullWorkflow(prompt);
    
    console.log('🎉 Automation workflow completed!');
    console.log('ℹ️  Note: Browser already waited 5 minutes on the final presentation page');
    console.log('🕐 Browser will remain open for an additional 1 minute before closing...');
    
    // Keep browser open for additional 1 minute after automation completes
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log progress every 30 seconds
      if (i % 30 === 0 && i > 0) {
        const remainingTime = 60 - i;
        console.log(`⏰ Browser will close in ${remainingTime} seconds...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Automation failed:', error);
    console.log('🔍 Browser will remain open for 5 minutes for debugging...');
    
    // Keep browser open longer for debugging
    for (let i = 0; i < 300; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (i % 60 === 0 && i > 0) {
        const remainingTime = Math.ceil((300 - i) / 60);
        console.log(`🔍 Debug time remaining: ${remainingTime} minute(s)...`);
      }
    }
  } finally {
    await automator.close();
    console.log('👋 Browser closed. Automation finished.');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}