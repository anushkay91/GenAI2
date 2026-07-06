#!/usr/bin/env bash
# Production Google Cloud Provisioning Script for the AI Decision Intelligence Platform
# Run this script using your gcloud authenticated command line.

set -eo pipefail

# 1. Configuration variables
PROJECT_ID="carbon1-499909"
REGION="asia-south1" # Mumbai, India (tailored for Indian Smart Cities)
CLUSTER_NAME="smart-city-cluster"
INSTANCE_NAME="smart-city-instance"
DB_NAME="decision_intel"
DB_USER="postgres"
DB_PASSWORD="SuperSecurePassword123!" # Change in production
BQ_DATASET="smart_city_metrics"
GCS_BUCKET="smart-city-documents-${PROJECT_ID}"
SERVICE_NAME="decision-intel-backend"
IMAGE_NAME="asia-south1-docker.pkg.dev/${PROJECT_ID}/smart-city-repo/${SERVICE_NAME}:latest"

echo "=== Starting Google Cloud Provisioning ==="
gcloud config set project "${PROJECT_ID}"

# 2. Enable Google Cloud APIs
echo "Enabling necessary Google Cloud APIs..."
gcloud services enable \
    compute.googleapis.com \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    alloydb.googleapis.com \
    bigquery.googleapis.com \
    storage.googleapis.com \
    aiplatform.googleapis.com \
    vpcaccess.googleapis.com

# 3. Create Serverless VPC Access Connector
# Required for Cloud Run to securely query private AlloyDB instances
echo "Creating Serverless VPC Access Connector..."
gcloud compute networks create smart-city-vpc --subnet-mode=custom || true

gcloud compute networks subnets create smart-city-subnet \
    --network=smart-city-vpc \
    --range=10.8.0.0/28 \
    --region="${REGION}" || true

gcloud compute networks vpc-access connectors create smart-city-connector \
    --region="${REGION}" \
    --subnet=smart-city-subnet || true

# 4. Provision AlloyDB Cluster & Instance
echo "Provisioning AlloyDB cluster (PostgreSQL vector-compatible operational store)..."
# Create private connection for AlloyDB
gcloud compute addresses create alloydb-private-ip \
    --global \
    --purpose=VPC_PEERING \
    --addresses=10.9.0.0 \
    --prefix-length=16 \
    --network=smart-city-vpc || true

gcloud services vpc-peerings connect \
    --service=servicenetworking.googleapis.com \
    --ranges=alloydb-private-ip \
    --network=smart-city-vpc || true

gcloud alloydb clusters create "${CLUSTER_NAME}" \
    --region="${REGION}" \
    --password="${DB_PASSWORD}" \
    --network=smart-city-vpc \
    --project="${PROJECT_ID}" || true

gcloud alloydb instances create "${INSTANCE_NAME}" \
    --cluster="${CLUSTER_NAME}" \
    --region="${REGION}" \
    --instance-type=PRIMARY \
    --cpu-count=2 \
    --project="${PROJECT_ID}" || true

# Retrieve AlloyDB Private IP
ALLOYDB_IP=$(gcloud alloydb instances describe "${INSTANCE_NAME}" \
    --cluster="${CLUSTER_NAME}" \
    --region="${REGION}" \
    --format="value(ipAddress)")
echo "AlloyDB Instance Private IP: ${ALLOYDB_IP}"

# 5. Create BigQuery Analytics Dataset
echo "Creating BigQuery analytics dataset..."
bq --project_id "${PROJECT_ID}" mk --dataset --location="${REGION}" "${BQ_DATASET}" || true

# 6. Create GCS Document Bucket
echo "Creating GCS document bucket for policy documents..."
gsutil mb -l "${REGION}" "gs://${GCS_BUCKET}" || true

# 7. Create Artifact Registry & Deploy Backend to Cloud Run
echo "Creating Artifact Registry repository for container image..."
gcloud artifacts repositories create smart-city-repo \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Smart City Decision Engine Container Repo" || true

echo "Building and pushing container..."
# Build backend container locally and submit to Cloud Build
gcloud builds submit --tag "${IMAGE_NAME}" ./backend

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE_NAME}" \
    --region="${REGION}" \
    --platform=managed \
    --vpc-connector=smart-city-connector \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},GCP_LOCATION=${REGION},ALLOYDB_HOST=${ALLOYDB_IP},ALLOYDB_USER=${DB_USER},ALLOYDB_PASSWORD=${DB_PASSWORD},ALLOYDB_DB=${DB_NAME},BQ_DATASET=${BQ_DATASET},GCS_BUCKET_NAME=${GCS_BUCKET}"

echo "=== GCP Provisioning Complete! ==="
