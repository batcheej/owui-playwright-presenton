const { chromium } = require('playwright');

async function testButtonWait() {
  console.log('🧪 Testing "Loading..." to "Generate Presentation" button transition...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to Presenton
    console.log('🌐 Navigating to Presenton...');
    await page.goto('http://localhost:5000/upload');
    await page.waitForTimeout(3000);
    
    // Fill the presentation input
    console.log('📝 Filling presentation content...');
    const textArea = page.locator('textarea').first();
    await textArea.fill('Create a test presentation about AI with 3 slides');
    await page.waitForTimeout(1000);
    
    // Click Next
    console.log('➡️ Clicking Next button...');
    const nextButton = page.locator('button:has-text("Next")').first();
    await nextButton.click();
    await page.waitForTimeout(5000);
    
    // Wait for outline page
    console.log('⏳ Waiting for outline page...');
    await page.waitForURL('**/outline', { timeout: 60000 });
    console.log('✅ Reached outline page');
    
    // Click "Select Template"
    console.log('🎨 Clicking "Select Template"...');
    const selectTemplateButton = page.locator('button').filter({ hasText: 'Select Template' }).first();
    await selectTemplateButton.click();
    await page.waitForTimeout(3000);
    
    // Click "General" template
    console.log('🎯 Clicking "General" template...');
    const generalTemplate = page.locator('*').filter({ hasText: /^General$/ }).first();
    await generalTemplate.click();
    await page.waitForTimeout(3000);
    
    // Now wait for the "Loading..." button to become "Generate Presentation"
    console.log('🕐 STARTING EXTENDED WAIT for "Loading..." button to become "Generate Presentation"...');
    console.log('⚠️  This will wait up to 15 MINUTES - the button takes SEVERAL MINUTES to become ready!');
    
    const maxWaitTime = 900000; // 15 minutes
    const startTime = Date.now();
    let buttonReady = false;
    
    while (Date.now() - startTime < maxWaitTime && !buttonReady) {
      // Check all buttons and their states
      const buttonStates = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map((btn, index) => ({
          index,
          text: btn.textContent?.trim(),
          enabled: !btn.disabled,
          visible: btn.offsetParent !== null,
          className: btn.className
        })).filter(btn => btn.text && btn.visible);
      });
      
      // Look for the button that was "Loading..." and check if it changed
      for (const btnState of buttonStates) {
        const text = btnState.text.toLowerCase();
        
        // Check if we found a "Generate Presentation" type button that's enabled
        if ((text.includes('generate') && text.includes('presentation')) ||
            (text.includes('create') && text.includes('presentation')) ||
            (text.includes('build') && text.includes('presentation'))) {
          if (btnState.enabled) {
            console.log('🎉 BUTTON IS READY! "' + btnState.text + '" is now enabled!');
            buttonReady = true;
            
            // IMMEDIATELY click it!
            console.log('🚀 IMMEDIATELY clicking the button...');
            const buttons = page.locator('button');
            const targetButton = buttons.nth(btnState.index);
            await targetButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            await targetButton.click();
            console.log('✅ Successfully clicked "' + btnState.text + '"!');
            
            break;
          } else {
            console.log('⏳ Found "' + btnState.text + '" but still disabled');
          }
        }
      }
      
      // Check if we still see the "Loading..." button
      const loadingButton = buttonStates.find(btn => btn.text.toLowerCase().includes('loading'));
      
      if (!buttonReady) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 60 === 0 && elapsed > 0) { // Log every minute
          console.log('⏳ Still waiting... (' + Math.floor(elapsed/60) + ' minutes elapsed)');
          
          if (loadingButton) {
            console.log('📍 "Loading..." button still present and disabled');
          } else {
            console.log('📍 "Loading..." button no longer found');
          }
          
          // Show current button states
          console.log('🔍 Current buttons:');
          buttonStates.slice(0, 5).forEach((btn, i) => {
            console.log(`  ${i+1}. "${btn.text}" (enabled: ${btn.enabled})`);
          });
        }
        
        await page.waitForTimeout(10000); // Check every 10 seconds
      }
    }
    
    if (!buttonReady) {
      console.log('❌ Button never became ready after 15 minutes');
      console.log('📸 Taking final screenshot...');
      await page.screenshot({ path: 'button-wait-timeout.png', fullPage: true });
    } else {
      console.log('🎉 BUTTON WAIT TEST SUCCESSFUL!');
      console.log('📸 Taking success screenshot...');
      await page.screenshot({ path: 'button-wait-success.png', fullPage: true });
      
      // Wait a bit more to see if presentation generates
      console.log('⏳ Waiting to see if presentation auto-generates...');
      await page.waitForTimeout(30000);
      
      const finalUrl = page.url();
      console.log('🔗 Final URL: ' + finalUrl);
      
      if (finalUrl.includes('/presentation') || finalUrl.includes('/slides')) {
        console.log('🎉 SUCCESS! Presentation page reached!');
      } else {
        console.log('⚠️ Still on outline page - may need more time or different approach');
      }
    }
    
  } catch (error) {
    console.log('❌ Test error:', error);
    await page.screenshot({ path: 'button-wait-error.png', fullPage: true });
  }
  
  console.log('🔍 Keeping browser open for manual inspection...');
  console.log('Press Ctrl+C to close when done.');
  
  // Keep browser open for manual inspection
  await new Promise(() => {}); // Wait indefinitely
}

testButtonWait().catch(console.error);