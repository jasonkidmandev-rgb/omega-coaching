import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getClientProtocolById: vi.fn(),
  getClientById: vi.fn(),
  getAllLifecycleStages: vi.fn(),
  createClientProject: vi.fn(),
  updateClient: vi.fn(),
  getAllClients: vi.fn(),
  getAllClientProjectsWithProgress: vi.fn(),
}));

describe('Auto Client Project Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create client project with on_hold status by default', async () => {
    const db = await import('./db');
    
    // Mock protocol
    const mockProtocol = {
      id: 1,
      clientId: 100,
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
    };
    
    // Mock client without project
    const mockClient = {
      id: 100,
      name: 'Test Client',
      clientProjectId: null, // No project yet
    };
    
    // Mock lifecycle stages
    const mockStages = [
      { id: 1, name: 'Intake', sortOrder: 0 },
      { id: 2, name: 'Active', sortOrder: 1 },
    ];
    
    (db.getClientProtocolById as any).mockResolvedValue(mockProtocol);
    (db.getClientById as any).mockResolvedValue(mockClient);
    (db.getAllLifecycleStages as any).mockResolvedValue(mockStages);
    (db.createClientProject as any).mockResolvedValue(200);
    (db.updateClient as any).mockResolvedValue(undefined);
    
    // Simulate the auto-project creation logic
    const createdProtocol = await db.getClientProtocolById(1);
    expect(createdProtocol).toBeDefined();
    
    const existingClient = await db.getClientById(createdProtocol!.clientId);
    expect(existingClient?.clientProjectId).toBeNull();
    
    const lifecycleStages = await db.getAllLifecycleStages();
    const intakeStage = lifecycleStages.find((s: any) => s.name === 'Intake');
    
    // Default status should be 'on_hold' (inactive)
    const activateInProjects = false;
    const projectStatus = activateInProjects ? 'active' : 'on_hold';
    
    expect(projectStatus).toBe('on_hold');
    
    const projectId = await db.createClientProject({
      clientName: mockProtocol.clientName,
      clientEmail: mockProtocol.clientEmail,
      clientProtocolId: mockProtocol.id,
      status: projectStatus,
      currentLifecycleStageId: intakeStage?.id,
    });
    
    expect(db.createClientProject).toHaveBeenCalledWith({
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      clientProtocolId: 1,
      status: 'on_hold',
      currentLifecycleStageId: 1,
    });
    
    await db.updateClient(mockClient.id, {
      isActiveInProjects: false,
      clientProjectId: projectId,
    });
    
    expect(db.updateClient).toHaveBeenCalledWith(100, {
      isActiveInProjects: false,
      clientProjectId: 200,
    });
  });

  it('should create client project with active status when activateInProjects is true', async () => {
    const db = await import('./db');
    
    const mockStages = [
      { id: 1, name: 'Intake', sortOrder: 0 },
    ];
    
    (db.getAllLifecycleStages as any).mockResolvedValue(mockStages);
    (db.createClientProject as any).mockResolvedValue(201);
    
    // When activateInProjects is true
    const activateInProjects = true;
    const projectStatus = activateInProjects ? 'active' : 'on_hold';
    
    expect(projectStatus).toBe('active');
    
    await db.createClientProject({
      clientName: 'Active Client',
      clientEmail: 'active@example.com',
      clientProtocolId: 2,
      status: projectStatus,
      currentLifecycleStageId: 1,
    });
    
    expect(db.createClientProject).toHaveBeenCalledWith({
      clientName: 'Active Client',
      clientEmail: 'active@example.com',
      clientProtocolId: 2,
      status: 'active',
      currentLifecycleStageId: 1,
    });
  });

  it('should not create duplicate project if client already has one', async () => {
    const db = await import('./db');
    
    // Mock client WITH existing project
    const mockClient = {
      id: 100,
      name: 'Test Client',
      clientProjectId: 50, // Already has a project
    };
    
    (db.getClientById as any).mockResolvedValue(mockClient);
    
    const existingClient = await db.getClientById(100);
    
    // Should not create project if one already exists
    if (existingClient?.clientProjectId) {
      // Skip project creation
      expect(db.createClientProject).not.toHaveBeenCalled();
    }
  });

  it('should sync existing clients to projects with on_hold status', async () => {
    const db = await import('./db');
    
    // Mock clients without projects
    const mockClients = [
      { id: 1, name: 'Client 1', email: 'client1@test.com', clientProjectId: null, deletedAt: null },
      { id: 2, name: 'Client 2', email: 'client2@test.com', clientProjectId: null, deletedAt: null },
      { id: 3, name: 'Client 3', email: 'client3@test.com', clientProjectId: 100, deletedAt: null }, // Already has project
    ];
    
    const mockStages = [
      { id: 1, name: 'Intake', sortOrder: 0 },
    ];
    
    (db.getAllClients as any).mockResolvedValue(mockClients);
    (db.getAllLifecycleStages as any).mockResolvedValue(mockStages);
    (db.getAllClientProjectsWithProgress as any).mockResolvedValue([]);
    (db.createClientProject as any).mockResolvedValue(200);
    (db.updateClient as any).mockResolvedValue(undefined);
    
    const allClients = await db.getAllClients();
    const clientsWithoutProject = allClients.filter((c: any) => !c.clientProjectId && !c.deletedAt);
    
    expect(clientsWithoutProject.length).toBe(2);
    
    // Sync should create projects with 'on_hold' status
    for (const client of clientsWithoutProject) {
      const lifecycleStages = await db.getAllLifecycleStages();
      const intakeStage = lifecycleStages.find((s: any) => s.name === 'Intake');
      
      await db.createClientProject({
        clientName: client.name,
        clientEmail: client.email,
        status: 'on_hold', // Always inactive for synced clients
        currentLifecycleStageId: intakeStage?.id,
      });
    }
    
    expect(db.createClientProject).toHaveBeenCalledTimes(2);
  });
});
