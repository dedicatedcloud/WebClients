/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Latency of clickToFirstItemRendered event, representing the moment at least 1 single item is rendered.
 */
export interface HttpsProtonMeWebDrivePerformanceClicktofirstitemrenderedHistogramV1SchemaJson {
  Labels: {
    view: "list" | "grid";
    pageType: "filebrowser" | "computers" | "photos" | "shared_by_me" | "shared_with_me" | "trash";
  };
  Value: number;
}
