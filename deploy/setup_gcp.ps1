# Windows PowerShell GCP Provisioning Script for the AI Decision Intelligence Platform
# Production-ready, flexible parameterization for multi-developer environments

param (
    [string]$ProjectId = "smartcity-515403",
    [string]$Region = "asia-south1", # Mumbai, India (tailored for Indian Smart Cities)
    [string]$ClusterName = "smart-city-cluster",
    [string]$InstanceName = "smart-city-instance",
    [string]$DbName = "decision_intel",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "SuperSecurePassword123!", # In production, pull from Secret Manager
    [string]$BqDataset = "smart_city_metrics",
    [string]$GcsBucket = "smart-city-documents-$ProjectId",
    [string]$ServiceName = "decision-intel-backend"
)

# Resolve gcloud, bq, gsutil flexibly from PATH or standard SDK installation locations
$GCLOUD = Get-Command "gcloud.cmd" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $GCLOUD) {
    $GCLOUD = Get-Command "gcloud" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
}
if (-not $GCLOUD) {
    $sdkDefault = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $sdkDefault) {
        $GCLOUD = $sdkDefault
    } else {
        Write-Error "Google Cloud SDK (gcloud) not found in PATH or standard installation path. Please install Google Cloud SDK."
        exit 1
    }
}

$BQ = (Join-Path (Split-Path $GCLOUD) "bq.cmd")
$GSUTIL = (Join-Path (Split-Path $GCLOUD) "gsutil.cmd")

Write-Host "=== Starting Google Cloud Provisioning for Project: $ProjectId ==="
& $GCLOUD config set project $ProjectId

Write-Host "Enabling necessary Google Cloud APIs..."
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

Write-Host "Creating VPC network and subnets for Direct VPC egress..."
try { & $GCLOUD compute networks create smart-city-vpc --subnet-mode=custom } catch {}
try { & $GCLOUD compute networks subnets create smart-city-subnet --network=smart-city-vpc --range=10.8.0.0/26 --region=$Region } catch {}

Write-Host "Provisioning AlloyDB Cluster & Instance..."
try { & $GCLOUD compute addresses create alloydb-private-ip --global --purpose=VPC_PEERING --addresses=10.9.0.0 --prefix-length=16 --network=smart-city-vpc } catch {}
try { & $GCLOUD services vpc-peerings connect --service=servicenetworking.googleapis.com --ranges=alloydb-private-ip --network=smart-city-vpc } catch {}

try { & $GCLOUD alloydb clusters create $ClusterName --region=$Region --password=$DbPassword --network=smart-city-vpc --project=$ProjectId } catch {}
try { & $GCLOUD alloydb instances create $InstanceName --cluster=$ClusterName --region=$Region --instance-type=PRIMARY --cpu-count=2 --project=$ProjectId } catch {}

Write-Host "Retrieving AlloyDB Private IP..."
$ALLOYDB_IP = & $GCLOUD alloydb instances describe $InstanceName --cluster=$ClusterName --region=$Region --format="value(ipAddress)"
Write-Host "AlloyDB Instance Private IP: $ALLOYDB_IP"

# Create BigQuery Analytics Dataset
Write-Host "Creating BigQuery analytics dataset..."
try { & $BQ --project_id $ProjectId mk --dataset --location=$Region $BqDataset } catch {}

# Create GCS Document Bucket
Write-Host "Creating GCS document bucket for policy documents..."
try { & $GSUTIL mb -l $Region "gs://$GcsBucket" } catch {}

Write-Host "=== Google Cloud Infrastructure Provisioned Successfully ==="
