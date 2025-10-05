# WSL (Windows Subsystem for Linux) Setup Guide

## Prerequisites for WSL

### 1. Install Node.js in WSL
```bash
# Update packages
sudo apt update

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Browser Dependencies
```bash
# Install required dependencies for Playwright browsers
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2
```

### 3. Set Up Display (for GUI browsers)
```bash
# Option 1: Use X11 forwarding (if you have X server on Windows)
export DISPLAY=:0

# Option 2: Use WSL2 with systemd (Windows 11)
export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):0

# Add to ~/.bashrc to persist
echo 'export DISPLAY=:0' >> ~/.bashrc
```

## Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/batcheej/owui-playwright-presenton.git
cd owui-playwright-presenton
```

2. **Install dependencies:**
```bash
npm install
```

3. **Install Playwright browsers:**
```bash
npx playwright install
npx playwright install-deps
```

4. **Configure environment:**
```bash
cp .env.example .env
```

5. **Edit .env file for WSL-specific settings:**
```bash
nano .env
```

## Common WSL Issues and Solutions

### Issue 1: Login Being Skipped

**Problem:** Playwright skips the Open WebUI login process.

**Solutions:**
1. **Check URL configuration:**
   - If Open WebUI runs on Windows: Use Windows host IP
   - If Open WebUI runs in WSL: Use `localhost` or `127.0.0.1`

2. **Find Windows host IP from WSL:**
```bash
# Get Windows host IP
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
# Example output: 172.20.208.1

# Update .env file
OPENWEBUI_URL=http://172.20.208.1:8080
```

3. **Increase timeouts in .env:**
```bash
BROWSER_TIMEOUT=600000
BUTTON_WAIT_TIMEOUT=1200000
RESPONSE_WAIT_TIMEOUT=300000
```

### Issue 2: Browser Launch Failures

**Problem:** Chromium fails to launch in WSL.

**Solutions:**
1. **Install missing dependencies:**
```bash
sudo apt-get install -y chromium-browser
```

2. **Run with additional flags:**
```bash
# Set in .env
HEADLESS=true
```

3. **Check permissions:**
```bash
sudo chmod +x ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
```

### Issue 3: Network Connectivity Issues

**Problem:** Cannot access localhost services.

**Solutions:**
1. **Check Windows Firewall:** Allow connections from WSL
2. **Use specific binding:** When starting services, bind to `0.0.0.0` instead of `localhost`
3. **Port forwarding:** Use Windows host IP instead of localhost

### Issue 4: Display/GUI Issues

**Problem:** Browser window doesn't appear or crashes.

**Solutions:**
1. **Use headless mode:**
```bash
# In .env file
HEADLESS=true
```

2. **Install X server on Windows:**
   - Download VcXsrv or Xming
   - Configure DISPLAY variable

3. **Use WSLg (Windows 11):**
   - Ensure WSLg is enabled
   - Update to latest WSL version

## Testing the Setup

1. **Test browser launch:**
```bash
npx playwright test --debug
```

2. **Test with standard timeouts:**
```bash
npm run dev "Test WSL setup with a simple presentation"
```

3. **Test with enhanced timeouts for slow environments:**
```bash
npm run test-slow "Test slow environment with enhanced timeouts"
```

4. **Debug with screenshots:**
   - Check `debug-login-state.png` if login fails
   - Review console output for detailed logs

## Performance Optimization for WSL

1. **Use WSL2:** Ensure you're using WSL2, not WSL1
2. **Allocate more resources:** Edit `.wslconfig` file
3. **Use faster storage:** Keep project files in WSL filesystem, not Windows filesystem

## Example .wslconfig (Optional)
Create `C:\Users\[username]\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

## Troubleshooting Commands

```bash
# Check WSL version
wsl --list --verbose

# Check display
echo $DISPLAY

# Test browser manually
npx playwright open https://example.com

# Debug Playwright
DEBUG=pw:api npm run dev "test"

# Check running processes
ps aux | grep chrome
```

## Support

If issues persist:
1. Check the debug screenshot: `debug-login-state.png`
2. Review console logs for specific error messages
3. Verify all services are accessible from WSL
4. Test with headless mode first
5. Ensure all required dependencies are installed