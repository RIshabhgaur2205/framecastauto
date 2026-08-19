Verify and restore Lovable AI Gateway image generation after workspace move

## Clarification
You do **not** need a personal Gemini API key. Framecast uses the built-in **Lovable AI Gateway**, which includes the Gemini image model (`google/gemini-3-pro-image`). The only credential required is the workspace-level `LOVABLE_API_KEY` secret, read server-side in `src/lib/pipeline.server.ts`. When the project was moved to a new workspace, that secret may have been lost or invalidated, so the connection must be verified and re-provisioned if needed.

## Steps
1. Inspect current state  
   - Check whether the project has a `LOVABLE_API_KEY` secret and whether it is the correct shape for the new workspace.  
   - Review any recent Lovable AI Gateway request logs for errors (e.g., unauthorized, key not registered, missing key).

2. Provision or rotate the key if needed  
   - If `LOVABLE_API_KEY` is missing: provision a new one via Lovable.  
   - If it is present but the gateway rejects it (invalid/undecryptable or not registered): rotate it once and let the server pick up the new secret.

3. Test the image-generation path end-to-end  
   - Run a small server-side test call to `https://ai.gateway.lovable.dev/v1/images/generations` with the default model (`google/gemini-3-pro-image`).  
   - Confirm the response returns a real image payload (`b64_json`).

4. Report the result and next steps  
   - If the test succeeds: the AI visuals will work again and no personal Gemini key is needed.  
   - If it fails: surface the exact error (e.g., missing key, workspace credits, rate limit, policy block) and the required action.

5. Optional future path  
   - If you prefer to use a direct Google Gemini API key instead of the Lovable AI Gateway, we can create a separate plan to switch the integration and store `GEMINI_API_KEY` as a project secret.
