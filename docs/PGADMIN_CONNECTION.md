# pgAdmin Connection Guide for LangkahKecil PostgreSQL

## Connection Details

Use these settings to connect to the PostgreSQL database from pgAdmin:

### Server Information

- **Host/Address**: `localhost` or `127.0.0.1`
- **Port**: `5433` ⚠️ **Important: Use 5433, not 5432!**
- **Maintenance Database**: `postgres` or `langkahkecil`
- **Username**: `langkahkecil_user`
- **Password**: `change-this-strong-password`

## Step-by-Step Instructions

1. **Open pgAdmin**
2. **Right-click on "Servers"** in the left panel
3. **Select**: "Register" → "Server..."
4. **Fill in the General Tab**:
   - Name: `LangkahKecil` (or any name you prefer)
5. **Go to Connection Tab** and enter:
   - Host name/address: `localhost`
   - Port: `5433`
   - Maintenance database: `postgres`
   - Username: `langkahkecil_user`
   - Password: `change-this-strong-password`
   - ☑ Save password (optional, but recommended)
6. **Click "Save"**

## Common Issues & Solutions

### Issue 1: Connection Refused / Can't Connect
**Solution**: 
- Make sure Docker containers are running: `docker-compose ps`
- Verify PostgreSQL is healthy: Should show `(healthy)` status
- Check if port 5433 is not blocked by Windows Firewall

### Issue 2: Authentication Failed
**Solution**:
- Double-check the username: `langkahkecil_user` (not `postgres`)
- Verify the password: `change-this-strong-password`
- Make sure there are no extra spaces in the password field

### Issue 3: Wrong Port
**Solution**:
- ⚠️ **CRITICAL**: Use port `5433`, NOT `5432`
- The internal Docker port is 5432, but the external (host) port is 5433
- pgAdmin connects from your host machine, so use 5433

### Issue 4: Database Not Found
**Solution**:
- Try using `postgres` as the Maintenance database first
- After connecting, you can browse to `langkahkecil` database
- Or use `langkahkecil` directly as the Maintenance database

## Verify Connection

To verify PostgreSQL is accessible, run this command:

```bash
docker-compose exec postgres psql -U langkahkecil_user -d langkahkecil -c "SELECT version();"
```

If this works, PostgreSQL is running correctly and the issue is with pgAdmin configuration.

## Connection String Format

If you need a connection string for other tools:

```
postgresql://langkahkecil_user:change-this-strong-password@localhost:5433/langkahkecil
```

## Troubleshooting

1. **Check Docker Status**:
   ```bash
   docker-compose ps postgres
   ```
   Should show: `Up ... (healthy)`

2. **Check Port Mapping**:
   ```bash
   docker-compose ps postgres
   ```
   Should show: `0.0.0.0:5433->5432/tcp`

3. **Test Connection from Command Line**:
   ```bash
   docker-compose exec postgres psql -U langkahkecil_user -d langkahkecil
   ```

4. **View PostgreSQL Logs**:
   ```bash
   docker-compose logs postgres
   ```

## Security Note

⚠️ **For Production**: Change the default password `change-this-strong-password` to a strong, unique password!

