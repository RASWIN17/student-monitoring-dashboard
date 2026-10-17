import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Responsive Slide-In Sidebar Verification Suite', () => {
  const sidebarPath = path.join(process.cwd(), 'components', 'Sidebar.tsx');
  const navbarPath = path.join(process.cwd(), 'components', 'Navbar.tsx');
  const appShellPath = path.join(process.cwd(), 'components', 'AppShell.tsx');
  const globalsCssPath = path.join(process.cwd(), 'app', 'globals.css');

  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');
  const appShellContent = fs.readFileSync(appShellPath, 'utf8');
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');

  test('1. Hamburger Menu on All Screens: Navbar has menu button without lg:hidden restriction', () => {
    // Must NOT hide hamburger button on large screens
    assert.doesNotMatch(
      navbarContent,
      /className="[^"]*lg:hidden[^"]*"\s*>\s*<Menu/s,
      'Hamburger button must not have lg:hidden restriction in Navbar'
    );
    // Must have accessible ARIA attributes
    assert.match(navbarContent, /aria-controls="app-sidebar"/, 'Navbar hamburger button must have aria-controls="app-sidebar"');
    assert.match(navbarContent, /aria-expanded=/, 'Navbar hamburger button must have dynamic aria-expanded attribute');
    assert.match(navbarContent, /<Menu className="w-5 h-5"/, 'Navbar must preserve Menu icon');
  });

  test('2. Slide-In Animation & Overlay: Sidebar is fixed overlay without lg:static docking', () => {
    // Must NOT have desktop static overrides that dock the sidebar into the grid/flex flow
    assert.doesNotMatch(sidebarContent, /lg:static/, 'Sidebar must not have lg:static docking');
    assert.doesNotMatch(sidebarContent, /lg:translate-x-0/, 'Sidebar must not force lg:translate-x-0 when closed');

    // Must be fixed overlay with smooth transform transition
    assert.match(sidebarContent, /fixed inset-y-0 left-0 z-50/, 'Sidebar must be a fixed overlay at z-50');
    assert.match(sidebarContent, /transition-transform duration-300 ease-in-out/, 'Sidebar must feature smooth 300ms transition');
    assert.match(sidebarContent, /translate-x-0/, 'Sidebar must have translate-x-0 when open');
    assert.match(sidebarContent, /-translate-x-full/, 'Sidebar must slide back to -translate-x-full when closed');
  });

  test('3. Overlay Backdrop across all screen sizes', () => {
    // Backdrop must NOT have lg:hidden
    assert.doesNotMatch(
      sidebarContent,
      /bg-slate-950[^"]*lg:hidden/,
      'Backdrop overlay must not have lg:hidden'
    );
    // Backdrop must have z-40 and fade transition
    assert.match(sidebarContent, /fixed inset-0 bg-slate-950/, 'Backdrop overlay must cover fixed inset-0');
    assert.match(sidebarContent, /z-40/, 'Backdrop overlay must be layered at z-40 below sidebar (z-50) and above navbar (z-30)');
    assert.match(sidebarContent, /transition-opacity duration-300/, 'Backdrop must have smooth opacity transition');
  });

  test('4. Auto-Close on Navigation & Escape Key Support', () => {
    // Navigation links must invoke handleClose
    assert.match(
      sidebarContent,
      /onClick=\{\(\)\s*=>\s*\{\s*if\s*\(handleClose\)\s*handleClose\(\);\s*\}\}/,
      'Sidebar navigation items must call handleClose when selected'
    );
    // Escape key listener must close drawer
    assert.match(sidebarContent, /e\.key === 'Escape'/, 'Sidebar must listen for Escape key to close');
    // inert attribute for accessibility
    assert.match(sidebarContent, /inert=\{!isSidebarOpen\}/, 'Sidebar must set inert when closed for keyboard accessibility');
  });

  test('5. Synchronized State Management in AppShell', () => {
    assert.match(appShellContent, /const \[sidebarOpen, setSidebarOpen\] = React\.useState\(false\)/, 'AppShell must manage a single sidebarOpen state');
    assert.match(appShellContent, /setSidebarOpen\(false\)/, 'AppShell must close sidebar on route changes');
    assert.match(appShellContent, /<Sidebar[\s\S]*isOpen=\{sidebarOpen\}[\s\S]*onClose=\{/, 'AppShell must pass synchronized state and onClose to Sidebar');
    assert.match(appShellContent, /<Navbar[\s\S]*isSidebarOpen=\{sidebarOpen\}[\s\S]*onToggleSidebar=\{/, 'AppShell must pass synchronized state and toggle handler to Navbar');
  });

  test('6. Smooth Scrolling Preserved', () => {
    assert.match(globalsCssContent, /scroll-behavior:\s*smooth/, 'globals.css must have smooth scrolling');
    assert.match(appShellContent, /scroll-smooth/, 'AppShell main container must support smooth scrolling');
  });
});
