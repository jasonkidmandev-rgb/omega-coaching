// Fetch download URL for Mat Versteegh's document
const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

const s3Key = 'client-documents/1050002/1773955047345-TruHealth Report-mar-2026.pdf';

const downloadApiUrl = new URL('v1/storage/downloadUrl', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
downloadApiUrl.searchParams.set('path', s3Key);

const response = await fetch(downloadApiUrl, {
  method: 'GET',
  headers: { Authorization: `Bearer ${apiKey}` },
});

const data = await response.json();
console.log('DOWNLOAD_URL=' + data.url);
