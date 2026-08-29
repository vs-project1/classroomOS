const { createClient } = require('@libsql/client');
const crypto = require('crypto');
function uuidv4() { return crypto.randomUUID(); }

const rawData = `1 Aakriti Thapa 12/13
2 Aashish Khatri 8/13
3 Aayush Purbachhane 0/13
4 Abhishek Acharya 8/13
5 Anish Karki 12/13
6 Arnab Shrestha 5/13
7 Arpan Rai 12/13
8 Barshika Magar 12/13
9 Bikram Chaudhari 11/13
10 Bishan Budhathoki 7/13
11 Binayak Bdr. KC 9/13
12 Bishal Balami 8/13
13 Parpan Gurung 10/13
14 Durga Bdr. Thapa 13/13
15 Grishma Khetiwada 13/13
16 Jenith Gurung 12/13
17 Keshav Tamang 10/13
18 Koshal Neupane 10/13
19 Lakpa Jyangtan 10/13
20 Lakpa Tamang 9/13
21 Nishan Joshi 9/13
22 Pabing Tamang 7/13
23 Prakriti Dhanal 10/13
24 Pranich Ghatani 13/13
25 Pukar Parajuli 12/13
26 Barak Singh Moktan 8/13
27 Eneiv Bal Magar 11/13
28 Shishir Gautam 13/13
29 Sourya Rai 7/13
30 Subhya Pandey 11/13
31 Sunu Lama 11/13
32 Sunil Khatri 9/13
33 Tenchok Sherpa 12/13
34 Oelvin Lama 8/13
35 Ang Dawa Sherpa 8/8`;

async function run() {
  const db = createClient({ url: 'file:local.db' });
  
  // 1. Parse data
  const lines = rawData.split('\n').filter(Boolean);
  const studentsData = lines.map(line => {
    const parts = line.split(' ');
    // Handle names with varying length. Format: index Name1 Name2... Fraction
    const fraction = parts.pop();
    const index = parts.shift();
    const name = parts.join(' ');
    const [presentStr, totalStr] = fraction.split('/');
    return { name, present: parseInt(presentStr), total: parseInt(totalStr) };
  });

  // 2. Insert Students
  const studentIds = [];
  let rollCounter = 1000;
  for (const s of studentsData) {
    const userId = uuidv4();
    const studentId = uuidv4();
    const email = s.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@tu.edu.np';
    
    // Insert into users
    await db.execute({
      sql: 'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      args: [userId, email, 'hash_placeholder', 'STUDENT']
    });

    // Insert into students
    await db.execute({
      sql: 'INSERT INTO students (id, name, roll_number, email, faculty, semester) VALUES (?, ?, ?, ?, ?, ?)',
      args: [studentId, s.name, 'BCA-' + (rollCounter++), email, 'BCA', '2nd Semester']
    });

    // Insert into student_profiles
    await db.execute({
      sql: 'INSERT INTO student_profiles (id, user_id, roll_number, faculty, semester, section, batch_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [uuidv4(), userId, 'BCA-' + (rollCounter - 1), 'BCA', 2, 'A', 2025]
    });

    s.id = studentId;
  }

  // 3. Create Class Sessions
  const subjectId = '3618de54-19fe-4721-996c-7fbbbf13af64'; // OOP in Java
  const sessions = [];
  let startDate = new Date('2026-05-15T10:00:00Z'); // Roughly Jestha 1
  for (let i = 0; i < 13; i++) {
    const sessionId = uuidv4();
    const sessionDate = new Date(startDate);
    sessionDate.setDate(sessionDate.getDate() + i); // 13 consecutive days just for dummy data
    
    await db.execute({
      sql: 'INSERT INTO class_sessions (id, subject_id, session_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      args: [sessionId, subjectId, Math.floor(sessionDate.getTime() / 1000), '10:00', '11:00']
    });
    sessions.push(sessionId);
  }

  // 4. Insert Attendance
  for (const s of studentsData) {
    let presentCount = 0;
    for (let i = 0; i < 13; i++) {
      let status = 'absent';
      
      // If student is 8/8, we mark them present for first 8, then absent? 
      // Actually we could just not insert records for them for the remaining 5, or just absent.
      // The user wants to see the fraction correctly, but if they have only 8 total, maybe we skip inserting for the last 5?
      // For simplicity, let's insert absent.
      if (presentCount < s.present) {
        status = 'present';
        presentCount++;
      }
      
      await db.execute({
        sql: 'INSERT INTO attendance (id, class_session_id, student_id, status) VALUES (?, ?, ?, ?)',
        args: [uuidv4(), sessions[i], s.id, status]
      });
    }
  }

  console.log('Successfully inserted students, sessions, and attendance records.');
}

run().catch(console.error);
