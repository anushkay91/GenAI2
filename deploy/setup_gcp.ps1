# Windows PowerShell GCP Provisioning Script for the AI Decision Intelligence Platform

$PROJECT_ID = "carbon1-499909"
$REGION = "asia-south1" # Mumbai, India (tailored for Indian Smart Cities)
$CLUSTER_NAME = "smart-city-cluster"
$INSTANCE_NAME = "smart-city-instance"
$DB_NAME = "decision_intel"
$DB_USER = "postgres"
$DB_PASSWORD = "SuperSecurePassword123!" # Change in production
$BQ_DATASET = "smart_city_metrics"
$GCS_BUCKET = "smart-city-documents-$PROJECT_ID"
$SERVICE_NAME = "decision-intel-backend"
$IMAGE_NAME = "asia-south1-docker.pkg.dev/$PROJECT_ID/smart-city-repo/${SERVICE_NAME}:latest"

# Setup SDK python path and executable variables
$env:CLOUDSDK_PYTHON = "C:\Users\Lenovo\AppData\Local\Python\pythoncore-3.14-64\python.exe"
$GCLOUD = "C:\Users\Lenovo\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$BQ = "C:\Users\Lenovo\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\bq.cmd"
$GSUTIL = "C:\Users\Lenovo\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd"

Write-Host "=== Starting Google Cloud Provisioning ==="
& $GCLOUD config set project $PROJECT_ID

Write-Host "Enabling necessary Google Cloud APIs (this might take a minute)..."
& $GCLOUD services enable `
    compute.googleapis.com `
    artifactregistry.googleapis.com `
    run.googleapis.com `
    alloydb.googleapis.com `
    bigquery.googleapis.com `
    storage.googleapis.com `
    aiplatform.googleapis.com `
    vpcaccess.googleapis.com `
    servicenetworking.googleapis.com

Write-Host "Creating VPC subnet for Direct VPC Egress..."
try { & $GCLOUD compute networks create smart-city-vpc --subnet-mode=custom } catch {}
try { & $GCLOUD compute networks subnets create smart-city-subnet --network=smart-city-vpc --range=10.8.0.0/26 --region=$REGION } catch {}

Write-Host "Provisioning AlloyDB Cluster & Instance..."
# Create private connection for AlloyDB
try { & $GCLOUD compute addresses create alloydb-private-ip --global --purpose=VPC_PEERING --addresses=10.9.0.0 --prefix-length=16 --network=smart-city-vpc } catch {}
try { & $GCLOUD services vpc-peerings connect --service=servicenetworking.googleapis.com --ranges=alloydb-private-ip --network=smart-city-vpc } catch {}

try { & $GCLOUD alloydb clusters create $CLUSTER_NAME --region=$REGION --password=$DB_PASSWORD --network=smart-city-vpc --project=$PROJECT_ID } catch {}
try { & $GCLOUD alloydb instances create $INSTANCE_NAME --cluster=$CLUSTER_NAME --region=$REGION --instance-type=PRIMARY --cpu-count=2 --project=$PROJECT_ID } catch {}

# Retrieve AlloyDB Private IP
Write-Host "Retrieving AlloyDB Private IP..."
$ALLOYDB_IP = & $GCLOUD alloydb instances describe $INSTANCE_NAME --cluster=$CLUSTER_NAME --region=$REGION --format="value(ipAddress)"
Write-Host "AlloyDB Instance Private IP: $ALLOYDB_IP"

# Create BigQuery Analytics Dataset
Write-Host "Creating BigQuery analytics dataset..."
try { & $BQ --project_id $PROJECT_ID mk --dataset --location=$REGION $BQ_DATASET } catch {}

# Create GCS Document Bucket
Write-Host "Creating GCS document bucket for policy documents..."
try { & $GSUTIL mb -l $REGION "gs://$GCS_BUCKET" } catch {}

# Create Artifact Registry
Write-Host "Creating Artifact Registry repository for container image..."
try { & $GCLOUD artifacts repositories create smart-city-repo --repository-format=docker --location=$REGION --description="Smart City Decision Engine Container Repo" } catch {}

Write-Host "Building and pushing container..."
& $GCLOUD builds submit --tag $IMAGE_NAME ./backend

Write-Host "Deploying to Cloud Run..."
& $GCLOUD run deploy $SERVICE_NAME `
    --image=$IMAGE_NAME `
    --region=$REGION `
    --network=smart-city-vpc `
    --subnet=smart-city-subnet `
    --port=8000 `
    --allow-unauthenticated `
    --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID,GCP_LOCATION=$REGION,ALLOYDB_HOST=$ALLOYDB_IP,ALLOYDB_USER=$DB_USER,ALLOYDB_PASSWORD=$DB_PASSWORD,ALLOYDB_DB=$DB_NAME,BQ_DATASET=$BQ_DATASET,GCS_BUCKET_NAME=$GCS_BUCKET"

Write-Host "=== GCP Provisioning and Deployment Complete! ==="
