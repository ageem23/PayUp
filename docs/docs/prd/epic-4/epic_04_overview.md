# Epic 4: Receipt Image Storage Pipeline & Ingestion Processing

## Overview
The goal of Epic 4 is to establish the raw file collection and staging pipeline for physical receipt validation. We will provision a secure binary storage bucket in Supabase to house uploaded images and map those payloads to structural metadata records inside the `public.receipts` database framework. 

This sets up our data ingestion architecture so that future processing loops can read text elements from uploaded assets and output them straight into denormalized `JSONB` columns.

## Target Architecture Blueprint
* **Binary Storage Framework:** Supabase Storage (`receipt-images` bucket)
* **Target Table Mapping:** `public.receipts`
* **File Attachment Interface:** Interactive Dropzone Node on `/trips/[id]`
* **Data Fields Configured:** `image_url`, `amount`, `paid_by`

## Epic Backlog Registry
* **Story 4.1:** Supabase Storage Object Buckets Configuration & Client Drag-and-Drop Control
* **Story 4.2:** Receipt Metadata Transaction Staging & Parent Trip Association