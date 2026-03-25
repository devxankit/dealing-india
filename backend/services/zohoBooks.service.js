import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const getZohoConfig = () => ({
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
  ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
  ZOHO_BOOKS_BASE: process.env.ZOHO_BOOKS_BASE_URL || 'https://www.zohoapis.in/books/v3',
  ZOHO_ACCOUNTS_BASE: process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.in',
});

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

async function getAccessToken() {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ACCOUNTS_BASE } = getZohoConfig();
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.error('[Zoho] Missing OAuth configuration in environment variables');
    throw new Error('Zoho OAuth env vars are not fully configured. Ensure ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN are set.');
  }

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;
  console.log('[Zoho] Requesting new access token...');
  const res = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  if (!res.data?.access_token) {
    console.error('[Zoho] Token refresh failed response:', res.data);
    throw new Error(`Failed to obtain Zoho access token: ${res.data?.error || 'unknown error'}`);
  }

  cachedAccessToken = res.data.access_token;
  const expiresInSec = Number(res.data.expires_in || 3600);
  cachedAccessTokenExpiresAt = Date.now() + expiresInSec * 1000;
  console.log('[Zoho] New access token obtained');
  return cachedAccessToken;
}

async function zohoRequest(method, path, { params = {}, data = {} } = {}) {
  const { ZOHO_ORG_ID, ZOHO_BOOKS_BASE } = getZohoConfig();
  if (!ZOHO_ORG_ID) throw new Error('ZOHO_ORG_ID is not configured');

  const token = await getAccessToken();
  const url = `${ZOHO_BOOKS_BASE}${path}`;

  try {
    console.log(`[Zoho] ${method} ${path}`);
    const res = await axios.request({
      method,
      url,
      params,
      data,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        'X-com-zoho-books-organizationid': ZOHO_ORG_ID,
      },
      timeout: 15000,
    });

    if (res.data?.code && res.data.code !== 0) {
      console.error('[Zoho] API Error Response:', res.data);
      throw new Error(`Zoho API error (${res.data.code}): ${res.data.message || 'Unknown error'}`);
    }

    return res.data;
  } catch (err) {
    if (err.response?.data) {
      console.error('[Zoho] HTTP Error Response:', err.response.data);
      throw new Error(`Zoho integration error: ${err.response.data.message || JSON.stringify(err.response.data)}`);
    }
    console.error('[Zoho] Request failed:', err.message);
    throw err;
  }
}

async function findContactByEmail(email) {
  if (!email) return null;
  const data = await zohoRequest('GET', '/contacts', { params: { email } });
  return data?.contacts?.[0] || null;
}

async function createContact({ name, companyName, email, phone, gstNumber }) {
  const contact = {
    contact_name: companyName || name || email || 'Customer',
    company_name: companyName || undefined,
    email: email || undefined,
    contact_persons: [{
      first_name: name || email || 'Customer',
      email: email || undefined,
      phone: phone || undefined,
      is_primary_contact: true,
    }],
    gst_no: gstNumber || undefined,
    gst_treatment: gstNumber ? 'business_gst' : 'consumer',
  };
  if (phone) contact.phone = phone;

  const data = await zohoRequest('POST', '/contacts', { data: contact });
  return data?.contact || null;
}

export async function ensureZohoContactForVendor(vendor) {
  if (!vendor) throw new Error('Vendor is required');
  if (vendor.zohoContactId) return vendor.zohoContactId;

  let contact = await findContactByEmail(vendor.email);
  if (contact) {
    // Proactively update contact with GST if available
    if (vendor.gstNumber && !contact.gst_no) {
      try {
        await zohoRequest('PUT', `/contacts/${contact.contact_id}`, {
          data: {
            gst_no: vendor.gstNumber,
            gst_treatment: 'business_gst'
          }
        });
      } catch (e) {
        console.warn('[Zoho] Failed to update contact GST:', e.message);
      }
    }
  } else {
    contact = await createContact({
      name: vendor.name || vendor.storeName,
      companyName: vendor.storeName || vendor.businessName,
      email: vendor.email,
      phone: vendor.phone,
      gstNumber: vendor.gstNumber,
    });
  }
  return contact?.contact_id || contact?.contact_person_id;
}

export async function createSubscriptionInvoice({ 
  contactId, 
  planName, 
  amount, 
  currency = 'INR', 
  referenceNumber, 
  notes, 
  vendorGstNumber,
  baseAmount,
  gstAmount,
  discount
}) {
  const dateStr = new Date().toISOString().slice(0, 10);
  
  const lineItems = [];
  if (baseAmount && gstAmount) {
    // 1. Base Plan Price
    lineItems.push({
      description: planName || 'Subscription',
      rate: baseAmount,
      quantity: 1,
    });

    // 2. Discount (if any)
    if (discount && discount > 0) {
      lineItems.push({
        description: 'Discount Applied',
        rate: -discount,
        quantity: 1,
      });
    }

    // 3. GST
    lineItems.push({
      description: 'GST (Tax)',
      rate: gstAmount,
      quantity: 1,
    });
  } else {
    // Fallback to total amount single line
    lineItems.push({
      description: planName || 'Subscription',
      rate: amount,
      quantity: 1,
    });
  }

  const invoice = {
    customer_id: contactId,
    date: dateStr,
    payment_terms: 0,
    reference_number: referenceNumber,
    line_items: lineItems,
    currency_code: currency,
    notes: `${notes || ''}\n\nVendor GST: ${vendorGstNumber || 'N/A'}\nAdmin GST: ${process.env.ADMIN_GST_NUMBER || 'Configuring...'}`,
    gst_no: vendorGstNumber || undefined,
    gst_treatment: vendorGstNumber ? 'business_gst' : 'consumer',
  };

  console.log(`[Zoho] Creating invoice for contact: ${contactId}, Amount: ${amount}`);
  const data = await zohoRequest('POST', '/invoices', { data: invoice });
  const inv = data?.invoice;
  if (!inv) {
    console.error('[Zoho] Invoice creation returned no invoice data');
    throw new Error('Zoho did not return invoice');
  }

  console.log(`[Zoho] Invoice created: ${inv.invoice_number} (ID: ${inv.invoice_id})`);
  return {
    id: inv.invoice_id,
    number: inv.invoice_number,
    status: inv.status,
    pdfUrl: inv.invoice_pdf_url || inv.invoice_url || null,
  };
}

export async function downloadInvoicePdf(invoiceId) {
  if (!invoiceId) return null;
  const { ZOHO_ORG_ID, ZOHO_BOOKS_BASE } = getZohoConfig();
  const token = await getAccessToken();
  const url = `${ZOHO_BOOKS_BASE}/invoices/${invoiceId}`;

  try {
    console.log(`[Zoho] Attempting to download PDF for invoice: ${invoiceId}`);
    const res = await axios.get(url, {
      params: { accept: 'pdf' },
      headers: { 
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-books-organizationid': ZOHO_ORG_ID
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    const buffer = Buffer.from(res.data);
    if (buffer.slice(0, 4).toString() === '%PDF') {
      console.log(`[Zoho] PDF downloaded: ${buffer.length} bytes`);
      return buffer;
    }
    console.error('[Zoho] Content is not a PDF');
    return null;
  } catch (err) {
    console.error('[Zoho] PDF download failed:', err.message);
    return null;
  }
}

export async function recordInvoicePayment({ contactId, invoiceId, amount, paymentDate, razorpayPaymentId, paymentMode = 'razorpay' }) {
  const date = (paymentDate ? new Date(paymentDate) : new Date()).toISOString().slice(0, 10);
  const payment = {
    customer_id: contactId,
    payment_mode: paymentMode,
    amount,
    date,
    reference_number: razorpayPaymentId,
    invoices: [{ invoice_id: invoiceId, amount_applied: amount }],
  };
  const data = await zohoRequest('POST', '/customerpayments', { data: payment });
  return { id: data?.payment?.payment_id || null, status: data?.payment?.status || null };
}

export default {
  getAccessToken,
  ensureZohoContactForVendor,
  createSubscriptionInvoice,
  recordInvoicePayment,
  downloadInvoicePdf,
};
