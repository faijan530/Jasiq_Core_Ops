import bcrypt from 'bcryptjs';

const hash = '$2b$10$MFOjKsXx5exTb9qw7hY93evF1pcb/eXBYLivsDquO3VAbX6h0rFOW';
const password = 'admin123';

async function check() {
  const match = await bcrypt.compare(password, hash);
  console.log('Match:', match);
}

check();
