import { supabaseAdmin, supabasePublic, isSupabaseServerConfigured } from './services/supabase.js';

async function testSupabaseAuth() {
  console.log('--- Testing Supabase Auth Service ---');
  console.log('isSupabaseServerConfigured:', isSupabaseServerConfigured);

  const testEmail = `test_user_${Date.now()}@campus.edu`;
  const testPassword = 'Password123!';

  console.log('\n1. Testing supabasePublic.auth.signUp:');
  const { data: signUpData, error: signUpError } = await supabasePublic.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Test Public User',
        college: 'Central Campus'
      }
    }
  });

  console.log('signUp Result:');
  console.log('Error:', signUpError?.message || 'none');
  console.log('User ID:', signUpData?.user?.id);
  console.log('Session exists?:', Boolean(signUpData?.session));
  console.log('Identities count:', signUpData?.user?.identities?.length);

  console.log('\n2. Testing supabasePublic.auth.signInWithPassword with newly signed-up user:');
  const { data: signInData, error: signInError } = await supabasePublic.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  console.log('signIn Result:');
  console.log('Error:', signInError?.message || 'none');
  console.log('Session exists?:', Boolean(signInData?.session));
  console.log('User ID:', signInData?.user?.id);

  console.log('\n3. Testing supabaseAdmin.auth.admin.createUser (Auto-confirmed):');
  const adminEmail = `admin_created_${Date.now()}@campus.edu`;
  const { data: adminCreated, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin Created User',
      college: 'North Campus'
    }
  });

  console.log('adminCreate Result:');
  console.log('Error:', adminCreateError?.message || 'none');
  console.log('User ID:', adminCreated?.user?.id);

  console.log('\n4. Testing signInWithPassword for admin-created user:');
  const { data: adminSignInData, error: adminSignInError } = await supabasePublic.auth.signInWithPassword({
    email: adminEmail,
    password: testPassword
  });

  console.log('adminSignIn Result:');
  console.log('Error:', adminSignInError?.message || 'none');
  console.log('Session exists?:', Boolean(adminSignInData?.session));
  console.log('User ID:', adminSignInData?.user?.id);
}

testSupabaseAuth().catch(console.error);
