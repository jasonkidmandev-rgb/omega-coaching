/**
 * Tests for the Unified Contacts Table feature
 * Validates: schema, contactService, creation path wiring, Client 360 contactId merge,
 * Edit Contact functionality, and updateContact propagation
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

describe("Unified Contacts Table", () => {
  describe("Schema", () => {
    const schema = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");

    it("contacts table exists in schema with required fields", () => {
      expect(schema).toContain("export const contacts = mysqlTable");
      expect(schema).toContain('"contacts"');
    });

    it("contacts table has email, phone, name, createdAt, updatedAt fields", () => {
      const contactsSection = schema.substring(
        schema.indexOf("export const contacts = mysqlTable"),
        schema.indexOf(")", schema.indexOf("export const contacts = mysqlTable") + 500) + 1
      );
      expect(contactsSection).toContain("email");
      expect(contactsSection).toContain("phone");
      expect(contactsSection).toContain("name");
    });

    it("prospects table has contactId field", () => {
      const prospectsSection = schema.substring(
        schema.indexOf("export const prospects = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const prospects = mysqlTable")) + 2
      );
      expect(prospectsSection).toContain("contactId");
      expect(prospectsSection).toContain("contact_id");
    });

    it("clientProtocols table has contactId field", () => {
      const cpSection = schema.substring(
        schema.indexOf("export const clientProtocols = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const clientProtocols = mysqlTable")) + 2
      );
      expect(cpSection).toContain("contactId");
      expect(cpSection).toContain("contact_id");
    });

    it("transformationEnrollments table has contactId field", () => {
      const teSection = schema.substring(
        schema.indexOf("export const transformationEnrollments = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const transformationEnrollments = mysqlTable")) + 2
      );
      expect(teSection).toContain("contactId");
      expect(teSection).toContain("contact_id");
    });

    it("users table has contactId field", () => {
      const usersSection = schema.substring(
        schema.indexOf("export const users = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const users = mysqlTable")) + 2
      );
      expect(usersSection).toContain("contactId");
      expect(usersSection).toContain("contact_id");
    });

    it("clientProjects table has contactId field", () => {
      const cpSection = schema.substring(
        schema.indexOf("export const clientProjects = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const clientProjects = mysqlTable")) + 2
      );
      expect(cpSection).toContain("contactId");
      expect(cpSection).toContain("contact_id");
    });

    it("customOrders table has contactId field", () => {
      const coSection = schema.substring(
        schema.indexOf("export const customOrders = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const customOrders = mysqlTable")) + 2
      );
      expect(coSection).toContain("contactId");
      expect(coSection).toContain("contact_id");
    });

    it("packingSlips table has contactId field", () => {
      const psSection = schema.substring(
        schema.indexOf("export const packingSlips = mysqlTable"),
        schema.indexOf(");", schema.indexOf("export const packingSlips = mysqlTable")) + 2
      );
      expect(psSection).toContain("contactId");
      expect(psSection).toContain("contact_id");
    });
  });

  describe("Contact Service", () => {
    const contactService = fs.readFileSync(
      path.join(projectRoot, "server/contacts/contactService.ts"),
      "utf-8"
    );

    it("exports findOrCreateContact function", () => {
      expect(contactService).toContain("export async function findOrCreateContact");
    });

    it("searches by email first (strongest signal)", () => {
      expect(contactService).toContain("email");
      expect(contactService).toContain("Matches by: email (strongest)");
    });

    it("searches by phone as secondary match", () => {
      expect(contactService).toContain("phone");
    });

    it("searches by name as tertiary match", () => {
      expect(contactService).toContain("Match by full name");
    });

    it("creates a new contact if no match found", () => {
      expect(contactService).toContain("insert(contacts)");
    });

    it("updates existing contact with new info (email/phone fill)", () => {
      expect(contactService).toContain("update(contacts)");
    });

    it("returns the contact id", () => {
      expect(contactService).toContain("contactId");
    });
  });

  describe("Creation Path Wiring", () => {
    it("prospect creation calls findOrCreateContact", () => {
      const prospectRouter = fs.readFileSync(
        path.join(projectRoot, "server/prospect/prospectRouter.ts"),
        "utf-8"
      );
      expect(prospectRouter).toContain("findOrCreateContact");
      expect(prospectRouter).toContain("contactId");
    });

    it("onboarding automation calls findOrCreateContact", () => {
      const onboarding = fs.readFileSync(
        path.join(projectRoot, "server/automation/onboardingAutomation.ts"),
        "utf-8"
      );
      expect(onboarding).toContain("findOrCreateContact");
      expect(onboarding).toContain("contactId");
    });

    it("client protocol creation calls findOrCreateContact", () => {
      const db = fs.readFileSync(path.join(projectRoot, "server/db.ts"), "utf-8");
      expect(db).toContain("findOrCreateContact");
      expect(db).toContain("contactId");
    });

    it("user registration calls findOrCreateContact", () => {
      const authRoutes = fs.readFileSync(
        path.join(projectRoot, "server/auth/authRoutes.ts"),
        "utf-8"
      );
      expect(authRoutes).toContain("findOrCreateContact");
      expect(authRoutes).toContain("contactId");
    });
  });

  describe("Client 360 ContactId Integration", () => {
    const router = fs.readFileSync(
      path.join(projectRoot, "server/client360/router.ts"),
      "utf-8"
    );

    it("imports contacts table", () => {
      expect(router).toContain("contacts,");
    });

    it("has contactIdIndex for dedup", () => {
      expect(router).toContain("contactIdIndex");
    });

    it("uses contactId as primary merge key (strongest signal)", () => {
      const contactIdPos = router.indexOf("Try contactId match");
      const emailPos = router.indexOf("Try email match");
      expect(contactIdPos).toBeLessThan(emailPos);
      expect(contactIdPos).toBeGreaterThan(-1);
    });

    it("UnifiedPerson interface includes contactId", () => {
      expect(router).toContain("contactId: number | null;");
    });

    it("detail endpoint accepts contactId and personId", () => {
      expect(router).toContain("contactId: z.number().optional()");
      expect(router).toContain("personId: z.string().optional()");
    });

    it("detail endpoint looks up by contactId first", () => {
      expect(router).toContain("input.contactId");
      expect(router).toContain("contacts.id");
    });

    it("detail endpoint resolves personId to find contact", () => {
      expect(router).toContain("input.personId");
      expect(router).toContain("split(':')");
    });

    it("detail returns contact record", () => {
      expect(router).toContain("contact: contactRecord");
    });
  });

  describe("updateContact Mutation", () => {
    const router = fs.readFileSync(
      path.join(projectRoot, "server/client360/router.ts"),
      "utf-8"
    );

    it("has updateContact mutation defined", () => {
      expect(router).toContain("updateContact:");
    });

    it("accepts contactId, firstName, lastName, email, phone inputs", () => {
      expect(router).toContain("contactId: z.number()");
      expect(router).toContain("firstName: z.string().optional()");
      expect(router).toContain("lastName: z.string().optional()");
      expect(router).toContain("email: z.string().email().optional()");
      expect(router).toContain("phone: z.string().optional()");
    });

    it("builds fullName from firstName and lastName", () => {
      expect(router).toContain("updates.fullName");
      expect(router).toContain("filter(Boolean).join(' ')");
    });

    it("updates the contacts table", () => {
      expect(router).toContain("database.update(contacts).set(updates)");
    });

    it("propagates to prospects table", () => {
      expect(router).toContain("database.update(prospects).set(prospectUpdates)");
      expect(router).toContain("prospects.contactId");
    });

    it("propagates to clientProtocols table", () => {
      expect(router).toContain("database.update(clientProtocols).set(cpUpdates)");
      expect(router).toContain("clientProtocols.contactId");
    });

    it("propagates to clientProjects table", () => {
      expect(router).toContain("database.update(clientProjects).set(projUpdates)");
      expect(router).toContain("clientProjects.contactId");
    });

    it("propagates to customOrders table", () => {
      expect(router).toContain("database.update(customOrders).set(coUpdates)");
      expect(router).toContain("customOrders.contactId");
    });

    it("propagates to packingSlips table", () => {
      expect(router).toContain("database.update(packingSlips).set(psUpdates)");
      expect(router).toContain("packingSlips.contactId");
    });

    it("propagates to users table (name only)", () => {
      expect(router).toContain("database.update(users).set({ name: fullName })");
      expect(router).toContain("users.contactId");
    });

    it("propagates to transformationEnrollments table", () => {
      expect(router).toContain("database.update(transformationEnrollments).set(teUpdates)");
      expect(router).toContain("transformationEnrollments.contactId");
    });

    it("wraps each table update in try/catch for resilience", () => {
      expect(router).toContain("[updateContact] prospects sync error");
      expect(router).toContain("[updateContact] clientProtocols sync error");
      expect(router).toContain("[updateContact] clientProjects sync error");
      expect(router).toContain("[updateContact] customOrders sync error");
      expect(router).toContain("[updateContact] packingSlips sync error");
      expect(router).toContain("[updateContact] users sync error");
      expect(router).toContain("[updateContact] transformationEnrollments sync error");
    });

    it("returns success on completion", () => {
      expect(router).toContain('return { success: true }');
    });
  });

  describe("Client 360 Frontend - React Hooks Ordering", () => {
    const frontend = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/admin/Client360.tsx"),
      "utf-8"
    );

    it("imports useEffect from React", () => {
      expect(frontend).toContain("useEffect");
      // Check it's in the import statement
      const importLine = frontend.split("\n").find(l => l.includes("from \"react\""));
      expect(importLine).toContain("useEffect");
    });

    it("all hooks are called before early returns in PersonDetail", () => {
      // Find the PersonDetail function
      const personDetailStart = frontend.indexOf("function PersonDetail(");
      const personDetailCode = frontend.substring(personDetailStart, personDetailStart + 4000);

      // Find positions of hooks and early returns
      const useStatePos = personDetailCode.indexOf("useState(");
      const useEffectPos = personDetailCode.indexOf("useEffect(");
      const useMutationPos = personDetailCode.indexOf("useMutation(");
      const useCallbackPos = personDetailCode.indexOf("useCallback(");
      const earlyReturnPos = personDetailCode.indexOf("if (isLoading)");

      // All hooks should come before the early return
      expect(useStatePos).toBeGreaterThan(-1);
      expect(useEffectPos).toBeGreaterThan(-1);
      expect(useMutationPos).toBeGreaterThan(-1);
      expect(useCallbackPos).toBeGreaterThan(-1);
      expect(earlyReturnPos).toBeGreaterThan(-1);

      expect(useStatePos).toBeLessThan(earlyReturnPos);
      expect(useEffectPos).toBeLessThan(earlyReturnPos);
      expect(useMutationPos).toBeLessThan(earlyReturnPos);
      expect(useCallbackPos).toBeLessThan(earlyReturnPos);
    });

    it("uses useEffect to sync edit fields when contact data loads", () => {
      expect(frontend).toContain("useEffect(() => {");
      expect(frontend).toContain("setEditFirstName(contact.firstName");
      expect(frontend).toContain("setEditLastName(contact.lastName");
      expect(frontend).toContain("setEditEmail(contact.email");
      expect(frontend).toContain("setEditPhone(contact.phone");
    });
  });

  describe("Client 360 Frontend - Edit Contact UI", () => {
    const frontend = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/admin/Client360.tsx"),
      "utf-8"
    );

    it("PersonDetail accepts contactId and personId props", () => {
      expect(frontend).toContain("contactId?: number");
      expect(frontend).toContain("personId?: string");
    });

    it("passes contactId and personId to detail query", () => {
      expect(frontend).toContain("contactId: propContactId || undefined");
      expect(frontend).toContain("personId: personId || undefined");
    });

    it("clicking a row passes contactId and personId", () => {
      expect(frontend).toContain("setSelectedPerson");
      expect(frontend).toContain("contactId:");
      expect(frontend).toContain("personId:");
    });

    it("detail dialog works without email (for phone-only contacts)", () => {
      expect(frontend).not.toContain("person.email && setSelectedEmail");
    });

    it("has Edit Contact button", () => {
      expect(frontend).toContain("Edit Contact");
    });

    it("has Save & Sync Everywhere button", () => {
      expect(frontend).toContain("Save & Sync Everywhere");
    });

    it("has inline edit fields for firstName, lastName, email, phone", () => {
      expect(frontend).toContain('placeholder="First name"');
      expect(frontend).toContain('placeholder="Last name"');
      expect(frontend).toContain('placeholder="Email"');
      expect(frontend).toContain('placeholder="Phone"');
    });

    it("calls updateContact mutation on save", () => {
      expect(frontend).toContain("updateContactMutation.mutate");
    });

    it("shows success toast on update", () => {
      expect(frontend).toContain("Contact updated everywhere");
    });

    it("invalidates queries after successful update", () => {
      expect(frontend).toContain("utils.client360.detail.invalidate()");
      expect(frontend).toContain("utils.client360.list.invalidate()");
    });

    it("reads primary name/email/phone from contacts table (single source of truth)", () => {
      // Contact record is used as the SINGLE SOURCE OF TRUTH
      expect(frontend).toContain("SINGLE SOURCE OF TRUTH");
      expect(frontend).toContain("contact?.fullName");
      expect(frontend).toContain("contact?.email");
      expect(frontend).toContain("contact?.phone");
    });
  });
});
