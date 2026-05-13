import { z } from "zod";
import { router, adminProcedure, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { documentFolders, documents, documentRequests } from "../../drizzle/schema";
import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import { storagePut, storageGet } from "../storage";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// System folder types
const SYSTEM_FOLDERS = [
  { name: 'Labs', systemType: 'labs' },
  { name: 'Progress Reports', systemType: 'progress_reports' },
  { name: 'Intake & Waivers', systemType: 'intake_waivers' },
  { name: 'Resources', systemType: 'resources' },
  { name: 'Personal', systemType: 'personal' },
];

// ============ DOCUMENT ROUTER ============
export const documentRouter = router({
  // ============ FOLDERS ============
  folders: router({
    // Get all folders for a client
    list: protectedProcedure
      .input(z.object({ clientProtocolId: z.number() }))
      .query(async ({ input }) => {
        const database = await db();
        const folders = await database
          .select()
          .from(documentFolders)
          .where(eq(documentFolders.clientProtocolId, input.clientProtocolId))
          .orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name));
        return folders;
      }),
    
    // Initialize system folders for a client
    initializeSystemFolders: adminProcedure
      .input(z.object({ clientProtocolId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db();
        
        // Check if folders already exist
        const existing = await database
          .select()
          .from(documentFolders)
          .where(and(
            eq(documentFolders.clientProtocolId, input.clientProtocolId),
            eq(documentFolders.isSystem, true)
          ));
        
        if (existing.length > 0) {
          return { created: 0, message: "System folders already exist" };
        }
        
        // Create system folders
        for (let i = 0; i < SYSTEM_FOLDERS.length; i++) {
          const folder = SYSTEM_FOLDERS[i];
          await database.insert(documentFolders).values({
            clientProtocolId: input.clientProtocolId,
            name: folder.name,
            isSystem: true,
            systemType: folder.systemType,
            sortOrder: i,
          });
        }
        
        return { created: SYSTEM_FOLDERS.length };
      }),
    
    // Create a custom folder
    create: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        name: z.string().min(1),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        
        // Get max sort order
        const [maxSort] = await database
          .select({ maxOrder: sql<number>`MAX(${documentFolders.sortOrder})` })
          .from(documentFolders)
          .where(eq(documentFolders.clientProtocolId, input.clientProtocolId));
        
        const [result] = await database.insert(documentFolders).values({
          clientProtocolId: input.clientProtocolId,
          name: input.name,
          parentId: input.parentId,
          isSystem: false,
          sortOrder: (maxSort?.maxOrder ?? 0) + 1,
        });
        
        return { id: result.insertId };
      }),
    
    // Rename a folder (non-system only)
    rename: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        
        // Check if system folder
        const [folder] = await database
          .select()
          .from(documentFolders)
          .where(eq(documentFolders.id, input.id));
        
        if (folder?.isSystem) {
          throw new Error("Cannot rename system folders");
        }
        
        await database
          .update(documentFolders)
          .set({ name: input.name })
          .where(eq(documentFolders.id, input.id));
        
        return { success: true };
      }),
    
    // Delete a folder (non-system only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db();
        
        // Check if system folder
        const [folder] = await database
          .select()
          .from(documentFolders)
          .where(eq(documentFolders.id, input.id));
        
        if (folder?.isSystem) {
          throw new Error("Cannot delete system folders");
        }
        
        // Check if folder has documents
        const [docCount] = await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(documents)
          .where(eq(documents.folderId, input.id));
        
        if ((docCount?.count ?? 0) > 0) {
          throw new Error("Cannot delete folder with documents. Move or delete documents first.");
        }
        
        await database
          .delete(documentFolders)
          .where(eq(documentFolders.id, input.id));
        
        return { success: true };
      }),
  }),

  // ============ DOCUMENTS ============
  // List documents in a folder
  list: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      folderId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      let query = database
        .select()
        .from(documents)
        .where(and(
          eq(documents.clientProtocolId, input.clientProtocolId),
          isNull(documents.deletedAt)
        ))
        .orderBy(desc(documents.createdAt));
      
      const results = await query;
      
      // Filter by folder if specified
      if (input.folderId) {
        return results.filter(d => d.folderId === input.folderId);
      }
      
      return results;
    }),
  
  // Get document by ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const [doc] = await database
        .select()
        .from(documents)
        .where(eq(documents.id, input.id));
      return doc;
    }),
  
  // Upload a document
  upload: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      folderId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      base64Data: z.string(),
      mimeType: z.string(),
      visibility: z.enum(['shared', 'coach_only']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db();
      
      // Extract base64 content
      const base64Match = input.base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = input.mimeType;
      let base64Content = input.base64Data;
      
      if (base64Match) {
        mimeType = base64Match[1];
        base64Content = base64Match[2];
      }
      
      // Upload to S3
      const s3Key = `client-documents/${input.clientProtocolId}/${Date.now()}-${input.name}`;
      const fileBuffer = Buffer.from(base64Content, 'base64');
      const { url } = await storagePut(s3Key, fileBuffer, mimeType);
      
      // Insert document record
      const [result] = await database.insert(documents).values({
        clientProtocolId: input.clientProtocolId,
        folderId: input.folderId,
        name: input.name,
        description: input.description,
        s3Key,
        s3Url: url,
        fileSize: fileBuffer.length,
        mimeType,
        visibility: input.visibility ?? 'shared',
        uploadedBy: 'coach',
        uploadedByUserId: ctx.user?.id,
      });
      
      return { id: result.insertId, url };
    }),
  
  // Client upload (via token)
  clientUpload: publicProcedure
    .input(z.object({
      token: z.string(),
      folderId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      base64Data: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { getClientProtocolByToken } = await import("../db");
      const protocol = await getClientProtocolByToken(input.token);
      
      if (!protocol) {
        throw new Error("Invalid access token");
      }
      
      // Extract base64 content
      const base64Match = input.base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = input.mimeType;
      let base64Content = input.base64Data;
      
      if (base64Match) {
        mimeType = base64Match[1];
        base64Content = base64Match[2];
      }
      
      // Upload to S3
      const s3Key = `client-documents/${protocol.id}/${Date.now()}-${input.name}`;
      const fileBuffer = Buffer.from(base64Content, 'base64');
      const { url } = await storagePut(s3Key, fileBuffer, mimeType);
      
      // Insert document record
      const [result] = await database.insert(documents).values({
        clientProtocolId: protocol.id,
        folderId: input.folderId,
        name: input.name,
        description: input.description,
        s3Key,
        s3Url: url,
        fileSize: fileBuffer.length,
        mimeType,
        visibility: 'shared',
        uploadedBy: 'client',
      });
      
      return { id: result.insertId, url };
    }),
  
  // Get download URL
  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const [doc] = await database
        .select()
        .from(documents)
        .where(eq(documents.id, input.id));
      
      if (!doc) {
        throw new Error("Document not found");
      }
      
      // Get presigned URL
      const { url } = await storageGet(doc.s3Key);
      return { url };
    }),
  
  // Update document metadata
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      folderId: z.number().optional(),
      visibility: z.enum(['shared', 'coach_only']).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { id, ...data } = input;
      
      await database
        .update(documents)
        .set(data)
        .where(eq(documents.id, id));
      
      return { success: true };
    }),
  
  // Soft delete document
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database
        .update(documents)
        .set({ deletedAt: new Date() })
        .where(eq(documents.id, input.id));
      return { success: true };
    }),
  
  // Restore deleted document
  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database
        .update(documents)
        .set({ deletedAt: null })
        .where(eq(documents.id, input.id));
      return { success: true };
    }),

  // ============ DOCUMENT REQUESTS ============
  requests: router({
    // List requests for a client
    list: protectedProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        status: z.enum(['pending', 'completed', 'cancelled']).optional(),
      }))
      .query(async ({ input }) => {
        const database = await db();
        const results = await database
          .select()
          .from(documentRequests)
          .where(eq(documentRequests.clientProtocolId, input.clientProtocolId))
          .orderBy(desc(documentRequests.createdAt));
        
        if (input.status) {
          return results.filter(r => r.status === input.status);
        }
        return results;
      }),
    
    // Create a document request
    create: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        targetFolderId: z.number().optional(),
        dueDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db();
        const [result] = await database.insert(documentRequests).values({
          clientProtocolId: input.clientProtocolId,
          requestedBy: ctx.user!.id,
          title: input.title,
          description: input.description,
          targetFolderId: input.targetFolderId,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        });
        
        return { id: result.insertId };
      }),
    
    // Complete a request (link to uploaded document)
    complete: adminProcedure
      .input(z.object({
        id: z.number(),
        documentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        await database
          .update(documentRequests)
          .set({
            status: 'completed',
            completedAt: new Date(),
            completedDocumentId: input.documentId,
          })
          .where(eq(documentRequests.id, input.id));
        
        return { success: true };
      }),
    
    // Cancel a request
    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db();
        await database
          .update(documentRequests)
          .set({ status: 'cancelled' })
          .where(eq(documentRequests.id, input.id));
        
        return { success: true };
      }),
  }),

  // ============ CLIENT PORTAL ACCESS ============
  // Get folders with documents for logged-in client
  getFolders: protectedProcedure.query(async ({ ctx }) => {
    const database = await db();
    
    // Get client's protocol ID from user email
    const { clientProtocols, users } = await import("../../drizzle/schema");
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.id, ctx.user!.id));
    
    if (!user?.email) {
      return [];
    }
    
    const [protocol] = await database
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${user.email})`);
    
    if (!protocol) {
      return [];
    }
    
    // Get folders
    let folders = await database
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.clientProtocolId, protocol.id))
      .orderBy(asc(documentFolders.sortOrder));
    
    // Auto-initialize system folders if none exist
    if (folders.length === 0) {
      const SYSTEM_FOLDERS = [
        { name: 'Labs', systemType: 'labs' },
        { name: 'Progress Reports', systemType: 'progress_reports' },
        { name: 'Intake & Waivers', systemType: 'intake_waivers' },
        { name: 'Resources', systemType: 'resources' },
        { name: 'Personal', systemType: 'personal' },
      ];
      
      for (let i = 0; i < SYSTEM_FOLDERS.length; i++) {
        const folder = SYSTEM_FOLDERS[i];
        await database.insert(documentFolders).values({
          clientProtocolId: protocol.id,
          name: folder.name,
          isSystem: true,
          systemType: folder.systemType,
          sortOrder: i,
        });
      }
      
      // Re-fetch folders after creation
      folders = await database
        .select()
        .from(documentFolders)
        .where(eq(documentFolders.clientProtocolId, protocol.id))
        .orderBy(asc(documentFolders.sortOrder));
    }
    
    // Get documents for each folder
    const docs = await database
      .select()
      .from(documents)
      .where(and(
        eq(documents.clientProtocolId, protocol.id),
        eq(documents.visibility, 'shared'),
        isNull(documents.deletedAt)
      ))
      .orderBy(desc(documents.createdAt));
    
    // Group documents by folder
    return folders.map(folder => ({
      ...folder,
      documents: docs.filter(d => d.folderId === folder.id),
    }));
  }),

  // Auto-file a document based on type
  autoFile: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      documentType: z.enum(['checkin_report', 'lab_result', 'waiver', 'intake', 'resource']),
      name: z.string().min(1),
      description: z.string().optional(),
      base64Data: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db();
      
      // Map document type to system folder
      const folderTypeMap: Record<string, string> = {
        'checkin_report': 'progress_reports',
        'lab_result': 'labs',
        'waiver': 'intake_waivers',
        'intake': 'intake_waivers',
        'resource': 'resources',
      };
      
      const systemType = folderTypeMap[input.documentType];
      
      // Find the target folder
      const [folder] = await database
        .select()
        .from(documentFolders)
        .where(and(
          eq(documentFolders.clientProtocolId, input.clientProtocolId),
          eq(documentFolders.systemType, systemType)
        ));
      
      if (!folder) {
        throw new Error(`System folder not found for type: ${input.documentType}`);
      }
      
      // Extract base64 content
      const base64Match = input.base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = input.mimeType;
      let base64Content = input.base64Data;
      
      if (base64Match) {
        mimeType = base64Match[1];
        base64Content = base64Match[2];
      }
      
      // Upload to S3
      const s3Key = `client-documents/${input.clientProtocolId}/${Date.now()}-${input.name}`;
      const fileBuffer = Buffer.from(base64Content, 'base64');
      const { url } = await storagePut(s3Key, fileBuffer, mimeType);
      
      // Insert document record
      const [result] = await database.insert(documents).values({
        clientProtocolId: input.clientProtocolId,
        folderId: folder.id,
        name: input.name,
        description: input.description,
        s3Key,
        s3Url: url,
        fileSize: fileBuffer.length,
        mimeType,
        visibility: 'shared',
        uploadedBy: 'system',
        uploadedByUserId: ctx.user?.id,
      });
      
      return { id: result.insertId, url, folderId: folder.id, folderName: folder.name };
    }),

  // Client upload for logged-in users (no token needed)
  clientUploadProtected: protectedProcedure
    .input(z.object({
      folderId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      base64Data: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db();
      const { clientProtocols, users } = await import("../../drizzle/schema");
      
      // Get client's protocol ID from user email
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, ctx.user!.id));
      
      if (!user?.email) {
        throw new Error("User email not found");
      }
      
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${user.email})`);
      
      if (!protocol) {
        throw new Error("No active protocol found for this user");
      }
      
      // Extract base64 content
      const base64Match = input.base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = input.mimeType;
      let base64Content = input.base64Data;
      
      if (base64Match) {
        mimeType = base64Match[1];
        base64Content = base64Match[2];
      }
      
      // Upload to S3
      const s3Key = `client-documents/${protocol.id}/${Date.now()}-${input.name}`;
      const fileBuffer = Buffer.from(base64Content, 'base64');
      const { url } = await storagePut(s3Key, fileBuffer, mimeType);
      
      // Insert document record
      const [result] = await database.insert(documents).values({
        clientProtocolId: protocol.id,
        folderId: input.folderId,
        name: input.name,
        description: input.description,
        s3Key,
        s3Url: url,
        fileSize: fileBuffer.length,
        mimeType,
        visibility: 'shared',
        uploadedBy: 'client',
        uploadedByUserId: ctx.user!.id,
      });
      
      return { id: result.insertId, url };
    }),

  // Get documents for client portal (via token)
  getClientDocuments: publicProcedure
    .input(z.object({
      token: z.string(),
      folderId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      const { getClientProtocolByToken } = await import("../db");
      const protocol = await getClientProtocolByToken(input.token);
      
      if (!protocol) {
        throw new Error("Invalid access token");
      }
      
      // Get folders
      const folders = await database
        .select()
        .from(documentFolders)
        .where(eq(documentFolders.clientProtocolId, protocol.id))
        .orderBy(asc(documentFolders.sortOrder));
      
      // Get documents (only shared visibility)
      const docs = await database
        .select()
        .from(documents)
        .where(and(
          eq(documents.clientProtocolId, protocol.id),
          eq(documents.visibility, 'shared'),
          isNull(documents.deletedAt)
        ))
        .orderBy(desc(documents.createdAt));
      
      // Filter by folder if specified
      const filteredDocs = input.folderId 
        ? docs.filter(d => d.folderId === input.folderId)
        : docs;
      
      // Get pending requests
      const requests = await database
        .select()
        .from(documentRequests)
        .where(and(
          eq(documentRequests.clientProtocolId, protocol.id),
          eq(documentRequests.status, 'pending')
        ));
      
      return { folders, documents: filteredDocs, pendingRequests: requests };
    }),
});
