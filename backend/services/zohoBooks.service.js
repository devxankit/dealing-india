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
    console.log('[Zoho] Using cached access token');
    return cachedAccessToken;
  }

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.error('[Zoho] Missing OAuth env vars', {
      hasClientId: !!ZOHO_CLIENT_ID,
      hasClientSecret: !!ZOHO_CLIENT_SECRET,
      hasRefreshToken: !!ZOHO_REFRESH_TOKEN,
    });
    throw new Error('Zoho OAuth env vars are not fully configured');
  }

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;

  console.log('[Zoho] Requesting new access token from', url);
  const res = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  if (!res.data?.access_token) {
    console.error('[Zoho] Token response without access_token', res.data);
    throw new Error(
      `Failed to obtain Zoho access token: ${res.data?.error || 'unknown error'}`
    );
  }

  cachedAccessToken = res.data.access_token;
  const expiresInSec = Number(res.data.expires_in || 3600);
  cachedAccessTokenExpiresAt = Date.now() + expiresInSec * 1000;
  console.log('[Zoho] Access token obtained, expires in', expiresInSec, 'seconds');
  return cachedAccessToken;
}

async function zohoRequest(method, path, { params = {}, data = {} } = {}) {
  const { ZOHO_ORG_ID, ZOHO_BOOKS_BASE } = getZohoConfig();
  if (!ZOHO_ORG_ID) {
    console.error('[Zoho] ZOHO_ORG_ID not configured');
    throw new Error('ZOHO_ORG_ID is not configured');
  }

  const token = await getAccessToken();
  const url = `${ZOHO_BOOKS_BASE}${path}`;

  try {
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
      console.error('[Zoho] API error payload', res.data);
      throw new Error(
        `Zoho API error (${res.data.code}): ${res.data.message || 'Unknown error'}`
      );
    }

    return res.data;
  } catch (err) {
    if (err.response?.data) {
      console.error('[Zoho] Axios error response:', JSON.stringify(err.response.data, null, 2));
      throw new Error(
        `Zoho integration error: ${err.response.data.message || JSON.stringify(err.response.data)}`
      );
    }
    throw err;
  }
}

async function findContactByEmail(email) {
  if (!email) return null;
  const data = await zohoRequest('GET', '/contacts', {
    params: { email },
  });
  const contacts = data?.contacts || [];
  return contacts[0] || null;
}

async function createContact({ name, companyName, email, phone }) {
  const contact = {
    contact_name: companyName || name || email || 'Customer',
    company_name: companyName || undefined,
    email: email || undefined,
    contact_persons: [],
  };

  if (phone) {
    contact.phone = phone;
  }
  if (name || email) {
    contact.contact_persons.push({
      first_name: name || email,
      email: email || undefined,
      phone: phone || undefined,
      is_primary_contact: true,
    });
  }

  console.log('[Zoho] Creating contact with payload:', JSON.stringify(contact, null, 2));
  const data = await zohoRequest('POST', '/contacts', { data: contact });
  return data?.contact || null;
}

export async function ensureZohoContactForVendor(vendor) {
  if (!vendor) throw new Error('Vendor is required');

  if (vendor.zohoContactId) {
    return vendor.zohoContactId;
  }

  const email = vendor.email;
  let contact = null;

  try {
    contact = await findContactByEmail(email);
  } catch (e) {
    console.error('Zoho findContactByEmail failed:', e.message);
  }

  if (!contact) {
    contact = await createContact({
      name: vendor.name || vendor.storeName,
      companyName: vendor.storeName || vendor.businessName,
      email,
      phone: vendor.phone,
    });
  }

  if (!contact?.contact_id) {
    throw new Error('Failed to create or fetch Zoho contact');
  }

  return contact.contact_id;
}

export async function createSubscriptionInvoice({
  contactId,
  planName,
  amount,
  currency = 'INR',
  referenceNumber,
  notes,
}) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  const invoice = {
    customer_id: contactId,
    date: dateStr,
    payment_terms: 0,
    reference_number: referenceNumber,
    line_items: [
      {
        description: planName || 'Subscription',
        rate: amount,
        quantity: 1,
      },
    ],
    currency_code: currency,
    ...(notes ? { notes } : {}),
  };

  const data = await zohoRequest('POST', '/invoices', { data: invoice });
  const inv = data?.invoice;
  if (!inv) throw new Error('Zoho did not return invoice');

  return {
    id: inv.invoice_id,
    number: inv.invoice_number,
    status: inv.status,
    pdfUrl: inv.invoice_pdf_url || inv.invoice_url || null,
  };
}

export async function recordInvoicePayment({
  contactId,
  invoiceId,
  amount,
  paymentDate,
  razorpayPaymentId,
  paymentMode = 'razorpay',
}) {
  const date = paymentDate
    ? new Date(paymentDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const payment = {
    customer_id: contactId,
    payment_mode: paymentMode,
    amount,
    date,
    reference_number: razorpayPaymentId,
    invoices: [
      {
        invoice_id: invoiceId,
        amount_applied: amount,
      },
    ],
  };

  const data = await zohoRequest('POST', '/customerpayments', {
    data: payment,
  });

  const p = data?.payment;
  return {
    id: p?.payment_id || null,
    status: p?.status || null,
  };
}

export default {
  getAccessToken,
  ensureZohoContactForVendor,
  createSubscriptionInvoice,
  recordInvoicePayment,
};

