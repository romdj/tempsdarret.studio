# IAM Permissions for GitHub Actions Deployment (Frontend → S3/CloudFront)

Adapted from the equivalent setup in `zerotoone.solutions` (same Pulumi +
OIDC + S3 + CloudFront pattern). `.github/workflows/deploy-frontend.yml`
assumes an OIDC-assumable role already exists, referenced via the
`AWS_DEPLOY_ROLE_ARN` secret — this doc is what that role needs, since
provisioning it is a manual one-time AWS Console/CLI step outside Pulumi's
own reach (Pulumi can't grant itself the permissions it needs to run).

## What this covers vs. what's still open

`pulumi/index.ts` provisions `aws.s3`, `aws.cloudfront`, `aws.acm`, and
`aws.route53` resources. The two JSON policies here
([S3](./s3-bucket-management-policy.json), [CloudFront](./cloudfront-management-policy.json))
cover the first two — reused from zerotoone.solutions, extended with
`cloudfront:Create/Delete*Distribution` and origin-access-control actions
since this stack creates the distribution from scratch rather than updating
an existing one. **ACM and Route53 permissions aren't sourced from
zerotoone.solutions and aren't written here** — verify what the Pulumi
program actually needs against a real `pulumi preview`/`pulumi up` run
(ACM certificate request/describe/tag; Route53 hosted-zone lookup +
change-resource-record-sets) before wiring `AWS_DEPLOY_ROLE_ARN` for real,
rather than guessing a scope for services this doc hasn't verified.

## How to Add These Policies

### Via AWS Console

1. IAM → Roles → the OIDC deploy role for this repo
2. "Add permissions" → "Create inline policy" → JSON editor
3. Paste each policy, name them `S3BucketManagement` / `CloudFrontManagement`

### Via AWS CLI

```bash
aws iam put-role-policy \
  --role-name <deploy-role-name> \
  --policy-name S3BucketManagement \
  --policy-document file://docs/deployment/s3-bucket-management-policy.json

aws iam put-role-policy \
  --role-name <deploy-role-name> \
  --policy-name CloudFrontManagement \
  --policy-document file://docs/deployment/cloudfront-management-policy.json
```

## Security Notes

- Scoped to S3 + CloudFront (+ CloudWatch dashboards) only — no IAM
  self-management permissions granted.
- `Resource: "*"` on the S3 bucket-level actions and all CloudFront/CloudWatch
  actions mirrors zerotoone.solutions' original scope; tighten to specific
  bucket/distribution ARNs once they're known (after the first `pulumi up`)
  if you want least-privilege over convenience.
