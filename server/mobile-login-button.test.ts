import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Tests for Login button visibility on mobile and desktop.
 * 
 * The Login button should be:
 * - Visible on mobile (icon only, next to hamburger menu) for non-authenticated users
 * - Visible on desktop (icon + "Login" text) for non-authenticated users
 * - Also present in the hamburger menu for non-authenticated users
 * - Replaced by Dashboard button for authenticated users
 */

describe("Mobile Login Button", () => {
  const homePath = path.join(process.cwd(), "client/src/pages/Home.tsx");
  let homeContent: string;

  it("should have the Home.tsx file", () => {
    homeContent = fs.readFileSync(homePath, "utf-8");
    expect(homeContent).toBeTruthy();
  });

  it("should import LogIn icon from lucide-react", () => {
    expect(homeContent).toContain("LogIn");
    expect(homeContent).toContain("from \"lucide-react\"");
  });

  it("should have a mobile-only Login button (lg:hidden)", () => {
    // There should be a Login button visible only on mobile
    expect(homeContent).toContain('className="lg:hidden border-gray-300 text-gray-700 hover:bg-gray-50"');
    expect(homeContent).toContain('onClick={() => setLocation("/login")}');
  });

  it("should have a desktop-only Login button (hidden lg:inline-flex)", () => {
    // There should be a Login button visible only on desktop with text
    const desktopLoginSection = homeContent.indexOf('LogIn className="h-4 w-4 mr-1.5"');
    expect(desktopLoginSection).toBeGreaterThan(-1);
  });

  it("should have Login in the hamburger menu for non-authenticated users", () => {
    // The Sheet/hamburger menu should contain a Login option
    const sheetSection = homeContent.substring(homeContent.indexOf("SheetContent"));
    expect(sheetSection).toContain("Login");
    expect(sheetSection).toContain('setLocation("/login")');
  });

  it("should show Dashboard instead of Login for authenticated users", () => {
    // The isAuthenticated ternary should show Dashboard
    expect(homeContent).toContain("isAuthenticated");
    expect(homeContent).toContain("Dashboard");
  });

  it("should navigate to /login route", () => {
    // All Login buttons should go to /login
    const loginMatches = homeContent.match(/setLocation\("\/login"\)/g);
    expect(loginMatches).toBeTruthy();
    // Should have at least 3 login links: mobile header, desktop header, hamburger menu
    expect(loginMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it("should have LogIn icon on the mobile button", () => {
    // The mobile button should have the LogIn icon
    const mobileButtonSection = homeContent.substring(
      homeContent.indexOf('className="lg:hidden border-gray-300'),
      homeContent.indexOf('className="lg:hidden border-gray-300') + 200
    );
    expect(mobileButtonSection).toContain("LogIn");
  });
});
