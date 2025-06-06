/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Measures specific error counts during download
 */
export interface HttpsProtonMeDriveDownloadErrorsTotalV2SchemaJson {
  Labels: {
    type: "server_error" | "network_error" | "decryption_error" | "rate_limited" | "4xx" | "5xx" | "unknown";
    shareType: "main" | "device" | "photo" | "shared" | "shared_public" | "shared_photo";
    initiator: "download" | "preview";
  };
  Value: number;
}
