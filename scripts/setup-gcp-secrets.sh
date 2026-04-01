#!/usr/bin/env bash
# =============================================================================
# setup-gcp-secrets.sh
# Creates Secret Manager secrets for GameNexus and grants Cloud Run access.
# Run once before your first deployment.
# Usage: bash scripts/setup-gcp-secrets.sh
# =============================================================================

set -euo pipefail

PROJECT_ID="local-biz-agent-chennai-491410"
REGION="us-west4"

# Cloud Run uses the Compute Engine default service account unless you
# configured a custom one. Update this if you created a dedicated SA.
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

SECRETS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "REDIS_URL"
  "GOOGLE_CLOUD_PROJECT"
  "VERTEX_AI_LOCATION"
  "VERTEX_AI_MODEL_FLASH"
  "VERTEX_AI_MODEL_PRO"
  "FIREBASE_TOKEN"
)

echo "============================================================"
echo " GameNexus — GCP Secret Manager setup"
echo " Project : $PROJECT_ID"
echo " Cloud Run SA : $CLOUD_RUN_SA"
echo "============================================================"
echo ""

for SECRET in "${SECRETS[@]}"; do
  # Check if secret already exists; skip creation if it does
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" &>/dev/null; then
    echo "⚠️  Secret '$SECRET' already exists — skipping creation."
  else
    gcloud secrets create "$SECRET" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic"
    echo "✅ Created secret: $SECRET"
  fi

  # Grant Cloud Run SA access (idempotent — safe to run multiple times)
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
  echo "   ↳ Granted secretAccessor to $CLOUD_RUN_SA"
done

echo ""
echo "============================================================"
echo " Next step: set the actual secret VALUES."
echo " Run each command below, replacing <value> with the real value."
echo "============================================================"
echo ""
echo "  gcloud secrets versions add DATABASE_URL     --project=$PROJECT_ID --data-file=- <<< '<your_postgres_connection_string>'"
echo "  gcloud secrets versions add JWT_SECRET        --project=$PROJECT_ID --data-file=- <<< '<long_random_string>'"
echo "  gcloud secrets versions add REDIS_URL         --project=$PROJECT_ID --data-file=- <<< 'redis://<memorystore_ip>:6379'"
echo "  gcloud secrets versions add GOOGLE_CLOUD_PROJECT --project=$PROJECT_ID --data-file=- <<< '$PROJECT_ID'"
echo "  gcloud secrets versions add VERTEX_AI_LOCATION   --project=$PROJECT_ID --data-file=- <<< '$REGION'"
echo "  gcloud secrets versions add VERTEX_AI_MODEL_FLASH --project=$PROJECT_ID --data-file=- <<< 'gemini-2.5-flash'"
echo "  gcloud secrets versions add VERTEX_AI_MODEL_PRO   --project=$PROJECT_ID --data-file=- <<< 'gemini-2.5-pro'"
echo "  gcloud secrets versions add FIREBASE_TOKEN    --project=$PROJECT_ID --data-file=- <<< '<firebase_ci_token>'"
echo ""
echo " To get a Firebase CI token run: firebase login:ci"
echo "============================================================"
