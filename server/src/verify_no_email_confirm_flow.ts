import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { supabaseAdmin } from './services/supabase.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('--- STARTING COMPREHENSIVE AUTH FLOW VERIFICATION (NO EMAIL CONFIRM REQUIRED) ---');

  const randomId = Math.random().toString(36).substring(2, 9);
  const testEmail = `student_${randomId}@campus.edu`;
  const testPassword = `CampusPass!${randomId}A1`;
  const testName = `Alex Rivera ${randomId}`;
  const testCampus = 'North Engineering Quad';

  let createdUserId: string | null = null;

  try {
    // STEP 1: Registration with email + password
    console.log(`\n[STEP 1] Testing Register without email confirmation requirement...`);
    console.log(`Registering new student: ${testEmail}`);
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        campus: testCampus,
        phone: '+1 555-0199'
      })
    });

    const regData = (await regRes.json()) as any;
    console.log(`Registration HTTP Status: ${regRes.status}`);

    if (regRes.status !== 201 && regRes.status !== 200) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    if (!regData.token || !regData.user) {
      throw new Error(`Registration did not return auth token or user profile!`);
    }

    createdUserId = regData.user.id;
    const initialToken = regData.token;
    console.log(`✓ Registration succeeded immediately with JWT! User ID: ${createdUserId}`);
    console.log(`✓ User profile created: Name: ${regData.user.name}, Email: ${regData.user.email}, Campus: ${regData.user.campus}`);

    // STEP 2: Verify in Supabase Auth that email is auto-confirmed
    console.log(`\n[STEP 2] Verifying Supabase Auth state directly via Admin API...`);
    const { data: authUser, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(createdUserId!);
    if (authUserErr || !authUser?.user) {
      throw new Error(`Could not query Supabase Auth for user: ${authUserErr?.message}`);
    }

    console.log(`Supabase Auth User ID: ${authUser.user.id}`);
    console.log(`Supabase Auth email_confirmed_at: ${authUser.user.email_confirmed_at}`);
    if (!authUser.user.email_confirmed_at) {
      throw new Error('Supabase Auth user email_confirmed_at is NULL! Email confirmation was not auto-confirmed.');
    }
    console.log(`✓ Supabase Auth email_confirmed_at is valid timestamp (${authUser.user.email_confirmed_at})! No confirmation link required.`);

    // STEP 3: Authenticated access to /api/auth/me using initialToken
    console.log(`\n[STEP 3] Testing immediate authenticated session at /api/auth/me...`);
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });
    const meData = (await meRes.json()) as any;
    if (meRes.status !== 200 || !meData.user) {
      throw new Error(`Failed to load profile with initial token: ${JSON.stringify(meData)}`);
    }
    console.log(`✓ Authenticated session active without email verification barrier! Verified as: ${meData.user.email}`);

    // STEP 4: Access user dashboard stats immediately
    console.log(`\n[STEP 4] Testing immediate access to dashboard stats at /api/stats/user...`);
    const statsRes = await fetch(`${API_BASE}/stats/user`, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });
    const statsData = (await statsRes.json()) as any;
    if (statsRes.status !== 200) {
      throw new Error(`Failed to load user stats: ${JSON.stringify(statsData)}`);
    }
    console.log(`✓ Dashboard stats accessible: ${JSON.stringify(statsData)}`);

    // STEP 5: Simulate Logout (session dropped)
    console.log(`\n[STEP 5] Simulating user logout (token dropped)...`);
    const loggedOutToken = null;
    console.log(`✓ User logged out.`);

    // STEP 6: Re-login with the same email and password
    console.log(`\n[STEP 6] Testing Login with email + password (no email confirmation error)...`);
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const loginData = (await loginRes.json()) as any;
    console.log(`Login HTTP Status: ${loginRes.status}`);

    if (loginRes.status !== 200 || !loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    const reAuthToken = loginData.token;
    console.log(`✓ Login succeeded immediately! Re-authenticated token received.`);
    console.log(`✓ Returned User ID: ${loginData.user.id}, Email: ${loginData.user.email}`);

    // STEP 7: Re-fetch user profile and dashboard stats with re-authenticated token
    console.log(`\n[STEP 7] Verifying restored session and dashboard access...`);
    const restoreMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${reAuthToken}` }
    });
    const restoreMeData = (await restoreMeRes.json()) as any;
    if (restoreMeRes.status !== 200 || restoreMeData.user.id !== createdUserId) {
      throw new Error(`Restored profile mismatch: ${JSON.stringify(restoreMeData)}`);
    }
    console.log(`✓ Re-authenticated session verified matches original user: ${restoreMeData.user.id}`);

    // STEP 8: Cleanup test account
    console.log(`\n[STEP 8] Cleaning up verification user...`);
    if (createdUserId) {
      await supabaseAdmin.from('profiles').delete().eq('id', createdUserId);
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      console.log(`✓ Test user cleaned up from Supabase.`);
    }

    console.log(`\n============================================================`);
    console.log(`ALL CHECKS PASSED: NO EMAIL CONFIRMATION REQUIRED FLOW IS 100% OPERATIONAL`);
    console.log(`============================================================\n`);
  } catch (err: any) {
    console.error(`\n❌ VERIFICATION FAILED:`, err.message);
    if (createdUserId) {
      try {
        await supabaseAdmin.from('profiles').delete().eq('id', createdUserId);
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      } catch {}
    }
    process.exit(1);
  }
}

runVerification();
