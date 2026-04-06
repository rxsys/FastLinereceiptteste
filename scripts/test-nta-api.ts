/**
 * Script to test the NTA (National Tax Agency) Web-API for Corporate Numbers (Houjin Bangou)
 * and Qualified Invoice Issuers (Tekikaku Seikyu-sho Hakkou Jigyousha).
 */

async function testNtaApi() {
  // 1. Define the Application ID provided for authentication.
  const appId = 'KhdvgjqHdHtF8';

  // 2. Define the test Corporate Number. 
  const rawCorporateNumber = '5070001021901';
  // Corporate Number API usually expects 13 digits without 'T'.
  const corporateNumberOnly = rawCorporateNumber.startsWith('T') 
    ? rawCorporateNumber.substring(1) 
    : rawCorporateNumber;
  // Invoice API usually expects 'T' + 13 digits.
  const invoiceNumber = rawCorporateNumber.startsWith('T')
    ? rawCorporateNumber
    : `T${rawCorporateNumber}`;

  // --- 1. TEST CORPORATE NUMBER API (Houjin Bangou) ---
  // Endpoint: https://api.houjin-bangou.nta.go.jp/4/num
  // type: 12 (JSON format)
  const houjinUrl = `https://api.houjin-bangou.nta.go.jp/4/num?id=${appId}&number=${corporateNumberOnly}&type=12`;

  console.log(`\n--- Testing Corporate Number API (Houjin Bangou) ---`);
  console.log(`Requesting URL: ${houjinUrl}`);

  try {
    const response = await fetch(houjinUrl);
    const text = await response.text();

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    try {
      const data = JSON.parse(text);
      console.log('API Response (JSON):', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('API Response (Text/XML):', text);
    }
  } catch (error) {
    console.error('Fetch Error (Houjin):', error);
  }

  // --- 2. TEST QUALIFIED INVOICE ISSUER API (Invoice System) ---
  // Endpoint: https://web-api.invoice-kohyo.nta.go.jp/1/num
  // type: 21 (JSON format)
  const invoiceUrl = `https://web-api.invoice-kohyo.nta.go.jp/1/num?id=${appId}&number=${invoiceNumber}&type=21`;

  console.log(`\n--- Testing Qualified Invoice Issuer API ---`);
  console.log(`Requesting URL: ${invoiceUrl}`);

  try {
    const response = await fetch(invoiceUrl);
    const text = await response.text();

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    try {
      const data = JSON.parse(text);
      console.log('API Response (JSON):', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('API Response (Text/XML):', text);
    }
  } catch (error) {
    console.error('Fetch Error (Invoice):', error);
  }
}

// Execute the test script.
testNtaApi();