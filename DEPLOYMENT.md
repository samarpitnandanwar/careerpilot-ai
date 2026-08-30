# CareerPilot AI — GCP Production Deployment Guide

## Prerequisites

### 1. Install GCP CLI
```bash
brew install --cask google-cloud-sdk
gcloud init
gcloud auth login
```

### 2. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 3. Set up Application Default Credentials (for Cloud Run deployment)
```bash
gcloud auth application-default login
```

---

## Phase 1: GCP Project Setup

### Enable required APIs
```bash
gcloud config set project careerpilot-ai-506813

gcloud services enable \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  pubsub.googleapis.com \
  cloudscheduler.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com
```

### Create the runtime service account (if not exists)
```bash
gcloud iam service-accounts create careerpilot-runtime \
  --display-name="CareerPilot Runtime Service Account"
```

### Grant least-privilege IAM roles
```bash
SA="careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding careerpilot-ai-506813 \
  --member="serviceAccount:${SA}" \
  --role="roles/firebaseauth.admin"

gcloud projects add-iam-policy-binding careerpilot-ai-506813 \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding careerpilot-ai-506813 \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding careerpilot-ai-506813 \
  --member="serviceAccount:${SA}" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding careerpilot-ai-506813 \
  --member="serviceAccount:${SA}" \
  --role="roles/pubsub.publisher"
```

---

## Phase 2: Firestore Setup

### Create Firestore database (Native mode, us-central1)
```bash
gcloud firestore databases create --location=us-central1
```

### Deploy indexes
```bash
firebase deploy --only firestore:indexes
```

### Deploy security rules
```bash
firebase deploy --only firestore:rules
```

---

## Phase 3: Cloud Storage Setup

### Create resume storage bucket
```bash
gsutil mb -l us-central1 gs://careerpilot-ai-506813-resumes

# Make it private (no public access)
gsutil iam ch allUsers:objectViewer gs://careerpilot-ai-506813-resumes 2>/dev/null || true
```

### Deploy storage rules
```bash
firebase deploy --only storage
```

---

## Phase 4: Identity Platform Setup

### Enable Identity Platform in GCP Console
1. Go to https://console.cloud.google.com/identity-platform
2. Enable the API
3. Add a Web API key (becomes NEXT_PUBLIC_FIREBASE_API_KEY)
4. Enable Email/Password sign-in provider
5. Enable Google sign-in provider (requires OAuth client ID)

### Get Firebase client config
From GCP Console → Identity Platform → Settings → Your apps (Web):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

---

## Phase 5: Vertex AI Setup

### Enable Vertex AI API
Already enabled in Phase 1.

### Verify Gemini model access
```bash
gcloud ai models list --region=us-central1 --filter="displayName:gemini"
```

---

## Phase 6: Pub/Sub Setup

### Create topic
```bash
gcloud pubsub topics create careerpilot-events
```

### Create subscription with authenticated push
```bash
gcloud pubsub subscriptions create careerpilot-events-sub \
  --topic=careerpilot-events \
  --push-endpoint=https://<PRODUCTION_URL>/api/events/pubsub \
  --push-auth-service-account=careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com \
  --push-audience=https://<PRODUCTION_URL>/api/events/pubsub
```

Replace `<PRODUCTION_URL>` with your actual deployed URL.

---

## Phase 7: Cloud Scheduler Setup

### Create scheduler job (09:00 Asia/Kolkata)
```bash
gcloud scheduler jobs create http careerpilot-daily \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://<PRODUCTION_URL>/api/events/scheduler" \
  --http-method=POST \
  --oidc-service-account-email=careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com \
  --oidc-token-audience="https://<PRODUCTION_URL>/api/events/scheduler"
```

---

## Phase 8: Cloud Run Deployment

### Generate EVENT_ENDPOINT_DEV_SECRET (development only)
```bash
openssl rand -hex 32
```

### Create .env.local for production
```bash
cp .env.example .env.local
# Fill in:
# NEXT_PUBLIC_FIREBASE_API_KEY=<from Identity Platform>
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from Identity Platform>
# NEXT_PUBLIC_FIREBASE_APP_ID=<from Identity Platform>
# EVENT_ENDPOINT_DEV_SECRET=<generated above>  # Only for dev, not production
```

### Build the application
```bash
npx next build --webpack
```

### Deploy to Cloud Run
```bash
gcloud run deploy careerpilot-ai \
  --source=. \
  --region=us-central1 \
  --service-account=careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10
```

---

## Phase 9: Post-Deployment Verification

### Update Pub/Sub subscription with real URL
After deployment, update the push endpoint:
```bash
gcloud pubsub subscriptions update careerpilot-events-sub \
  --push-endpoint=https://<ACTUAL_URL>/api/events/pubsub \
  --push-audience=https://<ACTUAL_URL>/api/events/pubsub
```

### Update Cloud Scheduler with real URL
```bash
gcloud scheduler jobs update http careerpilot-daily \
  --uri="https://<ACTUAL_URL>/api/events/scheduler" \
  --oidc-token-audience="https://<ACTUAL_URL>/api/events/scheduler"
```

### Verify endpoints
```bash
# Landing page
curl -s -o /dev/null -w "%{http_code}" https://<URL>/

# Auth required
curl -s -o /dev/null -w "%{http_code}" https://<URL>/api/jobs
# Expected: 401

# Pub/Sub auth required
curl -s -o /dev/null -w "%{http_code}" -X POST https://<URL>/api/events/pubsub
# Expected: 401

# Scheduler auth required
curl -s -o /dev/null -w "%{http_code}" -X POST https://<URL>/api/events/scheduler
# Expected: 401
```
