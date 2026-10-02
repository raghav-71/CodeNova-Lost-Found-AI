import { Request, Response, NextFunction } from 'express';

/**
 * Security Input Validation and Sanitization Middleware for FindIt AI
 * Provides defense-in-depth against injection, parameter tampering, and oversized payloads.
 */

// Regex patterns for strict server-side validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_CATEGORIES = [
  'Electronics',
  'Documents',
  'Wallet',
  'Keys',
  'Books',
  'Bags',
  'Clothing',
  'Accessories',
  'ID Cards',
  'Other'
];

/**
 * Sanitize string: strips null bytes, control characters, and trims.
 */
export function sanitizeString(val: any, maxLength = 1000): string {
  if (val === null || val === undefined) return '';
  const str = String(val)
    .replace(/\0/g, '') // strip null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip ASCII control chars except tab/newline
    .trim();
  return str.slice(0, maxLength);
}

/**
 * Validate registration input
 */
export function validateRegister(req: Request, res: Response, next: NextFunction) {
  const { name, email, password, campus, phone } = req.body;

  if (!name || typeof name !== 'string' || sanitizeString(name).length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
  }
  if (sanitizeString(name).length > 100) {
    return res.status(400).json({ error: 'Name cannot exceed 100 characters.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (email.trim().length > 254) {
    return res.status(400).json({ error: 'Email cannot exceed 254 characters.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password cannot exceed 128 characters.' });
  }

  if (campus && typeof campus === 'string' && sanitizeString(campus).length > 100) {
    return res.status(400).json({ error: 'Campus name cannot exceed 100 characters.' });
  }

  if (phone && typeof phone === 'string' && sanitizeString(phone).length > 30) {
    return res.status(400).json({ error: 'Phone number cannot exceed 30 characters.' });
  }

  // Sanitize values
  req.body.name = sanitizeString(name, 100);
  req.body.email = email.trim().toLowerCase().slice(0, 254);
  if (campus) req.body.campus = sanitizeString(campus, 100);
  if (phone) req.body.phone = sanitizeString(phone, 30);

  return next();
}

/**
 * Validate login input
 */
export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }

  req.body.email = email.trim().toLowerCase().slice(0, 254);
  return next();
}

/**
 * Validate item creation / update
 */
export function validateItem(req: Request, res: Response, next: NextFunction) {
  const { type, title, description, category, location, building_zone, date, time, characteristics } = req.body;

  if (req.method === 'POST') {
    if (!type || typeof type !== 'string' || !['LOST', 'FOUND'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Item type must be either LOST or FOUND.' });
    }
  }

  if (title !== undefined) {
    const cleanTitle = sanitizeString(title, 200);
    if (cleanTitle.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters.' });
    }
    req.body.title = cleanTitle;
  }

  if (description !== undefined) {
    const cleanDesc = sanitizeString(description, 5000);
    if (cleanDesc.length < 5) {
      return res.status(400).json({ error: 'Description must be at least 5 characters.' });
    }
    req.body.description = cleanDesc;
  }

  if (category !== undefined) {
    const cleanCat = sanitizeString(category, 50);
    if (!ALLOWED_CATEGORIES.includes(cleanCat)) {
      req.body.category = 'Other';
    } else {
      req.body.category = cleanCat;
    }
  }

  if (location !== undefined) {
    const cleanLoc = sanitizeString(location, 200);
    if (cleanLoc.length < 2) {
      return res.status(400).json({ error: 'Location must be at least 2 characters.' });
    }
    req.body.location = cleanLoc;
  }

  if (date !== undefined) {
    const cleanDate = sanitizeString(date, 50);
    if (!cleanDate) {
      return res.status(400).json({ error: 'Date is required.' });
    }
    req.body.date = cleanDate;
  }

  if (building_zone !== undefined) {
    req.body.building_zone = sanitizeString(building_zone, 100);
  }

  if (time !== undefined) {
    req.body.time = sanitizeString(time, 50);
  }

  if (characteristics !== undefined) {
    req.body.characteristics = sanitizeString(characteristics, 2000);
  }

  return next();
}

/**
 * Validate claim submission (Simplified Flow - only itemId required)
 */
export function validateClaim(req: Request, res: Response, next: NextFunction) {
  const { itemId, locationLost, dateLost, identifyingDetails, proofNotes, message } = req.body;

  if (!itemId || typeof itemId !== 'string' || !UUID_REGEX.test(itemId.trim())) {
    return res.status(400).json({ error: 'A valid Item ID (UUID) is required.' });
  }

  req.body.itemId = itemId.trim();
  if (locationLost !== undefined && typeof locationLost === 'string') {
    req.body.locationLost = sanitizeString(locationLost, 200);
  }
  if (dateLost !== undefined && typeof dateLost === 'string') {
    req.body.dateLost = sanitizeString(dateLost, 50);
  }
  if (identifyingDetails !== undefined && typeof identifyingDetails === 'string') {
    req.body.identifyingDetails = sanitizeString(identifyingDetails, 5000);
  }
  if (proofNotes !== undefined && typeof proofNotes === 'string') {
    req.body.proofNotes = sanitizeString(proofNotes, 5000);
  }
  if (message !== undefined && typeof message === 'string') {
    req.body.message = sanitizeString(message, 1000);
  }

  return next();
}

/**
 * Validate AI Search Query
 */
export function validateAISearch(req: Request, res: Response, next: NextFunction) {
  const { query, imageBase64 } = req.body;

  if (!query || typeof query !== 'string' || sanitizeString(query, 1000).length === 0) {
    return res.status(400).json({ error: 'Please enter a natural language description to search.' });
  }

  if (query.length > 1000) {
    return res.status(400).json({ error: 'Search query cannot exceed 1000 characters.' });
  }

  if (imageBase64 && typeof imageBase64 === 'string') {
    // Limit base64 length to ~15MB equivalent (approx 20 million chars)
    if (imageBase64.length > 20_000_000) {
      return res.status(400).json({ error: 'Uploaded base64 image exceeds 15MB size limit.' });
    }
  }

  req.body.query = sanitizeString(query, 1000);
  return next();
}
