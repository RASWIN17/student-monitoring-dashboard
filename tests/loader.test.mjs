import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Global Lottie Loader Verification Suite', () => {
  const publicSearchPath = path.join(process.cwd(), 'public', 'Search.json');
  const globalLoaderPath = path.join(process.cwd(), 'components', 'GlobalLoader.tsx');
  const loadingContextPath = path.join(process.cwd(), 'components', 'LoadingContext.tsx');
  const rootLayoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  const appShellPath = path.join(process.cwd(), 'components', 'AppShell.tsx');
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  test('1. Exact Search.json Lottie Animation Asset Preservation', () => {
    assert.ok(fs.existsSync(publicSearchPath), 'public/Search.json must exist');
    const content = fs.readFileSync(publicSearchPath, 'utf8');
    const json = JSON.parse(content);

    assert.strictEqual(json.v, '4.8.0', 'Must preserve original Lottie version 4.8.0');
    assert.strictEqual(json.nm, 'Search', 'Must preserve original animation name "Search"');
    assert.strictEqual(json.w, 360, 'Must preserve original width 360');
    assert.strictEqual(json.h, 360, 'Must preserve original height 360');
    assert.strictEqual(json.fr, 30, 'Must preserve original framerate 30');
    assert.strictEqual(json.ip, 0, 'Must preserve original in-point 0');
    assert.strictEqual(json.op, 90, 'Must preserve original out-point 90');
    assert.strictEqual(json.assets.length, 4, 'Must preserve all 4 assets including embedded base64 assets');
    assert.strictEqual(json.layers.length, 5, 'Must preserve all 5 layers');
  });

  test('2. Compatible Lottie Player Dependency Installed', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(
      pkg.dependencies['lottie-react'] || pkg.dependencies['lottie-web'],
      'Compatible Lottie player must be installed in package.json'
    );
  });

  test('3. Visual Design: Fixed Full-Screen Overlay, White Background, and High Z-Index', () => {
    assert.ok(fs.existsSync(globalLoaderPath), 'components/GlobalLoader.tsx must exist');
    const content = fs.readFileSync(globalLoaderPath, 'utf8');

    // Full viewport fixed overlay with high z-index
    assert.match(content, /fixed inset-0/, 'Must cover entire viewport with fixed inset-0');
    assert.match(content, /z-\[(?:99999|9999|999)\]/, 'Must have high z-index overlay');
    assert.match(content, /bg-white/, 'Must use clean white background matching the animation');
    assert.match(content, /items-center justify-center/, 'Must center animation horizontally and vertically');
    assert.match(content, /overflow-hidden/, 'Must prevent vertical and horizontal overflow');
  });

  test('4. Responsive Sizing (140–180px mobile, 180–240px desktop)', () => {
    const content = fs.readFileSync(globalLoaderPath, 'utf8');
    // Mobile: 150px (within 140–180px)
    // Desktop: 220px (within 180–240px at md breakpoint)
    assert.match(content, /w-\[1[4-8]0px\]\s+h-\[1[4-8]0px\]/, 'Mobile size must be within 140-180px');
    assert.match(content, /md:w-\[(?:1[8-9]\d|2[0-4]0)px\]\s+md:h-\[(?:1[8-9]\d|2[0-4]0)px\]/, 'Desktop size must be within 180-240px');
  });

  test('5. Subtle Fade-Out Transition & Pointer Interaction Blocking', () => {
    const content = fs.readFileSync(globalLoaderPath, 'utf8');
    assert.match(content, /transition-opacity duration-300 ease-out/, 'Must have subtle 300ms fade-out transition');
    assert.match(content, /opacity-100 pointer-events-auto/, 'Must prevent user interaction while loader is visible');
    assert.match(content, /opacity-0 pointer-events-none/, 'Must restore pointer events when hidden/fading out');
  });

  test('6. Reduced-Motion Accessibility Preference Support', () => {
    const content = fs.readFileSync(globalLoaderPath, 'utf8');
    assert.match(content, /prefers-reduced-motion/, 'Must detect prefers-reduced-motion media query');
    assert.match(content, /loop=\{!prefersReducedMotion\}/, 'Must respect reduced motion for looping/animation');
  });

  test('7. LoadingContext Logic: Safety Fallback, Error Handling & Anti-Flash', () => {
    assert.ok(fs.existsSync(loadingContextPath), 'components/LoadingContext.tsx must exist');
    const content = fs.readFileSync(loadingContextPath, 'utf8');

    // Safety timeout to prevent indefinite stuck states
    assert.match(content, /timeoutMs/, 'Must support timeoutMs option for tasks');
    assert.match(content, /clearTimeout/, 'Must manage and clean up timer handles');

    // withLoading helper with guaranteed finally cleanup
    assert.match(content, /finally\s*\{[\s\S]*stopLoading/, 'withLoading must guarantee stopLoading in finally block');

    // Anti-flash logic
    assert.match(content, /ANTI_FLASH_DELAY|anti-flash|debounce/i, 'Must implement anti-flash debounce for fast operations');
  });

  test('8. Root Layout Integration Across All Routes', () => {
    const content = fs.readFileSync(rootLayoutPath, 'utf8');
    assert.match(content, /<LoadingProvider>/, 'RootLayout must wrap tree in LoadingProvider');
    assert.match(content, /<GlobalLoader\s*\/>/, 'RootLayout must include GlobalLoader component');
  });

  test('9. No Conflicting Spinner Flashes in AppShell', () => {
    const content = fs.readFileSync(appShellPath, 'utf8');
    assert.doesNotMatch(
      content,
      /Checking authentication status/,
      'AppShell must not render conflicting inline auth-checking spinner text'
    );
  });
});
