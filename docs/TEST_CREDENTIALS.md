# Test User Credentials

## Default Test Users

These users are created when you run the database seed script.
They are pre-verified so you can sign in immediately.

### Admin User
- **Email:** `admin@langkahkecil.com`
- **Password:** `password123`
- **Role:** Admin
- **Access:** Full access to all features

### Therapist User
- **Email:** `therapist@langkahkecil.com`
- **Password:** `password123`
- **Role:** Therapist
- **Access:** Can view assigned children and create sessions

### Parent User
- **Email:** `parent@langkahkecil.com`
- **Password:** `password123`
- **Role:** Parent
- **Access:** Can manage their children and view sessions

## Sample Data

After seeding, you'll have:
- 1 Admin user
- 1 Therapist user
- 1 Parent user
- 1 Child (Alice) - assigned to the parent
- 1 Sample session - created by therapist for Alice
- Therapist-Child assignment already set up

## How to Seed Database

Run the seed script to create these test users:

```bash
# From backend directory
cd backend
npm run prisma:seed

# Or using Docker
docker-compose exec backend npm run prisma:seed
```

## Security Note

⚠️ **IMPORTANT:** These are test credentials only. For production:
- Change all default passwords
- Use strong, unique passwords
- Never commit real credentials to version control
- Use environment variables or secret management

## Creating Additional Test Users

You can create more users through:
1. **Registration page:** http://localhost:5000/register
2. **API:** `POST /api/auth/register`
3. **Database:** Direct SQL insert (for testing)

## Resetting Test Data

To reset and reseed:
```bash
# Reset database (WARNING: This deletes all data!)
docker-compose exec backend npx prisma migrate reset

# Then seed again
docker-compose exec backend npm run prisma:seed
```

