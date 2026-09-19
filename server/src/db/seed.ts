import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { initDatabase, DatabaseService } from './database.js';

export async function seedDatabase(db: DatabaseService) {
  console.log('Seeding FindIt AI campus database with realistic demo data...');

  // Clear existing records to allow clean re-seeding
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM claims;
    DELETE FROM potential_matches;
    DELETE FROM item_images;
    DELETE FROM items;
    DELETE FROM users;
  `);

  const passwordHash = await bcrypt.hash('password123', 10);

  // Users
  const users = [
    {
      id: 'u1-alex-turner',
      name: 'Alex Turner',
      email: 'alex.turner@campus.edu',
      campus: 'North Campus • Computer Science',
      phone: '+1 (555) 234-5678',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'student'
    },
    {
      id: 'u2-sarah-lin',
      name: 'Sarah Lin',
      email: 'sarah.lin@campus.edu',
      campus: 'Central Campus • Design & Architecture',
      phone: '+1 (555) 876-5432',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: 'student'
    },
    {
      id: 'u3-marcus-vance',
      name: 'Marcus Vance',
      email: 'marcus.vance@campus.edu',
      campus: 'East Campus • Biomedical Sciences',
      phone: '+1 (555) 345-6789',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      role: 'student'
    },
    {
      id: 'u4-priya-patel',
      name: 'Priya Patel',
      email: 'priya.patel@campus.edu',
      campus: 'West Campus • Electrical Engineering',
      phone: '+1 (555) 456-7890',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'student'
    }
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, name, email, password_hash, campus, phone, avatar, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, passwordHash, u.campus, u.phone, u.avatar, u.role]
    );
  }

  // Items
  const items = [
    // 1. Alex's Lost MacBook (High match with Sarah's Found MacBook)
    {
      id: 'item-lost-macbook',
      user_id: 'u1-alex-turner',
      type: 'LOST',
      title: 'Space Black MacBook Pro 14" (M3 Pro)',
      description: 'Space Black 14-inch MacBook Pro with a matte finish. Has a subtle GitHub sticker in the lower left corner of the lid and a small protective case.',
      category: 'Electronics',
      location: 'Main University Library',
      building_zone: '3rd Floor Quiet Study Pods',
      date: '2026-09-18',
      time: '14:30',
      status: 'MATCH_FOUND',
      primary_image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      characteristics: 'GitHub Octocat sticker on lid, slight scuff mark on top right USB-C port.'
    },
    // 2. Sarah's Found MacBook
    {
      id: 'item-found-macbook',
      user_id: 'u2-sarah-lin',
      type: 'FOUND',
      title: 'Dark Grey / Black Apple MacBook Laptop',
      description: 'Found unattended on a study desk on 3rd floor library. Kept safely with desk supervisor. Dark grey metallic finish with a programmer sticker on cover.',
      category: 'Electronics',
      location: 'Main University Library',
      building_zone: '3rd Floor Study Pod Area',
      date: '2026-09-18',
      time: '16:15',
      status: 'MATCH_FOUND',
      primary_image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Black matte case, developer sticker on outer lid. Logged with Library Lost & Found Desk.'
    },
    // 3. Alex's Lost AirPods Pro
    {
      id: 'item-lost-airpods',
      user_id: 'u1-alex-turner',
      type: 'LOST',
      title: 'Apple AirPods Pro (2nd Gen) in Spigen Case',
      description: 'AirPods Pro 2nd Gen inside a rugged black Spigen Armor case with a silver carabiner clip.',
      category: 'Electronics',
      location: 'Student Center',
      building_zone: 'Ground Floor Cafeteria / Coffee Bar',
      date: '2026-09-17',
      time: '12:45',
      status: 'MATCH_FOUND',
      primary_image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Engraved with initials "A.T." inside the charging case lid.'
    },
    // 4. Priya's Found Wireless Earbuds
    {
      id: 'item-found-airpods',
      user_id: 'u4-priya-patel',
      type: 'FOUND',
      title: 'White Wireless Earbuds in Heavy-duty Black Case',
      description: 'Found near cafeteria seating booth next to the coffee station. White earbuds in a rugged black case with carabiner.',
      category: 'Electronics',
      location: 'Student Center',
      building_zone: 'Cafeteria Booth 12',
      date: '2026-09-17',
      time: '13:30',
      status: 'MATCH_FOUND',
      primary_image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Spigen black case with clip.'
    },
    // 5. Marcus's Lost Wallet
    {
      id: 'item-lost-wallet',
      user_id: 'u3-marcus-vance',
      type: 'LOST',
      title: 'Vintage Brown Leather Bifold Wallet',
      description: 'Brown distressed leather wallet with brass stitching. Contains student card, metro card, and library pass.',
      category: 'Wallet',
      location: 'Engineering Building',
      building_zone: 'Hall A Lecture Theatre 204',
      date: '2026-09-16',
      time: '10:15',
      status: 'MATCH_FOUND',
      primary_image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Stitching slightly worn on right fold; contains medical campus ID badge.'
    },
    // 6. Sarah's Found Wallet
    {
      id: 'item-found-wallet',
      user_id: 'u2-sarah-lin',
      type: 'FOUND',
      title: 'Brown Distressed Leather Wallet with Cards',
      description: 'Found on seat in Hall A lecture hall after morning physics lecture. Contains student cards and receipts.',
      category: 'Wallet',
      location: 'Engineering Building',
      building_zone: 'Lecture Hall A',
      date: '2026-09-16',
      time: '11:45',
      status: 'MATCH_FOUND',
      primary_image: 'https://images.unsplash.com/photo-1606503825008-909a67e753bf?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Handed over to Faculty reception desk.'
    },
    // 7. Sarah's Lost Backpack
    {
      id: 'item-lost-backpack',
      user_id: 'u2-sarah-lin',
      type: 'LOST',
      title: 'Navy Blue Herschel Backpack with Tan Leather Straps',
      description: 'Herschel Little America 25L navy backpack. Contains architecture sketchbook, Faber-Castell drawing pens, and watercolor kit.',
      category: 'Bags',
      location: 'Science Building',
      building_zone: '2nd Floor Design Atrium',
      date: '2026-09-15',
      time: '15:00',
      status: 'ACTIVE',
      primary_image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Tan synthetic leather straps, custom acrylic keychain with "SL" initials.'
    },
    // 8. Priya's Found Student ID
    {
      id: 'item-found-idcard',
      user_id: 'u4-priya-patel',
      type: 'FOUND',
      title: 'Campus Student ID Card - Alex T.',
      description: 'Official university magnetic ID card found on the turf near Sports Complex field entrance.',
      category: 'ID Cards',
      location: 'Sports Complex',
      building_zone: 'East Field Gate 3',
      date: '2026-09-18',
      time: '09:00',
      status: 'ACTIVE',
      primary_image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Computer Science Department badge with blue lanyard strap.'
    },
    // 9. Marcus's Resolved Item (Demo of fully resolved recovery)
    {
      id: 'item-resolved-keys',
      user_id: 'u3-marcus-vance',
      type: 'LOST',
      title: 'Subaru Car Key with Blue Campus Lanyard',
      description: 'Key fob with remote start and a blue college lanyard plus gym locker fob.',
      category: 'Keys',
      location: 'Campus Recreation Center',
      building_zone: 'Locker Room Area',
      date: '2026-09-14',
      time: '18:00',
      status: 'RESOLVED',
      primary_image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Gym tag #148 attached.'
    },
    // 10. Found Keys (Resolved pair)
    {
      id: 'item-found-keys',
      user_id: 'u1-alex-turner',
      type: 'FOUND',
      title: 'Subaru Smart Key Fob & Blue Lanyard',
      description: 'Found on bench outside gym changing area. Returned to owner.',
      category: 'Keys',
      location: 'Campus Recreation Center',
      building_zone: 'Main Gym Entrance',
      date: '2026-09-14',
      time: '18:30',
      status: 'RESOLVED',
      primary_image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
      characteristics: 'Blue lanyard with college logo.'
    }
  ];

  for (const item of items) {
    db.run(
      `INSERT INTO items (
        id, user_id, type, title, description, category, location, 
        building_zone, date, time, status, primary_image, characteristics
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.user_id,
        item.type,
        item.title,
        item.description,
        item.category,
        item.location,
        item.building_zone,
        item.date,
        item.time,
        item.status,
        item.primary_image,
        item.characteristics
      ]
    );

    // Add image relation
    db.run(
      `INSERT INTO item_images (id, item_id, image_url) VALUES (?, ?, ?)`,
      [crypto.randomUUID(), item.id, item.primary_image]
    );
  }

  // Pre-calculated Potential Matches
  const matches = [
    {
      id: 'match-1-macbook',
      lost_item_id: 'item-lost-macbook',
      found_item_id: 'item-found-macbook',
      match_score: 94,
      match_reasons: JSON.stringify([
        'Matching Space Black/Dark Grey MacBook form factor with lid sticker',
        'Exact location match: Main University Library 3rd Floor study pods',
        'Time proximity: Found within 1.5 hours of reported loss',
        'Category: Exact match in Electronics'
      ]),
      matched_features: JSON.stringify(['Same Location', 'Timeline (1.5h)', 'Model & Color Match', 'Category Match']),
      ai_evaluated: 1,
      status: 'PENDING'
    },
    {
      id: 'match-2-airpods',
      lost_item_id: 'item-lost-airpods',
      found_item_id: 'item-found-airpods',
      match_score: 89,
      match_reasons: JSON.stringify([
        'AirPods Pro earbuds in protective black case with clip',
        'Location alignment in Student Center Cafeteria seating area',
        'Timeline: Reported lost and found on the same afternoon'
      ]),
      matched_features: JSON.stringify(['Cafeteria Zone', 'Black Armor Case', 'Temporal Match', 'Category Match']),
      ai_evaluated: 1,
      status: 'PENDING'
    },
    {
      id: 'match-3-wallet',
      lost_item_id: 'item-lost-wallet',
      found_item_id: 'item-found-wallet',
      match_score: 92,
      match_reasons: JSON.stringify([
        'Both describe a distressed brown leather wallet with student IDs inside',
        'Exact building match: Engineering Building Hall A',
        'Date alignment: September 16th morning session'
      ]),
      matched_features: JSON.stringify(['Exact Building', 'Brown Distressed Leather', 'Cards Inside', 'Same Day']),
      ai_evaluated: 1,
      status: 'PENDING'
    }
  ];

  for (const m of matches) {
    db.run(
      `INSERT INTO potential_matches (
        id, lost_item_id, found_item_id, match_score, match_reasons, 
        matched_features, ai_evaluated, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.lost_item_id, m.found_item_id, m.match_score, m.match_reasons, m.matched_features, m.ai_evaluated, m.status]
    );
  }

  // Pre-seeded Claims
  const claims = [
    {
      id: 'claim-1-macbook',
      item_id: 'item-found-macbook',
      claimant_id: 'u1-alex-turner',
      status: 'PENDING',
      location_lost: 'Main Library 3rd floor quiet study desk 34',
      date_lost: '2026-09-18',
      identifying_details: 'GitHub Octocat sticker on the lid, custom wallpaper with terminal theme, lock screen name says Alex Turner.',
      proof_notes: 'I have the original Apple invoice and serial number ending in 8X9Q.',
      contact_share_consent: 1
    },
    {
      id: 'claim-2-keys-resolved',
      item_id: 'item-found-keys',
      claimant_id: 'u3-marcus-vance',
      status: 'APPROVED',
      location_lost: 'Sports complex locker room',
      date_lost: '2026-09-14',
      identifying_details: 'Subaru Outback remote key with gym locker tag #148 and blue campus lanyard.',
      proof_notes: 'Demonstrated car unlocking on site with campus security officer present.',
      contact_share_consent: 1,
      resolution_notes: 'Verified ownership and safely handed over to Marcus.'
    }
  ];

  for (const c of claims) {
    db.run(
      `INSERT INTO claims (
        id, item_id, claimant_id, status, location_lost, date_lost, 
        identifying_details, proof_notes, contact_share_consent, resolution_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.item_id,
        c.claimant_id,
        c.status,
        c.location_lost,
        c.date_lost,
        c.identifying_details,
        c.proof_notes,
        c.contact_share_consent,
        c.resolution_notes || null
      ]
    );
  }

  // Seed Notifications for demo users
  const notifications = [
    {
      id: 'notif-1',
      user_id: 'u1-alex-turner',
      type: 'AI_MATCH',
      title: 'Potential Match: 94% Similarity',
      message: 'FindIt AI detected a potential match for your lost MacBook Pro at Main Library.',
      link_url: '/items/item-lost-macbook',
      is_read: 0
    },
    {
      id: 'notif-2',
      user_id: 'u2-sarah-lin',
      type: 'CLAIM_RECEIVED',
      title: 'New Claim Received',
      message: 'Alex Turner submitted an ownership verification claim on the MacBook Laptop you found.',
      link_url: '/claims',
      is_read: 0
    },
    {
      id: 'notif-3',
      user_id: 'u1-alex-turner',
      type: 'AI_MATCH',
      title: 'Potential Match: 89% Similarity',
      message: 'AI found potential match for your AirPods Pro in Student Center.',
      link_url: '/items/item-lost-airpods',
      is_read: 0
    },
    {
      id: 'notif-4',
      user_id: 'u3-marcus-vance',
      type: 'CLAIM_APPROVED',
      title: 'Item Recovered & Claim Approved! 🎉',
      message: 'Your claim for Subaru Car Key was approved and marked as resolved.',
      link_url: '/items/item-resolved-keys',
      is_read: 1
    }
  ];

  for (const n of notifications) {
    db.run(
      `INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.user_id, n.type, n.title, n.message, n.link_url, n.is_read]
    );
  }

  db.save();
  console.log('✓ FindIt AI database successfully populated with rich demo campus data.');
}

// Direct execution support
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  initDatabase().then(db => {
    seedDatabase(db).then(() => process.exit(0));
  });
}
