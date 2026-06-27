# Email to Jason — Google Places key for address auto-complete (2026-06-27)

#4 from Lisa's batch (address auto-complete) is a config/key issue, not code. The
key + its referrer allowlist are on Jason's side. Record of the request below.

---

**Subject:** Address auto-complete on HumanEdge — need the Google Places key

Hi Jason,

Quick one. The address auto-complete (the dropdown that suggests addresses as you
type) isn't working on HumanEdge. It's not a code issue — it's a key/configuration
thing, and it needs two pieces that are on your side:

**1. The Google Places API key.** HumanEdge needs the same Google Places/Maps key
the live site uses, set as `VITE_GOOGLE_PLACES_API_KEY` in HumanEdge's Railway
environment. Important: it has to be set as a **build** variable and the app
re-deployed — the key gets baked in when the app is built, so a runtime-only
value won't work. Can you send me the key (I'll add it in Railway), or set it
there yourself?

**2. Allow humanedge.health on the key.** The key is locked to specific websites
for security (currently peptidecoach.pro). In Google Cloud Console → that API key
→ "Website / HTTP referrer restrictions," please add:
- `https://humanedge.health/*`
- `https://www.humanedge.health/*`

Without this, Google rejects the requests from HumanEdge even when the key is set.

Once both are done and HumanEdge re-deploys, auto-complete will work. Happy to do
the Railway side if you just send me the key.

Thanks,
Saboor
