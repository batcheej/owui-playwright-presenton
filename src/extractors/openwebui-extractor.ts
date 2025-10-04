import { Page } from 'playwright';

export class OpenWebUIExtractor {
  constructor(private page: Page) {}

  async sendPromptAndGetResponse(prompt: string): Promise<string> {
    const openWebUIUrl = process.env.OPENWEBUI_URL || 'http://localhost:3000';
    
    // Navigate to Open WebUI
    await this.page.goto(openWebUIUrl);
    
    // Wait for the page to load
    await this.page.waitForLoadState('networkidle');
    
    // Check if login is required
    await this.handleLoginIfRequired();
    
    // Find and fill the chat input
    console.log('Looking for chat input field...');
    const chatInputSelectors = [
      'textarea[placeholder*="Send a message"]', 
      'textarea[placeholder*="Ask"]', 
      'input[type="text"][placeholder*="message"]',
      'textarea[placeholder*="Type"]',
      'textarea[placeholder*="Enter"]',
      'textarea[placeholder*="message"]',
      '.chat-input textarea',
      '.message-input textarea',
      '#chat-input',
      'textarea:not([placeholder*="search"]):not([placeholder*="Search"])',
      'input[type="text"]:not([placeholder*="search"]):not([placeholder*="Search"])',
      // More specific Open WebUI selectors
      'textarea.w-full',
      'textarea[rows]',
      'div[contenteditable="true"]'
    ];
    
    let inputFound = false;
    let usedSelector = '';
    
    for (const selector of chatInputSelectors) {
      try {
        const elements = this.page.locator(selector);
        if (await elements.count() > 0) {
          console.log(`Found chat input with selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          const element = elements.first();
          
          // Clear any existing text first
          await element.click();
          await element.fill('');
          await this.page.waitForTimeout(500);
          
          // Step 1: Select UWAT knowledge by typing # and selecting from dropdown
          console.log('🔍 Selecting UWAT knowledge...');
          await this.selectUWATKnowledge(element);
          
          // Step 2: Type the actual prompt after knowledge selection
          console.log('💬 Entering prompt after knowledge selection...');
          await element.type(prompt);
          
          inputFound = true;
          usedSelector = selector;
          console.log('✅ Successfully filled chat input with UWAT knowledge and prompt');
          break;
        }
      } catch (error) {
        console.log(`Selector ${selector} failed:`, error);
        continue;
      }
    }
    
    if (!inputFound) {
      throw new Error('Could not find chat input field. Available elements: ' + await this.page.evaluate(() => 
        Array.from(document.querySelectorAll('input, textarea')).map(el => {
          const element = el as HTMLInputElement | HTMLTextAreaElement;
          return element.tagName + (element.placeholder ? `[placeholder="${element.placeholder}"]` : '') + (element.className ? `.${element.className.split(' ').join('.')}` : '');
        }).join(', ')
      ));
    }
    
    // Send the message (look for send button or Enter key)
    console.log('Sending the message...');
    const sendButtonSelectors = [
      'button[type="submit"]', 
      'button:has-text("Send")', 
      'button[aria-label*="Send"]',
      'button[title*="Send"]',
      '.send-button',
      'button:has(svg)',
      'button[disabled=false]:last-child',
      // Open WebUI specific
      'button.bg-black',
      'button.rounded-lg'
    ];
    
    let messageSent = false;
    for (const selector of sendButtonSelectors) {
      try {
        const buttons = this.page.locator(selector);
        if (await buttons.count() > 0) {
          console.log(`Found send button with selector: ${selector}`);
          await buttons.first().click();
          messageSent = true;
          console.log('✅ Message sent via button click');
          break;
        }
      } catch (error) {
        console.log(`Send button selector ${selector} failed:`, error);
        continue;
      }
    }
    
    if (!messageSent) {
      // If no send button found, try pressing Enter on the input field
      console.log('No send button found, trying Enter key...');
      await this.page.keyboard.press('Enter');
      console.log('✅ Message sent via Enter key');
    }
    
    // Wait for the response to appear
    await this.waitForLLMResponse();
    
    // Extract the latest response
    const response = await this.extractLatestResponse();
    
    return response;
  }

  private async handleLoginIfRequired(): Promise<void> {
    // Wait longer for the page to fully load in WSL environments
    await this.page.waitForTimeout(5000);
    
    // Enhanced login detection for WSL compatibility
    const loginIndicators = [
      'input[type="email"]',
      'input[type="password"]',
      'text=Sign in',
      'text=Login',
      'button:has-text("Sign in")',
      'form[action*="login"]',
      '.login-form',
      '#login-form'
    ];
    
    const chatIndicators = [
      'textarea[placeholder*="Send a message"]',
      'textarea[placeholder*="Ask"]',
      'input[type="text"][placeholder*="message"]',
      'textarea[placeholder*="Type"]',
      'textarea[placeholder*="Enter"]',
      'textarea[placeholder*="message"]',
      '.chat-input',
      '.message-input',
      'textarea.w-full',
      'textarea[rows]',
      'div[contenteditable="true"]'
    ];
    
    console.log('🔍 Checking page state for login requirements...');
    
    // First, wait and check URL patterns that indicate login pages
    const currentUrl = this.page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth') || currentUrl.includes('/login') || currentUrl.includes('/signin')) {
      console.log('🔒 Login URL pattern detected');
      const username = process.env.OPENWEBUI_USERNAME;
      const password = process.env.OPENWEBUI_PASSWORD;
      
      if (username && password) {
        console.log('🔑 Attempting login with provided credentials...');
        await this.performLogin(username, password);
        return;
      } else {
        console.log('⚠️ No credentials provided, checking for signup...');
        await this.handleSignupIfNeeded();
        return;
      }
    }
    
    // Check for chat interface availability with retries for WSL
    let chatAvailable = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!chatAvailable && attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Attempt ${attempts}: Checking for chat interface...`);
      
      for (const indicator of chatIndicators) {
        try {
          const elements = await this.page.locator(indicator).count();
          if (elements > 0) {
            console.log(`✅ Chat interface found with selector: ${indicator}`);
            chatAvailable = true;
            break;
          }
        } catch (error) {
          // Continue checking other selectors
        }
      }
      
      if (!chatAvailable && attempts < maxAttempts) {
        console.log(`⏳ Chat interface not found, waiting before retry...`);
        await this.page.waitForTimeout(3000);
      }
    }
    
    if (chatAvailable) {
      console.log('✅ Chat interface detected, proceeding without login');
      return;
    }
    
    // Check for login elements with enhanced detection
    console.log('🔍 Chat interface not found, checking for login elements...');
    let loginRequired = false;
    
    for (const indicator of loginIndicators) {
      try {
        const elements = await this.page.locator(indicator).count();
        if (elements > 0) {
          console.log(`🔒 Login element found: ${indicator}`);
          loginRequired = true;
          break;
        }
      } catch (error) {
        // Continue checking other indicators
      }
    }
    
    if (loginRequired) {
      const username = process.env.OPENWEBUI_USERNAME;
      const password = process.env.OPENWEBUI_PASSWORD;
      
      if (username && password) {
        console.log('🔑 Login required, attempting to log in...');
        await this.performLogin(username, password);
      } else {
        console.log('⚠️ Login required but no credentials provided. Checking for signup option...');
        await this.handleSignupIfNeeded();
      }
    } else {
      console.log('❓ No clear login or chat indicators found, attempting to continue...');
      // Take a screenshot for debugging in WSL
      try {
        await this.page.screenshot({ path: './debug-login-state.png', fullPage: true });
        console.log('📸 Debug screenshot saved as debug-login-state.png');
      } catch (error) {
        console.log('Screenshot failed:', (error as Error).message);
      }
    }
  }

  private async performLogin(username: string, password: string): Promise<void> {
    try {
      console.log('🔑 Attempting login with provided credentials...');
      
      // Wait longer for login form to be fully loaded in WSL
      await this.page.waitForTimeout(3000);
      
      // Enhanced email/username field detection
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]',
        'input[placeholder*="username" i]',
        'input[placeholder*="Username" i]',
        '#email',
        '#username',
        '.email-input',
        '.username-input'
      ];
      
      let emailFilled = false;
      for (const selector of emailSelectors) {
        try {
          const emailInput = this.page.locator(selector).first();
          if (await emailInput.count() > 0 && await emailInput.isVisible()) {
            console.log(`📧 Found email field with selector: ${selector}`);
            await emailInput.click({ timeout: 5000 });
            await emailInput.fill(''); // Clear first
            await this.page.waitForTimeout(500);
            await emailInput.fill(username);
            console.log('✅ Email field filled successfully');
            emailFilled = true;
            break;
          }
        } catch (error) {
          console.log(`Email selector ${selector} failed, trying next...`);
        }
      }
      
      if (!emailFilled) {
        console.log('❌ No email field found');
      }
      
      // Enhanced password field detection
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        '.password-input'
      ];
      
      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          const passwordInput = this.page.locator(selector).first();
          if (await passwordInput.count() > 0 && await passwordInput.isVisible()) {
            console.log(`🔒 Found password field with selector: ${selector}`);
            await passwordInput.click({ timeout: 5000 });
            await passwordInput.fill(''); // Clear first
            await this.page.waitForTimeout(500);
            await passwordInput.fill(password);
            console.log('✅ Password field filled successfully');
            passwordFilled = true;
            break;
          }
        } catch (error) {
          console.log(`Password selector ${selector} failed, trying next...`);
        }
      }
      
      if (!passwordFilled) {
        console.log('❌ No password field found');
      }
      
      // Wait before attempting to submit
      await this.page.waitForTimeout(2000);
      
      // Enhanced login button detection and clicking
      const loginButtons = [
        'button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("LOG IN")',
        'input[type="submit"]',
        '.login-button',
        '.signin-button',
        '.btn-login',
        '#login-button',
        '#signin-button'
      ];
      
      let loginClicked = false;
      for (const selector of loginButtons) {
        try {
          const button = this.page.locator(selector);
          if (await button.count() > 0) {
            console.log(`🖱️ Attempting to click login button: ${selector}`);
            
            // Wait for button to be enabled
            await button.waitFor({ state: 'visible', timeout: 5000 });
            
            // Check if button is enabled
            const isEnabled = await button.isEnabled();
            if (isEnabled) {
              await button.click({ timeout: 5000 });
              console.log('✅ Login button clicked successfully');
              loginClicked = true;
              break;
            } else {
              console.log('⚠️ Button found but not enabled, trying next...');
            }
          }
        } catch (error) {
          console.log(`Login button ${selector} failed:`, (error as Error).message);
        }
      }
      
      if (!loginClicked) {
        console.log('⌨️ No clickable login button found, trying Enter key');
        await this.page.keyboard.press('Enter');
      }
      
      // Enhanced waiting for login completion with multiple checks
      console.log('⏳ Waiting for login to complete...');
      
      try {
        // Wait for network to settle
        await this.page.waitForLoadState('networkidle', { timeout: 20000 });
      } catch (error) {
        console.log('⚠️ Network idle timeout, continuing with login verification...');
      }
      
      // Wait a bit more for UI updates in WSL
      await this.page.waitForTimeout(5000);
      
      const successIndicators = [
        'textarea[placeholder*="Send"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="message"]',
        '.chat-interface',
        '.dashboard',
        '.main-content'
      ];
      
      let loginSuccess = false;
      for (const indicator of successIndicators) {
        if (await this.page.locator(indicator).count() > 0) {
          console.log(`✅ Login successful - found: ${indicator}`);
          loginSuccess = true;
          break;
        }
      }
      
      if (!loginSuccess) {
        // Check if we're still on login page
        if (await this.page.locator('input[type="password"]').count() > 0) {
          console.log('❌ Still on login page - login may have failed');
          
          // Check for error messages
          const errorSelectors = [
            '.error',
            '.alert-error',
            '[role="alert"]',
            '.login-error',
            '.error-message'
          ];
          
          for (const errorSelector of errorSelectors) {
            const errorElements = this.page.locator(errorSelector);
            if (await errorElements.count() > 0) {
              const errorText = await errorElements.first().textContent();
              console.log('Login error:', errorText);
            }
          }
        } else {
          console.log('✅ Login appears successful (no longer on login page)');
        }
      }
      
      console.log('Login attempt completed');
    } catch (error) {
      console.log('Login failed with error:', error);
      // Continue anyway, maybe there's a way to access without login
    }
  }

  private async handleSignupIfNeeded(): Promise<void> {
    // Check if there's a signup option
    const signupButtons = [
      'button:has-text("Sign up")',
      'a:has-text("Sign up")',
      'button:has-text("Create account")',
      'a:has-text("Create account")',
      'button:has-text("Register")'
    ];
    
    for (const buttonSelector of signupButtons) {
      try {
        const button = this.page.locator(buttonSelector);
        if (await button.count() > 0) {
          console.log('Found signup option, attempting to create account...');
          await button.click();
          await this.page.waitForTimeout(2000);
          
          // Try to fill signup form with default credentials
          const defaultEmail = 'test@example.com';
          const defaultPassword = 'password123';
          
          // Fill email
          const emailInput = this.page.locator('input[type="email"], input[name="email"]').first();
          if (await emailInput.count() > 0) {
            await emailInput.fill(defaultEmail);
          }
          
          // Fill password
          const passwordInputs = this.page.locator('input[type="password"]');
          if (await passwordInputs.count() > 0) {
            await passwordInputs.first().fill(defaultPassword);
            
            // If there's a confirm password field
            if (await passwordInputs.count() > 1) {
              await passwordInputs.nth(1).fill(defaultPassword);
            }
          }
          
          // Submit signup form
          const submitButton = this.page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create")').first();
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await this.page.waitForLoadState('networkidle');
            console.log('Signup attempted with test credentials');
          }
          
          return;
        }
      } catch (error) {
        console.log(`Signup button ${buttonSelector} failed:`, error);
        continue;
      }
    }
    
    console.log('No signup option found');
  }

  private async waitForLLMResponse(): Promise<void> {
    console.log('⏳ Waiting for LLM response...');
    
    // Wait for the message to be sent (indicated by input being cleared or disabled)
    await this.page.waitForTimeout(2000);
    
    // Look for indicators that a response is being generated
    const generatingIndicators = [
      '.loading',
      '.spinner',
      '.generating',
      '[data-testid="loading"]',
      '.message.generating',
      '.response.generating',
      // Open WebUI specific indicators
      '.animate-pulse',
      '.animate-spin'
    ];
    
    // Wait for generation to start (optional)
    for (const indicator of generatingIndicators) {
      try {
        await this.page.waitForSelector(indicator, { timeout: 5000 });
        console.log(`🔄 Response generation started (found: ${indicator})`);
        break;
      } catch {
        // Continue - generation might start without visible indicator
      }
    }
    
    // NEW: Wait for follow-up questions to appear (indicates response is complete)
    console.log('🔍 Waiting for follow-up questions to appear (indicates response completion)...');
    
    const followUpSelectors = [
      // Look for follow-up questions containers
      '[data-testid="followup"]',
      '.followup',
      '.follow-up',
      '.suggested-questions',
      '.follow-up-questions',
      '.suggestions',
      // Look for buttons with question-like text
      'button:has-text("?")',
      'button[class*="follow"]',
      'button[class*="suggest"]',
      // General question/suggestion patterns
      'div:has-text("Follow up")',
      'div:has-text("Suggested")',
      'div:has-text("Questions")',
      // Open WebUI specific patterns
      '.message + .suggestions',
      '.response + .follow-up'
    ];
    
    let followUpFound = false;
    const maxWaitTime = 120000; // 2 minutes max wait for response completion
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime && !followUpFound) {
      // Check for follow-up questions
      for (const selector of followUpSelectors) {
        try {
          const elements = this.page.locator(selector);
          if (await elements.count() > 0) {
            console.log(`✅ Follow-up questions found with selector: ${selector}`);
            followUpFound = true;
            break;
          }
        } catch (error) {
          // Continue checking other selectors
        }
      }
      
      if (followUpFound) {
        break;
      }
      
      // Also check if generation indicators have disappeared (fallback)
      let generationCompleted = true;
      for (const indicator of generatingIndicators) {
        try {
          const elements = this.page.locator(indicator);
          if (await elements.count() > 0) {
            generationCompleted = false;
            break;
          }
        } catch {
          // Continue
        }
      }
      
      if (generationCompleted) {
        // Additional check: look for any content that suggests questions/suggestions
        const pageText = await this.page.evaluate(() => document.body.textContent?.toLowerCase() || '');
        if (pageText.includes('follow') || pageText.includes('suggest') || pageText.includes('question')) {
          console.log('✅ Response appears complete (follow-up content detected in page text)');
          followUpFound = true;
          break;
        }
      }
      
      // Wait 2 seconds before checking again
      await this.page.waitForTimeout(2000);
      
      // Log progress every 15 seconds
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 15 === 0 && elapsed > 0) {
        console.log(`⏳ Still waiting for LLM response completion (${elapsed}s elapsed)...`);
        
        // Debug: Check for any new content on the page
        const debugInfo = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button')).slice(0, 10);
          const hasLoadingElements = document.querySelectorAll('.loading, .spinner, .generating, .animate-pulse, .animate-spin').length > 0;
          
          return {
            buttonTexts: buttons.map(btn => btn.textContent?.trim()).filter(text => text && text.length > 0),
            hasLoadingElements,
            bodyTextSample: document.body.textContent?.substring(0, 200) || ''
          };
        });
        
        console.log('🔍 Debug - Buttons found:', debugInfo.buttonTexts);
        console.log('⚡ Loading elements present:', debugInfo.hasLoadingElements);
      }
    }
    
    if (!followUpFound) {
      console.log('⚠️ Follow-up questions not detected within timeout, but proceeding...');
      console.log('💡 Response may be complete even without visible follow-up questions');
    } else {
      console.log('✅ LLM response appears complete (follow-up questions detected)!');
    }
    
    // Additional wait for response to be fully rendered
    await this.page.waitForTimeout(3000);
    
    // Take a screenshot to document the completion state
    try {
      await this.page.screenshot({ 
        path: 'openwebui-response-complete.png', 
        fullPage: true 
      });
      console.log('📸 Response completion screenshot saved: openwebui-response-complete.png');
    } catch (error) {
      console.log('Failed to take completion screenshot:', error);
    }
    
    // Final wait for any additional content to load
    await this.page.waitForLoadState('networkidle');
    console.log('✅ LLM response wait completed');
  }

  private async extractLatestResponse(): Promise<string> {
    console.log('📥 Extracting latest LLM response...');
    
    // Try different selectors to find the latest LLM response
    const responseSelectors = [
      // General selectors
      '[data-testid="message"]:last-child .content',
      '.message:last-child .content',
      '.chat-message:last-child .text',
      '.assistant-message:last-child',
      '.response:last-child',
      '.message-content:last-child',
      
      // Open WebUI specific selectors
      '.prose:last-child',
      '.markdown:last-child',
      '.message:last-child .prose',
      '.message:last-child .markdown',
      'div[data-message-id]:last-child .prose',
      
      // More generic approaches
      '.message:last-child',
      '[data-testid="message"]:last-child'
    ];
    
    for (const selector of responseSelectors) {
      try {
        const elements = this.page.locator(selector);
        if (await elements.count() > 0) {
          const text = await elements.first().textContent();
          if (text && text.trim().length > 0) {
            console.log(`✅ Response extracted using selector: ${selector}`);
            console.log(`📄 Response preview: ${text.substring(0, 100)}...`);
            return text.trim();
          }
        }
      } catch (error) {
        console.log(`Selector ${selector} failed:`, error);
        continue;
      }
    }
    
    // Fallback: try to get all messages and return the last one
    console.log('🔄 Using fallback message extraction...');
    try {
      const allMessages = await this.page.evaluate(() => {
        // Try to find all message containers
        const messageSelectors = [
          '.message',
          '[data-testid="message"]',
          '.chat-message',
          '.prose'
        ];
        
        for (const selector of messageSelectors) {
          const messages = Array.from(document.querySelectorAll(selector));
          if (messages.length > 0) {
            // Get the last message that's not from the user
            for (let i = messages.length - 1; i >= 0; i--) {
              const msg = messages[i];
              const text = msg.textContent?.trim();
              
              // Skip if it's likely a user message (contains the prompt we sent)
              if (text && text.length > 50 && !text.includes('Create a presentation')) {
                return text;
              }
            }
          }
        }
        
        return null;
      });
      
      if (allMessages) {
        console.log(`✅ Response extracted via fallback method`);
        console.log(`📄 Response preview: ${allMessages.substring(0, 100)}...`);
        return allMessages;
      }
    } catch (error) {
      console.log('Fallback extraction failed:', error);
    }
    
    // Final fallback: get page text and try to extract response
    console.log('🔄 Using final fallback - page text extraction...');
    const pageText = await this.page.textContent('body');
    if (pageText) {
      const lines = pageText.split('\n').filter((line: string) => line.trim().length > 0);
      
      // Look for lines that seem like LLM responses (longer, descriptive text)
      const potentialResponses = lines.filter((line: string) => 
        line.length > 100 && 
        !line.includes('Send a message') && 
        !line.includes('Enter') &&
        !line.includes('Type') &&
        !line.includes('Sign in')
      );
      
      if (potentialResponses.length > 0) {
        const response = potentialResponses[potentialResponses.length - 1];
        console.log(`✅ Response extracted from page text`);
        console.log(`📄 Response preview: ${response.substring(0, 100)}...`);
        return response;
      }
    }
    
    throw new Error('Could not extract LLM response from the page. The response may not have generated properly or the page structure is different than expected.');
  }

  private async selectUWATKnowledge(inputElement: any): Promise<void> {
    try {
      console.log('🔍 Starting UWAT knowledge selection...');
      
      // Type # to trigger the knowledge dropdown
      console.log('📝 Typing # to trigger knowledge selection dropdown...');
      await inputElement.type('#');
      await this.page.waitForTimeout(1000);
      
      // Wait for the knowledge dropdown to appear
      console.log('⏳ Waiting for knowledge dropdown to appear...');
      const dropdownSelectors = [
        '[role="listbox"]',
        '.dropdown',
        '.knowledge-dropdown',
        '.suggestions',
        '[data-testid*="dropdown"]',
        '[aria-expanded="true"]',
        '.menu',
        '.options',
        'ul[role="menu"]',
        'div[role="menu"]'
      ];
      
      let dropdownFound = false;
      for (const selector of dropdownSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          console.log(`✅ Found knowledge dropdown with selector: ${selector}`);
          dropdownFound = true;
          break;
        } catch (error) {
          console.log(`Dropdown selector ${selector} not found, trying next...`);
        }
      }
      
      if (!dropdownFound) {
        console.log('⚠️ No dropdown found, looking for UWAT knowledge options directly...');
      }
      
      // Look for UWAT knowledge option
      console.log('🎯 Looking for UWAT knowledge option...');
      const uwatSelectors = [
        'text=UWAT',
        'text=UWAT knowledge',
        '[data-value*="UWAT"]',
        '[data-value*="uwat"]',
        'li:has-text("UWAT")',
        'div:has-text("UWAT")',
        'span:has-text("UWAT")',
        '*:has-text("UWAT knowledge")',
        '*:has-text("UWAT")'
      ];
      
      let uwatSelected = false;
      for (const selector of uwatSelectors) {
        try {
          const uwatOption = this.page.locator(selector).first();
          if (await uwatOption.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found UWAT knowledge option with selector: ${selector}`);
            await uwatOption.click();
            console.log('✅ Successfully selected UWAT knowledge');
            uwatSelected = true;
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (error) {
          console.log(`UWAT selector ${selector} failed:`, error);
        }
      }
      
      if (!uwatSelected) {
        console.log('⚠️ Could not find UWAT knowledge option, proceeding without knowledge selection');
        console.log('🔍 Available options on page:');
        
        // Debug: List all visible text elements that might be knowledge options
        const availableOptions = await this.page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll('*'));
          return allElements
            .filter(el => el.textContent && el.textContent.trim().length > 0 && el.textContent.length < 100)
            .map(el => el.textContent?.trim())
            .filter(text => text && (text.includes('knowledge') || text.includes('UWAT') || text.includes('Knowledge')))
            .slice(0, 10); // Limit to first 10 for debugging
        });
        
        console.log('📋 Available knowledge-related options:', availableOptions);
        
        // Clear the # if no knowledge was selected
        await inputElement.fill('');
        await this.page.waitForTimeout(500);
      } else {
        // Add a space after knowledge selection to separate from prompt
        await inputElement.type(' ');
        await this.page.waitForTimeout(500);
      }
      
    } catch (error) {
      console.log('⚠️ Error during UWAT knowledge selection:', error);
      console.log('🔄 Continuing without knowledge selection...');
      
      // Clear the input if there was an error
      await inputElement.fill('');
      await this.page.waitForTimeout(500);
    }
  }
}