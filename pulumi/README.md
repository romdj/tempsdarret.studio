# Temps D'arrêt Studio - Frontend Infrastructure

This directory contains Pulumi infrastructure-as-code for deploying the Temps D'arrêt Studio frontend to AWS.

## Architecture

The infrastructure deploys a static website with:

- **S3 Bucket**: Static website hosting for built SvelteKit frontend
- **CloudFront CDN**: Global content delivery with aggressive caching for immutable assets
- **Route53**: DNS management for `tempsdarret.studio` and `www.tempsdarret.studio`
- **ACM Certificate**: SSL/TLS certificate for HTTPS (auto-renewed)

### AWS Regions

- **eu-north-1 (Stockholm)**: S3 bucket, Route53 records
- **us-east-1 (Virginia)**: ACM certificate (CloudFront requirement)

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Pulumi Account** (free tier works fine)
3. **Route53 Hosted Zone** for `tempsdarret.studio` (already created)
4. **AWS CLI** configured with credentials
5. **Node.js 20+** and npm

## Initial Setup

### 1. Install Dependencies

```bash
cd pulumi
npm install
```

### 2. Install Pulumi CLI

```bash
# macOS
brew install pulumi

# Or download from https://www.pulumi.com/docs/install/
```

### 3. Login to Pulumi

```bash
pulumi login
```

### 4. Select/Create Production Stack

```bash
pulumi stack select production
# Or create if it doesn't exist:
pulumi stack init production
```

### 5. Configure Stack

The production stack is already configured in `Pulumi.production.yaml`:

```yaml
config:
  aws:region: eu-north-1
  tempsdarret-studio-frontend:domainName: tempsdarret.studio
```

## Deployment

### Manual Deployment

#### 1. Preview Changes

```bash
npm run preview
# Or: pulumi preview
```

#### 2. Deploy Infrastructure

```bash
npm run up
# Or: pulumi up
```

This will:
- Create/update S3 bucket
- Create/update CloudFront distribution
- Create/update ACM certificate with DNS validation
- Create/update Route53 A records
- Export URLs and resource IDs

#### 3. Build and Upload Frontend

```bash
# From project root
npm run build:frontend

# Sync to S3
aws s3 sync frontend/build/ s3://tempsdarret.studio/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(pulumi stack output distributionId) \
  --paths "/*"
```

### Automated Deployment (GitHub Actions)

See `.github/workflows/deploy-frontend.yml` for CI/CD automation.

The workflow:
1. Builds the SvelteKit frontend
2. Deploys infrastructure with Pulumi
3. Syncs build artifacts to S3
4. Invalidates CloudFront cache

## Stack Outputs

After deployment, these values are exported:

```bash
pulumi stack output bucketName              # tempsdarret.studio
pulumi stack output bucketWebsiteEndpoint   # tempsdarret.studio.s3-website.eu-north-1.amazonaws.com
pulumi stack output distributionId          # CloudFront distribution ID
pulumi stack output distributionDomainName  # CloudFront domain (*.cloudfront.net)
pulumi stack output certificateArn          # ACM certificate ARN
pulumi stack output websiteUrl              # https://tempsdarret.studio
pulumi stack output wwwWebsiteUrl           # https://www.tempsdarret.studio
pulumi stack output cloudfrontUrl           # https://*.cloudfront.net
```

## CloudFront Caching Strategy

### Default Behavior
- **TTL**: 1 hour default, 24 hours max
- **Compression**: Enabled
- **HTTPS**: Redirect to HTTPS enforced

### Immutable Assets (`/_app/immutable/*`)
- **TTL**: 1 year (SvelteKit fingerprinted assets)
- **Purpose**: Aggressive caching for build artifacts that never change

### SPA Routing
- **404/403 errors**: Served as `200 /index.html`
- **Purpose**: Allow SvelteKit client-side routing to work

## Cost Optimization

- **Price Class**: `PriceClass_100` (US, Canada, Europe only)
- **IPv6**: Enabled (no additional cost)
- **S3**: Pay only for storage and requests
- **CloudFront**: Free tier covers first 1TB/month + 10M requests

Expected monthly cost: **$1-5** for a low-traffic photography portfolio.

## Security

- **HTTPS Only**: All traffic redirected to HTTPS
- **TLS 1.2+**: Modern protocol only
- **Public S3 Bucket**: Intentional for static website hosting
- **No Sensitive Data**: Frontend contains no secrets or credentials

## Troubleshooting

### Certificate Validation Stuck

ACM certificate validation can take 5-30 minutes. Check:

```bash
aws acm describe-certificate \
  --certificate-arn $(pulumi stack output certificateArn) \
  --region us-east-1
```

Ensure Route53 validation records were created:

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones --query "HostedZones[?Name=='tempsdarret.studio.'].Id" --output text)
```

### CloudFront Not Serving Latest Content

Invalidate the cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id $(pulumi stack output distributionId) \
  --paths "/*"
```

Note: CloudFront propagation takes 5-15 minutes globally.

### 403 Forbidden Errors

Check S3 bucket policy allows public read:

```bash
aws s3api get-bucket-policy \
  --bucket tempsdarret.studio \
  --region eu-north-1
```

## Cleanup

To destroy all infrastructure:

```bash
npm run destroy
# Or: pulumi destroy
```

⚠️ **Warning**: This will delete:
- S3 bucket and all contents
- CloudFront distribution
- Route53 records
- ACM certificate

The Route53 hosted zone will remain (managed separately).

## Future Enhancements

### Analytics & Monitoring
- CloudWatch dashboard for traffic metrics
- Lambda function for daily metrics aggregation
- S3 bucket for CloudFront access logs

### Image Optimization
- Lambda@Edge for on-the-fly image resizing
- WebP conversion for modern browsers
- Responsive image serving based on device

### Backend Integration
- API Gateway or ALB for backend services
- Route53 records for `api.tempsdarret.studio`
- Separate Pulumi stack for K8s infrastructure

## Backend Infrastructure (Future)

The backend services (user, invite, portfolio, etc.) will be deployed separately on a local K8s cluster. This frontend stack is independent and can be deployed without the backend.

## Related Documentation

- [Pulumi AWS Provider](https://www.pulumi.com/registry/packages/aws/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [SvelteKit Static Adapter](https://kit.svelte.dev/docs/adapter-static)
- [Route53 Documentation](https://docs.aws.amazon.com/route53/)

## Support

For infrastructure issues, check Pulumi state:

```bash
pulumi stack
pulumi stack output
pulumi logs
```

For deployment issues, check GitHub Actions logs in the repository.
