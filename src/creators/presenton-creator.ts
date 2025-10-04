import { Page } from '@playwright/test';
import { PresentationData } from '../types/presentation';

export class PresentonCreator {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async createPresentation(data: PresentationData): Promise<void> {
    console.log('Creating presentation in Presenton...');
    
    try {
      // Navigate to Presenton
      await this.page.goto('http://localhost:5000/upload', { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);
      
      // Analyze the page and determine how to proceed
      await this.analyzeAndCreatePresentation(data);
      
    } catch (error) {
      console.error('Error creating presentation in Presenton:', error);
      
      // Try to take a screenshot for debugging
      try {
        await this.page.screenshot({ path: 'presenton-error.png', fullPage: true });
        console.log('Error screenshot saved: presenton-error.png');
      } catch (screenshotError) {
        console.log('Failed to take error screenshot:', screenshotError);
      }
      
      throw error;
    }
  }

  private async analyzeAndCreatePresentation(data: PresentationData): Promise<void> {
    console.log('Analyzing Presenton page...');
    
    // Get page title and URL for debugging
    const pageTitle = await this.page.title();
    const currentUrl = this.page.url();
    console.log('Current page:', pageTitle, 'at', currentUrl);
    
    // First, debug what's on the page
    await this.debugPageElements();
    
    // Try to handle different Presenton interfaces
    if (currentUrl.includes('/upload')) {
      console.log('Detected Presenton upload interface');
      await this.handlePresentonUploadInterface(data);
    } else {
      console.log('Detected Presenton main interface');
      await this.handlePresentonMainInterface(data);
    }
  }

  private async debugPageElements(): Promise<void> {
    // Debug: Find all buttons on the page
    const buttons = await this.page.$$('button');
    console.log('Found', buttons.length, 'buttons');
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const text = await buttons[i].textContent();
      const ariaLabel = await buttons[i].getAttribute('aria-label');
      console.log('Button', i, ':', text, '(aria-label:', ariaLabel, ')');
    }
    
    // Debug: Find all input fields
    const inputs = await this.page.$$('input, textarea');
    console.log('Found', inputs.length, 'input fields');
    
    for (let i = 0; i < Math.min(inputs.length, 3); i++) {
      const type = await inputs[i].getAttribute('type');
      const placeholder = await inputs[i].getAttribute('placeholder');
      console.log('Input', i, ': type=', type, 'placeholder=', placeholder);
    }
  }

  private async handlePresentonUploadInterface(data: PresentationData): Promise<void> {
    console.log('Handling Presenton upload interface...');
    
    // Look for text input areas where we can paste the content
    const textInputSelectors = [
      'textarea',
      'input[type="text"]',
      '.text-input',
      '.content-input',
      '[contenteditable="true"]',
      'input[placeholder*="text"]',
      'textarea[placeholder*="content"]'
    ];
    
    let inputFound = false;
    
    for (const selector of textInputSelectors) {
      try {
        const input = this.page.locator(selector);
        if (await input.count() > 0) {
          console.log('Found input element with selector:', selector);
          
          // Clear and fill the input
          await input.first().clear();
          const formattedData = this.formatDataForPresenton(data);
          await input.first().fill(formattedData);
          
          console.log('✅ Successfully filled input with presentation data');
          inputFound = true;
          
          // Wait a moment for the input to be processed
          await this.page.waitForTimeout(2000);
          break;
        }
      } catch (error) {
        console.log('Failed to use selector', selector, ':', error);
      }
    }
    
    if (!inputFound) {
      console.log('⚠️ No suitable input field found, trying alternative approach...');
      // If no input found, try to find file upload or other mechanisms
      await this.tryAlternativeUploadMethods(data);
    }
    
    // After filling input, look for and click the generate/create button
    await this.findAndClickGenerateButton();
    
    // Wait for presentation generation to complete
    await this.waitForPresentationGeneration();
  }

  private async tryAlternativeUploadMethods(data: PresentationData): Promise<void> {
    // Try to find file upload inputs
    const fileInputs = await this.page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      console.log('Found file upload input, but we need text input for our data');
    }
    
    // Look for any clickable elements that might reveal text inputs
    const actionButtons = [
      'button:has-text("Add Text")',
      'button:has-text("Paste Content")',
      'button:has-text("Input")',
      '.add-content',
      '.text-option'
    ];
    
    for (const buttonSelector of actionButtons) {
      try {
        const button = this.page.locator(buttonSelector);
        if (await button.count() > 0) {
          console.log('Found potential content button:', buttonSelector);
          await button.click();
          await this.page.waitForTimeout(2000);
          // After clicking, try the input selectors again
          return this.handlePresentonUploadInterface(data);
        }
      } catch (error) {
        console.log('Failed to click button', buttonSelector, ':', error);
      }
    }
  }

  private async handlePresentonMainInterface(data: PresentationData): Promise<void> {
    console.log('Handling Presenton main interface...');
    
    // Look for common Presenton interface elements
    const createButtons = [
      'button:has-text("Create")',
      'button:has-text("Generate")',
      'button:has-text("New")',
      'button:has-text("Start")',
      '.create-btn',
      '.generate-btn'
    ];
    
    for (const buttonSelector of createButtons) {
      try {
        const button = this.page.locator(buttonSelector);
        if (await button.count() > 0) {
          console.log('Found create button:', buttonSelector);
          await button.click();
          await this.page.waitForTimeout(2000);
          
          // After clicking, try the upload interface
          await this.handlePresentonUploadInterface(data);
          return;
        }
      } catch (error) {
        console.log('Failed to click button', buttonSelector, ':', error);
      }
    }
    
    // If no create button found, assume we're already in the right place
    await this.handlePresentonUploadInterface(data);
  }

  private formatDataForPresenton(data: PresentationData): string {
    // Format the presentation data in a way that Presenton can understand
    let formatted = '# ' + data.title + '\n\n';
    
    data.slides.forEach((slide, index) => {
      formatted += '## Slide ' + (index + 1) + ': ' + slide.title + '\n\n';
      formatted += slide.content + '\n\n';
    });
    
    return formatted;
  }

  private async findAndClickGenerateButton(): Promise<void> {
    console.log('Looking for generate/create button...');
    
    const generateButtons = [
      'button:has-text("Generate")',
      'button:has-text("Create")',
      'button:has-text("Build")',
      'button:has-text("Make")',
      'button:has-text("Process")',
      'button:has-text("Convert")',
      'button:has-text("Transform")',
      'button:has-text("Submit")',
      'button:has-text("Next")',
      'button[type="submit"]',
      '.generate-btn',
      '.create-btn',
      '.submit-btn',
      'button[aria-label*="Generate"]',
      'button[aria-label*="Create"]',
      'button[aria-label*="Next"]'
    ];
    
    for (const buttonSelector of generateButtons) {
      try {
        const button = this.page.locator(buttonSelector);
        if (await button.count() > 0) {
          console.log('Found generate button:', buttonSelector);
          
          // Check if the button is enabled
          const isEnabled = await button.first().isEnabled();
          console.log('Button enabled:', isEnabled);
          
          if (isEnabled) {
            await button.first().click();
            console.log('✅ Successfully clicked generate button');
            
            // Wait for the action to process
            await this.page.waitForTimeout(3000);
            return;
          } else {
            console.log('Button found but not enabled, continuing search...');
          }
        }
      } catch (error) {
        console.log('Failed to click generate button', buttonSelector, ':', error);
      }
    }
    
    console.log('No generate button found');
  }

  private async waitForPresentationGeneration(): Promise<void> {
    console.log('⏳ Waiting for presentation generation to complete...');
    
    // Step 1: Wait for outline generation
    console.log('🔄 Step 1: Waiting for outline generation...');
    await this.page.waitForTimeout(3000);
    
    // Wait for URL change to outline page
    const initialUrl = this.page.url();
    console.log('Initial URL:', initialUrl);
    
    // Wait up to 60 seconds for URL to change to outline page
    let outlineReady = false;
    for (let i = 0; i < 60; i++) {
      await this.page.waitForTimeout(1000);
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('/outline')) {
        console.log('✅ Outline page reached:', currentUrl);
        outlineReady = true;
        break;
      }
      
      if (i % 10 === 0 && i > 0) {
        console.log('⏳ Still waiting for outline generation... (' + i + 's)');
      }
    }
    
    if (!outlineReady) {
      console.log('⚠️ Outline page not detected, but continuing...');
    }
    
    // Step 2: Look for and handle template selection (only if we see template options)
    console.log('🎨 Step 2: Looking for template selection...');
    await this.handleTemplateSelectionWorkflow();
    
    // Step 3: Look for and click final "Generate Presentation" button
    console.log('� Step 3: Looking for final "Generate Presentation" button...');
    await this.findAndClickFinalGenerateButton();
    
    // Step 4: Wait for final presentation to be ready
    console.log('🎯 Step 4: Waiting for final presentation...');
    await this.waitForFinalPresentationReady();
    
    // Step 6: Click "Generate Presentation" at the bottom of the outline page
    console.log('� Step 6: Clicking "Generate Presentation" at bottom of outline page...');
    await this.clickGeneratePresentationOnOutlinePage();
    
    // Step 7: Wait for redirect to presentation page
    console.log('🔄 Step 7: Waiting for redirect to presentation page...');
    await this.waitForPresentationPageRedirect();
    
    // Step 8: Wait for spinning wheel to disappear on presentation page
    console.log('🎯 Step 8: Waiting for spinning wheel to disappear on presentation page...');
    await this.waitForSpinningWheelToDisappear();
  }

  private async waitForSelectTemplateButton(): Promise<void> {
    console.log('🔍 Waiting for "Loading..." button to change to "Select a Template" at bottom of outline page...');
    
    const maxWaitTime = 180000; // 3 minutes max wait for template button to become ready
    const startTime = Date.now();
    let templateButtonReady = false;
    
    while (Date.now() - startTime < maxWaitTime && !templateButtonReady) {
      // Always scroll to bottom to see the button at the bottom of the page
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait a moment for any content to settle after scrolling
      await this.page.waitForTimeout(1000);
      
      // Look specifically for the button at the bottom that changes from "Loading..." to "Select a Template"
      const bottomButtonSelectors = [
        'button:has-text("Loading")',
        'button:has-text("Loading...")', 
        'button:has-text("Select a Template")',
        'button:has-text("Select Template")',
        // Also check generic bottom buttons that might change state
        'button:last-child',
        'button:last-of-type'
      ];
      
      let foundLoadingButton = false;
      let foundSelectTemplateButton = false;
      
      // Check for the current state of the bottom button
      for (const selector of bottomButtonSelectors) {
        try {
          const buttons = this.page.locator(selector);
          const count = await buttons.count();
          
          if (count > 0) {
            // Check each button to see its current state
            for (let i = 0; i < count; i++) {
              const button = buttons.nth(i);
              const buttonText = await button.textContent();
              const isEnabled = await button.isEnabled();
              const isVisible = await button.isVisible();
              
              if (!buttonText || !isVisible) continue;
              
              const text = buttonText.trim().toLowerCase();
              
              // Check if this is the loading state
              if (text.includes('loading')) {
                foundLoadingButton = true;
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                if (elapsed % 10 === 0) {
                  console.log('⏳ Found "Loading..." button at bottom - waiting for it to change to "Select a Template"... (' + elapsed + 's elapsed)');
                }
                break;
              }
              
              // Check if this is the ready state (Select a Template) and it's enabled
              if ((text.includes('select') && text.includes('template')) && isEnabled) {
                console.log('✅ "Loading..." button has changed to "Select a Template" and is now clickable!');
                console.log('Button text: "' + buttonText + '", enabled: ' + isEnabled + ', selector: ' + selector);
                
                templateButtonReady = true;
                foundSelectTemplateButton = true;
                break;
              }
              
              // Also check if it's a "Select Template" button that's disabled (not ready yet)
              if ((text.includes('select') && text.includes('template')) && !isEnabled) {
                console.log('⏳ Found "Select a Template" button but it is disabled - waiting for it to become enabled...');
                break;
              }
            }
            
            if (foundSelectTemplateButton || foundLoadingButton) {
              break;
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (templateButtonReady) {
        break;
      }
      
      // If we haven't found either loading or template button, debug what's available
      if (!foundLoadingButton && !foundSelectTemplateButton) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 20 === 0 && elapsed > 0) {
          console.log('🔍 No loading or template button found yet - checking what buttons are available at bottom...');
          
          // Debug: Check what buttons are actually at the bottom of the page
          const debugInfo = await this.page.evaluate(() => {
            // Ensure we're at the bottom
            window.scrollTo(0, document.body.scrollHeight);
            
            const allButtons = Array.from(document.querySelectorAll('button'));
            const windowHeight = window.innerHeight;
            
            // Get buttons in the bottom 30% of the viewport
            const bottomButtons = allButtons.filter(btn => {
              const rect = btn.getBoundingClientRect();
              return rect.top > windowHeight * 0.7 && rect.bottom <= windowHeight;
            });
            
            // Also get the very last buttons on the page
            const lastButtons = allButtons.slice(-3);
            
            return {
              totalButtons: allButtons.length,
              bottomViewportButtons: bottomButtons.map(btn => ({
                text: btn.textContent?.trim(),
                enabled: !btn.disabled,
                visible: btn.offsetParent !== null,
                className: btn.className
              })).filter(btn => btn.text && btn.text.length > 0),
              lastButtons: lastButtons.map(btn => ({
                text: btn.textContent?.trim(),
                enabled: !btn.disabled,
                visible: btn.offsetParent !== null,
                className: btn.className
              })).filter(btn => btn.text && btn.text.length > 0),
              pageHeight: document.body.scrollHeight,
              windowHeight: window.innerHeight,
              currentScrollPosition: window.scrollY
            };
          });
          
          console.log('🔍 Debug - Bottom viewport buttons:', debugInfo.bottomViewportButtons);
          console.log('🔍 Debug - Last buttons on page:', debugInfo.lastButtons);
          console.log('📏 Page height:', debugInfo.pageHeight, 'Window height:', debugInfo.windowHeight);
        }
      }
      
      // Wait before checking again
      await this.page.waitForTimeout(2000);
    }
    
    if (!templateButtonReady) {
      console.log('⚠️ "Select a Template" button did not become ready within timeout');
      
      // Take a final screenshot for debugging
      try {
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await this.page.screenshot({ 
          path: 'debug-template-button-timeout.png', 
          fullPage: true 
        });
        console.log('📸 Debug screenshot saved: debug-template-button-timeout.png');
      } catch (error) {
        console.log('Failed to take debug screenshot:', error);
      }
    } else {
      console.log('✅ Template button state change completed successfully!');
    }
    
    // Additional wait to ensure the button state is stable
    await this.page.waitForTimeout(2000);
    console.log('✅ "Select a Template" button is ready for clicking');
  }

  private async clickSelectTemplateButton(): Promise<void> {
    console.log('🔘 Clicking the "Select a Template" button...');
    
    // Scroll to bottom to ensure we can see the button
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(1000);
    
    const selectTemplateSelectors = [
      'button:has-text("Select a Template")',
      'button:has-text("Select Template")',
      'button:has-text("Choose Template")',
      'button:has-text("Pick Template")'
    ];
    
    let buttonClicked = false;
    
    for (const selector of selectTemplateSelectors) {
      try {
        const button = this.page.locator(selector);
        const count = await button.count();
        
        if (count > 0) {
          const isEnabled = await button.first().isEnabled();
          const buttonText = await button.first().textContent();
          
          if (isEnabled) {
            console.log('✅ Found enabled "Select a Template" button: "' + buttonText + '"');
            await button.first().scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(500);
            await button.first().click();
            console.log('✅ Successfully clicked "Select a Template" button!');
            buttonClicked = true;
            await this.page.waitForTimeout(3000);
            break;
          }
        }
      } catch (error) {
        console.log('Select template button selector ' + selector + ' failed:', error);
      }
    }
    
    if (!buttonClicked) {
      console.log('⚠️ Failed to click "Select a Template" button');
    }
  }

  private async selectGeneralTemplate(): Promise<void> {
    console.log('🎨 Looking for "General" template to select...');
    
    const currentUrl = this.page.url();
    console.log('Current URL for template selection: ' + currentUrl);
    
    // Wait for templates to be visible
    await this.page.waitForTimeout(2000);
    
    // Take a screenshot to see what templates are available
    try {
      await this.page.screenshot({ 
        path: 'debug-before-template-selection.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot before template selection saved: debug-before-template-selection.png');
    } catch (error) {
      console.log('Failed to take pre-selection screenshot:', error);
    }
    
    // More comprehensive approach to find template elements
    let templateSelected = false;
    
    // Method 1: Look for template containers that contain "General" text
    console.log('🔍 Method 1: Looking for template containers with "General" text...');
    
    const templateContainerSelectors = [
      'div:has-text("General")',
      '.template-option:has-text("General")',
      '.template-card:has-text("General")',
      '.template-item:has-text("General")',
      '[data-template]:has-text("General")',
      'div[class*="template"]:has-text("General")'
    ];
    
    for (const containerSelector of templateContainerSelectors) {
      try {
        const containers = this.page.locator(containerSelector);
        const count = await containers.count();
        
        if (count > 0) {
          console.log('Found ' + count + ' template container(s) with "General" text using: ' + containerSelector);
          
          for (let i = 0; i < count; i++) {
            const container = containers.nth(i);
            const containerText = await container.textContent();
            
            if (containerText && containerText.toLowerCase().includes('general')) {
              console.log('Attempting to click template container: "' + containerText.trim() + '"');
              
              // Try clicking the container itself
              await container.click();
              await this.page.waitForTimeout(2000);
              
              // Check if selection was successful by looking for visual indicators
              const isSelected = await this.checkTemplateSelectionVisuals(container);
              if (isSelected) {
                console.log('✅ "General" template successfully selected with visual confirmation!');
                templateSelected = true;
                break;
              }
              
              // If container click didn't work, try clicking any button within it
              const buttonInContainer = container.locator('button').first();
              if (await buttonInContainer.count() > 0) {
                console.log('Trying to click button within template container...');
                await buttonInContainer.click();
                await this.page.waitForTimeout(2000);
                
                const isSelected = await this.checkTemplateSelectionVisuals(container);
                if (isSelected) {
                  console.log('✅ "General" template successfully selected via button click!');
                  templateSelected = true;
                  break;
                }
              }
            }
          }
          
          if (templateSelected) break;
        }
      } catch (error) {
        console.log('Template container selector ' + containerSelector + ' failed:', error);
      }
    }
    
    // Method 2: If Method 1 failed, look for clickable elements with "General" text
    if (!templateSelected) {
      console.log('🔍 Method 2: Looking for clickable elements with "General" text...');
      
      const clickableSelectors = [
        'button:has-text("General")',
        'div:has-text("General")',
        'span:has-text("General")',
        'a:has-text("General")',
        '[role="button"]:has-text("General")',
        '.clickable:has-text("General")'
      ];
      
      for (const selector of clickableSelectors) {
        try {
          const elements = this.page.locator(selector);
          const count = await elements.count();
          
          if (count > 0) {
            console.log('Found ' + count + ' clickable element(s) with "General" text using: ' + selector);
            
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              const elementText = await element.textContent();
              
              if (elementText && elementText.toLowerCase().includes('general')) {
                console.log('Clicking element: "' + elementText.trim() + '"');
                await element.click();
                await this.page.waitForTimeout(2000);
                
                // Check for visual selection indicators
                const isSelected = await this.checkTemplateSelectionVisuals(element);
                if (isSelected) {
                  console.log('✅ "General" template successfully selected!');
                  templateSelected = true;
                  break;
                }
              }
            }
            
            if (templateSelected) break;
          }
        } catch (error) {
          console.log('Clickable selector ' + selector + ' failed:', error);
        }
      }
    }
    
    // Method 3: If still not selected, try a more comprehensive search
    if (!templateSelected) {
      console.log('🔍 Method 3: Comprehensive search for any elements containing "General"...');
      
      const allGeneralElements = await this.page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        const generalElements = allElements.filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('general') && text.length < 100; // Avoid long text blocks
        });
        
        return generalElements.map((el, index) => ({
          index,
          tagName: el.tagName,
          textContent: el.textContent?.trim(),
          className: el.className,
          id: el.id,
          hasClickHandler: (el as any).onclick !== null,
          isVisible: (el as HTMLElement).offsetParent !== null
        })).filter(el => el.isVisible && el.textContent && el.textContent.length > 0);
      });
      
      console.log('Found ' + allGeneralElements.length + ' elements containing "General":', 
                  JSON.stringify(allGeneralElements.slice(0, 5), null, 2));
      
      if (allGeneralElements.length > 0) {
        // Try clicking the most promising element (prefer buttons, divs with classes)
        const sortedElements = allGeneralElements.sort((a, b) => {
          let scoreA = 0, scoreB = 0;
          if (a.tagName === 'BUTTON') scoreA += 10;
          if (b.tagName === 'BUTTON') scoreB += 10;
          if (a.className.includes('template')) scoreA += 5;
          if (b.className.includes('template')) scoreB += 5;
          return scoreB - scoreA;
        });
        
        const targetElement = sortedElements[0];
        console.log('Attempting to click most promising element:', JSON.stringify(targetElement, null, 2));
        
        const elementLocator = this.page.locator(targetElement.tagName).nth(targetElement.index);
        await elementLocator.click();
        await this.page.waitForTimeout(2000);
        
        const isSelected = await this.checkTemplateSelectionVisuals(elementLocator);
        if (isSelected) {
          console.log('✅ "General" template successfully selected via comprehensive search!');
          templateSelected = true;
        }
      }
    }
    
    if (!templateSelected) {
      console.log('⚠️ Failed to select "General" template - no suitable elements found or visual confirmation failed');
      
      // Take a debug screenshot
      try {
        await this.page.screenshot({ 
          path: 'debug-template-selection-failed.png', 
          fullPage: true 
        });
        console.log('📸 Template selection failure screenshot saved: debug-template-selection-failed.png');
      } catch (error) {
        console.log('Failed to take failure screenshot:', error);
      }
    } else {
      console.log('✅ "General" template selection completed successfully with visual confirmation!');
      
      // Take a screenshot showing the selected template
      try {
        await this.page.screenshot({ 
          path: 'debug-template-selected-confirmed.png', 
          fullPage: true 
        });
        console.log('📸 Selected template confirmation screenshot saved: debug-template-selected-confirmed.png');
      } catch (error) {
        console.log('Failed to take confirmation screenshot:', error);
      }
    }
  }

  private async checkTemplateSelectionVisuals(element: any): Promise<boolean> {
    console.log('🔍 Checking for visual template selection indicators (check mark and light blue background)...');
    
    try {
      // Check for visual indicators in the vicinity of the clicked element
      const visualIndicators = await this.page.evaluate(() => {
        // Look for check marks (✓, ✔, checkmark icons)
        const checkMarks = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent || '';
          const classes = el.className?.toString() || '';
          return text.includes('✓') || 
                 text.includes('✔') || 
                 text.includes('check') ||
                 classes.includes('check') ||
                 classes.includes('selected') ||
                 classes.includes('active');
        });
        
        // Look for elements with light blue background or selected styling
        const blueBackgrounds = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          const classes = el.className?.toString() || '';
          
          return bgColor.includes('rgb(173, 216, 230)') || // light blue
                 bgColor.includes('lightblue') ||
                 bgColor.includes('rgb(135, 206, 235)') || // sky blue
                 classes.includes('selected') ||
                 classes.includes('active') ||
                 style.border.includes('blue');
        });
        
        return {
          hasCheckMarks: checkMarks.length > 0,
          hasBlueBackgrounds: blueBackgrounds.length > 0,
          checkMarkElements: checkMarks.slice(0, 3).map(el => ({
            text: el.textContent?.trim(),
            className: el.className
          })),
          blueBackgroundElements: blueBackgrounds.slice(0, 3).map(el => ({
            className: el.className,
            backgroundColor: window.getComputedStyle(el).backgroundColor
          }))
        };
      });
      
      console.log('Visual indicators found:', JSON.stringify(visualIndicators, null, 2));
      
      const hasVisualConfirmation = visualIndicators.hasCheckMarks || visualIndicators.hasBlueBackgrounds;
      
      if (hasVisualConfirmation) {
        console.log('✅ Visual confirmation found - template appears to be selected');
      } else {
        console.log('⚠️ No visual confirmation found - template may not be properly selected');
      }
      
      return hasVisualConfirmation;
      
    } catch (error) {
      console.log('Error checking visual indicators:', error);
      return false;
    }
  }

  private async verifyTemplateSelection(): Promise<void> {
    console.log('✅ Verifying "General" template is selected with visual indicators...');
    
    // Wait a moment for any selection animations to complete
    await this.page.waitForTimeout(2000);
    
    // Use our visual checking method
    const hasVisualConfirmation = await this.checkTemplateSelectionVisuals(null);
    
    if (hasVisualConfirmation) {
      console.log('✅ Template selection verified - found check mark or light blue background!');
    } else {
      console.log('⚠️ Template selection could not be visually verified');
      
      // Try to find any selected template indicators
      const selectionInfo = await this.page.evaluate(() => {
        const selectedElements = Array.from(document.querySelectorAll('.selected, .active, [aria-selected="true"], [data-selected="true"]'));
        const checkedElements = Array.from(document.querySelectorAll('[aria-checked="true"], .checked, input[type="checkbox"]:checked'));
        
        return {
          selectedCount: selectedElements.length,
          checkedCount: checkedElements.length,
          selectedTexts: selectedElements.map(el => el.textContent?.trim()).filter(text => text && text.length < 50).slice(0, 3),
          checkedTexts: checkedElements.map(el => el.textContent?.trim()).filter(text => text && text.length < 50).slice(0, 3)
        };
      });
      
      console.log('🔍 Selection verification info:', JSON.stringify(selectionInfo, null, 2));
      
      if (selectionInfo.selectedCount > 0 || selectionInfo.checkedCount > 0) {
        console.log('✅ Found some selection indicators, proceeding...');
      }
    }
    
    // Take a verification screenshot
    try {
      await this.page.screenshot({ 
        path: 'debug-template-verification.png', 
        fullPage: true 
      });
      console.log('📸 Template verification screenshot saved: debug-template-verification.png');
    } catch (error) {
      console.log('Failed to take verification screenshot:', error);
    }
  }

  private async clickGeneratePresentationOnOutlinePage(): Promise<void> {
    console.log('🚀 Looking for "Generate Presentation" button specifically at bottom of outline page...');
    
    // Ensure we're on the outline page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/outline')) {
      console.log('⚠️ Warning: Not on outline page. Current URL: ' + currentUrl);
    } else {
      console.log('✅ Confirmed on outline page: ' + currentUrl);
    }
    
    // Scroll to the absolute bottom of the page to ensure we see the bottom button
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(2000);
    
    // More specific selectors for "Generate Presentation" button
    const specificGenerateSelectors = [
      'button:has-text("Generate Presentation")',
      'button:has-text("Create Presentation")',
      'button:has-text("Build Presentation")'
    ];
    
    let buttonClicked = false;
    
    // First, try the most specific "Generate Presentation" selectors
    for (const selector of specificGenerateSelectors) {
      try {
        const buttons = this.page.locator(selector);
        const count = await buttons.count();
        
        console.log('Found ' + count + ' button(s) with selector: ' + selector);
        
        if (count > 0) {
          // Examine each button to find the one at the absolute bottom
          for (let i = 0; i < count; i++) {
            const button = buttons.nth(i);
            const isEnabled = await button.isEnabled();
            const isVisible = await button.isVisible();
            const buttonText = await button.textContent();
            
            if (isEnabled && isVisible && buttonText) {
              console.log('Examining button ' + i + ': "' + buttonText.trim() + '"');
              
              // Check if this button is near the bottom of the page
              const buttonBox = await button.boundingBox();
              if (buttonBox) {
                const pageInfo = await this.page.evaluate(() => ({
                  scrollHeight: document.body.scrollHeight,
                  viewportHeight: window.innerHeight,
                  scrollY: window.scrollY
                }));
                
                // Calculate if button is in the bottom area of the page
                const buttonAbsoluteY = buttonBox.y + pageInfo.scrollY;
                const distanceFromBottom = pageInfo.scrollHeight - buttonAbsoluteY;
                
                console.log('Button position - Y: ' + buttonBox.y + ', Absolute Y: ' + buttonAbsoluteY + ', Distance from bottom: ' + distanceFromBottom);
                
                // Button should be within 200px of the bottom of the page
                if (distanceFromBottom <= 200) {
                  console.log('✅ Found "Generate Presentation" button at bottom of page: "' + buttonText.trim() + '"');
                  console.log('Distance from bottom: ' + distanceFromBottom + 'px');
                  
                  // Scroll the button into view and click it
                  await button.scrollIntoViewIfNeeded();
                  await this.page.waitForTimeout(1000);
                  
                  // Take a screenshot before clicking for verification
                  try {
                    await this.page.screenshot({ 
                      path: 'debug-before-generate-click.png', 
                      fullPage: true 
                    });
                    console.log('📸 Screenshot before click saved: debug-before-generate-click.png');
                  } catch (error) {
                    console.log('Failed to take pre-click screenshot:', error);
                  }
                  
                  await button.click();
                  console.log('✅ Successfully clicked "Generate Presentation" button at bottom of outline page!');
                  buttonClicked = true;
                  
                  // Wait for the action to process
                  await this.page.waitForTimeout(3000);
                  break;
                }
              }
            }
          }
          
          if (buttonClicked) break;
        }
      } catch (error) {
        console.log('Generate presentation selector ' + selector + ' failed:', error);
      }
    }
    
    // If specific selectors didn't work, try a more comprehensive search
    if (!buttonClicked) {
      console.log('🔍 Specific "Generate Presentation" buttons not found, trying comprehensive bottom search...');
      
      const allButtons = await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        
        const buttons = Array.from(document.querySelectorAll('button'));
        const pageHeight = document.body.scrollHeight;
        
        return buttons.map((btn, index) => {
          const rect = btn.getBoundingClientRect();
          const absoluteY = rect.top + window.scrollY;
          const distanceFromBottom = pageHeight - absoluteY;
          
          return {
            index,
            text: btn.textContent?.trim() || '',
            enabled: !btn.disabled,
            visible: btn.offsetParent !== null,
            className: btn.className || '',
            absoluteY,
            distanceFromBottom,
            nearBottom: distanceFromBottom <= 300
          };
        }).filter(btn => 
          btn.visible && 
          btn.enabled && 
          btn.text.length > 0 && 
          btn.nearBottom &&
          (btn.text.toLowerCase().includes('generate') || 
           btn.text.toLowerCase().includes('create') || 
           btn.text.toLowerCase().includes('build') ||
           btn.text.toLowerCase().includes('proceed') ||
           btn.text.toLowerCase().includes('continue'))
        ).sort((a, b) => a.distanceFromBottom - b.distanceFromBottom); // Closest to bottom first
      });
      
      console.log('🔍 Bottom buttons found:', JSON.stringify(allButtons, null, 2));
      
      if (allButtons.length > 0) {
        // Click the bottommost button that looks like a "Generate" action
        const targetButton = allButtons[0];
        console.log('🎯 Attempting to click bottommost generate-like button: "' + targetButton.text + '"');
        
        const buttonLocator = this.page.locator('button').nth(targetButton.index);
        await buttonLocator.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1000);
        await buttonLocator.click();
        console.log('✅ Clicked bottommost button: "' + targetButton.text + '"');
        buttonClicked = true;
        await this.page.waitForTimeout(3000);
      }
    }
    
    if (!buttonClicked) {
      console.log('⚠️ Failed to find and click "Generate Presentation" button at bottom of outline page');
      
      // Final debug: Take a screenshot to see the current state
      try {
        await this.page.screenshot({ 
          path: 'debug-generate-button-not-found.png', 
          fullPage: true 
        });
        console.log('📸 Debug screenshot saved: debug-generate-button-not-found.png');
      } catch (error) {
        console.log('Failed to take debug screenshot:', error);
      }
    } else {
      console.log('✅ Generate Presentation button click completed successfully');
    }
  }

  private async waitForPresentationPageRedirect(): Promise<void> {
    console.log('🔄 Waiting for redirect to presentation page (http://localhost:5000/presentation?id=...)...');
    
    const maxWaitTime = 60000; // 1 minute to wait for redirect
    const startTime = Date.now();
    let redirectDetected = false;
    
    while (Date.now() - startTime < maxWaitTime && !redirectDetected) {
      const currentUrl = this.page.url();
      
      // Check if we've been redirected to the presentation page
      if (currentUrl.includes('/presentation') && currentUrl.includes('id=')) {
        console.log('✅ Successfully redirected to presentation page: ' + currentUrl);
        redirectDetected = true;
        break;
      }
      
      // Log progress every 10 seconds
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        console.log('⏳ Still waiting for redirect to presentation page... (' + elapsed + 's elapsed)');
        console.log('📍 Current URL: ' + currentUrl);
      }
      
      await this.page.waitForTimeout(2000);
    }
    
    if (!redirectDetected) {
      console.log('⚠️ Redirect to presentation page timeout - current URL: ' + this.page.url());
    } else {
      console.log('✅ Presentation page redirect completed successfully!');
      
      // Wait for the page to start loading
      await this.page.waitForTimeout(3000);
    }
  }

  private async waitForSpinningWheelToDisappear(): Promise<void> {
    console.log('🎯 Waiting for spinning wheel to disappear on presentation page...');
    
    // First verify we're on the presentation page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/presentation')) {
      console.log('⚠️ Warning: Not on presentation page when waiting for spinner. Current URL: ' + currentUrl);
    } else {
      console.log('✅ Confirmed on presentation page: ' + currentUrl);
    }
    
    const maxWaitTime = 300000; // 5 minutes max wait for presentation rendering
    const startTime = Date.now();
    let renderingCompleted = false;
    
    // Common selectors for loading/spinning indicators
    const spinningWheelSelectors = [
      '.spinner',
      '.loading',
      '.loading-spinner',
      '.loader',
      '.loading-indicator',
      '.progress-spinner',
      '.circular-progress',
      '.rotating',
      '.spin',
      '[data-loading="true"]',
      '[aria-label*="loading"]',
      '[aria-label*="Loading"]',
      'svg[class*="spin"]',
      'div[class*="spin"]',
      '.fa-spinner',
      '.fa-circle-notch',
      // Material UI and common framework spinners
      '.MuiCircularProgress-root',
      '.ant-spin',
      '.chakra-spinner'
    ];
    
    while (Date.now() - startTime < maxWaitTime && !renderingCompleted) {
      let foundSpinner = false;
      
      // Check for any spinning wheels or loading indicators
      for (const selector of spinningWheelSelectors) {
        try {
          const spinners = this.page.locator(selector);
          const count = await spinners.count();
          
          if (count > 0) {
            // Check if any spinners are visible
            for (let i = 0; i < count; i++) {
              const spinner = spinners.nth(i);
              const isVisible = await spinner.isVisible();
              
              if (isVisible) {
                foundSpinner = true;
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                if (elapsed % 10 === 0) {
                  console.log('⏳ Spinning wheel still visible (selector: ' + selector + ') - waiting for completion... (' + elapsed + 's elapsed)');
                }
                break;
              }
            }
            
            if (foundSpinner) break;
          }
        } catch (error) {
          // Continue checking other selectors
        }
      }
      
      // If no spinner found, check if we've moved to a final presentation page
      if (!foundSpinner) {
        const currentUrl = this.page.url();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        
        // Check if we're on a presentation/slides page (indicates completion)
        if (currentUrl.includes('/presentation') || 
            currentUrl.includes('/slides') || 
            currentUrl.includes('/view') ||
            currentUrl.includes('/final') ||
            currentUrl.includes('/display')) {
          
          console.log('✅ No spinning wheel found and URL indicates presentation view: ' + currentUrl);
          renderingCompleted = true;
          break;
        }
        
        // Check for completed presentation content
        const hasSlideContent = await this.page.evaluate(() => {
          const slideSelectors = [
            '.slide',
            '.presentation-slide',
            '[data-slide]',
            '.slide-content',
            '.rendered-slide',
            '.ppt-slide',
            '.slideshow-slide'
          ];
          
          for (const selector of slideSelectors) {
            if (document.querySelectorAll(selector).length > 0) {
              return true;
            }
          }
          return false;
        });
        
        if (hasSlideContent) {
          console.log('✅ No spinning wheel found and slide content detected - rendering appears complete');
          renderingCompleted = true;
          break;
        }
        
        // Log status every 15 seconds when no spinner is found
        if (elapsed % 15 === 0 && elapsed > 0) {
          console.log('🔍 No spinning wheel found but no presentation content yet... (' + elapsed + 's elapsed)');
          console.log('📍 Current URL: ' + currentUrl);
          
          // Debug: Check what's on the page
          const pageDebugInfo = await this.page.evaluate(() => {
            const hasText = (text: string) => document.body.textContent?.toLowerCase().includes(text.toLowerCase()) || false;
            
            return {
              hasGeneratingText: hasText('generating') || hasText('creating') || hasText('building'),
              hasCompleteText: hasText('complete') || hasText('finished') || hasText('done'),
              hasErrorText: hasText('error') || hasText('failed') || hasText('problem'),
              visibleButtons: Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.offsetParent !== null
              ).slice(0, 5).map(btn => btn.textContent?.trim()).filter(text => text && text.length > 0)
            };
          });
          
          console.log('🔍 Page status:', JSON.stringify(pageDebugInfo, null, 2));
        }
      }
      
      // Wait before checking again
      await this.page.waitForTimeout(2000);
    }
    
    if (!renderingCompleted) {
      console.log('⚠️ Spinning wheel wait timeout reached - presentation may still be rendering');
    } else {
      console.log('✅ Spinning wheel has disappeared - presentation rendering appears complete!');
    }
    
    // Take a final screenshot to capture the completed presentation
    try {
      const timestamp = Date.now();
      await this.page.screenshot({ 
        path: 'completed-presentation-' + timestamp + '.png', 
        fullPage: true 
      });
      console.log('📸 Completed presentation screenshot saved: completed-presentation-' + timestamp + '.png');
    } catch (error) {
      console.log('Failed to take completed presentation screenshot:', error);
    }
    
    // Additional verification that presentation is ready
    await this.verifyPresentationCompletion();
    
    // IMPORTANT: Wait for 5 minutes on the final presentation to keep browser open
    await this.waitFiveMinutesOnFinalURL();
  }

  private async verifyPresentationCompletion(): Promise<void> {
    console.log('🔍 Verifying presentation completion...');
    
    const currentUrl = this.page.url();
    console.log('📍 Final URL: ' + currentUrl);
    
    // Check for presentation indicators
    const presentationInfo = await this.page.evaluate(() => {
      const slideSelectors = [
        '.slide',
        '.presentation-slide', 
        '[data-slide]',
        '.slide-content',
        '.rendered-slide'
      ];
      
      let slideCount = 0;
      let foundSlideSelector = '';
      
      for (const selector of slideSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          slideCount = elements.length;
          foundSlideSelector = selector;
          break;
        }
      }
      
      return {
        slideCount,
        foundSlideSelector,
        pageTitle: document.title,
        hasSlideContent: slideCount > 0,
        currentUrl: window.location.href
      };
    });
    
    if (presentationInfo.hasSlideContent) {
      console.log('✅ Presentation verification successful!');
      console.log('📊 Found ' + presentationInfo.slideCount + ' slides using selector: ' + presentationInfo.foundSlideSelector);
      console.log('📋 Page title: ' + presentationInfo.pageTitle);
    } else {
      console.log('⚠️ No slide content detected in final verification');
      console.log('📋 Page title: ' + presentationInfo.pageTitle);
    }
  }

  private async handleTemplateSelectionWorkflow(): Promise<void> {
    console.log('🔍 Checking if template selection is available...');
    
    // First check if we need to click "Select a Template" button
    const needsTemplateButtonClick = await this.page.evaluate(() => {
      const selectTemplateButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent?.toLowerCase().includes('select') && btn.textContent?.toLowerCase().includes('template')
      );
      return selectTemplateButtons.length > 0;
    });
    
    if (needsTemplateButtonClick) {
      console.log('📝 Found "Select a Template" button - clicking it...');
      await this.clickSelectTemplateButton();
      await this.page.waitForTimeout(3000);
    }
    
    // Now look for template options
    const hasTemplateOptions = await this.page.evaluate(() => {
      const generalTemplates = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.toLowerCase().includes('general') && el.textContent.length < 50
      );
      return generalTemplates.length > 0;
    });
    
    if (hasTemplateOptions) {
      console.log('🎨 Template options found - selecting "General" template...');
      await this.selectGeneralTemplateSimplified();
    } else {
      console.log('ℹ️ No template options found - skipping template selection');
    }
  }

  private async selectGeneralTemplateSimplified(): Promise<void> {
    console.log('🎯 Simplified approach to select "General" template...');
    
    // Simple approach: find anything clickable that contains "General"
    const templateSelected = await this.page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const generalElements = allElements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('general') && text.length < 100; // Avoid long text blocks
      });
      
      // Try to click the most suitable element
      for (const el of generalElements) {
        if (el.tagName === 'BUTTON' || el.tagName === 'DIV') {
          try {
            (el as HTMLElement).click();
            return true;
          } catch (e) {
            // Continue to next element
          }
        }
      }
      return false;
    });
    
    if (templateSelected) {
      console.log('✅ "General" template clicked successfully');
      await this.page.waitForTimeout(2000);
      
      // CRITICAL: Wait for "Generate Presentation" button to become clickable after template selection
      console.log('⏳ Waiting for "Generate Presentation" button to become clickable after template selection...');
      const buttonWasClicked = await this.waitForGeneratePresentationButtonToBeReady();
      
      if (buttonWasClicked) {
        console.log('✅ "Generate Presentation" button was already clicked during waiting - proceeding to presentation generation');
      } else {
        console.log('⚠️ Button was not clicked during waiting - will attempt to click it in next step');
      }
      
    } else {
      console.log('⚠️ Could not click "General" template - continuing anyway');
    }
  }

  private async waitForGeneratePresentationButtonToBeReady(): Promise<boolean> {
    console.log('🕐 Waiting for "Loading..." button to change to "Generate Presentation" and become enabled...');
    console.log('⚠️  Note: This can take SEVERAL MINUTES (up to 15 minutes) - the presentation will NEVER auto-generate!');
    console.log('⚠️  The automation will be VERY PATIENT and wait as long as needed!');
    
    const maxWaitTime = 900000; // 15 minutes max wait for button to become ready
    const startTime = Date.now();
    let buttonReady = false;
    let buttonClicked = false;
    
    while (Date.now() - startTime < maxWaitTime && !buttonClicked) {
      // Check for the loading button that should change to "Generate Presentation"
      const buttonStates = await this.page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map(btn => ({
          text: btn.textContent?.trim(),
          enabled: !btn.disabled,
          visible: btn.offsetParent !== null
        })).filter(btn => btn.text && btn.visible);
      });
      
      // Look for a button that is either:
      // 1. Shows "Generate Presentation" and is enabled
      // 2. Was "Loading..." but now shows different text and is enabled
      let foundGenerateButton = false;
      let foundLoadingButton = false;
      
      for (const btnState of buttonStates) {
        const text = btnState.text.toLowerCase();
        
        // Check if we found the target "Generate Presentation" button
        if ((text.includes('generate') && text.includes('presentation')) ||
            (text.includes('create') && text.includes('presentation')) ||
            (text.includes('build') && text.includes('presentation'))) {
          if (btnState.enabled) {
            console.log('✅ "Generate Presentation" button is now ready: "' + btnState.text + '"');
            foundGenerateButton = true;
            buttonReady = true;
            
            // IMMEDIATELY click the button since it will NEVER auto-generate!
            console.log('🚀 IMMEDIATELY clicking "Generate Presentation" button - it will NEVER auto-generate!');
            try {
              const buttons = await this.page.locator('button').all();
              for (const button of buttons) {
                const buttonText = await button.textContent();
                if (buttonText && buttonText.trim() === btnState.text) {
                  await button.scrollIntoViewIfNeeded();
                  await this.page.waitForTimeout(1000);
                  await button.click();
                  console.log('✅ Successfully clicked "Generate Presentation" button: "' + btnState.text + '"');
                  buttonClicked = true;
                  buttonReady = true;
                  await this.page.waitForTimeout(3000);
                  break;
                }
              }
            } catch (error) {
              console.log('❌ Error clicking button immediately:', error);
            }
            
            break;
          } else {
            console.log('⏳ Found "Generate Presentation" button but still disabled: "' + btnState.text + '"');
          }
        }
        
        // Track if we still see a loading button
        if (text.includes('loading')) {
          foundLoadingButton = true;
        }
      }
      
      if (!buttonClicked) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 60 === 0 && elapsed > 0) { // Log every 60 seconds (1 minute)
          const minutesElapsed = Math.floor(elapsed / 60);
          console.log('⏳ Still waiting for "Loading..." button to change to "Generate Presentation"... (' + minutesElapsed + ' minutes elapsed)');
          console.log('💡 Remember: This can take SEVERAL MINUTES and will NEVER auto-generate!');
          
          if (foundLoadingButton) {
            console.log('📍 Status: Still showing "Loading..." button');
          } else if (foundGenerateButton) {
            console.log('📍 Status: Found "Generate Presentation" button but it\'s disabled');
          } else {
            console.log('📍 Status: No relevant buttons found yet');
          }
          
          console.log('🔍 Current buttons:', JSON.stringify(buttonStates.slice(0, 6), null, 2));
        }
        
        await this.page.waitForTimeout(10000); // Check every 10 seconds instead of 5
      }
    }
    
    if (!buttonClicked) {
      console.log('⚠️ "Generate Presentation" button wait timeout after 15 minutes');
      console.log('🔄 This is unusual - the button should normally become ready within several minutes');
      
      // Try to find any button that might work as a fallback
      console.log('🔍 Looking for any potentially usable buttons as fallback...');
      
      const fallbackButtons = await this.page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map((btn, index) => ({
          index,
          text: btn.textContent?.trim(),
          enabled: !btn.disabled,
          visible: btn.offsetParent !== null,
          className: btn.className
        })).filter(btn => btn.text && btn.visible);
      });
      
      console.log('🔍 All available buttons:', JSON.stringify(fallbackButtons, null, 2));
      
    } else {
      console.log('✅ "Generate Presentation" button was successfully clicked!');
      console.log('🎉 The critical button clicking step is now COMPLETE!');
    }
    
    // Take a screenshot showing the ready state
    try {
      await this.page.screenshot({ 
        path: 'debug-generate-button-ready.png', 
        fullPage: true 
      });
      console.log('📸 Generate button ready screenshot saved: debug-generate-button-ready.png');
    } catch (error) {
      console.log('Failed to take ready state screenshot:', error);
    }
    
    return buttonClicked;
  }

  private async findAndClickFinalGenerateButton(): Promise<void> {
    console.log('🚀 Looking for final "Generate Presentation" button (should be ready after template selection)...');
    
    // Scroll to ensure we can see bottom buttons
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(1000);
    
    // Look for any button that might generate the final presentation
    const generateButtonSelectors = [
      'button:has-text("Generate Presentation")',
      'button:has-text("Create Presentation")',
      'button:has-text("Build Presentation")',
      'button:has-text("Generate")',
      'button:has-text("Create")',
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Proceed")',
      'button[type="submit"]'
    ];
    
    let buttonClicked = false;
    
    for (const selector of generateButtonSelectors) {
      try {
        const buttons = this.page.locator(selector);
        const count = await buttons.count();
        
        console.log('Checking selector "' + selector + '" - found ' + count + ' button(s)');
        
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const button = buttons.nth(i);
            const isEnabled = await button.isEnabled();
            const isVisible = await button.isVisible();
            const buttonText = await button.textContent();
            
            console.log('Button ' + i + ': "' + buttonText + '" (enabled: ' + isEnabled + ', visible: ' + isVisible + ')');
            
            if (isEnabled && isVisible && buttonText && buttonText.trim().length > 0) {
              console.log('✅ Found enabled button: "' + buttonText.trim() + '" - clicking...');
              
              // Scroll button into view and click
              await button.scrollIntoViewIfNeeded();
              await this.page.waitForTimeout(500);
              await button.click();
              
              console.log('✅ Button clicked successfully: "' + buttonText.trim() + '"');
              buttonClicked = true;
              await this.page.waitForTimeout(3000);
              break;
            }
          }
          
          if (buttonClicked) break;
        }
      } catch (error) {
        console.log('Button selector ' + selector + ' failed:', error);
      }
    }
    
    if (!buttonClicked) {
      console.log('⚠️ No suitable "Generate" button found - trying alternative approach...');
      
      // Alternative: look for any enabled button at bottom of page
      const bottomButtons = await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        
        const allButtons = Array.from(document.querySelectorAll('button'));
        const pageHeight = document.body.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        return allButtons.map((btn, index) => {
          const rect = btn.getBoundingClientRect();
          const absoluteY = rect.top + window.scrollY;
          const distanceFromBottom = pageHeight - absoluteY;
          
          return {
            index,
            text: btn.textContent?.trim() || '',
            enabled: !btn.disabled,
            visible: btn.offsetParent !== null,
            distanceFromBottom,
            nearBottom: distanceFromBottom <= 400
          };
        }).filter(btn => 
          btn.visible && 
          btn.enabled && 
          btn.text.length > 0 && 
          btn.nearBottom
        ).sort((a, b) => a.distanceFromBottom - b.distanceFromBottom);
      });
      
      console.log('🔍 Bottom buttons found:', JSON.stringify(bottomButtons, null, 2));
      
      if (bottomButtons.length > 0) {
        const targetButton = bottomButtons[0];
        console.log('🎯 Attempting to click closest bottom button: "' + targetButton.text + '"');
        
        const buttonLocator = this.page.locator('button').nth(targetButton.index);
        await buttonLocator.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1000);
        await buttonLocator.click();
        console.log('✅ Clicked bottom button: "' + targetButton.text + '"');
        buttonClicked = true;
        await this.page.waitForTimeout(3000);
      }
    }
    
    if (!buttonClicked) {
      console.log('⚠️ Still no suitable "Generate" button found - presentation may auto-generate');
    } else {
      console.log('✅ Generate button clicking completed');
    }
  }

  private async waitForFinalPresentationReady(): Promise<void> {
    console.log('🎯 Waiting for final presentation to be ready...');
    
    const maxWaitTime = 180000; // 3 minutes
    const startTime = Date.now();
    let presentationReady = false;
    
    while (Date.now() - startTime < maxWaitTime && !presentationReady) {
      const currentUrl = this.page.url();
      
      // Check if we've moved to a presentation page
      if (currentUrl.includes('/presentation') || currentUrl.includes('/slides') || currentUrl.includes('/view')) {
        console.log('✅ Presentation page reached: ' + currentUrl);
        presentationReady = true;
        break;
      }
      
      // Check for completed presentation content on current page
      const hasCompletedPresentation = await this.page.evaluate(() => {
        const slides = document.querySelectorAll('.slide, .presentation-slide, [data-slide]');
        const hasSlideContent = slides.length > 0;
        
        // Check for spinner absence (indicates completion)
        const spinners = document.querySelectorAll('.spinner, .loading, .loader, [class*="spin"]');
        const hasSpinners = Array.from(spinners).some(spinner => 
          (spinner as HTMLElement).offsetParent !== null
        );
        
        return hasSlideContent && !hasSpinners;
      });
      
      if (hasCompletedPresentation) {
        console.log('✅ Completed presentation content detected');
        presentationReady = true;
        break;
      }
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 15 === 0) {
        console.log('⏳ Still waiting for final presentation... (' + elapsed + 's elapsed)');
        console.log('📍 Current URL: ' + currentUrl);
      }
      
      await this.page.waitForTimeout(3000);
    }
    
    if (!presentationReady) {
      console.log('⚠️ Final presentation wait timeout');
    } else {
      console.log('✅ Final presentation appears ready!');
    }
    
    // Take final screenshot
    try {
      const timestamp = Date.now();
      await this.page.screenshot({ 
        path: 'final-presentation-' + timestamp + '.png', 
        fullPage: true 
      });
      console.log('📸 Final presentation screenshot saved: final-presentation-' + timestamp + '.png');
    } catch (error) {
      console.log('Failed to take final screenshot:', error);
    }
    
    // IMPORTANT: Wait for 5 minutes on the final presentation URL to keep browser open
    await this.waitFiveMinutesOnFinalURL();
  }

  private async waitFiveMinutesOnFinalURL(): Promise<void> {
    const currentUrl = this.page.url();
    
    // Only do the 5-minute wait if we're on a presentation URL
    if (currentUrl.includes('/presentation') || currentUrl.includes('/slides') || currentUrl.includes('/view')) {
      console.log('🕐 KEEPING BROWSER OPEN: Waiting 5 minutes on final presentation URL for review...');
      console.log('📍 Final presentation URL: ' + currentUrl);
      console.log('👀 You can now review the completed presentation in the browser!');
      console.log('⏰ Browser will automatically close after 5 minutes...');
      
      // Wait for 5 minutes (300 seconds) with progress updates
      for (let i = 0; i < 300; i++) {
        await this.page.waitForTimeout(1000);
        
        // Log progress every minute (60 seconds)
        if (i % 60 === 0 && i > 0) {
          const minutesElapsed = Math.floor(i / 60);
          const minutesRemaining = 5 - minutesElapsed;
          console.log(`⏰ Review time remaining: ${minutesRemaining} minute(s) (${minutesElapsed} minutes elapsed)`);
        }
      }
      
      console.log('✅ 5-minute review period completed');
      console.log('🎉 Browser will now close - automation fully completed!');
      
    } else {
      console.log('⚠️ Not on final presentation URL, skipping 5-minute wait');
      console.log('📍 Current URL: ' + currentUrl);
    }
  }

  private async waitForFinalPresentation(): Promise<void> {
    console.log('🎯 Waiting for final presentation to be rendered...');
    
    const maxWaitTime = 180000; // 3 minutes for final rendering
    const startTime = Date.now();
    
    let presentationCompleted = false;
    
    while (Date.now() - startTime < maxWaitTime && !presentationCompleted) {
      const currentUrl = this.page.url();
      
      // Check if we've moved to a final presentation view
      if (currentUrl.includes('/presentation') || 
          currentUrl.includes('/slides') || 
          currentUrl.includes('/view') ||
          currentUrl.includes('/final')) {
        
        console.log('✅ Final presentation URL detected: ' + currentUrl);
        
        // Wait for slides to be visible
        const slideSelectors = [
          '.slide',
          '.presentation-slide',
          '[data-slide]',
          '.slide-content',
          '.rendered-slide'
        ];
        
        for (const selector of slideSelectors) {
          try {
            const slides = this.page.locator(selector);
            const slideCount = await slides.count();
            
            if (slideCount > 0) {
              console.log('✅ Found ' + slideCount + ' rendered slides');
              presentationCompleted = true;
              break;
            }
          } catch (error) {
            // Continue checking other selectors
          }
        }
        
        if (presentationCompleted) {
          break;
        }
      }
      
      // If still on outline page, look for generation completion indicators
      if (currentUrl.includes('/outline')) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 15 === 0) {
          console.log('⏳ Still waiting for final presentation rendering... (' + elapsed + 's elapsed)');
          console.log('📍 Current: Outline Presentation at ' + currentUrl);
          
          // Check if there are any indicators that rendering is complete
          const hasRenderedContent = await this.page.evaluate(() => {
            return document.querySelectorAll('.slide, .presentation-slide, [data-slide]').length > 0;
          });
          
          console.log('📊 Has rendered content: ' + hasRenderedContent);
          
          if (hasRenderedContent) {
            presentationCompleted = true;
            break;
          }
          
          // Look for buttons that might complete the process
          console.log('📝 Still on outline page - checking for proceed options...');
          await this.checkForProceedOptions();
        }
      }
      
      await this.page.waitForTimeout(2000);
    }
    
    if (!presentationCompleted) {
      console.log('⚠️ Final presentation rendering timeout - but proceeding');
    } else {
      console.log('✅ Final presentation appears to be completed!');
      
      // Take a final screenshot
      try {
        const timestamp = Date.now();
        await this.page.screenshot({ 
          path: 'final-presentation-' + timestamp + '.png', 
          fullPage: true 
        });
        console.log('📸 Final presentation screenshot saved: final-presentation-' + timestamp + '.png');
      } catch (error) {
        console.log('Failed to take final screenshot:', error);
      }
    }
  }

  private async checkForProceedOptions(): Promise<void> {
    const proceedSelectors = [
      'button:has-text("Generate")',
      'button:has-text("Create")',
      'button:has-text("Render")',
      'button:has-text("Build")',
      'button:has-text("Finish")',
      'button:has-text("Complete")',
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button[type="submit"]'
    ];
    
    for (const selector of proceedSelectors) {
      try {
        const button = this.page.locator(selector);
        if (await button.count() > 0) {
          const isEnabled = await button.first().isEnabled();
          const buttonText = await button.first().textContent();
          
          if (isEnabled) {
            console.log('🔘 Found enabled proceed button: "' + buttonText + '" - clicking...');
            await button.first().click();
            await this.page.waitForTimeout(3000);
            return;
          } else {
            console.log('🔘 Found disabled proceed button: "' + buttonText + '"');
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
  }
}