import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// ============================================================================
// Configuration
// ============================================================================

const config = new pulumi.Config();
const domainName = config.require("domainName");
const wwwDomain = `www.${domainName}`;

// ============================================================================
// AWS Providers
// ============================================================================

// Default provider for eu-north-1 (Stockholm)
const defaultProvider = new aws.Provider("eu-north-1-provider", {
    region: "eu-north-1",
});

// Dedicated provider for us-east-1 (required for ACM certificate used by CloudFront)
const usEast1Provider = new aws.Provider("us-east-1-provider", {
    region: "us-east-1",
});

// ============================================================================
// Route53 Hosted Zone
// ============================================================================

// Look up the existing Route53 hosted zone for the domain
const hostedZone = aws.route53.getZoneOutput({
    name: domainName,
    privateZone: false,
});

// ============================================================================
// ACM Certificate (us-east-1 for CloudFront)
// ============================================================================

// CloudFront requires certificates to be in us-east-1
const certificate = new aws.acm.Certificate(
    "website-certificate",
    {
        domainName: domainName,
        subjectAlternativeNames: [wwwDomain],
        validationMethod: "DNS",
    },
    { provider: usEast1Provider }
);

// Create DNS validation records in Route53
const certificateValidationRecords = certificate.domainValidationOptions.apply(
    (options) => {
        return options.map((option, index) => {
            return new aws.route53.Record(
                `certificate-validation-${index}`,
                {
                    name: option.resourceRecordName,
                    type: option.resourceRecordType,
                    records: [option.resourceRecordValue],
                    zoneId: hostedZone.zoneId,
                    ttl: 60,
                },
                { provider: defaultProvider }
            );
        });
    }
);

// Wait for certificate validation to complete
const certificateValidation = new aws.acm.CertificateValidation(
    "certificate-validation",
    {
        certificateArn: certificate.arn,
        validationRecordFqdns: pulumi
            .all([certificate.domainValidationOptions])
            .apply(([options]) =>
                options.map((option) => option.resourceRecordName)
            ),
    },
    { provider: usEast1Provider }
);

// ============================================================================
// S3 Bucket for Static Website Hosting
// ============================================================================

// Main website bucket
const websiteBucket = new aws.s3.Bucket(
    "website-bucket",
    {
        bucket: domainName,
        website: {
            indexDocument: "index.html",
            errorDocument: "404.html",
        },
        // Allow easy cleanup during development
        forceDestroy: true,
    },
    { provider: defaultProvider }
);

// Bucket ownership controls
const ownershipControls = new aws.s3.BucketOwnershipControls(
    "website-bucket-ownership-controls",
    {
        bucket: websiteBucket.id,
        rule: {
            objectOwnership: "BucketOwnerPreferred",
        },
    },
    { provider: defaultProvider }
);

// Enable public access
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
    "website-bucket-public-access-block",
    {
        bucket: websiteBucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
    },
    { provider: defaultProvider }
);

// Bucket policy to allow public read access
const bucketPolicy = new aws.s3.BucketPolicy(
    "website-bucket-policy",
    {
        bucket: websiteBucket.id,
        policy: websiteBucket.arn.apply((arn) =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: "*",
                        Action: "s3:GetObject",
                        Resource: `${arn}/*`,
                    },
                ],
            })
        ),
    },
    {
        provider: defaultProvider,
        dependsOn: [publicAccessBlock, ownershipControls],
    }
);

// ============================================================================
// CloudFront Distribution
// ============================================================================

const distribution = new aws.cloudfront.Distribution(
    "website-distribution",
    {
        enabled: true,
        aliases: [domainName, wwwDomain],

        // Origin: S3 website endpoint (not the REST endpoint)
        // Using website endpoint allows S3 to handle index.html and 404.html
        origins: [
            {
                originId: "s3-website",
                domainName: websiteBucket.websiteEndpoint,
                customOriginConfig: {
                    httpPort: 80,
                    httpsPort: 443,
                    originProtocolPolicy: "http-only",
                    originSslProtocols: ["TLSv1.2"],
                },
            },
        ],

        // Default cache behavior
        defaultCacheBehavior: {
            targetOriginId: "s3-website",
            viewerProtocolPolicy: "redirect-to-https",
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            cachedMethods: ["GET", "HEAD", "OPTIONS"],
            compress: true,

            forwardedValues: {
                queryString: false,
                cookies: {
                    forward: "none",
                },
            },

            minTtl: 0,
            defaultTtl: 3600,      // 1 hour
            maxTtl: 86400,         // 24 hours
        },

        // Aggressive caching for SvelteKit immutable assets
        orderedCacheBehaviors: [
            {
                pathPattern: "/_app/immutable/*",
                targetOriginId: "s3-website",
                viewerProtocolPolicy: "redirect-to-https",
                allowedMethods: ["GET", "HEAD", "OPTIONS"],
                cachedMethods: ["GET", "HEAD", "OPTIONS"],
                compress: true,

                forwardedValues: {
                    queryString: false,
                    cookies: {
                        forward: "none",
                    },
                },

                minTtl: 31536000,      // 1 year
                defaultTtl: 31536000,  // 1 year
                maxTtl: 31536000,      // 1 year
            },
        ],

        // Custom error responses for SPA client-side routing
        customErrorResponses: [
            {
                errorCode: 404,
                responseCode: 200,
                responsePagePath: "/index.html",
                errorCachingMinTtl: 300,
            },
            {
                errorCode: 403,
                responseCode: 200,
                responsePagePath: "/index.html",
                errorCachingMinTtl: 300,
            },
        ],

        // Certificate and TLS configuration
        viewerCertificate: {
            acmCertificateArn: certificateValidation.certificateArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.2_2021",
        },

        // Cost optimization: serve only from US, Canada, and Europe
        priceClass: "PriceClass_100",

        // IPv6 support
        isIpv6Enabled: true,

        // Default root object
        defaultRootObject: "index.html",

        // Restrictions (none for public site)
        restrictions: {
            geoRestriction: {
                restrictionType: "none",
            },
        },
    },
    {
        provider: defaultProvider,
        dependsOn: [certificateValidation],
    }
);

// ============================================================================
// Route53 DNS Records
// ============================================================================

// A record for root domain
const rootARecord = new aws.route53.Record(
    "root-a-record",
    {
        name: domainName,
        zoneId: hostedZone.zoneId,
        type: "A",
        aliases: [
            {
                name: distribution.domainName,
                zoneId: distribution.hostedZoneId,
                evaluateTargetHealth: false,
            },
        ],
    },
    { provider: defaultProvider }
);

// A record for www subdomain
const wwwARecord = new aws.route53.Record(
    "www-a-record",
    {
        name: wwwDomain,
        zoneId: hostedZone.zoneId,
        type: "A",
        aliases: [
            {
                name: distribution.domainName,
                zoneId: distribution.hostedZoneId,
                evaluateTargetHealth: false,
            },
        ],
    },
    { provider: defaultProvider }
);

// ============================================================================
// Exports
// ============================================================================

export const bucketName = websiteBucket.id;
export const bucketWebsiteEndpoint = websiteBucket.websiteEndpoint;
export const distributionId = distribution.id;
export const distributionDomainName = distribution.domainName;
export const certificateArn = certificate.arn;
export const websiteUrl = pulumi.interpolate`https://${domainName}`;
export const wwwWebsiteUrl = pulumi.interpolate`https://${wwwDomain}`;
export const cloudfrontUrl = pulumi.interpolate`https://${distribution.domainName}`;
