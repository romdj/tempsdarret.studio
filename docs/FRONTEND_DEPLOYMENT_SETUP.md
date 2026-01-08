# Frontend Deployment Setup Guide

This guide walks through the one-time setup required to enable automated frontend deployment to AWS.

## Overview

The deployment uses:
- **Pulumi** for infrastructure-as-code
- **GitHub Actions** for CI/CD automation
- **AWS OIDC** for secure, temporary credentials (no long-lived access keys)

## Prerequisites

- AWS account with admin access
- GitHub repository admin access
- Pulumi account (free tier)
- `aws` CLI installed and configured

## Step 1: Create AWS IAM OIDC Provider

This allows GitHub Actions to assume AWS roles without storing credentials.

### 1.1. Create OIDC Provider (Console)

1. Open [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Identity providers** → **Add provider**
3. Choose **OpenID Connect**
4. Configure:
   - **Provider URL**: `https://token.actions.githubusercontent.com`
   - **Audience**: `sts.amazonaws.com`
5. Click **Add provider**

### 1.2. Create OIDC Provider (CLI)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

## Step 2: Create IAM Role for GitHub Actions

### 2.1. Create Trust Policy

Create `github-actions-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/tempsdarret.studio:*"
        }
      }
    }
  ]
}
```

**Replace**:
- `YOUR_ACCOUNT_ID`: Your AWS account ID (12 digits)
- `YOUR_GITHUB_USERNAME`: Your GitHub username or org name

**Get your AWS account ID**:
```bash
aws sts get-caller-identity --query Account --output text
```

### 2.2. Create IAM Role

```bash
aws iam create-role \
  --role-name github-actions-frontend-deploy \
  --assume-role-policy-document file://github-actions-trust-policy.json \
  --description "GitHub Actions role for Temps d'Arrêt Studio frontend deployment"
```

### 2.3. Create Permissions Policy

Create `frontend-deploy-permissions.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketManagement",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:ListBucket",
        "s3:GetBucketWebsite",
        "s3:PutBucketWebsite",
        "s3:GetBucketPolicy",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",
        "s3:GetBucketPublicAccessBlock",
        "s3:PutBucketPublicAccessBlock",
        "s3:GetBucketOwnershipControls",
        "s3:PutBucketOwnershipControls",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucketVersions"
      ],
      "Resource": [
        "arn:aws:s3:::tempsdarret.studio",
        "arn:aws:s3:::tempsdarret.studio/*"
      ]
    },
    {
      "Sid": "CloudFrontManagement",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:UpdateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:TagResource",
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Route53Management",
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ACMCertificateManagement",
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:DeleteCertificate",
        "acm:AddTagsToCertificate",
        "acm:ListTagsForCertificate"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2.4. Attach Policy to Role

```bash
aws iam put-role-policy \
  --role-name github-actions-frontend-deploy \
  --policy-name FrontendDeploymentPolicy \
  --policy-document file://frontend-deploy-permissions.json
```

### 2.5. Get Role ARN

```bash
aws iam get-role \
  --role-name github-actions-frontend-deploy \
  --query 'Role.Arn' \
  --output text
```

Save this ARN - you'll need it for GitHub secrets.

## Step 3: Set Up Pulumi

### 3.1. Create Pulumi Account

1. Go to [pulumi.com](https://app.pulumi.com/signup)
2. Sign up with GitHub
3. Create a new organization or use personal account

### 3.2. Get Pulumi Access Token

1. Go to [Settings → Access Tokens](https://app.pulumi.com/account/tokens)
2. Click **Create token**
3. Name it `tempsdarret-studio-github-actions`
4. Copy the token (you won't see it again)

## Step 4: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings → Secrets and variables → Actions**
3. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-frontend-deploy` | IAM role ARN from Step 2.5 |
| `PULUMI_ACCESS_TOKEN` | `pul-xxxxx...` | Pulumi token from Step 3.2 |

## Step 5: Initial Manual Deployment

Before GitHub Actions can work, you need to do an initial manual deployment.

### 5.1. Install Pulumi CLI

```bash
# macOS
brew install pulumi

# Or download from https://www.pulumi.com/docs/install/
```

### 5.2. Login to Pulumi

```bash
cd pulumi
pulumi login
```

### 5.3. Configure AWS Credentials Locally

```bash
aws configure
# Enter your access key ID, secret key, region (eu-north-1)
```

### 5.4. Deploy Infrastructure

```bash
cd pulumi
npm install
pulumi stack select production --create
pulumi up
```

This will:
- Create the S3 bucket
- Create the CloudFront distribution
- Request and validate the ACM certificate
- Create Route53 DNS records

**Note**: Certificate validation can take 5-30 minutes.

### 5.5. Build and Upload Frontend

```bash
# From project root
npm install
npm run build:frontend

# Upload to S3
aws s3 sync frontend/build/ s3://tempsdarret.studio/ --delete

# Get distribution ID
DISTRIBUTION_ID=$(cd pulumi && pulumi stack output distributionId)

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### 5.6. Verify Deployment

Visit `https://tempsdarret.studio` in your browser (may take 5-15 minutes for DNS/CloudFront propagation).

## Step 6: Enable Automated Deployments

Now that infrastructure exists, GitHub Actions can deploy automatically.

### 6.1. Test Workflow

1. Make a change to `frontend/src/routes/(public)/+page.svelte`
2. Commit and push to main branch
3. Go to **Actions** tab in GitHub
4. Watch the "Deploy Frontend to AWS" workflow run

### 6.2. Manual Trigger

You can also trigger deployments manually:

1. Go to **Actions** → **Deploy Frontend to AWS**
2. Click **Run workflow**
3. Optionally check "Skip build" to only redeploy infrastructure

## Verification

After setup, verify:

1. ✅ Website loads at `https://tempsdarret.studio`
2. ✅ WWW redirect works: `https://www.tempsdarret.studio`
3. ✅ HTTPS enforced (HTTP redirects to HTTPS)
4. ✅ CloudFront serving content (check response headers)
5. ✅ GitHub Actions workflow completes successfully

## Troubleshooting

### Certificate Validation Timeout

**Symptom**: Pulumi hangs on certificate validation

**Solution**:
```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $(cd pulumi && pulumi stack output certificateArn) \
  --region us-east-1

# Verify DNS records created
aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones \
    --query "HostedZones[?Name=='tempsdarret.studio.'].Id" \
    --output text)
```

### GitHub Actions: "Could not assume role"

**Symptom**: OIDC authentication fails

**Cause**: Trust policy doesn't match repository

**Solution**: Verify trust policy has correct GitHub repository:
```json
"token.actions.githubusercontent.com:sub": "repo:YOUR_USERNAME/tempsdarret.studio:*"
```

### CloudFront Not Serving Updates

**Symptom**: Changes not visible after deployment

**Solution**: Invalidations take 5-15 minutes. Force cache bypass:
```bash
curl -H "Cache-Control: no-cache" https://tempsdarret.studio
```

Or open in incognito/private browsing mode.

### S3 403 Forbidden

**Symptom**: S3 returns 403 errors

**Solution**: Check bucket policy allows public read:
```bash
aws s3api get-bucket-policy \
  --bucket tempsdarret.studio \
  --region eu-north-1 \
  | jq '.Policy | fromjson'
```

## Cost Estimates

Monthly costs for low-traffic site:

| Service | Cost |
|---------|------|
| S3 storage (10GB) | ~$0.25 |
| S3 requests (10k) | ~$0.01 |
| CloudFront (1GB, 10k requests) | Free tier |
| Route53 hosted zone | $0.50 |
| ACM certificate | Free |
| **Total** | **~$0.76/month** |

CloudFront free tier includes:
- 1TB data transfer out/month
- 10M HTTP/HTTPS requests/month

## Security Best Practices

✅ **OIDC instead of access keys**: Temporary credentials, no secrets in GitHub
✅ **Least privilege IAM**: Role limited to specific resources
✅ **HTTPS only**: All traffic encrypted
✅ **Certificate auto-renewal**: ACM handles renewals
✅ **No sensitive data**: Static site contains no secrets

## Next Steps

Once frontend deployment is working:

1. Set up monitoring (CloudWatch, Sentry)
2. Add analytics (Google Analytics, Plausible)
3. Implement image optimization (Lambda@Edge)
4. Set up backend infrastructure (separate Pulumi stack for K8s)

## Support

- **Pulumi Issues**: Check [Pulumi Console](https://app.pulumi.com/)
- **AWS Issues**: Use AWS Console or `aws` CLI
- **GitHub Actions**: Check Actions tab logs

For questions, refer to:
- [Pulumi AWS Provider Docs](https://www.pulumi.com/registry/packages/aws/)
- [GitHub OIDC Guide](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
