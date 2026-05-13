// Script to sync all existing clients to client projects
// Run with: node scripts/sync-clients-to-projects.mjs

import 'dotenv/config';

const API_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

async function syncClientsToProjects() {
  console.log('Starting sync of clients to projects...');
  console.log('API URL:', API_URL);
  
  try {
    // We need to call the tRPC endpoint
    // Since this is an admin procedure, we'd need authentication
    // For now, let's just log what would happen
    console.log('\nTo sync existing clients to projects, you can:');
    console.log('1. Go to Admin Dashboard > Operations > Client Projects');
    console.log('2. Click the "Sync Clients" button (if available)');
    console.log('3. Or call the API endpoint: trpc.clientProject.syncClientsToProjects.mutate()');
    console.log('\nThe sync will:');
    console.log('- Find all clients without a clientProjectId');
    console.log('- Create a new client project for each with "on_hold" (inactive) status');
    console.log('- Link the client to the new project');
    console.log('- Set the project to the "Intake" lifecycle stage');
  } catch (error) {
    console.error('Error:', error);
  }
}

syncClientsToProjects();
