package com.familyvault.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS SDK beans — only active in the "prod" profile.
 * In local/dev, FileStorageService (local disk) is used instead.
 *
 * Credentials are NOT configured here — the AWS SDK automatically picks them up
 * from the EC2 instance profile (IAM role attached to the server).
 * No access keys are ever hardcoded or stored in environment variables.
 */
@Configuration
@Profile("prod")
public class AwsConfig {

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    /**
     * S3Client — used for upload, delete, and version listing.
     */
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(awsRegion))
                .build();
    }

    /**
     * S3Presigner — generates time-limited download URLs.
     * Separate from S3Client because presigning is a different API surface.
     */
    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .region(Region.of(awsRegion))
                .build();
    }
}
