# How to View Fly.io Environment Variables

## View Secrets (Runtime Environment Variables)

```bash
# List all secrets (shows names only, not values for security)
fly secrets list -a accessibility-dashboard
```

## SSH into the Running Container

```bash
# Connect to the running container
fly ssh console -a accessibility-dashboard

# Once connected, you can check environment variables:
env | grep NEXT_PUBLIC
env | grep STRIPE
env | grep CLERK
env | grep CONVEX

# Exit the SSH session
exit
```

## View App Status and Configuration

```bash
# Show app status and basic config
fly status -a accessibility-dashboard

# Show app configuration
fly config show -a accessibility-dashboard

# View recent logs (might show env var issues)
fly logs -a accessibility-dashboard
```

## Check Build Arguments Used

Unfortunately, Fly.io doesn't store build arguments after the build. To verify if the build args were applied correctly:

1. Check the deployment logs from when you ran `./deploy.sh`
2. SSH into the container and check if the variables are available
3. Test the functionality (if scans work, the build args were correct)

## Important Notes

- **Build-time variables** (`NEXT_PUBLIC_*`) must be set during `fly deploy --build-arg`
- **Runtime secrets** can be set anytime with `fly secrets set`
- Build-time variables are baked into the Next.js build and can't be changed without redeploying
- Runtime secrets can be updated without redeploying (but the app will restart)

## Quick Check Command

Run this to see all secrets at once:
```bash
fly secrets list -a accessibility-dashboard
```

This will show you something like:
```
NAME                                  DIGEST                  CREATED AT
CLERK_SECRET_KEY                     1234abcd               1h ago
STRIPE_SECRET_KEY                    5678efgh               1h ago
NEXT_PUBLIC_CONVEX_URL              (not shown as secret)  (build arg)
...
```

Note: `NEXT_PUBLIC_*` variables won't appear in secrets list if they were only provided as build arguments.