# OpenAI API Key Setup Guide

This guide will walk you through generating an OpenAI API key and configuring it in the LangkahKecil project.

## Step 1: Create an OpenAI Account

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Click **"Sign up"** or **"Log in"** if you already have an account
3. Complete the registration process (email verification, phone verification if required)

## Step 2: Add Payment Method (Required for API Access)

1. Once logged in, click on your **profile icon** (top right)
2. Select **"Billing"** from the dropdown menu
3. Click **"Add payment method"**
4. Enter your credit card or payment details
5. Set up a **usage limit** to prevent unexpected charges (recommended: $10-20/month for testing)

> **Note:** OpenAI charges based on token usage. The default model (`gpt-4o-mini`) is very affordable (~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens).

## Step 3: Generate API Key

1. In the OpenAI dashboard, click on your **profile icon** (top right)
2. Select **"API keys"** from the dropdown menu
3. Click **"+ Create new secret key"** button
4. Give your key a name (e.g., "LangkahKecil Development")
5. Click **"Create secret key"**
6. **IMPORTANT:** Copy the API key immediately - you won't be able to see it again!

   The key will look like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> **⚠️ Security Warning:** Never commit your API key to version control (Git). Always use environment variables.

## Step 4: Configure API Key in Your Project

### Option A: Using .env File (Recommended for Development)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create or edit the `.env` file:
   ```bash
   # On Windows (PowerShell)
   notepad .env
   
   # On Windows (Command Prompt)
   type nul > .env
   
   # On Mac/Linux
   touch .env
   ```

3. Add the following line to your `.env` file:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```

4. Save the file.

### Option B: Using .env.example File (For Docker)

If you're using Docker Compose, you can add it to `backend/.env.example`:

1. Open `backend/.env.example` in a text editor
2. Add the following line:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```
3. Save the file.

> **Note:** The `docker-compose.yml` is configured to load environment variables from `backend/.env.example` by default.

### Option C: Environment Variables in Docker Compose

You can also add it directly to `docker-compose.yml`:

1. Open `docker-compose.yml`
2. Find the `backend` service section
3. Add the following under `environment:`:
   ```yaml
   OPENAI_API_KEY: ${OPENAI_API_KEY:-your-api-key-here}
   ```

4. Then add it to your root `.env` file (if using):
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```

## Step 5: Optional Configuration

You can customize the AI model and settings by adding these to your `.env` file:

```env
# OpenAI Configuration (Optional - defaults shown)
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini                    # Model to use (gpt-4o-mini is cheapest)
OPENAI_MAX_TOKENS=1000                      # Maximum tokens in response
AI_TOKEN_LIMIT_FREE_TRIAL=2000              # Free trial token limit
AI_TOKEN_LIMIT_BASIC=10000                  # Basic plan token limit
AI_TOKEN_LIMIT_PREMIUM=30000                # Premium plan token limit
AI_TOKEN_LIMIT_THERAPIST=50000              # Therapist plan token limit
AI_RATE_LIMIT_PER_MINUTE=5                  # Max AI calls per minute per user
AI_RATE_LIMIT_PER_DAY=100                   # Max AI calls per day per user
AI_MAX_PROMPT_LENGTH=1000                   # Max prompt length in characters
AI_MONTHLY_SPEND_LIMIT=100                  # Hard limit for monthly AI spend ($)
```

## Step 6: Restart Services

After adding the API key, restart your backend service:

### Using Docker Compose:
```bash
docker-compose restart backend
```

### Or rebuild if needed:
```bash
docker-compose up -d --build backend
```

## Step 7: Verify the Setup

1. Check backend logs to ensure the API key is loaded:
   
   **Windows PowerShell:**
   ```powershell
   docker-compose logs backend | Select-String -Pattern "openai" -CaseSensitive:$false
   ```
   
   **Windows Command Prompt / Mac / Linux:**
   ```bash
   docker-compose logs backend | findstr /i openai
   # Or on Mac/Linux:
   docker-compose logs backend | grep -i openai
   ```

2. Create a test log as a parent user with an active subscription
3. Check if the AI summary is generated (should appear within a few seconds)
4. Check backend logs for any errors:
   ```bash
   docker-compose logs backend --tail=50
   ```

## Troubleshooting

### Issue: "OpenAI API key not configured"

**Solution:** 
- Verify the API key is in your `.env` file
- Check that the variable name is exactly `OPENAI_API_KEY` (case-sensitive)
- Restart the backend service

### Issue: "Insufficient quota" or "Invalid API key"

**Solution:**
- Verify the API key is correct (no extra spaces, complete key)
- Check your OpenAI account has available credits
- Verify payment method is set up in OpenAI dashboard

### Issue: AI summaries not generating

**Solution:**
1. Check user has active/trial subscription:
   ```bash
   # Check subscription status in database or admin panel
   ```

2. Check user has AI access enabled in their plan:
   - Pro and Premium plans have AI access
   - Free plans do not have AI access

3. Check token quota:
   ```bash
   # Check AI token wallet in database or admin panel
   ```

4. Check backend logs for errors:
   
   **Windows PowerShell:**
   ```powershell
   docker-compose logs backend --tail=100 | Select-String -Pattern "ai|openai|summary" -CaseSensitive:$false
   ```
   
   **Windows Command Prompt:**
   ```cmd
   docker-compose logs backend --tail=100 | findstr /i "ai openai summary"
   ```
   
   **Mac / Linux:**
   ```bash
   docker-compose logs backend --tail=100 | grep -i "ai\|openai\|summary"
   ```

### Issue: Rate limiting errors

**Solution:**
- The default rate limit is 5 calls per minute per user
- Wait a minute and try again
- Or increase `AI_RATE_LIMIT_PER_MINUTE` in `.env` (not recommended for production)

## Security Best Practices

1. **Never commit API keys to Git:**
   - Add `.env` to `.gitignore`
   - Use `.env.example` with placeholder values for documentation

2. **Use different keys for different environments:**
   - Development key (with low limits)
   - Production key (with appropriate limits)

3. **Set usage limits in OpenAI dashboard:**
   - Go to Billing → Usage limits
   - Set hard limits to prevent unexpected charges

4. **Rotate keys regularly:**
   - Generate new keys periodically
   - Revoke old keys that are no longer in use

5. **Monitor usage:**
   - Check OpenAI dashboard regularly
   - Set up billing alerts

## Cost Estimation

For LangkahKecil with `gpt-4o-mini`:
- **Average log summary:** ~200-300 tokens
- **Cost per summary:** ~$0.0001-0.0002
- **1000 summaries:** ~$0.10-0.20
- **10,000 summaries/month:** ~$1-2

The default token limits per plan:
- **Free Trial:** 2,000 tokens/month (~10 summaries)
- **Basic:** 10,000 tokens/month (~50 summaries)
- **Premium:** 30,000 tokens/month (~150 summaries)
- **Therapist:** 50,000 tokens/month (~250 summaries)

## Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI Pricing](https://openai.com/pricing)
- [OpenAI API Usage Dashboard](https://platform.openai.com/usage)

## Support

If you encounter issues:
1. Check the backend logs: `docker-compose logs backend`
2. Verify API key in OpenAI dashboard
3. Check subscription and token wallet status
4. Review error messages in the application logs

